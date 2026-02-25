from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Staff, Section, Subscription, AlertLog
from sms import broadcast_sms
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import asyncio

router = APIRouter(prefix="/alerts", tags=["Alerts"])


# ── Schemas ────────────────────────────────────────────────────────────────
class AlertSend(BaseModel):
    message: str
    section_code: str  # "00000" for all
    priority_level: str = "NORMAL"
    sender_name: str = "Admin Dashboard"

    @field_validator("message")
    @classmethod
    def message_max_160(cls, v):
        if len(v) > 160:
            raise ValueError("Message exceeds 160 character limit")
        return v


class AlertTemplate(BaseModel):
    id: Optional[int] = None
    name: str
    message: str
    section_code: str = "00000"
    priority_level: str = "NORMAL"


# ── In-memory template store (persists while server is running) ────────────
# In production you'd store these in the database
_templates: List[dict] = [
    {"id": 1, "name": "Class Cancelled", "message": "Class is cancelled today. Please check Blackboard for updates.", "section_code": "", "priority_level": "NORMAL"},
    {"id": 2, "name": "Campus Closure", "message": "Campus is closing early today. Please leave safely.", "section_code": "00000", "priority_level": "EMERGENCY"},
    {"id": 3, "name": "Room Change", "message": "Class location has changed. Please check your email for details.", "section_code": "", "priority_level": "NORMAL"},
    {"id": 4, "name": "Weather Emergency", "message": "Severe weather alert. Campus is closed. Stay safe.", "section_code": "00000", "priority_level": "EMERGENCY"},
]
_next_template_id = 5


# ── Send Alert ─────────────────────────────────────────────────────────────
@router.post("/send")
async def send_alert(alert: AlertSend, db: Session = Depends(get_db)):
    """Admin dashboard triggered alert — no phone/PIN required."""

    # Resolve recipients
    if alert.section_code == "00000":
        subscriptions = db.query(Subscription).filter(
            Subscription.is_active == True
        ).all()
        recipients = list({s.student_phone for s in subscriptions})
        log_section = "ALL"
    else:
        section = db.query(Section).filter(
            Section.section_code == alert.section_code
        ).first()
        if not section:
            raise HTTPException(status_code=404, detail=f"Section '{alert.section_code}' not found")

        subscriptions = db.query(Subscription).filter(
            Subscription.section_id == section.id,
            Subscription.is_active == True
        ).all()
        recipients = [s.student_phone for s in subscriptions]
        log_section = alert.section_code

    if not recipients:
        raise HTTPException(status_code=400, detail="No active subscribers found for this section")

    # Build outbound message
    prefix = f"[{log_section}] " if log_section != "ALL" else "[CAMPUS] "
    outbound = prefix + alert.message
    if len(outbound) > 160:
        outbound = alert.message

    # Fire broadcast
    result = await broadcast_sms(recipients, outbound)

    # Log it
    log = AlertLog(
        sender_id=None,
        message_content=alert.message,
        recipient_count=result["sent"],
        priority_level=alert.priority_level,
        section_code=log_section,
        status="SENT" if result["failed"] == 0 else "PARTIAL"
    )
    db.add(log)
    db.commit()

    return {
        "sent": result["sent"],
        "failed": result["failed"],
        "total": result["total"],
        "message": f"Alert sent to {result['sent']}/{result['total']} recipients"
    }


# ── Templates ──────────────────────────────────────────────────────────────
@router.get("/templates")
def get_templates():
    return _templates


@router.post("/templates")
def create_template(template: AlertTemplate):
    global _next_template_id
    new_template = template.model_dump()
    new_template["id"] = _next_template_id
    _next_template_id += 1
    _templates.append(new_template)
    return new_template


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int):
    global _templates
    _templates = [t for t in _templates if t["id"] != template_id]


# ── Sections list for dropdown ─────────────────────────────────────────────
@router.get("/sections-list")
def get_sections_for_alerts(db: Session = Depends(get_db)):
    sections = db.query(Section).all()
    result = [{"code": "00000", "name": "🚨 ALL STUDENTS (Emergency Broadcast)"}]
    result += [{"code": s.section_code, "name": f"{s.section_code} — {s.section_name}"} for s in sections]
    return result
