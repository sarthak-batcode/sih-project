import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_dashboard_summary():
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_complaints"] >= 1000
    assert "top_high_risk_areas" in data
    assert len(data["recent_alerts"]) > 0

def test_areas_list_and_detail():
    res = client.get("/api/v1/areas")
    assert res.status_code == 200
    areas = res.json()
    assert len(areas) == 100
    
    first_area_id = areas[0]["area_id"]
    detail_res = client.get(f"/api/v1/areas/{first_area_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["area"]["area_id"] == first_area_id
    assert "recommended_patrol_window" in detail_data

def test_prediction_endpoint():
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
    res = client.post("/api/v1/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 1.0
    assert len(data["contributing_factors"]) > 0

def test_batch_prediction_endpoint():
    res = client.get("/api/v1/predict/batch?hour=23&day_of_week=5")
    assert res.status_code == 200
    data = res.json()
    assert data["total_evaluated_areas"] == 100
    assert len(data["results"]) == 100

def test_analytics_trends_endpoint():
    res = client.get("/api/v1/analytics/trends")
    assert res.status_code == 200
    data = res.json()
    assert len(data["regional_risk_matrix"]) > 0
    assert len(data["amount_bucket_distribution"]) > 0

def test_model_governance_endpoints():
    metrics_res = client.get("/api/v1/model/metrics")
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert "selected_model_metrics" in metrics_data
    
    fi_res = client.get("/api/v1/model/feature-importance")
    assert fi_res.status_code == 200
    fi_data = fi_res.json()
    assert len(fi_data) > 0

def test_audit_logs_endpoint():
    res = client.get("/api/v1/audit/logs")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
