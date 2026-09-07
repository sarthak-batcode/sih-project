"""
SIH26184: Synthetic Cybercrime Complaint & Cash-Withdrawal Dataset Generator
=============================================================================
This module generates statistically realistic, multi-dimensional synthetic datasets
for training decision-support predictive models and populating the national dashboard.

IMPORTANT SAFETY & PRIVACY GUARANTEE:
- Zero real-world PII (No real names, phone numbers, Aadhaar, PAN, or bank account numbers).
- Uses synthetic coordinates centered around abstract regional zones.
- Generates 15,000 synthetic complaint records across 100 defined surveillance areas.
"""

import sys
import os
import json
import random
import datetime
import numpy as np
import pandas as pd

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Set fixed random seed for strict reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "docs")

# ------------------------------------------------------------------------------
# 1. SYNTHETIC SURVEILLANCE AREAS (100 Zones across 5 major regions)
# ------------------------------------------------------------------------------
REGIONAL_CENTERS = [
    {"region": "Capital-Metro", "state": "State-National-Capital", "center_lat": 28.6139, "center_lon": 77.2090, "num_zones": 25},
    {"region": "Financial-Hub", "state": "State-West-Coast", "center_lat": 19.0760, "center_lon": 72.8777, "num_zones": 25},
    {"region": "Tech-Corridor", "state": "State-South-Plateau", "center_lat": 12.9716, "center_lon": 77.5946, "num_zones": 20},
    {"region": "Industrial-Belt", "state": "State-East-Zone", "center_lat": 22.5726, "center_lon": 88.3639, "num_zones": 15},
    {"region": "Central-Grid", "state": "State-Central-Valley", "center_lat": 21.1458, "center_lon": 79.0882, "num_zones": 15},
]

ZONE_TYPES = [
    ("Commercial ATM Hub", 0.75, 45),       # (Type, baseline_risk_multiplier, avg_atm_count)
    ("High-Density Transit Node", 0.65, 35),
    ("Industrial Cyber Cluster", 0.80, 50),
    ("Suburban Residential Zone", 0.35, 12),
    ("Tech Park Outskirts", 0.50, 22),
    ("University Campus Zone", 0.40, 15),
    ("Marketplace & Trade Center", 0.70, 40),
]

TRANSACTION_TYPES = [
    ("UPI_FRAUD", 0.45),
    ("AEPS_SPOOF", 0.20),
    ("SIM_CLONE_FRAUD", 0.15),
    ("CARD_SKIMMING", 0.12),
    ("NET_BANKING_PHISHING", 0.08),
]

COMPLAINT_CATEGORIES = [
    ("INVESTMENT_MULE_SCAM", 0.32),
    ("PHISHING_PORTAL", 0.25),
    ("JOB_OFFER_FRAUD", 0.20),
    ("KYC_EXPIRY_SPOOF", 0.13),
    ("SEXTORTION_BLACKMAIL", 0.10),
]

def generate_surveillance_areas():
    """Generates 100 realistic surveillance areas with coordinates and metadata."""
    areas = []
    zone_counter = 101

    for reg in REGIONAL_CENTERS:
        for i in range(reg["num_zones"]):
            zone_id = f"AREA-{reg['region'][:2].upper()}-{zone_counter}"
            zone_counter += 1

            # Disperse locations within 15 km of regional center
            lat_offset = np.random.normal(0, 0.08)
            lon_offset = np.random.normal(0, 0.08)
            lat = round(reg["center_lat"] + lat_offset, 6)
            lon = round(reg["center_lon"] + lon_offset, 6)

            zone_type, risk_mult, base_atms = random.choice(ZONE_TYPES)
            atm_count = max(5, int(np.random.poisson(base_atms)))
            # Beta(2.2, 2.2) is symmetric with a wide spread, so the three risk
            # categories below are all meaningfully populated. The earlier
            # Beta(2, 4) was right-skewed with a mean near 0.35, which put 75%
            # of zones in LOW and left only 3-4 zones above the 0.65 HIGH cut-off.
            baseline_risk = round(
                min(0.95, max(0.10, np.random.beta(2.2, 2.2) * risk_mult * 1.05 + 0.20)), 3
            )

            # Assign risk level tag
            if baseline_risk >= 0.65:
                risk_category = "HIGH"
            elif baseline_risk >= 0.40:
                risk_category = "MEDIUM"
            else:
                risk_category = "LOW"

            district_name = f"{reg['region']}-District-{chr(65 + (i % 6))}"
            area_name = f"{district_name} {zone_type} Sector-{i+1}"

            area_data = {
                "area_id": zone_id,
                "area_name": area_name,
                "district": district_name,
                "state": reg["state"],
                "region": reg["region"],
                "zone_type": zone_type,
                "latitude": lat,
                "longitude": lon,
                "radius_km": round(random.uniform(1.5, 4.5), 1),
                "atm_pos_density": atm_count,
                "baseline_risk_score": baseline_risk,
                "risk_category": risk_category,
                "active_surveillance": baseline_risk >= 0.50
            }
            areas.append(area_data)

    return areas


