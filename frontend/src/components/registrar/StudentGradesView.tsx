'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, ChevronRight, Search, CheckCircle2, Clock,
  AlertCircle, Eye, RefreshCw, Lock, Unlock,
  BookOpen, GraduationCap, Users, ArrowLeft, Award,
  Check, Sparkles, Send, FileText, ToggleLeft, ToggleRight
} from 'lucide-react';
import { DHPageHeader } from '../dh/DHPageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SlidePanel } from '../ui/SlidePanel';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  gradeManagementApi,
  gradeEditingApi,
  gradePortalApi,
  type DepartmentGradeCard,
  type DepartmentStudentGradeItem,
  type CourseSubmissionStatusItem,
  type StudentGradeDetailResponse,
  type GradeEditingStatus,
  type GradePortalStatus,
} from '@/src/lib/registrarApi';

const GRADE_BADGE_VARIANT: Record<string, 'emerald' | 'info' | 'amber' | 'rose' | 'glass'> = {
  'A+': 'emerald',
  'A':  'emerald',
  'A-': 'emerald',
  'B+': 'info',
  'B':  'info',
  'B-': 'info',
  'C+': 'amber',
  'C':  'amber',
  'C-': 'amber',
  'D':  'rose',
  'F':  'rose',
};

const SUBMISSION_BADGE_VARIANT: Record<string, 'emerald' | 'info' | 'amber' | 'rose' | 'glass'> = {
  PUBLISHED:   'emerald',
  SUBMITTED:   'info',
  IN_PROGRESS: 'amber',
  PENDING:     'rose',
  EMPTY:       'glass',
};

interface StudentGradesViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

