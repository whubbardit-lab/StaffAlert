from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Staff
from schemas import StaffCreate, StaffUpdate, StaffOut
from typing import List

router = APIRouter(prefix="/staff", tags=["Staff"])


@router.get("/", response_model=List[StaffOut])
def get_all_staff(db: Session = Depends(get_db)):
    return db.query(Staff).all()


@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff


@router.post("/", response_model=StaffOut, status_code=201)
def create_staff(staff: StaffCreate, db: Session = Depends(get_db)):
    # Check for duplicate system_id or phone
    existing = db.query(Staff).filter(
        (Staff.system_id == staff.system_id) | (Staff.phone_number == staff.phone_number)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="SystemID or phone number already exists")

    db_staff = Staff(**staff.model_dump())
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return db_staff


@router.patch("/{staff_id}", response_model=StaffOut)
def update_staff(staff_id: int, update: StaffUpdate, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    for field, value in update.model_dump(exclude_none=True).items():
        setattr(staff, field, value)

    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/{staff_id}", status_code=204)
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    db.delete(staff)
    db.commit()


@router.patch("/{staff_id}/toggle", response_model=StaffOut)
def toggle_staff_active(staff_id: int, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff.is_active = not staff.is_active
    db.commit()
    db.refresh(staff)
    return staff
