from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

# Import routers
from routes.webhook import router as webhook_router
from routes.staff import router as staff_router
from routes.sections import router as sections_router
from routes.logs import router as logs_router
from routes.alerts import router as alerts_router

app = FastAPI(
    title="StaffAlert API",
    description="SMS Emergency Alert System for Pellissippi State",
    version="1.0.0"
)

# CORS — allow the React frontend (adjust origin in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://staffalert-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(webhook_router)
app.include_router(staff_router, prefix="/api")
app.include_router(sections_router, prefix="/api")
app.include_router(logs_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "StaffAlert is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
