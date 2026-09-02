from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user
from datetime import datetime, timedelta

from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ProviderCreate(BaseModel):
    name: str
    specialty: str
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None
    organization_id: Optional[int] = None

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None

@router.patch("/{provider_id}")
def update_provider(provider_id: int, provider_in: ProviderUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Update an existing provider's profile or shift hours.
    """
    db_provider = db.query(models.Provider).filter(
        models.Provider.id == provider_id,
        models.Provider.organization_id == current_user.organization_id
    ).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    update_data = provider_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("open_time", "close_time", "break_start", "break_end") and isinstance(value, str):
            value = datetime.strptime(value, "%H:%M").time()
        setattr(db_provider, key, value)
    
    db.commit()
    db.refresh(db_provider)
    return db_provider

@router.post("/create")
def create_provider(provider_in: ProviderCreate, db: Session = Depends(get_db), current_user: object = Depends(get_current_user)):
    """
    Register a new provider in the organization.
    """
    from app.database.models import User
    if isinstance(current_user, User) and current_user.organization_id:
        provider_in.organization_id = current_user.organization_id
    elif not provider_in.organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required")
        
    db_provider = models.Provider(
        organization_id=provider_in.organization_id,
        name=provider_in.name,
        specialty=provider_in.specialty,
        open_time=datetime.strptime(provider_in.open_time, '%H:%M').time() if provider_in.open_time else None,
        close_time=datetime.strptime(provider_in.close_time, '%H:%M').time() if provider_in.close_time else None,
        break_start=datetime.strptime(provider_in.break_start, '%H:%M').time() if provider_in.break_start else None,
        break_end=datetime.strptime(provider_in.break_end, '%H:%M').time() if provider_in.break_end else None
    )
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider

@router.get("/")
def get_providers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Get all active providers with their specialties and current workload stats.
    """
    providers = db.query(models.Provider).filter(
        models.Provider.is_active == True,
        models.Provider.organization_id == current_user.organization_id
    ).all()
    
    today = datetime.now().date()
    
    from sqlalchemy import func
    # Total appointments per provider
    total_stats = db.query(
        models.Appointment.provider_id, 
        func.count(models.Appointment.id).label("total")
    ).group_by(models.Appointment.provider_id).all()
    total_map = {r.provider_id: r.total for r in total_stats}

    # Today's appointments per provider
    today_stats = db.query(
        models.Appointment.provider_id, 
        func.count(models.Appointment.id).label("total")
    ).filter(
        models.Appointment.start_time >= datetime.combine(today, datetime.min.time()),
        models.Appointment.start_time <= datetime.combine(today, datetime.max.time())
    ).group_by(models.Appointment.provider_id).all()
    today_map = {r.provider_id: r.total for r in today_stats}

    result = []
    for p in providers:
        total_appts = total_map.get(p.id, 0)
        today_appts = today_map.get(p.id, 0)

        result.append({
            "id": p.id,
            "name": p.name,
            "specialty": p.specialty,
            "open_time": p.open_time,
            "close_time": p.close_time,
            "total_appointments": total_appts,
            "today_appointments": today_appts,
            "status": "Available" # In a real app, this would check current time vs schedule
        })
        
    return result

@router.get("/{provider_id}/schedule")
def get_provider_schedule(provider_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Get the full schedule for a specific provider for the next 7 days.
    """
    provider = db.query(models.Provider).filter(
        models.Provider.id == provider_id,
        models.Provider.organization_id == current_user.organization_id
    ).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
        
    # Get appointments for the next 7 days
    start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = start_date + timedelta(days=7)
    
    appointments = db.query(models.Appointment).filter(
        models.Appointment.provider_id == provider_id,
        models.Appointment.start_time >= start_date,
        models.Appointment.start_time <= end_date,
        models.Appointment.status == models.AppointmentStatus.SCHEDULED
    ).order_by(models.Appointment.start_time.asc()).all()
    
    return {
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "specialty": provider.specialty
        },
        "appointments": [
            {
                "id": a.id,
                "customer_name": a.customer.name,
                "service": a.service.name,
                "start_time": a.start_time.isoformat() + "Z",
                "end_time": a.end_time.isoformat() + "Z"
            } for a in appointments
        ]
    }

@router.delete("/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Soft delete a provider by setting is_active to False.
    This preserves historical appointment data.
    """
    provider = db.query(models.Provider).filter(
        models.Provider.id == provider_id,
        models.Provider.organization_id == current_user.organization_id
    ).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
        
    provider.is_active = False
    db.commit()
    return {"message": "Provider successfully deleted"}
