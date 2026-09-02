from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Dental Receptionist"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # "development" | "production"

    DATABASE_URL: str
    SECRET_KEY: str
    PUBLIC_URL: str = "http://localhost:8000"  # Required for Vapi webhooks
    FRONTEND_URL: str = "http://localhost:3000"  # Used for OAuth redirects
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Vapi
    VAPI_API_KEY: Optional[str] = None
    VAPI_WEBHOOK_SECRET: Optional[str] = None

    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI & Speech
    GROQ_API_KEY: Optional[str] = None
    DEEPGRAM_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: Optional[str] = None

    # Services
    RESEND_API_KEY: Optional[str] = None
    GOOGLE_CALENDAR_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None

    # Google OAuth (required for Google Calendar user-level integration)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Firebase
    FIREBASE_API_KEY: Optional[str] = None
    FIREBASE_AUTH_DOMAIN: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_STORAGE_BUCKET: Optional[str] = None
    FIREBASE_MESSAGING_SENDER_ID: Optional[str] = None
    FIREBASE_APP_ID: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