def generate_synthetic_complaints(areas, total_records=15000):
    """
    Generates 15,000+ realistic synthetic cybercrime complaint records
    spanning the last 90 days with temporal and spatial clusters.
    """
    area_dict = {a["area_id"]: a for a in areas}
    area_ids = list(area_dict.keys())
    
    # Calculate sampling probability weighted by baseline risk
    weights = [area_dict[aid]["baseline_risk_score"] ** 1.5 for aid in area_ids]
    sum_w = sum(weights)
    sampling_probs = [w / sum_w for w in weights]

    start_date = datetime.datetime(2026, 5, 25, 0, 0, 0)
    records = []

    tx_types, tx_probs = zip(*TRANSACTION_TYPES)
    cat_types, cat_probs = zip(*COMPLAINT_CATEGORIES)

    for i in range(total_records):
        complaint_ref = f"NCRP-2026-SYN-{i+1:06d}"
        
        # Pick area based on risk weight
        chosen_area_id = np.random.choice(area_ids, p=sampling_probs)
        chosen_area = area_dict[chosen_area_id]

        # Incident date over 90 days.
        #
        # This was random.uniform(0, 90) — a FLOAT. timedelta(days=90.37) already
        # carries a time of day, so adding `hours=hour` on top of it pushed the
        # timestamp's hour away from the diurnal hour drawn below. The two agreed
        # only 3.8% of the time (chance is 1/24), and because eda_and_clean.py
        # then recomputed `hour` FROM the timestamp, the entire night-window
        # signal — the premise of the whole system — was replaced by noise before
        # the model ever saw it. An integer offset keeps the date and the clock
        # independent.
        day_offset = random.randint(0, 89)
        
        # Diurnal pattern
        hour_mode = random.choices([np.random.normal(14, 3), np.random.normal(23, 2), np.random.normal(2, 1.5)], weights=[0.55, 0.30, 0.15])[0]
        hour = int(np.clip(hour_mode % 24, 0, 23))
        minute = random.randint(0, 59)
        second = random.randint(0, 59)

        incident_time = start_date + datetime.timedelta(days=day_offset, hours=hour, minutes=minute, seconds=second)
        day_of_week = incident_time.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0

        # Exact location with micro-jitter within the area radius (~500m)
        lat_jitter = np.random.normal(0, 0.005)
        lon_jitter = np.random.normal(0, 0.005)
        syn_lat = round(chosen_area["latitude"] + lat_jitter, 6)
        syn_lon = round(chosen_area["longitude"] + lon_jitter, 6)

        # Categorical choices
        tx_type = np.random.choice(tx_types, p=tx_probs)
        cat_type = np.random.choice(cat_types, p=cat_probs)

        # Transaction amount generation
        if tx_type == "AEPS_SPOOF":
            amount = float(np.random.choice([2000, 5000, 10000, 20000, 50000], p=[0.2, 0.35, 0.25, 0.15, 0.05]))
        elif tx_type == "UPI_FRAUD":
            amount = float(round(np.random.lognormal(mean=9.2, sigma=1.0), -2))
        elif cat_type == "INVESTMENT_MULE_SCAM":
            amount = float(round(np.random.lognormal(mean=11.0, sigma=0.8), -2))
        else:
            amount = float(round(np.random.lognormal(mean=9.5, sigma=1.1), -2))

        amount = max(500.0, min(amount, 500000.0))

        # Amount bucket
        if amount < 10000:
            amount_bucket = "LOW_UNDER_10K"
        elif amount <= 50000:
            amount_bucket = "MID_10K_TO_50K"
        elif amount <= 200000:
            amount_bucket = "HIGH_50K_TO_200K"
        else:
            amount_bucket = "CRITICAL_ABOVE_200K"

        # Time to report
        time_to_report_mins = int(np.random.exponential(scale=180)) + 5

        # Historical count of previous incidents in that area
        prev_incident_count = int(np.random.poisson(lam=chosen_area["baseline_risk_score"] * 15))

        # ATM Density of area
        atm_density = chosen_area["atm_pos_density"]

        # Multi-factor risk calculation for target label
        time_risk_factor = 1.6 if (hour >= 21 or hour <= 4) else (1.2 if (hour >= 18 or is_weekend) else 0.7)
        atm_factor = min(2.0, atm_density / 20.0)
        report_delay_factor = min(1.8, time_to_report_mins / 90.0)
        modality_factor = 1.5 if tx_type in ["AEPS_SPOOF", "UPI_FRAUD"] else 0.9
        category_factor = 1.6 if cat_type in ["INVESTMENT_MULE_SCAM", "KYC_EXPIRY_SPOOF"] else 1.0

        # Weighting note: modality and category together used to carry 0.07, which
        # left their cash-out rates within 3 points of each other across the whole
        # dataset — so the Trends screen could not answer "which scam type
        # converts to cash most often", which is a question worth being able to
        # answer. Instant-settlement channels (UPI, AEPS) and mule-account scams
        # are the domain hypothesis for faster cash-out, so they now carry weight
        # proportionate to that claim.
        raw_risk_prob = (
            chosen_area["baseline_risk_score"] * 0.28 +
            (prev_incident_count / 25.0) * 0.18 +
            (time_risk_factor * 0.19) +
            (atm_factor * 0.14) +
            (report_delay_factor * 0.07) +
            ((modality_factor + category_factor) / 3.0 * 0.20)
        )
        
        raw_risk_prob = np.clip(raw_risk_prob + np.random.normal(0, 0.05), 0.02, 0.98)

        # Logistic link rather than a hard cut-off.
        #
        # The previous rule was `raw_risk_prob > 0.58 and rand() < raw_risk_prob`.
        # A hard threshold makes the label a step function of one composite
        # variable, so any model handed that variable reproduces the step instead
        # of learning the drivers behind it - and near the boundary the predicted
        # risk jumps from 0.01 to 0.71 with no gradient in between, which is
        # useless for ranking zones by patrol priority.
        #
        # A logistic link gives a smooth, calibrated relationship: risk rises
        # continuously with the underlying drivers, and the centre is set so the
        # classes are roughly balanced instead of 82% positive.
        cash_out_prob = 1.0 / (1.0 + np.exp(-8.0 * (raw_risk_prob - 0.84)))
        target_cash_out = 1 if np.random.rand() < cash_out_prob else 0

        # ---------------------------------------------------------------------
        # LABEL-GENERATION PROBABILITY — NOT A FEATURE.
        #
        # This is the exact quantity the label above was drawn from. It is kept
        # in the dataset only so the data-generating process is auditable and
        # reproducible. Training on it is target leakage: a model given this
        # column is reading the answer key, not learning from the incident.
        #
        # train.py asserts that no column in LEAKED_COLUMNS reaches the feature
        # matrix. Do not add this to NUMERICAL_FEATURES.
        # ---------------------------------------------------------------------
        label_generation_prob = round(float(raw_risk_prob), 4)

        record = {
            "complaint_id": complaint_ref,
            "timestamp": incident_time.strftime("%Y-%m-%d %H:%M:%S"),
            "area_id": chosen_area_id,
            "area_name": chosen_area["area_name"],
            "district": chosen_area["district"],
            "state": chosen_area["state"],
            "latitude": syn_lat,
            "longitude": syn_lon,
            "transaction_type": tx_type,
            "complaint_category": cat_type,
            "transaction_amount": amount,
            "transaction_amount_bucket": amount_bucket,
            "time_to_report_mins": time_to_report_mins,
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "previous_incident_count": prev_incident_count,
            "area_atm_density": atm_density,
            # Explicit night-window flag. sin_hour/cos_hour alone encode the
            # clock smoothly, but the 21:00-04:00 cash-out window wraps midnight,
            # so in (sin, cos) space it is an arc that a tree needs several
            # splits to approximate - and the diurnal effect, which is the whole
            # premise of the system, came out at under 4 points of risk spread.
            # A boolean the model can split on once fixes that.
            "is_night_window": 1 if (hour >= 21 or hour <= 4) else 0,
            # Area attribute, fixed before the incident happens and available at
            # request time from the areas table. This is the legitimate
            # replacement for the leaked column below.
            "area_baseline_risk_score": chosen_area["baseline_risk_score"],
            "label_generation_prob": label_generation_prob,   # audit only — never a feature
            "target_cash_withdrawal_event": target_cash_out
        }
        records.append(record)

    return records


