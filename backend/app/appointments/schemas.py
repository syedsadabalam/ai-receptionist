from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum
import phonenumbers

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class AppointmentBase(BaseModel):
    organization_id: Optional[int] = None
    provider_id: Optional[int] = None
    service_id: Optional[int] = None
    provider_name: Optional[str] = None
    service_name: Optional[str] = None
    customer_name: str
    customer_phone: str
    start_time: datetime
    notes: Optional[str] = None
    customer_id: Optional[int] = None

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v):
        try:
            parsed = phonenumbers.parse(v, "US") # Default region
            if not phonenumbers.is_valid_number(parsed):
                raise ValueError("Invalid phone number")
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.phonenumberutil.NumberParseException:
            raise ValueError("Invalid phone number format")

class AppointmentCreate(AppointmentBase):
    pass

class Appointment(AppointmentBase):
    id: int
    customer_id: int
    end_time: datetime
    class Config:
        from_attributes = True
