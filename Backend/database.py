from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./staffalert.db")

# Fix for Render/Supabase — they use postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs special connect args, PostgreSQL does not
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Click **Commit changes**.

---

## Step 6 — Add the Database URL to Render

1. Go to [render.com](https://render.com) → your **staffalert backend** service
2. Click **Environment** in the left sidebar
3. Find `DATABASE_URL`
4. Replace the value with your full Supabase connection string from Step 3:
```
postgresql://postgres:yourpassword@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```
5. Click **Save Changes**

---

## Step 7 — Redeploy

Render will automatically redeploy when you save the environment variable. Watch the **Logs** tab and look for:
```
Application startup complete.
