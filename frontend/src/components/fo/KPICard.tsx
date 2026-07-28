'use client';

import React from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MiniSparkline } from './FOCharts';

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

export const KPICard: React.FC<KPICardProps> = ({
  label, value, icon, trend = 'neutral', trendLabel, sparkline, accent, onClick,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-(--status-success)' : trend === 'down' ? 'text-(--status-danger)' : 'text-(--text-faint)';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-xl ${
        accent
          ? 'bg-gradient-to-br from-[#E9C349]/20 to-[#E9C349]/5 border-(--accent-gold-border)'
          : 'bg-(--hover-overlay) border-(--border-default) backdrop-blur-xl hover:bg-white/[0.07]'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {accent && <div className="absolute -top-6 -right-6 w-24 h-24 bg-(--accent-gold-subtle) rounded-full blur-2xl pointer-events-none" />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] font-bold text-(--text-muted) uppercase tracking-wider leading-tight">{label}</p>
          <p className={`font-mono text-2xl font-bold mt-1.5 tracking-tight leading-none ${accent ? 'text-(--brand-gold)' : 'text-(--text-primary)'}`}>
            {value}
          </p>
          {trendLabel && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="font-sans text-[11px] font-medium">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-(--accent-gold-subtle) text-(--brand-gold)' : 'bg-(--hover-overlay) text-(--text-secondary)'}`}>
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
