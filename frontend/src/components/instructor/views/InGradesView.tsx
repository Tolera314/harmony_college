'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Lock,
  Save,
  Send,
  Info,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SkeletonPage, EmptyState } from '../../ui/States';
import {
  instructorClassesApi,
  type ClassOffering,
  type CourseGradeEntry,
} from '../../../lib/instructorApi';
import {
  calculateCourseResult,
  formatGradePoint,
  formatQualityPoints,
} from '@/src/lib/grading';

interface LocalAssessmentMarks {
  assignment: string;
  quiz: string;
  midExam: string;
  finalExam: string;
  attendance: string;
}

const MAX_MARKS: Record<keyof LocalAssessmentMarks, number> = {
  assignment: 15,
  quiz: 5,
  midExam: 30,
  finalExam: 45,
  attendance: 5,
};

const gradeBadgeColor = (letter: string | undefined) => {
  if (!letter) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  if (letter.startsWith('A')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (letter.startsWith('B')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (letter.startsWith('C')) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  if (letter === 'D') return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
};

export interface InGradesViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

export const InGradesView: React.FC<InGradesViewProps> = ({ programType }) => {
  const [classes, setClasses] = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<string>('');
  const [grades, setGrades] = useState<CourseGradeEntry[]>([]);
  const [localMarks, setLocalMarks] = useState<Record<string, LocalAssessmentMarks>>({});
  const [classesLoading, setClassesLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [submittingToRegistrar, setSubmittingToRegistrar] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [isEditingOpen, setIsEditingOpen] = useState<boolean>(true);

  // ── Load grade editing permission ────────────────────────────────────────
  const checkEditingStatus = useCallback(async () => {
    try {
      const res = await instructorClassesApi.getGradeEditingStatus();
      setIsEditingOpen(res.isOpen);
    } catch {
      setIsEditingOpen(true);
    }
  }, []);

  useEffect(() => {
    checkEditingStatus();
  }, [checkEditingStatus]);

  // ── Load classes ─────────────────────────────────────────────────────────
  useEffect(() => {
    instructorClassesApi
      .list(programType)
      .then((data) => {
        setClasses(data);
        if (data.length > 0) {
          const current = data.find((o) => o.semester.isCurrent);
          setSelectedOffering((prev) =>
            prev && data.some((d) => d.id === prev) ? prev : current ? current.id : data[0].id
          );
        } else {
          setSelectedOffering('');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setClassesLoading(false));
  }, [programType]);

  // ── Load course grades ────────────────────────────────────────────────────
  const loadGrades = useCallback(async () => {
    if (!selectedOffering) return;
    setGradesLoading(true);
    setError(null);
    try {
      const data = await instructorClassesApi.getCourseGrades(selectedOffering);
      const studentList: CourseGradeEntry[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.students)
        ? (data as any).students
        : [];
      setGrades(studentList);

      // Pre-fill local marks from existing DB values
      const map: Record<string, LocalAssessmentMarks> = {};
      studentList.forEach((g) => {
        map[g.enrollmentId] = {
          assignment: g.currentGrade?.assignmentMarks != null ? String(g.currentGrade.assignmentMarks) : '',
          quiz: g.currentGrade?.quizMarks != null ? String(g.currentGrade.quizMarks) : '',
          midExam: g.currentGrade?.midExamMarks != null ? String(g.currentGrade.midExamMarks) : '',
          finalExam: g.currentGrade?.finalExamMarks != null ? String(g.currentGrade.finalExamMarks) : '',
          attendance: g.currentGrade?.attendanceMarks != null ? String(g.currentGrade.attendanceMarks) : '',
        };
      });
      setLocalMarks(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load grades');
    } finally {
      setGradesLoading(false);
    }
  }, [selectedOffering]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const selectedClass = classes.find((c) => c.id === selectedOffering);
  const courseEcts =
    Array.isArray(grades) && grades[0]?.ects
      ? grades[0].ects
      : selectedClass?.course
      ? (selectedClass.course as any).ects ?? 4
      : 4;
  const courseCreditHours =
    selectedClass?.course.creditHours ?? (Array.isArray(grades) ? grades[0]?.creditHours : 3) ?? 3;

  // Check if offering is submitted or published
  const isOfferingSubmitted = useMemo(() => {
    if (!Array.isArray(grades) || grades.length === 0) return false;
    return grades.some(
      (g) =>
        g.gradeStatus === 'SUBMITTED' ||
        g.gradeStatus === 'PUBLISHED' ||
        g.currentGrade?.status === 'SUBMITTED' ||
        g.currentGrade?.status === 'PUBLISHED'
    );
  }, [grades]);

  const isOfferingPublished = useMemo(() => {
    if (!Array.isArray(grades) || grades.length === 0) return false;
    return grades.some(
      (g) =>
        g.gradeStatus === 'PUBLISHED' ||
        g.currentGrade?.status === 'PUBLISHED'
    );
  }, [grades]);

  // Update a student's assessment field locally with component max limit
  const handleMarkChange = (
    enrollmentId: string,
    field: keyof LocalAssessmentMarks,
    value: string
  ) => {
    if (!isEditingOpen) return;
    const max = MAX_MARKS[field];
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > max)) {
      return;
    }
    setLocalMarks((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {
          assignment: '',
          quiz: '',
          midExam: '',
          finalExam: '',
          attendance: '',
        }),
        [field]: value,
      },
    }));
  };

  // Helper: convert local UI state to AssessmentBreakdown (backend field names)
  const parseMarks = (m: LocalAssessmentMarks | undefined) => {
    if (!m) return {};
    return {
      assignment: m.assignment !== '' ? Number(m.assignment) : null,
      quiz: m.quiz !== '' ? Number(m.quiz) : null,
      midExam: m.midExam !== '' ? Number(m.midExam) : null,
      finalExam: m.finalExam !== '' ? Number(m.finalExam) : null,
      attendance: m.attendance !== '' ? Number(m.attendance) : null,
    };
  };

  // Save single student assessment
  const handleSaveDraft = async (enrollmentId: string) => {
    if (!isEditingOpen) return;
    setSavingId(enrollmentId);
    setError(null);
    try {
      const marks = parseMarks(localMarks[enrollmentId]);
      await instructorClassesApi.saveAssessmentGrade(selectedOffering, enrollmentId, marks);
      setSaveSuccessId(enrollmentId);
      setTimeout(() => setSaveSuccessId(null), 2500);
      await loadGrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save assessment');
    } finally {
      setSavingId(null);
    }
  };

  // Bulk save all drafts
  const handleBatchSaveDrafts = async () => {
    if (!isEditingOpen) return;
    setBatchSaving(true);
    setError(null);
    try {
      const entries = grades.map((g) => ({
        enrollmentId: g.enrollmentId,
        breakdown: parseMarks(localMarks[g.enrollmentId]),
      }));
      await instructorClassesApi.saveBatchAssessments(selectedOffering, entries);
      setGlobalSuccess('All assessment drafts saved successfully.');
      setTimeout(() => setGlobalSuccess(null), 3000);
      await loadGrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save batch assessments');
    } finally {
      setBatchSaving(false);
    }
  };

  // Submit to Registrar
  const handleSubmitToRegistrar = async () => {
    if (!isEditingOpen) return;
    setConfirmSubmitModal(false);
    setSubmittingToRegistrar(true);
    setError(null);
    try {
      // First batch-save all current marks
      const entries = grades.map((g) => ({
        enrollmentId: g.enrollmentId,
        breakdown: parseMarks(localMarks[g.enrollmentId]),
      }));
      await instructorClassesApi.saveBatchAssessments(selectedOffering, entries);

      const result = await instructorClassesApi.submitGradesToRegistrar(selectedOffering);
      setGlobalSuccess(result.message || 'Grades submitted to Registrar successfully.');
      setTimeout(() => setGlobalSuccess(null), 4000);
      await loadGrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit grades to Registrar');
    } finally {
      setSubmittingToRegistrar(false);
    }
  };

  if (classesLoading) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Grade Book & Assessments"
        subtitle={
          selectedClass
            ? `${selectedClass.course.code} — ${selectedClass.course.name} · Section ${selectedClass.section} · ${grades.length} students enrolled`
            : 'Course assessment entry'
        }
        icon={<ClipboardList className="w-5 h-5 text-(--brand-gold)" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={loadGrades}
              disabled={gradesLoading}
            >
              Refresh
            </Button>

            {isEditingOpen && grades.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleBatchSaveDrafts}
                  disabled={batchSaving}
                >
                  {batchSaving ? 'Saving Drafts...' : 'Save Drafts'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-4 h-4" />}
                  onClick={() => setConfirmSubmitModal(true)}
                  disabled={submittingToRegistrar}
                >
                  {isOfferingSubmitted ? 'Re-submit to Registrar' : 'Submit to Registrar'}
                </Button>
              </>
            )}

            {!isEditingOpen && (
              <Badge variant="rose">
                <Lock className="w-3.5 h-3.5 mr-1 inline" />
                Grade Editing Closed
              </Badge>
            )}

            {isOfferingSubmitted && (
              <Badge variant={isOfferingPublished ? 'emerald' : 'info'}>
                {isOfferingPublished ? '● Published by Registrar' : '✓ Submitted to Registrar'}
              </Badge>
            )}
          </div>
        }
      />

      {/* Prominent Course Banner */}
      {selectedClass && (
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center font-mono font-bold text-sm text-[#E9C349] shrink-0">
              {selectedClass.course.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E9C349] font-bold">
                  Active Course Grading
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-xs font-mono text-zinc-400">
                  Section {selectedClass.section} · {selectedClass.semester.name}
                </span>
              </div>
              <h2 className="font-serif text-lg font-bold text-white mt-0.5">
                {selectedClass.course.name}
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Course Code: <strong className="text-white">{selectedClass.course.code}</strong> · ECTS: <strong className="text-[#E9C349]">{courseEcts}</strong> · Credit Hours: <strong className="text-white">{courseCreditHours}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-zinc-300">
              Total Students: <strong className="text-white">{grades.length}</strong>
            </span>
            <span className={`px-3 py-1.5 rounded-xl border font-bold ${
              isEditingOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {isEditingOpen ? '● Editing Open' : '○ Editing Closed'}
            </span>
          </div>
        </div>
      )}

      {/* Class selector and Academic Credits banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {classes.length > 1 && (
          <div className="relative inline-block">
            <select
              value={selectedOffering}
              onChange={(e) => {
                setSelectedOffering(e.target.value);
                setLocalMarks({});
              }}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--hover-overlay)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course.code} — Section {c.section} · {c.semester.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: 'var(--text-faint)' }}
            />
          </div>
        )}

        {selectedClass && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              ECTS: <strong className="text-white">{courseEcts}</strong> (Weighting factor)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-300">
              Credit Hours: <strong className="text-white">{courseCreditHours}</strong> (Reference only)
            </span>
          </div>
        )}
      </div>

      {/* Status Notice when Editing Closed */}
      {!isEditingOpen && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs flex items-start gap-3">
          <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-300">Grade Editing Closed by Registrar</p>
            <p className="text-rose-200/80 mt-0.5 leading-relaxed">
              The Registrar Office has closed grade editing for this period. Mark adjustments
              cannot be made at this time.
            </p>
          </div>
        </div>
      )}

      {/* Global error / success banners */}
      {error && (
        <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {globalSuccess && (
        <div className="p-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{globalSuccess}</span>
        </div>
      )}

      {/* Grades Table */}
      {classesLoading || gradesLoading ? (
        <SkeletonPage />
      ) : classes.length === 0 ? (
        <EmptyState
          variant="courses"
          title="No classes assigned"
          description="You have no courses assigned for this academic program."
        />
      ) : grades.length === 0 ? (
        <EmptyState
          variant="grades"
          title="No students enrolled"
          description="No active student enrollments found for this course offering."
        />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl shadow-sm">
          <table className="w-full text-xs font-sans min-w-[960px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                <th className="px-3.5 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) text-left w-48">
                  Student
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) text-left w-24">
                  Student ID
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-amber-300/90 text-center w-24">
                  Assign (15%)
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-amber-300/90 text-center w-20">
                  Quiz (5%)
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-amber-300/90 text-center w-24">
                  Mid Exam (30%)
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-amber-300/90 text-center w-24">
                  Final Exam (45%)
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-amber-300/90 text-center w-20">
                  Attend (5%)
                </th>
                <th className="px-3 py-3 font-mono text-[11px] uppercase tracking-wider text-indigo-300 text-center w-24">
                  Final Mark
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-emerald-300 text-center w-20">
                  Grade
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-emerald-300 text-center w-24">
                  Grade Pt.
                </th>
                <th className="px-2 py-3 font-mono text-[11px] uppercase tracking-wider text-purple-300 text-center w-24">
                  QP (×{courseEcts})
                </th>
                <th className="px-3 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) text-center w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {grades.map((entry) => {
                const marks = localMarks[entry.enrollmentId] || {
                  assignment: '',
                  quiz: '',
                  midExam: '',
                  finalExam: '',
                  attendance: '',
                };

                const calc = calculateCourseResult(
                  {
                    assignment: marks.assignment,
                    quiz: marks.quiz,
                    midExam: marks.midExam,
                    finalExam: marks.finalExam,
                    attendance: marks.attendance,
                  },
                  courseEcts
                );

                const hasAnyMark =
                  marks.assignment !== '' ||
                  marks.quiz !== '' ||
                  marks.midExam !== '' ||
                  marks.finalExam !== '' ||
                  marks.attendance !== '';

                const isSaving = savingId === entry.enrollmentId;
                const isSaved = saveSuccessId === entry.enrollmentId;

                return (
                  <tr
                    key={entry.enrollmentId}
                    className="hover:bg-(--hover-overlay) transition-colors"
                  >
                    {/* Student Info */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center font-serif font-bold text-xs text-(--brand-gold) shrink-0">
                          {entry.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-(--text-primary) truncate">
                            {entry.fullName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="px-2 py-3 font-mono text-[11px] text-(--text-faint)">
                      {entry.studentId}
                    </td>

                    {/* Assign (15%) */}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="15"
                        step="0.5"
                        disabled={!isEditingOpen}
                        value={marks.assignment}
                        onChange={(e) =>
                          handleMarkChange(entry.enrollmentId, 'assignment', e.target.value)
                        }
                        placeholder="/15"
                        className="w-16 px-1.5 py-1 text-center font-mono text-xs rounded-lg border bg-(--hover-overlay) border-(--border-default) focus:border-(--brand-gold) focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Quiz (5%) */}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        disabled={!isEditingOpen}
                        value={marks.quiz}
                        onChange={(e) =>
                          handleMarkChange(entry.enrollmentId, 'quiz', e.target.value)
                        }
                        placeholder="/5"
                        className="w-16 px-1.5 py-1 text-center font-mono text-xs rounded-lg border bg-(--hover-overlay) border-(--border-default) focus:border-(--brand-gold) focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Mid Exam (30%) */}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        disabled={!isEditingOpen}
                        value={marks.midExam}
                        onChange={(e) =>
                          handleMarkChange(entry.enrollmentId, 'midExam', e.target.value)
                        }
                        placeholder="/30"
                        className="w-16 px-1.5 py-1 text-center font-mono text-xs rounded-lg border bg-(--hover-overlay) border-(--border-default) focus:border-(--brand-gold) focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Final Exam (45%) */}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="45"
                        step="0.5"
                        disabled={!isEditingOpen}
                        value={marks.finalExam}
                        onChange={(e) =>
                          handleMarkChange(entry.enrollmentId, 'finalExam', e.target.value)
                        }
                        placeholder="/45"
                        className="w-16 px-1.5 py-1 text-center font-mono text-xs rounded-lg border bg-(--hover-overlay) border-(--border-default) focus:border-(--brand-gold) focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Attend (5%) */}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        disabled={!isEditingOpen}
                        value={marks.attendance}
                        onChange={(e) =>
                          handleMarkChange(entry.enrollmentId, 'attendance', e.target.value)
                        }
                        placeholder="/5"
                        className="w-16 px-1.5 py-1 text-center font-mono text-xs rounded-lg border bg-(--hover-overlay) border-(--border-default) focus:border-(--brand-gold) focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Auto-Calculated Final Mark */}
                    <td className="px-3 py-3 text-center font-mono text-xs font-bold text-indigo-300">
                      {hasAnyMark ? calc.finalMark : '—'}
                    </td>

                    {/* Auto-Calculated Letter Grade */}
                    <td className="px-2 py-3 text-center">
                      {hasAnyMark ? (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border ${gradeBadgeColor(
                            calc.letterGrade
                          )}`}
                        >
                          {calc.letterGrade}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Auto-Calculated Grade Point */}
                    <td className="px-2 py-3 text-center font-mono text-xs font-semibold text-emerald-400">
                      {hasAnyMark ? formatGradePoint(calc.gradePoints) : '—'}
                    </td>

                    {/* Auto-Calculated Quality Points */}
                    <td className="px-2 py-3 text-center font-mono text-xs font-bold text-purple-300">
                      {hasAnyMark ? formatQualityPoints(calc.qualityPoints) : '—'}
                    </td>

                    {/* Row Action */}
                    <td className="px-3 py-3 text-center">
                      <AnimatePresence mode="wait">
                        {isSaved ? (
                          <motion.span
                            key="saved"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Saved
                          </motion.span>
                        ) : !isEditingOpen ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-mono">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <Button
                            key="save"
                            variant="secondary"
                            size="sm"
                            disabled={!hasAnyMark || isSaving}
                            onClick={() => handleSaveDraft(entry.enrollmentId)}
                          >
                            {isSaving ? 'Saving...' : 'Save Draft'}
                          </Button>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary */}
      {grades.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-2 text-xs font-mono text-(--text-faint)">
          <div className="flex items-center gap-4">
            <span>
              Total enrolled:{' '}
              <strong className="text-(--text-primary)">{grades.length}</strong>
            </span>
            <span>
              With recorded marks:{' '}
              <strong className="text-emerald-400">
                {grades.filter((g) => g.currentGrade?.finalMark != null).length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>ECTS Weighting: Quality Points = Grade Point × {courseEcts} ECTS</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Submitting to Registrar */}
      <Modal
        isOpen={confirmSubmitModal}
        onClose={() => setConfirmSubmitModal(false)}
        title="Submit Grades to Registrar"
        maxWidth="max-w-md"
      >
        <div className="space-y-5 font-sans text-sm">
          <div className="p-4 bg-[#E9C349]/10 border border-[#E9C349]/30 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#E9C349] shrink-0 mt-0.5" />
            <p className="text-zinc-300 text-xs leading-relaxed">
              Assessment grades will be officially submitted to the Registrar Office for verification
              and student grade portal publication. As long as the Registrar keeps Grade Editing open,
              you can still adjust and re-submit marks if necessary.
            </p>
          </div>
          <p className="text-(--text-secondary)">
            Are you ready to submit all assessment grades for{' '}
            <span className="text-(--brand-gold) font-mono font-semibold">
              {selectedClass?.course.code}
            </span>{' '}
            to the Registrar Office?
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmSubmitModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSubmitToRegistrar}
              disabled={submittingToRegistrar}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {submittingToRegistrar ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
