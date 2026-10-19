'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Calendar, Clock, BookOpen, Users, RefreshCw, ChevronDown, ChevronUp, Search, Eye, CheckCircle2, XCircle, Loader2, Plus, Edit, Trash2, Send, GitBranch, AlertTriangle } from 'lucide-react';
import { hodSemestersApi, hodOfferingsApi, hodCoursesApi, type DetailedSemester, type CourseOfferingSummary, type Semester, type DHCourse } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { Input } from '../../ui/Input';
import { SkeletonTable, ErrorState, ToastContainer, useToast, InlineError } from '../../ui/States';
import { DHCourseAssignmentsView } from './DHCourseAssignmentsView';

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

export const DHSemestersView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [semesters, setSemesters] = useState<DetailedSemester[]>([]);
  const [offerings, setOfferings] = useState<CourseOfferingSummary[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [currentSemester, setCurrentSemester] = useState<{ id: string; name: string; academicYear: string } | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSemesterId, setExpandedSemesterId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ offering: CourseOfferingSummary; action: 'Approve' | 'Reject' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // View toggle: 'semesters' or 'assignments'
  const [viewMode, setViewMode] = useState<'semesters' | 'assignments'>('semesters');

  // Add Course State
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    description: '',
    creditHours: 3,
    ects: 4,
    section: 'A',
    capacity: 40,
    programType: 'TVET' as 'TVET' | 'SHORT_PROGRAM',
  });
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState('');

  // Publish courses state
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  // Assign Instructor State
  const [assignInstructorOpen, setAssignInstructorOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<CourseOfferingSummary | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();
  const LIMIT = 12;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [semData, offData, coursesData] = await Promise.all([
        hodSemestersApi.listDetailed({ programType }),
        hodOfferingsApi.list({
          page: p,
          limit: LIMIT,
          search: search || undefined,
          status: statusFilter || undefined,
          semesterId: semFilter || undefined,
          programType: programType,
        }),
        hodCoursesApi.list({ 
          search: search || undefined,
          programType: programType,
          semesterId: selectedSemesterId || undefined,
        }),
      ]);
      
      setSemesters(semData);
      setOfferings(offData.offerings);
      setTotal(offData.total);
      setPendingCount(offData.pendingCount ?? offData.offerings.filter(o => o.status === 'DRAFT').length);
      setCourses(coursesData.courses);
      
      // Set semesters and current semester from courses response
      if (coursesData.semesters && coursesData.semesters.length > 0) {
        setAllSemesters(coursesData.semesters as any);
        if (!selectedSemesterId && coursesData.currentSemester) {
          setSelectedSemesterId(coursesData.currentSemester.id);
        }
      }
      setCurrentSemester(coursesData.currentSemester);
      
      // Auto-expand current semester
      const current = semData.find(s => s.isCurrent);
      if (current && !expandedSemesterId) {
        setExpandedSemesterId(current.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [programType, expandedSemesterId, search, statusFilter, semFilter, selectedSemesterId]);

  useEffect(() => {
    load(page);
  }, [page, search, statusFilter, semFilter, load]);

  // Reset page and data when programType changes
  useEffect(() => {
    setPage(1);
    setSearch('');
    setStatusFilter('');
    setSemFilter('');
    setCourseForm(prev => ({ ...prev, programType: programType || 'TVET' }));
    load(1);
  }, [programType]);

  const toggleExpand = (semesterId: string) => {
    setExpandedSemesterId(prev => prev === semesterId ? null : semesterId);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
    if (!selectedSemesterId && !currentSemester) {
      setCourseError('No semester selected. Please select a semester first.');
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
        // Create new course offering for the selected semester
        // Find the current semester that matches the course program type
        const currentSemesterForType = semesters.find(s => 
          s.isCurrent && s.programType === courseForm.programType
        );
        
        if (!currentSemesterForType) {
          setCourseError(`No current ${courseForm.programType === 'TVET' ? 'TVET semester' : 'Short Program term'} found. Please create one first or select a different program type.`);
          setCourseLoading(false);
          return;
        }
        
        await hodCoursesApi.addOffering(currentSemesterForType.id, {
          courseCode: courseForm.code.trim().toUpperCase(),
          courseName: courseForm.name.trim(),
          description: courseForm.description.trim() || undefined,
          creditHours: courseForm.creditHours,
          ects: courseForm.ects,
          section: courseForm.section || 'A',
          capacity: courseForm.capacity || 40,
          programType: courseForm.programType,
        });
        showToast(`Course ${courseForm.code} added to semester successfully!`, 'success');
      }
      setAddCourseOpen(false);
      setEditCourse(null);
      setCourseForm({
        code: '',
        name: '',
        description: '',
        creditHours: 3,
        ects: 4,
        section: 'A',
        capacity: 40,
        programType: programType || 'TVET',
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
      section: 'A',
      capacity: 40,
      programType: course.programType,
    });
    setAddCourseOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!deleteConfirm) return;
    setCourseLoading(true);
    setCourseError('');
    
    try {
      const result = await hodCoursesApi.deleteCourse(deleteConfirm.id);
      
      if (result.action === 'deleted') {
        showToast(`Course ${deleteConfirm.code} permanently deleted.`, 'success');
      } else if (result.action === 'deactivated') {
        showToast(`Course ${deleteConfirm.code} deactivated. Historical records preserved.`, 'success');
      }
      
      setDeleteConfirm(null);
      setDeleteConfirmText('');
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete course';
      
      // If error suggests deactivation, show deactivate option
      if (msg.includes('deactivate')) {
        setCourseError(msg);
      } else {
        showToast(msg, 'error');
        setDeleteConfirm(null);
        setDeleteConfirmText('');
      }
    } finally {
      setCourseLoading(false);
    }
  };

  const handleDeactivateCourse = async () => {
    if (!deleteConfirm) return;
    setCourseLoading(true);
    
    try {
      const result = await hodCoursesApi.deactivateCourse(deleteConfirm.id);
      showToast(result.message, 'success');
      setDeleteConfirm(null);
      setDeleteConfirmText('');
      setCourseError('');
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to deactivate course';
      showToast(msg, 'error');
    } finally {
      setCourseLoading(false);
    }
  };

  const handleReactivateCourse = async (course: any) => {
    setCourseLoading(true);
    
    try {
      const result = await hodCoursesApi.reactivateCourse(course.id);
      showToast(result.message, 'success');
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to reactivate course';
      showToast(msg, 'error');
    } finally {
      setCourseLoading(false);
    }
  };

  const handlePublishSingleCourse = async (c: DHCourse) => {
    setCourseLoading(true);
    try {
      const res = await hodCoursesApi.publishCourse(c.id);
      showToast(
        `Published course ${c.code}! ${res.enrolledStudentsCount} eligible students enrolled.`,
        'success'
      );
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to publish course';
      showToast(msg, 'error');
    } finally {
      setCourseLoading(false);
    }
  };

  const handleUnpublishSingleCourse = async (c: DHCourse) => {
    setCourseLoading(true);
    try {
      await hodCoursesApi.unpublishCourse(c.id);
      showToast(`Course ${c.code} unpublished. Students will no longer see it.`, 'info');
      await load(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to unpublish course';
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
        `Published ${result.publishedCount} course${result.publishedCount !== 1 ? 's' : ''} to ${result.semesterName}! (${result.enrolledStudentsCount ?? 0} students enrolled)`,
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

  if (loading && semesters.length === 0 && isInitialLoad) return <SkeletonTable rows={3} />;
  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  // If in assignments view mode, render the DHCourseAssignmentsView component
  if (viewMode === 'assignments') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
        <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-(--text-faint)">
          <span>Portal</span>
          <span>›</span>
          <button 
            onClick={() => setViewMode('semesters')}
            className="hover:text-(--text-primary) transition-colors hover:underline"
          >
            Terms & Semesters
          </button>
          <span>›</span>
          <span className="text-(--text-primary) font-medium">Course Assignments</span>
        </div>

        {/* Back to Terms & Semesters Button - Prominent */}
        <div className="flex items-center gap-4">
          <Button 
            variant="primary" 
            size="md" 
            icon={<Calendar className="w-5 h-5" />} 
            onClick={() => setViewMode('semesters')}
            className="shadow-lg"
          >
            ← Back to Terms & Semesters
          </Button>
        </div>
        
        <DHCourseAssignmentsView programType={programType} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-(--text-faint)">
        <span>Portal</span>
        <span>›</span>
        <span className="text-(--text-primary) font-medium">Terms & Semesters</span>
      </div>

      {/* Course Assignments Button and Action Buttons - Prominent and Professional */}
      <div className="flex items-center justify-between gap-4">
        <Button 
          variant="primary" 
          size="lg" 
          onClick={() => setViewMode('assignments')}
          className="bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-gold-dark)] text-black font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-[var(--brand-gold)] px-6 py-3"
        >
          <GitBranch className="w-5 h-5 mr-2" />
          Course Assignments →
        </Button>
        
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
          <Button 
            variant="primary" 
            size="lg" 
            icon={<Plus className="w-5 h-5 mr-2" />} 
            onClick={() => {
              setCourseForm(prev => ({ ...prev, programType: programType || 'TVET' }));
              setAddCourseOpen(true);
            }}
            className="bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-gold-dark)] text-black font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-[var(--brand-gold)] px-6 py-3"
          >
            Add Course
          </Button>
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>
            Refresh
          </Button>
        </div>
      </div>

      <DHPageHeader
        title="Terms & Semesters"
        subtitle={loading ? 'Loading…' : `${programType || 'TVET'} • ${semesters.length} semester${semesters.length === 1 ? '' : 's'} · ${total} offerings · ${pendingCount} pending approval`}
        icon={<Calendar className="w-5 h-5" />}
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
          {allSemesters.map(s => (
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

      {/* Semester Cards with Course Tables */}
      {semesters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
          <Calendar className="w-12 h-12 text-(--text-faint) mb-4" />
          <p className="text-(--text-secondary) text-sm">No semesters found for {programType || 'TVET'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {semesters.map((semester, index) => (
            <motion.div
              key={semester.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              className="border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl overflow-hidden"
            >
              {/* Semester Header */}
              <div
                className="p-4 cursor-pointer hover:bg-(--hover-overlay) transition-colors"
                onClick={() => toggleExpand(semester.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-(--brand-gold)" />
                    <div>
                      <h4 className="font-sans text-base font-semibold text-(--text-primary)">
                        {semester.name}
                      </h4>
                      <p className="text-xs text-(--text-faint)">{semester.academicYear.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {semester.isCurrent && <Badge variant="emerald">Current</Badge>}
                    <Badge variant={semester.programType === 'TVET' ? 'glass' : 'amber'}>
                      {semester.programType === 'TVET' ? 'TVET' : 'Short Program'}
                    </Badge>
                    {expandedSemesterId === semester.id ? (
                      <ChevronUp className="w-5 h-5 text-(--text-muted)" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-(--text-muted)" />
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-(--text-muted)" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Duration</p>
                      <p className="text-xs text-(--text-secondary) font-medium">
                        {formatDate(semester.startDate)} — {formatDate(semester.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-(--text-muted)" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Courses</p>
                      <p className="text-xs text-(--text-secondary) font-medium">
                        {semester.courseCount} {semester.courseCount === 1 ? 'course' : 'courses'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-(--text-muted)" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Enrollment</p>
                      <p className="text-xs text-(--text-secondary) font-medium">
                        {semester.offerings.reduce((sum, o) => sum + (o._count?.enrollments ?? 0), 0)} students
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Course Offerings */}
              <AnimatePresence>
                {expandedSemesterId === semester.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-(--border-default)"
                  >
                    <div className="p-4 space-y-3">
                      <h5 className="font-sans text-sm font-semibold text-(--text-primary) mb-3">
                        Course Offerings in this Semester
                      </h5>

                      {semester.offerings.length === 0 ? (
                        <div className="text-center py-6">
                          <BookOpen className="w-8 h-8 text-(--text-faint) mx-auto mb-2" />
                          <p className="text-xs text-(--text-secondary)">No courses assigned to this semester yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-sans min-w-[900px]">
                            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                              <tr>
                                {['Code', 'Course Name', 'Section', 'Credits', 'ECTS', 'Program Type', 'Instructor', 'Schedule', 'Status', 'Actions'].map(h => (
                                  <th key={h} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-(--text-muted) font-semibold whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border-subtle)">
                              {semester.offerings.map((offering, idx) => (
                                <motion.tr
                                  key={offering.id}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                                  className="hover:bg-(--hover-overlay) transition-colors"
                                >
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs font-bold text-(--brand-gold)">
                                      {offering.course.code}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs text-(--text-secondary) truncate max-w-[180px] block">{offering.course.name}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant="glass" className="text-[10px]">{offering.section}</Badge>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs text-(--text-secondary)">
                                      {offering.course.creditHours}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs text-(--text-secondary)">
                                      {offering.course.ects ?? '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant={(offering as any).course?.programType === 'TVET' ? 'glass' : 'amber'} className="text-[10px]">
                                      {(offering as any).course?.programType === 'TVET' ? 'TVET' : 'Short'}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {offering.instructor?.user.fullName ? (
                                      <span className="text-xs text-(--text-secondary) truncate max-w-[120px] block">
                                        {offering.instructor.user.fullName}
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => setViewMode('assignments')}
                                        className="text-xs text-(--brand-gold) hover:text-(--brand-gold-dark) underline font-medium transition-colors"
                                        title="Go to Course Assignments to assign instructor"
                                      >
                                        Not assigned
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {((offering as any).timetables || (offering as any).schedule)?.length > 0 ? (
                                      <div className="text-[10px] text-(--text-secondary)">
                                        {(((offering as any).timetables || (offering as any).schedule) as any[]).slice(0, 2).map((sch: any, schIdx: number) => (
                                          <div key={schIdx} className="truncate max-w-[100px]">
                                            {DAY_NAMES[sch.dayOfWeek]} {sch.startTime}
                                          </div>
                                        ))}
                                        {(((offering as any).timetables || (offering as any).schedule) as any[]).length > 2 && (
                                          <span className="text-(--text-faint)">+{(((offering as any).timetables || (offering as any).schedule) as any[]).length - 2} more</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-(--text-faint) italic">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">{statusBadge(offering.status)}</td>
                                  <td className="px-3 py-2.5">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      icon={<Eye className="w-3.5 h-3.5" />}
                                      onClick={() => setSelected(offering as any)}
                                      title="View details"
                                    >
                                      View
                                    </Button>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.course?.code || ''} — ${selected.course?.name || ''}` : ''} subtitle="Course Offering Details" width="max-w-2xl">
        {selected && (
          <div className="space-y-5 text-sm font-sans">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Semester',  selected.semester ? `${selected.semester.name} ${selected.semester.academicYear?.name || ''}` : '—'],
                ['Section',   selected.section],
                ['Credits',   `${selected.course?.creditHours || 0} credit hours`],
                ['Room',      selected.room ? `${selected.room.building} ${selected.room.name}` : '—'],
                ['Capacity',  `${selected.capacity || 0} seats`],
                ['Enrolled',  `${selected.enrolledCount || (selected as any)._count?.enrollments || 0} (${selected.utilizationPct || 0}%)`],
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
                {selected.timetables.map((t: { dayOfWeek: number; startTime: string; endTime: string }, i: number) => (
                  <p key={i} className="text-xs text-(--text-secondary) font-mono">{DAY_NAMES[t.dayOfWeek]} · {t.startTime} – {t.endTime}</p>
                ))}
              </div>
            )}
            {selected.course.prerequisites.length > 0 && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Prerequisites</p>
                {selected.course.prerequisites.map((p: { prerequisite: { code: string } }, i: number) => (
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
            section: 'A',
            capacity: 40,
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
              <p className="text-xs text-(--text-faint)">European Credit Transfer System (1-20)</p>
            </div>
          </div>

          {!editCourse && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Section *</label>
                <Input
                  value={courseForm.section}
                  onChange={e => setCourseForm(prev => ({ ...prev, section: e.target.value }))}
                  placeholder="e.g., A"
                  maxLength={10}
                  disabled={courseLoading}
                />
                <p className="text-xs text-(--text-faint)">Section identifier (A, B, etc.)</p>
              </div>

              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Capacity *</label>
                <Input
                  type="number"
                  value={courseForm.capacity}
                  onChange={e => setCourseForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 40 }))}
                  min={1}
                  max={200}
                  disabled={courseLoading}
                />
                <p className="text-xs text-(--text-faint)">Maximum number of students</p>
              </div>
            </div>
          )}

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
      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => {
          setDeleteConfirm(null);
          setDeleteConfirmText('');
          setCourseError('');
        }} 
        title={courseError ? "Cannot Delete Course" : "Delete Course"} 
        maxWidth="max-w-md"
      >
        {deleteConfirm && (
          <div className="space-y-5">
            {!courseError ? (
              <>
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--status-danger)' }} />
                  <div>
                    <p className="font-sans text-sm font-semibold" style={{ color: 'var(--status-danger)' }}>
                      Permanent Deletion
                    </p>
                    <p className="font-sans text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      This action cannot be undone. The course will be permanently removed from the system.
                    </p>
                  </div>
                </div>

                <p className="font-sans text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Are you sure you want to delete course <strong style={{ color: 'var(--brand-gold)' }}>{deleteConfirm.code}</strong>?
                </p>
                
                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}>
                  <p className="font-mono text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>Course Details</p>
                  <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deleteConfirm.name}</p>
                  <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Code: {deleteConfirm.code} • {deleteConfirm.creditHours} Credits • {deleteConfirm.ects} ECTS
                  </p>
                </div>

                {/* Type "delete" to confirm */}
                <div className="space-y-2">
                  <label className="font-sans text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Type <code className="px-1.5 py-0.5 rounded bg-(--hover-overlay) text-(--status-danger) font-mono text-xs">delete</code> to confirm
                  </label>
                  <Input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type 'delete' here"
                    disabled={courseLoading}
                    className="font-mono"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => {
                      setDeleteConfirm(null);
                      setDeleteConfirmText('');
                    }} 
                    disabled={courseLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleDeleteCourse}
                    disabled={courseLoading || deleteConfirmText.toLowerCase() !== 'delete'}
                    icon={courseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  >
                    {courseLoading ? 'Deleting…' : 'Delete Course'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Show when course has protected history */}
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--brand-gold)' }} />
                  <div>
                    <p className="font-sans text-sm font-semibold" style={{ color: 'var(--brand-gold)' }}>
                      Course Has Academic History
                    </p>
                    <p className="font-sans text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {courseError}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}>
                  <p className="font-mono text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>Course Details</p>
                  <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deleteConfirm.name}</p>
                  <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Code: {deleteConfirm.code} • {deleteConfirm.creditHours} Credits • {deleteConfirm.ects} ECTS
                  </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(234, 179, 8, 0.05)', borderColor: 'var(--border-subtle)' }}>
                  <p className="font-sans text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Recommended Action: Deactivate</p>
                  <ul className="text-xs text-(--text-secondary) space-y-1.5">
                    <li>✓ Preserves all academic records (grades, transcripts, history)</li>
                    <li>✓ Prevents new enrollments and assignments</li>
                    <li>✓ Students can still view historical data</li>
                    <li>✓ Can be reactivated later if needed</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => {
                      setDeleteConfirm(null);
                      setDeleteConfirmText('');
                      setCourseError('');
                    }} 
                    disabled={courseLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleDeactivateCourse}
                    disabled={courseLoading}
                    icon={courseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  >
                    {courseLoading ? 'Deactivating…' : 'Deactivate Course'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Publish Confirmation Modal */}
      <Modal isOpen={publishConfirm} onClose={() => !publishLoading && setPublishConfirm(false)} title="Publish Courses to Students" maxWidth="max-w-md">
        <div className="space-y-5">
          <p className="font-sans text-sm text-(--text-secondary) leading-relaxed">
            You are about to publish courses to the current semester.
          </p>
          <div className="p-4 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-(--brand-gold) shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-(--text-primary) mb-2">What happens next?</p>
                <ul className="text-xs text-(--text-secondary) space-y-1.5">
                  <li>✓ Course offerings will be activated in the current semester</li>
                  <li>✓ Finance- and Registrar-approved students in your department will be automatically enrolled</li>
                  <li>✓ Courses will immediately appear in students&apos; &quot;My Courses&quot;</li>
                  <li>✓ Students from other departments cannot see these courses</li>
                </ul>
              </div>
            </div>
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
              {publishLoading ? 'Publishing…' : 'Publish Courses'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Instructor SlidePanel */}
      {selectedForAssignment && (
        <SlidePanel 
          isOpen={assignInstructorOpen} 
          onClose={() => {
            setAssignInstructorOpen(false);
            setSelectedForAssignment(null);
          }}
          title="Assign Instructor & Create Assignments"
          subtitle={`${selectedForAssignment.course.code} - Section ${selectedForAssignment.section}`}
          width="max-w-2xl"
        >
          <div className="space-y-6 font-sans">
            {/* Course Info */}
            <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--hover-overlay)">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-(--brand-gold)" />
                <span className="font-semibold text-sm text-(--text-primary)">{selectedForAssignment.course.name}</span>
              </div>
              <div className="flex gap-4 flex-wrap text-xs text-(--text-secondary)">
                <span>Section: <strong>{selectedForAssignment.section}</strong></span>
                <span>Capacity: <strong>{selectedForAssignment.capacity}</strong></span>
                <span>Enrolled: <strong>{selectedForAssignment.enrolledCount}</strong></span>
                <span>Credits: <strong>{selectedForAssignment.course.creditHours}</strong></span>
              </div>
            </div>

            {/* Instructor Assignment */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-(--brand-gold)" />
                <h3 className="font-semibold text-sm text-(--text-primary)">Step 1: Assign Instructor</h3>
              </div>
              <p className="text-xs text-(--text-secondary)">
                Select an instructor from your department or from other departments to teach this course.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={<Users className="w-4 h-4" />}
                onClick={() => {
                  // Switch to Course Assignments view
                  setViewMode('assignments');
                  setAssignInstructorOpen(false);
                  setSelectedForAssignment(null);
                }}
              >
                Go to Course Assignments
              </Button>
            </div>

            {/* Create Assignments Section */}
            <div className="space-y-3 pt-4 border-t border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-(--brand-gold)" />
                <h3 className="font-semibold text-sm text-(--text-primary)">Step 2: Create Course Assignments</h3>
              </div>
              <p className="text-xs text-(--text-secondary)">
                After assigning an instructor, you can create assignments, quizzes, and course materials.
              </p>
              <div className="p-3 rounded-xl bg-(--status-info-bg) border border-(--status-info)/20">
                <p className="text-xs text-(--status-info)">
                  <strong>Note:</strong> An instructor must be assigned before creating course assignments and materials.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setAssignInstructorOpen(false);
                  setSelectedForAssignment(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </SlidePanel>
      )}
    </motion.div>
  );
};
