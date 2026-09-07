from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base

# Import ORM models to register metadata
from backend.app.models import user, area, complaint, prediction, audit_log, system_setting

# Import Routers
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.areas import router as areas_router
from backend.app.api.v1.predictions import router as predictions_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.model_metrics import router as model_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.settings import router as settings_router

# Refuse to run in production with the committed development signing key.
if settings.ENVIRONMENT == "production" and settings.SECRET_KEY.startswith("dev-only"):
    raise RuntimeError(
        "SECRET_KEY is still the development default. Set SECRET_KEY in .env "
        "before running with ENVIRONMENT=production."
    )

# Initialize database schema tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Smart India Hackathon 2026 (SIH26184) - Decision-support platform predicting high-risk cash-withdrawal locations and temporal windows using synthetic cybercrime complaint intelligence.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(areas_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(model_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["System"])
def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "disclaimer": "Strictly uses synthetic/anonymized demo data for SIH 2026 evaluation. Predictions are probabilistic decision-support estimates."
    }

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "api_v1": "active",
        "synthetic_data_pipeline": "ready",
        "ml_engine": "ready",
        "database": "connected"
    }


@app.get("/api/v1/health/model", tags=["System"])
def model_health():
    """Reports whether the trained artifacts are present and what they contain."""
    import os, json
    meta = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    if not os.path.exists(meta):
        return {"model_loaded": False, "detail": "Run python ml/pipeline/train.py"}
    with open(meta, "r", encoding="utf-8") as f:
        m = json.load(f)
    return {
        "model_loaded": True,
        "version": m.get("version"),
        "algorithm": m.get("algorithm"),
        "selection_metric": m.get("selection_metric"),
        "roc_auc": m.get("selected_model_metrics", {}).get("roc_auc"),
        "excluded_features": m.get("excluded_features", []),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
print("CORS ORIGINS =", settings.BACKEND_CORS_ORIGINS)