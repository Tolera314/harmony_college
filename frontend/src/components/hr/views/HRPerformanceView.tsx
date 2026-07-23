'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Star, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { PerformanceReview } from '../../../types/hr';
import { performanceReviews, employees } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { BarChart } from '../../dh/DHCharts';

const statusConfig: Record<PerformanceReview['status'], { variant: 'emerald'|'gold'|'amber'|'rose'; icon: React.ReactNode }> = {
  Completed:   { variant: 'emerald', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  'In Progress':{ variant: 'gold',   icon: <Clock className="w-3.5 h-3.5" /> },
  Pending:     { variant: 'amber',   icon: <Clock className="w-3.5 h-3.5" /> },
  Overdue:     { variant: 'rose',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  const col = score >= 4 ? '#34d399' : score >= 3 ? '#E9C349' : '#f87171';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-sans text-white/70">{label}</span>
        <span className="font-mono font-bold" style={{ color: col }}>{score}/5</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: col }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}

export const HRPerformanceView: React.FC = () => {
  const [filter, setFilter] = useState<'All'|PerformanceReview['status']>('All');
  const [selected, setSelected] = useState<PerformanceReview | null>(null);

  const filtered = performanceReviews.filter(r => filter === 'All' || r.status === filter);
  const avgScore = performanceReviews.filter(r => r.overallScore).reduce((s, r) => s + (r.overallScore ?? 0), 0) / performanceReviews.filter(r => r.overallScore).length;

  const scoreBar = performanceReviews.filter(r => r.overallScore).map(r => {
    const emp = employees.find(e => e.id === r.employeeId);
    return { label: emp?.name.split(' ').pop() ?? '', value: Number(((r.overallScore ?? 0) / 5 * 100).toFixed(0)), color: (r.overallScore ?? 0) >= 4 ? '#34d399' : '#E9C349' };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Performance Management"
        subtitle={`${performanceReviews.filter(r => r.status === 'Overdue').length} overdue · ${performanceReviews.filter(r => r.status === 'Pending' || r.status === 'In Progress').length} pending`}
        icon={<TrendingUp className="w-5 h-5" />}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Completed', value: performanceReviews.filter(r => r.status === 'Completed').length, color: 'text-emerald-400' },
          { label: 'In Progress', value: performanceReviews.filter(r => r.status === 'In Progress').length, color: 'text-[#E9C349]' },
          { label: 'Pending', value: performanceReviews.filter(r => r.status === 'Pending').length, color: 'text-amber-400' },
          { label: 'Overdue', value: performanceReviews.filter(r => r.status === 'Overdue').length, color: 'text-rose-400' },
        ].map(item => (
          <div key={item.label} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {scoreBar.length > 0 && (
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Performance Scores</h3>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#E9C349] fill-[#E9C349]" />
              <span className="font-mono text-sm font-bold text-[#E9C349]">{avgScore.toFixed(1)} avg</span>
            </div>
          </div>
          <BarChart data={scoreBar} height={130} />
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Completed', 'In Progress', 'Pending', 'Overdue'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === f ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.map(review => {
          const emp = employees.find(e => e.id === review.employeeId);
          const sc = statusConfig[review.status];
          return (
            <motion.div key={review.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${review.status === 'Overdue' ? 'bg-rose-950/15 border-rose-800/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <img src={emp?.avatar} alt="" className="w-10 h-10 rounded-xl border border-white/10 shrink-0 object-cover" />
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-white truncate">{emp?.name}</p>
                  <p className="font-sans text-xs text-white/50 truncate">{review.cycle} · {review.period}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="font-mono text-[10px] text-white/40">Due</p>
                  <p className="font-mono text-xs text-white/60">{review.dueDate}</p>
                </div>
                {review.overallScore && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#E9C349] fill-[#E9C349]" />
                    <span className="font-mono text-sm font-bold text-[#E9C349]">{review.overallScore}</span>
                  </div>
                )}
                <Badge variant={sc.variant}>{review.status}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelected(review)}>View</Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Performance Review" maxWidth="max-w-lg">
        {selected && (() => {
          const emp = employees.find(e => e.id === selected.employeeId);
          return (
            <div className="space-y-5 font-sans text-sm">
              <div className="flex items-center gap-3">
                <img src={emp?.avatar} alt="" className="w-12 h-12 rounded-xl border border-white/10 object-cover" />
                <div>
                  <p className="font-serif text-base font-bold text-white">{emp?.name}</p>
                  <p className="text-white/50 text-xs">{review.cycle} Review · {selected.period}</p>
                  <Badge variant={statusConfig[selected.status].variant} className="mt-1">{selected.status}</Badge>
                </div>
              </div>
              {selected.overallScore ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-[#E9C349] fill-[#E9C349]" />
                    <span className="font-serif text-2xl font-bold text-[#E9C349]">{selected.overallScore}</span>
                    <span className="text-white/40 font-mono">/5 overall</span>
                  </div>
                  {[['Goals', selected.goals], ['Competencies', selected.competencies], ['Attendance', selected.attendance], ['Communication', selected.communication], ['Leadership', selected.leadership], ['Technical Skills', selected.technicalSkills]].map(([k, v]) => (
                    <ScoreBar key={String(k)} label={String(k)} score={Number(v)} />
                  ))}
                  {selected.managerComment && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                      <p className="font-mono text-[10px] uppercase text-white/40 mb-1">Manager Comment</p>
                      <p className="text-white/70 text-xs leading-relaxed">{selected.managerComment}</p>
                    </div>
                  )}
                  {selected.hrComment && (
                    <div className="p-3 bg-[#E9C349]/8 rounded-xl border border-[#E9C349]/15">
                      <p className="font-mono text-[10px] uppercase text-white/40 mb-1">HR Comment</p>
                      <p className="text-white/70 text-xs leading-relaxed">{selected.hrComment}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-6">Review not yet completed.</p>
              )}
            </div>
          );
          var review = selected; // satisfy closure
        })()}
      </Modal>
    </motion.div>
  );
};
