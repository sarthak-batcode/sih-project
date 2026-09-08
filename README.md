# 🛡️ SIH26184: Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue.svg?style=for-the-badge&logo=shield)](https://sih.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_TypeScript-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg?style=for-the-badge&logo=scikitlearn)](https://scikit-learn.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57.svg?style=for-the-badge&logo=sqlite)](https://www.sqlite.org)

---

## 📌 Executive Summary

**SIH Problem Statement SIH26184**: Law enforcement and cybercrime investigation units receive thousands of financial fraud complaints daily. A critical bottleneck in cyber investigation is the **rapid cash-out phase**, where fraudulent funds transferred through compromised UPI/mule accounts are physically withdrawn at high-density ATMs and cash points within a critical time window before accounts are frozen.

This platform provides **decision-support predictive intelligence** that analyzes historical cybercrime complaint patterns using synthetic/anonymized data to forecast high-risk geographic areas and time windows for potential cash-withdrawal activity, enabling proactive police patrolling and targeted surveillance.

---

## 🔒 Safety, Privacy & Ethical AI Guarantees
- **Zero Real PII**: 100% synthetic, statistically modeled demo data. No real personal names, real bank account numbers, or real phone numbers are stored or processed.
- **Probabilistic Risk Estimates Only**: Outputs are decision-support probability scores ($0.0 \to 1.0$) and confidence intervals—never deterministic accusations.
- **Human-in-the-Loop & Auditability**: Every risk query, scenario simulation, and model execution is recorded in an append-only audit ledger with user attribution. The API exposes no delete or update path for those rows; it is not a cryptographic hash chain and is not described as one.

---

## 📊 Model Performance

Selected on **ROC-AUC**, not F1. The positive class is the majority, so F1 rewards a classifier
that answers "yes" to everything — the trivial baseline is shown here so the comparison is
explicit rather than flattering.

| | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Always predict cash-out (trivial) | 0.5737 | 0.5737 | 1.0000 | 0.7291 | 0.5000 |
| **Logistic Regression (Baseline) (selected)** | **0.6643** | **0.7327** | **0.6531** | **0.6906** | **0.7257** |

Evaluated on a strictly out-of-time test split (the most recent 20% of incidents by timestamp).

### Leakage control

`label_generation_prob` is the exact quantity the synthetic label is drawn from. It is kept in the
dataset so the data-generating process stays auditable, and it is **excluded from the feature
matrix** — `ml/pipeline/train.py` lists it in `LEAKED_COLUMNS` and `assert_no_leakage()` fails the
training run if it, or any other label-derived column, reaches the model.

The scores above are therefore lower than a leaking model would report, and they reflect signal the
model can actually use at request time. Every feature is knowable before the outcome is known:

```
previous_incident_count  area_atm_density        time_to_report_mins   transaction_amount
sin_hour  cos_hour  sin_day  cos_day  is_night_window  is_weekend
area_baseline_risk_score        transaction_type  complaint_category  transaction_amount_bucket
```

### Explainability

Per-prediction attribution is **counterfactual ablation**: each factor is scored by re-running the
model on the same case with that one input held at its training-set baseline, and reporting the
change in probability. The figures come from the model for that specific case — they are not
fixed weights. This is not SHAP; it does not distribute credit axiomatically across interacting
features, and the API labels the method it used.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │ Synthetic Complaints & │
                                  │ Area Density Dataset   │
                                  └───────────┬────────────┘
                                              ▼
                                  ┌────────────────────────┐
                                  │ Feature Engineering &  │
                                  │ Temporal Preprocessing │
                                  └───────────┬────────────┘
                                              ▼
                                  ┌────────────────────────┐
                                  │ Predictive ML Engine   │
                                  │ (leak-guarded, ROC-AUC)│
                                  └───────────┬────────────┘
                                              ▼
                                  ┌────────────────────────┐
                                  │ FastAPI REST Backend   │
                                  │ (public + audit trail) │
                                  └───────────┬────────────┘
                                              ▼
                                  ┌────────────────────────┐
                                  │ National Cyber Defense │
                                  │ Interactive Dashboard  │
                                  └────────────────────────┘
```

---

## 🚀 Technology Stack

| Tier | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet Maps, Recharts |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy 2.0 |
| **Database** | SQLite via SQLAlchemy 2.0 ORM (schema created at startup; no migration tool) |
| **Machine Learning** | Scikit-Learn (Logistic Regression, Random Forest, Gradient Boosting), Pandas, NumPy, Joblib |
| **Testing** | Pytest, HTTPX, TypeScript Compiler (`tsc`) |

---

## 📁 Repository Structure

```
├── backend/            # FastAPI application, REST endpoints, schemas, services
├── frontend/           # React + TypeScript + Tailwind intelligence dashboard
├── ml/                 # Synthetic generator, feature pipeline, training & models
├── database/           # Schema definitions, seed scripts & migrations
├── data/               # Synthetic datasets and lookup tables
├── docs/               # Architecture diagrams, pitch deck, and demo scripts
├── tests/              # End-to-end and unit test suites
├── .env.example        # Environment variable template
├── requirements.txt    # Python dependencies
└── README.md           # Project documentation
```

---

## ⚙️ Quick Start Installation & Local Execution

### 1. Backend & ML Setup
```powershell
# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Build the dataset, then the model (run in this order)
python ml/data_generator/generate_synthetic_data.py
python ml/pipeline/eda_and_clean.py
python ml/pipeline/train.py

# Seed the database with demo users, 100 zones and sample complaints
python database/seed_data.py

# Start FastAPI backend
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS or Linux, use `python3 -m venv .venv && source .venv/bin/activate` instead of the
PowerShell activation above.

### 3. Offline demo (no install required)

```powershell
python demo/build_demo.py
```

Produces `demo/cash-out-risk-demo.html` — a single self-contained file that runs the trained model
in the browser with no server, no dependencies and no network. Useful as a fallback if the venv,
`npm install` or the venue Wi-Fi fails on the day. See `demo/README.md`.

### 4. Tests

```powershell
python -m pytest -q
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

The application will be accessible at:
- **Frontend Dashboard**: `http://localhost:5173`
- **Interactive Swagger API Docs**: `http://localhost:8000/docs`

---

## 🔓 Access

The application is **public-access**: there is no login, no user accounts and no roles. Opening the
site lands directly on the dashboard and every screen — including the audit log and the threshold
controls — is reachable without credentials.

The audit ledger still records what happened and when; with no signed-in officer, actions are
attributed to `public@cyberintel.gov.in`.

---

---

## ✅ Verification

```powershell
python -m pytest -q                       # 41 tests, including regression tests
curl http://localhost:8000/api/v1/health/model   # what model is loaded, and what was excluded
curl http://127.0.0.1:8000/api/v1/dashboard/summary   # 200, no credentials needed
```

---

## ⚖️ Disclaimer
*This software is developed strictly as an academic and technological prototype for the Smart India Hackathon. All data generated and utilized is synthetic.*
