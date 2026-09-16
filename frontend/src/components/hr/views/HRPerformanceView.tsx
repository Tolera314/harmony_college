'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { TrendingUp, Star, AlertTriangle, CheckCircle2, Clock, Plus, Save } from 'lucide-react';
import {
  hrPerformanceApi, hrEmployeesApi, type HRPerformanceReviewApi, type HREmployeeApi,
  REVIEW_CYCLE_LABEL, REVIEW_STATUS_LABEL,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card }         from '../../ui/Card';
import { Badge }        from '../../ui/Badge';
import { Button }       from '../../ui/Button';
import { Modal }        from '../../ui/Modal';
import { SlidePanel }   from '../../ui/SlidePanel';
import { SkeletonPage, ErrorState } from '../../ui/States';

type HRReviewStatus = 'PENDING'|'IN_PROGRESS'|'COMPLETED'|'OVERDUE';

const statusVariant: Record<HRReviewStatus, 'amber'|'gold'|'emerald'|'rose'> = {
  PENDING: 'amber', IN_PROGRESS: 'gold', COMPLETED: 'emerald', OVERDUE: 'rose',
};
const statusIcon: Record<HRReviewStatus, React.ReactNode> = {
  PENDING:     <Clock className="w-3.5 h-3.5" />,
  IN_PROGRESS: <TrendingUp className="w-3.5 h-3.5" />,
  COMPLETED:   <CheckCircle2 className="w-3.5 h-3.5" />,
  OVERDUE:     <AlertTriangle className="w-3.5 h-3.5" />,
};

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score != null ? (score / 5) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-sans text-[11px]">
        <span className="text-(--text-secondary)">{label}</span>
        <span className="font-mono font-semibold text-(--text-primary)">{score?.toFixed(1) ?? '—'}/5</span>
      </div>
      <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
        <div className="h-full bg-[#E9C349] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StarRating({ score }: { score: number | null }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${score != null && i <= Math.round(score) ? 'text-[#E9C349] fill-[#E9C349]' : 'text-(--text-faint)'}`} />
      ))}
      {score != null && <span className="font-mono text-xs font-bold text-(--brand-gold) ml-1">{score.toFixed(1)}</span>}
    </div>
  );
}

const emptyScores = { goalsScore: 5, competenciesScore: 5, attendanceScore: 5, communicationScore: 5, leadershipScore: 5, technicalScore: 5, managerComment: '', hrComment: '' };

