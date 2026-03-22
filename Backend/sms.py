import os
import asyncio
import httpx
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
SERVICE_NUMBER = os.getenv("TWILIO_SERVICE_NUMBER")

client = Client(ACCOUNT_SID, AUTH_TOKEN)


def send_single_sms(to: str, body: str) -> dict:
    """Send a single SMS. Returns status dict."""
    try:
        message = client.messages.create(
            body=body,
            from_=SERVICE_NUMBER,
            to=to
        )
        return {"to": to, "sid": message.sid, "status": "sent"}
    except TwilioRestException as e:
        return {"to": to, "sid": None, "status": "failed", "error": str(e)}


async def broadcast_sms(recipients: list[str], body: str) -> dict:
    """
    Async broadcast to a list of phone numbers.
    Uses asyncio to avoid blocking the webhook response.
    Twilio free tier: ~1 msg/sec. Paid: much higher.
    Returns summary: {sent, failed, total}
    """
    if len(body) > 160:
        raise ValueError("Message exceeds 160-character SMS limit")

    loop = asyncio.get_event_loop()
    results = []

    # Run Twilio calls in a thread pool to avoid blocking the event loop
    tasks = [
        loop.run_in_executor(None, send_single_sms, phone, body)
        for phone in recipients
    ]
    results = await asyncio.gather(*tasks)

    sent = sum(1 for r in results if r["status"] == "sent")
    failed = sum(1 for r in results if r["status"] == "failed")

    return {
        "sent": sent,
        "failed": failed,
        "total": len(recipients),
        "details": results
    }


async def translate_to_spanish(message: str) -> str:
    """Translate an outbound SMS to Spanish using Claude Haiku. Falls back to original on error."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return message
    prompt = (
        "Translate the following SMS message to Spanish. "
        "Return ONLY the translated text, nothing else.\n\n" + message
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = response.json()
            return data["content"][0]["text"].strip()
    except Exception:
        return message


def handle_opt_out(from_number: str, body: str) -> bool:
    """
    Check if incoming SMS is a STOP/HELP/UNSTOP keyword.
    Twilio handles opt-outs automatically, but we log them.
    Returns True if message was a keyword (no further processing needed).
    """
    keywords = {"STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
                "HELP", "INFO", "UNSTOP", "START"}
    return body.strip().upper() in keywords
