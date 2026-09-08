import os
from pathlib import Path
from typing import List

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./cyber_intelligence.db"

    # ML Model directory
    MODEL_DIR: str = str(
        Path(__file__).resolve().parents[2] / "ml" / "saved_models"
    )

    # Synthetic Data Parameters
    SYNTHETIC_RECORDS_COUNT: int = 10000
    SYNTHETIC_AREAS_COUNT: int = 100
    RANDOM_SEED: int = 42

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sih-project-55in.vercel.app",
    ]

    # Risk Thresholds
    RISK_THRESHOLD_CRITICAL: float = 0.80
    RISK_THRESHOLD_HIGH: float = 0.65
    RISK_THRESHOLD_MEDIUM: float = 0.40

    @model_validator(mode="after")
    def ensure_model_dir_exists(self):
        Path(self.MODEL_DIR).mkdir(parents=True, exist_ok=True)
        return self


settings = Settings()