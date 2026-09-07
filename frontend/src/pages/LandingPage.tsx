import React, { useState } from 'react';
import { Shield, Lock, Database, Cpu, Activity, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import { describeError } from '../services/api';

export const LandingPage: React.FC = () => {
  const { login, quickDemoLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const returnTo = location.state?.from?.pathname ?? '/';

  const attempt = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      navigate(returnTo, { replace: true });
    } catch (err) {
      // Real failure surfaces as a real error. The previous version caught this
      // and fabricated a session, so a wrong password logged you in anyway.
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const pending = busy || isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-ink-0">
      <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-accent to-[#3B6FF5] text-ink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ash-100">Cash-out risk console</div>
            <div className="font-mono text-[10.5px] text-ash-300">
              SIH-26184 · National cybercrime forecast grid
            </div>
          </div>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-line bg-ink-100 px-3 py-1 font-mono text-[11px] text-ash-200 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low" />
          Synthetic data only
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-6 py-12 md:grid-cols-12">
        <section className="flex flex-col gap-5 md:col-span-7">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ash-100 sm:text-4xl">
            Decision support for high-risk cash withdrawals
          </h1>
          <p className="max-w-[58ch] text-[15px] leading-relaxed text-ash-200">
            When fraudulent funds move through mule accounts, there is a narrow window before they
            are physically withdrawn. This console ranks zones and time windows by the probability
            of that withdrawal, so patrols and bank freezes go where they matter first.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { Icon: Database, title: 'Synthetic data only', body: 'No real PII, accounts or complaint records.' },
              { Icon: Cpu, title: 'Leakage-audited model', body: 'Label-derived features are excluded and asserted against at train time.' },
              { Icon: Activity, title: 'Advisory, never evidence', body: 'Probabilities with an audit trail on every query.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="cyber-card p-3.5">
                <Icon className="mb-2 h-4 w-4 text-accent" />
                <div className="text-[13px] font-medium text-ash-100">{title}</div>
                <div className="mt-1 text-[11.5px] leading-relaxed text-ash-300">{body}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="md:col-span-5">
          <div className="cyber-card p-6 shadow-lifted">
            <div className="mb-5 text-center">
              <div className="mb-3 inline-flex rounded-lg border border-accent/25 bg-accent-soft p-2.5 text-accent">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-ash-100">Sign in</h2>
              <p className="mt-1 text-[12px] text-ash-300">Authorised personnel only</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-risk-high/40 bg-risk-high/10 px-3 py-2.5 text-[12.5px] text-risk-high">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); attempt(() => login(email, password)); }}
              className="flex flex-col gap-3.5"
            >
              <div>
                <label htmlFor="email" className="field-label">Official email</label>
                <input
                  id="email" type="email" autoComplete="username" required
                  className="field" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@cyberintel.gov.in"
                />
              </div>
              <div>
                <label htmlFor="password" className="field-label">Password</label>
                <input
                  id="password" type="password" autoComplete="current-password" required
                  className="field" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn-primary mt-1" disabled={pending}>
                <LogIn className="h-4 w-4" />
                {pending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {/* Demo accounts perform a real login against the API. If the
                backend is down or unseeded, these fail visibly — which is the
                point. Sign in as the analyst to see RBAC refuse the audit log. */}
            <div className="mt-5 border-t border-line pt-4">
              <div className="label mb-2.5">Demo accounts</div>
              <div className="flex flex-col gap-1.5">
                {(Object.keys(DEMO_CREDENTIALS) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    disabled={pending}
                    onClick={() => attempt(() => quickDemoLogin(role))}
                    className="flex items-center justify-between rounded-lg border border-line bg-ink-200 px-3 py-2 text-left transition-colors hover:border-accent disabled:opacity-50"
                  >
                    <span className="text-[12.5px] font-medium text-ash-100">
                      {DEMO_CREDENTIALS[role].label}
                    </span>
                    <span className="font-mono text-[10.5px] text-ash-300">{role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-6 py-4 text-center text-[11.5px] text-ash-300">
        Probabilistic decision support on synthetic data. Outputs are advisory and are not evidence.
      </footer>
    </div>
  );
};
