'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  ClipboardCheck, Plus, ChevronLeft, Search,
  FileText, Film, Archive, Users, CheckCircle2, Clock, AlertTriangle, Eye, Star,
  Upload, X, Paperclip, ToggleLeft, ToggleRight, Save, Send,
  MessageSquare, Download, BookOpen, CalendarDays, HardDrive,
  BarChart2, Edit3, ExternalLink,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { lmsAssignments, assignmentSubmissions, film402StudentIds, film301StudentIds } from '../../../data/instructorData';
import { courses, students } from '../../../data/departmentData';
import type {
  LMSAssignment, AssignmentSubmission, SubmissionStatus,
  SubmissionType, AssignmentStatus,
} from '../../../types/instructor';

// ── Helpers ──────────────────────────────────────────────────────────────────

const statusBadgeMap: Record<AssignmentStatus, { variant: 'emerald' | 'gold' | 'glass' | 'amber'; label: string }> = {
  Published: { variant: 'emerald', label: 'Published' },
  Draft:     { variant: 'glass',   label: 'Draft'     },
  Closed:    { variant: 'amber',   label: 'Closed'    },
};

const subStatusMap: Record<SubmissionStatus, { variant: 'emerald' | 'rose' | 'amber' | 'glass' | 'gold'; label: string }> = {
  'Graded':        { variant: 'emerald', label: 'Graded'        },
  'Submitted':     { variant: 'gold',    label: 'Submitted'     },
  'Late':          { variant: 'amber',   label: 'Late'          },
  'Not Submitted': { variant: 'rose',    label: 'Not Submitted' },
  'Resubmitted':   { variant: 'glass',   label: 'Resubmitted'  },
};

const fileTypeIcon = (type: string) => {
  if (type === 'PDF')  return <FileText className="w-3.5 h-3.5 text-red-400" />;
  if (type === 'MP4')  return <Film className="w-3.5 h-3.5 text-blue-400" />;
  if (type === 'ZIP')  return <Archive className="w-3.5 h-3.5 text-(--text-faint)" />;
  return <FileText className="w-3.5 h-3.5 text-(--text-faint)" />;
};

function scoreColor(score: number, max: number) {
  const p = (score / max) * 100;
  if (p >= 80) return 'text-(--status-success)';
  if (p >= 60) return 'text-(--brand-gold)';
  return 'text-(--status-danger)';
}

function letterGrade(p: number) {
  if (p >= 90) return 'A'; if (p >= 85) return 'A−'; if (p >= 80) return 'B+';
  if (p >= 75) return 'B'; if (p >= 70) return 'B−'; if (p >= 65) return 'C+';
  if (p >= 60) return 'C'; return 'F';
}

// ── Form types ────────────────────────────────────────────────────────────────
interface AssignmentFormState {
  title: string; description: string; instructions: string;
  courseId: string; dueDate: string; dueTime: string;
  maxMarks: string; allowedFileTypes: string[]; maxFileSizeMB: string;
  submissionType: SubmissionType;
  allowLateSubmission: boolean; allowResubmission: boolean;
}
const defaultForm: AssignmentFormState = {
  title: '', description: '', instructions: '', courseId: 'c01',
  dueDate: '', dueTime: '23:59', maxMarks: '100',
  allowedFileTypes: ['PDF'], maxFileSizeMB: '25',
  submissionType: 'File Upload',
  allowLateSubmission: false, allowResubmission: true,
};
const FILE_TYPE_OPTIONS = ['PDF', 'DOCX', 'MP4', 'ZIP', 'MP3', 'PPTX', 'XLSX', 'Other'];
const SUBMISSION_TYPES: SubmissionType[] = ['File Upload', 'Text', 'Both'];

// ── Shared input styles ───────────────────────────────────────────────────────
const inputCls = "w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors placeholder:text-(--text-faint)";
const textareaCls = inputCls + " resize-none leading-relaxed";
const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-1.5">
    {children}{required && <span className="text-(--status-danger) ml-0.5">*</span>}
  </label>
);

