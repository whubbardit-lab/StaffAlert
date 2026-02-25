from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Section, Subscription
from schemas import SectionCreate, SectionOut, SubscriptionCreate, SubscriptionOut
from typing import List, Optional
from datetime import datetime
import csv
import io

router = APIRouter(tags=["Sections"])


# ── Sections ───────────────────────────────────────────────────────────────
@router.get("/sections", response_model=List[SectionOut])
def get_sections(db: Session = Depends(get_db)):
    return db.query(Section).all()


@router.post("/sections", response_model=SectionOut, status_code=201)
def create_section(section: SectionCreate, db: Session = Depends(get_db)):
    existing = db.query(Section).filter(Section.section_code == section.section_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Section code already exists")
    db_section = Section(**section.model_dump())
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    return db_section


@router.delete("/sections/{section_id}", status_code=204)
def delete_section(section_id: int, db: Session = Depends(get_db)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()


# ── Students List ──────────────────────────────────────────────────────────
@router.get("/students")
def get_all_students(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    expired = db.query(Subscription).filter(
        Subscription.graduation_date != None,
        Subscription.graduation_date <= now,
        Subscription.is_active == True
    ).all()
    for s in expired:
        s.is_active = False
    if expired:
        db.commit()

    query = db.query(Subscription)
    if active_only:
        query = query.filter(Subscription.is_active == True)

    subs = query.all()

    return [
        {
            "id": s.id,
            "student_name": s.student_name or "Unknown",
            "student_phone": s.student_phone,
            "section_code": s.section.section_code if s.section else "N/A",
            "section_name": s.section.section_name if s.section else "N/A",
            "graduation_date": s.graduation_date.strftime("%Y-%m-%d") if s.graduation_date else None,
            "is_active": s.is_active,
            "status": "Graduated" if (s.graduation_date and s.graduation_date <= now) else "Active"
        }
        for s in subs
    ]


@router.delete("/students/{student_id}", status_code=204)
def remove_student(student_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == student_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(sub)
    db.commit()


@router.patch("/students/{student_id}/deactivate", status_code=200)
def deactivate_student(student_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == student_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Student not found")
    sub.is_active = False
    db.commit()
    return {"message": "Student deactivated"}


# ── Subscriptions ──────────────────────────────────────────────────────────
@router.get("/subscriptions", response_model=List[SubscriptionOut])
def get_subscriptions(db: Session = Depends(get_db)):
    return db.query(Subscription).all()


@router.post("/subscriptions", response_model=SubscriptionOut, status_code=201)
def add_subscription(sub: SubscriptionCreate, db: Session = Depends(get_db)):
    db_sub = Subscription(**sub.model_dump())
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub


# ── CSV Import ─────────────────────────────────────────────────────────────
@router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            phone = row.get("Phone", "").strip()
            section_code = row.get("SectionCode", "").strip()
            name = row.get("Name", "").strip() or None
            grad_date_str = row.get("GraduationDate", "").strip() or None

            if not phone or not section_code:
                errors.append(f"Row {i}: Missing Phone or SectionCode")
                skipped += 1
                continue

            cleaned = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
            if not cleaned.startswith("+"):
                cleaned = "+1" + cleaned

            grad_date = None
            if grad_date_str:
                try:
                    grad_date = datetime.strptime(grad_date_str, "%Y-%m-%d")
                except ValueError:
                    errors.append(f"Row {i}: Invalid date '{grad_date_str}' — use YYYY-MM-DD")
                    skipped += 1
                    continue

            section = db.query(Section).filter(Section.section_code == section_code).first()
            if not section:
                section = Section(section_code=section_code, section_name=section_code)
                db.add(section)
                db.flush()

            existing_sub = db.query(Subscription).filter(
                Subscription.student_phone == cleaned,
                Subscription.section_id == section.id
            ).first()
            if existing_sub:
                skipped += 1
                continue

            db_sub = Subscription(
                student_phone=cleaned,
                student_name=name,
                graduation_date=grad_date,
                section_id=section.id
            )
            db.add(db_sub)
            imported += 1

        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
            skipped += 1

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "message": f"Import complete. {imported} subscriptions added, {skipped} skipped."
    }
