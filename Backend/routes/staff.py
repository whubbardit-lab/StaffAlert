from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from security import require_auth
from models import Staff, AuditLog
from schemas import StaffCreate, StaffUpdate, StaffOut
from security import hash_pin
from typing import List

router = APIRouter(prefix="/staff", tags=["Staff"])


def log_action(db: Session, action: str, entity_type: str, entity_id: int, details: str, request: Request = None):
    ip = request.client.host if request else "unknown"
    audit = AuditLog(action=action, entity_type=entity_type, entity_id=entity_id, details=details, ip_address=ip)
    db.add(audit)


@router.get("/", response_model=List[StaffOut])
def get_all_staff(db: Session = Depends(get_db), auth=Depends(require_auth)):
    return db.query(Staff).all()


@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(staff_id: int, db: Session = Depends(get_db), auth=Depends(require_auth)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff


@router.post("/", response_model=StaffOut, status_code=201)
def create_staff(staff: StaffCreate, request: Request, db: Session = Depends(get_db), auth=Depends(require_auth)):
    existing = db.query(Staff).filter(
        (Staff.system_id == staff.system_id) | (Staff.phone_number == staff.phone_number)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="SystemID or phone number already exists")

    staff_data = staff.model_dump()
    staff_data["pin"] = hash_pin(staff_data["pin"])

    db_staff = Staff(**staff_data)
    db.add(db_staff)
    db.flush()

    log_action(db, "CREATE_STAFF", "staff", db_staff.id, f"Created staff member: {db_staff.name} ({db_staff.system_id})", request)
    db.commit()
    db.refresh(db_staff)
    return db_staff


@router.patch("/{staff_id}", response_model=StaffOut)
def update_staff(staff_id: int, update: StaffUpdate, request: Request, db: Session = Depends(get_db), auth=Depends(require_auth)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    update_data = update.model_dump(exclude_none=True)

    # Hash PIN if it's being updated
    if "pin" in update_data:
        update_data["pin"] = hash_pin(update_data["pin"])

    for field, value in update_data.items():
        setattr(staff, field, value)

    log_action(db, "UPDATE_STAFF", "staff", staff.id, f"Updated staff member: {staff.name}", request)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/{staff_id}", status_code=204)
def delete_staff(staff_id: int, request: Request, db: Session = Depends(get_db), auth=Depends(require_auth)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    log_action(db, "DELETE_STAFF", "staff", staff.id, f"Deleted staff member: {staff.name} ({staff.system_id})", request)
    db.delete(staff)
    db.commit()


@router.patch("/{staff_id}/toggle", response_model=StaffOut)
def toggle_staff_active(staff_id: int, request: Request, db: Session = Depends(get_db), auth=Depends(require_auth)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    staff.is_active = not staff.is_active
    status = "activated" if staff.is_active else "deactivated"
    log_action(db, "TOGGLE_STAFF", "staff", staff.id, f"Staff member {staff.name} {status}", request)
    db.commit()
    db.refresh(staff)
    return staff
