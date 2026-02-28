from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Section, Subscription, Staff
from schemas import SectionCreate, SectionOut, SubscriptionCreate, SubscriptionOut
from sms import send_single_sms
from typing import List
from datetime import datetime, timedelta
import csv, io, random, string, json

router = APIRouter(tags=["Sections"])


def generate_join_code(length=6) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def sms_join_code_to_staff(section: Section, db: Session):
    """SMS the new join code to all active staff."""
    staff_list = db.query(Staff).filter(Staff.is_active == True, Staff.phone_number != None).all()
    msg = (
        f"PAWS Alert: New join code for {section.section_code} — {section.section_name}\n"
        f"Code: {section.join_code}\n"
        f"Valid 7 days. Students text: JOIN {section.section_code} {section.join_code}"
    )
    for s in staff_list:
        try:
            send_single_sms(s.phone_number, msg)
        except Exception:
            pass


# ── Sections CRUD ──────────────────────────────────────────────────────────
@router.get("/sections")
def get_sections(db: Session = Depends(get_db)):
    sections = db.query(Section).all()
    result = []
    for s in sections:
        count = db.query(Subscription).filter(
            Subscription.section_id == s.id,
            Subscription.is_active == True
        ).count()
        result.append({
            "id": s.id,
            "section_code": s.section_code,
            "section_name": s.section_name,
            "join_code": s.join_code,
            "join_code_expires": s.join_code_expires.isoformat() if s.join_code_expires else None,
            "student_count": count,
        })
    return result


@router.post("/sections", status_code=201)
def create_section(section: SectionCreate, db: Session = Depends(get_db)):
    existing = db.query(Section).filter(Section.section_code == section.section_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Section code already exists")
    code = generate_join_code()
    expires = datetime.utcnow() + timedelta(days=7)
    db_section = Section(
        section_code=section.section_code,
        section_name=section.section_name,
        join_code=code,
        join_code_expires=expires,
    )
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    # SMS all staff with the new join code
    sms_join_code_to_staff(db_section, db)
    return {
        "id": db_section.id,
        "section_code": db_section.section_code,
        "section_name": db_section.section_name,
        "join_code": db_section.join_code,
        "join_code_expires": db_section.join_code_expires.isoformat(),
        "student_count": 0,
    }


@router.post("/sections/{section_id}/regenerate-code", status_code=200)
def regenerate_join_code(section_id: int, db: Session = Depends(get_db)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    section.join_code = generate_join_code()
    section.join_code_expires = datetime.utcnow() + timedelta(days=7)
    db.commit()
    db.refresh(section)
    sms_join_code_to_staff(section, db)
    return {"join_code": section.join_code, "expires": section.join_code_expires.isoformat()}


@router.delete("/sections/{section_id}", status_code=204)
def delete_section(section_id: int, db: Session = Depends(get_db)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()


# ── Students List ──────────────────────────────────────────────────────────
@router.get("/students")
def get_all_students(active_only: bool = True, db: Session = Depends(get_db)):
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


@router.post("/students/manual", status_code=201)
def add_student_manually(data: dict, db: Session = Depends(get_db)):
    phone = data.get("phone", "").strip()
    section_code = data.get("section_code", "").strip().upper()
    name = data.get("name", "").strip() or None
    if not phone or not section_code:
        raise HTTPException(status_code=400, detail="Phone and section_code are required")
    cleaned = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
    if not cleaned.startswith("+"):
        cleaned = "+1" + cleaned
    section = db.query(Section).filter(Section.section_code == section_code).first()
    if not section:
        raise HTTPException(status_code=404, detail=f"Section '{section_code}' not found")
    existing = db.query(Subscription).filter(
        Subscription.student_phone == cleaned,
        Subscription.section_id == section.id,
        Subscription.is_active == True
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already enrolled in this section")
    sub = Subscription(student_phone=cleaned, student_name=name, section_id=section.id, is_active=True)
    db.add(sub)
    db.commit()
    return {"message": f"Added {cleaned} to {section_code}"}


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


# ── CSV Import — Students ──────────────────────────────────────────────────
@router.post("/import/csv")
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")
    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))
    imported = 0; skipped = 0; errors = []
    for i, row in enumerate(reader, start=2):
        try:
            phone = row.get("Phone", "").strip()
            section_code = row.get("SectionCode", "").strip()
            name = row.get("Name", "").strip() or None
            grad_date_str = row.get("GraduationDate", "").strip() or None
            if not phone or not section_code:
                errors.append(f"Row {i}: Missing Phone or SectionCode"); skipped += 1; continue
            cleaned = phone.replace("-","").replace(" ","").replace("(","").replace(")","")
            if not cleaned.startswith("+"): cleaned = "+1" + cleaned
            grad_date = None
            if grad_date_str:
                try: grad_date = datetime.strptime(grad_date_str, "%Y-%m-%d")
                except ValueError: errors.append(f"Row {i}: Invalid date '{grad_date_str}'"); skipped += 1; continue
            section = db.query(Section).filter(Section.section_code == section_code).first()
            if not section:
                section = Section(section_code=section_code, section_name=section_code,
                                  join_code=generate_join_code(),
                                  join_code_expires=datetime.utcnow() + timedelta(days=7))
                db.add(section); db.flush()
            existing = db.query(Subscription).filter(
                Subscription.student_phone == cleaned, Subscription.section_id == section.id).first()
            if existing: skipped += 1; continue
            db.add(Subscription(student_phone=cleaned, student_name=name, graduation_date=grad_date, section_id=section.id))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}"); skipped += 1
    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors,
            "message": f"Import complete. {imported} added, {skipped} skipped."}


# ── CSV Import — Staff ─────────────────────────────────────────────────────
@router.post("/import/staff-csv")
async def import_staff_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    from security import hash_pin
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")
    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))
    imported = 0; skipped = 0; errors = []
    for i, row in enumerate(reader, start=2):
        try:
            name = row.get("Name", "").strip()
            phone = row.get("Phone", "").strip()
            system_id = row.get("SystemID", "").strip()
            pin = row.get("PIN", "").strip()
            if not all([name, phone, system_id, pin]):
                errors.append(f"Row {i}: Missing required field"); skipped += 1; continue
            cleaned = phone.replace("-","").replace(" ","").replace("(","").replace(")","")
            if not cleaned.startswith("+"): cleaned = "+1" + cleaned
            existing = db.query(Staff).filter(
                (Staff.system_id == system_id) | (Staff.phone_number == cleaned)).first()
            if existing: skipped += 1; continue
            db.add(Staff(name=name, phone_number=cleaned, system_id=system_id,
                         pin=hash_pin(pin), is_active=True))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}"); skipped += 1
    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors,
            "message": f"Staff import complete. {imported} added, {skipped} skipped."}


# ── Subscriptions ──────────────────────────────────────────────────────────
@router.get("/subscriptions", response_model=List[SubscriptionOut])
def get_subscriptions(db: Session = Depends(get_db)):
    return db.query(Subscription).all()
