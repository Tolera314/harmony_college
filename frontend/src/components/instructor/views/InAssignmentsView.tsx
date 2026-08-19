'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  ClipboardCheck, Plus, Search, ChevronDown, RefreshCw,
  FileText, CheckCircle2, Clock, AlertTriangle, Eye, X, Save,
} from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { Card }           from '../../ui/Card';
import { Modal }          from '../../ui/Modal';
import { Input }          from '../../ui/Input';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import {
  instructorClassesApi,
  instructorAssignmentsApi,
  type ClassOffering,
  type AssignmentSummary,
  type AssignmentDetail,
} from '../../../lib/instructorApi';

// ── Status display ────────────────────────────────────────────────────────────
const statusBadge = (s: string) => {
  if (s === 'PUBLISHED') return { variant: 'emerald' as const, label: 'Published' };
  if (s === 'DRAFT')     return { variant: 'glass'   as const, label: 'Draft'     };
  if (s === 'CLOSED')    return { variant: 'amber'   as const, label: 'Closed'    };
  return { variant: 'glass' as const, label: s };
};

const submissionStatusBadge = (s: string) => {
  if (s === 'GRADED')    return { variant: 'emerald' as const, label: 'Graded'    };
  if (s === 'SUBMITTED') return { variant: 'gold'    as const, label: 'Submitted' };
  if (s === 'LATE')      return { variant: 'amber'   as const, label: 'Late'      };
  if (s === 'RETURNED')  return { variant: 'glass'   as const, label: 'Returned'  };
  return { variant: 'glass' as const, label: s };
};

const inputCls = `w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5
  font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors
  placeholder:text-(--text-faint)`;

