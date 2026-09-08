"""
Regression tests for the defects found in the September 2026 review.

Each test here corresponds to a bug that was live in the codebase. They exist so
the fixes cannot silently come back — several of them were the kind of problem
that looks fine on screen and only shows up under questioning.
"""

import json
import os

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from ml.pipeline.train import NUMERICAL_FEATURES, CATEGORICAL_FEATURES, LEAKED_COLUMNS, assert_no_leakage
from ml.pipeline.predict import predict_cash_withdrawal_risk, amount_bucket

client = TestClient(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))



# ---------------------------------------------------------------- ML leakage

def test_no_label_derived_column_is_a_feature():
    """
    `local_risk_score` was the exact quantity the label was drawn from, and it
    was listed in NUMERICAL_FEATURES. It took 85% of the model's feature
    importance, and a one-line `if local_risk_score > 0.58` rule outscored the
    trained model on the test set.
    """
    features = set(NUMERICAL_FEATURES + CATEGORICAL_FEATURES)
    assert not (features & set(LEAKED_COLUMNS)), (
        f"label-derived column(s) in the feature set: {features & set(LEAKED_COLUMNS)}"
    )


def test_leakage_guard_actually_raises():
    with pytest.raises(ValueError, match="leakage"):
        assert_no_leakage(NUMERICAL_FEATURES + ["label_generation_prob"])


def test_saved_model_was_not_trained_on_a_leaked_column():
    meta_path = os.path.join(BASE_DIR, "ml", "saved_models", "model_metadata.json")
    if not os.path.exists(meta_path):
        pytest.skip("model not trained yet")
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    assert not (set(meta["all_feature_names"]) & set(LEAKED_COLUMNS))
    # No single feature should dominate. 85% was the leakage signature.
    top = meta["top_feature_importances"][0]["percentage"]
    assert top < 60, f"one feature carries {top}% of importance — check for leakage"


def test_model_beats_the_trivial_baseline_on_ranking():
    """F1 can be gamed by always answering yes; ROC-AUC cannot."""
    meta_path = os.path.join(BASE_DIR, "ml", "saved_models", "model_metadata.json")
    if not os.path.exists(meta_path):
        pytest.skip("model not trained yet")
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    assert meta["selected_model_metrics"]["roc_auc"] > 0.6


# ------------------------------------------------------------ train / serve

def test_diurnal_signal_reaches_the_model():
    """
    The generator built timestamps whose hour did not match the `hour` column
    (they agreed 3.8% of the time), and the EDA step then recomputed `hour`
    from the timestamp. The night-window signal — the premise of the whole
    system — was replaced by noise before training.
    """
    def at(hour):
        return predict_cash_withdrawal_risk(
            hour=hour, day_of_week=2, previous_incident_count=8,
            area_atm_density=35, time_to_report_mins=120,
            transaction_amount=35000.0, area_baseline_risk_score=0.55,
            explain=False,
        )["risk_score"]

    night, day = at(23), at(13)
    assert night - day > 0.05, (
        f"night risk {night:.3f} is not meaningfully above midday {day:.3f} — "
        "the diurnal signal has been lost again"
    )


def test_batch_predictions_are_spread_across_tiers():
    """
    Feeding `baseline_risk_score` into a slot the model learned as
    `local_risk_score` (a differently distributed variable) collapsed live
    output: at 23:00, 96 of 100 zones came back LOW.
    """
    from ml.pipeline.predict import predict_areas_batch

    path = os.path.join(BASE_DIR, "data", "synthetic_areas.json")
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    class Zone:
        def __init__(self, d):
            self.atm_pos_density = d["atm_pos_density"]
            self.baseline_risk_score = d["baseline_risk_score"]

    results = predict_areas_batch([Zone(a) for a in raw], hour=23, day_of_week=2)
    levels = {r["risk_level"] for r in results}
    assert len(levels) >= 3, f"only {levels} produced — output has collapsed"

    low_share = sum(r["risk_level"] == "LOW" for r in results) / len(results)
    assert low_share < 0.85, f"{low_share:.0%} of zones are LOW at 23:00"


def test_amount_bucket_is_derived_not_trusted():
    """The band and the amount can no longer contradict each other."""
    assert amount_bucket(8000) == "LOW_UNDER_10K"
    assert amount_bucket(250000) == "CRITICAL_ABOVE_200K"
    a = predict_cash_withdrawal_risk(
        hour=23, day_of_week=5, previous_incident_count=8, area_atm_density=40,
        time_to_report_mins=120, transaction_amount=250000.0,
        transaction_amount_bucket="LOW_UNDER_10K",   # deliberately wrong
        area_baseline_risk_score=0.6, explain=False)
    b = predict_cash_withdrawal_risk(
        hour=23, day_of_week=5, previous_incident_count=8, area_atm_density=40,
        time_to_report_mins=120, transaction_amount=250000.0,
        area_baseline_risk_score=0.6, explain=False)
    assert a["risk_score"] == b["risk_score"]


