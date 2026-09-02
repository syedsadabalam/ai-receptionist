import pytest
from datetime import datetime, timedelta, timezone
from app.scheduling.engine import SchedulingEngine
from app.database import models

def test_check_availability_success(db_session):
    # Setup test data
    org = models.Organization(name="Test Clinic", timezone="UTC")
    db_session.add(org)
    db_session.flush()

    provider = models.Provider(organization_id=org.id, name="Dr. Smith")
    db_session.add(provider)
    db_session.flush()

    engine = SchedulingEngine(db_session)
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    
    # Provider should be available
    assert engine.check_availability(provider.id, start_time, duration_minutes=30) == True

def test_check_availability_conflict(db_session):
    # Setup test data
    org = models.Organization(name="Test Clinic", timezone="UTC")
    db_session.add(org)
    db_session.flush()

    provider = models.Provider(organization_id=org.id, name="Dr. Smith")
    db_session.add(provider)
    db_session.flush()

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    
    # Book an appointment
    appt = models.Appointment(
        organization_id=org.id,
        provider_id=provider.id,
        start_time=start_time,
        end_time=start_time + timedelta(minutes=60),
        status=models.AppointmentStatus.SCHEDULED
    )
    db_session.add(appt)
    db_session.commit()

    engine = SchedulingEngine(db_session)
    
    # Provider should NOT be available due to the overlap
    assert engine.check_availability(provider.id, start_time + timedelta(minutes=15), duration_minutes=30) == False

def test_book_appointment_idempotency(db_session):
    org = models.Organization(name="Test Clinic", timezone="UTC")
    db_session.add(org)
    db_session.flush()
    
    service = models.Service(organization_id=org.id, name="Cleaning", duration_minutes=30)
    provider = models.Provider(organization_id=org.id, name="Dr. Smith")
    db_session.add_all([service, provider])
    db_session.flush()

    engine = SchedulingEngine(db_session)
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    
    appt_data = {
        "organization_id": org.id,
        "provider_id": provider.id,
        "service_id": service.id,
        "customer_name": "John Doe",
        "customer_phone": "555-1234",
        "start_time": start_time
    }
    
    # First booking should succeed
    appt1 = engine.create_appointment(appt_data)
    assert appt1.id is not None
    
    # Second booking with exactly same data immediately after should return the same appointment (idempotency)
    appt2 = engine.create_appointment(appt_data)
    assert appt1.id == appt2.id
