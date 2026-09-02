from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user
from app.core.utils import normalize_phone
from typing import List

router = APIRouter()

@router.get("/search")
def search_customers(phone: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Search for a customer by phone number, ensuring they belong to the org.
    """
    normalized_phone = normalize_phone(phone)
    customer = db.query(models.Customer).filter(
        models.Customer.phone == normalized_phone,
        models.Customer.organization_id == current_user.organization_id,
        models.Customer.is_deleted == False
    ).first()
    if not customer:
        return {"found": False}
    return {
        "found": True,
        "id": customer.id,
        "name": customer.name,
        "email": customer.email
    }

@router.get("/")
def get_customers(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Get all customers with their summary stats (Total appts, last appt), paginated.
    """
    # Only get customers who have an appointment with this organization and are not deleted
    customers = db.query(models.Customer).filter(
        models.Customer.organization_id == current_user.organization_id,
        models.Customer.is_deleted == False
    ).offset(skip).limit(limit).all()
    
    # Single query to get counts and max start time for all customers in this org
    stats = db.query(
        models.Appointment.customer_id,
        func.count(models.Appointment.id).label("total"),
        func.max(models.Appointment.start_time).label("last_visit")
    ).filter(
        models.Appointment.organization_id == current_user.organization_id
    ).group_by(models.Appointment.customer_id).all()
    
    stats_map = {row.customer_id: {"total": row.total, "last_visit": row.last_visit} for row in stats}

    result = []
    for c in customers:
        c_stats = stats_map.get(c.id, {"total": 0, "last_visit": None})
        total_appts = c_stats["total"]
        last_visit = c_stats["last_visit"]
        
        result.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "total_appointments": total_appts,
            "last_visit": last_visit.isoformat() + "Z" if last_visit else None,
            "status": "Active" if total_appts > 0 else "New"
        })
        
    return result

@router.get("/{customer_id}/history")
def get_customer_history(customer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Get full timeline of appointments and calls for a specific customer within the organization.
    """
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id, 
        models.Customer.organization_id == current_user.organization_id,
        models.Customer.is_deleted == False
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Get appointments for this org with joinedload to prevent N+1 queries
    appointments = db.query(models.Appointment).options(
        joinedload(models.Appointment.service),
        joinedload(models.Appointment.provider)
    ).filter(
        models.Appointment.customer_id == customer_id,
        models.Appointment.organization_id == current_user.organization_id
    ).order_by(models.Appointment.start_time.desc()).all()
    
    # Get calls (matched by phone number) for this org
    calls = db.query(models.CallLog).filter(
        models.CallLog.customer_phone == customer.phone,
        models.CallLog.organization_id == current_user.organization_id
    ).order_by(models.CallLog.created_at.desc()).all()
    
    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email
        },
        "appointments": [
            {
                "id": a.id,
                "date": a.start_time.isoformat() + "Z",
                "service": a.service.name,
                "provider": a.provider.name,
                "status": a.status
            } for a in appointments
        ],
        "calls": [
            {
                "id": c.id,
                "date": c.created_at.isoformat() + "Z",
                "duration": c.duration_seconds,
                "status": c.status,
                "transcript": c.transcript
            } for c in calls
        ]
    }

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Perform a Compliance Hard Anonymization to satisfy PIPEDA/GDPR Right to be Forgotten.
    Instead of a SQL DELETE (which breaks relational analytics), this scrambles PII and wipes call transcripts.
    """
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.organization_id == current_user.organization_id,
        models.Customer.is_deleted == False
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Store original phone to find calls before redacting
    original_phone = customer.phone
    
    # Anonymize PII
    customer.name = "Anonymous"
    customer.phone = f"REDACTED_{customer.id}"
    customer.email = None
    customer.is_deleted = True
    
    # Wipe call transcripts (PHI)
    calls = db.query(models.CallLog).filter(
        models.CallLog.customer_phone == original_phone,
        models.CallLog.organization_id == current_user.organization_id
    ).all()
    
    for call in calls:
        call.transcript = "REDACTED FOR COMPLIANCE"
        
    # Wipe appointment notes if applicable (currently our Appointment model doesn't have a notes field, but we should clear patient_name/phone if stored directly on appointment)
    # The appointments table links to customer_id, so the customer's PII is already redacted.
        
    db.commit()
    
    return {"status": "success", "message": "Customer data has been permanently anonymized for compliance."}
