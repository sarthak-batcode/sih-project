import os
import json
import pytest
from ml.pipeline.predict import predict_cash_withdrawal_risk

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "ml", "saved_models")

def test_model_artifacts_exist():
    model_path = os.path.join(MODEL_DIR, "best_model.joblib")
    prep_path = os.path.join(MODEL_DIR, "preprocessor.joblib")
    meta_path = os.path.join(MODEL_DIR, "model_metadata.json")

    assert os.path.exists(model_path), "best_model.joblib should exist"
    assert os.path.exists(prep_path), "preprocessor.joblib should exist"
    assert os.path.exists(meta_path), "model_metadata.json should exist"

def test_prediction_output_structure_and_bounds():
    # Test High-Risk Night-Time AEPS Scenario
    result = predict_cash_withdrawal_risk(
        hour=23,
        day_of_week=5,
        previous_incident_count=12,
        area_atm_density=48,
        time_to_report_mins=180,
        transaction_amount=45000.0,
        transaction_type="AEPS_SPOOF",
        complaint_category="INVESTMENT_MULE_SCAM",
        transaction_amount_bucket="MID_10K_TO_50K",
        area_baseline_risk_score=0.85
    )

    assert "risk_score" in result
    assert 0.0 <= result["risk_score"] <= 1.0
    assert result["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(result["confidence_interval"]) == 2
    assert result["confidence_interval"][0] <= result["confidence_interval"][1]
    assert len(result["contributing_factors"]) > 0
    assert "patrol_window" in result["recommended_patrol_window"] or "IST" in result["recommended_patrol_window"]
    assert "probabilistic" in result["disclaimer"].lower() or "model-estimated" in result["disclaimer"].lower()

def test_prediction_differential_sensitivity():
    # High risk input
    high_risk = predict_cash_withdrawal_risk(
        hour=2, # late night
        day_of_week=6,
        previous_incident_count=15,
        area_atm_density=50,
        time_to_report_mins=240,
        transaction_amount=80000.0,
        transaction_type="AEPS_SPOOF",
        complaint_category="INVESTMENT_MULE_SCAM",
        area_baseline_risk_score=0.88
    )

    # Low risk input
    low_risk = predict_cash_withdrawal_risk(
        hour=11, # daytime
        day_of_week=1,
        previous_incident_count=1,
        area_atm_density=8,
        time_to_report_mins=10,
        transaction_amount=2000.0,
        transaction_type="NET_BANKING_PHISHING",
        complaint_category="JOB_OFFER_FRAUD",
        area_baseline_risk_score=0.15
    )

    assert high_risk["risk_score"] > low_risk["risk_score"], "High risk parameters should produce higher risk score than low risk"
