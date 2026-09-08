# What changed, and why

> **Later change — authentication removed.** Section 7 below describes fixing the broken
> authentication system. That system has since been removed entirely: this build is public-access
> by design, so judges and reviewers can reach every screen without credentials. Section 7 is kept
> as the record of what was wrong with the auth layer while it existed. See `AUTH_REMOVAL.md` for
> what was taken out.

A review of the September 2026 codebase found defects at three levels: the model was learning
from the answer key, the API had no working authentication, and several screens showed numbers
that were not computed from anything. This is the full list, with the reasoning, so the changes
can be defended rather than just described.

---

## 1. The model was trained on the label

**Was.** `generate_synthetic_data.py` computed `raw_risk_prob`, drew the label from it, and then
saved that same number to the dataset as `local_risk_score`. `train.py` listed
`local_risk_score` in `NUMERICAL_FEATURES`.

Measured on the original data, same 80/20 chronological split:

```
correlation(local_risk_score, target)          0.5385

always predict "yes"             acc 0.7217   f1 0.8383
one line: local_risk_score>0.58  acc 0.8276   f1 0.8938   <- beat the trained model
Gradient Boosting (shipped)      acc 0.8127   f1 0.8840   auc 0.8057
same model, feature removed      acc 0.7690   f1 0.8521   auc 0.7633
```

A single `if` statement outscored the pipeline, and the feature took 85.3% of all importance.

**Now.** The column is renamed `label_generation_prob`, kept in the dataset so the
data-generating process stays auditable, and listed in `LEAKED_COLUMNS`.
`assert_no_leakage()` fails the training run if it or any other label-derived column reaches
the feature matrix. The legitimate replacement is `area_baseline_risk_score` — an attribute of
the *zone*, fixed before the incident and read from the areas table at request time.

---

## 2. At serving time that feature was fed a different variable

**Was.** `predictions.py` passed the area's `baseline_risk_score` into the slot the model had
learned as `local_risk_score`. They are not the same quantity — one is a single term of the
other, weighted 0.30 — and the distributions were three standard deviations apart:

```
training saw   local_risk_score      mean 0.778  sd 0.145
serving sent   baseline_risk_score   mean 0.339  sd 0.120

clears the model's 0.58 decision point:  89.8% of training rows,  4.0% of areas
```

Running the shipped model as `/predict/batch` called it, at 23:00 — the peak cash-out hour —
**96 of 100 zones came back LOW**, and the transition from baseline 0.655 to 0.539 dropped the
score from 0.709 to 0.007. A cliff, not a gradient.

**Now.** Train and serve use the same column. Output is a real distribution, and it responds to
the hour: 3 HIGH zones at 14:00, 22 HIGH and 4 CRITICAL at 23:00.

---

## 3. The hard label threshold was replaced with a logistic link

**Was.** `target = 1 if (raw_risk_prob > 0.58 and rand() < raw_risk_prob)`. A hard cut-off makes
the label a step function of one composite variable, which is what taught the model to
reproduce a threshold instead of learning the drivers behind it. It also produced an 82%
positive class, on which F1 is close to meaningless.

**Now.** `cash_out_prob = sigmoid(8 * (raw_risk_prob - 0.80))`, then a Bernoulli draw. Risk rises
smoothly with the underlying drivers and the classes are roughly balanced (58% positive).

---

## 4. The timestamps did not match the hour column

**Was.** `day_offset = random.uniform(0, 90)` — a float. `timedelta(days=90.37)` already carries a
time of day, and `hours=hour` was then added on top, so the timestamp's hour drifted away from
the diurnal hour actually drawn. They agreed on **3.8%** of rows (chance is 1/24). Then
`eda_and_clean.py` recomputed `df['hour']` *from the timestamp*, overwriting the correct value.

The night-window signal — the premise of the entire system — was replaced by noise before the
model ever saw it. The hourly cash-out rate came out flat: 57.5% in the night window versus
57.5% in the daytime.

**Now.** An integer day offset keeps the date and the clock independent, and the EDA step
verifies the two agree instead of silently overwriting one. The signal is back:

```
night window (21:00-04:00)  68.2%
daytime      (05:00-20:00)  51.1%     -> +17.1 points
```

Model response over the day now runs 0.374 at noon to 0.606 at midnight.

---

## 5. `is_night_window` added as an explicit feature

`sin_hour`/`cos_hour` encode the clock smoothly, but the 21:00–04:00 window wraps midnight, so
in (sin, cos) space it is an arc a tree needs several splits to approximate. With cyclical
encodings alone the diurnal effect came out at under 4 points of predicted risk. A boolean the
model can split on once carries it properly. `is_weekend` was already in the data and is now a
feature too.

