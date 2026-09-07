import React from 'react';
import { LucideIcon } from 'lucide-react';

type Tone = 'neutral' | 'alarm';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  /**
   * `alarm` is the one emphasis treatment in the interface. Use it on at most
   * one tile per screen — the figure the officer opened the page for.
   */
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A KPI tile.
 *
 * The previous version bundled border, hover-shadow, text and background
 * classes into one `glowMap` string and spread that same string onto BOTH the
 * card wrapper and the inner icon div. Two consequences:
 *
 *   - the card received `bg-cyan-500/10` on top of `cyber-card`'s own
 *     background, so which one won depended on Tailwind's generated stylesheet
 *     order rather than the order they were written in;
 *   - the icon chip inherited `hover:shadow-glow-*` and `hover:border-*`, which
 *     did nothing at all.
 *
 * Surface, icon chip and emphasis are now three separate concerns.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  tone = 'neutral',
  className = '',
  children,
}) => {
  const surface = tone === 'alarm' ? 'card-alarm' : 'cyber-card';
  const iconChip =
    tone === 'alarm'
      ? 'bg-risk-critical/15 text-risk-critical'
      : 'bg-ink-200 text-ash-200';
  const valueTone = tone === 'alarm' ? 'text-[#FFE3E8]' : 'text-ash-100';

  return (
    <div className={`${surface} p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-ash-300">{title}</span>
        {Icon && (
          <span className={`rounded-md p-1.5 ${iconChip}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className={`text-2xl font-semibold tracking-tight tabular ${valueTone}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`font-mono text-[10.5px] ${
              trendPositive ? 'text-risk-low' : 'text-risk-high'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-[11.5px] text-ash-300">{subtitle}</p>}
      {children}
    </div>
  );
};
