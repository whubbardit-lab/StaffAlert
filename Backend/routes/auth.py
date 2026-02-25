from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import AuditLog
from security import create_access_token, verify_token
from pydantic import BaseModel
import os

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)

# Admin credentials from environment variables
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "pscc_admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "PawsAlert2025!")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 28800  # 8 hours in seconds


@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        # Log failed attempt
        audit = AuditLog(
            action="LOGIN_FAILED",
            entity_type="auth",
            details=f"Failed login attempt for username: {credentials.username}",
            ip_address=request.client.host
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": credentials.username, "role": "admin"})

    # Log successful login
    audit = AuditLog(
        action="LOGIN_SUCCESS",
        entity_type="auth",
        details=f"Successful login for username: {credentials.username}",
        ip_address=request.client.host
    )
    db.add(audit)
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
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials or not verify_token(credentials.credentials):
        raise HTTPException(status_code=401, detail="Not authenticated")

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
