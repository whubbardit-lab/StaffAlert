from fastapi import APIRouter, Request, Depends, Form, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Staff, Section, Subscription, AlertLog, DeliveryReceipt, SmsSession, UnknownNumberLog
from sms import broadcast_sms, send_single_sms, handle_opt_out
from security import validate_twilio_signature
from datetime import datetime, timedelta
import os, json

router = APIRouter()

# ── Conversation states ────────────────────────────────────────────────────
# idle → menu shown
# send_section → waiting for section code
# send_priority → waiting for priority
# send_message → waiting for message text
# stats → (one-shot, no state needed)
# code_section → waiting for section to get join code


def normalize_phone(phone: str) -> str:
    cleaned = phone.replace("-","").replace(" ","").replace("(","").replace(")","")
    if not cleaned.startswith("+"): cleaned = "+1" + cleaned
    return cleaned


def get_or_create_session(db: Session, phone: str) -> SmsSession:
    session = db.query(SmsSession).filter(SmsSession.phone_number == phone).first()
    if not session:
        session = SmsSession(phone_number=phone, state="idle", context="{}")
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def save_session(db: Session, session: SmsSession, state: str, context: dict):
    session.state = state
    session.context = json.dumps(context)
    session.updated_at = datetime.utcnow()
    db.commit()


def reset_session(db: Session, session: SmsSession):
    save_session(db, session, "idle", {})


def get_stats_message(db: Session) -> str:
    from models import AlertLog, Subscription, Section
    total_alerts = db.query(AlertLog).count()
    active_students = db.query(Subscription).filter(Subscription.is_active == True).count()
    total_sections = db.query(Section).count()
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_alerts = db.query(AlertLog).filter(AlertLog.timestamp >= week_ago).count()
    total_sms = db.query(AlertLog).with_entities(AlertLog.recipient_count).all()
    sms_count = sum(r[0] for r in total_sms if r[0])
    return (
        f"PAWS Alert Stats:\n"
        f"📡 {total_alerts} total alerts\n"
        f"📱 {sms_count} SMS sent\n"
        f"🔔 {week_alerts} alerts this week\n"
        f"🎓 {active_students} active students\n"
        f"📚 {total_sections} sections"
    )


MENU = (
    "PAWS Alert — Staff Menu:\n"
    "1. Send an alert\n"
    "2. Get section join code\n"
    "3. Check stats\n"
    "Reply with a number or just tell me what you need."
)


@router.post("/sms/webhook", response_class=PlainTextResponse)
async def sms_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    db: Session = Depends(get_db)
):
    # Twilio signature validation
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    form_data = await request.form()
    params = dict(form_data)
    if auth_token and not validate_twilio_signature(auth_token, signature, url, params):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    from_number = normalize_phone(From.strip())
    body = Body.strip()
    upper = body.upper().strip()

    # Handle global opt-out keywords first (Twilio handles these but we pass through)
    if handle_opt_out(from_number, body):
        return ""

    # ── Step 1: Is this a registered staff member? ─────────────────────────
    staff = db.query(Staff).filter(
        Staff.phone_number == from_number,
        Staff.is_active == True
    ).first()

    if staff:
        return await handle_staff_sms(from_number, body, upper, staff, db)

    # ── Step 2: Not staff — handle student keywords ────────────────────────
    if upper.startswith("JOIN"):
        return await handle_join(from_number, body, upper, db)

    if upper.startswith("LEAVE") or upper.startswith("STOP"):
        return handle_leave(from_number, body, upper, db)

    if upper.startswith("MYSECTIONS") or upper.startswith("MY SECTIONS"):
        return handle_mysections(from_number, db)

    if upper.startswith("HELP") or upper == "?":
        return (
            "PAWS Alert Commands:\n"
            "JOIN [CODE] [JOINCODE] — subscribe to a section\n"
            "LEAVE [CODE] — unsubscribe\n"
            "MYSECTIONS — see your sections\n"
            "STOP — opt out of all messages"
        )

    # ── Step 3: Unknown number, not a recognized command ──────────────────
    log = UnknownNumberLog(phone_number=from_number, message=body)
    db.add(log)
    db.commit()
    return (
        "PAWS Alert: Number not detected. This line is reserved for "
        "enrolled students and registered staff. "
        "To enroll, text JOIN [SECTIONCODE] [JOINCODE] to this number."
    )


