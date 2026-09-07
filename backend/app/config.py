import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"
    )

    PROJECT_NAME: str = "Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    
    # JWT signing key. Set SECRET_KEY in .env for anything but a local demo —
    # a committed default means anyone with the repo can mint valid tokens.
    # main.py refuses to start with this value when ENVIRONMENT=production.
    SECRET_KEY: str = "dev-only-insecure-key-set-SECRET_KEY-in-dotenv"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours
    
    # Database
    DATABASE_URL: str = "sqlite:///./cyber_intelligence.db"
    
    # ML Model directory
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ml", "saved_models")
    
    # Synthetic Data Parameters
    SYNTHETIC_RECORDS_COUNT: int = 10000
    SYNTHETIC_AREAS_COUNT: int = 100
    RANDOM_SEED: int = 42

    # CORS. No "*" here: with allow_credentials=True a wildcard origin is
    # rejected by every browser anyway, so it bought nothing and only looked
    # permissive. Add deployment origins explicitly.
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",   # vite dev
        "http://127.0.0.1:5173",
        "http://localhost:4173",   # vite preview (production build)
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Default risk cut-offs. Operators can change these at runtime through
    # PATCH /api/v1/settings; these are the values a fresh database starts with.
    RISK_THRESHOLD_CRITICAL: float = 0.80
    RISK_THRESHOLD_HIGH: float = 0.65
    RISK_THRESHOLD_MEDIUM: float = 0.40

settings = Settings()
