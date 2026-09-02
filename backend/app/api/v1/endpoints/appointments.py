from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from app.database.session import get_db
from app.appointments import schemas
from app.scheduling.engine import SchedulingEngine
from app.database import models
from app.core.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class AppointmentEdit(BaseModel):
    notes: Optional[str] = None
    service_id: Optional[int] = None
    provider_id: Optional[int] = None

@router.post("/create")
def create_appointment(
    appointment_in: schemas.AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user)
):
    """
    Creates a new appointment. Supports both Dashboard (IDs) and AI (Names/Phones) flows.
    """
    if isinstance(current_user, models.User) and current_user.organization_id:
        appointment_in.organization_id = current_user.organization_id
    elif not appointment_in.organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required")
        
    engine = SchedulingEngine(db)
    
    # AI/Zapier Flow: Resolve Provider and Service IDs from Names
    if not appointment_in.provider_id and appointment_in.provider_name:
        provider = db.query(models.Provider).filter(
            models.Provider.organization_id == appointment_in.organization_id,
            models.Provider.name.ilike(f"%{appointment_in.provider_name}%"),
            models.Provider.is_active == True
        ).first()
        if not provider:
            raise HTTPException(status_code=404, detail=f"Provider '{appointment_in.provider_name}' not found")
        appointment_in.provider_id = provider.id

    if not appointment_in.service_id and appointment_in.service_name:
        service = db.query(models.Service).filter(
            models.Service.organization_id == appointment_in.organization_id,
            models.Service.name.ilike(f"%{appointment_in.service_name}%"),
            models.Service.is_deleted == False
        ).first()
        if not service:
            raise HTTPException(status_code=404, detail=f"Service '{appointment_in.service_name}' not found")
        appointment_in.service_id = service.id

    if not appointment_in.provider_id or not appointment_in.service_id:
        raise HTTPException(status_code=400, detail="Both provider and service must be specified (via ID or name).")

    if appointment_in.provider_id:
        p = db.query(models.Provider).filter(models.Provider.id == appointment_in.provider_id, models.Provider.organization_id == appointment_in.organization_id, models.Provider.is_active == True).first()
        if not p:
            raise HTTPException(status_code=404, detail="Provider not found or inactive")
            
    if appointment_in.service_id:
        s = db.query(models.Service).filter(models.Service.id == appointment_in.service_id, models.Service.organization_id == appointment_in.organization_id, models.Service.is_deleted == False).first()
        if not s:
            raise HTTPException(status_code=404, detail="Service not found or deleted")

    # Customer Resolution
    if not appointment_in.customer_id and appointment_in.customer_name and appointment_in.customer_phone:
        # Check if customer exists
        customer = db.query(models.Customer).filter(models.Customer.phone == appointment_in.customer_phone, models.Customer.organization_id == appointment_in.organization_id).first()
        if not customer:
            customer = models.Customer(
                organization_id=appointment_in.organization_id,
                name=appointment_in.customer_name,
                phone=appointment_in.customer_phone
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
        appointment_in.customer_id = customer.id

    try:
        # Convert Pydantic model to dict for engine
        appointment_data = appointment_in.model_dump()
        db_appt = engine.create_appointment(appointment_data, background_tasks)
        
        return {
            "id": db_appt.id,
            "status": "confirmed",
            "start_time": db_appt.start_time.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Booking Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/slots")
def get_slots(
    provider_id: int,
    date: str,
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns available 30-min slots for a provider on a specific date.
    """
    engine = SchedulingEngine(db)
    try:
        # Parse date YYYY-MM-DD
        dt_obj = datetime.strptime(date, "%Y-%m-%d").date()
        # Derive organization_id from the provider to avoid hardcoding
        provider = db.query(models.Provider).filter(models.Provider.id == provider_id, models.Provider.organization_id == current_user.organization_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        slots = engine.get_available_slots(organization_id=provider.organization_id, provider_id=provider_id, date=dt_obj, service_id=service_id)
        # Return ISO strings without timezone offsets (Wall-Clock Time)
        return {"slots": [s.replace(tzinfo=None).isoformat() for s in slots]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/check_availability")
def check_availability(
    provider_id: int,
    start_time: datetime,
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    engine = SchedulingEngine(db)
    
    provider = db.query(models.Provider).filter(models.Provider.id == provider_id, models.Provider.organization_id == current_user.organization_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
        
    service = db.query(models.Service).filter(models.Service.id == service_id, models.Service.organization_id == current_user.organization_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    is_available = engine.check_availability(provider_id, start_time, service.duration_minutes)
    return {"available": is_available}

@router.get("/all")
def get_all_appointments(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Only show scheduled or completed appointments on the main calendar
    appointments = db.query(models.Appointment).options(
        joinedload(models.Appointment.customer),
        joinedload(models.Appointment.service),
        joinedload(models.Appointment.provider)
    ).filter(
        models.Appointment.status != models.AppointmentStatus.CANCELLED,
        models.Appointment.organization_id == current_user.organization_id
    ).order_by(models.Appointment.start_time.desc()).offset(skip).limit(limit).all()
    # Serialize to dict to include nested relationships
    result = []
    for a in appointments:
        result.append({
            "id": a.id,
            "start_time": a.start_time.isoformat(), # Removed 'Z' to preserve wall-clock time
            "status": a.status,
            "customer_name": a.customer.name if a.customer else "Unknown",
            "customer_phone": a.customer.phone if a.customer else "Unknown",
            "service_name": a.service.name if a.service else "Service",
            "provider_name": a.provider.name if a.provider else "Provider"
        })
    return result

@router.get("/customer/{phone_number}")
def get_customer_appointments(phone_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    engine = SchedulingEngine(db)
    appointments = engine.get_customer_appointments(phone_number, current_user.organization_id)
    return appointments

@router.patch("/{appointment_id}/reschedule")
def reschedule_appointment(appointment_id: int, new_start_time: str, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_current_user)):
    """
    Moves an existing appointment with explicit timezone normalization.
    """
    from app.scheduling.engine import SchedulingEngine
    import zoneinfo
    from datetime import datetime
    
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if current_user and appointment.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this appointment")

    org = db.query(models.Organization).filter(models.Organization.id == appointment.organization_id).first()
    org_tz = org.timezone if org else "UTC"
    
    # Standardize the input string (remove Z if it exists to treat as local)
    clean_time = new_start_time.replace("Z", "").split(".")[0]
    dt = datetime.fromisoformat(clean_time)
    
    # Force interpretation as Organization Local Time
    local_tz = zoneinfo.ZoneInfo(org_tz)
    dt_local = dt.replace(tzinfo=local_tz)
    
    # Convert to UTC for storage
    utc_dt = dt_local.astimezone(zoneinfo.ZoneInfo("UTC")).replace(tzinfo=None)
    
    engine = SchedulingEngine(db)
    try:
        updated_appt = engine.update_appointment(appointment_id, utc_dt)
        return {"status": "success", "new_time": updated_appt.start_time.isoformat() + "Z"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{appointment_id}/edit")
def edit_appointment_details(appointment_id: int, data: AppointmentEdit, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Updates notes, service, or provider for an appointment.
    """
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.organization_id == current_user.organization_id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if data.notes is not None:
        appointment.notes = data.notes
    if data.service_id is not None:
        appointment.service_id = data.service_id
    if data.provider_id is not None:
        appointment.provider_id = data.provider_id
        
    db.commit()
    return {"status": "success"}

@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_current_user)):
    """
    Cancels an existing appointment.
    """
    from app.scheduling.engine import SchedulingEngine
    
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if current_user and appointment.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")

    engine = SchedulingEngine(db)
    try:
        engine.cancel_appointment(appointment_id)
        
        # Audit Logging
        audit_log = models.AuditLog(
            organization_id=appointment.organization_id,
            user_id=current_user.id if isinstance(current_user, models.User) else None,
            action="cancel_appointment",
            entity_type="appointment",
            entity_id=appointment.id,
            details=f"Appointment {appointment_id} cancelled"
        )
        db.add(audit_log)
        db.commit()
        
        return {"status": "success", "message": "Appointment cancelled"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/providers")
def get_providers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Provider).filter(
        models.Provider.organization_id == current_user.organization_id,
        models.Provider.is_active == True
    ).all()

@router.get("/services")
def get_services(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Service).filter(
        models.Service.organization_id == current_user.organization_id,
        models.Service.is_deleted == False
    ).all()
