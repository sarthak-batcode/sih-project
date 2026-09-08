# 5-Minute SIH Demonstration Script (Grand Finale Live Demo)
## Problem Statement SIH26184: Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard

---

### ⏱️ Timeline & Speaker Notes

#### Minute 0:00 – 0:45 | Problem Context & Innovation Hook
- **Speaker 1 (Lead)**: 
  > *"Respected Jury, when a cybercrime occurs—whether through phishing or investment scams—funds move rapidly through mule accounts. The critical bottleneck for law enforcement is the **physical cash-out phase**, where criminals withdraw liquid cash from ATMs before bank freeze notices take effect. Our platform, **SIH26184 Cybercrime Predictive Intelligence**, shifts cyber defense from reactive complaint logging to **proactive geospatial patrol forecasting**."*

#### Minute 0:45 – 1:45 | Executive Command Dashboard & Threat Feed
- **Speaker 2 (Frontend / Analytics)**:
  > *"Here on the **Executive Command Center**, we monitor 15,000 synthetic complaint events across 100 economic surveillance zones. Notice the **24-Hour Diurnal Surge Chart**: while phishing calls peak during daytime business hours, physical ATM cash-outs spike drastically between **21:00 and 03:00 IST**. The Live Threat Feed automatically dispatches prioritized alerts to regional police control rooms."*

#### Minute 1:45 – 2:45 | Interactive Geospatial Risk Map & Hotspot Drilldown
- **Speaker 2**:
  > *"Navigating to the **Geospatial Risk Map**, we visualize all 100 geofenced surveillance zones color-coded by composite threat index. Clicking on **Capital-Metro Sector-1 (High Risk - 88.5%)**, we immediately see high ATM terminal density (48 ATMs) coupled with an influx of AEPS spoofing complaints. The system automatically recommends an active **patrol window of 21:00 to 02:00 IST** to intercept mule operators."*

#### Minute 2:45 – 3:45 | Predictive Studio & Explainable AI (XAI)
- **Speaker 3 (ML Engineer)**:
  > *"In the **Predictions** screen we can score a scenario: a 23:00 incident, ₹45,000 via AEPS spoofing, 180 minutes before it was reported. The model returns a probability, and beside it the factors that moved it — each one produced by re-running the model on this same case with that one input held at its dataset norm. So 'night cash-out window, +10.8%' means exactly that: if this had happened at a normal hour, the estimate would fall by 10.8 points."*

  > **Do not read fixed numbers from this script.** The figures move with the seed and the trained
  > model. Run the scenario live and read what the screen returns — the point being demonstrated is
  > that the attribution is computed, not written down in advance.

#### Minute 3:45 – 4:30 | Model Governance, Ethical AI & Security Audit
- **Speaker 1 / 3**:
  > *"On **Model & governance**, the first row of the benchmark table is a trivial classifier that
  > answers 'yes' to everything. It scores F1 0.73 — which is why we do not select on F1.
  > We select on ROC-AUC, where that trivial model scores 0.5 and ours scores 0.7636.
  > The panel above the table names the column we excluded as target leakage, and the training run
  > fails if it ever comes back. Every prediction and threshold change is written to the
  > audit ledger."*

  > If a judge asks why the numbers are not higher: because the earlier ones were not real. The
  > model was being trained on a column the label was computed from. `CHANGES.md` has the
  > measurements, including the one-line rule that beat the leaking model.

#### Minute 4:30 – 5:00 | Conclusion & Impact
- **Speaker 1**:
  > *"By integrating time-series ML, geospatial intelligence, and Explainable AI, SIH26184 empowers cybercrime units across India to intercept fraudulent withdrawals before money vanishes from the banking system. Thank you!"*