// ─────────────────────────────────────────────────────────────────────────────
export const InAssignmentsView: React.FC = () => {
  const [classes,          setClasses]         = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [assignments,      setAssignments]     = useState<AssignmentSummary[]>([]);
  const [search,           setSearch]          = useState('');
  const [loading,          setLoading]         = useState(true);
  const [error,            setError]           = useState<string | null>(null);

  // Detail panel
  const [detailId,      setDetailId]     = useState<string | null>(null);
  const [detail,        setDetail]       = useState<AssignmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Grading
  const [gradingId,    setGradingId]    = useState<string | null>(null);
  const [gradeScore,   setGradeScore]   = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeSaving,  setGradeSaving]  = useState(false);

  // Create modal
  const [createOpen,    setCreateOpen]   = useState(false);
  const [createForm,    setCreateForm]   = useState({
    title: '', description: '', instructions: '',
    dueDate: '', totalPoints: '100', allowLateSubmit: false,
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError,  setCreateError]  = useState('');

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    instructorClassesApi.list()
      .then(data => {
        const current = data.filter(o => o.semester.isCurrent);
        const list = current.length ? current : data;
        setClasses(list);
        if (list.length > 0) setSelectedOffering(list[0].id);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await instructorAssignmentsApi.list(selectedOffering || undefined);
      setAssignments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [selectedOffering]);

  useEffect(() => {
    if (selectedOffering) loadAssignments();
  }, [selectedOffering, loadAssignments]);

  // ── Load detail ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    setDetailLoading(true);
    instructorAssignmentsApi.get(detailId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  // ── Create assignment ──────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffering) return;
    setCreateSaving(true); setCreateError('');
    try {
      await instructorAssignmentsApi.create({
        courseOfferingId: selectedOffering,
        title:            createForm.title,
        description:      createForm.description,
        instructions:     createForm.instructions,
        dueDate:          new Date(createForm.dueDate).toISOString(),
        totalPoints:      parseInt(createForm.totalPoints, 10) || 100,
        allowLateSubmit:  createForm.allowLateSubmit,
      });
      setCreateOpen(false);
      setCreateForm({ title: '', description: '', instructions: '', dueDate: '', totalPoints: '100', allowLateSubmit: false });
      loadAssignments();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create assignment');
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Toggle publish ─────────────────────────────────────────────────────────
  const togglePublish = async (a: AssignmentSummary) => {
    const newStatus = a.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try {
      await instructorAssignmentsApi.update(a.id, { status: newStatus });
      loadAssignments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    try {
      await instructorAssignmentsApi.delete(id);
      loadAssignments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete assignment');
    }
  };

  // ── Grade submission ───────────────────────────────────────────────────────
  const handleGrade = async (submissionId: string) => {
    const score = parseFloat(gradeScore);
    if (isNaN(score)) return;
    setGradeSaving(true);
    try {
      await instructorAssignmentsApi.gradeSubmission(submissionId, {
        score,
        feedback: gradeFeedback || undefined,
      });
      setGradingId(null); setGradeScore(''); setGradeFeedback('');
      // Reload detail
      if (detailId) {
        const updated = await instructorAssignmentsApi.get(detailId);
        setDetail(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to grade submission');
    } finally {
      setGradeSaving(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return !q || a.title.toLowerCase().includes(q) || a.courseCode.toLowerCase().includes(q);
  });

  const selectedClass = classes.find(c => c.id === selectedOffering);

  if (loading && assignments.length === 0 && !selectedOffering) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Assignments"
        subtitle={selectedClass ? `${selectedClass.course.code} · ${assignments.length} assignments` : `${assignments.length} assignments`}
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadAssignments}>Refresh</Button>
            {selectedOffering && (
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                New Assignment
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {classes.length > 1 && (
          <div className="relative">
            <select
              value={selectedOffering}
              onChange={e => setSelectedOffering(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="">All Courses</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.course.code} — Section {c.section}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search assignments…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">{error}</div>
      )}

      {loading ? (
        <SkeletonPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="default"
          title="No assignments"
          description={search ? `No results for "${search}".` : 'No assignments yet. Create your first assignment.'}
          action={selectedOffering ? { label: 'Create Assignment', onClick: () => setCreateOpen(true), icon: <Plus className="w-4 h-4" /> } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const sb       = statusBadge(a.status);
            const isPast   = new Date(a.dueDate) < new Date();
            const ungraded = a.submissionCount - 0; // rough indicator

            return (
              <Card key={a.id} hoverable className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-(--brand-gold)">{a.courseCode}</span>
                      <Badge variant={sb.variant} className="text-[10px]">{sb.label}</Badge>
                    </div>
                    <h3 className="font-sans text-sm font-semibold text-(--text-primary) truncate">{a.title}</h3>
                    <p className="font-sans text-xs text-(--text-muted) mt-1 line-clamp-2">{a.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] text-(--text-faint)">Points</p>
                    <p className="font-mono text-base font-bold text-(--text-primary)">{a.totalPoints}</p>
                  </div>
                  <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] text-(--text-faint)">Submissions</p>
                    <p className="font-mono text-base font-bold text-(--brand-gold)">{a.submissionCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: isPast ? 'var(--status-danger)' : 'var(--text-faint)' }} />
                  <span style={{ color: isPast ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                    Due: {new Date(a.dueDate).toLocaleDateString()}
                    {isPast && ' (Past)'}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setDetailId(a.id)}>
                    View
                  </Button>
                  {a.status === 'DRAFT' && (
                    <Button variant="primary" size="sm" onClick={() => togglePublish(a)}>Publish</Button>
                  )}
                  {a.status === 'PUBLISHED' && (
                    <Button variant="secondary" size="sm" onClick={() => togglePublish(a)}>Unpublish</Button>
                  )}
                  {a.status === 'DRAFT' && (
                    <Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}>Delete</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Assignment Detail Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={!!detailId}
        onClose={() => { setDetailId(null); setGradingId(null); }}
        title={detail?.title ?? 'Assignment Details'}
        maxWidth="max-w-3xl"
      >
        {detailLoading ? (
          <SkeletonPage />
        ) : detail ? (
          <div className="space-y-6 font-sans text-sm">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total',    value: detail.stats.total,     color: 'var(--text-primary)'  },
                { label: 'Graded',   value: detail.stats.graded,    color: 'var(--status-success)'},
                { label: 'Ungraded', value: detail.stats.ungraded,  color: detail.stats.ungraded > 0 ? 'var(--status-warning)' : 'var(--text-faint)' },
                { label: 'Points',   value: detail.totalPoints,     color: 'var(--brand-gold)'   },
              ].map(item => (
                <div key={item.label} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Submissions list */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-3">Submissions</p>
              {detail.submissions.length === 0 ? (
                <p className="text-xs text-(--text-faint)">No submissions yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {detail.submissions.map(sub => {
                    const sb = submissionStatusBadge(sub.status);
                    const isGrading = gradingId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-sans text-xs font-semibold text-(--text-primary)">{sub.studentName}</p>
                            <p className="font-mono text-[10px] text-(--text-faint)">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                              {sub.isLate && <span className="ml-2 text-(--status-warning)">Late</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.score !== null ? (
                              <span className="font-mono text-sm font-bold text-(--brand-gold)">
                                {sub.score}/{detail.totalPoints}
                              </span>
                            ) : (
                              <Badge variant={sb.variant} className="text-[10px]">{sb.label}</Badge>
                            )}
                            {sub.score === null && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => { setGradingId(sub.id); setGradeScore(''); setGradeFeedback(''); }}
                              >
                                Grade
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Inline grade form */}
                        <AnimatePresence>
                          {isGrading && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2 pt-2 border-t border-(--border-subtle)"
                            >
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={detail.totalPoints}
                                  value={gradeScore}
                                  onChange={e => setGradeScore(e.target.value)}
                                  placeholder={`Score (0–${detail.totalPoints})`}
                                  className="flex-1 bg-(--hover-overlay) border border-(--border-default) rounded-lg px-3 py-1.5 font-mono text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                                  aria-label="Score"
                                />
                                <input
                                  type="text"
                                  value={gradeFeedback}
                                  onChange={e => setGradeFeedback(e.target.value)}
                                  placeholder="Feedback (optional)"
                                  className="flex-[2] bg-(--hover-overlay) border border-(--border-default) rounded-lg px-3 py-1.5 font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                                  aria-label="Feedback"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="secondary" size="sm" onClick={() => setGradingId(null)}>Cancel</Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={!gradeScore || gradeSaving}
                                  icon={<Save className="w-3.5 h-3.5" />}
                                  onClick={() => handleGrade(sub.id)}
                                >
                                  {gradeSaving ? 'Saving…' : 'Save Grade'}
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--text-muted)">Failed to load assignment details.</p>
        )}
      </Modal>

      {/* ── Create Assignment Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(''); }}
        title="Create Assignment"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 font-sans text-sm">
          {createError && (
            <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">
              {createError}
            </div>
          )}
          <div>
            <label className="block font-sans text-xs font-medium text-(--text-secondary) mb-1">Title *</label>
            <input
              required
              value={createForm.title}
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Assignment title"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block font-sans text-xs font-medium text-(--text-secondary) mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief overview"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="block font-sans text-xs font-medium text-(--text-secondary) mb-1">Instructions *</label>
            <textarea
              required
              rows={3}
              value={createForm.instructions}
              onChange={e => setCreateForm(f => ({ ...f, instructions: e.target.value }))}
              placeholder="Detailed instructions for students"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-xs font-medium text-(--text-secondary) mb-1">Due Date *</label>
              <input
                required
                type="datetime-local"
                value={createForm.dueDate}
                onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-sans text-xs font-medium text-(--text-secondary) mb-1">Total Points</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={createForm.totalPoints}
                onChange={e => setCreateForm(f => ({ ...f, totalPoints: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createForm.allowLateSubmit}
              onChange={e => setCreateForm(f => ({ ...f, allowLateSubmit: e.target.checked }))}
              className="w-4 h-4 accent-[#E9C349]"
            />
            <span className="font-sans text-xs text-(--text-secondary)">Allow late submissions</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={createSaving} icon={<CheckCircle2 className="w-4 h-4" />}>
              {createSaving ? 'Creating…' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