---

## 6. Model selection moved from F1 to ROC-AUC

**Was.** Selection on F1 alone picked the Gradient Boosting model, which had recall 0.9903 —
it predicted "cash-out" for 89.5% of a test set that was 72% positive — and the *worst* ROC-AUC
of the three candidates. F1 rewards answering yes to everything when the positive class is the
majority.

**Now.** Selection is on ROC-AUC, which measures how well the model *ranks* zones — the thing a
patrol-prioritisation tool actually needs, and the thing a trivial classifier cannot game.
Models within 0.01 AUC are treated as a tie and resolved toward the simpler candidate, rather
than chasing a 0.0004 difference on 3,000 rows. The trivial always-yes baseline is computed and
reported alongside the models, in the console output, in `model_metadata.json` and in the README.

Feature importances are also normalised now: a linear model's `|coefficients|` do not sum to 1,
and reporting them raw produced a governance chart whose bars summed to well over 100%.

---

## 7. Authentication did not exist

**Was, server side.** `get_current_user()` returned the demo admin when the `Authorization`
header was missing. Every protected endpoint answered an unauthenticated `curl` with full admin
rights.

**Was, client side.** `AuthContext` fabricated a demo admin session when `localStorage` was
empty, and `login()` caught API failures and minted a fake token — so the login screen could
never fail, and in practice was never reached. `App.tsx` had no route guard; the Audit screen
was hidden from the sidebar but reachable by typing the URL.

**Now.** Both fallbacks are gone. Anonymous requests get 401. A stored token is verified against
`/auth/me` before it is trusted. A `Protected` route guard checks authentication and role, and
remembers where the user was headed. A 401 on any request drops the session rather than leaving
a half-signed-in UI. The login page keeps one-click demo accounts — they perform real logins, so
they fail visibly if the backend is down.

`admin` still satisfies every role check. That is a deliberate superuser design, now documented;
demonstrate RBAC with the analyst account.

---

## 8. Screens showed numbers that were not computed

- **`/dashboard/summary`** substituted invented counts when the database was empty — 32 HIGH
  zones, when the data actually had 4. The risk map read the real file, so Overview and Risk map
  contradicted each other in the same demo. The fallbacks are gone; an unseeded database returns
  409 with the command to fix it.

- **The alert feed** was three fixed dictionaries with timestamps like `"10 mins ago"` that never
  changed. It is now derived from live model output at the current hour, with real attribution
  on each alert, and it respects the operator's alert threshold.

- **`/analytics/trends`** returned `regional_risk_matrix` and `amount_bucket_distribution` as
  Python literals. Both are now `GROUP BY` queries over the database.

- **The area risk distribution** was unusable: `Beta(2, 4) * risk_mult + 0.15` has a mean near
  0.35 against a 0.65 HIGH cut-off, so 75% of zones were LOW and only 3–4 were HIGH. Now
  `Beta(2.2, 2.2) * risk_mult * 1.05 + 0.20`, giving 19 HIGH / 53 MEDIUM / 28 LOW.

---

## 9. The explainability was hand-written

**Was.** `contributing_factors` were string literals — `"+28%"` for night hours, `"+22%"` for
high ATM density — chosen by hand and unrelated to what the model weighted for that input. The
README called it "Explainable AI (XAI) attribution".

**Now.** Counterfactual ablation: each factor is scored by re-running the model on the same case
with that one input held at its training-set baseline, and reporting the change in probability.
Baselines are written at train time into `model_metadata.json`. The response names the method
(`attribution_method`), and the README is explicit that this is not SHAP.

---

## 10. Two component bugs

- **`StatCard.tsx`** bundled border, hover-shadow, text and background classes into one
  `glowMap` string and spread it onto *both* the card and the inner icon `div`. The card got
  `bg-cyan-500/10` on top of `cyber-card`'s own background — which one won depended on Tailwind's
  generated stylesheet order, not the order they were written — and the icon inherited
  `hover:shadow-*` classes that did nothing. Surface, icon chip and emphasis are now separate.

- **`RiskBadge.tsx`** used `animate-ping` on its only dot. That animation scales to 2× and fades
  to zero; it is designed for an absolutely positioned duplicate behind a solid dot. Applied
  directly, the CRITICAL indicator spent most of each cycle invisible — the most severe state was
  the one that flickered out.

---

## 11. Two endpoints were slower than their own clients' timeouts

`/predict/batch` took **43.2 seconds** for 100 zones; `/dashboard/summary` took 10.1s against a
10s axios timeout. Both scored rows one at a time — a fresh DataFrame, `ColumnTransformer.transform`
and `predict_proba` per row — and the new attribution added eight more such calls per prediction.

