from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine
import models
import time
from collections import defaultdict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

# Import routers
from routes.webhook import router as webhook_router
from routes.staff import router as staff_router
from routes.sections import router as sections_router
from routes.logs import router as logs_router
from routes.alerts import router as alerts_router
from routes.auth import router as auth_router
from routes.schedule import router as schedule_router
from routes.schedule import check_and_fire_due_alerts
from routes.receipts import router as receipts_router
from routes.students import router as students_router

# ── Scheduler setup ────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(check_and_fire_due_alerts, "interval", minutes=1, id="alert_scheduler")
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="PAWS Alert API",
    description="SMS Emergency Alert System for Pellissippi State Community College",
    version="2.0.0",
    lifespan=lifespan
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://staffalert-frontend.onrender.com",
        "https://app.paws-alert.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting ──────────────────────────────────────────────────────────
_request_counts = defaultdict(list)

RATE_LIMITS = {
    "/api/auth/login": (5, 60),
    "/api/alerts/send": (10, 60),
    "default": (60, 60),
}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    ip = request.client.host
    path = request.url.path
    now = time.time()

    if path in RATE_LIMITS:
        max_requests, window = RATE_LIMITS[path]
    else:
        max_requests, window = RATE_LIMITS["default"]

    key = f"{ip}:{path}"
    _request_counts[key] = [t for t in _request_counts[key] if now - t < window]

    if len(_request_counts[key]) >= max_requests:
        return JSONResponse(
            status_code=429,
            content={"detail": f"Too many requests. Max {max_requests} per {window} seconds."}
        )

    _request_counts[key].append(now)
    return await call_next(request)

# ── Security Headers ───────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(webhook_router)
app.include_router(auth_router, prefix="/api")
app.include_router(staff_router, prefix="/api")
app.include_router(sections_router, prefix="/api")
app.include_router(logs_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(schedule_router, prefix="/api")
app.include_router(receipts_router, prefix="/api")
app.include_router(students_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "PAWS Alert is running", "version": "2.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
