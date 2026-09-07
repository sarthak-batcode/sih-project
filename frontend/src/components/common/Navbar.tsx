import React, { useState, useEffect } from 'react';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Inspector General',
  investigator: 'Investigator',
  analyst: 'Analyst',
};

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [clock, setClock] = useState<string>('');

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-line bg-[#070C17] px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-gradient-to-br from-accent to-[#3B6FF5] text-ink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ash-100">
            Cash-out risk console
          </div>
          <div className="truncate font-mono text-[10.5px] text-ash-300">
            SIH-26184 · National forecast grid
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/*
          The role switcher that used to sit here silently re-authenticated as a
          different demo user on click, which meant the RBAC gates could never
          actually be observed failing. Role is now shown, not switched — sign
          out and back in as the analyst account to demonstrate access control.
        */}
        <span className="hidden items-center gap-2 rounded-full border border-line bg-ink-100 px-3 py-1 font-mono text-[11px] text-ash-200 lg:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low" />
          {clock} IST
        </span>

        <div className="flex items-center gap-3 border-l border-line pl-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-medium text-ash-100">{user?.full_name ?? 'Officer'}</div>
            <div className="font-mono text-[10px] text-ash-300">
              {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg border border-line bg-ink-100 p-2 text-ash-300 transition-colors hover:border-risk-high/40 hover:text-risk-high"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
