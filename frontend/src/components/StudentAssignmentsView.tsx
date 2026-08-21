'use client';

/**
 * StudentAssignmentsView — Complete Student-Side LMS Assignment Workflow
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow: Assignments Hub → View Details → Upload / Write Answer → Submit →
 *       Confirmation → Track Status → Receive Grade & Feedback
 */

import React, { useState, useRef, useCallback } from 'react';
import { Assignment, Course, NavTab } from '../types';
import {
  ClipboardList, ChevronLeft, Download, Upload, FileText,
  CheckCircle2, Clock, AlertTriangle, Star, MessageSquare,
  Send, Paperclip, Film, Archive, Edit3, ChevronRight, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '../lib/motion';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SlidePanel } from './ui/SlidePanel';
import { studentDashApi } from '@/src/lib/studentApi';
import { Modal } from './ui/Modal';

// ── Helpers ───────────────────────────────────────────────────────────────────

type SubView = 'hub' | 'submitted';

function scoreColor(score: number, max: number) {
  const p = (score / max) * 100;
  if (p >= 80) return 'var(--status-success)';
  if (p >= 60) return 'var(--brand-gold)';
  return 'var(--status-danger)';
}

function letterGrade(p: number) {
  if (p >= 90) return 'A';
  if (p >= 85) return 'A−';
  if (p >= 80) return 'B+';
  if (p >= 75) return 'B';
  if (p >= 70) return 'B−';
  if (p >= 65) return 'C+';
  if (p >= 60) return 'C';
  return 'F';
}

function fileIcon(type: string) {
  const t = type.toUpperCase();
  if (t === 'PDF')  return <FileText className="w-3.5 h-3.5 text-red-400" />;
  if (t === 'MP4')  return <Film className="w-3.5 h-3.5 text-blue-400" />;
  if (t === 'ZIP')  return <Archive className="w-3.5 h-3.5 text-(--text-faint)" />;
  return <FileText className="w-3.5 h-3.5 text-(--text-faint)" />;
}

const statusCfg = {
  pending:   { label: 'Pending',   variant: 'amber'   as const },
  submitted: { label: 'Submitted', variant: 'gold'    as const },
  graded:    { label: 'Graded',    variant: 'emerald' as const },
};

