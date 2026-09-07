import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

@pytest.fixture
def admin_token():
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@cyberintel.gov.in",
        "password": "Admin@SIH2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def investigator_token():
    res = client.post("/api/v1/auth/login", json={
        "email": "investigator@cyberintel.gov.in",
        "password": "Investigate@2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

def test_login_success(admin_token):
    assert admin_token is not None
    assert len(admin_token) > 20

def test_auth_me_endpoint(admin_token):
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin@cyberintel.gov.in"
    assert data["role"] == "admin"

def test_dashboard_summary(admin_token):
    res = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_complaints"] >= 1000
    assert "top_high_risk_areas" in data
    assert len(data["recent_alerts"]) > 0

def test_areas_list_and_detail(admin_token):
    res = client.get("/api/v1/areas", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    areas = res.json()
    assert len(areas) == 100
    
    first_area_id = areas[0]["area_id"]
    detail_res = client.get(f"/api/v1/areas/{first_area_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["area"]["area_id"] == first_area_id
    assert "recommended_patrol_window" in detail_data

def test_prediction_endpoint(investigator_token):
    payload = {
        "area_id": "AREA-CA-101",
        "hour": 23,
        "day_of_week": 5,
        "previous_incident_count": 12,
        "time_to_report_mins": 120,
        "transaction_amount": 45000.0,
        "transaction_type": "AEPS_SPOOF",
        "complaint_category": "INVESTMENT_MULE_SCAM",
        "transaction_amount_bucket": "MID_10K_TO_50K"
    }
    res = client.post("/api/v1/predict", json=payload, headers={"Authorization": f"Bearer {investigator_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 1.0
    assert len(data["contributing_factors"]) > 0

def test_batch_prediction_endpoint(investigator_token):
    res = client.get("/api/v1/predict/batch?hour=23&day_of_week=5", headers={"Authorization": f"Bearer {investigator_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_evaluated_areas"] == 100
    assert len(data["results"]) == 100

def test_analytics_trends_endpoint(admin_token):
    res = client.get("/api/v1/analytics/trends", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["regional_risk_matrix"]) > 0
    assert len(data["amount_bucket_distribution"]) > 0

def test_model_governance_endpoints(admin_token):
    metrics_res = client.get("/api/v1/model/metrics", headers={"Authorization": f"Bearer {admin_token}"})
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert "selected_model_metrics" in metrics_data
    
    fi_res = client.get("/api/v1/model/feature-importance", headers={"Authorization": f"Bearer {admin_token}"})
    assert fi_res.status_code == 200
    fi_data = fi_res.json()
    assert len(fi_data) > 0

def test_audit_logs_endpoint(admin_token):
    res = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
