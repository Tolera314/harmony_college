'use client';

/**
 * My Courses — Unified Student Academic View
 * ─────────────────────────────────────────────────────────────────────────────
 * Consolidated view combining:
 * - Current enrolled courses with real-time grades
 * - Historical semester results and GPA breakdown
 * - Cumulative academic summary and CGPA
 * - Official transcript download functionality
 * 
 * Displays actual data from database/API with proper handling of:
 * - TVET and Short Program structures
 * - Grade portal open/closed status
 * - Published vs pending grades
 * - ECTS-based GPA calculations
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, TrendingUp, Download, Printer, 
  GraduationCap, Lock, Info, AlertTriangle, ChevronDown,
  ChevronUp, FileCheck, User, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '../lib/motion';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SlidePanel } from './ui/SlidePanel';
import { studentDashApi, type MyCoursesFullData, type CourseDetail, type TermSummary, type GradeRecord } from '../lib/studentApi';
import { printTranscript } from '../lib/exportUtils';
import {
  formatGradePoint,
  formatQualityPoints,
  formatGPA,
  calculateQualityPoints,
} from '../lib/grading';

type TabId = 'current' | 'semesters' | 'summary';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'current', label: 'Current Courses', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'semesters', label: 'Semester Results', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'summary', label: 'Academic Summary', icon: <GraduationCap className="w-4 h-4" /> },
];

const gradeBadgeColor = (letter: string | undefined | null) => {
  if (!letter) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  if (letter.startsWith('A')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (letter.startsWith('B')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (letter.startsWith('C')) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  if (letter === 'D') return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
};

function gpaLabel(gpa: number): string {
  if (gpa >= 3.9) return 'Summa Cum Laude';
  if (gpa >= 3.7) return 'Magna Cum Laude';
  if (gpa >= 3.5) return 'Cum Laude';
  if (gpa >= 3.0) return 'Good Standing';
  if (gpa >= 2.0) return 'Satisfactory';
  return 'Academic Warning';
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.7) return 'var(--status-success)';
  if (gpa >= 3.0) return 'var(--brand-gold)';
  if (gpa >= 2.0) return 'var(--status-warning)';
  return 'var(--status-error)';
}

export const MyCoursesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('current');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyCoursesFullData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await studentDashApi.getMyCoursesFull();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load academic data');
      console.error('Failed to load my courses data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSemester = (termKey: string) => {
    setExpandedSemesters(prev => {
      const next = new Set(prev);
      if (next.has(termKey)) {
        next.delete(termKey);
      } else {
        next.add(termKey);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[var(--brand-gold)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
            Loading academic data...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl border text-center" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--status-error)' }} />
        <h3 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Failed to Load Data
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {error || 'An unexpected error occurred'}
        </p>
        <Button variant="ghost" onClick={loadData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const { student, enrolledCourses, gradeHistory, currentSemester, currentSemesterGpa } = data;
  const isPortalOpen = gradeHistory?.isGradePortalOpen !== false;
  
  // Calculate current semester stats
  const totalCredits = enrolledCourses.reduce((s, c) => s + (c.creditHours || c.course?.creditHours || 3), 0);
  const totalEcts = enrolledCourses.reduce((s, c) => {
    const courseEcts = ((c as any).ects || (c.course as any)?.ects || c.course?.creditHours || c.creditHours || 4);
    return s + courseEcts;
  }, 0);

  // Academic summary from grade history
  const cgpa = gradeHistory?.academicSummary?.cgpa || 0;
  const totalCompletedEcts = gradeHistory?.academicSummary?.totalEcts || 0;
  const totalQualityPoints = gradeHistory?.academicSummary?.totalQualityPoints || 0;
  const totalCourses = gradeHistory?.records?.length || 0;

  const termSummaries = gradeHistory?.termSummaries || [];

  // Transcript data for PDF export
  const transcriptData = {
    studentName: student.fullName,
    studentId: student.studentId,
    major: student.program,
    degree: student.program,
    cumulativeGpa: cgpa,
    completedCredits: totalCompletedEcts,
    expectedGraduation: '', // Not available in current data structure
    email: '', // Not available in current data structure
    grades: gradeHistory?.records || [],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-8"
    >
      {/* ── Header with Overview Stats ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {currentSemester && (
                <Badge variant="gold">
                  {currentSemester.name}
                </Badge>
              )}
              <Badge variant="glass">
                {student.programType === 'TVET' ? 'TVET Program' : 'Short Program'}
              </Badge>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              My Courses
            </h1>
            <p className="font-sans text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {student.program} · {student.department}
              {student.yearLevel && ` · Year ${student.yearLevel}`}
            </p>
          </div>

          {/* Current Semester Stats Pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
              style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
              <span style={{ color: 'var(--text-secondary)' }}>Enrolled</span>
              <span className="font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>{enrolledCourses.length}</span>
            </div>
            {totalEcts > 0 && (
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
              >
                <Award className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
                <span style={{ color: 'var(--text-secondary)' }}>ECTS</span>
                <span className="font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>{totalEcts}</span>
              </div>
            )}
            {currentSemesterGpa > 0 && (
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
              >
                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} aria-hidden="true" />
                <span style={{ color: 'var(--text-secondary)' }}>Semester GPA</span>
                <span className="font-mono font-bold" style={{ color: 'var(--status-success)' }}>{formatGPA(currentSemesterGpa)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Grade Portal Status Notice */}
        {!isPortalOpen && (
          <div
            className="flex items-start gap-3 p-4 rounded-2xl border text-sm"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            role="alert"
          >
            <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--status-warning)' }} aria-hidden="true" />
            <div>
              <p className="font-sans font-semibold" style={{ color: 'var(--status-warning)' }}>
                Grade Portal Closed
              </p>
              <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                The Grade Portal is currently closed. New grades awaiting publication by the Registrar are not displayed.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3 font-sans text-sm font-semibold transition-colors flex items-center gap-2"
              style={{
                color: isActive ? 'var(--brand-gold)' : 'var(--text-muted)',
              }}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--brand-gold)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'current' && (
          <CurrentCoursesTab 
            key="current"
            courses={enrolledCourses}
            isPortalOpen={isPortalOpen}
          />
        )}

        {activeTab === 'semesters' && (
          <SemesterResultsTab
            key="semesters"
            termSummaries={termSummaries}
            expandedSemesters={expandedSemesters}
            toggleSemester={toggleSemester}
            isPortalOpen={isPortalOpen}
          />
        )}

        {activeTab === 'summary' && (
          <AcademicSummaryTab
            key="summary"
            cgpa={cgpa}
            totalCourses={totalCourses}
            totalEcts={totalCompletedEcts}
            totalQualityPoints={totalQualityPoints}
            studentName={student.fullName}
            onDownloadTranscript={() => setShowTranscriptModal(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Official Transcript Modal ──────────────────────────────────── */}
      <SlidePanel
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        title={
          <span className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-(--brand-gold)" />
            Official Academic Transcript
          </span>
        }
      >
        <div className="space-y-6">
          {/* Student Info */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Student Name:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{student.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Student ID:</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{student.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Program:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{student.program}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{student.department}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Cumulative GPA:</span>
                <span className="font-mono font-bold text-lg" style={{ color: 'var(--brand-gold)' }}>{formatGPA(cgpa)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Total ECTS:</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{totalCompletedEcts}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              icon={<Download className="w-4 h-4" />}
              onClick={() => printTranscript(transcriptData)}
              className="flex-1"
            >
              Download PDF
            </Button>
            <Button
              variant="ghost"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => {
                printTranscript(transcriptData);
                window.print();
              }}
              className="flex-1"
            >
              Print
            </Button>
          </div>

          {/* Notice */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl border text-xs"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)' }}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-gold)' }} />
            <p className="font-sans" style={{ color: 'var(--text-secondary)' }}>
              This transcript is generated from your official academic record and includes all completed courses with published grades.
              For official certification, please contact the Registrar's Office.
            </p>
          </div>
        </div>
      </SlidePanel>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab Components
// ═══════════════════════════════════════════════════════════════════════════

interface CurrentCoursesTabProps {
  courses: CourseDetail[];
  isPortalOpen: boolean;
}

const CurrentCoursesTab: React.FC<CurrentCoursesTabProps> = ({ courses, isPortalOpen }) => {
  if (courses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ ...DURATION.medium, ...EASE.out }}
        className="py-16 px-6 text-center rounded-2xl border flex flex-col items-center justify-center max-w-lg mx-auto"
        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(233,195,73,0.1)', border: '1px solid var(--accent-gold-border)' }}
        >
          <BookOpen className="w-8 h-8" style={{ color: 'var(--brand-gold)' }} />
        </div>
        <h2 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Enrolled Courses
        </h2>
        <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          You are not currently enrolled in any courses. Courses will appear here once they are assigned by the Registrar.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-4"
    >
      {/* Enrollment Notice */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl border text-sm"
        style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)' }}
        role="note"
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
        <div>
          <p className="font-sans font-semibold" style={{ color: 'var(--brand-gold)' }}>
            Curriculum-Based Enrollment
          </p>
          <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Your courses are automatically assigned by the Registrar based on your program curriculum.
            Contact your academic advisor or the Registrar's office for any enrollment inquiries.
          </p>
        </div>
      </div>

      {/* Courses Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--hover-overlay)', borderBottom: '1px solid var(--border-default)' }}>
                <th className="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Code
                </th>
                <th className="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Course Name
                </th>
                <th className="px-4 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Cr.Hrs
                </th>
                <th className="px-4 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  ECTS
                </th>
                <th className="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Instructor
                </th>
                <th className="px-4 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Final Mark
                </th>
                <th className="px-4 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Grade
                </th>
                <th className="px-4 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, i) => {
                const hasInstructor = course.instructor && course.instructor.name && course.instructor.name !== 'TBA';
                const grade = course.grade;
                const ects = grade?.ects ?? (course as any).ects ?? (course.course as any)?.ects ?? course.creditHours ?? 4;
                const creditHours = grade?.creditHours ?? course.creditHours ?? course.course?.creditHours ?? 3;
                const hasGrade = grade && grade.letterGrade;

                return (
                  <motion.tr
                    key={`course-${course.enrollmentId || i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="transition-colors hover:bg-[var(--hover-overlay)]"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    {/* Code */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
                        >
                          <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                        </div>
                        <span className="font-mono text-xs font-bold uppercase" style={{ color: 'var(--brand-gold)' }}>
                          {course.course?.code || course.code || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Course Name */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {course.course?.name || course.name || 'Untitled Course'}
                        </p>
                        {course.room && typeof course.room === 'string' && course.room !== 'TBA' && (
                          <p className="font-sans text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-faint)' }}>
                            <MapPin className="w-3 h-3" />
                            {course.room}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Credit Hours */}
                    <td className="px-4 py-4 text-center">
                      <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {creditHours || '—'}
                      </span>
                    </td>

                    {/* ECTS */}
                    <td className="px-4 py-4 text-center">
                      <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {ects || '—'}
                      </span>
                    </td>

                    {/* Instructor */}
                    <td className="px-4 py-4">
                      {hasInstructor && course.instructor ? (
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center font-serif font-bold text-xs"
                            style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)' }}
                          >
                            {course.instructor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-sans text-xs font-medium truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>
                              {course.instructor.name}
                            </p>
                            {course.instructor.title && (
                              <p className="font-sans text-[10px] truncate max-w-[150px]" style={{ color: 'var(--text-faint)' }}>
                                {course.instructor.title}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="font-sans text-xs italic" style={{ color: 'var(--text-faint)' }}>Not Assigned</span>
                      )}
                    </td>

                    {/* Final Mark */}
                    <td className="px-4 py-4 text-center">
                      {hasGrade && (grade?.finalMark != null || typeof (grade as any)?.finalMark === 'number') ? (
                        <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {grade.finalMark ?? (grade as any).finalMark}
                        </span>
                      ) : (
                        <span className="font-sans text-xs italic" style={{ color: 'var(--text-faint)' }}>—</span>
                      )}
                    </td>

                    {/* Grade */}
                    <td className="px-4 py-4 text-center">
                      {hasGrade ? (
                        <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border ${gradeBadgeColor(grade.letterGrade)}`}>
                          {grade.letterGrade}
                        </span>
                      ) : (
                        <Badge variant="amber">Pending</Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      {hasGrade ? (
                        <Badge variant="emerald">Published</Badge>
                      ) : !isPortalOpen ? (
                        <Badge variant="glass">Portal Closed</Badge>
                      ) : (
                        <Badge variant="amber">In Progress</Badge>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

interface SemesterResultsTabProps {
  termSummaries: TermSummary[];
  expandedSemesters: Set<string>;
  toggleSemester: (key: string) => void;
  isPortalOpen: boolean;
}

const SemesterResultsTab: React.FC<SemesterResultsTabProps> = ({
  termSummaries,
  expandedSemesters,
  toggleSemester,
  isPortalOpen,
}) => {
  if (termSummaries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ ...DURATION.medium, ...EASE.out }}
        className="py-16 px-6 text-center rounded-2xl border flex flex-col items-center justify-center max-w-lg mx-auto"
        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(233,195,73,0.1)', border: '1px solid var(--accent-gold-border)' }}
        >
          <TrendingUp className="w-8 h-8" style={{ color: 'var(--brand-gold)' }} />
        </div>
        <h2 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Published Grades
        </h2>
        <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          No officially published course grades found. Grades will appear here once published by the Registrar.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-4"
    >
      {termSummaries.map((term, idx) => {
        const termKey = `${term.academicYear}-${term.semester}`;
        const isExpanded = expandedSemesters.has(termKey);

        return (
          <div
            key={termKey}
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            {/* Semester Header - Clickable */}
            <button
              onClick={() => toggleSemester(termKey)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 transition-colors hover:bg-[var(--hover-overlay)]"
              style={{ borderBottom: isExpanded ? '1px solid var(--border-default)' : 'none' }}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
                <div className="text-left">
                  <h3 className="font-serif font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {term.semester || term.term}
                  </h3>
                  <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {term.academicYear} · {term.yearLevelLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span style={{ color: 'var(--text-muted)' }}>
                    Courses: <strong style={{ color: 'var(--text-primary)' }}>{term.courses.length}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ECTS: <strong style={{ color: 'var(--text-primary)' }}>{term.totalEcts}</strong>
                  </span>
                  <span
                    className="px-3 py-1 rounded-xl border font-bold"
                    style={{
                      backgroundColor: 'rgba(233,195,73,0.1)',
                      borderColor: 'var(--accent-gold-border)',
                      color: 'var(--brand-gold)',
                    }}
                  >
                    GPA: {formatGPA(term.semesterGpa)}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            </button>

            {/* Courses Table - Expandable */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--hover-overlay)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th className="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            Course
                          </th>
                          <th className="px-3 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            Cr.Hr
                          </th>
                          <th className="px-3 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            ECTS
                          </th>
                          <th className="px-3 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            Final Mark
                          </th>
                          <th className="px-3 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            Grade
                          </th>
                          <th className="px-3 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            Grade Pt
                          </th>
                          <th className="px-3 py-3 text-center font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            Quality Pt
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {term.courses.map((course, cIdx) => {
                          const ects = course.ects ?? course.credits ?? 4;
                          const creditHours = course.creditHours ?? 3;
                          const gradePoints = course.gradePoints ?? course.numericGpa ?? 0;
                          const qualityPoints = course.qualityPoints ?? calculateQualityPoints(gradePoints, ects);

                          return (
                            <tr
                              key={course.id || cIdx}
                              className="transition-colors hover:bg-[var(--hover-overlay)]"
                              style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {course.courseCode}
                                </div>
                                <div className="text-xs truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>
                                  {course.courseTitle}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                                {creditHours}
                              </td>
                              <td className="px-3 py-3 text-center font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {ects}
                              </td>
                              <td className="px-3 py-3 text-center font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                                {course.finalMark != null ? course.finalMark : '—'}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border ${gradeBadgeColor(course.grade)}`}>
                                  {course.grade}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                                {formatGradePoint(gradePoints)}
                              </td>
                              <td className="px-3 py-3 text-center font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {formatQualityPoints(qualityPoints)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Semester Summary Footer */}
                  <div
                    className="px-5 py-3 flex flex-wrap items-center justify-between text-xs font-mono border-t"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                  >
                    <span>
                      Courses: <strong style={{ color: 'var(--text-primary)' }}>{term.courses.length}</strong>
                    </span>
                    <div className="flex items-center gap-4">
                      <span>
                        Total ECTS: <strong style={{ color: 'var(--text-primary)' }}>{term.totalEcts}</strong>
                      </span>
                      <span>
                        Total QP: <strong style={{ color: 'var(--text-primary)' }}>{formatQualityPoints(term.totalQualityPoints)}</strong>
                      </span>
                      <span style={{ color: 'var(--text-primary)' }} className="font-bold">
                        Semester GPA: <span style={{ color: 'var(--brand-gold)' }}>{formatGPA(term.semesterGpa)}</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
};

interface AcademicSummaryTabProps {
  cgpa: number;
  totalCourses: number;
  totalEcts: number;
  totalQualityPoints: number;
  studentName: string;
  onDownloadTranscript: () => void;
}

const AcademicSummaryTab: React.FC<AcademicSummaryTabProps> = ({
  cgpa,
  totalCourses,
  totalEcts,
  totalQualityPoints,
  studentName,
  onDownloadTranscript,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6"
    >
      {/* Official CGPA Card */}
      <div
        className="p-6 rounded-2xl border shadow-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(233,195,73,0.15) 0%, rgba(233,195,73,0.05) 100%)',
          borderColor: 'var(--accent-gold-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--brand-gold)' }}>
              Official Cumulative GPA
            </p>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-5xl font-bold" style={{ color: gpaColor(cgpa) }}>
                {formatGPA(cgpa)}
              </span>
              <span className="text-sm font-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                / 4.00
              </span>
            </div>
            <p className="text-sm font-sans font-semibold mt-2" style={{ color: 'var(--text-secondary)' }}>
              {gpaLabel(cgpa)}
            </p>
          </div>

          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '2px solid var(--accent-gold-border)' }}
          >
            <GraduationCap className="w-10 h-10" style={{ color: 'var(--brand-gold)' }} />
          </div>
        </div>
      </div>

      {/* Cumulative Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="p-5 rounded-xl border text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
          >
            <BookOpen className="w-6 h-6" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalCourses}
          </p>
          <p className="text-xs font-sans uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
            Total Courses
          </p>
        </div>

        <div
          className="p-5 rounded-xl border text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
          >
            <Award className="w-6 h-6" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalEcts}
          </p>
          <p className="text-xs font-sans uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
            Total ECTS
          </p>
        </div>

        <div
          className="p-5 rounded-xl border text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
          >
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatQualityPoints(totalQualityPoints)}
          </p>
          <p className="text-xs font-sans uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
            Quality Points
          </p>
        </div>
      </div>

      {/* Download Transcript Card */}
      <div
        className="p-6 rounded-2xl border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
          >
            <FileCheck className="w-6 h-6" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Official Academic Transcript
            </h3>
            <p className="text-sm font-sans mb-4" style={{ color: 'var(--text-muted)' }}>
              Download your complete academic record including all completed courses, grades, and cumulative GPA.
            </p>
            <div className="flex gap-3">
              <Button
                variant="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={onDownloadTranscript}
              >
                Download Transcript
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Standing Notice */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl border text-sm"
        style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-gold)' }} />
        <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--brand-gold)' }}>Academic Standing:</strong> Your cumulative GPA reflects all officially published course grades.
          For questions about your academic standing or progression requirements, please contact your academic advisor or the Registrar's Office.
        </p>
      </div>
    </motion.div>
  );
};
