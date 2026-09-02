from app.core.celery_app import celery_app
from celery.utils.log import get_task_logger

import json

logger = get_task_logger(__name__)

class BaseTaskWithDLQ(celery_app.Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.critical(
            f"DLQ Alert: Task {self.name} ({task_id}) failed permanently!\n"
            f"Args: {args}\nKwargs: {kwargs}\nError: {exc}"
        )
        # In a full production setup, write this to a dedicated DLQ table or SQS queue.

@celery_app.task(bind=True, base=BaseTaskWithDLQ, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def sync_to_external_scheduler(
    self,
    organization_id: int,
    summary: str,
    description: str,
    start_time_iso: str,
    end_time_iso: str,
    customer_name: str = "",
    customer_phone: str = "",
    customer_email: str = "",
):
    """
    Syncs an appointment to Google Calendar, Acuity, or Boulevard depending on integration settings.
    customer_name, customer_phone, and customer_email are the real caller details collected by the AI.
    """
    int_type = "unknown"
    try:
        from app.database.session import SessionLocal
        from app.database import models

        with SessionLocal() as db:
            org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()

            if not org:
                logger.error("Organization not found during sync.")
                return

            int_type = org.integration_type or "google_calendar"

            if int_type == "acuity":
                from app.integrations.acuity import acuity_service
                acuity_service.book_appointment(
                    user_id=org.acuity_user_id,
                    api_key=org.acuity_api_key,
                    summary=summary,
                    description=description,
                    start_time=start_time_iso,
                    end_time=end_time_iso,
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    customer_email=customer_email,
                )
            elif int_type == "boulevard":
                from app.integrations.boulevard import boulevard_service
                boulevard_service.book_appointment(
                    api_key=org.boulevard_api_key,
                    business_id=org.boulevard_business_id,
                    summary=summary,
                    description=description,
                    start_time=start_time_iso,
                    end_time=end_time_iso,
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    customer_email=customer_email,
                )
            else:  # Google Calendar (Default)
                from app.integrations.google_calendar import calendar_service
                if not org.google_calendar_id or not org.google_oauth_access_token:
                    logger.info("Organization does not have a connected Google Calendar.")
                    return
                calendar_service.book_appointment(
                    calendar_id=org.google_calendar_id,
                    summary=summary,
                    description=description,
                    start_time=start_time_iso,
                    end_time=end_time_iso,
                    access_token=org.google_oauth_access_token,
                    refresh_token=org.google_oauth_refresh_token,
                    organization_id=organization_id
                )

        logger.info(f"Successfully synced appointment to {int_type} integration.")
    except Exception as exc:
        logger.error(f"Failed to sync with {int_type} integration: {exc}")
        raise self.retry(exc=exc)

@celery_app.task(bind=True, base=BaseTaskWithDLQ, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def save_end_of_call_report(self, organization_id: int, call_sid: str, customer_phone: str, duration_seconds: int, status: str, transcript: str, recording_url: str):
    """
    Saves the call transcript and billing data asynchronously to prevent blocking webhooks.
    """
    try:
        from app.database.session import SessionLocal
        from app.database import models

        with SessionLocal() as db:
            call_log = models.CallLog(
                organization_id=organization_id,
                call_sid=call_sid,
                customer_phone=customer_phone,
                duration_seconds=duration_seconds,
                status=status,
                transcript=transcript,
                recording_url=recording_url
            )
            db.add(call_log)

            # Track usage for future billing integration
            duration_mins = (duration_seconds + 59) // 60  # Ceil to nearest minute
            if duration_mins > 0:
                usage = db.query(models.OrganizationUsage).filter(models.OrganizationUsage.organization_id == organization_id).first()
                if not usage:
                    usage = models.OrganizationUsage(organization_id=organization_id)
                    db.add(usage)
                usage.vapi_minutes_used += duration_mins

            db.commit()

        logger.info(f"Successfully saved end-of-call report for {call_sid}")
    except Exception as exc:
        logger.error(f"Failed to save end-of-call report: {exc}")
        raise self.retry(exc=exc)

@celery_app.task(bind=True, base=BaseTaskWithDLQ, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_sms_confirmation(self, phone: str, message: str, organization_id: int):
    """
    Sends an SMS confirmation asynchronously via Twilio.
    """
    try:
        from app.database.session import SessionLocal
        from app.database import models
        from app.core.config import settings
        from twilio.rest import Client

        with SessionLocal() as db:
            org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()

            # Use org's specific Twilio number if they have one, else fallback to global
            from_phone = settings.TWILIO_PHONE_NUMBER
            if org and org.phone_number:
                from_phone = org.phone_number

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=from_phone,
            to=phone
        )
        logger.info(f"Successfully sent SMS confirmation to {phone}: {msg.sid}")
    except Exception as exc:
        logger.error(f"Failed to send SMS to {phone}: {exc}")
        raise self.retry(exc=exc)

