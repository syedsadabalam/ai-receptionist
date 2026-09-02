from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.core.config import settings
from app.api.v1.api import api_router
from sqlalchemy import text
from app.database.session import engine

limiter = limiter  # re-export so it's accessible via app.main if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS origins are controlled via CORS_ORIGINS env var
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

if settings.ENVIRONMENT == "production":
    # Strip highly permissive and spoofable origins in production
    cors_origins = [o for o in cors_origins if "localhost" not in o and "127.0.0.1" not in o and o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "x-vapi-secret"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    """
    Health check endpoint for load balancers and orchestrators.
    Verifies DB connectivity.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "detail": str(e)}

@app.get("/")
async def root():
    return {"message": "Welcome to AI Dental Receptionist API"}
