'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  ClipboardCheck, Plus, Search, ChevronDown, RefreshCw,
  FileText, CheckCircle2, Clock, AlertTriangle, Eye,
  Save, Upload, X, Paperclip, Trash2, Download,
} from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { Card }           from '../../ui/Card';
import { Modal }          from '../../ui/Modal';
import { SlidePanel }     from '../../ui/SlidePanel';
import { Input }          from '../../ui/Input';
import { SkeletonPage, EmptyState, InlineError } from '../../ui/States';
import {
  instructorClassesApi,
  instructorAssignmentsApi,
  type ClassOffering,
  type AssignmentSummary,
  type AssignmentDetail,
} from '../../../lib/instructorApi';

// ── The exact className pattern used by every other admin/registrar view ──────
const rawInputCls =
  'w-full px-3.5 py-2.5 bg-(--bg-base) border border-(--border-default) rounded-xl text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors placeholder:text-(--text-faint) font-sans';
const rawTextareaCls =
  'w-full px-3.5 py-2.5 bg-(--bg-base) border border-(--border-default) rounded-xl text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors placeholder:text-(--text-faint) font-sans resize-vertical';

// ── Status helpers ────────────────────────────────────────────────────────────
const statusBadge = (s: string) => {
  if (s === 'PUBLISHED') return { variant: 'emerald' as const, label: 'Published' };
  if (s === 'DRAFT')     return { variant: 'glass'   as const, label: 'Draft'     };
  if (s === 'CLOSED')    return { variant: 'amber'   as const, label: 'Closed'    };
  return { variant: 'glass' as const, label: s };
};

const subStatusBadge = (s: string) => {
  if (s === 'GRADED')    return { variant: 'emerald' as const, label: 'Graded'    };
  if (s === 'SUBMITTED') return { variant: 'gold'    as const, label: 'Submitted' };
  if (s === 'LATE')      return { variant: 'amber'   as const, label: 'Late'      };
  if (s === 'RETURNED')  return { variant: 'glass'   as const, label: 'Returned'  };
  return { variant: 'glass' as const, label: s };
};

function humanSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface AttachedFile { name: string; size: number; url: string; type: string }

interface CreateForm {
  title:           string;
  description:     string;
  instructions:    string;
  dueDate:         string;
  totalPoints:     string;
  allowLateSubmit: boolean;
  attachments:     AttachedFile[];
}