// ── AutosaveIndicator ─────────────────────────────────────────────────────────
const AutosaveIndicator: React.FC<{ state: 'idle' | 'saving' | 'saved' }> = ({ state }) => (
  <AnimatePresence mode="wait">
    {state === 'saving' && (
      <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex items-center gap-1.5 font-sans text-xs text-(--text-faint)">
        <motion.div className="w-3 h-3 border-2 border-(--border-strong) border-t-[#E9C349] rounded-full"
          animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
        Saving…
      </motion.span>
    )}
    {state === 'saved' && (
      <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="flex items-center gap-1.5 font-sans text-xs text-(--status-success)">
        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
      </motion.span>
    )}
  </AnimatePresence>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-view 1: Assignment List
// ─────────────────────────────────────────────────────────────────────────────
const AssignmentListView: React.FC<{
  assignments: LMSAssignment[];
  onSelect: (a: LMSAssignment) => void;
  onCreateNew: () => void;
}> = ({ assignments, onSelect, onCreateNew }) => {
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const myCourses = courses.filter(c => c.facultyId === 'f01');
  const totalSubmissions = assignments.reduce((s, a) => s + a.totalSubmissions, 0);
  const pendingGrading = assignments.filter(a => a.totalSubmissions > a.gradedCount && a.status !== 'Draft').length;
  const publishedCount = assignments.filter(a => a.status === 'Published').length;
  const filtered = assignments.filter(a => {
    const cm = filterCourse === 'all' || a.courseId === filterCourse;
    const sm = filterStatus === 'all' || a.status === filterStatus;
    const srch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return cm && sm && srch;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Assignments" subtitle={`${publishedCount} published · ${pendingGrading} need grading`}
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onCreateNew}>Create Assignment</Button>}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: assignments.length, icon: <ClipboardCheck className="w-4 h-4" />, color: 'text-(--brand-gold)' },
          { label: 'Published', value: publishedCount, icon: <Send className="w-4 h-4" />, color: 'text-(--status-success)' },
          { label: 'Submissions', value: totalSubmissions, icon: <Upload className="w-4 h-4" />, color: 'text-(--status-info)' },
          { label: 'Pending Grading', value: pendingGrading, icon: <Clock className="w-4 h-4" />, color: pendingGrading > 0 ? 'text-(--status-warning)' : 'text-(--status-success)' },
        ].map(k => (
          <div key={k.label} className="p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl space-y-2">
            <div className={k.color}>{k.icon}</div>
            <p className={`font-mono text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="font-sans text-[11px] text-(--text-faint)">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input type="text" placeholder="Search assignments…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors placeholder:text-(--text-faint)" />
        </div>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          className="bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors cursor-pointer">
          <option value="all">All Courses</option>
          {myCourses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Assignment Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-(--text-faint) font-sans text-sm">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No assignments found. Adjust your filters or create one.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, idx) => {
            const course = courses.find(c => c.id === a.courseId);
            const enrolledCount = a.courseId === 'c01' ? film402StudentIds.length : film301StudentIds.length;
            const subRate = enrolledCount ? Math.round((a.totalSubmissions / enrolledCount) * 100) : 0;
            const pendingGrade = a.totalSubmissions - a.gradedCount;
            const sb = statusBadgeMap[a.status];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...DURATION.medium, ...EASE.out, delay: idx * 0.04 }}
                onClick={() => onSelect(a)}
                className="group p-4 sm:p-5 bg-(--hover-overlay) border border-(--border-default) rounded-2xl hover:border-(--accent-gold-border) hover:bg-(--accent-gold-subtle)/30 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-(--brand-gold)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-mono text-[10px] font-bold text-(--brand-gold)">{course?.code}</span>
                          <Badge variant={sb.variant}>{sb.label}</Badge>
                          {a.submissionType !== 'File Upload' && <Badge variant="glass">{a.submissionType}</Badge>}
                          {a.allowLateSubmission && <Badge variant="glass">Late OK</Badge>}
                        </div>
                        <h3 className="font-serif text-base font-bold text-(--text-primary) truncate">{a.title}</h3>
                        <p className="font-sans text-xs text-(--text-muted) mt-0.5 line-clamp-1">{a.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs text-(--text-faint)">Max Marks</p>
                        <p className="font-mono text-lg font-bold text-(--text-primary)">{a.maxMarks}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 flex-wrap text-xs font-sans text-(--text-muted)">
                      <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-(--text-faint)" />Due: <span className="text-(--text-secondary) font-medium">{a.dueDate}</span></span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-(--text-faint)" />{a.totalSubmissions} submitted</span>
                      {pendingGrade > 0 && <span className="flex items-center gap-1.5 text-(--status-warning)"><Clock className="w-3.5 h-3.5" />{pendingGrade} need grading</span>}
                      {a.gradedCount > 0 && a.gradedCount === a.totalSubmissions && a.totalSubmissions > 0 && (
                        <span className="flex items-center gap-1.5 text-(--status-success)"><CheckCircle2 className="w-3.5 h-3.5" />All graded</span>
                      )}
                    </div>
                    {a.status !== 'Draft' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint) mb-1">
                          <span>Submission rate</span><span>{subRate}%</span>
                        </div>
                        <div className="h-1.5 bg-(--border-subtle) rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: 'var(--brand-gold)' }}
                            initial={{ width: 0 }} animate={{ width: `${subRate}%` }}
                            transition={{ ...DURATION.large, ...EASE.out, delay: idx * 0.05 }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-view 2: Submission Monitor
// ─────────────────────────────────────────────────────────────────────────────
const SubmissionMonitorView: React.FC<{
  assignment: LMSAssignment;
  submissions: AssignmentSubmission[];
  onBack: () => void;
  onGrade: (sub: AssignmentSubmission, studentName: string) => void;
}> = ({ assignment, submissions, onBack, onGrade }) => {
  const courseStudentIds = assignment.courseId === 'c01' ? film402StudentIds : film301StudentIds;
  const courseStudents = students.filter(s => courseStudentIds.includes(s.id));
  const course = courses.find(c => c.id === assignment.courseId);
  const [filterStatus, setFilterStatus] = useState('all');

  const getSub = useCallback((studentId: string) =>
    submissions.find(s => s.assignmentId === assignment.id && s.studentId === studentId),
    [submissions, assignment.id]);

  const rows = courseStudents.map(s => ({
    student: s,
    sub: getSub(s.id),
    status: (getSub(s.id)?.status ?? 'Not Submitted') as SubmissionStatus,
  }));

  const filtered = rows.filter(r => filterStatus === 'all' || r.status === filterStatus);
  const graded = rows.filter(r => r.status === 'Graded').length;
  const needsGrading = rows.filter(r => ['Submitted', 'Late', 'Resubmitted'].includes(r.status)).length;
  const notSub = rows.filter(r => r.status === 'Not Submitted').length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 font-sans text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors mb-4 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Assignments
        </button>
        <DHPageHeader
          title={assignment.title} subtitle={`${course?.code} · Submission Monitor`}
          icon={<Eye className="w-5 h-5" />}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={statusBadgeMap[assignment.status].variant}>{assignment.status}</Badge>
              <Button variant="secondary" size="sm" icon={<Star className="w-4 h-4" />}
                onClick={() => { const first = rows.find(r => r.sub && r.status !== 'Graded'); if (first?.sub) onGrade(first.sub, first.student.name); }}
                disabled={needsGrading === 0}>
                Grade Next
              </Button>
            </div>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Graded', value: graded, color: 'text-(--status-success)', icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Needs Grading', value: needsGrading, color: needsGrading > 0 ? 'text-(--status-warning)' : 'text-(--text-faint)', icon: <Clock className="w-4 h-4" /> },
          { label: 'Not Submitted', value: notSub, color: notSub > 0 ? 'text-(--status-danger)' : 'text-(--text-faint)', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'Max Marks', value: assignment.maxMarks, color: 'text-(--brand-gold)', icon: <BarChart2 className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</p><p className="font-sans text-[11px] text-(--text-faint)">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Assignment Detail */}
      <div className="p-5 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-1">Description</p>
            <p className="font-sans text-xs text-(--text-secondary) leading-relaxed">{assignment.description}</p>
          </div>
          <div className="space-y-2.5">
            {[
              ['Due Date', assignment.dueDate],
              ['Submission Type', assignment.submissionType],
              ['Late Submissions', assignment.allowLateSubmission ? 'Allowed' : 'Not Allowed'],
              ['Resubmission', assignment.allowResubmission ? 'Allowed' : 'Not Allowed'],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-(--text-faint)">{label}</span>
                <span className={`font-sans text-xs font-medium ${val === 'Allowed' ? 'text-(--status-success)' : val === 'Not Allowed' ? 'text-(--status-danger)' : 'text-(--text-secondary)'}`}>{val}</span>
              </div>
            ))}
            {assignment.attachments.length > 0 && (
              <div>
                <p className="font-mono text-[10px] text-(--text-faint) mb-1.5">Supporting Files</p>
                {assignment.attachments.map(att => (
                  <div key={att.name} className="flex items-center gap-2 text-xs text-(--text-secondary) mb-1">
                    {fileTypeIcon(att.type)}<span className="truncate">{att.name}</span>
                    <span className="font-mono text-[10px] text-(--text-faint) shrink-0">{att.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mr-1">Filter:</p>
        {['all', 'Submitted', 'Late', 'Graded', 'Not Submitted'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all ${filterStatus === f ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) border border-(--border-subtle)'}`}>
            {f === 'all' ? 'All Students' : f}
          </button>
        ))}
      </div>

      {/* Submission Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
        <table className="w-full text-xs font-sans min-w-[680px]">
          <thead className="border-b border-(--border-default)">
            <tr>
              {['Student', 'Status', 'Submitted At', 'Files', 'Score', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {filtered.map(({ student, sub, status }) => {
              const sb = subStatusMap[status];
              return (
                <tr key={student.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={student.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-(--border-default) shrink-0" />
                      <div>
                        <p className="font-semibold text-(--text-primary)">{student.name}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{student.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={sb.variant}>{sb.label}</Badge>
                      {sub?.isLate && <span className="text-[10px] font-mono text-(--status-warning)">late</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-(--text-secondary)">{sub ? sub.submittedAt : <span className="text-(--text-faint)">—</span>}</td>
                  <td className="px-4 py-3">
                    {sub?.fileAttachments.length ? (
                      <div className="flex flex-col gap-0.5">
                        {sub.fileAttachments.map(f => (
                          <div key={f.name} className="flex items-center gap-1.5 text-(--text-secondary)">
                            {fileTypeIcon(f.type)}<span className="truncate max-w-[100px]">{f.name}</span>
                            <span className="font-mono text-[10px] text-(--text-faint)">{f.size}</span>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-(--text-faint)">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">
                    {sub?.score != null
                      ? <span className={scoreColor(sub.score, assignment.maxMarks)}>{sub.score}/{assignment.maxMarks}</span>
                      : <span className="text-(--text-faint)">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <Button variant={status === 'Graded' ? 'secondary' : 'primary'} size="xs"
                        icon={status === 'Graded' ? <Edit3 className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                        onClick={() => onGrade(sub, student.name)}>
                        {status === 'Graded' ? 'Edit' : 'Grade'}
                      </Button>
                    ) : <span className="text-(--text-faint) text-[11px]">No submission</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Create Assignment SlidePanel
// ─────────────────────────────────────────────────────────────────────────────
const CreateAssignmentPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onPublish: (form: AssignmentFormState) => void;
}> = ({ isOpen, onClose, onPublish }) => {
  const [form, setForm] = useState<AssignmentFormState>(defaultForm);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myCourses = courses.filter(c => c.facultyId === 'f01');

  const update = <K extends keyof AssignmentFormState>(key: K, val: AssignmentFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaveState('saving');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); }, 1200);
  };
  const toggleFileType = (ft: string) =>
    update('allowedFileTypes', form.allowedFileTypes.includes(ft)
      ? form.allowedFileTypes.filter(x => x !== ft)
      : [...form.allowedFileTypes, ft]);
  const isValid = form.title.trim().length > 0 && form.dueDate.trim().length > 0;

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="Create Assignment" subtitle="New Assignment · Instructor Form" width="max-w-3xl">
      <div className="space-y-6 pb-6">
        {/* Autosave */}
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">All fields auto-saved as you type.</p>
          <AutosaveIndicator state={saveState} />
        </div>

        {/* Basic Info */}
        <div className="space-y-4 p-5 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
          <h3 className="font-serif text-sm font-bold text-(--text-primary) flex items-center gap-2"><BookOpen className="w-4 h-4 text-(--brand-gold)" />Basic Information</h3>
          <div><FieldLabel required>Assignment Title</FieldLabel><input type="text" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Short Film Reel Submission" className={inputCls} /></div>
          <div><FieldLabel required>Course</FieldLabel>
            <select value={form.courseId} onChange={e => update('courseId', e.target.value)} className={inputCls}>
              {myCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
          </div>
          <div><FieldLabel required>Description</FieldLabel><textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief overview of what students need to do…" rows={3} className={textareaCls} /></div>
          <div><FieldLabel required>Instructions</FieldLabel><textarea value={form.instructions} onChange={e => update('instructions', e.target.value)} placeholder={"1. Step one…\n2. Step two…\n3. Submission format…"} rows={5} className={textareaCls} /></div>
        </div>

        {/* Deadline & Marks */}
        <div className="space-y-4 p-5 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
          <h3 className="font-serif text-sm font-bold text-(--text-primary) flex items-center gap-2"><CalendarDays className="w-4 h-4 text-(--brand-gold)" />Deadline & Marks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><FieldLabel required>Due Date</FieldLabel><input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Due Time</FieldLabel><input type="time" value={form.dueTime} onChange={e => update('dueTime', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel required>Maximum Marks</FieldLabel><input type="number" min={1} max={1000} value={form.maxMarks} onChange={e => update('maxMarks', e.target.value)} placeholder="100" className={inputCls} /></div>
          </div>
        </div>

        {/* Submission Settings */}
        <div className="space-y-4 p-5 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
          <h3 className="font-serif text-sm font-bold text-(--text-primary) flex items-center gap-2"><Upload className="w-4 h-4 text-(--brand-gold)" />Submission Settings</h3>

          <div>
            <FieldLabel>Submission Type</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {SUBMISSION_TYPES.map(t => (
                <button key={t} onClick={() => update('submissionType', t)}
                  className={`px-3.5 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${form.submissionType === t ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-subtle) hover:border-(--border-strong)'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {(form.submissionType === 'File Upload' || form.submissionType === 'Both') && (
            <>
              <div>
                <FieldLabel>Allowed File Types</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {FILE_TYPE_OPTIONS.map(ft => {
                    const active = form.allowedFileTypes.includes(ft);
                    return (
                      <button key={ft} onClick={() => toggleFileType(ft)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${active ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-faint) border-(--border-subtle) hover:border-(--border-strong)'}`}>
                        {ft}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <FieldLabel>Maximum File Size (MB)</FieldLabel>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={5000} value={form.maxFileSizeMB} onChange={e => update('maxFileSizeMB', e.target.value)} className={`${inputCls} max-w-[140px]`} />
                  <span className="font-mono text-xs text-(--text-faint) flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    {form.maxFileSizeMB ? (Number(form.maxFileSizeMB) >= 1000 ? `${(Number(form.maxFileSizeMB)/1000).toFixed(1)} GB limit` : `${form.maxFileSizeMB} MB limit`) : ''}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            {([
              { key: 'allowLateSubmission' as const, label: 'Allow Late Submission', desc: 'Students can submit after the deadline.' },
              { key: 'allowResubmission'   as const, label: 'Allow Resubmission',   desc: 'Students can replace their submission before grading.' },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 p-3 bg-(--bg-card) border border-(--border-subtle) rounded-xl">
                <div>
                  <p className="font-sans text-sm font-semibold text-(--text-primary)">{label}</p>
                  <p className="font-sans text-xs text-(--text-faint) mt-0.5">{desc}</p>
                </div>
                <button onClick={() => update(key, !form[key])} className="shrink-0 transition-colors">
                  {form[key] ? <ToggleRight className="w-8 h-8 text-(--status-success)" /> : <ToggleLeft className="w-8 h-8 text-(--text-faint)" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Supporting Files */}
        <div className="space-y-3 p-5 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
          <h3 className="font-serif text-sm font-bold text-(--text-primary) flex items-center gap-2"><Paperclip className="w-4 h-4 text-(--brand-gold)" />Supporting Files <span className="font-sans text-xs text-(--text-faint) font-normal">(optional)</span></h3>
          <div className="border-2 border-dashed border-(--border-default) rounded-xl p-8 text-center cursor-pointer hover:border-(--accent-gold-border) hover:bg-(--accent-gold-subtle)/20 transition-all group">
            <Upload className="w-8 h-8 mx-auto mb-2 text-(--text-faint) group-hover:text-(--brand-gold) transition-colors" />
            <p className="font-sans text-sm text-(--text-muted)">Drag & drop files here, or <span className="text-(--brand-gold)">browse</span></p>
            <p className="font-sans text-xs text-(--text-faint) mt-1">Rubrics, briefs, reference materials — PDF, DOCX, ZIP</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setForm(defaultForm)} icon={<X className="w-4 h-4" />}>Clear</Button>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" icon={<Save className="w-4 h-4" />} onClick={() => { onPublish(form); onClose(); }}>Save as Draft</Button>
          <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => { onPublish(form); onClose(); }} disabled={!isValid}>Publish Assignment</Button>
        </div>
      </div>
    </SlidePanel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Grade Submission SlidePanel + Publish Modal
// ─────────────────────────────────────────────────────────────────────────────
const GradeSubmissionPanel: React.FC<{
  isOpen: boolean; onClose: () => void;
  submission: AssignmentSubmission | null; studentName: string;
  assignment: LMSAssignment | null;
  onPublishGrade: (score: number, feedback: string) => void;
}> = ({ isOpen, onClose, submission, studentName, assignment, onPublishGrade }) => {
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [publishModal, setPublishModal] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (submission) { setScore(submission.score != null ? String(submission.score) : ''); setFeedback(submission.feedback ?? ''); }
  }, [submission]);

  const triggerSave = () => {
    setSaveState('saving');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); }, 1200);
  };

  const pct = score && assignment ? Math.round((Number(score) / assignment.maxMarks) * 100) : null;
  const pctColor = pct == null ? '' : pct >= 80 ? 'text-(--status-success)' : pct >= 60 ? 'text-(--brand-gold)' : 'text-(--status-danger)';
  const pctBgColor = pct == null ? 'var(--border-subtle)' : pct >= 80 ? 'var(--status-success)' : pct >= 60 ? 'var(--brand-gold)' : 'var(--status-danger)';

  if (!submission || !assignment) return null;

  return (
    <>
      <SlidePanel isOpen={isOpen} onClose={onClose} title={`Grade: ${studentName}`} subtitle={assignment.title} width="max-w-2xl">
        <div className="space-y-6 pb-6">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs text-(--text-faint)">Autosave enabled</p>
            <AutosaveIndicator state={saveState} />
          </div>

          {/* Student info */}
          <div className="flex items-center gap-3 p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center shrink-0">
              <span className="font-serif font-bold text-lg text-(--brand-gold)">{studentName[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-base font-bold text-(--text-primary)">{studentName}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <Badge variant={subStatusMap[submission.status].variant}>{submission.status}</Badge>
                {submission.isLate && <span className="font-mono text-[10px] text-(--status-warning)">Submitted late</span>}
                <span className="font-mono text-[10px] text-(--text-faint)">{submission.submittedAt}</span>
              </div>
            </div>
          </div>

          {/* Files */}
          {submission.fileAttachments.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint)">Submitted Files</p>
              {submission.fileAttachments.map(f => (
                <div key={f.name} className="flex items-center gap-3 p-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl group">
                  <div className="w-9 h-9 rounded-lg bg-(--bg-card) border border-(--border-default) flex items-center justify-center shrink-0">{fileTypeIcon(f.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{f.name}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">{f.size}</p>
                  </div>
                  <button className="shrink-0 p-1.5 rounded-lg bg-(--hover-overlay) text-(--text-faint) hover:text-(--brand-gold) transition-colors opacity-0 group-hover:opacity-100"><ExternalLink className="w-4 h-4" /></button>
                  <button className="shrink-0 p-1.5 rounded-lg bg-(--hover-overlay) text-(--text-faint) hover:text-(--text-primary) transition-colors opacity-0 group-hover:opacity-100"><Download className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Text Answer */}
          {submission.textAnswer && (
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint)">Text Answer</p>
              <div className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-xl">
                <p className="font-sans text-xs text-(--text-secondary) leading-relaxed line-clamp-6">{submission.textAnswer}</p>
                <button className="mt-2 font-sans text-xs text-(--brand-gold) hover:underline">Show full answer</button>
              </div>
            </div>
          )}

          {/* Grading */}
          <div className="space-y-4 p-5 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
            <h3 className="font-serif text-sm font-bold text-(--text-primary) flex items-center gap-2"><Star className="w-4 h-4 text-(--brand-gold)" />Grade Submission</h3>
            <div>
              <FieldLabel required>Score</FieldLabel>
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={assignment.maxMarks} value={score}
                  onChange={e => { setScore(e.target.value); triggerSave(); }}
                  placeholder="—" aria-label="Score"
                  className="w-28 bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-mono text-lg font-bold text-(--text-primary) text-center focus:outline-none focus:border-(--brand-gold) transition-colors placeholder:text-(--text-faint)" />
                <span className="font-mono text-sm text-(--text-faint)">/ {assignment.maxMarks}</span>
                {pct != null && (
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`font-mono text-sm font-bold ${pctColor}`}>{pct}%</span>
                    <span className={`font-mono text-base font-black ${pctColor}`}>{letterGrade(pct)}</span>
                  </div>
                )}
              </div>
              {pct != null && (
                <div className="mt-2 h-1.5 bg-(--border-subtle) rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: pctBgColor }}
                    initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ ...DURATION.medium, ...EASE.out }} />
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Written Feedback</FieldLabel>
              <textarea value={feedback} onChange={e => { setFeedback(e.target.value); triggerSave(); }}
                placeholder="Write constructive feedback for the student…" rows={5} className={textareaCls} />
              <p className="font-mono text-[10px] text-(--text-faint) mt-1">{feedback.length} chars</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <div className="flex-1" />
            <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => setPublishModal(true)} disabled={!score || Number(score) < 0}>
              Publish Grade
            </Button>
          </div>
        </div>
      </SlidePanel>

      {/* Publish Confirmation Modal */}
      <Modal isOpen={publishModal} onClose={() => setPublishModal(false)} title="Publish Grade" maxWidth="max-w-md">
        <div className="space-y-5 font-sans text-sm">
          <div className="p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
            <p className="text-amber-200/80 text-xs leading-relaxed">
              Once published, <strong>{studentName}</strong> will be notified of their grade and feedback. You can edit and republish if corrections are needed.
            </p>
          </div>
          <div className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-default) rounded-xl">
            <div>
              <p className="font-sans text-xs text-(--text-faint) mb-0.5">Score</p>
              <p className="font-mono text-2xl font-black text-(--text-primary)">{score} <span className="text-(--text-faint) text-sm font-normal">/ {assignment.maxMarks}</span></p>
            </div>
            {pct != null && (
              <div className="text-right">
                <p className={`font-mono text-3xl font-black ${pctColor}`}>{letterGrade(pct)}</p>
                <p className={`font-mono text-sm ${pctColor}`}>{pct}%</p>
              </div>
            )}
          </div>
          {feedback && (
            <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
              <div className="flex items-center gap-2 mb-1.5"><MessageSquare className="w-3.5 h-3.5 text-(--text-faint)" /><span className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Feedback Preview</span></div>
              <p className="font-sans text-xs text-(--text-secondary) leading-relaxed line-clamp-3">{feedback}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPublishModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<Send className="w-4 h-4" />}
              onClick={() => { onPublishGrade(Number(score), feedback); setPublishModal(false); onClose(); }}>
              Publish to Student
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Root export: InAssignmentsView
// ─────────────────────────────────────────────────────────────────────────────
type AssignmentView = 'list' | 'monitor';

export const InAssignmentsView: React.FC = () => {
  const [view, setView] = useState<AssignmentView>('list');
  const [selected, setSelected] = useState<LMSAssignment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<{ submission: AssignmentSubmission; studentName: string } | null>(null);
  const [localAssignments, setLocalAssignments] = useState<LMSAssignment[]>(lmsAssignments);
  const [localSubmissions, setLocalSubmissions] = useState<AssignmentSubmission[]>(assignmentSubmissions);

  const handleSelect = (a: LMSAssignment) => { setSelected(a); setView('monitor'); };
  const handleBack = () => { setView('list'); setSelected(null); };

  const handlePublishGrade = (score: number, feedback: string) => {
    if (!gradeTarget) return;
    setLocalSubmissions(prev =>
      prev.map(s => s.id === gradeTarget.submission.id
        ? { ...s, score, feedback, status: 'Graded' as SubmissionStatus, gradedAt: 'Just now' }
        : s));
    setLocalAssignments(prev =>
      prev.map(a => a.id === gradeTarget.submission.assignmentId
        ? { ...a, gradedCount: Math.min(a.gradedCount + 1, a.totalSubmissions) }
        : a));
    setGradeTarget(null);
  };

  const handlePublishAssignment = (form: AssignmentFormState) => {
    const newA: LMSAssignment = {
      id: `la${Date.now()}`, courseId: form.courseId,
      title: form.title, description: form.description, instructions: form.instructions,
      dueDate: `${form.dueDate} ${form.dueTime}`,
      maxMarks: Number(form.maxMarks) || 100,
      allowedFileTypes: form.allowedFileTypes,
      maxFileSizeMB: Number(form.maxFileSizeMB) || 25,
      submissionType: form.submissionType,
      allowLateSubmission: form.allowLateSubmission,
      allowResubmission: form.allowResubmission,
      attachments: [], status: 'Published',
      createdAt: 'Just now', publishedAt: 'Just now',
      totalSubmissions: 0, gradedCount: 0,
    };
    setLocalAssignments(prev => [newA, ...prev]);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={DURATION.fast}>
            <AssignmentListView assignments={localAssignments} onSelect={handleSelect} onCreateNew={() => setCreateOpen(true)} />
          </motion.div>
        )}
        {view === 'monitor' && selected && (
          <motion.div key="monitor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={DURATION.fast}>
            <SubmissionMonitorView
              assignment={selected} submissions={localSubmissions}
              onBack={handleBack} onGrade={(sub, name) => setGradeTarget({ submission: sub, studentName: name })} />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateAssignmentPanel isOpen={createOpen} onClose={() => setCreateOpen(false)} onPublish={handlePublishAssignment} />
      <GradeSubmissionPanel
        isOpen={!!gradeTarget} onClose={() => setGradeTarget(null)}
        submission={gradeTarget?.submission ?? null} studentName={gradeTarget?.studentName ?? ''}
        assignment={selected} onPublishGrade={handlePublishGrade} />
    </>
  );
};
