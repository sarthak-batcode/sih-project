# Synthetic Cybercrime & Cash-Withdrawal Risk Dataset Dictionary
## SIH26184: Predictive Intelligence Platform

> [!NOTE]
> All records in this dataset are 100% synthetically generated for research, testing, and prototype demonstration in accordance with SIH 2026 guidelines. No real bank accounts, PAN/Aadhaar cards, telephone numbers, or citizen identities are used.

---

### 1. Surveillance Areas Schema (`data/synthetic_areas.json`, `data/synthetic_areas.csv`)

| Field Name | Type | Description | Example Values |
|---|---|---|---|
| `area_id` | String | Unique synthetic identifier for the geographic surveillance grid zone. | `AREA-CA-101`, `AREA-FI-126` |
| `area_name` | String | Human-readable name of the surveillance sector. | `Capital-Metro-District-A Commercial ATM Hub Sector-1` |
| `district` | String | Synthetic district jurisdiction. | `Capital-Metro-District-A` |
| `state` | String | Administrative state cluster. | `State-National-Capital`, `State-West-Coast` |
| `region` | String | High-level national regional node. | `Capital-Metro`, `Financial-Hub`, `Tech-Corridor` |
| `zone_type` | String | Characterization of urban/economic activity. | `Commercial ATM Hub`, `High-Density Transit Node` |
| `latitude` | Float | Approximate centroid latitude coordinate (WGS84). | `28.613900` |
| `longitude` | Float | Approximate centroid longitude coordinate (WGS84). | `77.209000` |
| `radius_km` | Float | Operational radius of the zone in kilometers. | `3.2` |
| `atm_pos_density` | Integer | Total count of banking ATMs and POS cash-out endpoints within the zone. | `48` |
| `baseline_risk_score`| Float | Historical risk baseline index ($0.0 \to 1.0$) based on density & prior cases. | `0.785` |
| `risk_category` | String | Categorical risk grade. | `HIGH` ($\ge 0.65$), `MEDIUM` ($0.40 - 0.64$), `LOW` ($< 0.40$) |
| `active_surveillance`| Boolean| Flag indicating if the zone is prioritized for real-time risk alerts. | `True` |

---

### 2. Complaints & Events Dataset Schema (`data/synthetic_complaints.csv`)

| Field Name | Type | Description | Analytical Value |
|---|---|---|---|
| `complaint_id` | String | Unique synthetic National Cybercrime Reporting Portal reference. | `NCRP-2026-SYN-000001` |
| `timestamp` | Datetime | Date and time when the fraudulent transaction was executed (UTC+5:30). | Temporal pattern analysis |
| `area_id` | String | Foreign key mapping to the surveillance area grid. | Geospatial correlation |
| `area_name` | String | Human-readable name of the corresponding zone. | UI display and report generation |
| `district` | String | District administrative boundary. | Jurisdictional drill-down |
| `state` | String | State administrative boundary. | Regional risk comparison |
| `latitude` | Float | Synthetic incident GPS latitude with micro-jitter within the area radius. | Precise hotspot heatmap clustering |
| `longitude` | Float | Synthetic incident GPS longitude with micro-jitter. | Precise hotspot heatmap clustering |
| `transaction_type` | String | Modality used for the initial fraudulent transfer. | Modality risk attribution: `UPI_FRAUD`, `AEPS_SPOOF`, `SIM_CLONE_FRAUD`, `CARD_SKIMMING`, `NET_BANKING_PHISHING` |
| `complaint_category`| String | Nature of the cyber scam. | Behavioral pattern modeling: `INVESTMENT_MULE_SCAM`, `PHISHING_PORTAL`, `JOB_OFFER_FRAUD`, `KYC_EXPIRY_SPOOF`, `SEXTORTION_BLACKMAIL` |
| `transaction_amount`| Float | Total defrauded amount in Indian Rupees (INR). | Financial severity modeling |
| `transaction_amount_bucket`| String | Stratified amount category. | `LOW_UNDER_10K`, `MID_10K_TO_50K`, `HIGH_50K_TO_200K`, `CRITICAL_ABOVE_200K` |
| `time_to_report_mins`| Integer | Delay in minutes before the complaint was lodged by victim. | Greater delay provides fraudsters a larger window for physical cash withdrawal |
| `hour` | Integer | Hour of the day (0 to 23). | Diurnal risk cycle modeling (late night peaks) |
| `day_of_week` | Integer | Day of the week (0 = Monday, 6 = Sunday). | Weekly cash-out patterns |
| `is_weekend` | Integer | Binary flag (1 if Saturday/Sunday, 0 otherwise). | Weekend ATM liquidity pattern |
| `previous_incident_count`| Integer | Rolling count of incidents reported in that area in the preceding 7 days. | Velocity / area surge indicator |
| `area_atm_density` | Integer | Density of cash points in the target zone. | High density = greater cash-out feasibility |
| `area_baseline_risk_score` | Float | The zone's standing risk, fixed before the incident. | **Model feature.** Available at request time from the areas table. |
| `label_generation_prob` | Float | The probability the label was drawn from. | **NOT a feature — target leakage.** Retained so the data-generating process is auditable. Listed in `LEAKED_COLUMNS`; `train.py` fails if it reaches the model. |
| `is_night_window` | Int (0/1) | 1 when the incident hour is 21:00–04:00. | **Model feature.** The window wraps midnight, which sin/cos encode poorly. |
| `target_cash_withdrawal_event` | Integer (0/1) | **Target Variable**: 1 if a fraudulent cash withdrawal was attempted/executed in the time window, 0 otherwise. | Ground truth label for ML training |