function getDefaultDueDate(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

const EMPTY_FORM: CreateForm = {
  title: '', description: '', instructions: '',
  dueDate: getDefaultDueDate(7), totalPoints: '100',
  allowLateSubmit: false, attachments: [],
};

const FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.mp4,.jpg,.jpeg,.png';

export interface InAssignmentsViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

// ─────────────────────────────────────────────────────────────────────────────
export const InAssignmentsView: React.FC<InAssignmentsViewProps> = ({ programType }) => {
  const [classes,          setClasses]         = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [assignments,      setAssignments]     = useState<AssignmentSummary[]>([]);
  const [search,           setSearch]          = useState('');
  const [loading,          setLoading]         = useState(true);
  const [listError,        setListError]       = useState<string | null>(null);

  // Detail panel
  const [detailId,      setDetailId]      = useState<string | null>(null);
  const [detail,        setDetail]        = useState<AssignmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Grading
  const [gradingSubId,  setGradingSubId]  = useState<string | null>(null);
  const [gradeScore,    setGradeScore]    = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeSaving,   setGradeSaving]  = useState(false);
  const [gradeError,    setGradeError]   = useState('');

  // Create
  const [createOpen,  setCreateOpen]  = useState(false);
  const [form,        setForm]        = useState<CreateForm>(EMPTY_FORM);
  const [formSaving,  setFormSaving]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [uploadErr,   setUploadErr]   = useState('');
  const [dragOver,    setDragOver]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load classes ─────────────────────────────────────────────────────────
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
      .catch(e => setListError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [programType]);

  // ── Load assignments ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setListError(null);
    try {
      setAssignments(await instructorAssignmentsApi.list(selectedOffering || undefined));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load assignments');
    } finally { setLoading(false); }
  }, [selectedOffering]);

  useEffect(() => { if (selectedOffering) load(); }, [selectedOffering, load]);

  // ── Load detail ───────────────────────────────────────────────────────────
  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const d = await instructorAssignmentsApi.get(id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true); setUploadErr('');
    const added: AttachedFile[] = [];
    let firstFileName = '';

    for (const file of Array.from(files)) {
      if (!firstFileName) firstFileName = file.name;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).error ?? 'Upload failed');
        }
        const { fileUrl } = await res.json();
        added.push({ name: file.name, size: file.size, url: fileUrl, type: file.name.split('.').pop()?.toUpperCase() ?? 'FILE' });
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : 'File upload failed');
      }
    }

    if (added.length) {
      setForm(f => {
        const baseName = firstFileName.replace(/\.[^/.]+$/, '');
        return {
          ...f,
          title: f.title.trim() ? f.title : baseName,
          description: f.description.trim() ? f.description : `Assignment document: ${firstFileName}`,
          instructions: f.instructions.trim() ? f.instructions : `Please download and complete the instructions provided in ${firstFileName}.`,
          attachments: [...f.attachments, ...added],
        };
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffering) return;
    if (!form.title.trim())        { setFormError('Title is required.');         return; }
    if (!form.description.trim())  { setFormError('Description is required.');   return; }
    if (!form.instructions.trim()) { setFormError('Instructions are required.');  return; }
    if (!form.dueDate) { setFormError('Due date is required.'); return; }
    const dVal = new Date(form.dueDate);
    if (isNaN(dVal.getTime())) { setFormError('Please enter a valid due date & time.'); return; }

    setFormSaving(true); setFormError('');
    try {
      await instructorAssignmentsApi.create({
        courseOfferingId: selectedOffering,
        title:            form.title.trim(),
        description:      form.description.trim(),
        instructions:     form.instructions.trim(),
        dueDate:          dVal.toISOString(),
        totalPoints:      parseInt(form.totalPoints, 10) || 100,
        allowLateSubmit:  form.allowLateSubmit,
        attachments:      form.attachments,
      });
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM, dueDate: getDefaultDueDate(7) });
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create assignment');
    } finally { setFormSaving(false); }
  };

  // ── Publish toggle ────────────────────────────────────────────────────────
  const togglePublish = async (a: AssignmentSummary) => {
    try {
      await instructorAssignmentsApi.update(a.id, { status: a.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT' });
      load();
    } catch (e) { setListError(e instanceof Error ? e.message : 'Update failed'); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    try { await instructorAssignmentsApi.delete(id); load(); }
    catch (e) { setListError(e instanceof Error ? e.message : 'Delete failed'); }
  };

  // ── Grade submission ──────────────────────────────────────────────────────
  const handleGrade = async (submissionId: string) => {
    const score = parseFloat(gradeScore);
    if (isNaN(score) || score < 0) { setGradeError('Enter a valid score.'); return; }
    if (detail && score > detail.totalPoints) {
      setGradeError(`Score cannot exceed ${detail.totalPoints}.`); return;
    }
    setGradeSaving(true); setGradeError('');
    try {
      await instructorAssignmentsApi.gradeSubmission(submissionId, {
        score, feedback: gradeFeedback.trim() || undefined,
      });
      setGradingSubId(null); setGradeScore(''); setGradeFeedback('');
      if (detailId) setDetail(await instructorAssignmentsApi.get(detailId));
    } catch (e) {
      setGradeError(e instanceof Error ? e.message : 'Grading failed');
    } finally { setGradeSaving(false); }
  };

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return !q || a.title.toLowerCase().includes(q) || a.courseCode.toLowerCase().includes(q);
  });

  const selectedClass = classes.find(c => c.id === selectedOffering);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      {/* Header */}
      <DHPageHeader
        title="Assignments"
        subtitle={selectedClass ? `${selectedClass.course.code} · ${assignments.length} assignments` : `${assignments.length} assignments`}
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>
            {selectedOffering && (
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(EMPTY_FORM); setFormError(''); setUploadErr(''); setCreateOpen(true); }}>
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
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs focus:outline-none bg-(--bg-base) border border-(--border-default) text-(--text-primary)"
            >
              <option value="">All Courses</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.course.code} — Section {c.section}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-(--text-faint)" />
          </div>
        )}
        <div className="flex-1 min-w-[180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-(--text-faint)" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assignments…"
              className={`${rawInputCls} pl-9`}
            />
          </div>
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="text-(--text-faint) hover:text-(--text-primary) transition-colors" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {listError && <InlineError message={listError} onRetry={load} />}

      {/* Grid */}
      {loading ? (
        <SkeletonPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="default"
          title={search ? `No results for "${search}"` : 'No assignments yet'}
          description={search ? 'Try a different search term.' : 'Create your first assignment for this class.'}
          action={selectedOffering ? { label: 'Create Assignment', onClick: () => { setForm(EMPTY_FORM); setCreateOpen(true); }, icon: <Plus className="w-4 h-4" /> } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const sb     = statusBadge(a.status);
            const isPast = new Date(a.dueDate) < new Date();
            return (
              <Card key={a.id} hoverable className="space-y-4 flex flex-col">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-(--brand-gold)">{a.courseCode}</span>
                    <Badge variant={sb.variant} className="text-[10px]">{sb.label}</Badge>
                    {isPast && a.status !== 'CLOSED' && <Badge variant="rose" className="text-[10px]">Past Due</Badge>}
                    {a.attachmentCount > 0 && (
                      <span className="flex items-center gap-0.5 font-mono text-[10px] text-(--text-faint)">
                        <Paperclip className="w-2.5 h-2.5" />{a.attachmentCount}
                      </span>
                    )}
                  </div>
                  <h3 className="font-sans text-sm font-bold text-(--text-primary) leading-snug">{a.title}</h3>
                  <p className="font-sans text-xs text-(--text-muted) mt-1 line-clamp-2">{a.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                    <p className="font-mono text-base font-bold text-(--text-primary)">{a.totalPoints}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">Points</p>
                  </div>
                  <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                    <p className="font-mono text-base font-bold text-(--brand-gold)">{a.submissionCount}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">Submissions</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: isPast ? 'var(--status-danger)' : 'var(--text-faint)' }} />
                  <span style={{ color: isPast ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                    Due {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap mt-auto pt-1">
                  <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => { setDetailId(a.id); setGradingSubId(null); }}>
                    Submissions
                  </Button>
                  {a.status === 'DRAFT' && <Button variant="primary" size="sm" onClick={() => togglePublish(a)}>Publish</Button>}
                  {a.status === 'PUBLISHED' && <Button variant="secondary" size="sm" onClick={() => togglePublish(a)}>Unpublish</Button>}
                  {a.status === 'DRAFT' && (
                    <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(a.id)}>Delete</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Submissions Panel ───────────────────────────────────────────── */}
      <SlidePanel
        isOpen={!!detailId}
        onClose={() => { setDetailId(null); setGradingSubId(null); setGradeError(''); }}
        title={detail?.title ?? 'Submissions'}
        subtitle={detail ? `${detail.stats.total} submissions · ${detail.stats.ungraded} ungraded` : ''}
        width="max-w-xl"
      >
        {detailLoading ? <SkeletonPage /> : detail ? (
          <div className="space-y-5 text-sm font-sans">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Total',    v: detail.stats.total,    c: 'text-(--text-primary)'   },
                { l: 'Graded',   v: detail.stats.graded,   c: 'text-(--status-success)' },
                { l: 'Ungraded', v: detail.stats.ungraded, c: detail.stats.ungraded > 0 ? 'text-(--status-warning)' : 'text-(--text-faint)' },
                { l: 'Points',   v: detail.totalPoints,    c: 'text-(--brand-gold)'     },
              ].map(s => (
                <div key={s.l} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className={`font-mono text-xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Attachment links */}
            {detail.attachments.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-2">Assignment Files</p>
                <div className="space-y-1.5">
                  {detail.attachments.map(att => (
                    <a key={att.id} href={att.fileUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) hover:bg-(--active-overlay) transition-colors">
                      <FileText className="w-4 h-4 text-(--status-danger) shrink-0" />
                      <span className="font-sans text-xs text-(--text-secondary) flex-1 truncate">{att.fileName}</span>
                      <span className="font-mono text-[10px] text-(--text-faint) shrink-0">{att.fileSize}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Submissions */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-3">Student Submissions</p>
              {detail.submissions.length === 0 ? (
                <p className="text-sm text-(--text-faint) py-8 text-center">No submissions yet.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {detail.submissions.map(sub => {
                    const sb        = subStatusBadge(sub.status);
                    const isGrading = gradingSubId === sub.id;
                    return (
                      <div key={sub.id} className="p-3.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{sub.studentName}</p>
                            <p className="font-mono text-[10px] text-(--text-faint)">
                              {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {sub.isLate && <span className="ml-2 text-(--status-warning)"> Late</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {sub.score !== null
                              ? <span className="font-mono text-sm font-bold text-(--brand-gold)">{sub.score}/{detail.totalPoints}</span>
                              : <Badge variant={sb.variant} className="text-[10px]">{sb.label}</Badge>
                            }
                            <Button variant="secondary" size="sm"
                              onClick={() => {
                                if (isGrading) { setGradingSubId(null); }
                                else { setGradingSubId(sub.id); setGradeScore(sub.score !== null ? String(sub.score) : ''); setGradeFeedback(sub.feedback ?? ''); setGradeError(''); }
                              }}>
                              {isGrading ? 'Cancel' : sub.score !== null ? 'Re-grade' : 'Grade'}
                            </Button>
                          </div>
                        </div>

                        {/* Student submitted file & text response */}
                        {(sub.fileName || sub.textContent) && (
                          <div className="p-2.5 rounded-lg bg-(--bg-base) border border-(--border-subtle) space-y-1.5 text-xs">
                            {sub.fileName && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-sans font-medium text-(--text-primary) flex items-center gap-1.5 truncate">
                                  <FileText className="w-3.5 h-3.5 text-(--brand-gold) shrink-0" />
                                  {sub.fileName}
                                  {sub.fileSize && <span className="font-mono text-[10px] text-(--text-faint)">({sub.fileSize})</span>}
                                </span>
                                {sub.fileUrl && (
                                  <a
                                    href={sub.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={sub.fileName}
                                    className="font-mono text-[11px] text-(--brand-gold) hover:underline flex items-center gap-1 shrink-0"
                                  >
                                    <Download className="w-3 h-3" /> View / Download File
                                  </a>
                                )}
                              </div>
                            )}
                            {sub.textContent && (
                              <p className="font-sans text-xs text-(--text-secondary) leading-relaxed pt-1 border-t border-(--border-subtle)">
                                {sub.textContent}
                              </p>
                            )}
                          </div>
                        )}

                        {sub.score !== null && sub.feedback && (
                          <p className="font-sans text-[11px] italic text-(--text-faint) px-1">"{sub.feedback}"</p>
                        )}

                        <AnimatePresence>
                          {isGrading && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="space-y-2 pt-2 border-t border-(--border-subtle)">
                                {gradeError && <p className="text-xs text-(--status-danger)">{gradeError}</p>}
                                <div className="flex gap-2">
                                  <input
                                    type="number" min={0} max={detail.totalPoints}
                                    value={gradeScore}
                                    onChange={e => { setGradeScore(e.target.value); setGradeError(''); }}
                                    placeholder={`0–${detail.totalPoints}`}
                                    className="w-24 px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-sm text-(--text-primary) font-mono text-center focus:outline-none focus:border-(--brand-gold)"
                                    autoFocus
                                    aria-label="Score"
                                  />
                                  <input
                                    type="text"
                                    value={gradeFeedback}
                                    onChange={e => setGradeFeedback(e.target.value)}
                                    placeholder="Feedback (optional)"
                                    className={`flex-1 ${rawInputCls}`}
                                    aria-label="Feedback"
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button variant="primary" size="sm" disabled={!gradeScore || gradeSaving} icon={<Save className="w-3.5 h-3.5" />} onClick={() => handleGrade(sub.id)}>
                                    {gradeSaving ? 'Saving…' : 'Save Grade'}
                                  </Button>
                                </div>
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
          <p className="text-sm text-(--text-muted) text-center py-8">Could not load assignment details.</p>
        )}
      </SlidePanel>

      {/* ── Create Assignment Modal ─────────────────────────────────────── */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); setFormError(''); }} title="New Assignment" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-5">
          {formError && <InlineError message={formError} />}

          {/* Course indicator */}
          {selectedClass && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border)">
              <span className="font-mono text-xs font-bold text-(--brand-gold)">{selectedClass.course.code}</span>
              <span className="font-sans text-xs text-(--text-secondary)">{selectedClass.course.name} · Section {selectedClass.section}</span>
            </div>
          )}

          {/* Title */}
          <Input
            label="Title"
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Midterm Project — Database Design"
          />

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">
              Description <span className="text-(--status-danger)">*</span>
            </label>
            <textarea
              required rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief overview shown in the assignment list…"
              className={rawTextareaCls}
              style={{ minHeight: '64px' }}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">
              Instructions <span className="text-(--status-danger)">*</span>
            </label>
            <textarea
              required rows={4}
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              placeholder={"1. Read the course materials from weeks 1–7.\n2. Complete all questions and show your work.\n3. Submit as a single PDF."}
              className={rawTextareaCls}
              style={{ minHeight: '100px' }}
            />
          </div>

          {/* Due date + points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-sans text-xs font-semibold text-(--text-secondary)">
                Due Date &amp; Time <span className="text-(--status-danger)">*</span>
              </label>
              <input
                required
                type="datetime-local"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className={rawInputCls}
                style={{ colorScheme: 'dark' }}
              />
              <div className="flex gap-1.5 pt-1">
                {[
                  { label: '+3 Days', days: 3 },
                  { label: '+7 Days', days: 7 },
                  { label: '+14 Days', days: 14 },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, dueDate: getDefaultDueDate(p.days) }))}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-(--hover-overlay) border border-(--border-subtle) text-(--text-secondary) hover:text-(--brand-gold) hover:border-(--brand-gold) transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block font-sans text-xs font-semibold text-(--text-secondary)">Total Points</label>
              <input
                type="number" min={1} max={1000}
                value={form.totalPoints}
                onChange={e => setForm(f => ({ ...f, totalPoints: e.target.value }))}
                className={rawInputCls}
              />
            </div>
          </div>

          {/* Late submissions toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
            <input
              type="checkbox"
              checked={form.allowLateSubmit}
              onChange={e => setForm(f => ({ ...f, allowLateSubmit: e.target.checked }))}
              className="w-4 h-4 rounded accent-[#E9C349]"
            />
            <div>
              <p className="font-sans text-sm font-medium text-(--text-primary)">Allow late submissions</p>
              <p className="font-sans text-xs text-(--text-faint)">Students can submit after the due date.</p>
            </div>
          </label>

          {/* ── File Attachments ──────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">
              Attachments
              <span className="ml-1.5 font-normal text-(--text-faint)">(PDF, Word, PowerPoint, Excel, ZIP, images — max 50 MB)</span>
            </label>

            {uploadErr && <p className="text-xs text-(--status-danger)">{uploadErr}</p>}

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${dragOver ? 'border-(--brand-gold) bg-(--accent-gold-subtle)' : 'border-(--border-strong) bg-(--hover-overlay) hover:border-(--brand-gold) hover:bg-(--accent-gold-subtle)'}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
              aria-label="Upload attachment files"
            >
              <input ref={fileRef} type="file" multiple accept={FILE_ACCEPT} className="hidden" onChange={e => uploadFiles(e.target.files)} />

              {uploading ? (
                <div className="space-y-2">
                  <div className="w-8 h-8 border-2 border-t-transparent border-(--brand-gold) rounded-full animate-spin mx-auto" />
                  <p className="font-sans text-sm text-(--text-muted)">Uploading file…</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-(--active-overlay) flex items-center justify-center mx-auto border border-(--border-default)">
                    <Upload className="w-5 h-5 text-(--brand-gold)" />
                  </div>
                  <div>
                    <p className="font-sans text-sm font-semibold text-(--text-primary)">
                      <span className="text-(--brand-gold)">Click to upload</span> or drag &amp; drop
                    </p>
                    <p className="font-mono text-[11px] text-(--text-faint) mt-0.5">
                      PDF · DOCX · PPTX · XLSX · ZIP · MP4 · Images
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Attached file list */}
            {form.attachments.length > 0 && (
              <div className="space-y-1.5">
                {form.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                    <Paperclip className="w-4 h-4 text-(--brand-gold) shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs text-(--text-primary) truncate">{att.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{humanSize(att.size)} · {att.type}</p>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))}
                      className="p-1 rounded-lg text-(--text-muted) hover:text-(--status-danger) transition-colors" aria-label={`Remove ${att.name}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => { setCreateOpen(false); setFormError(''); }}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={formSaving || uploading} icon={<CheckCircle2 className="w-4 h-4" />}>
              {formSaving ? 'Creating…' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
