from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database import models
from app.core.config import settings
from app.core import auth
import google_auth_oauthlib.flow
from fastapi.responses import RedirectResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

SCOPES = ['https://www.googleapis.com/auth/calendar']


def get_flow(state=None):
    """
    Builds the Google OAuth flow from config.
    Raises HTTP 503 if Google OAuth credentials are not configured.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar integration is not configured. "
                   "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment."
        )

    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "project_id": "ai-receptionist",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uris": [f"{settings.PUBLIC_URL}{settings.API_V1_STR}/calendar/oauth/callback"]
        }
    }

    flow = google_auth_oauthlib.flow.Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        state=state
    )
    flow.redirect_uri = f"{settings.PUBLIC_URL}{settings.API_V1_STR}/calendar/oauth/callback"
    return flow


@router.get("/oauth/login")
def oauth_login(token: str, db: Session = Depends(get_db)):
    """
    Start the Google OAuth flow. The frontend must pass the JWT access token in the query params.
    """
    try:
        payload = auth.decode_access_token(token)
        org_id = payload.get("organization_id")
        if not org_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    flow = get_flow(state=str(org_id))
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=authorization_url)


@router.get("/oauth/callback")
def oauth_callback(state: str, code: str, db: Session = Depends(get_db)):
    """
    Handle the OAuth callback from Google. Exchanges the authorization code
    for real access and refresh tokens and stores them on the organization.
    """
    try:
        org_id = int(state)
        organization = db.query(models.Organization).filter(models.Organization.id == org_id).first()
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")

        flow = get_flow(state=state)

        # Exchange authorization code for real tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        organization.google_oauth_access_token = credentials.token
        organization.google_oauth_refresh_token = credentials.refresh_token
        organization.google_oauth_expires_at = credentials.expiry
        organization.google_calendar_id = "primary"

        db.commit()

        # Redirect back to frontend settings using the configured FRONTEND_URL
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/settings?calendar_connected=true")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth Callback Error: {e}")
        raise HTTPException(status_code=400, detail="Failed to complete OAuth flow")

