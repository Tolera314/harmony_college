'use client';
// Pure SVG charts — no external charting library required.
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';

// ─────────────────────────────────────────────────────────────
// Line / Area Chart
// ─────────────────────────────────────────────────────────────
interface LinePoint { label: string; value: number }
interface LineChartProps { data: LinePoint[]; color?: string; area?: boolean; height?: number; showLabels?: boolean }

export const LineChart: React.FC<LineChartProps> = ({
  data, color, area = true, height = 120, showLabels = true,
}) => {
  const [animated, setAnimated] = useState(false);
  // Resolve CSS variable to actual color for SVG attributes
  const [resolvedColor, setResolvedColor] = useState('#E9C349');
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    const c = color ?? (getComputedStyle(document.documentElement).getPropertyValue('--brand-gold').trim() || '#E9C349');
    setResolvedColor(c);
    return () => clearTimeout(t);
  }, [color]);

  const W = 540; const H = height;
  const pad = { top: 10, right: 20, bottom: showLabels ? 24 : 8, left: 32 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals) * 0.95;
  const maxV = Math.max(...vals) * 1.02;
  const range = maxV - minV || 1;

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - minV) / range) * innerH;

  const pts = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const last = data[data.length - 1];
  const areaPath = `M${toX(0)},${toY(data[0].value)} ${data.map((d, i) => `L${toX(i)},${toY(d.value)}`).join(' ')} L${toX(data.length - 1)},${H - pad.bottom} L${toX(0)},${H - pad.bottom} Z`;
  const col = resolvedColor;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.25" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
        {animated && <clipPath id="lineClip"><rect x="0" y="0" width={W} height={H} /></clipPath>}
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.top + innerH * t;
        return <line key={t} x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />;
      })}
      {/* Area fill */}
      {area && <path d={areaPath} fill="url(#areaGrad)" />}
      {/* Line */}
      <motion.polyline
        points={pts} fill="none" stroke={col} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {/* Dots */}
      {data.map((d, i) => (
        <motion.circle
          key={i} cx={toX(i)} cy={toY(d.value)} r="4"
          fill={col} stroke="var(--bg-base)" strokeWidth="2"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.8 + i * 0.05, duration: 0.25 }}
        />
      ))}
      {/* Axis labels */}
      {showLabels && data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fill="currentColor" fillOpacity="0.45" fontSize="10" fontFamily="monospace">
          {d.label}
        </text>
      ))}
      {/* Last value callout */}
      <text x={toX(data.length - 1) + 6} y={toY(last.value) - 8} fill={col} fontSize="11" fontFamily="monospace" fontWeight="700">{last.value}</text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Bar Chart (vertical)
// ─────────────────────────────────────────────────────────────
interface BarItem { label: string; value: number; color?: string }
interface BarChartProps { data: BarItem[]; height?: number; showValues?: boolean }

export const BarChart: React.FC<BarChartProps> = ({ data, height = 140, showValues = true }) => {
  const [goldColor, setGoldColor] = useState('#E9C349');
  useEffect(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--brand-gold').trim() || '#E9C349';
    setGoldColor(c);
  }, []);

  const W = 540; const H = height;
  const pad = { top: 20, right: 12, bottom: 28, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const count = data.length || 1;
  const barW = (innerW / count) * 0.55;
  const gap = innerW / count;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {[0, 0.5, 1].map((t) => {
        const y = pad.top + innerH * (1 - t);
        return <line key={t} x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />;
      })}
      {data.map((d, i) => {
        const bh = Math.max(0, (d.value / maxV) * innerH) || 0;
        const x = pad.left + i * gap + gap / 2 - barW / 2;
        const y = pad.top + innerH - bh;
        const col = d.color ?? goldColor;
        return (
          <g key={i}>
            <motion.rect
              x={x} y={y} width={barW} height={bh} rx="5"
              fill={col} fillOpacity="0.85"
              initial={{ height: 0, y: pad.top + innerH }}
              animate={{ y, height: bh }}
              transition={{ delay: i * 0.07, duration: 0.6, ease: 'easeOut' }}
            />
            {showValues && (
              <motion.text
                x={x + barW / 2} y={0} textAnchor="middle"
                fill={col} fontSize="10" fontFamily="monospace" fontWeight="700"
                animate={{ y: y - 5 }}
                transition={{ delay: i * 0.07 + 0.4, duration: 0.4 }}
              >
                {d.value}
              </motion.text>
            )}
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="currentColor" fillOpacity="0.45" fontSize="9" fontFamily="monospace">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Horizontal Bar Chart (for workload)
// ─────────────────────────────────────────────────────────────
interface HBarItem { label: string; value: number; max: number; color?: string }

export const HorizontalBarChart: React.FC<{ data: HBarItem[] }> = ({ data }) => (
  <div className="space-y-3" aria-label="Horizontal bar chart">
    {data.map((d, i) => {
      const pct = Math.min(100, (d.value / d.max) * 100);
      const barColor =
        pct > 85 ? 'var(--status-danger)' :
        pct > 65 ? 'var(--brand-gold)' :
        'var(--status-success)';
      return (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{d.value}h / {d.max}h</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Donut Chart (capacity)
// ─────────────────────────────────────────────────────────────
interface DonutSegment { label: string; value: number; color: string }

export const DonutChart: React.FC<{ segments: DonutSegment[]; total: number; centerLabel?: string }> = ({
  segments, total, centerLabel,
}) => {
  const R = 56; const C = 70; const stroke = 14;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C * 2} ${C * 2}`} className="shrink-0 -rotate-90" aria-hidden="true">
        {/* Base ring */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const dashLen = (s.value / total) * circ;
          const el = (
            <motion.circle
              key={i} cx={C} cy={C} r={R} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circ}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${dashLen} ${circ}` }}
              transition={{ delay: i * 0.2, duration: 0.8, ease: 'easeOut' }}
            />
          );
          offset += dashLen;
          return el;
        })}
        {/* Center label — counter-rotate to correct for parent -rotate-90 */}
        <text
          x={C} y={C + 4} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(90, ${C}, ${C})`}
          fill="currentColor" fontSize="16" fontFamily="monospace" fontWeight="700"
        >
          {centerLabel}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span className="font-mono text-xs ml-auto pl-3" style={{ color: 'var(--text-muted)' }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