# ── STAFF CONVERSATION ENGINE ──────────────────────────────────────────────
async def handle_staff_sms(phone: str, body: str, upper: str, staff, db: Session) -> str:
    session = get_or_create_session(db, phone)
    state = session.state
    ctx = json.loads(session.context or "{}")

    # Reset/cancel at any time
    if upper in ("CANCEL", "RESET", "MENU", "START", "HI", "HELLO", "HEY"):
        reset_session(db, session)
        return f"Hi {staff.name}! 👋\n{MENU}"

    # ── IDLE — show menu or parse intent ─────────────────────────────────
    if state == "idle":
        if upper in ("1", "SEND", "SEND ALERT", "ALERT"):
            save_session(db, session, "send_section", {})
            sections = db.query(Section).all()
            codes = ", ".join([s.section_code for s in sections]) or "none"
            return f"Which section? Reply with code or ALL.\nAvailable: {codes}"

        if upper in ("2", "CODE", "JOIN CODE", "GET CODE", "JOINCODE"):
            save_session(db, session, "code_section", {})
            sections = db.query(Section).all()
            codes = ", ".join([s.section_code for s in sections]) or "none"
            return f"Which section do you need a join code for?\nAvailable: {codes}"

        if upper in ("3", "STATS", "STATISTICS", "STATUS"):
            reset_session(db, session)
            return get_stats_message(db)

        # Natural language fallback — just show menu
        reset_session(db, session)
        return f"Hi {staff.name}! 👋\n{MENU}"

    # ── SEND FLOW ─────────────────────────────────────────────────────────
    if state == "send_section":
        section_code = upper.strip()
        if section_code == "ALL":
            ctx["section_code"] = "00000"
            ctx["section_label"] = "ALL STUDENTS"
        else:
            section = db.query(Section).filter(Section.section_code == section_code).first()
            if not section:
                return f"Section '{section_code}' not found. Try again or reply CANCEL."
            ctx["section_code"] = section.section_code
            ctx["section_label"] = f"{section.section_code} ({section.section_name})"
        save_session(db, session, "send_priority", ctx)
        return f"Priority for {ctx['section_label']}?\nReply NORMAL, URGENT, or EMERGENCY"

    if state == "send_priority":
        if upper not in ("NORMAL", "URGENT", "EMERGENCY"):
            return "Reply NORMAL, URGENT, or EMERGENCY"
        ctx["priority"] = upper
        save_session(db, session, "send_message", ctx)
        return f"Type your message (max 160 chars):"

    if state == "send_message":
        if len(body) > 160:
            return f"Too long ({len(body)}/160 chars). Please shorten it."
        section_code = ctx.get("section_code", "00000")
        priority = ctx.get("priority", "NORMAL")
        section_label = ctx.get("section_label", "ALL")

        # Resolve recipients
        if section_code == "00000":
            subs = db.query(Subscription).filter(Subscription.is_active == True).all()
            recipients = list({s.student_phone for s in subs})
            log_section = "ALL"
        else:
            section = db.query(Section).filter(Section.section_code == section_code).first()
            if not section:
                reset_session(db, session)
                return "Section not found. Please start over."
            subs = db.query(Subscription).filter(
                Subscription.section_id == section.id, Subscription.is_active == True).all()
            recipients = [s.student_phone for s in subs]
            log_section = section_code

        reset_session(db, session)

        if not recipients:
            return f"No active students in {section_label}. Alert not sent."

        prefix = f"[{priority}] " if priority != "NORMAL" else "[CAMPUS] "
        outbound = prefix + body
        if len(outbound) > 160: outbound = body

        result = await broadcast_sms(recipients, outbound)

        # Log it
        log = AlertLog(
            sender_id=staff.id,
            message_content=body,
            recipient_count=result["sent"],
            priority_level=priority,
            section_code=log_section,
            status="SENT" if result["failed"] == 0 else "PARTIAL"
        )
        db.add(log)
        db.flush()
        for detail in result.get("details", []):
            db.add(DeliveryReceipt(
                alert_log_id=log.id,
                phone_number=detail["to"],
                status=detail["status"],
                error_message=detail.get("error")
            ))
        db.commit()

        return (
            f"✓ Sent to {result['sent']}/{result['total']} students in {section_label}.\n"
            f"Failed: {result['failed']}. Reply MENU for options."
        )

    # ── JOIN CODE FLOW ────────────────────────────────────────────────────
    if state == "code_section":
        section = db.query(Section).filter(Section.section_code == upper).first()
        if not section:
            return f"Section '{upper}' not found. Try again or reply CANCEL."
        reset_session(db, session)
        # Check if code is expired
        if not section.join_code or (section.join_code_expires and section.join_code_expires < datetime.utcnow()):
            # Regenerate
            from routes.sections import generate_join_code
            section.join_code = generate_join_code()
            section.join_code_expires = datetime.utcnow() + timedelta(days=7)
            db.commit()
        expires_str = section.join_code_expires.strftime("%b %d") if section.join_code_expires else "7 days"
        return (
            f"Join code for {section.section_code}:\n"
            f"Code: {section.join_code}\n"
            f"Valid until: {expires_str}\n"
            f"Students text: JOIN {section.section_code} {section.join_code}"
        )

    # Fallback
    reset_session(db, session)
    return f"Hi {staff.name}! 👋\n{MENU}"


