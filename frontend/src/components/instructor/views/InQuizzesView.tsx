'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { HelpCircle, Plus, RefreshCw, ChevronDown, Clock, Users, Eye } from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { Card }           from '../../ui/Card';
import { Modal }          from '../../ui/Modal';
import { Input }          from '../../ui/Input';
import { SkeletonPage, EmptyState } from '../../ui/States';
import {
  instructorClassesApi,
  instructorQuizzesApi,
  type ClassOffering,
  type QuizSummary,
} from '../../../lib/instructorApi';

const statusBadge = (s: string) => {
  if (s === 'PUBLISHED' || s === 'ACTIVE') return { variant: 'emerald' as const, label: s === 'ACTIVE' ? 'Active' : 'Published' };
  if (s === 'DRAFT')                        return { variant: 'glass'   as const, label: 'Draft'     };
  if (s === 'CLOSED')                       return { variant: 'amber'   as const, label: 'Closed'    };
  return { variant: 'glass' as const, label: s };
};

const inputCls = `w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5
  font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors
  placeholder:text-(--text-faint)`;

export const InQuizzesView: React.FC = () => {
  const [classes,          setClasses]         = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [quizzes,          setQuizzes]         = useState<QuizSummary[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [error,            setError]           = useState<string | null>(null);
  const [createOpen,       setCreateOpen]      = useState(false);
  const [createSaving,     setCreateSaving]    = useState(false);
  const [createError,      setCreateError]     = useState('');
  const [createForm,       setCreateForm]      = useState({
    title: '', description: '',
    availableFrom: '', availableUntil: '',
    durationMinutes: '30', passingScore: '60',
    maxAttempts: '1', totalPoints: '100',
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
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

  const loadQuizzes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await instructorQuizzesApi.list(selectedOffering || undefined);
      setQuizzes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, [selectedOffering]);

  useEffect(() => { if (selectedOffering) loadQuizzes(); }, [selectedOffering, loadQuizzes]);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffering) return;
    setCreateSaving(true); setCreateError('');
    try {
      await instructorQuizzesApi.create({
        courseOfferingId: selectedOffering,
        title:            createForm.title,
        description:      createForm.description,
        availableFrom:    new Date(createForm.availableFrom).toISOString(),
        availableUntil:   new Date(createForm.availableUntil).toISOString(),
        durationMinutes:  parseInt(createForm.durationMinutes, 10) || 30,
        passingScore:     parseInt(createForm.passingScore, 10)    || 60,
        maxAttempts:      parseInt(createForm.maxAttempts, 10)     || 1,
        totalPoints:      parseInt(createForm.totalPoints, 10)     || 100,
      });
      setCreateOpen(false);
      setCreateForm({ title: '', description: '', availableFrom: '', availableUntil: '', durationMinutes: '30', passingScore: '60', maxAttempts: '1', totalPoints: '100' });
      loadQuizzes();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create quiz');
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Toggle status ─────────────────────────────────────────────────────────
  const toggleStatus = async (q: QuizSummary) => {
    const newStatus = q.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try {
      await instructorQuizzesApi.update(q.id, { status: newStatus });
      loadQuizzes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading && !selectedOffering) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Quizzes & Exams"
        subtitle={`${quizzes.length} quizzes`}
        icon={<HelpCircle className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadQuizzes}>Refresh</Button>
            {selectedOffering && (
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                New Quiz
              </Button>
            )}
          </div>
        }
      />

      {/* Class filter */}
      {classes.length > 1 && (
        <div className="relative inline-block">
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

      {error && (
        <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">{error}</div>
      )}

      {loading ? (
        <SkeletonPage />
      ) : quizzes.length === 0 ? (
        <EmptyState
          variant="default"
          title="No quizzes"
          description="No quizzes created yet."
          action={selectedOffering ? { label: 'Create Quiz', onClick: () => setCreateOpen(true), icon: <Plus className="w-4 h-4" /> } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {quizzes.map(q => {
            const sb  = statusBadge(q.status);
            const now = new Date();
            const from  = new Date(q.availableFrom);
            const until = new Date(q.availableUntil);
            const isActive = now >= from && now <= until && q.status !== 'DRAFT';

            return (
              <Card key={q.id} hoverable className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-(--brand-gold)">
                      {q.courseOffering.course.code}
                    </span>
                    <Badge variant={isActive ? 'emerald' : sb.variant} className="text-[10px]">
                      {isActive ? 'Live' : sb.label}
                    </Badge>
                  </div>
                  <h3 className="font-sans text-sm font-semibold text-(--text-primary)">{q.title}</h3>
                  {q.description && (
                    <p className="font-sans text-xs text-(--text-muted) mt-1 line-clamp-2">{q.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                    <p className="font-mono text-sm font-bold text-(--text-primary)">{q._count.questions}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">Questions</p>
                  </div>
                  <div className="p-2 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                    <p className="font-mono text-sm font-bold text-(--brand-gold)">{q._count.attempts}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">Attempts</p>
                  </div>
                  <div className="p-2 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                    <p className="font-mono text-sm font-bold text-(--text-primary)">{q.durationMinutes}m</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">Duration</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-(--text-faint)">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Opens: {from.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Closes: {until.toLocaleDateString()}</span>
                  </div>
                  <span>Pass: {q.passingScore}% · {q.totalPoints} pts</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {q.status === 'DRAFT' && (
                    <Button variant="primary" size="sm" onClick={() => toggleStatus(q)}>Publish</Button>
                  )}
                  {q.status === 'PUBLISHED' && (
                    <Button variant="secondary" size="sm" onClick={() => toggleStatus(q)}>Unpublish</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(''); }}
        title="Create Quiz"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 font-sans text-sm">
          {createError && (
            <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">{createError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-(--text-secondary) mb-1">Title *</label>
            <input required value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Quiz title" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--text-secondary) mb-1">Description</label>
            <textarea rows={2} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-(--text-secondary) mb-1">Available From *</label>
              <input required type="datetime-local" value={createForm.availableFrom} onChange={e => setCreateForm(f => ({ ...f, availableFrom: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-(--text-secondary) mb-1">Available Until *</label>
              <input required type="datetime-local" value={createForm.availableUntil} onChange={e => setCreateForm(f => ({ ...f, availableUntil: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-(--text-secondary) mb-1">Duration (min)</label>
              <input type="number" min={1} max={300} value={createForm.durationMinutes} onChange={e => setCreateForm(f => ({ ...f, durationMinutes: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-(--text-secondary) mb-1">Total Points</label>
              <input type="number" min={1} value={createForm.totalPoints} onChange={e => setCreateForm(f => ({ ...f, totalPoints: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create Quiz'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