export const StudentGradesView: React.FC<StudentGradesViewProps> = ({
  programType = 'TVET',
}) => {
  // Navigation level
  const [viewLevel, setViewLevel] = useState<'departments' | 'department'>('departments');
  const [selectedDept, setSelectedDept] = useState<DepartmentGradeCard | null>(null);
  const [activeDeptTab, setActiveDeptTab] = useState<'students' | 'submissions'>('students');

  // Slide panel for individual student
  const [selectedStudentRecordId, setSelectedStudentRecordId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentGradeDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Department cards state
  const [deptCards, setDeptCards] = useState<DepartmentGradeCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);

  // Department detail state
  const [deptStudents, setDeptStudents] = useState<DepartmentStudentGradeItem[]>([]);
  const [submissions, setSubmissions] = useState<CourseSubmissionStatusItem[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');

  // Independent Control Toggles
  const [gradeEditing, setGradeEditing] = useState<GradeEditingStatus>({ isOpen: true });
  const [gradePortal, setGradePortal] = useState<GradePortalStatus>({ isOpen: false, openedAt: null, closedAt: null });
  const [togglingEditing, setTogglingEditing] = useState(false);
  const [togglingPortal, setTogglingPortal] = useState(false);

  // Modals
  const [publishTarget, setPublishTarget] = useState<CourseSubmissionStatusItem | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // 1. Load Settings (Editing & Portal)
  const loadSettings = useCallback(async () => {
    try {
      const [editingRes, portalRes] = await Promise.all([
        gradeEditingApi.getStatus().catch(() => ({ isOpen: true })),
        gradePortalApi.getStatus().catch(() => ({ isOpen: false, openedAt: null, closedAt: null })),
      ]);
      setGradeEditing(editingRes);
      setGradePortal(portalRes);
    } catch {
      // Ignore
    }
  }, []);

  // 2. Load Department Cards
  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    setCardsError(null);
    try {
      const cards = await gradeManagementApi.getDepartments(programType);
      setDeptCards(cards);
    } catch (err: unknown) {
      setCardsError(err instanceof Error ? err.message : 'Failed to load department grade data');
    } finally {
      setCardsLoading(false);
    }
  }, [programType]);

  // 3. Load Department Specific Data
  const loadDeptData = useCallback(async (deptId: string) => {
    setDeptLoading(true);
    setDeptError(null);
    try {
      const [gradesRes, subRes] = await Promise.all([
        gradeManagementApi.getDepartmentGrades(deptId, programType),
        gradeManagementApi.getCourseSubmissionStatus(deptId, programType),
      ]);
      setDeptStudents(gradesRes.students);
      setSubmissions(subRes);
    } catch (err: unknown) {
      setDeptError(err instanceof Error ? err.message : 'Failed to load department details');
    } finally {
      setDeptLoading(false);
    }
  }, [programType]);

  // Initial mount & programType change
  useEffect(() => {
    loadSettings();
    loadCards();
    if (selectedDept) {
      loadDeptData(selectedDept.id);
    }
  }, [programType, loadCards, loadSettings]);

  // Toggle Grade Editing (Independent: controls instructors)
  const handleToggleGradeEditing = async () => {
    setTogglingEditing(true);
    try {
      const updated = gradeEditing.isOpen
        ? await gradeEditingApi.close()
        : await gradeEditingApi.open();
      setGradeEditing(updated);
      showToast(
        updated.isOpen
          ? 'Teacher grade editing is now OPEN across all departments.'
          : 'Teacher grade editing is now CLOSED. Teachers cannot edit marks.',
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update grade editing status');
    } finally {
      setTogglingEditing(false);
    }
  };

  // Toggle Grade Portal (Independent: controls student visibility)
  const handleToggleGradePortal = async () => {
    setTogglingPortal(true);
    try {
      const updated = gradePortal.isOpen
        ? await gradePortalApi.close()
        : await gradePortalApi.open();
      setGradePortal(updated);
      showToast(
        updated.isOpen
          ? 'Student Grade Portal is now OPEN. Students can view published grades.'
          : 'Student Grade Portal is now CLOSED. Grades are hidden from students.',
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update grade portal status');
    } finally {
      setTogglingPortal(false);
    }
  };

  // Navigate to Department
  const handleOpenDepartment = (dept: DepartmentGradeCard) => {
    setSelectedDept(dept);
    setViewLevel('department');
    setSearch('');
    loadDeptData(dept.id);
  };

  // Open Student Detail
  const handleOpenStudentDetail = async (studentRecordId: string) => {
    setSelectedStudentRecordId(studentRecordId);
    setDetailLoading(true);
    try {
      const detail = await gradeManagementApi.getStudentGradeDetail(studentRecordId);
      setStudentDetail(detail);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load student academic record');
    } finally {
      setDetailLoading(false);
    }
  };

  // Publish Offering Grades
  const handlePublishOffering = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    try {
      const res = await gradeManagementApi.publishOfferingGrades(publishTarget.offeringId);
      showToast(res.message);
      setPublishTarget(null);
      if (selectedDept) {
        loadDeptData(selectedDept.id);
      }
      loadCards();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to publish grades');
    } finally {
      setPublishing(false);
    }
  };

  // Filtered Students in Department view
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return deptStudents;
    const q = search.toLowerCase();
    return deptStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.courses.some((c) => c.courseName.toLowerCase().includes(q) || c.courseCode.toLowerCase().includes(q)),
    );
  }, [deptStudents, search]);

  // Filtered Submissions in Department view
  const filteredSubmissions = useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter(
      (s) =>
        s.courseName.toLowerCase().includes(q) ||
        s.courseCode.toLowerCase().includes(q) ||
        s.instructorName.toLowerCase().includes(q),
    );
  }, [submissions, search]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-zinc-900/95 border border-[#E9C349]/40 text-white shadow-2xl text-xs font-mono flex items-center gap-2.5 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-[#E9C349] shrink-0" />
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <DHPageHeader
        title="Student Grades"
        subtitle={`Departmental grade records, teacher submission tracking, and institutional authority for ${
          programType === 'SHORT_PROGRAM' ? 'Short Program Courses' : 'TVET Regular Programs'
        }`}
        icon={<GraduationCap className="w-6 h-6 text-[#E9C349]" />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Control Toggle 1: Teacher Grade Editing */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Teacher Editing</span>
                <span className={`text-xs font-bold font-mono ${gradeEditing.isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {gradeEditing.isOpen ? '● OPEN' : '○ CLOSED'}
                </span>
              </div>
              <Button
                variant={gradeEditing.isOpen ? 'danger' : 'primary'}
                size="sm"
                onClick={handleToggleGradeEditing}
                disabled={togglingEditing}
                className="text-xs h-7 px-2.5 py-0"
              >
                {togglingEditing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : gradeEditing.isOpen ? (
                  <>
                    <Lock className="w-3 h-3 mr-1" /> Close Editing
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3 mr-1" /> Open Editing
                  </>
                )}
              </Button>
            </div>

            {/* Control Toggle 2: Student Grade Portal */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Student Portal</span>
                <span className={`text-xs font-bold font-mono ${gradePortal.isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {gradePortal.isOpen ? '● PUBLISHED' : '○ HIDDEN'}
                </span>
              </div>
              <Button
                variant={gradePortal.isOpen ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleToggleGradePortal}
                disabled={togglingPortal}
                className="text-xs h-7 px-2.5 py-0"
              >
                {togglingPortal ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : gradePortal.isOpen ? (
                  <>
                    <Lock className="w-3 h-3 mr-1" /> Close Portal
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" /> Open Portal
                  </>
                )}
              </Button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadSettings();
                loadCards();
                if (selectedDept) loadDeptData(selectedDept.id);
              }}
              className="p-2 h-9"
              title="Refresh Grade Data"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400 hover:text-white" />
            </Button>
          </div>
        }
      />

      {/* VIEW LEVEL 1: DEPARTMENT CARDS */}
      {viewLevel === 'departments' && (
        <div className="space-y-6">
          {/* Institutional Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Departments</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{deptCards.length}</p>
            </div>
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Active Students</p>
              <p className="text-xl font-bold font-mono text-[#E9C349] mt-1">
                {deptCards.reduce((acc, d) => acc + d.totalStudents, 0)}
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Submitted Courses</p>
              <p className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {deptCards.reduce((acc, d) => acc + d.submittedOfferings, 0)}
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Pending Submissions</p>
              <p className="text-xl font-bold font-mono text-amber-400 mt-1">
                {deptCards.reduce((acc, d) => acc + d.pendingOfferings, 0)}
              </p>
            </div>
          </div>

          {/* Department Cards Grid */}
          {cardsLoading ? (
            <SkeletonTable />
          ) : cardsError ? (
            <ErrorState variant="network" onRetry={loadCards} description={cardsError} />
          ) : deptCards.length === 0 ? (
            <EmptyState
              variant="default"
              title="No Departments Found"
              description={`No departments currently exist for ${programType}.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {deptCards.map((dept) => {
                const totalOff = dept.totalOfferings;
                const subOff = dept.submittedOfferings;
                const pct = totalOff > 0 ? Math.round((subOff / totalOff) * 100) : 0;

                return (
                  <motion.div
                    key={dept.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleOpenDepartment(dept)}
                    className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-md p-5 flex flex-col justify-between cursor-pointer hover:border-[#E9C349]/50 hover:shadow-xl hover:shadow-[#E9C349]/5 transition-all overflow-hidden"
                  >
                    {/* Top Row: Code Badge & Program */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center text-[#E9C349] font-mono font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                          {dept.code}
                        </div>
                        <div>
                          <h3 className="font-serif text-sm font-bold text-white group-hover:text-[#E9C349] transition-colors line-clamp-1">
                            {dept.name}
                          </h3>
                          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            {dept.totalCourses} courses · {dept.totalInstructors} teachers
                          </p>
                        </div>
                      </div>

                      <Badge variant={subOff > 0 && subOff === totalOff ? 'emerald' : subOff > 0 ? 'info' : 'amber'}>
                        {subOff > 0 && subOff === totalOff
                          ? 'Complete'
                          : subOff > 0
                          ? `${subOff}/${totalOff} Submitted`
                          : 'Pending'}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="my-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
                        <span>Teacher Submissions</span>
                        <span className="font-bold text-white">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-[#E9C349] to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Metadata & Button */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-mono font-semibold text-zinc-300">{dept.totalStudents}</span>
                        <span className="text-[11px]">students</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-[#E9C349] group-hover:translate-x-0.5 transition-transform">
                        Manage Grades
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW LEVEL 2: DEPARTMENT DETAIL */}
      {viewLevel === 'department' && selectedDept && (
        <div className="space-y-6">
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewLevel('departments')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                All Departments
              </Button>
              <span className="text-zinc-600">/</span>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#E9C349]/20 text-[#E9C349] font-mono font-bold text-xs flex items-center justify-center">
                  {selectedDept.code}
                </span>
                <span className="font-serif font-bold text-white text-sm sm:text-base">
                  {selectedDept.name}
                </span>
              </div>
            </div>

            {/* Tab Switcher inside Department */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveDeptTab('students')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeDeptTab === 'students'
                    ? 'bg-[#E9C349] text-black font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Student Grades ({deptStudents.length})
              </button>
              <button
                onClick={() => setActiveDeptTab('submissions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeDeptTab === 'submissions'
                    ? 'bg-[#E9C349] text-black font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Course Submissions ({submissions.length})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder={
                  activeDeptTab === 'students'
                    ? 'Search by student name, ID, or course...'
                    : 'Search course code, course title, or instructor...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {deptLoading ? (
            <SkeletonTable />
          ) : deptError ? (
            <ErrorState variant="network" onRetry={() => loadDeptData(selectedDept.id)} description={deptError} />
          ) : activeDeptTab === 'students' ? (
            /* TAB 1: STUDENT GRADES TABLE */
            filteredStudents.length === 0 ? (
              <EmptyState
                variant="students"
                title="No Students Found"
                description={
                  search
                    ? 'No students match your search criteria.'
                    : `No students are registered in ${selectedDept.name}.`
                }
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[960px]">
                    <thead className="bg-black/40 border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-4 py-3.5">Student</th>
                        <th className="px-4 py-3.5">Student ID</th>
                        <th className="px-4 py-3.5">Year</th>
                        <th className="px-4 py-3.5">Enrolled Course Grades</th>
                        <th className="px-4 py-3.5 text-center">CGPA</th>
                        <th className="px-4 py-3.5 text-right">Academic Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                          {/* Student Identity */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#E9C349]/20 border border-[#E9C349]/40 flex items-center justify-center font-serif font-bold text-xs text-[#E9C349] shrink-0">
                                {student.fullName[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white text-xs truncate">{student.fullName}</p>
                                <p className="text-[10px] text-zinc-400 font-mono truncate">{student.programName}</p>
                              </div>
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="px-4 py-4 font-mono text-xs text-zinc-300">
                            {student.studentId}
                          </td>

                          {/* Year Level */}
                          <td className="px-4 py-4 font-mono text-xs text-zinc-400">
                            Year {student.yearLevel}
                          </td>

                          {/* Simplified Course Grades (NO assessment breakdown) */}
                          <td className="px-4 py-4">
                            {student.courses.length === 0 ? (
                              <span className="text-zinc-500 italic text-[11px]">No active enrollments</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {student.courses.map((course) => (
                                  <div
                                    key={course.enrollmentId}
                                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/30 flex items-center gap-2 text-[11px]"
                                    title={`${course.courseName} | Teacher: ${course.instructorName} | Status: ${course.status}`}
                                  >
                                    <span className="font-mono text-zinc-300 font-semibold">{course.courseCode}</span>
                                    {course.letterGrade ? (
                                      <span
                                        className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                                          course.letterGrade.startsWith('A')
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : course.letterGrade.startsWith('B')
                                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                            : course.letterGrade.startsWith('C')
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                        }`}
                                      >
                                        {course.letterGrade}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-500 font-mono text-[10px]">—</span>
                                    )}
                                    <span className="text-zinc-500 text-[10px] font-mono">
                                      GP: {course.gradePoints !== null ? course.gradePoints.toFixed(2) : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* CGPA */}
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-sm font-bold text-white bg-black/30 px-2.5 py-1 rounded-lg border border-white/10 inline-block">
                              {student.cgpa.toFixed(2)}
                            </span>
                          </td>

                          {/* Action: Open SlidePanel */}
                          <td className="px-4 py-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenStudentDetail(student.id)}
                              className="text-xs h-7 px-2.5 py-0"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Detail
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* TAB 2: COURSE SUBMISSION STATUS TABLE */
            filteredSubmissions.length === 0 ? (
              <EmptyState
                variant="courses"
                title="No Course Offerings"
                description={`No active course offerings found in ${selectedDept.name}.`}
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[880px]">
                    <thead className="bg-black/40 border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-4 py-3.5">Course</th>
                        <th className="px-4 py-3.5">Assigned Instructor</th>
                        <th className="px-4 py-3.5">Term</th>
                        <th className="px-4 py-3.5 text-center">Students</th>
                        <th className="px-4 py-3.5 text-center">Submission Status</th>
                        <th className="px-4 py-3.5 text-right">Registrar Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.offeringId} className="hover:bg-white/5 transition-colors">
                          {/* Course Name & Code */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-bold text-[#E9C349] bg-[#E9C349]/10 px-2 py-1 rounded border border-[#E9C349]/30 text-xs">
                                {sub.courseCode}
                              </span>
                              <span className="font-serif font-bold text-white text-xs">
                                {sub.courseName}
                              </span>
                            </div>
                          </td>

                          {/* Assigned Teacher */}
                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-xs truncate">{sub.instructorName}</p>
                              {sub.instructorEmail && (
                                <p className="text-[10px] text-zinc-400 font-mono truncate">{sub.instructorEmail}</p>
                              )}
                            </div>
                          </td>

                          {/* Term */}
                          <td className="px-4 py-4 font-mono text-xs text-zinc-400">
                            {sub.semesterName}
                          </td>

                          {/* Total Students & Breakdown */}
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono font-bold text-white text-xs">
                              {sub.totalStudents} enrolled
                            </span>
                            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                              {sub.submittedCount} submitted · {sub.draftCount} draft
                            </p>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-4 text-center">
                            <Badge variant={SUBMISSION_BADGE_VARIANT[sub.submissionStatus] ?? 'glass'}>
                              {sub.submissionStatus}
                            </Badge>
                          </td>

                          {/* Registrar Action */}
                          <td className="px-4 py-4 text-right">
                            {sub.submissionStatus === 'PUBLISHED' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-mono">
                                <Check className="w-3.5 h-3.5" /> Published
                              </span>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setPublishTarget(sub)}
                                disabled={sub.submittedCount === 0}
                                className="text-xs h-7 px-2.5 py-0"
                                title={
                                  sub.submittedCount === 0
                                    ? 'Teacher has not submitted grades yet'
                                    : 'Publish grades to student portal'
                                }
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Publish Grades
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* SLIDE PANEL: DETAILED STUDENT ACADEMIC RECORD */}
      <SlidePanel
        isOpen={Boolean(selectedStudentRecordId)}
        onClose={() => {
          setSelectedStudentRecordId(null);
          setStudentDetail(null);
        }}
        title={studentDetail?.student ? `${studentDetail.student.fullName} — Official Academic Record` : 'Academic Record'}
        subtitle={studentDetail?.student ? `Student ID: ${studentDetail.student.studentId} · ${studentDetail.student.program.name}` : ''}
        width="max-w-4xl"
      >
        {detailLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#E9C349]" />
            <p className="text-xs font-mono text-zinc-400">Loading academic history...</p>
          </div>
        ) : !studentDetail ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No academic data available.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cumulative Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/40">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Cumulative GPA</span>
                <p className="text-xl font-bold font-mono text-[#E9C349] mt-1">
                  {studentDetail.history.academicSummary.cgpa.toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/40">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Total Quality Points</span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {studentDetail.history.academicSummary.totalQualityPoints.toFixed(1)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/40">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Total ECTS</span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {studentDetail.history.academicSummary.totalEcts}
                </p>
              </div>
            </div>

            {/* Terms breakdown */}
            {studentDetail.history.termSummaries.length === 0 ? (
              <div className="p-6 rounded-xl border border-white/10 text-center text-xs text-zinc-400">
                No submitted or published courses recorded for this student yet.
              </div>
            ) : (
              studentDetail.history.termSummaries.map((term, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden shadow-sm"
                >
                  {/* Term Header */}
                  <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-white">{term.term}</h4>
                      <p className="text-[11px] font-mono text-zinc-400">
                        Semester GPA: <span className="text-[#E9C349] font-bold">{term.semesterGpa.toFixed(2)}</span> · {term.totalEcts} ECTS · {term.totalQualityPoints.toFixed(1)} QP
                      </p>
                    </div>
                  </div>

                  {/* Course Table for this Term (NO individual assessment marks) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/30 border-b border-white/5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        <tr>
                          <th className="px-3 py-2.5">Course Code</th>
                          <th className="px-3 py-2.5">Course Title</th>
                          <th className="px-3 py-2.5 text-center">ECTS</th>
                          <th className="px-3 py-2.5 text-center">Final Mark</th>
                          <th className="px-3 py-2.5 text-center">Grade</th>
                          <th className="px-3 py-2.5 text-center">Grade Point</th>
                          <th className="px-3 py-2.5 text-center">Quality Points</th>
                          <th className="px-3 py-2.5">Teacher</th>
                          <th className="px-3 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {term.courses.map((c: any) => (
                          <tr key={c.id} className="hover:bg-white/5">
                            <td className="px-3 py-2.5 text-[#E9C349] font-bold">{c.courseCode}</td>
                            <td className="px-3 py-2.5 text-white font-sans">{c.courseTitle}</td>
                            <td className="px-3 py-2.5 text-center text-zinc-400">{c.ects}</td>
                            <td className="px-3 py-2.5 text-center text-white">{c.finalMark ?? '—'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  c.grade.startsWith('A')
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : c.grade.startsWith('B')
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : c.grade.startsWith('C')
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {c.grade}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-zinc-300">{Number(c.gradePoints).toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-center text-[#E9C349]">{Number(c.qualityPoints).toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-zinc-400 font-sans text-[11px] truncate max-w-[120px]">{c.instructor}</td>
                            <td className="px-3 py-2.5 text-right">
                              <Badge variant={c.status === 'PUBLISHED' ? 'emerald' : 'info'}>
                                {c.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SlidePanel>

      {/* CONFIRM MODAL: PUBLISH GRADES */}
      <ConfirmModal
        isOpen={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublishOffering}
        title="Publish Course Grades"
        message={`Are you sure you want to publish final grades for ${publishTarget?.courseCode} — ${publishTarget?.courseName}? This will make submitted grades permanently visible to students when the Student Grade Portal is open, and recalculate cumulative CGPA.`}
        confirmLabel={publishing ? 'Publishing...' : 'Publish Grades'}
        variant="warning"
      />
    </div>
  );
};

export default StudentGradesView;