def test_attribution_is_model_derived():
    """
    The contributing factors were hard-coded strings ("+28%" for night hours)
    unrelated to what the model weighted for the specific input.
    """
    out = predict_cash_withdrawal_risk(
        hour=23, day_of_week=5, previous_incident_count=12, area_atm_density=55,
        time_to_report_mins=200, transaction_amount=90000.0,
        area_baseline_risk_score=0.7)
    assert out["attribution_method"].startswith("counterfactual")
    for f in out["contributing_factors"]:
        assert isinstance(f["impact_value"], float)
        assert f["direction"] in {"increases", "reduces", "neutral"}


# ------------------------------------------------------------ public access

@pytest.mark.parametrize("path", [
    "/api/v1/dashboard/summary",
    "/api/v1/areas",
    "/api/v1/predict/batch",
    "/api/v1/analytics/trends",
    "/api/v1/model/metrics",
    "/api/v1/audit/logs",
    "/api/v1/settings",
])
def test_every_endpoint_is_publicly_reachable(path):
    """
    Authentication was removed: the deployment is public-access. This is the
    inverse of the test that used to live here (which asserted 401 on each of
    these paths), and it fails if an auth dependency is ever reintroduced by
    accident.
    """
    res = client.get(path)
    assert res.status_code == 200, f"{path} returned {res.status_code} without credentials"


def test_no_auth_routes_remain():
    paths = {p for p in client.get("/openapi.json").json()["paths"]}
    offenders = [p for p in paths if "/auth" in p or "login" in p.lower()]
    assert not offenders, f"auth routes still registered: {offenders}"


# ----------------------------------------------------------------- settings

def test_thresholds_must_stay_ordered():
    res = client.patch("/api/v1/settings", json={"threshold_high": 0.95})
    assert res.status_code == 400
    assert "medium < high < critical" in res.json()["detail"]


def test_threshold_change_reclassifies_zones_and_is_audited():
    """The Settings sliders used to be local component state that saved nowhere."""
    original = client.get("/api/v1/settings").json()
    try:
        before = client.get("/api/v1/predict/batch?hour=23").json()
        client.patch("/api/v1/settings",
                     json={"threshold_critical": 0.72, "threshold_high": 0.55},
                     )
        after = client.get("/api/v1/predict/batch?hour=23").json()
        assert after["critical_risk_count"] > before["critical_risk_count"]

        logs = client.get("/api/v1/audit/logs?action=THRESHOLD").json()
        assert any(l["action"] == "RISK_THRESHOLDS_UPDATED" for l in logs)
    finally:
        client.patch("/api/v1/settings", json={
            "threshold_critical": original["threshold_critical"],
            "threshold_high": original["threshold_high"],
            "threshold_medium": original["threshold_medium"],
        })


# ------------------------------------------------------------- data honesty

def test_dashboard_counts_match_the_areas_file():
    """
    /dashboard/summary substituted invented counts (32 HIGH) when the database
    was empty, while the risk map read the real file (4 HIGH). The two screens
    contradicted each other in the same demo.
    """
    summary = client.get("/api/v1/dashboard/summary").json()
    areas = client.get("/api/v1/areas").json()

    counted = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for a in areas:
        counted[a["risk_category"]] += 1

    assert summary["high_risk_areas_count"] == counted["HIGH"]
    assert summary["medium_risk_areas_count"] == counted["MEDIUM"]
    assert summary["low_risk_areas_count"] == counted["LOW"]


def test_alerts_are_generated_not_hardcoded():
    """Three fixed dicts with timestamps like "10 mins ago" that never changed."""
    alerts = client.get("/api/v1/dashboard/summary").json()["recent_alerts"]
    for a in alerts:
        assert "mins ago" not in a["timestamp"]
        assert a["risk_score"] > 0
        assert a["area_id"].startswith("AREA-")


def test_analytics_aggregates_come_from_the_database():
    """regional_risk_matrix and amount_bucket_distribution were Python literals."""
    trends = client.get("/api/v1/analytics/trends").json()
    areas = client.get("/api/v1/areas").json()

    regions_in_data = {a["region"] for a in areas}
    regions_reported = {r["region"] for r in trends["regional_risk_matrix"]}
    assert regions_reported <= regions_in_data
    assert regions_reported, "no regional aggregates returned"

    for bucket in trends["amount_bucket_distribution"]:
        assert 0 <= bucket["cash_out_rate"] <= 100
