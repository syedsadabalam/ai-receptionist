from fastapi import APIRouter, Depends, Request, Form, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/")
def get_calls(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    calls = db.query(models.CallLog).filter(
        models.CallLog.organization_id == current_user.organization_id
    ).order_by(models.CallLog.created_at.desc()).all()
    return calls

@router.post("/twilio/recording")
async def twilio_recording_webhook(
    request: Request,
    CallSid: str = Form(...),
    RecordingUrl: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Direct Twilio webhook for Call Recordings.
    Acts as a fail-safe backup to Vapi's end-of-call report.
    """
    from app.core.config import settings
    
    # Check if there is an existing call log to identify the sub-account
    call_log = db.query(models.CallLog).filter(models.CallLog.call_sid == CallSid).first()
    auth_token = settings.TWILIO_AUTH_TOKEN
    
    if call_log:
        organization = db.query(models.Organization).filter(models.Organization.id == call_log.organization_id).first()
        if organization and organization.twilio_subaccount_auth_token:
            auth_token = organization.twilio_subaccount_auth_token
            
    if auth_token:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(auth_token)
        signature = request.headers.get("X-Twilio-Signature", "")
        
        # Handle proxy URL resolution
        url = str(request.url)
        if settings.PUBLIC_URL:
            url = f"{settings.PUBLIC_URL.rstrip('/')}{request.url.path}"
            
        form_data = await request.form()
        post_vars = dict(form_data)
        
        if not validator.validate(url, post_vars, signature):
            # Fallback to master token validation if it was a sub-account check
            if auth_token != settings.TWILIO_AUTH_TOKEN and settings.TWILIO_AUTH_TOKEN:
                master_validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
                if not master_validator.validate(url, post_vars, signature):
                    raise HTTPException(status_code=403, detail="Invalid Twilio signature")
            else:
                raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    from starlette.concurrency import run_in_threadpool

    def update_call_log():
        call_log = db.query(models.CallLog).filter(models.CallLog.call_sid == CallSid).first()
        if call_log:
            call_log.recording_url = RecordingUrl
            db.commit()
            
    await run_in_threadpool(update_call_log)

    return {"status": "success"}
