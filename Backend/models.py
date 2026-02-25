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
    pin = Column(String(5), nullable=False)  # 5-digit PIN stored as string
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    alert_logs = relationship("AlertLog", back_populates="sender")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    section_code = Column(String(20), unique=True, nullable=False)
    section_name = Column(String(100), nullable=False)

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
    priority_level = Column(String(20), default="NORMAL")  # NORMAL, URGENT, EMERGENCY
    section_code = Column(String(20), nullable=True)
    status = Column(String(20), default="SENT")  # SENT, FAILED, PARTIAL

    sender = relationship("Staff", back_populates="alert_logs")
