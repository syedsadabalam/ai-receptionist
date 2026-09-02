from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    custom_prompt: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    emergency_phone: Optional[str] = None
    website_url: Optional[str] = None
    map_link: Optional[str] = None

@router.get("/")
def get_settings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.core.config import settings as app_settings
    organization = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    return {
        "organization": organization,
        "env": {
            "vapi_key_configured": bool(app_settings.VAPI_API_KEY),
            "elevenlabs_voice_configured": bool(app_settings.ELEVENLABS_VOICE_ID),
            "twilio_configured": bool(app_settings.TWILIO_ACCOUNT_SID)
        }
    }

@router.patch("/")
def update_settings(data: OrganizationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    organization = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(organization, key, value)
        
    db.commit()
    db.refresh(organization)
    return organization

@router.post("/sync")
def sync_ai(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Triggers a re-provisioning of the Vapi assistant with the latest DB settings.
    """
    from scripts.provision_vapi_assistant import provision_assistant
    from app.core.config import settings
    
    public_url = settings.PUBLIC_URL
    if not public_url:
        raise HTTPException(status_code=400, detail="PUBLIC_URL is not set in environment. Cannot sync AI.")

    vapi_key = settings.VAPI_API_KEY
    if not vapi_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY is not set in .env.")
    
    # In a full auth system, this would be: organization = current_user.organization
    organization = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="No organization found.")
        
    assistant_id = provision_assistant(vapi_key, public_url, organization_id=organization.id)
    
    if assistant_id:
        return {"status": "success", "assistant_id": assistant_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to sync with Vapi.")
