from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import AlertLog, Staff
from schemas import AlertLogOut
from typing import List, Optional

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
    total_recipients = db.query(AlertLog).with_entities(
        AlertLog.recipient_count
    ).all()
    total_sms = sum(r[0] for r in total_recipients)

    return {
        "total_alerts": total_alerts,
        "successful_alerts": total_sent,
        "partial_alerts": total_partial,
        "total_sms_sent": total_sms
    }
