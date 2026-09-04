'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  HelpCircle, Plus, RefreshCw, ChevronDown, Clock,
  CheckCircle2, AlertTriangle, Eye, Trash2, Users, BarChart2,
  FileText, Sparkles, Upload, X, Check, FileQuestion
} from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { Card }           from '../../ui/Card';
import { Modal }          from '../../ui/Modal';
import { SlidePanel }     from '../../ui/SlidePanel';
import { SkeletonPage, EmptyState } from '../../ui/States';
import {
  instructorClassesApi,
  instructorQuizzesApi,
  type ClassOffering,
  type QuizSummary,
} from '../../../lib/instructorApi';

// ── Shared input style ────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  border:          '1px solid var(--border-default)',
  borderRadius:    '0.75rem',
  color:           'var(--text-primary)',
  padding:         '0.625rem 0.875rem',
  fontFamily:      'inherit',
  fontSize:        '0.875rem',
  width:           '100%',
  outline:         'none',
  transition:      'border-color 0.15s',
};

function InpField({
  label, required, children, hint,
}: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-sans text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="font-sans text-[11px]" style={{ color: 'var(--text-faint)' }}>{hint}</p>}
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────
const statusBadge = (s: string) => {
  if (s === 'ACTIVE')     return { variant: 'emerald' as const, label: 'Live'      };
  if (s === 'PUBLISHED')  return { variant: 'emerald' as const, label: 'Published' };
  if (s === 'DRAFT')      return { variant: 'glass'   as const, label: 'Draft'     };
  if (s === 'CLOSED')     return { variant: 'amber'   as const, label: 'Closed'    };
  return { variant: 'glass' as const, label: s };
};

// ── Question / Option interfaces ──────────────────────────────────────────────
export interface FormOption {
  text: string;
  isCorrect: boolean;
}

export interface FormQuestion {
  id: string;
  questionText: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SHORT_ANSWER' | 'ESSAY';
  points: number;
  options: FormOption[];
}

interface CreateForm {
  title:                  string;
  description:            string;
  instructions:           string;
  availableFrom:          string;
  availableUntil:         string;
  durationMinutes:        string;
  passingScore:           string;
  maxAttempts:            string;
  totalPoints:            string;
  shuffleQuestions:       boolean;
  showResultsImmediately: boolean;
  questions:              FormQuestion[];
}

const EMPTY_FORM: CreateForm = {
  title:                  '',
  description:            '',
  instructions:           '',
  availableFrom:          '',
  availableUntil:         '',
  durationMinutes:        '30',
  passingScore:           '60',
  maxAttempts:            '1',
  totalPoints:            '0',
  shuffleQuestions:       false,
  showResultsImmediately: true,
  questions:              [],
};

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: () => void; label: string; hint?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={onChange}
        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: checked ? 'var(--brand-gold)' : 'var(--border-strong)', cursor: 'pointer' }}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => e.key === ' ' && onChange()}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
        />
      </div>
      <div>
        <p className="font-sans text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {hint && <p className="font-sans text-xs" style={{ color: 'var(--text-faint)' }}>{hint}</p>}
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export interface InQuizzesViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