`score_rows()` now stacks rows into one frame and does a single transform and a single
`predict_proba`. The counterfactuals for an explanation are scored together as one batch, and the
alert feed explains only the handful of zones that make the feed.

```
/predict/batch       43.2s  ->  0.06s
/dashboard/summary   10.1s  ->  0.58s
```

---

## 12. `transaction_amount_bucket` could contradict the amount

It was a free-standing request field, so a caller could send `transaction_amount=250000` with
`transaction_amount_bucket="MID_10K_TO_50K"` and the model would score the contradiction. The
band is now derived from the amount server-side, using the same boundaries as the generator. The
request field is retained, marked deprecated, and ignored.

---

## 13. Interface

The theme was the right one; emphasis was the problem. Four `shadow-glow-*` variants were applied
to every stat card, every risk badge and the active nav item, so a 0.27 LOW zone drew the eye as
hard as a 0.91 CRITICAL one. Specifically:

- **One card class**, with emphasis as a modifier used only for CRITICAL. `cyber-card-glow` and
  `cyber-card-danger` are gone — when emphasis is a separate *surface*, it spreads.
- **Accent split from severity.** Cyan is interactive-only (nav, links, focus, primary buttons);
  a four-step ramp carries severity; a third neutral blue carries non-semantic data series. Cyan
  previously meant "clickable" *and* "complaint volume", so the eye could not learn it.
- **Contrast.** `text-slate-500` on `#060913` is about 4.0:1, under the 4.5:1 minimum, at 10–11px.
  Two text greys now: `#A9BAD1` for sentences (7.9:1) and `#6F819A` for short mono labels.
- **Uppercase** reserved for one role — short mono labels — instead of every panel title, badge
  and nav item.
- **The diurnal chart** plotted `cash_out_rate` (0–100) and `total_complaints` (180–1,100) as two
  areas on a *single* Y axis, which flattened the risk series against the baseline. Risk now owns
  a 0–100 left axis as the foreground mark; volume sits behind on its own labelled right axis,
  with the night window shaded.
- **KPI hierarchy.** One hero tile answering "what do I do now", three supporting — model F1 no
  longer competes for attention with the active alert count.
- **Labels** in the words an officer would use: "Risk map", not "Geospatial Risk Map".
- **Typography.** IBM Plex Sans reads better than Inter at the 11–13px sizes this interface
  lives at.

---

## 14. Settings were wired to nothing

The threshold sliders and the alerts toggle were plain `useState`; `handleSave` set a success
banner and nothing else, while the real cut-offs were constants inside `predict.py`.

There is now a `system_settings` table, `GET`/`PATCH /api/v1/settings` (admin-only, with
validation that the cut-offs stay ordered), and the prediction endpoints read the live row on
every request. Each change is written to the audit ledger with its before and after values.

Moving a slider now visibly repaints the risk map — which makes it the best live moment in the
demo.

---

## 15. Configuration and hygiene

- `SECRET_KEY` is no longer a committed working default; `main.py` refuses to start with the
  development value when `ENVIRONMENT=production`.
- `BACKEND_CORS_ORIGINS` no longer ends in `"*"` — with `allow_credentials=True` browsers reject a
  wildcard anyway, so it bought nothing and only looked permissive. Vite's preview port (4173) is
  now listed, which was a real gap.
- `cyber_intelligence.db` is gitignored.
- The README claimed PostgreSQL 15 and Alembic migrations; the code is SQLite with
  `Base.metadata.create_all()` and there is no `alembic/` directory. The README now says SQLite.
- `GET /api/v1/health/model` reports which model is loaded, its ROC-AUC, and what was excluded
  as leakage.

---

## 16. New: single-file offline demo

`demo/build_demo.py` exports the trained model — a logistic regression, so a scaler, a one-hot
encoder, 25 coefficients and an intercept — and inlines it with the synthetic zones into one
self-contained HTML file. It runs the real model in the browser with no Python, no Node, no
server and no network, and matches `POST /api/v1/predict` to four decimal places.

It exists because demos fail for boring reasons. See `demo/README.md`.

---

## 17. Tests

`tests/test_regressions.py` covers every defect above that can be asserted: the leakage guard,
the diurnal signal reaching the model, batch output not collapsing to LOW, anonymous requests
getting 401, RBAC refusing an analyst, threshold ordering validation, thresholds actually
reclassifying zones and being audited, dashboard counts matching the areas file, alerts being
generated rather than fixed, and analytics coming from the database.

41 tests, all passing.
