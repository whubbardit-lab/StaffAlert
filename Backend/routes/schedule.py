from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from security import require_auth
from database import SessionLocal
from models import ScheduledAlert, Section, Subscription, AlertLog
from sms import broadcast_sms
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import asyncio, logging

router = APIRouter(prefix="/scheduled", tags=["Scheduled Alerts"])
logger = logging.getLogger("scheduler")


class ScheduledAlertCreate(BaseModel):
    message: str
    section_code: str
    priority_level: str = "NORMAL"
    scheduled_for: str  # ISO format WITH timezone offset: "2026-02-28T14:30:00-05:00"

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v):
        if not v.strip(): raise ValueError("Message cannot be empty")
        if len(v) > 160: raise ValueError("Message exceeds 160 characters")
        return v

    @field_validator("scheduled_for")
    @classmethod
    def must_be_future(cls, v):
        try:
            # Parse with timezone awareness
            if v.endswith("Z"):
                dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
            else:
                dt = datetime.fromisoformat(v)
            # Convert to UTC for comparison
            if dt.tzinfo is not None:
                dt_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                # Assume UTC if no tz provided
                dt_utc = dt
            if dt_utc <= datetime.utcnow():
                raise ValueError("Scheduled time must be in the future")
        except ValueError as e:
            raise e
        return v


async def fire_scheduled_alert(alert_id: int):
    db = SessionLocal()
    try:
        alert = db.query(ScheduledAlert).filter(ScheduledAlert.id == alert_id).first()
        if not alert or alert.status != "PENDING": return
        if alert.section_code == "00000":
            subscriptions = db.query(Subscription).filter(Subscription.is_active == True).all()
            recipients = list({s.student_phone for s in subscriptions})
            log_section = "ALL"
        else:
            section = db.query(Section).filter(Section.section_code == alert.section_code).first()
            if not section:
                alert.status = "FAILED"; db.commit(); return
            subscriptions = db.query(Subscription).filter(
                Subscription.section_id == section.id, Subscription.is_active == True).all()
            recipients = [s.student_phone for s in subscriptions]
            log_section = alert.section_code
        if not recipients:
            alert.status = "FAILED"; db.commit(); return
        prefix = f"[{log_section}] " if log_section != "ALL" else "[CAMPUS] "
        outbound = prefix + alert.message
        if len(outbound) > 160: outbound = alert.message
        result = await broadcast_sms(recipients, outbound)
        alert.status = "SENT" if result["failed"] == 0 else "PARTIAL"
        alert.recipient_count = result["sent"]
        log = AlertLog(sender_id=None, message_content=alert.message,
                       recipient_count=result["sent"], priority_level=alert.priority_level,
                       section_code=log_section, status=alert.status)
        db.add(log); db.commit()
        logger.info(f"Scheduled alert {alert_id} fired: {result['sent']}/{result['total']}")
    except Exception as e:
        logger.error(f"Error firing scheduled alert {alert_id}: {e}")
        if alert: alert.status = "FAILED"; db.commit()
    finally:
        db.close()


def check_and_fire_due_alerts():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        due = db.query(ScheduledAlert).filter(
            ScheduledAlert.status == "PENDING",
            ScheduledAlert.scheduled_for <= now
        ).all()
        for alert in due:
            logger.info(f"Firing scheduled alert {alert.id}")
            asyncio.create_task(fire_scheduled_alert(alert.id))
    except Exception as e:
        logger.error(f"Scheduler check error: {e}")
    finally:
        db.close()


@router.get("/")
def get_scheduled_alerts(db: Session = Depends(get_db), auth=Depends(require_auth)):
    alerts = db.query(ScheduledAlert).order_by(ScheduledAlert.scheduled_for.asc()).all()
    return [
        {
            "id": a.id,
            "message": a.message,
            "section_code": a.section_code,
            "priority_level": a.priority_level,
            # Return as UTC ISO string — frontend converts to local time
            "scheduled_for": a.scheduled_for.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "created_at": a.created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": a.status,
            "recipient_count": a.recipient_count
        }
        for a in alerts
    ]


@router.post("/", status_code=201)
def create_scheduled_alert(alert: ScheduledAlertCreate, db: Session = Depends(get_db), auth=Depends(require_auth)):
    v = alert.scheduled_for
    if v.endswith("Z"):
        dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
    else:
        dt = datetime.fromisoformat(v)
    # Convert to naive UTC for storage
    if dt.tzinfo is not None:
        scheduled_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
    else:
        scheduled_utc = dt

    new_alert = ScheduledAlert(
        message=alert.message,
        section_code=alert.section_code,
        priority_level=alert.priority_level,
        scheduled_for=scheduled_utc,
        status="PENDING"
    )
    db.add(new_alert); db.commit(); db.refresh(new_alert)
    return {
        "id": new_alert.id,
        "message": new_alert.message,
        "section_code": new_alert.section_code,
        "scheduled_for": new_alert.scheduled_for.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": new_alert.status
    }


@router.delete("/{alert_id}", status_code=204)
def cancel_scheduled_alert(alert_id: int, db: Session = Depends(get_db), auth=Depends(require_auth)):
    alert = db.query(ScheduledAlert).filter(ScheduledAlert.id == alert_id).first()
    if not alert: raise HTTPException(status_code=404, detail="Scheduled alert not found")
    if alert.status != "PENDING": raise HTTPException(status_code=400, detail="Only PENDING alerts can be cancelled")
    alert.status = "CANCELLED"; db.commit()
