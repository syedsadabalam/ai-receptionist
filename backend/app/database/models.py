from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum, Time, UniqueConstraint, Float, Date
from sqlalchemy.orm import relationship
from app.database.session import Base
import datetime
import enum

class AppointmentStatus(enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_super_admin = Column(Boolean, default=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    organization = relationship("Organization", back_populates="users")

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    industry = Column(String, default="dental") # "dental", "medical_clinic", "law", "salon", "medspa"
    address = Column(String)
    phone = Column(String)
    timezone = Column(String, default="UTC")
    google_calendar_id = Column(String, nullable=True)
    google_oauth_access_token = Column(String, nullable=True)
    google_oauth_refresh_token = Column(String, nullable=True)
    google_oauth_expires_at = Column(DateTime, nullable=True)
    custom_prompt = Column(Text, nullable=True) # User-editable instructions
    
    # New Production Fields
    open_time = Column(Time, default=datetime.time(9, 0))
    close_time = Column(Time, default=datetime.time(17, 0))
    emergency_phone = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    map_link = Column(String, nullable=True)
    vapi_assistant_id = Column(String, nullable=True, index=True)  # Set during provisioning
    vapi_voice_id = Column(String, nullable=True, default="F89WkXaQbUlVyNvtlD3X")  # Default to Jennifer
    
    # Twilio Sub-Accounts
    twilio_subaccount_sid = Column(String, nullable=True)
    twilio_subaccount_auth_token = Column(String, nullable=True)
    twilio_phone_number_sid = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

    # Integrations
    integration_type = Column(String, nullable=True) # "google_calendar" | "acuity" | "boulevard"
    acuity_user_id = Column(String, nullable=True)
    acuity_api_key = Column(String, nullable=True)
    boulevard_api_key = Column(String, nullable=True)
    boulevard_business_id = Column(String, nullable=True)
    
    users = relationship("User", back_populates="organization")
    services = relationship("Service", back_populates="organization")
    providers = relationship("Provider", back_populates="organization")
    faqs = relationship("OrganizationFAQ", back_populates="organization")
    holidays = relationship("OrganizationHoliday", back_populates="organization")
    appointments = relationship("Appointment", back_populates="organization")
    call_logs = relationship("CallLog", back_populates="organization")

class OrganizationFAQ(Base):
    __tablename__ = "organization_faqs"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    question_key = Column(String, index=True) # e.g., "parking", "insurance"
    answer = Column(Text)
    is_deleted = Column(Boolean, default=False, index=True)
    
    organization = relationship("Organization", back_populates="faqs")

class OrganizationHoliday(Base):
    __tablename__ = "organization_holidays"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    date = Column(Date, index=True)
    name = Column(String)
    
    organization = relationship("Organization", back_populates="holidays")

class Provider(Base):
    __tablename__ = "providers"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String, index=True)
    specialty = Column(String)
    open_time = Column(Time, nullable=True)
    close_time = Column(Time, nullable=True)
    break_start = Column(Time, nullable=True)
    break_end = Column(Time, nullable=True)
    is_active = Column(Boolean, default=True)
    
    organization = relationship("Organization", back_populates="providers")
    appointments = relationship("Appointment", back_populates="provider")

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String, index=True)
    duration_minutes = Column(Integer, default=30)
    buffer_minutes = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    is_deleted = Column(Boolean, default=False, index=True)
    
    organization = relationship("Organization", back_populates="services")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String, index=True, nullable=True)
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'phone', name='uix_org_phone'),
    )
    
    organization = relationship("Organization")
    appointments = relationship("Appointment", back_populates="customer")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    provider_id = Column(Integer, ForeignKey("providers.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    service_id = Column(Integer, ForeignKey("services.id"))
    
    start_time = Column(DateTime, index=True)
    end_time = Column(DateTime, index=True)
    status = Column(SQLEnum(AppointmentStatus, name="appointmentstatus"), default=AppointmentStatus.SCHEDULED, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('provider_id', 'start_time', name='uix_provider_start_time'),
    )
    
    organization = relationship("Organization", back_populates="appointments")
    provider = relationship("Provider", back_populates="appointments")
    customer = relationship("Customer", back_populates="appointments")
    service = relationship("Service")

class CallLog(Base):
    __tablename__ = "call_logs"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    call_sid = Column(String, unique=True, index=True)
    customer_phone = Column(String, index=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String) # e.g., "completed", "transferred"
    transcript = Column(Text, nullable=True)
    recording_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    organization = relationship("Organization", back_populates="call_logs")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null if AI did it
    action = Column(String)
    entity_type = Column(String) # e.g. "appointment"
    entity_id = Column(Integer)
    details = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

class OrganizationUsage(Base):
    __tablename__ = "organization_usage"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), unique=True)
    vapi_minutes_used = Column(Integer, default=0)
    billing_cycle_start = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    is_active_subscription = Column(Boolean, default=True)
    
    organization = relationship("Organization")

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
