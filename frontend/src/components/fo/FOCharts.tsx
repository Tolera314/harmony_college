'use client';
// Pure SVG charts for Finance Officer Dashboard — no external charting library.
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

// ─────────────────────────────────────────────────────────────
// Utility: format ETB currency compactly
// ─────────────────────────────────────────────────────────────
export function fmtETB(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─────────────────────────────────────────────────────────────
// Revenue Line / Area Chart
// ─────────────────────────────────────────────────────────────
interface LinePoint { label: string; value: number }
interface RevenueLineChartProps {
  data: LinePoint[];
  secondaryData?: LinePoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  area?: boolean;
  showLabels?: boolean;
  label?: string;
  secondaryLabel?: string;
}

export const RevenueLineChart: React.FC<RevenueLineChartProps> = ({
  data, secondaryData, color = '#E9C349', secondaryColor = '#34d399',
  height = 140, area = true, showLabels = true, label, secondaryLabel,
}) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

  const W = 560; const H = height;
  const pad = { top: 12, right: 24, bottom: showLabels ? 28 : 10, left: 40 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const allVals = [...data.map((d) => d.value), ...(secondaryData ?? []).map((d) => d.value)];
  const minV = 0;
  const maxV = Math.max(...allVals) * 1.1 || 1;
  const range = maxV - minV;

  const toX = (i: number, len: number) => pad.left + (i / (len - 1)) * iW;
  const toY = (v: number) => pad.top + iH - ((v - minV) / range) * iH;

  const pts = (d: LinePoint[]) => d.map((p, i) => `${toX(i, d.length)},${toY(p.value)}`).join(' ');
  const areaPath = (d: LinePoint[], c: string) => {
    const line = d.map((p, i) => `L${toX(i, d.length)},${toY(p.value)}`).join(' ');
    return `M${toX(0, d.length)},${toY(d[0].value)} ${line} L${toX(d.length - 1, d.length)},${H - pad.bottom} L${toX(0, d.length)},${H - pad.bottom} Z`;
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      {(label || secondaryLabel) && (
        <div className="flex items-center gap-4 mb-3">
          {label && <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} /><span className="font-mono text-[10px] text-white/50">{label}</span></div>}
          {secondaryLabel && secondaryData && <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ backgroundColor: secondaryColor }} /><span className="font-mono text-[10px] text-white/50">{secondaryLabel}</span></div>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`areaGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {secondaryData && (
            <linearGradient id={`areaGrad2-${secondaryColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
            </linearGradient>
          )}
        </defs>
        {/* Grid */}
        {gridLines.map((t) => {
          const y = pad.top + iH * t;
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="white" strokeOpacity="0.06" strokeWidth="1" />
              <text x={pad.left - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
                {fmtETB(maxV * (1 - t))}
              </text>
            </g>
          );
        })}
        {/* Secondary area + line */}
        {secondaryData && area && <path d={areaPath(secondaryData, secondaryColor)} fill={`url(#areaGrad2-${secondaryColor.replace('#','')})`} />}
        {secondaryData && (
          <motion.polyline
            points={pts(secondaryData)} fill="none" stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        )}
        {/* Primary area + line */}
        {area && <path d={areaPath(data, color)} fill={`url(#areaGrad-${color.replace('#','')})`} />}
        <motion.polyline
          points={pts(data)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {/* Dots */}
        {data.map((d, i) => (
          <motion.circle key={i} cx={toX(i, data.length)} cy={toY(d.value)} r="4"
            fill={color} stroke="#0F0F10" strokeWidth="2"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.05, duration: 0.2 }}
          />
        ))}
        {/* Labels */}
        {showLabels && data.map((d, i) => (
          <text key={i} x={toX(i, data.length)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Grouped Bar Chart (revenue vs target)
// ─────────────────────────────────────────────────────────────
interface GroupedBarItem { label: string; primary: number; secondary: number; primaryColor?: string; secondaryColor?: string }
interface GroupedBarChartProps { data: GroupedBarItem[]; height?: number; primaryLabel?: string; secondaryLabel?: string }

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  data, height = 160, primaryLabel = 'Revenue', secondaryLabel = 'Target',
}) => {
  const W = 560; const H = height;
  const pad = { top: 20, right: 12, bottom: 28, left: 40 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.flatMap((d) => [d.primary, d.secondary])) * 1.1 || 1;
  const slotW = iW / data.length;
  const barW = slotW * 0.32;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-[#E9C349]" /><span className="font-mono text-[10px] text-white/50">{primaryLabel}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-white/20" /><span className="font-mono text-[10px] text-white/50">{secondaryLabel}</span></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + iH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="white" strokeOpacity="0.06" strokeWidth="1" />
              <text x={pad.left - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">{fmtETB(maxV * t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + i * slotW + slotW / 2;
          const bh1 = (d.primary / maxV) * iH;
          const bh2 = (d.secondary / maxV) * iH;
          const x1 = cx - barW - 1;
          const x2 = cx + 1;
          return (
            <g key={i}>
              <motion.rect x={x1} y={pad.top + iH} width={barW} height={0} rx="3" fill="#E9C349" fillOpacity="0.85"
                animate={{ y: pad.top + iH - bh1, height: bh1 }} transition={{ delay: i * 0.06, duration: 0.6, ease: 'easeOut' }} />
              <motion.rect x={x2} y={pad.top + iH} width={barW} height={0} rx="3" fill="rgba(255,255,255,0.18)"
                animate={{ y: pad.top + iH - bh2, height: bh2 }} transition={{ delay: i * 0.06 + 0.05, duration: 0.6, ease: 'easeOut' }} />
              <text x={cx} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Donut Chart (payment methods / status breakdown)
// ─────────────────────────────────────────────────────────────
interface DonutSegment { label: string; value: number; color: string }
interface DonutChartProps { segments: DonutSegment[]; total: number; centerLabel?: string; centerSub?: string }

export const DonutChart: React.FC<DonutChartProps> = ({ segments, total, centerLabel, centerSub }) => {
  const R = 58; const C = 72; const stroke = 16;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C * 2} ${C * 2}`} className="shrink-0 -rotate-90" aria-hidden="true">
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const dashLen = total > 0 ? (s.value / total) * circ : 0;
          const el = (
            <motion.circle key={i} cx={C} cy={C} r={R} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circ}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${dashLen} ${circ}` }}
              transition={{ delay: i * 0.15, duration: 0.7, ease: 'easeOut' }}
            />
          );
          offset += dashLen;
          return el;
        })}
      </svg>
      <div className="flex-1 min-w-[140px]">
        {centerLabel && (
          <div className="mb-3">
            <p className="font-mono text-2xl font-bold text-white">{centerLabel}</p>
            {centerSub && <p className="font-sans text-xs text-white/40">{centerSub}</p>}
          </div>
        )}
        <div className="space-y-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-sans text-xs text-white/70 flex-1 truncate">{s.label}</span>
              <span className="font-mono text-xs text-white/50">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Horizontal Bar (dept revenue / outstanding)
// ─────────────────────────────────────────────────────────────
interface HBarItem { label: string; value: number; max: number; color?: string; subLabel?: string }

export const HorizontalBarChart: React.FC<{ data: HBarItem[]; formatValue?: (v: number) => string }> = ({
  data, formatValue = fmtETB,
}) => (
  <div className="space-y-3.5" aria-label="Horizontal bar chart">
    {data.map((d, i) => {
      const pct = Math.min(100, d.max > 0 ? (d.value / d.max) * 100 : 0);
      const col = d.color ?? '#E9C349';
      return (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-sans text-xs text-white/80 font-medium truncate block">{d.label}</span>
              {d.subLabel && <span className="font-mono text-[10px] text-white/40">{d.subLabel}</span>}
            </div>
            <span className="font-mono text-xs text-white/60 shrink-0">ETB {formatValue(d.value)}</span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: col }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: i * 0.07, duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Vertical Bar Chart (daily collections)
// ─────────────────────────────────────────────────────────────
interface BarItem { label: string; value: number; color?: string }
export const VerticalBarChart: React.FC<{ data: BarItem[]; height?: number; formatValue?: (v: number) => string }> = ({
  data, height = 130, formatValue = fmtETB,
}) => {
  const W = 540; const H = height;
  const pad = { top: 20, right: 8, bottom: 28, left: 8 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value)) || 1;
  const barW = (iW / data.length) * 0.55;
  const gap = iW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={pad.left} y1={pad.top + iH * (1 - t)} x2={W - pad.right} y2={pad.top + iH * (1 - t)}
          stroke="white" strokeOpacity="0.06" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const bh = (d.value / maxV) * iH;
        const x = pad.left + i * gap + gap / 2 - barW / 2;
        const col = d.color ?? '#E9C349';
        return (
          <g key={i}>
            <motion.rect x={x} y={pad.top + iH} width={barW} height={0} rx="4" fill={col} fillOpacity="0.85"
              animate={{ y: pad.top + iH - bh, height: bh }} transition={{ delay: i * 0.07, duration: 0.55, ease: 'easeOut' }} />
            <motion.text x={x + barW / 2} y={0} textAnchor="middle" fill={col} fontSize="9" fontFamily="monospace" fontWeight="700"
              animate={{ y: pad.top + iH - bh - 5 }} transition={{ delay: i * 0.07 + 0.4, duration: 0.3 }}>
              {formatValue(d.value)}
            </motion.text>
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Mini Sparkline (for KPI cards)
// ─────────────────────────────────────────────────────────────
export function MiniSparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 60; const h = 24;
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
