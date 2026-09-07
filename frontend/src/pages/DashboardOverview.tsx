import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, AlertTriangle, MapPin, Cpu, RefreshCw, ArrowUpRight, ShieldAlert,
} from 'lucide-react';
import {
  ComposedChart, Area as RechartsArea, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/common/StatCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { apiService, describeError } from '../services/api';
import { DashboardSummary } from '../types';

const inr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${n.toLocaleString('en-IN')}`;

export const DashboardOverview: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await apiService.getDashboardSummary());
    } catch (err) {
      setError(describeError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hourly = useMemo(() => {
    const rows = data?.hourly_distribution ?? [];
    return [...rows].sort((a, b) => a.hour - b.hour);
  }, [data]);

  // The peak hour, restricted to hours with enough complaints to be meaningful.
  // Taking a plain max reported 04:00 — an hour with ~200 records where the
  // rate is mostly sampling noise — instead of the real 21:00–01:00 window.
  const peak = useMemo(() => {
    if (!hourly.length) return null;
    const volumes = hourly.map((h) => h.total_complaints).sort((a, b) => a - b);
    const median = volumes[Math.floor(volumes.length / 2)] ?? 0;
    const eligible = hourly.filter((h) => h.total_complaints >= median);
    return (eligible.length ? eligible : hourly).reduce((a, b) =>
      b.cash_out_rate > a.cash_out_rate ? b : a
    );
  }, [hourly]);

  const totalZones =
    (data?.high_risk_areas_count ?? 0) + (data?.medium_risk_areas_count ?? 0) + (data?.low_risk_areas_count ?? 0);

  const cashOutRate = data && data.total_complaints
    ? (data.total_cash_withdrawal_events / data.total_complaints) * 100
    : 0;

  // ---------------------------------------------------------------- error
  if (error) {
    return (
      <div className="cyber-card mx-auto mt-8 max-w-lg p-7 text-center">
        <ShieldAlert className="mx-auto mb-3 h-7 w-7 text-risk-medium" />
        <h2 className="panel-title mb-2 text-base">Couldn’t load the overview</h2>
        <p className="mb-5 text-sm text-ash-200">{error}</p>
        <button onClick={load} className="btn mx-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------------ head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ash-100">
            Overview
            <span className="h-2 w-2 rounded-full bg-risk-low" title="Live feed" />
          </h1>
          <p className="mt-1 text-[13px] text-ash-200">
            Where cash-out risk is concentrated right now, and which zones to brief first.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ------------------------------------------------------------- KPIs
          One hero tile answering "what do I do now", three supporting.
          Previously all four were identical, so model F1 competed for
          attention with the active alert count. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          className="lg:col-span-3"
          tone="alarm"
          title="Zones above the intervention threshold"
          value={loading && !data ? '—' : data?.high_risk_areas_count ?? 0}
          subtitle={`of ${totalZones} monitored zones · risk category HIGH`}
          icon={MapPin}
        >
          {peak && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-risk-critical/30 bg-risk-critical/10 px-2.5 py-1 font-mono text-[11px] text-[#FFC9D3]">
              <span className="h-1.5 w-1.5 rounded-full bg-risk-critical animate-risk-pulse" />
              Peak cash-out hour {String(peak.hour).padStart(2, '0')}:00 IST · {peak.cash_out_rate}%
            </div>
          )}
          <button
            onClick={() => navigate('/risk-map')}
            className="mt-3 flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            Open the risk map <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </StatCard>

        <StatCard
          title="Complaints ingested"
          value={loading && !data ? '—' : (data?.total_complaints ?? 0).toLocaleString('en-IN')}
          subtitle={data ? `${inr(data.total_fraud_volume_inr)} total value` : '90-day window'}
          icon={Activity}
        />
        <StatCard
          title="Cash-out rate"
          value={loading && !data ? '—' : `${cashOutRate.toFixed(1)}%`}
          subtitle="of complaints ended in a withdrawal"
          icon={AlertTriangle}
        />
        <StatCard
          title="Model F1"
          value={loading && !data ? '—' : `${((data?.model_f1_score ?? 0) * 100).toFixed(1)}%`}
          subtitle={`accuracy ${((data?.model_accuracy ?? 0) * 100).toFixed(1)}%`}
          icon={Cpu}
        />
      </div>

      {/* -------------------------------------------------- chart + alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="cyber-card p-4 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="panel-title">Cash-out risk through the day</h2>
              <p className="mt-0.5 text-[12px] text-ash-300">
                Risk rises as complaint volume falls — those are the hours accounts are least
                likely to be frozen in time.
              </p>
            </div>
            {peak && <RiskBadge level="HIGH" size="sm" />}
          </div>

          <div className="h-72 w-full">
            {/*
              Two quantities, two scales.

              The previous chart plotted cash_out_rate (0–100) and
              total_complaints (roughly 180–1,100) as two areas sharing ONE
              Y axis, which squashed the risk series flat against the baseline
              and let volume dominate the frame. Risk now owns a 0–100 axis on
              the left as the foreground mark; volume sits behind it as faint
              bars on its own labelled right axis.
            */}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF4D6D" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#FF4D6D" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1E293B" vertical={false} />

                {/* The night cash-out window, shaded rather than annotated. */}
                <ReferenceArea yAxisId="risk" x1={21} x2={23} fill="#FF4D6D" fillOpacity={0.07} />
                <ReferenceArea yAxisId="risk" x1={0} x2={4} fill="#FF4D6D" fillOpacity={0.07} />

                <XAxis
                  dataKey="hour"
                  type="number"
                  domain={[0, 23]}
                  ticks={[0, 4, 8, 12, 16, 20]}
                  stroke="#6F819A"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${String(v).padStart(2, '0')}`}
                />
                <YAxis
                  yAxisId="risk"
                  domain={[0, 100]}
                  stroke="#6F819A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="vol"
                  orientation="right"
                  stroke="#5A6C86"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0C1220', borderColor: '#2E3D53',
                    borderRadius: 8, fontSize: 12, color: '#E6EDF7',
                  }}
                  labelFormatter={(v) => `${String(v).padStart(2, '0')}:00 IST`}
                  formatter={(value: any, name: any) =>
                    name === 'Cash-out risk' ? [`${value}%`, name] : [Number(value).toLocaleString('en-IN'), name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#A9BAD1' }} iconType="square" iconSize={9} />

                <Bar
                  yAxisId="vol"
                  dataKey="total_complaints"
                  name="Complaints received"
                  fill="#7C9CF5"
                  fillOpacity={0.22}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={22}
                />
                <RechartsArea
                  yAxisId="risk"
                  type="monotone"
                  dataKey="cash_out_rate"
                  name="Cash-out risk"
                  stroke="#FF4D6D"
                  strokeWidth={2.2}
                  fill="url(#riskFill)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ------------------------------------------------------- alerts */}
        <div className="cyber-card flex flex-col p-4 lg:col-span-4">
          <div className="mb-3">
            <h2 className="panel-title">Needs a decision</h2>
            <p className="mt-0.5 text-[12px] text-ash-300">
              {data ? `${data.recent_alerts.length} open` : 'Loading'} · scored at the current hour
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {(data?.recent_alerts ?? []).map((alert) => (
              <button
                key={alert.id}
                onClick={() => navigate(`/risk-map?focus=${alert.area_id}`)}
                className="grid grid-cols-[3px_1fr] gap-0 overflow-hidden rounded-lg border border-line bg-ink-200 text-left transition-colors hover:border-line-strong"
              >
                <span
                  className={
                    alert.severity === 'CRITICAL' ? 'bg-risk-critical'
                      : alert.severity === 'HIGH' ? 'bg-risk-high' : 'bg-risk-medium'
                  }
                />
                <span className="block px-3 py-2.5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-ash-100">{alert.area_name}</span>
                    <RiskBadge level={alert.severity} size="sm" score={alert.risk_score} />
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-relaxed text-ash-200">
                    {alert.message}
                  </span>
                  <span className="mt-1.5 block font-mono text-[10px] text-ash-300">
                    {alert.area_id} · {alert.timestamp}
                  </span>
                </span>
              </button>
            ))}

            {data && data.recent_alerts.length === 0 && (
              <p className="rounded-lg border border-line bg-ink-200 px-3 py-6 text-center text-[12.5px] text-ash-300">
                No zone is above the alert threshold at this hour.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- priority table */}
      <div className="cyber-card p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="panel-title">Priority zones</h2>
            <p className="mt-0.5 text-[12px] text-ash-300">
              Highest standing risk, ranked. Click a row to open it on the map.
            </p>
          </div>
          <span className="cyber-badge border-risk-low/35 bg-risk-low/10 text-risk-low">
            Synthetic data
          </span>
        </div>

        <div className="scroll-x">
          <table className="w-full min-w-[620px] border-collapse text-[13px]">
            <thead>
              <tr>
                {['Zone', 'State', 'ATM / POS', 'Complaints', 'Risk'].map((h, i) => (
                  <th
                    key={h}
                    className={`label border-b border-line px-3 pb-2 ${i > 1 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.top_high_risk_areas ?? []).map((a) => (
                <tr
                  key={a.area_id}
                  onClick={() => navigate(`/risk-map?focus=${a.area_id}`)}
                  className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-accent-soft"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-ash-100">{a.area_name}</div>
                    <div className="font-mono text-[10.5px] text-ash-300">{a.area_id}</div>
                  </td>
                  <td className="px-3 py-2.5 text-ash-200">{a.state}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ash-100">{a.atm_pos_density}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ash-100">
                    {a.complaint_count.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="hidden h-1.5 w-[74px] flex-none overflow-hidden rounded bg-ink-300 sm:block">
                        <span
                          className="block h-full rounded"
                          style={{
                            width: `${Math.round(a.baseline_risk_score * 100)}%`,
                            background: a.baseline_risk_score >= 0.8 ? '#FF4D6D' : '#FB7185',
                          }}
                        />
                      </span>
                      <RiskBadge level={a.risk_category} size="sm" score={a.baseline_risk_score} />
                    </div>
                  </td>
                </tr>
              ))}
              {loading && !data && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-ash-300">Loading zones…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
