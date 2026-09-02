from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_super_admin, get_password_hash
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional, List
import datetime

router = APIRouter()

# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    name: str
    industry: str = "dental"
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: str = "UTC"
    open_time: Optional[str] = "09:00"  # HH:MM
    close_time: Optional[str] = "17:00"  # HH:MM
    emergency_phone: Optional[str] = None
    website_url: Optional[str] = None
    map_link: Optional[str] = None
    custom_prompt: Optional[str] = None

class OrganizationPatch(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    emergency_phone: Optional[str] = None
    website_url: Optional[str] = None
    map_link: Optional[str] = None
    custom_prompt: Optional[str] = None

class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int
    buffer_minutes: int = 0
    price: float = 0.0

class ProviderCreate(BaseModel):
    name: str
    specialty: str
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str
    is_admin: bool = True

# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────

def _parse_time(t: Optional[str]) -> Optional[datetime.time]:
    if not t:
        return None
    h, m = map(int, t.split(":"))
    return datetime.time(h, m)

def _org_summary(org: models.Organization, db: Session) -> dict:
    total_appts = db.query(func.count(models.Appointment.id)).filter(
        models.Appointment.organization_id == org.id
    ).scalar() or 0
    total_calls = db.query(func.count(models.CallLog.id)).filter(
        models.CallLog.organization_id == org.id
    ).scalar() or 0
    last_call = db.query(func.max(models.CallLog.created_at)).filter(
        models.CallLog.organization_id == org.id
    ).scalar()
    user_count = db.query(func.count(models.User.id)).filter(
        models.User.organization_id == org.id
    ).scalar() or 0
    return {
        "id": org.id,
        "name": org.name,
        "industry": org.industry,
        "phone": org.phone,
        "address": org.address,
        "timezone": org.timezone,
        "open_time": org.open_time.strftime("%H:%M") if org.open_time else None,
        "close_time": org.close_time.strftime("%H:%M") if org.close_time else None,
        "emergency_phone": org.emergency_phone,
        "website_url": org.website_url,
        "map_link": org.map_link,
        "custom_prompt": org.custom_prompt,
        "vapi_assistant_id": org.vapi_assistant_id,
        "is_provisioned": bool(org.vapi_assistant_id),
        "total_appointments": total_appts,
        "total_calls": total_calls,
        "user_count": user_count,
        "last_call_at": last_call.isoformat() if last_call else None,
    }

# ─────────────────────────────────────────────
# Platform Stats
# ─────────────────────────────────────────────

@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """Platform-wide aggregate metrics."""
    total_orgs = db.query(func.count(models.Organization.id)).scalar() or 0
    provisioned_orgs = db.query(func.count(models.Organization.id)).filter(
        models.Organization.vapi_assistant_id.isnot(None)
    ).scalar() or 0
    total_calls = db.query(func.count(models.CallLog.id)).scalar() or 0
    total_appts = db.query(func.count(models.Appointment.id)).scalar() or 0
    total_users = db.query(func.count(models.User.id)).filter(
        models.User.is_super_admin == False
    ).scalar() or 0

    # Calls over the last 7 days
    call_trend = []
    for i in range(6, -1, -1):
        day = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=i)).date()
        count = db.query(func.count(models.CallLog.id)).filter(
            func.date(models.CallLog.created_at) == day
        ).scalar() or 0
        call_trend.append({"day": day.strftime("%a"), "count": count})

    return {
        "total_organizations": total_orgs,
        "provisioned_organizations": provisioned_orgs,
        "total_calls": total_calls,
        "total_appointments": total_appts,
        "total_client_users": total_users,
        "call_trend": call_trend,
    }

# ─────────────────────────────────────────────
# Organization CRUD
# ─────────────────────────────────────────────

