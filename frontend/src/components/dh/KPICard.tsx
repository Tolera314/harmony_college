'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  sparkline?: number[];
  accent?: boolean;
  onClick?: () => void;
}

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 60; const h = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80" aria-hidden="true">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={positive ? 'var(--brand-gold)' : 'var(--status-danger)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const KPICard: React.FC<KPICardProps> = ({
  label, value, icon, trend = 'neutral', trendLabel, sparkline, accent, onClick,
}) => {
  const reduced  = useReducedMotion();
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendStyle: React.CSSProperties =
    trend === 'up'   ? { color: 'var(--status-success)' } :
    trend === 'down' ? { color: 'var(--status-danger)'  } :
                       { color: 'var(--text-faint)'      };

  return (
    <motion.div
      whileHover={!reduced ? GESTURE.kpiHover : undefined}
      whileTap={!reduced && onClick ? GESTURE.kpiTap : undefined}
      transition={{ ...DURATION.medium, ...EASE.out }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`relative overflow-hidden rounded-2xl p-5 border shadow-xl ds-focus-ring ${onClick ? 'cursor-pointer' : ''}`}
      style={
        accent
          ? { background: 'linear-gradient(to bottom right, var(--accent-gold-subtle), transparent)', borderColor: 'var(--accent-gold-border)' }
          : { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', backdropFilter: 'blur(12px)' }
      }
    >
      {accent && (
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
          style={{ backgroundColor: 'var(--accent-gold-glow)' }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider truncate ds-kpi-label">{label}</p>
          <p
            className="font-mono text-3xl font-bold mt-1.5 tracking-tight ds-kpi-value"
            style={accent ? { color: 'var(--brand-gold)' } : undefined}
          >
            {value}
          </p>
          {trendLabel && (
            <div className="flex items-center gap-1 mt-2" style={trendStyle}>
              <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-sans text-[11px] font-medium">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={accent
              ? { backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)' }
              : { backgroundColor: 'var(--hover-overlay)', color: 'var(--text-muted)' }
            }
            aria-hidden="true"
          >
            {icon}
          </div>
          {sparkline && sparkline.length > 1 && (
            <MiniSparkline values={sparkline} positive={trend !== 'down'} />
          )}
        </div>
      </div>
    </motion.div>
  );
};
