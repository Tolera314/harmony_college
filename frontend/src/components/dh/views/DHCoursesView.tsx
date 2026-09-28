'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Search, Eye, CheckCircle2, XCircle, RefreshCw, Loader2, Plus, Edit, Trash2, Send } from 'lucide-react';
import { hodOfferingsApi, hodSemestersApi, hodCoursesApi, type CourseOfferingSummary, type Semester } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { Input } from '../../ui/Input';
import { ErrorState, SkeletonTable, ToastContainer, useToast, InlineError } from '../../ui/States';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const statusBadge = (s: string) => {
  const map: Record<string, { variant: 'emerald' | 'gold' | 'rose' | 'glass' | 'amber'; label: string }> = {
    ACTIVE:               { variant: 'emerald', label: 'Active' },
    SCHEDULED:            { variant: 'emerald', label: 'Scheduled' },
    INSTRUCTOR_ASSIGNED:  { variant: 'gold',    label: 'Approved' },
    DRAFT:                { variant: 'amber',   label: 'Pending Approval' },
    CANCELLED:            { variant: 'rose',    label: 'Rejected' },
    CLOSED:               { variant: 'glass',   label: 'Closed' },
  };
  const m = map[s] ?? { variant: 'glass' as const, label: s };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

const capacityBar = (enrolled: number, cap: number) => {
  const pct = cap > 0 ? Math.min(100, (enrolled / cap) * 100) : 0;
  const col = pct >= 90 ? '#f87171' : pct >= 70 ? '#E9C349' : '#34d399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
      </div>
      <span className="font-mono text-[11px] text-(--text-secondary)">{enrolled}/{cap}</span>
    </div>
  );
};

