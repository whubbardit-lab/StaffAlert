from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False)
    system_id = Column(String(20), unique=True, nullable=False)
    pin = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    alert_logs = relationship("AlertLog", back_populates="sender")


class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    section_code = Column(String(20), unique=True, nullable=False)
    section_name = Column(String(100), nullable=False)
    join_code = Column(String(10), nullable=True)
    join_code_expires = Column(DateTime, nullable=True)
    subscriptions = relationship("Subscription", back_populates="section")


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    student_phone = Column(String(20), nullable=False)
    student_name = Column(String(100), nullable=True)
    graduation_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    section = relationship("Section", back_populates="subscriptions")


class AlertLog(Base):
    __tablename__ = "alert_logs"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    message_content = Column(Text, nullable=False)
    recipient_count = Column(Integer, default=0)
    priority_level = Column(String(20), default="NORMAL")
    section_code = Column(String(20), nullable=True)
    status = Column(String(20), default="SENT")
    sender = relationship("Staff", back_populates="alert_logs")
    receipts = relationship("DeliveryReceipt", back_populates="alert_log")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)


class ScheduledAlert(Base):
    __tablename__ = "scheduled_alerts"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    section_code = Column(String(20), nullable=False)
    priority_level = Column(String(20), default="NORMAL")
    scheduled_for = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="PENDING")
    recipient_count = Column(Integer, default=0)


class DeliveryReceipt(Base):
    __tablename__ = "delivery_receipts"
    id = Column(Integer, primary_key=True, index=True)
    alert_log_id = Column(Integer, ForeignKey("alert_logs.id"), nullable=False)
    phone_number = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False)
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    alert_log = relationship("AlertLog", back_populates="receipts")


class SmsSession(Base):
    """Tracks mid-conversation state for staff SMS interactions."""
    __tablename__ = "sms_sessions"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), unique=True, nullable=False)
    state = Column(String(50), nullable=False, default="idle")
    context = Column(Text, nullable=True)  # JSON blob for partial state
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UnknownNumberLog(Base):
    """Logs texts from unrecognized numbers."""
    __tablename__ = "unknown_number_logs"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), nullable=False)
    message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