export const HRPerformanceView: React.FC = () => {
  const [reviews,    setReviews]    = useState<HRPerformanceReviewApi[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState('All');
  const [selected,   setSelected]   = useState<HRPerformanceReviewApi | null>(null);
  const [scoreModal, setScoreModal] = useState<HRPerformanceReviewApi | null>(null);
  const [addModal,   setAddModal]   = useState(false);
  const [employees,  setEmployees]  = useState<HREmployeeApi[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [scores,     setScores]     = useState(emptyScores);
  const [newReview,  setNewReview]  = useState({ employeeId: '', cycle: 'SEMI_ANNUAL', period: '', dueDate: '' });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rv, em] = await Promise.all([
        hrPerformanceApi.list(filter !== 'All' ? filter : undefined),
        hrEmployeesApi.list({ limit: 100, status: 'ACTIVE' }),
      ]);
      setReviews(rv);
      setEmployees(em.employees);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load performance reviews'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleSubmitScores = async () => {
    if (!scoreModal) return;
    setSaving(true);
    try {
      await hrPerformanceApi.submitScores(scoreModal.id, scores);
      setScoreModal(null); setScores(emptyScores);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Submit failed'); }
    finally { setSaving(false); }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await hrPerformanceApi.create(newReview);
      setAddModal(false); setNewReview({ employeeId: '', cycle: 'SEMI_ANNUAL', period: '', dueDate: '' });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Create failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  const overdue   = reviews.filter(r => r.status === 'OVERDUE').length;
  const pending   = reviews.filter(r => r.status === 'PENDING').length;
  const completed = reviews.filter(r => r.status === 'COMPLETED').length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Performance Reviews"
        subtitle={`${completed} completed · ${pending} pending · ${overdue} overdue`}
        icon={<TrendingUp className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>New Review</Button>}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['All','PENDING','IN_PROGRESS','OVERDUE','COMPLETED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {s === 'All' ? 'All' : REVIEW_STATUS_LABEL[s as HRReviewStatus] ?? s}
            {s !== 'All' && <span className="ml-1 font-mono text-[10px] opacity-60">({reviews.filter(r => r.status === s).length})</span>}
          </button>
        ))}
      </div>

      {/* Reviews grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {reviews.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-(--text-faint) text-sm border border-dashed border-(--border-default) rounded-2xl">No reviews in this category.</div>
        ) : reviews.map(review => {
          const status = review.status as HRReviewStatus;
          return (
            <Card key={review.id} hoverable className="space-y-4 cursor-pointer" onClick={() => setSelected(review)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={review.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0" />
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">{review.employee?.fullName}</p>
                    <p className="font-sans text-xs text-(--text-muted) truncate">{review.employee?.position}</p>
                  </div>
                </div>
                <Badge variant={statusVariant[status] ?? 'glass'} className="flex items-center gap-1 shrink-0">
                  {statusIcon[status]}{REVIEW_STATUS_LABEL[status] ?? status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">Cycle</p>
                  <p className="font-semibold text-(--text-secondary) mt-0.5">{REVIEW_CYCLE_LABEL[review.cycle] ?? review.cycle}</p>
                </div>
                <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">Period</p>
                  <p className="font-semibold text-(--text-secondary) mt-0.5">{review.period}</p>
                </div>
              </div>

              {review.overallScore != null ? (
                <div className="flex items-center justify-between">
                  <StarRating score={review.overallScore} />
                  <span className="font-mono text-xs text-(--text-faint)">Due {new Date(review.dueDate).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-(--text-faint) italic">Not scored yet</span>
                  <span className="font-mono text-xs text-(--text-faint)">Due {new Date(review.dueDate).toLocaleDateString()}</span>
                </div>
              )}

              {(status === 'IN_PROGRESS' || status === 'PENDING' || status === 'OVERDUE') && (
                <Button variant="secondary" size="sm" className="w-full"
                  icon={<Save className="w-3.5 h-3.5" />}
                  onClick={e => { e.stopPropagation(); setScoreModal(review); setScores(emptyScores); }}>
                  Submit Scores
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Detail Panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title="Performance Review Details" subtitle="HR Performance" width="max-w-xl">
        {selected && (
          <div className="space-y-5 font-sans text-sm">
            <div className="flex items-center gap-4">
              <img src={selected.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-12 h-12 rounded-xl border border-(--border-default)" />
              <div>
                <p className="font-semibold text-(--text-primary)">{selected.employee?.fullName}</p>
                <p className="text-xs text-(--text-muted)">{selected.employee?.position}</p>
              </div>
              <Badge variant={statusVariant[selected.status as HRReviewStatus] ?? 'glass'} className="ml-auto">{REVIEW_STATUS_LABEL[selected.status as HRReviewStatus] ?? selected.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[['Cycle', REVIEW_CYCLE_LABEL[selected.cycle] ?? selected.cycle], ['Period', selected.period], ['Due', new Date(selected.dueDate).toLocaleDateString()]].map(([k, v]) => (
                <div key={k} className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle) text-center">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k}</p>
                  <p className="font-semibold text-(--text-secondary) mt-0.5 text-xs">{v}</p>
                </div>
              ))}
            </div>
            {selected.overallScore != null && (
              <>
                <div className="text-center py-3 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl">
                  <p className="font-mono text-xs text-(--text-faint) uppercase tracking-wider mb-1">Overall Score</p>
                  <StarRating score={selected.overallScore} />
                </div>
                <div className="space-y-3 pt-1">
                  {([['Goals', selected.goalsScore],['Competencies', selected.competenciesScore],['Attendance', selected.attendanceScore],['Communication', selected.communicationScore],['Leadership', selected.leadershipScore],['Technical', selected.technicalScore]] as [string, number|null][]).map(([k, v]) => (
                    <ScoreBar key={k} label={k} score={v} />
                  ))}
                </div>
              </>
            )}
            {selected.managerComment && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint) mb-1">Manager Comment</p>
                <p className="text-xs text-(--text-secondary) leading-relaxed italic">&ldquo;{selected.managerComment}&rdquo;</p>
              </div>
            )}
            {selected.hrComment && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint) mb-1">HR Comment</p>
                <p className="text-xs text-(--text-secondary) leading-relaxed italic">&ldquo;{selected.hrComment}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Score SlidePanel — Submit Scores */}
      <SlidePanel
        isOpen={!!scoreModal}
        onClose={() => { setScoreModal(null); setScores(emptyScores); }}
        title={`Submit Scores — ${scoreModal?.employee?.fullName ?? ''}`}
        subtitle={scoreModal ? `${(REVIEW_CYCLE_LABEL as Record<string,string>)[scoreModal.cycle] ?? scoreModal.cycle} · ${scoreModal.period}` : undefined}
        width="max-w-lg"
      >
        {scoreModal && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Employee reminder */}
              <div className="flex items-center gap-3 p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                <img src={scoreModal.employee?.avatarUrl ?? '/tigist.png'} alt=""
                  className="w-10 h-10 rounded-xl border border-(--border-default) object-cover shrink-0" />
                <div>
                  <p className="font-semibold text-(--text-primary) text-sm">{scoreModal.employee?.fullName}</p>
                  <p className="text-xs text-(--text-muted)">{scoreModal.employee?.position}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-mono text-[10px] text-(--text-faint)">Due</p>
                  <p className="font-mono text-xs font-semibold text-(--text-secondary)">
                    {new Date(scoreModal.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Score rows */}
              <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Scores (1–5)</p>
              {(['goalsScore','competenciesScore','attendanceScore','communicationScore','leadershipScore','technicalScore'] as const).map(k => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <span className="font-sans text-xs text-(--text-secondary) capitalize w-36 shrink-0">
                    {k.replace('Score', '')}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        onClick={() => setScores(s => ({ ...s, [k]: n }))}
                        className={`w-8 h-8 rounded-lg font-mono text-xs font-bold border transition-all ${
                          scores[k] >= n
                            ? 'bg-[#E9C349] border-[#E9C349] text-black'
                            : 'bg-(--hover-overlay) border-(--border-default) text-(--text-faint) hover:border-(--brand-gold)/50'
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-xs font-semibold text-(--brand-gold) w-8 text-right shrink-0">
                    {scores[k]}/5
                  </span>
                </div>
              ))}

              {/* Computed overall */}
              <div className="px-3 py-2 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl font-mono text-sm text-(--brand-gold) text-center">
                Overall: {(Object.values(scores).slice(0,6).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0) / 6).toFixed(2)} / 5
              </div>

              <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Comments</p>
              <textarea value={scores.managerComment}
                onChange={e => setScores(s => ({ ...s, managerComment: e.target.value }))}
                rows={2} placeholder="Manager comment (optional)…"
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none" />
              <textarea value={scores.hrComment}
                onChange={e => setScores(s => ({ ...s, hrComment: e.target.value }))}
                rows={2} placeholder="HR comment (optional)…"
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none" />
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 px-6 py-4 border-t border-(--border-default) bg-(--bg-modal) flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setScoreModal(null); setScores(emptyScores); }}>Cancel</Button>
              <Button variant="gold" disabled={saving} onClick={handleSubmitScores}>
                {saving ? 'Submitting…' : 'Submit Scores'}
              </Button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Create Review Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Create Performance Review" maxWidth="max-w-md">
        <form onSubmit={handleCreateReview} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Employee</label>
            <select required value={newReview.employeeId} onChange={e => setNewReview(r => ({ ...r, employeeId: e.target.value }))} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">— Select Employee —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Cycle</label>
              <select value={newReview.cycle} onChange={e => setNewReview(r => ({ ...r, cycle: e.target.value }))} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {['QUARTERLY','SEMI_ANNUAL','ANNUAL'].map(c => <option key={c} value={c}>{(REVIEW_CYCLE_LABEL as Record<string,string>)[c]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Period</label>
              <input required value={newReview.period} onChange={e => setNewReview(r => ({ ...r, period: e.target.value }))} placeholder="e.g. H1 2024" className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Due Date</label>
            <input type="date" required value={newReview.dueDate} onChange={e => setNewReview(r => ({ ...r, dueDate: e.target.value }))} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={saving}>{saving ? 'Creating…' : 'Create Review'}</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
