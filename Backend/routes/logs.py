from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import AlertLog, Staff, Subscription, Section, DeliveryReceipt
from schemas import AlertLogOut
from typing import List
from datetime import datetime, timedelta
from collections import defaultdict
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


@router.get("/stats/charts")
def get_chart_data(db: Session = Depends(get_db)):
    """Rich statistics data for the charts page."""

    logs = db.query(AlertLog).order_by(AlertLog.timestamp.asc()).all()

    # ── Alerts by day (last 30 days) ───────────────────────────────────────
    today = datetime.utcnow().date()
    thirty_days_ago = today - timedelta(days=29)

    day_counts = defaultdict(lambda: {"alerts": 0, "sms": 0})
    for log in logs:
        if log.timestamp and log.timestamp.date() >= thirty_days_ago:
            day = log.timestamp.strftime("%m/%d")
            day_counts[day]["alerts"] += 1
            day_counts[day]["sms"] += log.recipient_count or 0

    # Fill in missing days
    alerts_by_day = []
    for i in range(30):
        day = (thirty_days_ago + timedelta(days=i)).strftime("%m/%d")
        alerts_by_day.append({
            "date": day,
            "alerts": day_counts[day]["alerts"],
            "sms": day_counts[day]["sms"]
        })

    # ── Alerts by section (top 8) ──────────────────────────────────────────
    section_counts = defaultdict(int)
    for log in logs:
        section_counts[log.section_code or "Unknown"] += 1

    alerts_by_section = sorted(
        [{"section": k, "alerts": v} for k, v in section_counts.items()],
        key=lambda x: x["alerts"], reverse=True
    )[:8]

    # ── Alerts by hour of day ──────────────────────────────────────────────
    hour_counts = defaultdict(int)
    for log in logs:
        if log.timestamp:
            hour_counts[log.timestamp.hour] += 1

    alerts_by_hour = [
        {"hour": f"{h:02d}:00", "alerts": hour_counts[h]}
        for h in range(24)
    ]

    # ── Alerts by priority ─────────────────────────────────────────────────
    priority_counts = defaultdict(int)
    for log in logs:
        priority_counts[log.priority_level or "NORMAL"] += 1

    alerts_by_priority = [
        {"priority": k, "count": v}
        for k, v in priority_counts.items()
    ]

    # ── Delivery success rate by day (last 30 days) ────────────────────────
    delivery_by_day = defaultdict(lambda: {"sent": 0, "failed": 0})
    receipts = db.query(DeliveryReceipt).all()
    for r in receipts:
        if r.timestamp and r.timestamp.date() >= thirty_days_ago:
            day = r.timestamp.strftime("%m/%d")
            if r.status == "sent":
                delivery_by_day[day]["sent"] += 1
            else:
                delivery_by_day[day]["failed"] += 1

    delivery_rate = []
    for i in range(30):
        day = (thirty_days_ago + timedelta(days=i)).strftime("%m/%d")
        sent = delivery_by_day[day]["sent"]
        failed = delivery_by_day[day]["failed"]
        total = sent + failed
        delivery_rate.append({
            "date": day,
            "sent": sent,
            "failed": failed,
            "rate": round((sent / total * 100), 1) if total > 0 else None
        })

    # ── Student enrollment summary ─────────────────────────────────────────
    total_students = db.query(Subscription).count()
    active_students = db.query(Subscription).filter(Subscription.is_active == True).count()
    total_sections = db.query(Section).count()

    # Students per section
    section_enrollment = []
    sections = db.query(Section).all()
    for s in sections:
        count = db.query(Subscription).filter(
            Subscription.section_id == s.id,
            Subscription.is_active == True
        ).count()
        if count > 0:
            section_enrollment.append({"section": s.section_code, "students": count})
    section_enrollment.sort(key=lambda x: x["students"], reverse=True)

    return {
        "summary": {
            "total_alerts": len(logs),
            "total_sms": sum(l.recipient_count or 0 for l in logs),
            "total_students": total_students,
            "active_students": active_students,
            "total_sections": total_sections,
            "success_rate": round(
                sum(1 for l in logs if l.status == "SENT") / len(logs) * 100, 1
            ) if logs else 0
        },
        "alerts_by_day": alerts_by_day,
        "alerts_by_section": alerts_by_section,
        "alerts_by_hour": alerts_by_hour,
        "alerts_by_priority": alerts_by_priority,
        "delivery_rate": delivery_rate,
        "section_enrollment": section_enrollment
    }
