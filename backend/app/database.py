import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Default to SQLite for local self-contained zero-config execution if PostgreSQL is not active
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
    except Exception:
        # Fallback to local SQLite if postgres server is offline
        fallback_url = "sqlite:///./cyber_intelligence.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
