from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os, hmac, hashlib, base64, re

# ── Password / PIN Hashing ─────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    if not hashed_pin.startswith("$2"):
        return plain_pin == hashed_pin
    return pwd_context.verify(plain_pin, hashed_pin)

# ── JWT Authentication ─────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "changeme_in_production_please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# ── JWT Dependency — protects any route ───────────────────────────────────
security_scheme = HTTPBearer(auto_error=False)

def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

# ── Login Lockout ──────────────────────────────────────────────────────────
# In-memory store: {ip: [timestamp, ...]}
_failed_attempts: dict = {}
MAX_ATTEMPTS = 5
LOCKOUT_WINDOW = 300  # 5 minutes

def check_lockout(ip: str):
    now = datetime.utcnow().timestamp()
    attempts = _failed_attempts.get(ip, [])
    # Remove attempts older than window
    attempts = [t for t in attempts if now - t < LOCKOUT_WINDOW]
    _failed_attempts[ip] = attempts
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Try again in {LOCKOUT_WINDOW // 60} minutes."
        )

def record_failed_attempt(ip: str):
    now = datetime.utcnow().timestamp()
    if ip not in _failed_attempts:
        _failed_attempts[ip] = []
    _failed_attempts[ip].append(now)

def clear_failed_attempts(ip: str):
    _failed_attempts.pop(ip, None)

# ── Input Sanitization ─────────────────────────────────────────────────────
def sanitize_string(value: str, max_length: int = 500) -> str:
    """Strip dangerous characters and enforce max length."""
    if not value:
        return value
    # Remove null bytes and control characters
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
    # Truncate to max length
    return value[:max_length]

def sanitize_phone(phone: str) -> str:
    """Normalize phone to E.164 format, strip non-numeric chars."""
    cleaned = re.sub(r'[^\d+]', '', phone)
    if not cleaned.startswith('+'):
        cleaned = '+1' + cleaned
    if not re.match(r'^\+\d{10,15}$', cleaned):
        raise HTTPException(status_code=400, detail=f"Invalid phone number format: {phone}")
    return cleaned

# ── Twilio Signature Validation ────────────────────────────────────────────
def validate_twilio_signature(auth_token: str, signature: str, url: str, params: dict) -> bool:
    if not auth_token or not signature:
        return False
    s = url
    if params:
        for key in sorted(params.keys()):
            s += key + params[key]
    mac = hmac.new(auth_token.encode("utf-8"), s.encode("utf-8"), hashlib.sha1)
    computed = base64.b64encode(mac.digest()).decode("utf-8")
    return hmac.compare_digest(computed, signature)
