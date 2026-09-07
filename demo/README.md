# Offline demo

`cash-out-risk-demo.html` is the whole dashboard in one file. Open it in any browser —
no Python, no Node, no server, no network.

## Why it exists

Demos fail for boring reasons: a virtualenv that will not activate on an unfamiliar laptop,
an `npm install` that stalls, a hall with no Wi-Fi, a port already in use. This file has none
of those failure modes. If the full stack will not come up, the demo still runs.

## It is the real model, not a mock-up

The selected classifier is a logistic regression, so it serialises to a scaler, a one-hot
encoder, 25 coefficients and an intercept. `build_demo.py` exports those from
`ml/saved_models/best_model.joblib` and inlines them into the page; scoring in JavaScript is
then a dot product and a sigmoid.

A score shown here matches what `POST /api/v1/predict` returns for the same inputs to four
decimal places — `tests/test_regressions.py` is where the served model is checked, and the
parity check is documented in the "About this demo" tab.

The per-prediction attribution uses the same counterfactual ablation as `ml/pipeline/predict.py`.

## What it leaves out

Authentication, RBAC, the audit ledger, the SQLite database, operator-configurable thresholds
and the governance screens are all part of the full stack and are not reproduced here. There is
no login because there is nothing to protect: the data is synthetic and the file is read-only.

## Rebuilding

```bash
python ml/pipeline/train.py     # if the model has changed
python demo/build_demo.py
```

The build script fails loudly if the selected model is a tree ensemble rather than a linear
model — that would need a different export format, and silently shipping a stale demo would be
worse than not building one.