export const InQuizzesView: React.FC<InQuizzesViewProps> = ({ programType }) => {
  const [classes,          setClasses]          = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [quizzes,          setQuizzes]          = useState<QuizSummary[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [listError,        setListError]        = useState<string | null>(null);

  // Create form
  const [createOpen,  setCreateOpen]  = useState(false);
  const [form,        setForm]        = useState<CreateForm>(EMPTY_FORM);
  const [formSaving,  setFormSaving]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail panel
  const [detailId,      setDetailId]      = useState<string | null>(null);
  const [detail,        setDetail]        = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Load classes ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    instructorClassesApi.list(programType)
      .then(data => {
        setClasses(data);
        if (data.length > 0) {
          const curr = data.find(o => o.semester.isCurrent);
          setSelectedOffering(prev => (prev && data.some(d => d.id === prev)) ? prev : (curr ? curr.id : data[0].id));
        } else {
          setSelectedOffering('');
        }
      })
      .catch(e => setListError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, [programType]);

  // ── Load quizzes ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setListError(null);
    try {
      setQuizzes(await instructorQuizzesApi.list(selectedOffering || undefined));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load quizzes');
    } finally { setLoading(false); }
  }, [selectedOffering]);

  useEffect(() => { if (selectedOffering) load(); }, [selectedOffering, load]);

  // ── Load quiz detail ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    setDetailLoading(true);
    instructorQuizzesApi.get(detailId)
      .then(setDetail).catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  // ── Question handlers ─────────────────────────────────────────────────────
  const addQuestion = () => {
    const newQ: FormQuestion = {
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      questionText: '',
      type: 'MCQ',
      points: 10,
      options: [
        { text: 'Option 1', isCorrect: true },
        { text: 'Option 2', isCorrect: false },
      ],
    };
    setForm(f => {
      const updated = [...f.questions, newQ];
      const totalPts = updated.reduce((sum, q) => sum + (q.points || 0), 0);
      return { ...f, questions: updated, totalPoints: String(totalPts || 100) };
    });
  };

  const removeQuestion = (id: string) => {
    setForm(f => {
      const updated = f.questions.filter(q => q.id !== id);
      const totalPts = updated.reduce((sum, q) => sum + (q.points || 0), 0);
      return { ...f, questions: updated, totalPoints: String(totalPts || 100) };
    });
  };

  const updateQuestion = (id: string, updates: Partial<FormQuestion>) => {
    setForm(f => {
      const updated = f.questions.map(q => {
        if (q.id !== id) return q;
        const next = { ...q, ...updates };
        if (updates.type === 'TRUE_FALSE' && q.type !== 'TRUE_FALSE') {
          next.options = [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ];
        } else if (updates.type === 'MCQ' && (q.type !== 'MCQ' || !next.options.length)) {
          next.options = [
            { text: 'Option 1', isCorrect: true },
            { text: 'Option 2', isCorrect: false },
          ];
        }
        return next;
      });
      const totalPts = updated.reduce((sum, q) => sum + (q.points || 0), 0);
      return { ...f, questions: updated, totalPoints: String(totalPts || 100) };
    });
  };

  const addOption = (qId: string) => {
    setForm(f => ({
      ...f,
      questions: f.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: [...q.options, { text: `Option ${q.options.length + 1}`, isCorrect: false }],
        };
      }),
    }));
  };

  const removeOption = (qId: string, optIdx: number) => {
    setForm(f => ({
      ...f,
      questions: f.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.filter((_, idx) => idx !== optIdx),
        };
      }),
    }));
  };

  const updateOption = (qId: string, optIdx: number, text: string, isCorrect?: boolean) => {
    setForm(f => ({
      ...f,
      questions: f.questions.map(q => {
        if (q.id !== qId) return q;
        const updatedOpts = q.options.map((opt, idx) => {
          if (idx !== optIdx) {
            return isCorrect ? { ...opt, isCorrect: false } : opt;
          }
          return {
            ...opt,
            text: text !== undefined ? text : opt.text,
            isCorrect: isCorrect !== undefined ? isCorrect : opt.isCorrect,
          };
        });
        return { ...q, options: updatedOpts };
      }),
    }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      try {
        // Try parsing JSON array of questions
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const imported: FormQuestion[] = parsed.map((item, idx) => ({
            id: 'imp-' + idx + '-' + Date.now(),
            questionText: item.questionText || item.question || 'Imported Question',
            type: item.type ?? 'MCQ',
            points: item.points ?? 10,
            options: Array.isArray(item.options) ? item.options.map((o: any) => ({
              text: typeof o === 'string' ? o : o.text ?? '',
              isCorrect: !!o.isCorrect,
            })) : [{ text: 'Option 1', isCorrect: true }, { text: 'Option 2', isCorrect: false }],
          }));
          setForm(f => {
            const updated = [...f.questions, ...imported];
            const totalPts = updated.reduce((sum, q) => sum + (q.points || 0), 0);
            return {
              ...f,
              title: f.title || file.name.replace(/\.[^/.]+$/, ''),
              questions: updated,
              totalPoints: String(totalPts || 100),
            };
          });
        }
      } catch {
        // Simple plain text lines format (each non-empty line = question)
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        const imported: FormQuestion[] = lines.map((line, idx) => ({
          id: 'imp-line-' + idx,
          questionText: line,
          type: 'SHORT_ANSWER',
          points: 10,
          options: [],
        }));
        setForm(f => {
          const updated = [...f.questions, ...imported];
          const totalPts = updated.reduce((sum, q) => sum + (q.points || 0), 0);
          return {
            ...f,
            title: f.title || file.name.replace(/\.[^/.]+$/, ''),
            questions: updated,
            totalPoints: String(totalPts || 100),
          };
        });
      }
    };
    reader.readAsText(file);
  };

  // ── Validate form ─────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.title.trim())         return 'Title is required.';
    if (!form.availableFrom)        return 'Available from date is required.';
    if (!form.availableUntil)       return 'Available until date is required.';
    const from  = new Date(form.availableFrom);
    const until = new Date(form.availableUntil);
    if (until <= from)              return 'Available until must be after available from.';
    const dur = parseInt(form.durationMinutes, 10);
    if (isNaN(dur) || dur < 1)      return 'Duration must be at least 1 minute.';
    const pts = parseInt(form.totalPoints, 10);
    if (isNaN(pts) || pts < 1)      return 'Total points must be at least 1.';
    const pass = parseInt(form.passingScore, 10);
    if (isNaN(pass) || pass < 0 || pass > 100) return 'Passing score must be between 0 and 100.';
    return null;
  };

  // ── Create quiz ───────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    if (!selectedOffering) return;

    setFormSaving(true); setFormError('');
    try {
      await instructorQuizzesApi.create({
        courseOfferingId:       selectedOffering,
        title:                  form.title.trim(),
        description:            form.description.trim() || undefined,
        instructions:           form.instructions.trim() || undefined,
        availableFrom:          new Date(form.availableFrom).toISOString(),
        availableUntil:         new Date(form.availableUntil).toISOString(),
        durationMinutes:        parseInt(form.durationMinutes, 10),
        passingScore:           parseInt(form.passingScore, 10),
        maxAttempts:            parseInt(form.maxAttempts, 10),
        totalPoints:            parseInt(form.totalPoints, 10),
        shuffleQuestions:       form.shuffleQuestions,
        showResultsImmediately: form.showResultsImmediately,
        questions:              form.questions.map(q => ({
          questionText: q.questionText.trim() || 'Untitled Question',
          type:         q.type,
          points:       q.points || 10,
          options:      (q.type === 'MCQ' || q.type === 'TRUE_FALSE') ? q.options : [],
        })),
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create quiz');
    } finally { setFormSaving(false); }
  };

  // ── Toggle publish ────────────────────────────────────────────────────────
  const toggleStatus = async (q: QuizSummary) => {
    const next = q.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try { await instructorQuizzesApi.update(q.id, { status: next }); load(); }
    catch (e) { setListError(e instanceof Error ? e.message : 'Update failed'); }
  };

  const selectedClass = classes.find(c => c.id === selectedOffering);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <DHPageHeader
        title="Quizzes & Exams"
        subtitle={
          selectedClass
            ? `${selectedClass.course.code} · ${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`
            : `${quizzes.length} quizzes`
        }
        icon={<HelpCircle className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Refresh
            </Button>
            {selectedOffering && (
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(EMPTY_FORM); setFormError(''); setCreateOpen(true); }}>
                New Quiz
              </Button>
            )}
          </div>
        }
      />

      {/* ── Class filter ───────────────────────────────────────────────── */}
      {classes.length > 1 && (
        <div className="relative inline-block">
          <select
            value={selectedOffering}
            onChange={e => setSelectedOffering(e.target.value)}
            style={{ ...inp, paddingRight: '2rem', width: 'auto' }}
          >
            <option value="">All Courses</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.course.code} — Section {c.section}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
        </div>
      )}

      {listError && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-sans" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {listError}
          <button className="ml-auto underline" onClick={load}>Retry</button>
        </div>
      )}

      {/* ── Quiz Cards ─────────────────────────────────────────────────── */}
      {loading ? (
        <SkeletonPage />
      ) : quizzes.length === 0 ? (
        <EmptyState
          variant="default"
          title="No quizzes yet"
          description="Create your first quiz or exam for this class."
          action={selectedOffering ? { label: 'Create Quiz', onClick: () => { setForm(EMPTY_FORM); setCreateOpen(true); }, icon: <Plus className="w-4 h-4" /> } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {quizzes.map(q => {
            const now     = new Date();
            const from    = new Date(q.availableFrom);
            const until   = new Date(q.availableUntil);
            const isLive  = now >= from && now <= until && q.status !== 'DRAFT';
            const isPast  = now > until;
            const sb      = statusBadge(isLive ? 'ACTIVE' : q.status);

            return (
              <Card key={q.id} hoverable className="space-y-4 flex flex-col">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--brand-gold)' }}>
                      {q.courseOffering?.course?.code}
                    </span>
                    <Badge variant={isLive ? 'emerald' : sb.variant} className="text-[10px]">
                      {isLive ? '● Live' : sb.label}
                    </Badge>
                    {isPast && q.status === 'PUBLISHED' && (
                      <Badge variant="amber" className="text-[10px]">Expired</Badge>
                    )}
                  </div>
                  <h3 className="font-sans text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{q.title}</h3>
                  {q.description && (
                    <p className="font-sans text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{q.description}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Questions', value: q._count?.questions ?? 0, color: 'var(--text-primary)'  },
                    { label: 'Attempts',  value: q._count?.attempts ?? 0,  color: 'var(--brand-gold)'    },
                    { label: 'Duration',  value: `${q.durationMinutes}m`, color: 'var(--status-info)' },
                  ].map(s => (
                    <div key={s.label} className="p-2 rounded-xl text-center" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                      <p className="font-mono text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Time window */}
                <div className="space-y-1 font-mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Opens: {from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Closes: {until.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span>Pass: {q.passingScore}% · {q.totalPoints} pts · max {q.maxAttempts} attempt{q.maxAttempts !== 1 ? 's' : ''}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-1 mt-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setDetailId(q.id)}
                  >
                    Details
                  </Button>
                  {q.status === 'DRAFT' && (
                    <Button variant="primary" size="sm" onClick={() => toggleStatus(q)}>Publish</Button>
                  )}
                  {q.status === 'PUBLISHED' && !isLive && (
                    <Button variant="secondary" size="sm" onClick={() => toggleStatus(q)}>Unpublish</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Quiz Detail Panel ───────────────────────────────────────────── */}
      <SlidePanel
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? 'Quiz Details'}
        subtitle={detail ? `${detail.stats?.totalAttempts ?? 0} attempts · ${detail.questions?.length ?? detail._count?.questions ?? 0} questions` : ''}
        width="max-w-2xl"
      >
        {detailLoading ? (
          <SkeletonPage />
        ) : detail ? (
          <div className="space-y-6 font-sans text-sm">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Questions', value: detail.questions?.length ?? detail._count?.questions ?? 0, color: 'var(--text-primary)'   },
                { label: 'Attempts',  value: detail.stats?.totalAttempts ?? 0,   color: 'var(--brand-gold)'     },
                { label: 'Submitted', value: detail.stats?.submitted ?? 0,       color: 'var(--status-info)'    },
                { label: 'Avg Score', value: detail.stats?.avgScore ? `${detail.stats.avgScore}` : '—', color: 'var(--status-success)' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                  <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Config */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              {[
                { label: 'Duration',     value: `${detail.durationMinutes}m`          },
                { label: 'Total Points', value: String(detail.totalPoints)             },
                { label: 'Passing Score',value: `${detail.passingScore}%`              },
                { label: 'Max Attempts', value: String(detail.maxAttempts)             },
                { label: 'Shuffle',      value: detail.shuffleQuestions ? 'Yes' : 'No' },
                { label: 'Show Results', value: detail.showResultsImmediately ? 'Immediately' : 'After close' },
              ].map(s => (
                <div key={s.label} className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ color: 'var(--text-faint)' }}>{s.label}</p>
                  <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Questions list if available */}
            {detail.questions?.length > 0 && (
              <div className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Quiz Questions ({detail.questions.length})
                </p>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {detail.questions.map((q: any, i: number) => (
                    <div key={q.id ?? i} className="p-3.5 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-xs text-(--text-primary)">
                          <span className="font-mono text-(--brand-gold) mr-1.5">Q{i + 1}.</span>
                          {q.questionText}
                        </p>
                        <Badge variant="glass" className="text-[10px] shrink-0">{q.points ?? 10} pts</Badge>
                      </div>
                      {q.options?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pl-4 border-l-2 border-(--border-default)">
                          {q.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${opt.isCorrect ? 'bg-(--status-success-bg) text-(--status-success) font-semibold' : 'text-(--text-muted)'}`}>
                              {opt.isCorrect ? <Check className="w-3 h-3 text-(--status-success)" /> : <span className="w-3 h-3 text-center font-mono text-[10px]">•</span>}
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent attempts */}
            {detail.attempts?.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>Recent Attempts</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {detail.attempts.slice(0, 20).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p className="font-sans text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.studentName}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'In progress'}
                        </p>
                      </div>
                      <div className="text-right">
                        {a.score !== null && a.score !== undefined ? (
                          <span className="font-mono text-sm font-bold" style={{ color: 'var(--brand-gold)' }}>
                            {a.percentageScore?.toFixed(0) ?? 0}%
                          </span>
                        ) : (
                          <Badge variant="glass" className="text-[10px]">{a.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="font-sans text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            Could not load quiz details.
          </p>
        )}
      </SlidePanel>

      {/* ── Create Quiz Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setFormError(''); }}
        title="New Quiz / Exam"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreate} className="space-y-6 font-sans text-sm max-h-[80vh] overflow-y-auto pr-1">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* Course badge */}
          {selectedClass && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
              <span className="font-mono text-xs font-bold" style={{ color: 'var(--brand-gold)' }}>{selectedClass.course.code}</span>
              <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedClass.course.name} · Section {selectedClass.section}</span>
            </div>
          )}

          {/* Basic Settings */}
          <div className="space-y-4">
            <InpField label="Title" required>
              <input
                required
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Midterm Examination — Data Structures & Algorithms"
                style={inp}
              />
            </InpField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InpField label="Description" hint="Brief overview displayed to students before starting.">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of quiz scope…"
                  style={{ ...inp, resize: 'vertical', minHeight: '60px' }}
                />
              </InpField>

              <InpField label="Instructions" hint="Rules and guidance shown during the exam.">
                <textarea
                  rows={2}
                  value={form.instructions}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  placeholder="You have 30 minutes. All questions are mandatory."
                  style={{ ...inp, resize: 'vertical', minHeight: '60px' }}
                />
              </InpField>
            </div>
          </div>

          {/* Availability window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InpField label="Available From" required>
              <input
                required
                type="datetime-local"
                value={form.availableFrom}
                onChange={e => setForm(f => ({ ...f, availableFrom: e.target.value }))}
                style={{ ...inp, colorScheme: 'dark' }}
              />
            </InpField>
            <InpField label="Available Until" required>
              <input
                required
                type="datetime-local"
                value={form.availableUntil}
                onChange={e => setForm(f => ({ ...f, availableUntil: e.target.value }))}
                style={{ ...inp, colorScheme: 'dark' }}
              />
            </InpField>
          </div>

          {/* Numeric settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InpField label="Duration (min)" required>
              <input
                required
                type="number"
                min={1}
                max={300}
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                style={inp}
              />
            </InpField>
            <InpField label="Total Points">
              <input
                type="number"
                min={1}
                max={1000}
                value={form.totalPoints}
                onChange={e => setForm(f => ({ ...f, totalPoints: e.target.value }))}
                style={inp}
              />
            </InpField>
            <InpField label="Passing Score (%)" hint="0–100">
              <input
                type="number"
                min={0}
                max={100}
                value={form.passingScore}
                onChange={e => setForm(f => ({ ...f, passingScore: e.target.value }))}
                style={inp}
              />
            </InpField>
            <InpField label="Max Attempts">
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxAttempts}
                onChange={e => setForm(f => ({ ...f, maxAttempts: e.target.value }))}
                style={inp}
              />
            </InpField>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Toggle
              checked={form.shuffleQuestions}
              onChange={() => setForm(f => ({ ...f, shuffleQuestions: !f.shuffleQuestions }))}
              label="Shuffle questions"
              hint="Randomize question sequence for each student."
            />
            <Toggle
              checked={form.showResultsImmediately}
              onChange={() => setForm(f => ({ ...f, showResultsImmediately: !f.showResultsImmediately }))}
              label="Show results immediately"
              hint="Display score right after completion."
            />
          </div>

          {/* ── Questions Builder Section ───────────────────────────────────── */}
          <div className="space-y-4 pt-4 border-t border-(--border-subtle)">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-serif font-bold text-base text-(--text-primary) flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-(--brand-gold)" />
                  Quiz Questions &amp; Answers
                </h4>
                <p className="font-sans text-xs text-(--text-faint)">
                  Configure questions, options, and correct answers ({form.questions.length} questions added)
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.txt,.csv"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5 text-(--brand-gold)" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import File
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={addQuestion}
                >
                  Add Question
                </Button>
              </div>
            </div>

            {/* Question cards list */}
            {form.questions.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-(--border-default) space-y-3">
                <HelpCircle className="w-8 h-8 mx-auto text-(--text-faint)" />
                <p className="text-xs text-(--text-muted)">No questions added yet.</p>
                <div className="flex justify-center gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={addQuestion}>
                    + Create First Question
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {form.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 rounded-2xl border border-(--border-default) bg-(--hover-overlay) space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-(--brand-gold)">
                        Question {qIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-(--text-faint) font-mono">Pts:</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={q.points}
                            onChange={e => updateQuestion(q.id, { points: parseInt(e.target.value, 10) || 1 })}
                            className="w-16 px-2 py-1 rounded-lg text-xs font-mono text-center bg-(--bg-base) border border-(--border-default) text-(--text-primary)"
                          />
                        </div>
                        <select
                          value={q.type}
                          onChange={e => updateQuestion(q.id, { type: e.target.value as any })}
                          className="px-2.5 py-1 rounded-lg text-xs font-sans bg-(--bg-base) border border-(--border-default) text-(--text-primary)"
                        >
                          <option value="MCQ">Multiple Choice</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="FILL_BLANK">Fill in Blank</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                          <option value="ESSAY">Essay</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 rounded-lg text-(--text-muted) hover:text-(--status-danger) transition-colors"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text */}
                    <input
                      type="text"
                      required
                      value={q.questionText}
                      onChange={e => updateQuestion(q.id, { questionText: e.target.value })}
                      placeholder="Type your question statement here…"
                      className="w-full px-3.5 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs font-sans text-(--text-primary) focus:border-(--brand-gold) outline-none"
                    />

                    {/* Options area for MCQ and True/False */}
                    {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                      <div className="space-y-2 pt-1 pl-2 border-l-2 border-(--border-subtle)">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase text-(--text-faint)">
                            Options (Check green for correct answer)
                          </span>
                          {q.type === 'MCQ' && (
                            <button
                              type="button"
                              onClick={() => addOption(q.id)}
                              className="text-[11px] font-sans font-semibold text-(--brand-gold) hover:underline"
                            >
                              + Add Option
                            </button>
                          )}
                        </div>

                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateOption(q.id, oIdx, opt.text, true)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${opt.isCorrect ? 'bg-(--status-success) border-transparent text-white' : 'border-(--border-default) bg-(--bg-base) text-transparent hover:border-(--brand-gold)'}`}
                              title={opt.isCorrect ? 'Correct Answer' : 'Mark as Correct'}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="text"
                              required
                              value={opt.text}
                              onChange={e => updateOption(q.id, oIdx, e.target.value)}
                              placeholder={`Option ${oIdx + 1}`}
                              className="flex-1 px-3 py-1.5 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:border-(--brand-gold) outline-none"
                            />
                            {q.type === 'MCQ' && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(q.id, oIdx)}
                                className="text-(--text-muted) hover:text-(--status-danger) p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => { setCreateOpen(false); setFormError(''); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="flex-1"
              disabled={formSaving}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {formSaving ? 'Creating…' : 'Create Quiz'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
