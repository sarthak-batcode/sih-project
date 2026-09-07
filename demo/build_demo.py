"""
Builds the single-file offline demo.

Exports the trained model as plain coefficients and the synthetic zones as JSON,
then inlines both into demo/template.html to produce demo/cash-out-risk-demo.html
— a self-contained page that runs with no Python, no Node and no network.

The selected model is a logistic regression, so "exporting" it means the scaler
statistics, the one-hot categories, 25 coefficients and an intercept. Scoring in
JavaScript is then a dot product and a sigmoid, and reproduces what
POST /api/v1/predict returns for the same inputs.

Run after training:
    python ml/pipeline/train.py
    python demo/build_demo.py
"""

import json
import os
import sys

import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from ml.pipeline.train import NUMERICAL_FEATURES, CATEGORICAL_FEATURES  # noqa: E402

MODEL_DIR = os.path.join(BASE_DIR, "ml", "saved_models")
DATA_DIR = os.path.join(BASE_DIR, "data")
DEMO_DIR = os.path.join(BASE_DIR, "demo")


def export_model() -> dict:
    model = joblib.load(os.path.join(MODEL_DIR, "best_model.joblib"))
    prep = joblib.load(os.path.join(MODEL_DIR, "preprocessor.joblib"))
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), encoding="utf-8") as f:
        meta = json.load(f)

    if not hasattr(model, "coef_"):
        raise SystemExit(
            f"The selected model is {meta['algorithm']}, which has no linear "
            "coefficients to export. The offline demo currently supports linear "
            "models only — either retrain so a linear model wins, or extend this "
            "script to serialise the tree ensemble."
        )

    num = prep.named_transformers_["num"]
    cat = prep.named_transformers_["cat"]

    return {
        "algorithm": meta["algorithm"],
        "version": meta["version"],
        "roc_auc": meta["selected_model_metrics"]["roc_auc"],
        "numeric": NUMERICAL_FEATURES,
        "means": [float(x) for x in num.mean_],
        "scales": [float(x) for x in num.scale_],
        "categorical": CATEGORICAL_FEATURES,
        "categories": [[str(v) for v in c] for c in cat.categories_],
        "coef": [round(float(x), 8) for x in model.coef_[0]],
        "intercept": float(model.intercept_[0]),
        "baselines": meta["feature_baselines"],
    }


def export_data() -> dict:
    with open(os.path.join(DATA_DIR, "synthetic_areas.json"), encoding="utf-8") as f:
        areas = json.load(f)
    with open(os.path.join(DATA_DIR, "eda_summary.json"), encoding="utf-8") as f:
        hourly = json.load(f)["hourly_trends"]

    # Short keys: the payload is inlined into the HTML, so field names are
    # repeated 100 times each.
    slim = [{
        "id": a["area_id"], "n": a["area_name"], "d": a["district"],
        "s": a["state"], "r": a["region"], "z": a["zone_type"],
        "la": a["latitude"], "lo": a["longitude"],
        "atm": a["atm_pos_density"], "b": a["baseline_risk_score"],
        "c": a["risk_category"],
    } for a in areas]

    return {"areas": slim, "hourly": hourly}


def main():
    template_path = os.path.join(DEMO_DIR, "template.html")
    out_path = os.path.join(DEMO_DIR, "cash-out-risk-demo.html")

    with open(template_path, encoding="utf-8") as f:
        html = f.read()

    model = export_model()
    data = export_data()

    for marker, payload in (("__MODEL__", model), ("__DATA__", data)):
        start = html.index(f"/*{marker}*/")
        end = html.index("/*__END__*/", start) + len("/*__END__*/")
        html = html[:start] + json.dumps(payload, separators=(",", ":")) + html[end:]

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"[+] {out_path}")
    print(f"    {size_kb:.0f} KB · {model['algorithm']} · "
          f"{len(model['coef'])} coefficients · {len(data['areas'])} zones")
    print("    Opens in any browser. No server, no install, no network.")


if __name__ == "__main__":
    main()
