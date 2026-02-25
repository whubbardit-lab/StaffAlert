from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import AlertLog, Staff, Subscription, Section
from schemas import AlertLogOut
from typing import List
from datetime import datetime
import csv
import io

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("/", response_model=List[AlertLogOut])
def get_logs(
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    return (
        db.query(AlertLog)
        .order_by(AlertLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_alerts = db.query(AlertLog).count()
    total_sent = db.query(AlertLog).filter(AlertLog.status == "SENT").count()
    total_partial = db.query(AlertLog).filter(AlertLog.status == "PARTIAL").count()
    total_recipients = db.query(AlertLog).with_entities(AlertLog.recipient_count).all()
    total_sms = sum(r[0] for r in total_recipients)
    return {
        "total_alerts": total_alerts,
        "successful_alerts": total_sent,
        "partial_alerts": total_partial,
        "total_sms_sent": total_sms
    }


@router.get("/export/alerts")
def export_alerts_csv(db: Session = Depends(get_db)):
    """Download all alert logs as CSV."""
    logs = db.query(AlertLog).order_by(AlertLog.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Section", "Message", "Recipients", "Priority", "Status", "Sender"])

    for log in logs:
        sender_name = log.sender.name if log.sender else "Admin Dashboard"
        writer.writerow([
            log.id,
            log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "",
            log.section_code or "",
            log.message_content,
            log.recipient_count,
            log.priority_level,
            log.status,
            sender_name
        ])

    output.seek(0)
    filename = f"paws_alerts_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/students")
def export_students_csv(db: Session = Depends(get_db)):
    """Download all students as CSV."""
    subs = db.query(Subscription).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Phone", "SectionCode", "SectionName", "GraduationDate", "Status"])

    for s in subs:
        writer.writerow([
            s.student_name or "",
            s.student_phone,
            s.section.section_code if s.section else "",
            s.section.section_name if s.section else "",
            s.graduation_date.strftime("%Y-%m-%d") if s.graduation_date else "",
            "Active" if s.is_active else "Inactive"
        ])

    output.seek(0)
    filename = f"paws_students_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