export const DHCoursesView: React.FC = () => {
  const [offerings,    setOfferings]    = useState<CourseOfferingSummary[]>([]);
  const [courses,      setCourses]      = useState<any[]>([]);
  const [semesters,    setSemesters]    = useState<Semester[]>([]);
  const [total,        setTotal]        = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semFilter,    setSemFilter]    = useState('');
  const [selected,     setSelected]     = useState<CourseOfferingSummary | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ offering: CourseOfferingSummary; action: 'Approve' | 'Reject' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');

  // Add Course State
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    description: '',
    creditHours: 3,
    ects: 4,
    programType: 'TVET' as 'TVET' | 'SHORT_PROGRAM',
  });
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState('');

  // Publish courses state
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();
  const LIMIT = 12;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [offData, semData, coursesData] = await Promise.all([
        hodOfferingsApi.list({
          page:       p,
          limit:      LIMIT,
          search:     search || undefined,
          status:     statusFilter || undefined,
          semesterId: semFilter || undefined,
        }),
        semesters.length === 0 ? hodSemestersApi.list() : Promise.resolve(semesters),
        hodCoursesApi.list({ search: search || undefined }),
      ]);
      setOfferings(offData.offerings);
      setTotal(offData.total);
      setPendingCount(offData.pendingCount ?? offData.offerings.filter(o => o.status === 'DRAFT').length);
      if (semesters.length === 0) setSemesters(semData as Semester[]);
      setCourses(coursesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, semFilter, semesters]);

  useEffect(() => { load(page); }, [page, search, statusFilter, semFilter, load]);

  const handleAction = async () => {
    if (!confirmModal) return;
    if (confirmModal.action === 'Reject' && rejectReason.trim().length < 5) {
      setActionError('A rejection reason is required (min 5 characters).');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      if (confirmModal.action === 'Approve') {
        await hodOfferingsApi.approve(confirmModal.offering.id);
        showToast(`Approved course section ${confirmModal.offering.course.code}.`, 'success');
      } else {
        await hodOfferingsApi.reject(confirmModal.offering.id, rejectReason.trim());
        showToast(`Rejected course section ${confirmModal.offering.course.code}.`, 'info');
      }
      setConfirmModal(null);
      setRejectReason('');
      setSelected(null);
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseError('');
    
    // Validation
    if (!courseForm.code.trim() || courseForm.code.length < 2) {
      setCourseError('Course code is required (min 2 characters)');
      return;
    }
    if (!courseForm.name.trim() || courseForm.name.length < 2) {
      setCourseError('Course name is required (min 2 characters)');
      return;
    }
    if (courseForm.creditHours < 1 || courseForm.creditHours > 12) {
      setCourseError('Credit hours must be between 1 and 12');
      return;
    }
    if (courseForm.ects < 1 || courseForm.ects > 20) {
      setCourseError('ECTS must be between 1 and 20');
      return;
    }

    setCourseLoading(true);
    try {
      if (editCourse) {
        // Update existing course
        await hodCoursesApi.update(editCourse.id, {
          code: courseForm.code.trim().toUpperCase(),
          name: courseForm.name.trim(),
          description: courseForm.description.trim() || undefined,
          creditHours: courseForm.creditHours,
          ects: courseForm.ects,
        });
        showToast(`Course ${courseForm.code} updated successfully!`, 'success');
      } else {
        // Create new course
        await hodCoursesApi.create({
          code: courseForm.code.trim().toUpperCase(),
          name: courseForm.name.trim(),
          description: courseForm.description.trim() || undefined,
          creditHours: courseForm.creditHours,
          ects: courseForm.ects,
          programType: courseForm.programType,
        });
        showToast(`Course ${courseForm.code} created successfully!`, 'success');
      }
      setAddCourseOpen(false);
      setEditCourse(null);
      setCourseForm({
        code: '',
        name: '',
        description: '',
        creditHours: 3,
        ects: 4,
        programType: 'TVET',
      });
      // Reload data
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save course';
      setCourseError(msg);
      showToast(msg, 'error');
    } finally {
      setCourseLoading(false);
    }
  };

  const handleEditCourse = (course: any) => {
    setEditCourse(course);
    setCourseForm({
      code: course.code,
      name: course.name,
      description: course.description || '',
      creditHours: course.creditHours,
      ects: course.ects,
      programType: course.programType,
    });
    setAddCourseOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!deleteConfirm) return;
    setCourseLoading(true);
    try {
      await hodCoursesApi.toggleStatus(deleteConfirm.id);
      showToast(`Course ${deleteConfirm.code} status toggled successfully!`, 'success');
      setDeleteConfirm(null);
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete course';
      showToast(msg, 'error');
    } finally {
      setCourseLoading(false);
    }
  };

  const handlePublishCourses = async () => {
    if (courses.length === 0) {
      showToast('No courses to publish', 'error');
      return;
    }
    setPublishLoading(true);
    try {
      const result = await hodCoursesApi.publish();
      showToast(
        `Published ${result.publishedCount} course${result.publishedCount !== 1 ? 's' : ''} to ${result.semesterName}!`,
        'success'
      );
      setPublishConfirm(false);
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to publish courses';
      showToast(msg, 'error');
    } finally {
      setPublishLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Course Offerings"
        subtitle={loading ? 'Loading…' : `${total} offerings · ${pendingCount} pending approval`}
        icon={<BookOpen className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="primary" 
              size="sm" 
              icon={<Send className="w-4 h-4" />} 
              onClick={() => setPublishConfirm(true)}
              disabled={courses.length === 0}
            >
              Publish Courses
            </Button>
            <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddCourseOpen(true)}>Add Course</Button>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>Refresh</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search course code or name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={semFilter}
          onChange={e => { setSemFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">Current Semester</option>
          {semesters.map(s => (
            <option key={s.id} value={s.id} className="bg-(--bg-card-solid)">
              {s.name} {s.academicYear.name}{s.isCurrent ? ' (Current)' : ''}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Pending Approval</option>
          <option value="INSTRUCTOR_ASSIGNED">Approved</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ACTIVE">Active</option>
          <option value="CANCELLED">Rejected/Cancelled</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Created Courses (Not Yet Published) */}
      {!loading && courses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-sm font-semibold text-(--text-primary)">
              Created Courses ({courses.length})
            </h3>
            <p className="text-xs text-(--text-faint)">
              These courses will be published to students when you click "Publish Courses"
            </p>
          </div>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Code', 'Course Name', 'Credits', 'ECTS', 'Program Type', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {courses.map(c => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-(--brand-gold)">{c.code}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-(--text-secondary) text-xs max-w-[250px]">{c.name}</p>
                      {c.description && (
                        <p className="text-(--text-faint) text-[10px] mt-0.5 max-w-[250px] truncate">{c.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{c.creditHours}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{c.ects}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={c.programType === 'TVET' ? 'glass' : 'amber'}>
                        {c.programType === 'TVET' ? 'TVET' : 'Short Program'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={c.status === 'ACTIVE' ? 'emerald' : 'glass'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleEditCourse(c)} 
                          className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--brand-gold) transition-colors" 
                          aria-label="Edit course"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(c)} 
                          className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors" 
                          aria-label="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Published Course Offerings */}
      {!loading && offerings.length > 0 && (
        <>
          <div className="space-y-3">
            <h3 className="font-sans text-sm font-semibold text-(--text-primary)">
              Published Course Offerings ({offerings.length})
            </h3>
          </div>

          {/* Offerings Table */}
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans" style={{ minWidth: '800px' }}>
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Course', 'Instructor', 'Semester', 'Schedule', 'Enrolled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {offerings.map(o => (
                  <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs font-bold text-(--brand-gold)">{o.course.code}</p>
                      <p className="text-(--text-secondary) text-xs mt-0.5 max-w-[200px] truncate">{o.course.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-(--text-secondary) text-xs truncate max-w-[130px] block">
                        {o.instructor ? `${o.instructor.title} ${o.instructor.user.fullName}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">
                      {o.semester.name} {o.semester.academicYear.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">
                      {o.timetables.length > 0
                        ? o.timetables.map(t => `${DAY_NAMES[t.dayOfWeek]} ${t.startTime}`).join(', ')
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3.5">{capacityBar(o.enrolledCount, o.capacity)}</td>
                    <td className="px-4 py-3.5">{statusBadge(o.status)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(o)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {o.status === 'DRAFT' && (
                          <>
                            <button onClick={() => setConfirmModal({ offering: o, action: 'Approve' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-emerald-500 transition-colors" aria-label="Approve">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmModal({ offering: o, action: 'Reject' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--status-danger) transition-colors" aria-label="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-(--text-faint)">{total} offerings · Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.course.code} — ${selected.course.name}` : ''} subtitle="Course Offering Details" width="max-w-2xl">
        {selected && (
          <div className="space-y-5 text-sm font-sans">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Semester',  `${selected.semester.name} ${selected.semester.academicYear.name}`],
                ['Section',   selected.section],
                ['Credits',   `${selected.course.creditHours} credit hours`],
                ['Room',      selected.room ? `${selected.room.building} ${selected.room.name}` : '—'],
                ['Capacity',  `${selected.capacity} seats`],
                ['Enrolled',  `${selected.enrolledCount} (${selected.utilizationPct}%)`],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="font-semibold text-(--text-primary) mt-1 text-sm">{v}</p>
                </div>
              ))}
            </div>
            {selected.instructor && (
              <div className="flex items-center gap-3 p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <div className="w-10 h-10 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-(--brand-gold)">{selected.instructor.user.fullName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-(--text-primary) text-sm">
                    {selected.instructor.title} {selected.instructor.user.fullName}
                  </p>
                  <p className="text-(--text-muted) text-xs">{selected.instructor.user.email}</p>
                  <p className="font-mono text-[10px] text-(--text-faint)">{selected.instructor.employeeId}</p>
                </div>
              </div>
            )}
            {selected.timetables.length > 0 && (
              <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Schedule</p>
                {selected.timetables.map((t, i) => (
                  <p key={i} className="text-xs text-(--text-secondary) font-mono">{DAY_NAMES[t.dayOfWeek]} · {t.startTime} – {t.endTime}</p>
                ))}
              </div>
            )}
            {selected.course.prerequisites.length > 0 && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Prerequisites</p>
                {selected.course.prerequisites.map((p, i) => (
                  <span key={i} className="inline-block mr-2 mb-1 font-mono text-xs text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">{p.prerequisite.code}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>{statusBadge(selected.status)}</div>
              {selected.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => { setSelected(null); setConfirmModal({ offering: selected, action: 'Reject' }); }}>Reject</Button>
                  <Button variant="primary" size="sm" onClick={() => { setSelected(null); setConfirmModal({ offering: selected, action: 'Approve' }); }}>Approve</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Confirm modal */}
      <Modal isOpen={!!confirmModal} onClose={() => { setConfirmModal(null); setActionError(''); setRejectReason(''); }} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-5">
            <p className="font-sans text-sm text-(--text-secondary) leading-relaxed">
              {confirmModal.action === 'Approve'
                ? 'Approving this offering will move it to Instructor Assigned status. This action is recorded in the audit log.'
                : 'Rejecting this offering will cancel it. Please provide a reason.'}
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
                rows={3} placeholder="Rejection reason (required, min 5 chars)…"
              />
            )}
            {actionError && <p className="text-xs text-(--status-danger)">{actionError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setConfirmModal(null); setActionError(''); setRejectReason(''); }} disabled={actionLoading}>Cancel</Button>
              <Button
                variant={confirmModal.action === 'Approve' ? 'primary' : 'danger'}
                className="flex-1" onClick={handleAction} disabled={actionLoading}
                icon={actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {actionLoading ? 'Processing…' : confirmModal.action}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Course Modal - Slides from right */}
      <SlidePanel 
        isOpen={addCourseOpen} 
        onClose={() => { 
          setAddCourseOpen(false); 
          setEditCourse(null);
          setCourseError(''); 
          setCourseForm({
            code: '',
            name: '',
            description: '',
            creditHours: 3,
            ects: 4,
            programType: 'TVET',
          });
        }} 
        title={editCourse ? "Edit Course" : "Add New Course"}
        subtitle={editCourse ? "Update course details" : "Create a new course for your department"}
        width="max-w-2xl"
      >
        <form onSubmit={handleAddCourse} className="space-y-5">
          {courseError && <InlineError message={courseError} />}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Course Code *</label>
              <Input
                value={courseForm.code}
                onChange={e => setCourseForm(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., CS101"
                required
                maxLength={20}
                disabled={courseLoading || !!editCourse}
                readOnly={!!editCourse}
              />
              {editCourse && <p className="text-xs text-(--text-faint)">Course code cannot be changed</p>}
            </div>

            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Program Type *</label>
              <select
                value={courseForm.programType}
                onChange={e => setCourseForm(prev => ({ ...prev, programType: e.target.value as 'TVET' | 'SHORT_PROGRAM' }))}
                className="w-full px-4 py-2.5 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                disabled={courseLoading || !!editCourse}
              >
                <option value="TVET">TVET</option>
                <option value="SHORT_PROGRAM">Short Program</option>
              </select>
              {editCourse && <p className="text-xs text-(--text-faint)">Program type cannot be changed</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Course Name *</label>
            <Input
              value={courseForm.name}
              onChange={e => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Introduction to Computer Science"
              required
              maxLength={150}
              disabled={courseLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Description (Optional)</label>
            <textarea
              value={courseForm.description}
              onChange={e => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
              rows={3}
              placeholder="Brief description of the course content and objectives…"
              disabled={courseLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Credit Hours *</label>
              <Input
                type="number"
                value={courseForm.creditHours}
                onChange={e => setCourseForm(prev => ({ ...prev, creditHours: parseInt(e.target.value) || 3 }))}
                min={1}
                max={12}
                required
                disabled={courseLoading}
              />
              <p className="text-xs text-(--text-faint)">Between 1 and 12</p>
            </div>

            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">ECTS *</label>
              <Input
                type="number"
                value={courseForm.ects}
                onChange={e => setCourseForm(prev => ({ ...prev, ects: parseInt(e.target.value) || 4 }))}
                min={1}
                max={20}
                required
                disabled={courseLoading}
              />
              <p className="text-xs text-(--text-faint)">Between 1 and 20</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-(--border-subtle)">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setAddCourseOpen(false); setCourseError(''); }}
              disabled={courseLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={courseLoading}
              icon={courseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editCourse ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {courseLoading ? (editCourse ? 'Updating…' : 'Creating…') : (editCourse ? 'Update Course' : 'Create Course')}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Toggle Course Status" maxWidth="max-w-md">
        {deleteConfirm && (
          <div className="space-y-5">
            <p className="font-sans text-sm text-(--text-secondary) leading-relaxed">
              Are you sure you want to toggle the status of course <strong className="text-(--brand-gold)">{deleteConfirm.code}</strong>?
            </p>
            <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="font-mono text-xs text-(--text-faint) uppercase tracking-wider mb-1">Current Status</p>
              <Badge variant={deleteConfirm.status === 'ACTIVE' ? 'emerald' : 'glass'}>{deleteConfirm.status}</Badge>
              <p className="text-xs text-(--text-secondary) mt-2">
                This will change the course to <strong>{deleteConfirm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}</strong>.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)} disabled={courseLoading}>Cancel</Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleDeleteCourse}
                disabled={courseLoading}
                icon={courseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {courseLoading ? 'Processing…' : 'Toggle Status'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Publish Confirmation Modal */}
      <Modal isOpen={publishConfirm} onClose={() => !publishLoading && setPublishConfirm(false)} title="Publish All Courses to Students" maxWidth="max-w-md">
        <div className="space-y-5">
          <p className="font-sans text-sm text-(--text-secondary) leading-relaxed">
            You are about to publish <strong className="text-(--brand-gold)">all active courses</strong> to the current semester as course offerings that students can view.
          </p>
          <div className="p-4 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-(--brand-gold) shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-(--text-primary) mb-2">What happens next?</p>
                <ul className="text-xs text-(--text-secondary) space-y-1.5">
                  <li>✓ Course offerings will be created for all active courses</li>
                  <li>✓ Students can view published courses</li>
                  <li>✓ Courses remain editable until a teacher is assigned</li>
                  <li>✓ Once a teacher is assigned, the course is locked</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-lg">
            <p className="text-xs text-(--text-faint)">
              <strong className="text-(--text-secondary)">Note:</strong> Courses already published to the current semester will be skipped. You can create additional courses after publishing.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPublishConfirm(false)} disabled={publishLoading}>Cancel</Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handlePublishCourses}
              disabled={publishLoading}
              icon={publishLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            >
              {publishLoading ? 'Publishing…' : 'Publish All'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
