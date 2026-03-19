from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from security import require_auth
from models import Subscription, Section

router = APIRouter(prefix="/students", tags=["Students"])


def normalize_phone(phone: str) -> str:
    cleaned = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
    if not cleaned.startswith("+"):
        cleaned = "+1" + cleaned
    return cleaned


class ManualStudentAdd(BaseModel):
    phone_number: str
    section_code: str
    student_name: Optional[str] = None


@router.post("/manual", status_code=201)
def add_student_manual(
    payload: ManualStudentAdd,
    db: Session = Depends(get_db),
    auth=Depends(require_auth),
):
    phone = normalize_phone(payload.phone_number)

    section = db.query(Section).filter(Section.section_code == payload.section_code).first()
    if not section:
        raise HTTPException(status_code=404, detail=f"Section '{payload.section_code}' not found")

    existing = db.query(Subscription).filter(
        Subscription.student_phone == phone,
        Subscription.section_id == section.id,
        Subscription.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Student is already enrolled in this section")

    inactive = db.query(Subscription).filter(
        Subscription.student_phone == phone,
        Subscription.section_id == section.id,
        Subscription.is_active == False,
    ).first()
    if inactive:
        inactive.is_active = True
        if payload.student_name:
            inactive.student_name = payload.student_name
        db.commit()
        db.refresh(inactive)
        return {
            "id": inactive.id,
            "student_phone": phone,
            "section_code": payload.section_code,
            "student_name": inactive.student_name,
        }

    sub = Subscription(
        student_phone=phone,
        section_id=section.id,
        student_name=payload.student_name,
        is_active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "student_phone": phone,
        "section_code": payload.section_code,
        "student_name": sub.student_name,
    }


@router.get("/")
def list_students(
    section_code: Optional[str] = None,
    db: Session = Depends(get_db),
    auth=Depends(require_auth),
):
    query = db.query(Subscription).filter(Subscription.is_active == True)
    if section_code:
        section = db.query(Section).filter(Section.section_code == section_code).first()
        if not section:
            raise HTTPException(status_code=404, detail=f"Section '{section_code}' not found")
        query = query.filter(Subscription.section_id == section.id)
    subs = query.all()
    return [
        {
            "id": s.id,
            "student_phone": s.student_phone,
            "student_name": s.student_name,
            "section_code": s.section.section_code if s.section else None,
        }
        for s in subs
    ]


@router.delete("/{subscription_id}", status_code=204)
def remove_student(
    subscription_id: int,
    db: Session = Depends(get_db),
    auth=Depends(require_auth),
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.is_active = False
    db.commit()
