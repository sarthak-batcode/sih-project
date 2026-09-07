import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, ShieldAlert, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { apiService, describeError } from '../services/api';

/**
 * Model governance.
 *
 * Every figure on this page now comes from `model_metadata.json` via
 * `/api/v1/model/metrics`. The previous version hard-coded the benchmark table
 * (99.03% recall, 88.39% F1, "Gradient Boosting — Production Deploy") and the
 * feature-importance chart ("Local Composite Risk, 85.3%") as literals, so the
 * screen kept reporting the retired leaking model's scores no matter what was
 * actually trained and served.
 */
export const ModelInsightsPage: React.FC = () => {
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMeta(await apiService.getModelMetrics());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="cyber-card mx-auto mt-8 max-w-lg p-8 text-center text-sm text-ash-300">
      Loading model metadata…
    </div>;
  }

  if (error || !meta) {
    return (
      <div className="cyber-card mx-auto mt-8 max-w-lg p-7 text-center">
        <ShieldAlert className="mx-auto mb-3 h-7 w-7 text-risk-medium" />
        <h2 className="panel-title mb-2 text-base">No model metadata</h2>
        <p className="mb-5 text-sm text-ash-200">
          {error || 'Train a model first: python ml/pipeline/train.py'}
        </p>
        <button onClick={load} className="btn mx-auto"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
      </div>
    );
  }

  const m = meta.selected_model_metrics ?? {};
  const comparison: Record<string, any> = meta.metrics_comparison ?? {};
  const baselines: Record<string, any> = meta.baselines ?? {};
  const cm = m.confusion_matrix ?? [[0, 0], [0, 0]];
  const [[tn, fp], [fn, tp]] = cm;
  const total = tn + fp + fn + tp;

  const pct = (v: number) => `${((v ?? 0) * 100).toFixed(2)}%`;

  // Baselines first, then candidates — the trivial reference belongs at the top
  // of the table, not in a footnote.
  const rows = [
    ...Object.entries(baselines).map(([name, r]) => ({ name, r, kind: 'baseline' as const })),
    ...Object.entries(comparison).map(([name, r]) => ({
      name, r, kind: name === meta.algorithm ? ('selected' as const) : ('candidate' as const),
    })),
  ];

  const roc = (comparison[meta.algorithm]?.roc_curve_sample ?? []).map((p: any) => ({
    fpr: p.fpr, tpr: p.tpr, chance: p.fpr,
  }));

  const importances = (meta.top_feature_importances ?? []).slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ash-100">
            <Cpu className="h-5 w-5 text-accent" /> Model &amp; governance
          </h1>
          <p className="mt-1 text-[13px] text-ash-200">
            Out-of-time validation on the most recent {total.toLocaleString('en-IN')} incidents,
            with the trivial baseline shown for comparison.
          </p>
        </div>
        <span className="cyber-badge border-line-strong bg-ink-200 text-ash-200">
          {meta.algorithm} · {meta.version}
        </span>
      </div>

      {/* --------------------------------------------------- leakage notice */}
      <div className="flex items-start gap-3 rounded-lg border border-line bg-ink-100 px-4 py-3.5"
           style={{ borderLeftWidth: 2, borderLeftColor: '#34D399' }}>
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-risk-low" />
        <div className="text-[13px] leading-relaxed text-ash-200">
          <strong className="text-ash-100">Leakage control.</strong>{' '}
          {meta.leakage_note ?? 'Label-derived columns are excluded from the feature set.'}
          {meta.excluded_features?.length > 0 && (
            <span className="mt-1.5 block font-mono text-[11.5px] text-ash-300">
              Excluded: {meta.excluded_features.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { k: 'ROC-AUC', v: (m.roc_auc ?? 0).toFixed(4), n: 'Selection metric — ranking quality', hero: true },
          { k: 'Accuracy', v: pct(m.accuracy), n: 'Correct classifications' },
          { k: 'Precision', v: pct(m.precision), n: 'Of flagged cases, how many were real' },
          { k: 'Recall', v: pct(m.recall), n: 'Of real cash-outs, how many were caught' },
        ].map(({ k, v, n, hero }) => (
          <div key={k} className="cyber-card p-4">
            <div className="text-xs font-medium text-ash-300">{k}</div>
            <div className={`mt-1.5 text-2xl font-semibold tabular ${hero ? 'text-accent' : 'text-ash-100'}`}>{v}</div>
            <div className="mt-1 text-[11.5px] text-ash-300">{n}</div>
          </div>
        ))}
      </div>

      <p className="text-[12.5px] leading-relaxed text-ash-300">
        Selection is on <strong className="text-ash-200">ROC-AUC</strong>, not F1. The positive
        class is the majority here, so F1 rewards a classifier that answers “yes” to everything —
        which is exactly what the trivial baseline in the first row of the table does.
      </p>

      {/* -------------------------------------------------------- benchmark */}
      <div className="cyber-card p-4">
        <div className="mb-3">
          <h2 className="panel-title">Benchmark</h2>
          <p className="mt-0.5 text-[12px] text-ash-300">
            Chronological 80/20 split — the test set is strictly later in time than the training set.
          </p>
        </div>
        <div className="scroll-x">
          <table className="w-full min-w-[680px] border-collapse text-[13px]">
            <thead>
              <tr>
                {['Model', 'Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC'].map((h, i) => (
                  <th key={h} className={`label border-b border-line px-3 pb-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ name, r, kind }) => (
                <tr key={name} className={`border-b border-line/60 last:border-0 ${
                  kind === 'selected' ? 'bg-accent-soft' : ''}`}>
                  <td className="px-3 py-2.5">
                    <span className={kind === 'selected' ? 'font-semibold text-accent' : 'text-ash-100'}>{name}</span>
                    {kind === 'selected' && <span className="ml-2 font-mono text-[10px] text-ash-300">selected</span>}
                    {kind === 'baseline' && <span className="ml-2 font-mono text-[10px] text-ash-300">reference</span>}
                  </td>
                  {['accuracy', 'precision', 'recall', 'f1_score'].map((k) => (
                    <td key={k} className="px-3 py-2.5 text-right font-mono text-ash-200">{pct(r[k])}</td>
                  ))}
                  <td className={`px-3 py-2.5 text-right font-mono ${
                    kind === 'selected' ? 'font-semibold text-accent' : 'text-ash-200'}`}>
                    {(r.roc_auc ?? 0).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------- confusion + importances */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="cyber-card p-4 lg:col-span-5">
          <h2 className="panel-title">Confusion matrix</h2>
          <p className="mt-0.5 text-[12px] text-ash-300">
            {total.toLocaleString('en-IN')} held-out incidents
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {[
              { l: 'True negative', v: tn, n: 'Correctly quiet', c: 'text-ash-100' },
              { l: 'False positive', v: fp, n: 'Patrol sent unnecessarily', c: 'text-risk-medium' },
              { l: 'False negative', v: fn, n: 'Cash-out missed', c: 'text-risk-critical' },
              { l: 'True positive', v: tp, n: 'Correctly flagged', c: 'text-risk-low' },
            ].map(({ l, v, n, c }) => (
              <div key={l} className="rounded-lg border border-line bg-ink-200 p-3">
                <div className="label">{l}</div>
                <div className={`mt-1 text-xl font-semibold tabular ${c}`}>{v.toLocaleString('en-IN')}</div>
                <div className="mt-0.5 text-[11px] text-ash-300">{n}</div>
              </div>
            ))}
          </div>

          <p className="mt-3 rounded-lg border border-line bg-ink-200 p-3 text-[11.5px] leading-relaxed text-ash-200">
            The two error types are not symmetric. A <span className="text-risk-medium">false positive</span> costs
            a wasted patrol; a <span className="text-risk-critical">false negative</span> is money gone. The
            operating point is where that trade-off is set — move the cut-offs on the Settings screen
            and this balance shifts with them.
          </p>
        </div>

        <div className="cyber-card p-4 lg:col-span-7">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <h2 className="panel-title">Feature importance</h2>
            <span className="font-mono text-[10.5px] text-ash-300">
              {meta.importance_basis ?? 'normalised'}
            </span>
          </div>
          <p className="mb-3 text-[12px] text-ash-300">
            Normalised to sum to 100%. A single feature above 60% would indicate leakage.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={importances} margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#6F819A" fontSize={11} unit="%" tickLine={false} axisLine={false} />
                {/* One-hot names like transaction_amount_bucket_CRITICAL_ABOVE_200K are long;
                    the axis needs the room or the labels clip at the left edge. */}
                <YAxis dataKey="feature" type="category" stroke="#6F819A" fontSize={10}
                       width={232} tickLine={false} axisLine={false} interval={0} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0C1220', borderColor: '#2E3D53', borderRadius: 8, fontSize: 12, color: '#E6EDF7' }}
                  formatter={(v: any) => [`${v}%`, 'Importance']}
                  cursor={{ fill: 'rgba(45,212,228,.05)' }}
                />
                <Bar dataKey="percentage" fill="#7C9CF5" radius={[0, 3, 3, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- ROC */}
      {roc.length > 0 && (
        <div className="cyber-card p-4">
          <h2 className="panel-title">ROC curve — {meta.algorithm}</h2>
          <p className="mt-0.5 text-[12px] text-ash-300">
            The diagonal is random guessing. Area under this curve is {(m.roc_auc ?? 0).toFixed(4)}.
          </p>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roc} margin={{ top: 8, right: 16, left: -14, bottom: 4 }}>
                <CartesianGrid stroke="#1E293B" />
                <XAxis dataKey="fpr" type="number" domain={[0, 1]} stroke="#6F819A" fontSize={11}
                       tickLine={false} label={{ value: 'False positive rate', position: 'insideBottom',
                       offset: -2, fill: '#6F819A', fontSize: 11 }} />
                <YAxis domain={[0, 1]} stroke="#6F819A" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0C1220', borderColor: '#2E3D53', borderRadius: 8, fontSize: 12, color: '#E6EDF7' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#A9BAD1' }} iconType="plainline" />
                <Line dataKey="chance" name="Random guessing" stroke="#2E3D53" strokeWidth={1.5}
                      strokeDasharray="4 4" dot={false} />
                <Line dataKey="tpr" name="True positive rate" stroke="#2DD4E4" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
