from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import AuditLog
from security import (create_access_token, verify_token, require_auth,
                      check_lockout, record_failed_attempt, clear_failed_attempts)
from pydantic import BaseModel
import os
router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "pscc_admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "PawsAlert2025!")
class LoginRequest(BaseModel):
    username: str
    password: str
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 28800
@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    # Check lockout BEFORE attempting auth
    check_lockout(ip)
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        record_failed_attempt(ip)
        db.add(AuditLog(
            action="LOGIN_FAILED", entity_type="auth",
            details=f"Failed login for: {credentials.username}",
            ip_address=ip
        ))
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid username or password")
    clear_failed_attempts(ip)
    token = create_access_token({"sub": credentials.username, "role": "admin"})
    db.add(AuditLog(
        action="LOGIN_SUCCESS", entity_type="auth",
        details=f"Successful login for: {credentials.username}",
        ip_address=ip
    ))
    db.commit()
    return LoginResponse(access_token=token)
@router.post("/verify")
def verify(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True, "username": payload.get("sub")}
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    auth=Depends(require_auth)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "ip_address": log.ip_address
        }
        for log in logs
    ]

@router.get("/me")
def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate token and return current user — used by frontend on cold start."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"username": payload.get("sub"), "role": payload.get("role", "admin")}