@router.get("/organizations")
def list_organizations(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """List all tenant organizations with stats."""
    orgs = db.query(models.Organization).order_by(models.Organization.id.desc()).all()
    return [_org_summary(o, db) for o in orgs]


@router.post("/organizations", status_code=201)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """Create a new tenant organization."""
    org = models.Organization(
        name=data.name,
        industry=data.industry,
        phone=data.phone,
        address=data.address,
        timezone=data.timezone,
        open_time=_parse_time(data.open_time),
        close_time=_parse_time(data.close_time),
        emergency_phone=data.emergency_phone,
        website_url=data.website_url,
        map_link=data.map_link,
        custom_prompt=data.custom_prompt,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return _org_summary(org, db)


@router.get("/organizations/{org_id}")
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """Get full detail for one organization."""
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    summary = _org_summary(org, db)

    # Include services and providers
    summary["services"] = [
        {"id": s.id, "name": s.name, "duration_minutes": s.duration_minutes}
        for s in db.query(models.Service).filter(
            models.Service.organization_id == org_id,
            models.Service.is_deleted == False
        ).all()
    ]
    summary["providers"] = [
        {
            "id": p.id,
            "name": p.name,
            "specialty": p.specialty,
            "open_time": p.open_time.strftime("%H:%M") if p.open_time else None,
            "close_time": p.close_time.strftime("%H:%M") if p.close_time else None,
            "is_active": p.is_active,
        }
        for p in db.query(models.Provider).filter(
            models.Provider.organization_id == org_id
        ).all()
    ]
    summary["users"] = [
        {"id": u.id, "username": u.username, "email": u.email, "is_admin": u.is_admin}
        for u in db.query(models.User).filter(
            models.User.organization_id == org_id
        ).all()
    ]
    return summary


@router.patch("/organizations/{org_id}")
def update_organization(
    org_id: int,
    data: OrganizationPatch,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """Update any field on an organization."""
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("open_time", "close_time"):
            setattr(org, key, _parse_time(value))
        else:
            setattr(org, key, value)

    db.commit()
    db.refresh(org)
    return _org_summary(org, db)


@router.delete("/organizations/{org_id}")
def deactivate_organization(
    org_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """Soft-deactivate an org by disabling all its users."""
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.query(models.User).filter(models.User.organization_id == org_id).update({"is_active": False})
    db.commit()
    return {"status": "deactivated", "organization_id": org_id}

# ─────────────────────────────────────────────
# HOLIDAYS MANAGEMENT
# ─────────────────────────────────────────────

class HolidayCreate(BaseModel):
    date: str # YYYY-MM-DD
    name: str

@router.post("/organizations/{org_id}/holidays", status_code=201)
def create_holiday(org_id: int, data: HolidayCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_super_admin)):
    from datetime import datetime
    holiday_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    h = models.OrganizationHoliday(organization_id=org_id, date=holiday_date, name=data.name)
    db.add(h)
    db.commit()
    db.refresh(h)
    return {"id": h.id, "date": str(h.date), "name": h.name}

@router.delete("/organizations/{org_id}/holidays/{holiday_id}")
def delete_holiday(org_id: int, holiday_id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_current_super_admin)):
    h = db.query(models.OrganizationHoliday).filter(models.OrganizationHoliday.id == holiday_id, models.OrganizationHoliday.organization_id == org_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(h)
    db.commit()
    return {"status": "success"}

# ─────────────────────────────────────────────
# Services & Providers (Admin-level add)
# ─────────────────────────────────────────────

@router.post("/organizations/{org_id}/services", status_code=201)
def add_service(
    org_id: int,
    data: ServiceCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    svc = models.Service(organization_id=org_id, name=data.name, duration_minutes=data.duration_minutes, buffer_minutes=data.buffer_minutes, price=data.price)
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return {"id": svc.id, "name": svc.name, "duration_minutes": svc.duration_minutes, "buffer_minutes": svc.buffer_minutes, "price": svc.price}


@router.post("/organizations/{org_id}/providers", status_code=201)
def add_provider(
    org_id: int,
    data: ProviderCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    from datetime import datetime
    prov = models.Provider(
        organization_id=org_id,
        name=data.name,
        specialty=data.specialty,
        open_time=datetime.strptime(data.open_time, '%H:%M').time() if data.open_time else None,
        close_time=datetime.strptime(data.close_time, '%H:%M').time() if data.close_time else None,
        break_start=datetime.strptime(data.break_start, '%H:%M').time() if data.break_start else None,
        break_end=datetime.strptime(data.break_end, '%H:%M').time() if data.break_end else None
    )
    db.add(prov)
    db.commit()
    db.refresh(prov)
    return {"id": prov.id, "name": prov.name, "specialty": prov.specialty}

# ─────────────────────────────────────────────
# Admin User Creation
# ─────────────────────────────────────────────

@router.post("/organizations/{org_id}/users", status_code=201)
def create_org_user(
    org_id: int,
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """Create a clinic admin user for a specific organization."""
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing = db.query(models.User).filter(
        (models.User.username == data.username) | (models.User.email == data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username or email already taken")

    user = models.User(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        is_active=True,
        is_admin=data.is_admin,
        is_super_admin=False,
        organization_id=org_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email, "organization_id": org_id}

# ─────────────────────────────────────────────
# AI Provisioning
# ─────────────────────────────────────────────

@router.post("/organizations/{org_id}/provision")
def provision_organization_ai(
    org_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_super_admin)
):
    """
    Provision the Vapi AI assistant for a given organization.
    Saves the returned assistant_id back to the organization record.
    """
    if not settings.VAPI_API_KEY:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY is not configured in .env")
    if not settings.PUBLIC_URL:
        raise HTTPException(status_code=400, detail="PUBLIC_URL is not configured in .env")

    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    from scripts.provision_vapi_assistant import provision_assistant
    assistant_id = provision_assistant(settings.VAPI_API_KEY, settings.PUBLIC_URL, org_id)

    if not assistant_id:
        raise HTTPException(status_code=502, detail="Vapi provisioning failed. Check server logs.")

    org.vapi_assistant_id = assistant_id
    db.commit()

    return {
        "status": "provisioned",
        "organization_id": org_id,
        "vapi_assistant_id": assistant_id,
    }
