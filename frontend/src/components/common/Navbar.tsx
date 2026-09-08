import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
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
        <span className="hidden items-center gap-2 rounded-full border border-line bg-ink-100 px-3 py-1 font-mono text-[11px] text-ash-200 lg:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low" />
          {clock} IST
        </span>

      </div>
    </header>
  );
};
