from fastapi import APIRouter, Request, Depends, Form, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Staff, Section, Subscription, AlertLog, DeliveryReceipt, SmsSession, UnknownNumberLog
from sms import broadcast_sms, send_single_sms, handle_opt_out
from security import validate_twilio_signature, hash_pin
from datetime import datetime, timedelta
import os, json, httpx

router = APIRouter()

# ── Conversation states ────────────────────────────────────────────────────
# idle          → menu shown
# send_section  → waiting for section code
# send_priority → waiting for priority
# send_message  → waiting for raw message input from staff
# send_confirm  → Claude drafted a message, waiting for SEND / EDIT / CANCEL
# send_refine   → staff wants to edit, waiting for revised message
# stats         → (one-shot, no state needed)
# code_section  → waiting for section to get join code


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


async def get_claude_draft(raw_message: str, section_label: str, priority: str) -> str:
    """Call Claude API to draft a clean PAWS Alert message."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Fallback: just format the raw message if no API key
        prefix = f"[{priority}] " if priority != "NORMAL" else "[CAMPUS] "
        return prefix + raw_message

    prompt = (
        f"You are a message formatter for PAWS Alert, a college SMS notification system at Pellissippi State Community College.\n\n"
        f"A staff member wants to send this message to section {section_label}:\n"
        f"Priority: {priority}\n"
        f"Raw message: {raw_message}\n\n"
        f"Rewrite it as a clean, professional SMS alert. Rules:\n"
        f"- Start with 'PAWS Alert:' prefix\n"
        f"- For URGENT add '[URGENT]' after prefix\n"
        f"- For EMERGENCY add '[EMERGENCY]' after prefix\n"
        f"- Keep it under 155 characters total\n"
        f"- End with 'Reply STOP to opt out.' only for NORMAL priority\n"
        f"- Be clear and direct, no fluff\n"
        f"- Preserve all key details from the original\n\n"
        f"Reply with ONLY the final SMS text, nothing else."
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 200,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            data = response.json()
            draft = data["content"][0]["text"].strip()
            return draft
    except Exception:
        # Fallback on any error
        prefix = f"[{priority}] " if priority != "NORMAL" else "[CAMPUS] "
        return prefix + raw_message


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
    print(f"[SMS] Inbound: From={From!r} Body={Body[:80]!r}", flush=True)

    # Render terminates TLS at the proxy — request.url has scheme http://.
    # Twilio signs the public https:// URL, so reconstruct it from headers.
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("host", str(request.url.netloc))
    path = request.url.path
    # Include query string if present — Twilio signs the full URL as configured
    qs = request.url.query
    url = f"{proto}://{host}{path}" + (f"?{qs}" if qs else "")

    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    signature = request.headers.get("X-Twilio-Signature", "")
    form_data = await request.form()
    # Coerce all values to str — multidict can contain UploadFile for multipart
    params = {k: str(v) for k, v in form_data.items()}

    # ── TEMPORARY DEBUG — remove after signature issue is resolved ──────────
    print(f"[SMS DEBUG] x-forwarded-proto={proto!r}", flush=True)
    print(f"[SMS DEBUG] host={host!r}", flush=True)
    print(f"[SMS DEBUG] reconstructed url={url!r}", flush=True)
    print(f"[SMS DEBUG] X-Twilio-Signature={signature!r}", flush=True)
    print(f"[SMS DEBUG] form params={params}", flush=True)
    # ────────────────────────────────────────────────────────────────────────

    if auth_token and not validate_twilio_signature(auth_token, signature, url, params):
        print(f"[SMS] Signature FAILED. url={url!r} sig={signature!r}", flush=True)
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    from_number = normalize_phone(From.strip())
    body = Body.strip()
    upper = body.upper().strip()

    # Handle global opt-out keywords first
    if handle_opt_out(from_number, body):
        return ""

    # ── Step 1: Is this a registered staff member? ─────────────────────────
    staff = db.query(Staff).filter(
        Staff.phone_number == from_number,
        Staff.is_active == True
    ).first()

    if staff:
        return await handle_staff_sms(from_number, body, upper, staff, db)

    # ── Step 2: Check for in-progress staff registration ───────────────────
    reg_session = db.query(SmsSession).filter(SmsSession.phone_number == from_number).first()
    if reg_session and reg_session.state.startswith("staff_reg_"):
        return await handle_staff_registration_step(from_number, body, upper, reg_session, db)

    # ── Step 3: Not staff — handle student keywords ────────────────────────
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
            "STOP — opt out of all messages\n"
            "STAFFREGISTER — register as staff (pending admin approval)"
        )

    # ── Step 4: Staff self-registration trigger ─────────────────────────────
    if upper in ("STAFFREGISTER", "STAFF REGISTER", "REGISTER"):
        new_session = get_or_create_session(db, from_number)
        save_session(db, new_session, "staff_reg_name", {})
        return (
            "PAWS Alert Staff Registration\n"
            "Reply with your full name to begin, or CANCEL to stop."
        )

    # ── Step 5: Unknown number ──────────────────────────────────────────────
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

    # ── IDLE — show menu or parse intent ──────────────────────────────────
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

        # Natural language fallback
        reset_session(db, session)
        return f"Hi {staff.name}! 👋\n{MENU}"

    # ── SEND FLOW ──────────────────────────────────────────────────────────
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
        return "What do you want to tell your students? Just describe it naturally — I'll format it for you."

    if state == "send_message":
        # Store raw input, call Claude to draft
        ctx["raw_message"] = body
        draft = await get_claude_draft(body, ctx.get("section_label", ""), ctx.get("priority", "NORMAL"))
        ctx["draft"] = draft
        save_session(db, session, "send_confirm", ctx)
        char_count = len(draft)
        return (
            f"Here's your draft ({char_count}/160):\n\n"
            f"{draft}\n\n"
            f"Reply SEND to send, EDIT to change it, or type a new version."
        )

    if state == "send_confirm":
        # SEND — approve and broadcast
        if upper == "SEND":
            return await execute_send(ctx, staff, db, session)

        # EDIT — ask for changes
        if upper == "EDIT":
            save_session(db, session, "send_refine", ctx)
            return "What would you like to change? Just tell me or type the full revised message."

        # CANCEL
        if upper == "CANCEL":
            reset_session(db, session)
            return "Cancelled. Reply MENU to start over."

        # Staff typed a new version directly — treat as revised message
        if len(body) <= 160:
            ctx["draft"] = body
            save_session(db, session, "send_confirm", ctx)
            return (
                f"Updated draft ({len(body)}/160):\n\n"
                f"{body}\n\n"
                f"Reply SEND to send, EDIT to change it, or type another version."
            )
        return f"Too long ({len(body)}/160 chars). Shorten it or reply EDIT to revise."

    if state == "send_refine":
        # Staff describes what to change or types a new message
        current_draft = ctx.get("draft", "")
        priority = ctx.get("priority", "NORMAL")
        section_label = ctx.get("section_label", "")

        # Ask Claude to revise based on feedback
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if api_key:
            prompt = (
                f"You are editing a PAWS Alert SMS for {section_label} (priority: {priority}).\n\n"
                f"Current draft:\n{current_draft}\n\n"
                f"Staff feedback or revision:\n{body}\n\n"
                f"Produce a revised SMS under 155 characters. Keep PAWS Alert prefix and priority tag. "
                f"Reply with ONLY the final SMS text."
            )
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                        },
                        json={
                            "model": "claude-haiku-4-5-20251001",
                            "max_tokens": 200,
                            "messages": [{"role": "user", "content": prompt}]
                        }
                    )
                    data = response.json()
                    revised = data["content"][0]["text"].strip()
            except Exception:
                revised = body if len(body) <= 160 else current_draft
        else:
            revised = body if len(body) <= 160 else current_draft

        ctx["draft"] = revised
        save_session(db, session, "send_confirm", ctx)
        return (
            f"Revised draft ({len(revised)}/160):\n\n"
            f"{revised}\n\n"
            f"Reply SEND to send, EDIT to change it, or type another version."
        )

    # ── JOIN CODE FLOW ─────────────────────────────────────────────────────
    if state == "code_section":
        section = db.query(Section).filter(Section.section_code == upper).first()
        if not section:
            return f"Section '{upper}' not found. Try again or reply CANCEL."
        reset_session(db, session)
        if not section.join_code or (section.join_code_expires and section.join_code_expires < datetime.utcnow()):
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


# ── SEND EXECUTOR (shared by send_confirm) ─────────────────────────────────
async def execute_send(ctx: dict, staff, db: Session, session: SmsSession) -> str:
    section_code = ctx.get("section_code", "00000")
    priority = ctx.get("priority", "NORMAL")
    section_label = ctx.get("section_label", "ALL")
    final_message = ctx.get("draft", ctx.get("raw_message", ""))

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

    result = await broadcast_sms(recipients, final_message)

    log = AlertLog(
        sender_id=staff.id,
        message_content=final_message,
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


# ── STAFF SELF-REGISTRATION ────────────────────────────────────────────────
async def handle_staff_registration_step(phone: str, body: str, upper: str, session: SmsSession, db: Session) -> str:
    state = session.state
    ctx = json.loads(session.context or "{}")

    if upper in ("CANCEL", "STOP", "QUIT"):
        reset_session(db, session)
        return "PAWS Alert: Registration cancelled."

    if state == "staff_reg_name":
        name = body.strip()
        if len(name) < 2:
            return "Please reply with your full name."
        ctx["name"] = name
        save_session(db, session, "staff_reg_id", ctx)
        return f"Hi {name}! What is your employee or system ID?\n(e.g. T00123456)"

    if state == "staff_reg_id":
        system_id = body.strip()
        existing = db.query(Staff).filter(Staff.system_id == system_id).first()
        if existing:
            reset_session(db, session)
            return f"PAWS Alert: System ID '{system_id}' is already registered. Contact an admin for help."
        ctx["system_id"] = system_id
        save_session(db, session, "staff_reg_pin", ctx)
        return "Create a 4–6 digit PIN for dashboard access.\n(You can change it later in the dashboard)"

    if state == "staff_reg_pin":
        pin = body.strip()
        if not pin.isdigit() or not (4 <= len(pin) <= 6):
            return "PIN must be 4–6 digits only. Try again or reply CANCEL."
        existing_phone = db.query(Staff).filter(Staff.phone_number == phone).first()
        if existing_phone:
            reset_session(db, session)
            return "PAWS Alert: This phone number is already linked to a staff account."
        new_staff = Staff(
            name=ctx["name"],
            phone_number=phone,
            system_id=ctx["system_id"],
            pin=hash_pin(pin),
            is_active=False
        )
        db.add(new_staff)
        db.commit()
        reset_session(db, session)
        return (
            f"PAWS Alert: Registration submitted for {ctx['name']} ({ctx['system_id']}).\n"
            f"Your account is pending admin approval. You'll be notified once activated."
        )

    reset_session(db, session)
    return "Something went wrong. Please text STAFFREGISTER to try again."


# ── STUDENT HANDLERS ───────────────────────────────────────────────────────
async def handle_join(phone: str, body: str, upper: str, db: Session) -> str:
    parts = upper.split()
    if len(parts) < 2:
        return "PAWS Alert: Text JOIN [SECTIONCODE] [JOINCODE] to enroll.\nExample: JOIN CS101 XK9P2M"

    section_code = parts[1]
    provided_code = parts[2] if len(parts) >= 3 else None

    section = db.query(Section).filter(Section.section_code == section_code).first()
    if not section:
        return f"PAWS Alert: Section '{section_code}' not found. Check the code with your instructor."

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

    existing = db.query(Subscription).filter(
        Subscription.student_phone == phone,
        Subscription.section_id == section.id,
        Subscription.is_active == True
    ).first()
    if existing:
        return f"PAWS Alert: You're already enrolled in {section_code}."

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
