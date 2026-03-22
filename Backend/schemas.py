from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime


# ── Staff ──────────────────────────────────────────────────────────────────
class StaffBase(BaseModel):
    name: str
    phone_number: str
    system_id: str
    pin: str
    is_active: bool = True

    @field_validator("pin")
    @classmethod
    def pin_must_be_5_digits(cls, v):
        if not v.isdigit() or len(v) != 5:
            raise ValueError("PIN must be exactly 5 digits")
        return v

    @field_validator("phone_number")
    @classmethod
    def phone_must_be_e164(cls, v):
        # Basic E.164 check — starts with + and has 10-15 digits
        cleaned = v.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
        if not cleaned.startswith("+"):
            cleaned = "+1" + cleaned  # Default to US if no country code
        return cleaned


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    pin: Optional[str] = None
    is_active: Optional[bool] = None


class StaffOut(StaffBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Section ────────────────────────────────────────────────────────────────
class SectionBase(BaseModel):
    section_code: str
    section_name: str


class SectionCreate(SectionBase):
    staff_id: Optional[int] = None


class SectionOut(SectionBase):
    id: int

    model_config = {"from_attributes": True}


# ── Subscription ───────────────────────────────────────────────────────────
class SubscriptionCreate(BaseModel):
    student_phone: str
    student_name: Optional[str] = None
    graduation_date: Optional[datetime] = None
    section_id: int


class SubscriptionOut(BaseModel):
    id: int
    student_phone: str
    student_name: Optional[str] = None
    graduation_date: Optional[datetime] = None
    is_active: bool
    section_id: int

    model_config = {"from_attributes": True}


# ── AlertLog ───────────────────────────────────────────────────────────────
class AlertLogOut(BaseModel):
    id: int
    sender_id: Optional[int]
    timestamp: datetime
    message_content: str
    recipient_count: int
    priority_level: str
    section_code: Optional[str]
    status: str

    model_config = {"from_attributes": True}


# ── SMS Outbound (Admin-triggered) ─────────────────────────────────────────
class AdminAlertCreate(BaseModel):
    message: str
    section_code: str  # Use "00000" for all
    priority_level: str = "NORMAL"

    @field_validator("message")
    @classmethod
    def message_max_160(cls, v):
        if len(v) > 160:
            raise ValueError("Message exceeds 160 character SMS limit")
        return v


# ── CSV Import ─────────────────────────────────────────────────────────────
class CSVRow(BaseModel):
    phone: str
    section_code: str