def main():
    print("=" * 70)
    print("[SIH26184] Generating Synthetic Cybercrime & Risk Intelligence Data")
    print("=" * 70)

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(DOCS_DIR, exist_ok=True)

    # 1. Generate Areas
    print("\n[1/3] Generating 100 Synthetic Surveillance Areas...")
    areas = generate_surveillance_areas()
    areas_df = pd.DataFrame(areas)

    areas_json_path = os.path.join(DATA_DIR, "synthetic_areas.json")
    areas_csv_path = os.path.join(DATA_DIR, "synthetic_areas.csv")

    with open(areas_json_path, "w", encoding="utf-8") as f:
        json.dump(areas, f, indent=2)
    areas_df.to_csv(areas_csv_path, index=False)
    print(f"  [+] Saved {len(areas)} areas to: {areas_json_path}")
    print(f"  [+] Saved areas CSV to: {areas_csv_path}")

    # 2. Generate Complaints
    print("\n[2/3] Generating 15,000 Synthetic Cybercrime Complaint Records...")
    complaints = generate_synthetic_complaints(areas, total_records=15000)
    complaints_df = pd.DataFrame(complaints)

    complaints_csv_path = os.path.join(DATA_DIR, "synthetic_complaints.csv")
    complaints_df.to_csv(complaints_csv_path, index=False)
    print(f"  [+] Saved {len(complaints_df)} records to: {complaints_csv_path}")

    # 3. Summary Statistics
    pos_cases = complaints_df['target_cash_withdrawal_event'].sum()
    pos_rate = (pos_cases / len(complaints_df)) * 100
    print("\n[3/3] Dataset Integrity & Class Distribution:")
    print(f"  * Total Records: {len(complaints_df):,}")
    print(f"  * Cash-Withdrawal Events (Class 1): {pos_cases:,} ({pos_rate:.2f}%)")
    print(f"  * Non-Cash-Out Incidents (Class 0): {len(complaints_df) - pos_cases:,} ({100 - pos_rate:.2f}%)")
    print(f"  * Unique Surveillance Areas: {complaints_df['area_id'].nunique()}")
    print(f"  * Time Span: {complaints_df['timestamp'].min()} to {complaints_df['timestamp'].max()}")
    print(f"  * Mean Fraud Amount: INR {complaints_df['transaction_amount'].mean():,.2f}")
    print(f"  * Missing Values: {complaints_df.isnull().sum().sum()}")

    print("\n[SUCCESS] Phase 2 Data Generation Completed Successfully!")
    return complaints_df, areas_df

if __name__ == "__main__":
    main()
