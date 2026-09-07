import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, Bell, Save, Check, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService, describeError } from '../services/api';
import { SystemSettings } from '../types';

/**
 * Risk thresholds.
 *
 * These controls used to be plain component state: `handleSave` set a "saved
 * successfully" banner and nothing else, while the real cut-offs were
 * constants inside `ml/pipeline/predict.py`. They now read and write
 * `/api/v1/settings`, the prediction endpoints read the same row on every
 * request, and each change is written to the audit ledger with its before and
 * after values.
 */
export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const s = await apiService.getSettings();
      setSettings(s);
      setDraft(s);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = !!settings && !!draft && JSON.stringify(settings) !== JSON.stringify(draft);

  const ordered =
    !!draft && draft.threshold_medium < draft.threshold_high && draft.threshold_high < draft.threshold_critical;

  const set = (patch: Partial<SystemSettings>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !ordered) return;
    setSaving(true);
    setError('');
    try {
      const updated = await apiService.updateSettings({
        threshold_critical: draft.threshold_critical,
        threshold_high: draft.threshold_high,
        threshold_medium: draft.threshold_medium,
        alerts_enabled: draft.alerts_enabled,
        alert_min_severity: draft.alert_min_severity,
      });
      setSettings(updated);
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="cyber-card mx-auto mt-8 max-w-lg p-8 text-center text-sm text-ash-300">
        {error || 'Loading settings…'}
      </div>
    );
  }

  const Threshold: React.FC<{
    label: string;
    help: string;
    value: number;
    onChange: (v: number) => void;
    color: string;
    min: number;
    max: number;
  }> = ({ label, help, value, onChange, color, min, max }) => (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ash-100">{label}</span>
        <span className="font-mono text-[13px] tabular" style={{ color }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        disabled={!isAdmin}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer rounded bg-ink-300 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ accentColor: color }}
      />
      <p className="mt-1.5 text-[11.5px] text-ash-300">{help}</p>
    </div>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ash-100">Settings</h1>
        <p className="mt-1 text-[13px] text-ash-200">
          Risk cut-offs are applied by the prediction engine on every request. Changing one here
          immediately changes how zones are classified on the map and in the alert feed.
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2.5 rounded-lg border border-line bg-ink-100 px-4 py-3 text-[13px] text-ash-200">
          <Lock className="mt-0.5 h-4 w-4 flex-none text-risk-medium" />
          <span>
            You are signed in as <span className="font-mono text-ash-100">{user?.role}</span>. These
            values are read-only for your role — only an administrator can change them.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-risk-high/40 bg-risk-high/10 px-4 py-3 text-[13px] text-risk-high">
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-risk-low/35 bg-risk-low/10 px-4 py-3 text-[13px] text-risk-low">
          <Check className="h-4 w-4 flex-none" />
          Saved. New cut-offs are live and the change is in the audit log.
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-4">
        <fieldset className="cyber-card flex flex-col gap-5 p-5">
          <legend className="flex items-center gap-2 text-[13px] font-semibold text-ash-100">
            <Sliders className="h-4 w-4 text-accent" />
            Risk classification cut-offs
          </legend>

          <Threshold
            label="Critical"
            help="Immediate dispatch. Predicted probability at or above this is treated as an active incident."
            value={draft.threshold_critical}
            onChange={(v) => set({ threshold_critical: v })}
            color="#FF4D6D"
            min={0.5}
            max={0.95}
          />
          <Threshold
            label="High"
            help="Advisory patrol and bank lien marking. Zones at or above this appear in the alert feed."
            value={draft.threshold_high}
            onChange={(v) => set({ threshold_high: v })}
            color="#FB7185"
            min={0.35}
            max={0.9}
          />
          <Threshold
            label="Medium"
            help="Monitoring only. Below this a zone is classified LOW and needs no action."
            value={draft.threshold_medium}
            onChange={(v) => set({ threshold_medium: v })}
            color="#F0B429"
            min={0.1}
            max={0.7}
          />

          {!ordered && (
            <p className="rounded-lg border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-[12.5px] text-risk-high">
              Cut-offs must increase: medium below high, high below critical.
            </p>
          )}
        </fieldset>

        <fieldset className="cyber-card flex flex-col gap-4 p-5">
          <legend className="flex items-center gap-2 text-[13px] font-semibold text-ash-100">
            <Bell className="h-4 w-4 text-accent" />
            Alert feed
          </legend>

          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-[13px] font-medium text-ash-100">Show the alert feed</span>
              <span className="block text-[11.5px] text-ash-300">
                When off, the Overview alert panel returns no items.
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.alerts_enabled}
              disabled={!isAdmin}
              onChange={(e) => set({ alerts_enabled: e.target.checked })}
              className="h-4 w-4 flex-none accent-[#2DD4E4] disabled:opacity-50"
            />
          </label>

          <div>
            <span className="field-label">Minimum severity to raise an alert</span>
            <div className="flex gap-2">
              {(['MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => set({ alert_min_severity: sev })}
                  className={[
                    'rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-colors disabled:opacity-50',
                    draft.alert_min_severity === sev
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-ink-200 text-ash-300 hover:text-ash-100',
                  ].join(' ')}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={!isAdmin || !dirty || !ordered || saving}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save cut-offs'}
          </button>
          {dirty && (
            <button type="button" className="btn" onClick={() => setDraft(settings)}>
              Discard changes
            </button>
          )}
          {settings?.updated_at && (
            <span className="ml-auto font-mono text-[11px] text-ash-300">
              Last changed {settings.updated_at}
              {settings.updated_by ? ` by ${settings.updated_by}` : ''}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
