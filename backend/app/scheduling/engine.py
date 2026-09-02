from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import models
from fastapi import BackgroundTasks
from datetime import datetime, timedelta, timezone
from typing import List
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.utils import normalize_phone

logger = logging.getLogger(__name__)

class SchedulingEngine:
    def __init__(self, db: Session):
        self.db = db

    def check_availability(self, provider_id: int, start_time: datetime, duration_minutes: int, buffer_minutes: int = 0) -> bool:
        """
        Checks if a provider is available for a specific time slot.
        """
        if buffer_minutes is None:
            buffer_minutes = 0
        end_time = start_time + timedelta(minutes=duration_minutes + buffer_minutes)
        
        # Check for overlapping appointments
        conflicts = self.db.query(models.Appointment).filter(
            models.Appointment.provider_id == provider_id,
            models.Appointment.status == models.AppointmentStatus.SCHEDULED,
            models.Appointment.start_time < end_time,
            models.Appointment.end_time > start_time
        ).count()
        
        return conflicts == 0

    def get_available_slots(self, organization_id: int, provider_id: int, date: datetime.date, service_id: int) -> List[datetime]:
        """
        Returns a list of available start times for a provider on a specific date (Organization Local Time).
        """
        from zoneinfo import ZoneInfo
        organization = self.db.query(models.Organization).filter(models.Organization.id == organization_id).first()
        tz_name = organization.timezone if organization else "UTC"
        tz = ZoneInfo(tz_name)
        
        service = self.db.query(models.Service).filter(models.Service.id == service_id).first()
        if not service:
            return []
            
        # Check if the requested date is a holiday
        is_holiday = self.db.query(models.OrganizationHoliday).filter(
            models.OrganizationHoliday.organization_id == organization_id,
            models.OrganizationHoliday.date == date
        ).first()
        if is_holiday:
            return [] # No slots available on holidays
        
        # Determine working hours: Priority 1: Provider-specific, Priority 2: Organization-global
        provider = self.db.query(models.Provider).filter(models.Provider.id == provider_id).first()
        
        raw_open = provider.open_time if provider and provider.open_time else organization.open_time
        raw_close = provider.close_time if provider and provider.close_time else organization.close_time
        
        # Parse dynamic hours (fallback to 9-5 if all else fails)
        if isinstance(raw_open, str):
            open_h, open_m = map(int, raw_open.split(':'))
        else:
            open_h, open_m = (raw_open.hour, raw_open.minute) if raw_open else (9, 0)
            
        if isinstance(raw_close, str):
            close_h, close_m = map(int, raw_close.split(':'))
        else:
            close_h, close_m = (raw_close.hour, raw_close.minute) if raw_close else (17, 0)
        
        # Define working hours in Organization Local Time
        start_of_day = datetime.combine(date, datetime.min.time()).replace(hour=open_h, minute=open_m, tzinfo=tz)
        end_of_day = datetime.combine(date, datetime.min.time()).replace(hour=close_h, minute=close_m, tzinfo=tz)
        
        # Provider Breaks
        break_start = None
        break_end = None
        if provider and provider.break_start and provider.break_end:
            break_start = datetime.combine(date, datetime.min.time()).replace(hour=provider.break_start.hour, minute=provider.break_start.minute, tzinfo=tz)
            break_end = datetime.combine(date, datetime.min.time()).replace(hour=provider.break_end.hour, minute=provider.break_end.minute, tzinfo=tz)
        
        # Get current time in Organization Local Time to prevent past-time bookings
        now_local = datetime.now(tz)
        
        available_slots = []
        current_time = start_of_day
        
        while current_time + timedelta(minutes=service.duration_minutes) <= end_of_day:
            # ONLY add if the slot is in the FUTURE relative to organization local time
            if current_time > now_local:
                # Check break collision
                is_during_break = False
                if break_start and break_end:
                    slot_end = current_time + timedelta(minutes=service.duration_minutes)
                    if (current_time < break_end) and (slot_end > break_start):
                        is_during_break = True
                
                if not is_during_break:
                    if self.check_availability(provider_id, current_time, service.duration_minutes, service.buffer_minutes):
                        available_slots.append(current_time)
            
            # Step by 15 minutes for finer slot selection (handles 45 min services better)
            current_time += timedelta(minutes=15)
            
        return available_slots

    def create_appointment(self, appointment_data: dict, background_tasks: BackgroundTasks = None) -> models.Appointment:
        """
        Creates an appointment with full validation and atomic conflict prevention.
        Addresses Race Conditions and Idempotency.
        """
        # 1. Idempotency Check (Prevent duplicate calls within 2 minutes)
        two_minutes_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=2)
        
        normalized_phone = normalize_phone(appointment_data['customer_phone'])
        
        existing_request = self.db.query(models.Appointment).join(models.Customer).filter(
            models.Customer.phone == normalized_phone,
            models.Appointment.start_time == appointment_data['start_time'],
            models.Appointment.created_at >= two_minutes_ago
        ).first()
        if existing_request:
            return existing_request # Return existing instead of creating duplicate

        # 2. Get service and validate
        service = self.db.query(models.Service).filter(models.Service.id == appointment_data['service_id']).first()
        if not service:
            raise ValueError("Service not found")
        
        start_time = appointment_data['start_time']
        duration = service.duration_minutes
        buffer = service.buffer_minutes
        
        # 3. Dynamic Business Hour Validation
        from zoneinfo import ZoneInfo
        organization = self.db.query(models.Organization).filter(models.Organization.id == appointment_data['organization_id']).first()
        provider = self.db.query(models.Provider).filter(models.Provider.id == appointment_data['provider_id']).first()
        
        tz_name = organization.timezone if organization else "UTC"
        tz = ZoneInfo(tz_name)
        
        import datetime as dt
        # Determine working hours: Priority 1: Provider-specific, Priority 2: Organization-global
        raw_open = provider.open_time if provider and provider.open_time else (organization.open_time or dt.time(9, 0))
        raw_close = provider.close_time if provider and provider.close_time else (organization.close_time or dt.time(17, 0))
    
        # Parse dynamic hours
        if isinstance(raw_open, str):
            open_h, open_m = map(int, raw_open.split(':'))
        else:
            open_h, open_m = raw_open.hour, raw_open.minute
            
        if isinstance(raw_close, str):
            close_h, close_m = map(int, raw_close.split(':'))
        else:
            close_h, close_m = raw_close.hour, raw_close.minute
        
        # If start_time is naive (which it should be from the API), treat it as Organization Local Time
        local_start = start_time.replace(tzinfo=tz) if start_time.tzinfo is None else start_time.astimezone(tz)
        
        # Check if the requested time is within the DOCTOR'S specific shift
        start_of_shift = local_start.replace(hour=open_h, minute=open_m, second=0, microsecond=0)
        end_of_shift = local_start.replace(hour=close_h, minute=close_m, second=0, microsecond=0)
        
        if not (start_of_shift <= local_start < end_of_shift):
            p_name = provider.name if provider else "The provider"
            raise ValueError(f"{p_name} is only available between {raw_open} and {raw_close} ({tz_name}).")

        # 4. ATOMIC CONFLICT CHECK
        # Acquire an exclusive transaction-level lock for this provider to prevent race conditions
        self.db.execute(text("SELECT pg_advisory_xact_lock(:id)").bindparams(id=appointment_data['provider_id']))

        # Now safely check availability (including buffer)
        if not self.check_availability(appointment_data['provider_id'], start_time, duration, buffer):
            p_name = provider.name if provider else "The provider"
            raise ValueError(f"The selected time slot for {p_name} is no longer available.")
            
        end_time = start_time + timedelta(minutes=duration)
        
        normalized_phone = normalize_phone(appointment_data['customer_phone'])
        
        # Find or create customer scoped to organization
        customer = self.db.query(models.Customer).filter(
            models.Customer.phone == normalized_phone,
            models.Customer.organization_id == appointment_data['organization_id']
        ).first()
        if not customer:
            customer = models.Customer(
                organization_id=appointment_data['organization_id'],
                name=appointment_data['customer_name'],
                phone=normalized_phone
            )
            self.db.add(customer)
            self.db.flush()

        appointment = models.Appointment(
            organization_id=appointment_data['organization_id'],
            provider_id=appointment_data['provider_id'],
            customer_id=customer.id,
            service_id=service.id,
            start_time=start_time,
            end_time=end_time,
            notes=appointment_data.get('notes'),
            status=models.AppointmentStatus.SCHEDULED
        )
        
        self.db.add(appointment)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise ValueError("A database conflict occurred during booking. Please try another time slot.")
            
        self.db.refresh(appointment)

        # Dispatch immediate SMS confirmation
        from app.workers.tasks import send_sms_confirmation
        
        # Format a nice message
        p_name = provider.name if provider else "our team"
        time_str = local_start.strftime('%b %d at %I:%M %p')
        sms_msg = f"Confirmed: Your appointment for {service.name} with {p_name} is set for {time_str}. See you then!"
        
        try:
            send_sms_confirmation.delay(
                phone=customer.phone,
                message=sms_msg,
                organization_id=appointment.organization_id
            )
        except Exception as e:
            logger.error(f"Failed to dispatch SMS confirmation for {appointment.id}: {e}")

        # 4. Sync to External Scheduler if enabled
        organization = self.db.query(models.Organization).filter(models.Organization.id == appointment.organization_id).first()
        if organization and (organization.google_calendar_id or organization.integration_type in ["acuity", "boulevard"]):
            from app.workers.tasks import sync_to_external_scheduler

            p_name = provider.name if provider else "Provider"
            sync_to_external_scheduler.delay(
                organization_id=organization.id,
                summary=f"Appointment: {customer.name} with {p_name}",
                description=f"Service: {service.name}\nCustomer Phone: {customer.phone}\nNotes: {appointment.notes}",
                start_time_iso=local_start.isoformat(),
                end_time_iso=(local_start + timedelta(minutes=duration)).isoformat(),
                customer_name=customer.name,
                customer_phone=customer.phone,
                customer_email=customer.email or "",
            )


        return appointment

    def cancel_appointment(self, appointment_id: int, organization_id: int = None) -> bool:
        """
        Cancels an appointment. In a real system, we'd check for cancellation policies here.
        """
        query = self.db.query(models.Appointment).filter(models.Appointment.id == appointment_id)
        if organization_id is not None:
            query = query.filter(models.Appointment.organization_id == organization_id)
        appointment = query.first()
        if not appointment:
            raise ValueError("Appointment not found")
        
        appointment.status = models.AppointmentStatus.CANCELLED
        self.db.commit()
        return True

    def update_appointment(self, appointment_id: int, new_start_time: datetime, organization_id: int = None) -> models.Appointment:
        """
        Reschedules an existing appointment to a new time.
        """
        query = self.db.query(models.Appointment).filter(models.Appointment.id == appointment_id)
        if organization_id is not None:
            query = query.filter(models.Appointment.organization_id == organization_id)
        appointment = query.first()
        if not appointment:
            raise ValueError("Appointment not found")

        # Get service to know the duration
        service = self.db.query(models.Service).filter(models.Service.id == appointment.service_id).first()
        duration = service.duration_minutes
        buffer = service.buffer_minutes

        # Acquire transaction lock for this provider
        self.db.execute(text("SELECT pg_advisory_xact_lock(:id)").bindparams(id=appointment.provider_id))

        # Check availability for the NEW time
        # We must exclude the CURRENT appointment from the conflict check
        end_time = new_start_time + timedelta(minutes=duration + buffer)
        conflicts = self.db.query(models.Appointment).filter(
            models.Appointment.provider_id == appointment.provider_id,
            models.Appointment.status == models.AppointmentStatus.SCHEDULED,
            models.Appointment.id != appointment_id, # Exclude self
            models.Appointment.start_time < end_time,
            models.Appointment.end_time > new_start_time
        ).count()

        if conflicts > 0:
            raise ValueError("The requested time slot is not available for this provider.")

        # Update times
        appointment.start_time = new_start_time
        appointment.end_time = end_time
        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def get_customer_appointments(self, customer_phone: str, organization_id: int = None) -> List[models.Appointment]:
        """
        Retrieves upcoming appointments for a customer by phone.
        """
        normalized_phone = normalize_phone(customer_phone)
        query = self.db.query(models.Appointment).join(models.Customer).filter(
            models.Customer.phone == normalized_phone,
            models.Appointment.status == models.AppointmentStatus.SCHEDULED,
            models.Appointment.start_time >= datetime.now()
        )
        if organization_id:
            query = query.filter(models.Appointment.organization_id == organization_id)
        return query.all()
