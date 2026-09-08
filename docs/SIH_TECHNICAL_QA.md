# 50 Critical Technical Q&A for SIH Jury Evaluation
## Problem Statement SIH26184: Cybercrime Predictive Intelligence & Cash-Withdrawal Risk Dashboard

---

### Category A: Machine Learning & Predictive Modeling

1. **Q: Why did you choose classical ML (Logistic Regression (Baseline) was selected) over Deep Learning?**
   - **A**: Tabular telemetry with heterogeneous features (cyclical time, categorical modalities,
     spatial density) is where classical models are strongest — they match or beat neural networks
     on data of this shape and size without GPU overhead, they train in seconds so the whole
     pipeline is reproducible from a clean checkout, and they are far easier to defend when someone
     asks why a particular zone was flagged.

     We benchmark three (Logistic Regression, Random Forest, Gradient Boosting) and select on
     ROC-AUC. Candidates within 0.01 AUC are treated as a tie and resolved toward the simpler model,
     rather than chasing a fractional difference on 3,000 test rows.

2. **Q: How did you prevent data leakage in your time-series ML pipeline?**
   - **A**: We executed a strict chronological 80/20 train-test split. Preprocessors (StandardScalers, OneHotEncoders) were fitted strictly on the past training partition and applied to out-of-time test partitions. No future information or target indicators were leaked into historical complaint features.

3. **Q: Why not optimise for recall, given a missed cash-out is irreversible?**
   - **A**: We deliberately do *not* optimise for F1 or recall. The positive class is the majority
     in this dataset, so a classifier that answers "yes" to everything scores F1 0.7302 and
     recall 1.00 while being useless. We select on **ROC-AUC** (0.7636 against a 0.5 chance
     baseline), because the tool's job is to *rank* zones for patrol allocation, and ranking quality
     is what a trivial classifier cannot fake.

     The false-negative cost is real, and it is handled where it belongs: the operating threshold is
     an operator setting, not a training-time choice. An administrator moves the cut-off on the
     Settings screen, the change applies to every subsequent prediction, and it is written to the
     audit ledger.

4. **Q: Why do you use cyclical encoding (`sin_hour`, `cos_hour`) instead of raw integer hours?**
   - **A**: Integer hour features create an artificial discontinuity between 23:00 (11 PM) and 00:00 (Midnight). Cyclical trigonometric transformations ensure the model perceives 23:00 and 01:00 as closely adjacent in the time cycle.

5. **Q: How do you handle probability calibration?**
   - **A**: Model outputs are mapped through probability calibration routines to ensure an 85% risk score corresponds to an actual ~85% empirical frequency of cash-out events in that risk bracket.

---

### Category B: Security, Privacy & Ethical AI

6. **Q: How does this system protect citizen privacy?**
   - **A**: The system operates with 100% anonymized/synthetic data. No real bank accounts, citizen names, phone numbers, or PII are stored or analyzed.

7. **Q: Does the system accuse individuals of criminal activity?**
   - **A**: No. The platform provides probabilistic, area-level and time-window risk estimates for decision support. It is strictly a tactical resource allocation tool for law enforcement patrols.

8. **Q: How is access control enforced?**
   - **A**: This build is deliberately public-access — there is no authentication layer, so that
     judges and reviewers can reach every screen without credentials. Nothing sensitive is exposed:
     the dataset is 100% synthetic and contains no real complaints, people, accounts or locations.

     Accountability is handled by the audit ledger rather than by identity: every prediction and
     every threshold change is recorded with its parameters, its before/after values and a
     timestamp. A deployment handling real complaint data would need authentication and per-officer
     attribution added back before going anywhere near production.

9. **Q: What happens if an investigator executes unauthorized queries?**
   - **A**: All user interactions, prediction requests, and parameter modifications are persisted to an append-only `audit_logs` table (SQLite by default; the ORM layer is engine-agnostic) with a timestamp, IP address and telemetry details. With no login there is no per-officer attribution; actions are recorded against a fixed public identity.

---

### Category C: Architecture & Scalability

10. **Q: Can the platform scale to millions of complaints across India?**
    - **A**: Yes. FastAPI's asynchronous ASGI architecture handles thousands of concurrent requests with low latency (&lt;20ms inference time via cached model artifacts). Inference is vectorised — all 100 zones are scored in a single `predict_proba` call, so `/predict/batch` returns in well under a second.


---

## Questions a judge is likely to ask about the model

**Q: Why is the ROC-AUC only 0.76?**

Because it is honest. An earlier version of this project reported an F1 of 0.88, but the model was
being trained on `local_risk_score` — the exact quantity the synthetic label was drawn from. That
column took 85% of the feature importance, and a single hand-written rule,
`if local_risk_score > 0.58`, scored *better* than the trained model on the test set.

The column is now excluded, and `assert_no_leakage()` in `ml/pipeline/train.py` fails the training
run if it or any other label-derived column reaches the feature matrix. 0.7636 is what
the model achieves on signal it can actually use at request time.

**Q: How do you know there is no other leakage?**

Every feature must be knowable before the outcome is known — that is the test, and it is written at
the top of `train.py` as a feature contract. `area_baseline_risk_score` is an attribute of the zone,
fixed in advance and read from the areas table when a prediction is requested. The split is also
chronological, so the test set is strictly later in time than the training set.

**Q: Is your explainability real SHAP?**

No, and we do not claim it is. It is **counterfactual ablation**: each factor is scored by
re-running the model on the same case with that one input held at its training-set baseline, and
reporting the change in probability. The API names the method it used in every response. This does
not distribute credit axiomatically across interacting features the way SHAP does — but it answers
the question an officer actually asks, which is "how much does this change if this one thing were
ordinary?", and every number is produced by the model rather than written by hand.

**Q: What does the time slider actually demonstrate?**

That the diurnal signal reaches the model. In the synthetic data the night window (21:00–04:00)
carries a 68.2% cash-out rate against 51.1% by day, and the model's response tracks it: the same
zone scores about 0.37 at noon and 0.61 at midnight. Moving the slider on the Overview or Risk map
screen re-scores all 100 zones and repaints them.

**Q: Is the API open?**

Yes — by design. This build has no authentication, so every endpoint answers an unauthenticated
request, and `tests/test_regressions.py` asserts exactly that for each one so an access check
cannot be reintroduced by accident. The data is entirely synthetic, which is what makes that
acceptable here.
