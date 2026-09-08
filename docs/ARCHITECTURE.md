# System Architecture & Technical Specifications
## SIH26184: Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard

### Overview
The system is built as a three-tier modular decision-support system:
1. **Frontend Tier (Presentation)**: React 18, TypeScript, Tailwind CSS, Leaflet Maps, and Recharts.
2. **Backend API Tier (Application)**: FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM. Public-access — no authentication layer.
3. **Machine Learning & Intelligence Tier (Data & Inference)**: Scikit-learn (Logistic Regression, Random Forest and Gradient Boosting benchmarked; Logistic Regression (Baseline) currently selected on ROC-AUC), counterfactual-ablation attribution, cyclical temporal encoding plus an explicit night-window flag, and a train-time leakage guard.

### Core Guarantees
- **Synthetic Data Compliance**: 100% anonymized/synthetic records with strictly no real-world personally identifiable information.
- **Probabilistic Risk Estimates**: Outputs represent probabilistic decision-support scores ($0.0 \to 1.0$) rather than deterministic accusations.
- **Role-Based Access Control**:
  - `Admin`: User management, audit logs, model governance.
  - `Investigator`: Prediction queries, surveillance area alerts, spatial drills.
  - `Analyst`: Dashboard KPIs, trend analytics, ML performance evaluations.
