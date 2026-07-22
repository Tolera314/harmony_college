'use client';
// Pure SVG charts — no external charting library required.
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';

// ─────────────────────────────────────────────────────────────
// Line / Area Chart
// ─────────────────────────────────────────────────────────────
interface LinePoint { label: string; value: number }
interface LineChartProps { data: LinePoint[]; color?: string; area?: boolean; height?: number; showLabels?: boolean }

export const LineChart: React.FC<LineChartProps> = ({
  data, color = '#E9C349', area = true, height = 120, showLabels = true,
}) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {animated && (
          <clipPath id="lineClip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        )}
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.top + innerH * t;
        return <line key={t} x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="white" strokeOpacity="0.06" strokeWidth="1" />;
      })}
      {/* Area fill */}
      {area && <path d={areaPath} fill="url(#areaGrad)" />}
      {/* Line */}
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {/* Dots */}
      {data.map((d, i) => (
        <motion.circle
          key={i} cx={toX(i)} cy={toY(d.value)} r="4"
          fill={color} stroke="#0F0F10" strokeWidth="2"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.8 + i * 0.05, duration: 0.25 }}
        />
      ))}
      {/* Labels */}
      {showLabels && data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="monospace">
          {d.label}
        </text>
      ))}
      {/* Last value */}
      <text x={toX(data.length - 1) + 6} y={toY(last.value) - 8} fill={color} fontSize="11" fontFamily="monospace" fontWeight="700">{last.value}</text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Bar Chart (vertical)
// ─────────────────────────────────────────────────────────────
interface BarItem { label: string; value: number; color?: string }
interface BarChartProps { data: BarItem[]; height?: number; showValues?: boolean }

export const BarChart: React.FC<BarChartProps> = ({ data, height = 140, showValues = true }) => {
  const W = 540; const H = height;
  const pad = { top: 20, right: 12, bottom: 28, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value));
  const barW = (innerW / data.length) * 0.55;
  const gap = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {[0, 0.5, 1].map((t) => {
        const y = pad.top + innerH * (1 - t);
        return <line key={t} x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="white" strokeOpacity="0.06" strokeWidth="1" />;
      })}
      {data.map((d, i) => {
        const bh = (d.value / maxV) * innerH;
        const x = pad.left + i * gap + gap / 2 - barW / 2;
        const y = pad.top + innerH - bh;
        const col = d.color ?? '#E9C349';
        return (
          <g key={i}>
            <motion.rect
              x={x} y={pad.top + innerH} width={barW} height={0} rx="5"
              fill={col} fillOpacity="0.85"
              animate={{ y, height: bh }}
              transition={{ delay: i * 0.07, duration: 0.6, ease: 'easeOut' }}
            />
            {showValues && (
              <motion.text
                x={x + barW / 2} y={0} textAnchor="middle" fill={col} fontSize="10" fontFamily="monospace" fontWeight="700"
                animate={{ y: y - 5 }}
                transition={{ delay: i * 0.07 + 0.4, duration: 0.4 }}
              >
                {d.value}
              </motion.text>
            )}
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
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
      const col = pct > 85 ? '#f87171' : pct > 65 ? '#E9C349' : '#34d399';
      return (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-white/70 truncate max-w-[140px]">{d.label}</span>
            <span className="font-mono text-[11px] text-white/60">{d.value}h / {d.max}h</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: col }}
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
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
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
        <text x={C} y={C + 4} textAnchor="middle" dominantBaseline="middle" transform={`rotate(90, ${C}, ${C})`}
          fill="white" fontSize="16" fontFamily="monospace" fontWeight="700" className="rotate-90">
          {centerLabel}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-sans text-xs text-white/70">{s.label}</span>
            <span className="font-mono text-xs text-white/50 ml-auto pl-3">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