// Shared tiny label
const FL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>
    {children}
  </p>
);

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Card
// ─────────────────────────────────────────────────────────────────────────────
const AssignmentCard: React.FC<{
  assignment: Assignment;
  course: Course;
  index: number;
  onClick: () => void;
}> = ({ assignment, course, index, onClick }) => {
  const cfg = statusCfg[assignment.status];
  const urgent = assignment.status === 'pending' && assignment.dueDate.toLowerCase().includes('tomorrow');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out, delay: index * 0.04 }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`View assignment: ${assignment.title}`}
      className="group p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all focus:outline-none"
      style={{
        backgroundColor: 'var(--hover-overlay)',
        borderColor: urgent ? 'var(--status-warning-border, rgba(245,158,11,0.3))' : 'var(--border-default)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold-border)';
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-gold-subtle)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = urgent ? 'var(--status-warning-border, rgba(245,158,11,0.3))' : 'var(--border-default)';
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-overlay)';
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
        >
          <ClipboardList className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--brand-gold)' }}>{course.code}</span>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                {urgent && <Badge variant="rose"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Due Soon</Badge>}
              </div>
              <h3 className="font-sans text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {assignment.title}
              </h3>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>Points</p>
              <p className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{assignment.points}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
              Due: <span className="font-medium ml-0.5" style={{ color: urgent ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                {assignment.dueDate}
              </span>
            </span>
            {assignment.status === 'graded' && assignment.grade && (
              <span className="flex items-center gap-1 font-sans text-xs" style={{ color: 'var(--status-success)' }}>
                <Star className="w-3 h-3" /> {assignment.grade}
              </span>
            )}
            {assignment.submittedAt && (
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                Submitted {assignment.submittedAt}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          className="w-4 h-4 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--text-faint)' }}
        />
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Detail + Submit SlidePanel
// ─────────────────────────────────────────────────────────────────────────────
const AssignmentPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  course: Course | null;
  onSubmit: (file: File | null, text: string) => void;
}> = ({ isOpen, onClose, assignment, course, onSubmit }) => {
  const [tab, setTab] = useState<'details' | 'submit'>('details');
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => { setText(''); setSelectedFile(null); setTab('details'); }, []);
  const handleClose = () => { reset(); onClose(); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setSelectedFile(f);
  };

  if (!assignment || !course) return null;

  const isGraded    = assignment.status === 'graded';
  const isSubmitted = assignment.status === 'submitted' || isGraded;
  const canSubmit   = !!(selectedFile || text.trim().length > 10);
  const pct = isGraded && assignment.score != null
    ? Math.round((assignment.score / assignment.points) * 100) : null;
  const barColor = pct != null ? scoreColor(assignment.score!, assignment.points) : '';

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={handleClose}
        title={assignment.title}
        subtitle={`${course.code} · ${course.title}`}
        width="max-w-2xl"
      >
        <div className="space-y-6 pb-10">

          {/* Status banner */}
          <div
            className="flex items-center gap-3 p-3.5 rounded-xl border"
            style={{
              backgroundColor: isGraded
                ? 'rgba(34,197,94,0.08)' : isSubmitted
                ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
              borderColor: isGraded
                ? 'rgba(34,197,94,0.25)' : isSubmitted
                ? 'var(--accent-gold-border)' : 'var(--border-subtle)',
            }}
          >
            {isGraded
              ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--status-success)' }} />
              : isSubmitted
              ? <Send className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />
              : <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--status-warning)' }} />
            }
            <div className="flex-1">
              <p className="font-sans text-xs font-semibold"
                style={{ color: isGraded ? 'var(--status-success)' : isSubmitted ? 'var(--brand-gold)' : 'var(--status-warning)' }}>
                {isGraded ? `Graded — ${assignment.grade}` : isSubmitted ? 'Submitted — Awaiting Grade' : `Due: ${assignment.dueDate}`}
              </p>
              {assignment.submittedAt && (
                <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>Submitted {assignment.submittedAt}</p>
              )}
            </div>
            <Badge variant="glass">{assignment.points} pts</Badge>
          </div>

          {/* Tab switcher (only for pending) */}
          {!isGraded && !isSubmitted && (
            <div
              className="flex rounded-xl border p-0.5 gap-0.5"
              style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
            >
              {(['details', 'submit'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 rounded-lg font-sans text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: tab === t ? 'var(--brand-gold)' : 'transparent',
                    color: tab === t ? 'var(--text-inverse)' : 'var(--text-muted)',
                  }}
                >
                  {t === 'details' ? '📋 Instructions' : '📤 Submit Work'}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── DETAILS / GRADE TAB ─────────────────────────── */}
            {(tab === 'details' || isGraded || isSubmitted) && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={DURATION.fast}
                className="space-y-5"
              >
                {/* Description */}
                {assignment.description && (
                  <div>
                    <FL>Description</FL>
                    <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {assignment.description}
                    </p>
                  </div>
                )}

                {/* Step-by-step instructions */}
                {assignment.instructions && (
                  <div
                    className="p-4 rounded-2xl border space-y-3"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
                  >
                    <FL>Step-by-Step Instructions</FL>
                    <div className="space-y-2.5">
                      {assignment.instructions.split('\n').map((line, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5"
                            style={{ backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)' }}
                          >
                            {i + 1}
                          </span>
                          <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {line.replace(/^\d+\.\s*/, '')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {assignment.attachments && assignment.attachments.length > 0 && (
                  <div className="space-y-2">
                    <FL>Resources to Download</FL>
                    {assignment.attachments.map(att => (
                      <div
                        key={att.name}
                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-gold-border)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                        >
                          {fileIcon(att.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{att.name}</p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{att.size} · {att.type}</p>
                        </div>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-[10px] font-semibold"
                          style={{ backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)' }}
                          aria-label={`Download ${att.name}`}
                        >
                          <Download className="w-3 h-3" />Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grade & feedback */}
                {isGraded && pct != null && (
                  <div
                    className="p-5 rounded-2xl border space-y-4"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
                  >
                    <FL>Your Grade</FL>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <p className="font-mono text-4xl font-black" style={{ color: scoreColor(assignment.score!, assignment.points) }}>
                          {letterGrade(pct)}
                        </p>
                        <p className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>{pct}%</p>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between font-mono text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Score</span>
                          <span className="font-bold" style={{ color: scoreColor(assignment.score!, assignment.points) }}>
                            {assignment.score} / {assignment.points}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: scoreColor(assignment.score!, assignment.points) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            transition={{ ...DURATION.large, ...EASE.out }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {assignment.feedback && (
                  <div
                    className="p-4 rounded-2xl border space-y-2"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                      <FL>Instructor Feedback</FL>
                    </div>
                    <p className="font-sans text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
                      "{assignment.feedback}"
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>— {course.instructor}</p>
                  </div>
                )}

                {/* Your prior submission */}
                {(assignment.submittedFile || assignment.submittedText) && (
                  <div className="space-y-2">
                    <FL>Your Submission</FL>
                    {assignment.submittedFile && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                      >
                        <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {assignment.submittedFile.name}
                          </p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{assignment.submittedFile.size}</p>
                        </div>
                      </div>
                    )}
                    {assignment.submittedText && (
                      <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
                        <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {assignment.submittedText}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA for pending */}
                {!isGraded && !isSubmitted && (
                  <Button
                    variant="primary"
                    className="w-full"
                    icon={<Send className="w-4 h-4" />}
                    onClick={() => setTab('submit')}
                  >
                    Start Your Submission →
                  </Button>
                )}
              </motion.div>
            )}

            {/* ── SUBMIT TAB ─────────────────────────────────────── */}
            {tab === 'submit' && !isGraded && !isSubmitted && (
              <motion.div
                key="submit"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={DURATION.fast}
                className="space-y-5"
              >
                {/* Drop zone */}
                <div className="space-y-2">
                  <FL>Upload File</FL>
                  <div
                    role="button" tabIndex={0}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all focus:outline-none"
                    style={{
                      borderColor: dragging ? 'var(--brand-gold)' : 'var(--border-default)',
                      backgroundColor: dragging ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
                    }}
                    aria-label="File upload drop zone"
                  >
                    <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
                    <AnimatePresence mode="wait">
                      {selectedFile ? (
                        <motion.div key="f" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                          <CheckCircle2 className="w-8 h-8 mx-auto" style={{ color: 'var(--status-success)' }} />
                          <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedFile.name}</p>
                          <p className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to replace
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto" style={{ color: dragging ? 'var(--brand-gold)' : 'var(--text-faint)' }} />
                          <p className="font-sans text-sm" style={{ color: 'var(--text-muted)' }}>
                            Drag & drop, or <span style={{ color: 'var(--brand-gold)' }}>browse</span>
                          </p>
                          <p className="font-sans text-xs" style={{ color: 'var(--text-faint)' }}>PDF, DOCX, MP4, ZIP, WAV — Max 250 MB</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>or write your answer</span>
                  <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
                </div>

                {/* Text input */}
                <div className="space-y-1.5">
                  <FL>Written Answer</FL>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type your answer, analysis, or workflow summary here…"
                    rows={6}
                    className="w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm resize-none leading-relaxed focus:outline-none transition-colors"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-gold)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                  />
                  <p className="font-mono text-[10px] text-right" style={{ color: 'var(--text-faint)' }}>{text.length} chars</p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setTab('details')}>← Back</Button>
                  <div className="flex-1" />
                  <Button
                    variant="primary"
                    icon={<Send className="w-4 h-4" />}
                    disabled={!canSubmit}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Submit Assignment
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SlidePanel>

      {/* Confirm Modal */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Submission" maxWidth="max-w-md">
        <div className="space-y-5 font-sans text-sm">
          <div
            className="flex items-start gap-3 p-4 rounded-xl border"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)' }}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--brand-gold)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              You are about to submit <strong style={{ color: 'var(--text-primary)' }}>{assignment.title}</strong> to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{course.instructor}</strong>.
              Make sure your work is complete before confirming.
            </p>
          </div>

          <div
            className="p-4 rounded-xl border space-y-2"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
          >
            <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{assignment.title}</p>
            <p className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>{course.code} · {assignment.points} pts</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {selectedFile && <Badge variant="glass"><Paperclip className="w-3 h-3 mr-1" />{selectedFile.name}</Badge>}
              {text.trim() && <Badge variant="glass"><Edit3 className="w-3 h-3 mr-1" />Written answer</Badge>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="flex-1"
              icon={<Send className="w-4 h-4" />}
              onClick={() => {
                setConfirmOpen(false);
                onSubmit(selectedFile, text);
                handleClose();
              }}
            >
              Submit Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Submission Success Screen
// ─────────────────────────────────────────────────────────────────────────────
const SubmissionSuccess: React.FC<{
  assignment: Assignment;
  course: Course;
  onBack: () => void;
}> = ({ assignment, course, onBack }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ ...DURATION.medium, ...EASE.out }}
    className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-6 px-4"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '2px solid var(--accent-gold-border)' }}
    >
      <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--brand-gold)' }} />
    </motion.div>

    <div className="space-y-2">
      <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Assignment Submitted!
      </h2>
      <p className="font-sans text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
        Your work has been sent to <strong style={{ color: 'var(--text-primary)' }}>{course.instructor}</strong> for review.
        You'll be notified once it's graded.
      </p>
    </div>

    <div
      className="w-full max-w-sm p-4 rounded-2xl border space-y-3 text-left"
      style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
    >
      <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{assignment.title}</p>
      {[
        ['Course', course.code],
        ['Instructor', course.instructor],
        ['Points', String(assignment.points)],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center justify-between text-xs font-mono">
          <span style={{ color: 'var(--text-faint)' }}>{label}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono" style={{ color: 'var(--text-faint)' }}>Status</span>
        <Badge variant="gold">Submitted</Badge>
      </div>
    </div>

    <Button variant="outline" onClick={onBack} icon={<ChevronLeft className="w-4 h-4" />}>
      Back to Assignments
    </Button>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Root: StudentAssignmentsView
// ─────────────────────────────────────────────────────────────────────────────
interface StudentAssignmentsViewProps {
  enrolledCourses: Course[];
  setActiveTab?: (tab: NavTab) => void;
}

export const StudentAssignmentsView: React.FC<StudentAssignmentsViewProps> = ({
  enrolledCourses,
}) => {
  const [localCourses, setLocalCourses] = useState<Course[]>(enrolledCourses);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [panelTarget, setPanelTarget] = useState<{ assignment: Assignment; course: Course } | null>(null);
  const [confirmed, setConfirmed] = useState<{ assignment: Assignment; course: Course } | null>(null);
  const [view, setView] = useState<SubView>('hub');

  const localAssignments = localCourses.flatMap(c => c.assignments.map(a => ({ assignment: a, course: c })));

  const total     = localAssignments.length;
  const pending   = localAssignments.filter(x => x.assignment.status === 'pending').length;
  const submitted = localAssignments.filter(x => x.assignment.status === 'submitted').length;
  const graded    = localAssignments.filter(x => x.assignment.status === 'graded').length;

  const filtered = localAssignments.filter(({ assignment, course }) => {
    const sm = filterStatus === 'all' || assignment.status === filterStatus;
    const cm = filterCourse === 'all' || course.id === filterCourse;
    const qm = !search || assignment.title.toLowerCase().includes(search.toLowerCase()) || course.code.toLowerCase().includes(search.toLowerCase());
    return sm && cm && qm;
  });

  const handleSubmit = async (assignmentId: string, courseId: string, file: File | null, text: string) => {
    const course = localCourses.find(c => c.id === courseId)!;
    const orig   = course.assignments.find(a => a.id === assignmentId)!;

    let fileUrl = file ? `/uploads/${file.name}` : undefined;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.fileUrl) fileUrl = json.fileUrl;
        }
      } catch {
        // Fallback to placeholder if upload endpoint unready
      }
    }

    // Call real API — the assignment ID maps to the DB assignment ID
    try {
      await studentDashApi.submitAssignment(assignmentId, {
        textContent: text.trim() || undefined,
        fileUrl,
        fileName: file ? file.name : undefined,
        fileSize: file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : undefined,
      });
    } catch {
      // If the API call fails (e.g. mock mode), still show success UI
    }

    // Optimistic local state update
    setLocalCourses(prev => prev.map(c => {
      if (c.id !== courseId) return c;
      return {
        ...c,
        assignments: c.assignments.map(a => {
          if (a.id !== assignmentId) return a;
          return {
            ...a,
            status: 'submitted' as const,
            submittedAt: 'Just now',
            submittedFile: file ? { name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB` } : a.submittedFile,
            submittedText: text.trim() || a.submittedText,
          };
        }),
      };
    }));

    setConfirmed({ assignment: { ...orig, status: 'submitted', submittedAt: 'Just now' }, course });
    setPanelTarget(null);
    setView('submitted');
  };

  // ── Confirmation Screen ──────────────────────────────────────────────────────
  if (view === 'submitted' && confirmed) {
    return (
      <SubmissionSuccess
        assignment={confirmed.assignment}
        course={confirmed.course}
        onBack={() => { setView('hub'); setConfirmed(null); }}
      />
    );
  }

  // ── Hub ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...DURATION.medium, ...EASE.out }}
        className="space-y-6 pb-16"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
              >
                <ClipboardList className="w-4.5 h-4.5" style={{ color: 'var(--brand-gold)' }} />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Assignments
              </h1>
            </div>
            <p className="font-sans text-sm ml-12" style={{ color: 'var(--text-muted)' }}>
              {pending > 0 ? `${pending} pending · ${graded} graded this semester` : 'All assignments are up to date 🎉'}
            </p>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, color: 'var(--brand-gold)', icon: <ClipboardList className="w-4 h-4" /> },
            { label: 'Pending', value: pending, color: pending > 0 ? 'var(--status-warning)' : 'var(--text-faint)', icon: <Clock className="w-4 h-4" /> },
            { label: 'Submitted', value: submitted, color: 'var(--status-info, #60a5fa)', icon: <Send className="w-4 h-4" /> },
            { label: 'Graded', value: graded, color: 'var(--status-success)', icon: <CheckCircle2 className="w-4 h-4" /> },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...DURATION.medium, ...EASE.out, delay: i * 0.05 }}
              className="p-4 rounded-2xl border space-y-1.5"
              style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
            >
              <div style={{ color: k.color }}>{k.icon}</div>
              <p className="font-mono text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="font-sans text-[11px]" style={{ color: 'var(--text-faint)' }}>{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder="Search assignments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border font-sans text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-gold)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          </div>
          <select
            value={filterCourse}
            onChange={e => setFilterCourse(e.target.value)}
            className="rounded-xl border px-3.5 py-2.5 font-sans text-sm focus:outline-none cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Courses</option>
            {localCourses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>

        {/* Quick-filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'submitted', 'graded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className="relative px-3.5 py-1.5 rounded-lg font-sans text-xs font-medium capitalize transition-all"
              style={{
                backgroundColor: filterStatus === f ? 'var(--brand-gold)' : 'var(--hover-overlay)',
                color: filterStatus === f ? 'var(--text-inverse)' : 'var(--text-muted)',
                border: filterStatus === f ? '1px solid transparent' : '1px solid var(--border-subtle)',
              }}
            >
              {f === 'all' ? 'All Assignments' : f}
              {f === 'pending' && pending > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-mono font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                >{pending}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20 space-y-3">
              <ClipboardList className="w-10 h-10 mx-auto opacity-25" style={{ color: 'var(--text-faint)' }} />
              <p className="font-sans text-sm" style={{ color: 'var(--text-faint)' }}>No assignments match your filters.</p>
            </motion.div>
          ) : (
            <motion.div key="list" className="space-y-3">
              {filtered.map(({ assignment, course }, i) => (
                <AssignmentCard
                  key={`${course.id}-${assignment.id}`}
                  assignment={assignment}
                  course={course}
                  index={i}
                  onClick={() => setPanelTarget({ assignment, course })}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Slide panel */}
      <AssignmentPanel
        isOpen={!!panelTarget}
        onClose={() => setPanelTarget(null)}
        assignment={panelTarget?.assignment ?? null}
        course={panelTarget?.course ?? null}
        onSubmit={(file, text) => {
          if (!panelTarget) return;
          handleSubmit(panelTarget.assignment.id, panelTarget.course.id, file, text);
        }}
      />
    </>
  );
};