# ── STUDENT HANDLERS ───────────────────────────────────────────────────────
async def handle_join(phone: str, body: str, upper: str, db: Session) -> str:
    parts = upper.split()
    # Expected: JOIN SECTIONCODE [JOINCODE]
    if len(parts) < 2:
        return "PAWS Alert: Text JOIN [SECTIONCODE] [JOINCODE] to enroll.\nExample: JOIN CS101 XK9P2M"

    section_code = parts[1]
    provided_code = parts[2] if len(parts) >= 3 else None

    section = db.query(Section).filter(Section.section_code == section_code).first()
    if not section:
        return f"PAWS Alert: Section '{section_code}' not found. Check the code with your instructor."

    # Validate join code
    now = datetime.utcnow()
    code_valid = (
        section.join_code and
        provided_code and
        provided_code.upper() == section.join_code.upper() and
        (section.join_code_expires is None or section.join_code_expires > now)
    )
    if not code_valid:
        return (
            f"PAWS Alert: A valid join code is required for {section_code}.\n"
            f"Ask your instructor for the code and text:\n"
            f"JOIN {section_code} [JOINCODE]"
        )

    # Already subscribed?
    existing = db.query(Subscription).filter(
        Subscription.student_phone == phone,
        Subscription.section_id == section.id,
        Subscription.is_active == True
    ).first()
    if existing:
        return f"PAWS Alert: You're already enrolled in {section_code}."

    # Reactivate or create
    inactive = db.query(Subscription).filter(
        Subscription.student_phone == phone,
        Subscription.section_id == section.id,
        Subscription.is_active == False
    ).first()
    if inactive:
        inactive.is_active = True
        db.commit()
    else:
        db.add(Subscription(student_phone=phone, section_id=section.id, is_active=True))
        db.commit()

    return (
        f"Welcome to PAWS Alert for {section_code} — {section.section_name} "
        f"at Pellissippi State! You'll receive class updates and alerts. "
        f"Reply LEAVE {section_code} to unsubscribe. Msg & data rates may apply."
    )


def handle_leave(phone: str, body: str, upper: str, db: Session) -> str:
    parts = upper.split()
    if len(parts) < 2:
        return "PAWS Alert: Text LEAVE [SECTIONCODE] to unsubscribe.\nExample: LEAVE CS101"
    section_code = parts[1]
    section = db.query(Section).filter(Section.section_code == section_code).first()
    if not section:
        return f"PAWS Alert: Section '{section_code}' not found."
    sub = db.query(Subscription).filter(
        Subscription.student_phone == phone,
        Subscription.section_id == section.id,
        Subscription.is_active == True
    ).first()
    if not sub:
        return f"PAWS Alert: You are not enrolled in {section_code}."
    sub.is_active = False
    db.commit()
    return f"PAWS Alert: You have been unenrolled from {section_code}. Reply JOIN {section_code} [CODE] to re-enroll."


def handle_mysections(phone: str, db: Session) -> str:
    subs = db.query(Subscription).filter(
        Subscription.student_phone == phone, Subscription.is_active == True).all()
    if not subs:
        return "PAWS Alert: You are not enrolled in any sections. Text JOIN [SECTIONCODE] [JOINCODE] to enroll."
    codes = ", ".join([s.section.section_code for s in subs if s.section])
    return f"PAWS Alert: You are enrolled in: {codes}"
