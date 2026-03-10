from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from security import require_auth
from models import DeliveryReceipt, AlertLog

router = APIRouter(prefix="/receipts", tags=["Receipts"])


@router.get("/")
def get_all_receipts(db: Session = Depends(get_db), auth=Depends(require_auth)):
    receipts = db.query(DeliveryReceipt).order_by(DeliveryReceipt.id.desc()).limit(500).all()
    return [
        {
            "id": r.id,
            "alert_log_id": r.alert_log_id,
            "phone_number": r.phone_number,
            "status": r.status,
            "error_message": r.error_message,
        }
        for r in receipts
    ]


@router.get("/by-alert/{alert_log_id}")
def get_receipts_by_alert(alert_log_id: int, db: Session = Depends(get_db), auth=Depends(require_auth)):
    receipts = db.query(DeliveryReceipt).filter(
        DeliveryReceipt.alert_log_id == alert_log_id
    ).all()
    return [
        {
            "id": r.id,
            "alert_log_id": r.alert_log_id,
            "phone_number": r.phone_number,
            "status": r.status,
            "error_message": r.error_message,
        }
        for r in receipts
    ]


@router.get("/stats")
def get_receipt_stats(db: Session = Depends(get_db), auth=Depends(require_auth)):
    total = db.query(DeliveryReceipt).count()
    delivered = db.query(DeliveryReceipt).filter(DeliveryReceipt.status == "sent").count()
    failed = db.query(DeliveryReceipt).filter(DeliveryReceipt.status == "failed").count()
    delivery_rate = round((delivered / total * 100), 1) if total > 0 else 0

    return {
        "total": total,
        "delivered": delivered,
        "failed": failed,
        "delivery_rate": f"{delivery_rate}%"
    }
