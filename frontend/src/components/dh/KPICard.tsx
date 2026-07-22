'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  const w = 60;
  const h = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const color = positive ? '#E9C349' : '#f87171';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const KPICard: React.FC<KPICardProps> = ({
  label, value, icon, trend = 'neutral', trendLabel, sparkline, accent, onClick,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white/40';

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
          ? 'bg-gradient-to-br from-[#E9C349]/20 to-[#E9C349]/5 border-[#E9C349]/30'
          : 'bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/[0.07]'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Background glow */}
      {accent && <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#E9C349]/20 rounded-full blur-2xl pointer-events-none" />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] font-bold text-white/50 uppercase tracking-wider truncate">{label}</p>
          <p className={`font-mono text-3xl font-bold mt-1.5 tracking-tight ${accent ? 'text-[#E9C349]' : 'text-white'}`}>
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
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-[#E9C349]/20 text-[#E9C349]' : 'bg-white/8 text-white/60'}`}>
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
