from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Staff, Section, Subscription, AlertLog
from sms import broadcast_sms, handle_opt_out
import asyncio

router = APIRouter()


@router.post("/sms/webhook", response_class=PlainTextResponse)
async def sms_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Twilio webhook endpoint for inbound SMS.
    
    Expected format: [SystemID] [PIN] [SectionCode] [Message...]
    Example:         STAFF001 12345 CS101 Exam postponed to Thursday
    Special:         STAFF001 12345 00000 School closed due to weather
    """
    from_number = From.strip()
    body = Body.strip()

    # ── Handle opt-out keywords first ─────────────────────────────────────
    if handle_opt_out(from_number, body):
        # Twilio handles STOP/HELP automatically. Just acknowledge.
        return ""

    # ── Parse the command format ───────────────────────────────────────────
    parts = body.split(" ", 3)  # Split into max 4 parts
    if len(parts) < 4:
        return "StaffAlert: Invalid format. Use: [SystemID] [PIN] [SectionCode] [Message]"

    system_id, pin, section_code, message = parts

    # ── Validate message length ────────────────────────────────────────────
    if len(message) > 160:
        return f"StaffAlert: Message too long ({len(message)}/160 chars). Please shorten it."

    # ── Authenticate against Staff table ──────────────────────────────────
    staff = db.query(Staff).filter(
        Staff.system_id == system_id,
        Staff.phone_number == from_number,
        Staff.is_active == True
    ).first()

    if not staff:
        return "StaffAlert: Authentication failed. Your number is not registered."

    if staff.pin != pin:
        return "StaffAlert: Incorrect PIN. Alert not sent."

    # ── Resolve recipients ────────────────────────────────────────────────
    if section_code == "00000":
        # EMERGENCY BROADCAST — all registered phones
        subscriptions = db.query(Subscription).all()
        recipients = list({s.student_phone for s in subscriptions})
        log_section = "ALL"
        priority = "EMERGENCY"
    else:
        # Section-specific broadcast
        section = db.query(Section).filter(
            Section.section_code == section_code
        ).first()

        if not section:
            return f"StaffAlert: Section '{section_code}' not found. Check the code and try again."

        subscriptions = db.query(Subscription).filter(
            Subscription.section_id == section.id
        ).all()
        recipients = [s.student_phone for s in subscriptions]
        log_section = section_code
        priority = "NORMAL"

    if not recipients:
        return f"StaffAlert: No subscribers found for section '{section_code}'."

    # ── Fire the broadcast asynchronously ────────────────────────────────
    outbound_message = f"[{section_code}] {message}"
    if len(outbound_message) > 160:
        outbound_message = message  # Drop prefix if it pushes over 160

    result = await broadcast_sms(recipients, outbound_message)

    # ── Log the alert ─────────────────────────────────────────────────────
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
        f"StaffAlert: Sent to {result['sent']}/{result['total']} recipients. "
        f"Section: {log_section}."
    )
