from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.endpoints.appointments import create_appointment
from app.appointments import schemas
from app.database import models
from app.core.config import settings
from datetime import datetime
import json
import logging
import zoneinfo
import redis

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limit cache using Redis
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("/vapi/webhook")
def vapi_webhook(request: Request, background_tasks: BackgroundTasks, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Handle Vapi tool calls and webhooks.
    """
    if settings.ENVIRONMENT == "production" and not settings.VAPI_WEBHOOK_SECRET:
        logger.critical("VAPI_WEBHOOK_SECRET is not set in production!")
        raise HTTPException(status_code=500, detail="Server misconfiguration")
    if settings.VAPI_WEBHOOK_SECRET and request.headers.get("x-vapi-secret") != settings.VAPI_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
        
    message = payload.get("message", {})

    # Resolve organization from the Vapi assistant ID
    assistant_id = message.get("call", {}).get("assistantId")
    if not assistant_id:
        raise HTTPException(status_code=400, detail="Missing assistantId in call data")
        
    organization = db.query(models.Organization).filter(
        models.Organization.vapi_assistant_id == assistant_id
    ).first()
    
    if not organization:
        raise HTTPException(status_code=400, detail="Unrecognized assistantId")
        
    org_tz = organization.timezone if organization else "UTC"

    # Vapi sends "toolCalls" in the message for function calling
    if message.get("type") == "tool-calls":
        call_id = message.get("call", {}).get("id")
        if call_id:
            try:
                redis_key = f"rate_limit:tool_calls:{call_id}"
                current_calls = redis_client.incr(redis_key)
                if current_calls == 1:
                    redis_client.expire(redis_key, 60)
                if current_calls > 40:
                    raise HTTPException(status_code=429, detail="Too many tool calls for this session")
            except redis.RedisError as e:
                logger.warning(f"Redis rate limiting failed, allowing call to proceed. Error: {e}")
            
        tool_calls = message.get("toolCalls", [])
        results = []
        
        # Helper to handle timezone conversion for AI tool calls
        def parse_ai_datetime(dt_str, org_tz="UTC"):
            from dateutil import parser
            try:
                dt = parser.parse(dt_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=zoneinfo.ZoneInfo(org_tz))
                return dt.astimezone(zoneinfo.ZoneInfo("UTC"))
            except Exception as e:
                logger.error(f"Date Parsing Error: {e}")
                raise ValueError(f"Invalid date format: {dt_str}")

        for tool_call in tool_calls:
            function_name = tool_call.get("function", {}).get("name")
            arguments = tool_call.get("function", {}).get("arguments", {})
            
            if isinstance(arguments, str):
                arguments = json.loads(arguments)
            
            if function_name == "create_appointment":
                tool_call_id = tool_call.get("id")
                
                # Check Idempotency to prevent double bookings on retries via atomic INSERT
                from sqlalchemy.exc import IntegrityError
                try:
                    db.add(models.IdempotencyKey(key=tool_call_id))
                    db.commit()
                except IntegrityError:
                    db.rollback()
                    results.append({
                        "toolCallId": tool_call_id,
                        "result": "Appointment already created."
                    })
                    continue

                try:
                    # Convert arguments to AppointmentCreate schema
                    # Ensure start_time is UTC
                    arguments['start_time'] = parse_ai_datetime(arguments.get('start_time'), org_tz)
                    arguments['organization_id'] = organization.id
                    if 'patient_name' in arguments:
                        arguments['customer_name'] = arguments.pop('patient_name')
                    if 'patient_phone' in arguments:
                        arguments['customer_phone'] = arguments.pop('patient_phone')
                    appointment_in = schemas.AppointmentCreate(**arguments)
                    result = create_appointment(appointment_in, background_tasks, db, current_user=None)
                    
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "result": f"Appointment created successfully with ID {result['id']}"
                    })
                except Exception as e:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "error": str(e)
                    })
            
            elif function_name == "check_availability":
                try:
                    provider_id = arguments.get("provider_id")
                    start_time = parse_ai_datetime(arguments.get("start_time"), org_tz)
                    service_id = arguments.get("service_id")
                    
                    from app.scheduling.engine import SchedulingEngine
                    engine = SchedulingEngine(db)
                    
                    # SECURITY FIX: Ensure service and provider belong to the organization
                    service = db.query(models.Service).filter(
                        models.Service.id == service_id, 
                        models.Service.organization_id == organization.id,
                        models.Service.is_deleted == False
                    ).first()
                    provider = db.query(models.Provider).filter(
                        models.Provider.id == provider_id, 
                        models.Provider.organization_id == organization.id,
                        models.Provider.is_active == True
                    ).first()
                    
                    if not service or not provider:
                        results.append({
                            "toolCallId": tool_call.get("id"),
                            "error": "Service or Provider not found"
                        })
                    else:
                        is_available = engine.check_availability(
                            provider_id, 
                            start_time.astimezone(zoneinfo.ZoneInfo("UTC")).replace(tzinfo=None), 
                            service.duration_minutes
                        )
                        results.append({
                            "toolCallId": tool_call.get("id"),
                            "result": {"available": is_available}
                        })
                except Exception as e:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "error": str(e)
                    })
            
            elif function_name in ("get_customer_appointments", "get_patient_appointments"):
                try:
                    phone_number = arguments.get("phone_number")
                    from app.scheduling.engine import SchedulingEngine
                    engine = SchedulingEngine(db)
                    # SECURITY FIX: Ensure we isolate to the current organization!
                    appointments = engine.get_customer_appointments(phone_number, organization_id=organization.id)
                    # Format appointments for AI readability in ORGANIZATION LOCAL TIME
                    local_tz = zoneinfo.ZoneInfo(org_tz)
                    
                    formatted = []
                    for a in appointments:
                        # Convert UTC start_time to local organization time for the AI to speak correctly
                        local_start = a.start_time.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(local_tz)
                        formatted.append(f"ID {a.id}: {local_start.strftime('%Y-%m-%d at %I:%M %p')} for {a.service.name}")

                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "result": {"appointments": formatted}
                    })
                except Exception as e:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "error": str(e)
                    })

            elif function_name == "reschedule_appointment":
                try:
                    appointment_id = arguments.get("appointment_id")
                    new_start_time = parse_ai_datetime(arguments.get("new_start_time"), org_tz)
                    from app.scheduling.engine import SchedulingEngine
                    engine = SchedulingEngine(db)
                    
                    updated = engine.update_appointment(
                        appointment_id, 
                        new_start_time.astimezone(zoneinfo.ZoneInfo("UTC")).replace(tzinfo=None),
                        organization_id=organization.id
                    )
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "result": f"Appointment {appointment_id} rescheduled to {updated.start_time}"
                    })
                except Exception as e:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "error": str(e)
                    })

            elif function_name == "cancel_appointment":
                try:
                    appointment_id = arguments.get("appointment_id")
                    from app.scheduling.engine import SchedulingEngine
                    engine = SchedulingEngine(db)
                    engine.cancel_appointment(appointment_id, organization_id=organization.id)
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "result": f"Appointment {appointment_id} has been cancelled."
                    })
                except Exception as e:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "error": str(e)
                    })
            
            elif function_name == "transfer_call":
                # If no emergency phone is configured, respond verbally instead of
                # transferring to an invalid number.
                if not organization.emergency_phone:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "result": (
                            "I'm sorry, I'm unable to transfer your call right now. "
                            "Please hang up and dial 911 if this is an emergency, "
                            "or call us back during business hours."
                        )
                    })
                    continue

                return {
                    "results": [{
                        "toolCallId": tool_call.get("id"),
                        "result": f"Transferring call to {organization.emergency_phone}"
                    }],
                    "messageResponse": {
                        "transferDestination": {
                            "type": "number",
                            "number": organization.emergency_phone
                        }
                    }
                }
        
            elif function_name in ("get_organization_info", "get_clinic_info"):
                try:
                    query = (arguments.get("query") or arguments.get("query_key") or "").lower()
                    org_id = organization.id
                    faq = db.query(models.OrganizationFAQ).filter(
                        models.OrganizationFAQ.organization_id == org_id,
                        models.OrganizationFAQ.question_key.contains(query)
                    ).first()
                    
                    if faq:
                        results.append({
                            "toolCallId": tool_call.get("id"),
                            "result": {"answer": faq.answer}
                        })
                    else:
                        results.append({
                            "toolCallId": tool_call.get("id"),
                            "result": {"answer": "I don't have that specific information. Let me check with the staff."}
                        })
                except Exception as e:
                    results.append({
                        "toolCallId": tool_call.get("id"),
                        "error": str(e)
                    })


            
        return {"results": results}
    elif message.get("type") == "end-of-call-report":
        # Dispatch to Celery to save call log asynchronously to prevent blocking webhooks
        call_data = message.get("call", {})
        from app.workers.tasks import save_end_of_call_report
        
        save_args = dict(
            organization_id=organization.id,
            call_sid=call_data.get("id"),
            customer_phone=call_data.get("customer", {}).get("number"),
            duration_seconds=message.get("durationSeconds", 0),
            status=message.get("endedReason"),
            transcript=message.get("transcript"),
            recording_url=call_data.get("recordingUrl")
        )
        
        try:
            save_end_of_call_report.delay(**save_args)
        except Exception as e:
            logger.critical(f"Celery dispatch failed for end_of_call_report. Falling back to synchronous DB write. Error: {e}")
            call_log = models.CallLog(**save_args)
            db.add(call_log)
            db.commit()
            
        return {"status": "saved"}
    
    return {"status": "ok"}
