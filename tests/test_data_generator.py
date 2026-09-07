import os
import json
import pandas as pd
import pytest

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

def test_synthetic_areas_file_exists_and_valid():
    json_path = os.path.join(DATA_DIR, "synthetic_areas.json")
    csv_path = os.path.join(DATA_DIR, "synthetic_areas.csv")
    
    assert os.path.exists(json_path), "synthetic_areas.json should exist"
    assert os.path.exists(csv_path), "synthetic_areas.csv should exist"
    
    with open(json_path, "r", encoding="utf-8") as f:
        areas = json.load(f)
    
    assert len(areas) == 100, "Should generate exactly 100 surveillance areas"
    
    # Check fields
    for a in areas:
        assert "area_id" in a
        assert "latitude" in a and 8.0 <= a["latitude"] <= 37.0
        assert "longitude" in a and 68.0 <= a["longitude"] <= 97.0
        assert "atm_pos_density" in a and a["atm_pos_density"] > 0
        assert "baseline_risk_score" in a and 0.0 <= a["baseline_risk_score"] <= 1.0

def test_synthetic_complaints_dataset_integrity():
    csv_path = os.path.join(DATA_DIR, "synthetic_complaints.csv")
    assert os.path.exists(csv_path), "synthetic_complaints.csv should exist"
    
    df = pd.read_csv(csv_path)
    assert len(df) >= 10000, f"Expected at least 10,000 records, got {len(df)}"
    
    # Ensure zero nulls
    assert df.isnull().sum().sum() == 0, "Dataset must not have missing/null values"
    
    # Target column validation
    assert "target_cash_withdrawal_event" in df.columns
    assert set(df["target_cash_withdrawal_event"].unique()).issubset({0, 1})
    
    # Privacy rule check: no PII columns
    forbidden_pii = ["aadhaar", "pan", "phone", "mobile", "account_number", "card_number", "real_name", "cvv"]
    for col in df.columns:
        for pii in forbidden_pii:
            assert pii not in col.lower(), f"Forbidden PII keyword found in column {col}"
    
    # Check amount ranges
    assert (df["transaction_amount"] > 0).all()
    assert (df["hour"] >= 0).all() and (df["hour"] <= 23).all()
    assert (df["day_of_week"] >= 0).all() and (df["day_of_week"] <= 6).all()
