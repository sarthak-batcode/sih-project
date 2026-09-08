import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Crosshair, BarChart3,
  Cpu, FileText, Settings, ShieldAlert,
} from 'lucide-react';

/**
 * Labels are the words an officer would use, not the module names from the
 * architecture document. "Geospatial Risk Map" became "Risk map"; the long
 * versions wrapped to two lines at 13px and read as internal jargon.
 */
const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/risk-map', label: 'Risk map', icon: Map },
  { to: '/predictions', label: 'Predictions', icon: Crosshair },
  { to: '/analytics', label: 'Trends', icon: BarChart3 },
  { to: '/model-insights', label: 'Model & governance', icon: Cpu },
  { to: '/audit-logs', label: 'Audit log', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden w-52 flex-none flex-col justify-between gap-6 border-r border-line bg-[#070C17] px-2.5 py-4 md:flex">
      <div>
        <div className="label px-2.5 pb-2">Modules</div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-[13px] transition-colors',
                  isActive
                    ? 'border-accent bg-accent-soft font-semibold text-accent'
                    : 'border-transparent text-ash-200 hover:bg-ink-100 hover:text-ash-100',
                ].join(' ')
              }
            >
              <Icon className="h-[15px] w-[15px] flex-none" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="rounded-lg border border-line bg-ink-100 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-risk-medium">
          <ShieldAlert className="h-3.5 w-3.5 flex-none" />
          Decision support only
        </div>
        <p className="text-[11.5px] leading-relaxed text-ash-300">
          Risk scores are advisory probabilities on synthetic telemetry. They inform patrol
          planning — they are not evidence.
        </p>
      </div>
    </aside>
  );
};
