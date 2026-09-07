import React from 'react';

interface RiskBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
  score?: number;
}

/**
 * Severity badge.
 *
 * Two fixes from the previous version:
 *
 * 1. Only CRITICAL carries a shadow. Every level used to glow, which meant a
 *    0.27 LOW zone drew the eye as hard as a 0.91 CRITICAL one.
 *
 * 2. The CRITICAL dot no longer uses Tailwind's `animate-ping`. That animation
 *    scales an element to 2x and fades it to zero — it is meant for an
 *    absolutely positioned duplicate sitting *behind* a solid dot. Applied
 *    directly to the only dot, the most severe state spent most of each cycle
 *    invisible.
 */
export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', score }) => {
  const norm = (level || '').toUpperCase();

  const styles: Record<string, { box: string; dot: string; pulse: boolean }> = {
    CRITICAL: {
      box: 'text-[#FFDCE3] border-risk-critical bg-risk-critical/20 shadow-alarm font-semibold',
      dot: 'bg-risk-critical',
      pulse: true,
    },
    HIGH: {
      box: 'text-risk-high border-risk-high/45 bg-risk-high/10',
      dot: 'bg-risk-high',
      pulse: false,
    },
    MEDIUM: {
      box: 'text-risk-medium border-risk-medium/40 bg-risk-medium/10',
      dot: 'bg-risk-medium',
      pulse: false,
    },
    LOW: {
      box: 'text-risk-low border-risk-low/35 bg-risk-low/10',
      dot: 'bg-risk-low',
      pulse: false,
    },
  };

  const s = styles[norm] ?? {
    box: 'text-ash-300 border-line-strong bg-ink-200',
    dot: 'bg-ash-300',
    pulse: false,
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-[10.5px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span className={`cyber-badge ${s.box} ${sizeStyles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-risk-pulse' : ''}`} />
      {norm}
      {score !== undefined && <span className="tabular">{(score * 100).toFixed(0)}%</span>}
    </span>
  );
};
