# Exploratory Data Analysis (EDA) & Feature Importance Report
## SIH26184: Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard

### 1. Executive Summary
- **Dataset Size**: 15,000 verified synthetic incidents across 100 surveillance grid zones.
- **Cash-Out Events Identified (Positive Class)**: 8,632 (57.55%).
- **Non-Cash-Out Incidents (Negative Class)**: 6,368 (42.45%).
- **Total Fraud Volume**: INR 361,199,900.00

---

### 2. Key Behavioral & Predictive Patterns Discovered

#### A. Temporal Surge Patterns (The "Night Cash-Out Window")
- **Scam Activity**: Daytime complaints peak between 11:00 AM and 4:00 PM (phishing links, fake call center scams).
- **Cash Withdrawal Activity**: Severe surge in physical ATM cash-outs occurring between **21:00 (9:00 PM) and 04:00 (4:00 AM)**.
- **Why this matters for ML**: Cyclical time encoding (`sin_hour`, `cos_hour`) gives the model high discriminatory power to alert patrol teams during these vulnerable night-time windows.

#### B. Modality Correlation with Physical Cash Withdrawal
- **AEPS & UPI Fraud**: Showed the highest correlation with physical ATM cash withdrawals (57.85% and 59.55% cash-out likelihood respectively).
- **Net Banking Phishing**: Lower physical cash-out rate as fraudsters often route funds across multiple nested digital wallets rather than direct ATM withdrawal.

#### C. Spatial & Density Influence
- Areas with ATM density $\ge 35$ endpoints/grid showed an elevated cash-out probability.
- Top surveillance areas identified: `AREA-FI-140` (Financial-Hub-District-C Industrial Cyber Cluster Sector-15) with an average calculated risk score of `0.945`.

---

### 3. Feature Selection & Utility Matrix

| Feature Name | Feature Type | Importance Rationale |
|---|---|---|
| `sin_hour`, `cos_hour` | Continuous (Cyclical) | Encodes 24-hour diurnal cycle without boundary discontinuity between 23:59 and 00:00. |
| `sin_day`, `cos_day` | Continuous (Cyclical) | Encodes weekly weekend/weekday ATM liquidity patterns. |
| `previous_incident_count` | Discrete Numerical | Reflects area-level crime momentum and active fraud cluster velocity. |
| `area_atm_density` | Discrete Numerical | Measures physical opportunity for rapid cash liquidation. |
| `time_to_report_mins` | Continuous Numerical | Victim reporting latency directly determines the active window before mule accounts are blocked. |
| `transaction_type` | Categorical (One-Hot) | Distinct criminal modus operandi per transaction channel. |
| `complaint_category` | Categorical (One-Hot) | Scams targeting elderly/job seekers have different cash-out urgency than corporate spear phishing. |
| `log_transaction_amount` | Continuous (Log Scale) | Stabilizes heavy-tailed fraud amount distribution. |
