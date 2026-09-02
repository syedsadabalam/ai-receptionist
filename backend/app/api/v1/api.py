from fastapi import APIRouter
from app.api.v1.endpoints import auth, voice, settings, customers, appointments, admin, analytics, providers, calls, calendar, services, faqs

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(voice.router, prefix="/voice", tags=["Voice Webhooks"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(admin.router, prefix="/admin", tags=["Super Admin"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(providers.router, prefix="/providers", tags=["Providers"])
api_router.include_router(calls.router, prefix="/calls", tags=["Calls"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(faqs.router, prefix="/faqs", tags=["FAQs"])
