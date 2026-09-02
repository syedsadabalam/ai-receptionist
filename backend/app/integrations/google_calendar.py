import google.oauth2.credentials
from googleapiclient.discovery import build
import os
import json
from app.core.config import settings
import logging

class GoogleCalendarService:
    def __init__(self):
        self.scopes = ['https://www.googleapis.com/auth/calendar']

    def _get_service(self, access_token: str, refresh_token: str):
        if not access_token:
            return None, None

        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError(
                "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET in your environment variables."
            )

        credentials = google.oauth2.credentials.Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=self.scopes
        )

        service = build('calendar', 'v3', credentials=credentials)
        return service, credentials


    def is_slot_available(self, calendar_id: str, start_time: str, end_time: str, access_token: str, refresh_token: str, organization_id: int = None) -> bool:
        """
        Checks if a time slot is available on Google Calendar.
        """
        service, credentials = self._get_service(access_token, refresh_token)
        if not service:
            return True # Fallback if not configured
            
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=start_time,
            timeMax=end_time,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        # If the token was refreshed, persist it back to the database
        if credentials.token and credentials.token != access_token and organization_id:
            try:
                from app.database.session import SessionLocal
                from app.database import models
                with SessionLocal() as db:
                    org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
                    if org:
                        org.google_oauth_access_token = credentials.token
                        org.google_oauth_expires_at = credentials.expiry
                        db.commit()
                        logging.info(f"Persisted refreshed Google OAuth token for organization {organization_id}.")
            except Exception as db_err:
                logging.error(f"Failed to persist refreshed Google OAuth token: {db_err}")
        
        events = events_result.get('items', [])
        active_events = [e for e in events if e.get('status') != 'cancelled']
        return len(active_events) == 0

    def book_appointment(self, calendar_id: str, summary: str, description: str, start_time: str, end_time: str, access_token: str, refresh_token: str, organization_id: int = None):
        """
        Creates an event on Google Calendar.
        """
        service, credentials = self._get_service(access_token, refresh_token)
        if not service:
            return None
            
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time,
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'UTC',
            },
        }

        try:
            event = service.events().insert(calendarId=calendar_id, body=event).execute()

            # If the token was refreshed, persist it back to the database
            if credentials.token and credentials.token != access_token and organization_id:
                try:
                    from app.database.session import SessionLocal
                    from app.database import models
                    with SessionLocal() as db:
                        org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
                        if org:
                            org.google_oauth_access_token = credentials.token
                            org.google_oauth_expires_at = credentials.expiry
                            db.commit()
                            logging.info(f"Persisted refreshed Google OAuth token for organization {organization_id}.")
                except Exception as db_err:
                    logging.error(f"Failed to persist refreshed Google OAuth token: {db_err}")

            return event
        except Exception as e:
            logging.error(f"Error booking Google Calendar event: {e}")
            raise e

calendar_service = GoogleCalendarService()
