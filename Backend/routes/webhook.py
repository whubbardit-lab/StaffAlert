from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Staff, Section, Subscription, AlertLog
from sms import broadcast_sms, handle_opt_out
import asyncio

router = APIRouter()


def normalize_phone(phone: str) -> str:
    cleaned = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
    if not cleaned.startswith("+"):
        cleaned = "+1" + cleaned
    return cleaned


@router.post("/sms/webhook", response_class=PlainTextResponse)
async def sms_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    db: Session = Depends(get_db)
):
    from_number = From.strip()
    body = Body.strip()

    # ── Handle opt-out keywords first ─────────────────────────────────────
    if handle_opt_out(from_number, body):
        return ""

    upper = body.upper().strip()

    # ── Student self-enrollment: JOIN <SECTIONCODE> ────────────────────────
    if upper.startswith("JOIN"):
        parts = body.split()
        if len(parts) < 2:
            return (
                "PAWS Alert: To subscribe to a section text:\n"
                "JOIN <SECTIONCODE>\n"
                "Example: JOIN CS101"
            )

        section_code = parts[1].upper().strip()

        # Find section
        section = db.query(Section).filter(
            Section.section_code == section_code
        ).first()

        if not section:
            return (
                f"PAWS Alert: Section '{section_code}' not found. "
                f"Check the code with your instructor and try again."
            )

        # Check if already subscribed
        existing = db.query(Subscription).filter(
            Subscription.student_phone == from_number,
            Subscription.section_id == section.id,
            Subscription.is_active == True
        ).first()

        if existing:
            return (
                f"PAWS Alert: You are already subscribed to {section_code}. "
                f"You will receive all alerts for this section."
            )

        # Check if previously deactivated — reactivate instead of duplicate
        inactive = db.query(Subscription).filter(
            Subscription.student_phone == from_number,
            Subscription.section_id == section.id,
            Subscription.is_active == False
        ).first()

        if inactive:
            inactive.is_active = True
            db.commit()
        else:
            new_sub = Subscription(
                student_phone=from_number,
                section_id=section.id,
                is_active=True
            )
            db.add(new_sub)
            db.commit()

        return (
            f"PAWS Alert: You are now subscribed to {section_code} — "
            f"{section.section_name}. You will receive all alerts for this section. "
            f"Reply LEAVE {section_code} to unsubscribe."
        )

    # ── Student self-removal: LEAVE <SECTIONCODE> ──────────────────────────
    if upper.startswith("LEAVE"):
        parts = body.split()
        if len(parts) < 2:
            return (
                "PAWS Alert: To unsubscribe from a section text:\n"
                "LEAVE <SECTIONCODE>\n"
                "Example: LEAVE CS101"
            )

        section_code = parts[1].upper().strip()

        section = db.query(Section).filter(
            Section.section_code == section_code
        ).first()

        if not section:
            return f"PAWS Alert: Section '{section_code}' not found."

        sub = db.query(Subscription).filter(
            Subscription.student_phone == from_number,
            Subscription.section_id == section.id,
            Subscription.is_active == True
        ).first()

        if not sub:
            return (
                f"PAWS Alert: You are not currently subscribed to {section_code}."
            )

        sub.is_active = False
        db.commit()

        return (
            f"PAWS Alert: You have been unsubscribed from {section_code}. "
            f"You will no longer receive alerts for this section. "
            f"Reply JOIN {section_code} to resubscribe."
        )

    # ── Student status check: MYSECTIONS ──────────────────────────────────
    if upper.startswith("MYSECTIONS") or upper.startswith("MY SECTIONS"):
        subs = db.query(Subscription).filter(
            Subscription.student_phone == from_number,
            Subscription.is_active == True
        ).all()

        if not subs:
            return (
                "PAWS Alert: You are not subscribed to any sections. "
                "Text JOIN <SECTIONCODE> to subscribe."
            )

        codes = ", ".join([s.section.section_code for s in subs if s.section])
        return f"PAWS Alert: You are subscribed to: {codes}"

    # ── Help command ───────────────────────────────────────────────────────
    if upper.startswith("HELP") or upper == "?":
        return (
            "PAWS Alert Commands:\n"
            "JOIN <CODE> — subscribe to a section\n"
            "LEAVE <CODE> — unsubscribe from a section\n"
            "MYSECTIONS — see your subscriptions\n"
            "STOP — opt out of all messages"
        )

    # ── Parse staff alert format: SYSTEMID PIN SECTIONCODE MESSAGE ─────────
    parts = body.split(" ", 3)
    if len(parts) < 4:
        return (
            "PAWS Alert: Unknown command.\n"
            "Students: text JOIN <SECTIONCODE> to subscribe.\n"
            "Faculty: text SYSTEMID PIN SECTIONCODE Message."
        )

    system_id, pin, section_code, message = parts

    # Validate message length
    if len(message) > 160:
        return f"PAWS Alert: Message too long ({len(message)}/160 chars). Please shorten it."

    # Authenticate against Staff table
    staff = db.query(Staff).filter(
        Staff.system_id == system_id,
        Staff.phone_number == from_number,
        Staff.is_active == True
    ).first()

    if not staff:
        return (
            "PAWS Alert: Authentication failed. Your number is not registered as staff. "
            "Students: text JOIN <SECTIONCODE> to subscribe."
        )

    if staff.pin != pin:
        return "PAWS Alert: Incorrect PIN. Alert not sent."

    # Resolve recipients
    if section_code == "00000":
        subscriptions = db.query(Subscription).filter(
            Subscription.is_active == True
        ).all()
        recipients = list({s.student_phone for s in subscriptions})
        log_section = "ALL"
        priority = "EMERGENCY"
    else:
        section = db.query(Section).filter(
            Section.section_code == section_code
        ).first()

        if not section:
            return f"PAWS Alert: Section '{section_code}' not found. Check the code and try again."

        subscriptions = db.query(Subscription).filter(
            Subscription.section_id == section.id,
            Subscription.is_active == True
        ).all()
        recipients = [s.student_phone for s in subscriptions]
        log_section = section_code
        priority = "NORMAL"

    if not recipients:
        return f"PAWS Alert: No active subscribers found for section '{section_code}'."

    # Fire the broadcast
    outbound_message = f"[{section_code}] {message}"
    if len(outbound_message) > 160:
        outbound_message = message

    result = await broadcast_sms(recipients, outbound_message)

    # Log the alert
    log = AlertLog(
        sender_id=staff.id,
        message_content=message,
        recipient_count=result["sent"],
        priority_level=priority,
        section_code=log_section,
        status="SENT" if result["failed"] == 0 else "PARTIAL"
    )
    db.add(log)
    db.commit()

    return (
        f"PAWS Alert: Sent to {result['sent']}/{result['total']} recipients. "
        f"Section: {log_section}."
    )
