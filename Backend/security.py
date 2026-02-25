from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
import hmac
import hashlib
import base64
from urllib.parse import urlencode

# ── Password / PIN Hashing ─────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_pin(pin: str) -> str:
    """Hash a PIN using bcrypt."""
    return pwd_context.hash(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify a plain PIN against a bcrypt hash."""
    # Support legacy plain-text PINs during migration
    if not hashed_pin.startswith("$2"):
        return plain_pin == hashed_pin
    return pwd_context.verify(plain_pin, hashed_pin)


# ── JWT Authentication ─────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "changeme_in_production_please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ── Twilio Signature Validation ────────────────────────────────────────────
def validate_twilio_signature(
    auth_token: str,
    signature: str,
    url: str,
    params: dict
) -> bool:
    """
    Validate that an incoming request genuinely came from Twilio.
    https://www.twilio.com/docs/usage/webhooks/webhooks-security
    """
    if not auth_token or not signature:
        return False

    # Build the string to sign: URL + sorted params
    s = url
    if params:
        for key in sorted(params.keys()):
            s += key + params[key]

    # Compute HMAC-SHA1
    mac = hmac.new(
        auth_token.encode("utf-8"),
        s.encode("utf-8"),
        hashlib.sha1
    )
    computed = base64.b64encode(mac.digest()).decode("utf-8")
    return hmac.compare_digest(computed, signature)
