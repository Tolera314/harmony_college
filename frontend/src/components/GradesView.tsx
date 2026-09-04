'use client';

import React, { useState } from 'react';
import { GradeRecord, StudentProfile } from '../types';
import { type GradeHistory, type TermSummary } from '../lib/studentApi';
import {
  GraduationCap,
  Calculator,
  Download,
  Printer,
  FileCheck,
  Lock,
  BookOpen,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SlidePanel } from './ui/SlidePanel';
import { printTranscript } from '../lib/exportUtils';
import {
  formatGradePoint,
  formatQualityPoints,
  formatGPA,
  calculateQualityPoints,
} from '@/src/lib/grading';

const gradeBadgeColor = (letter: string | undefined) => {
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

// ── Main Component ─────────────────────────────────────────────────────────────
interface GradesViewProps {
  profile: StudentProfile;
  grades: GradeRecord[];
  gradeData?: GradeHistory | null;
  enrolledCourses?: { id: string; code: string; name: string; credits: number; ects?: number }[];
}

export const GradesView: React.FC<GradesViewProps> = ({
  profile,
  grades,
  gradeData,
  enrolledCourses = [],
}) => {
  const [showTranscriptModal, setShowTranscriptModal] = useState<boolean>(false);

  const isPortalOpen = gradeData?.isGradePortalOpen !== false;

  // Real academic summary from backend or computed from grades
  const cumulativeEcts =
    gradeData?.academicSummary?.totalEcts ??
    grades.reduce((s, g) => s + (g.ects ?? g.credits ?? 4), 0);

  const cumulativeQp =
    gradeData?.academicSummary?.totalQualityPoints ??
    grades.reduce((s, g) => s + (g.qualityPoints ?? (g.numericGpa * (g.ects ?? g.credits ?? 4))), 0);

  const officialCgpa =
    gradeData?.academicSummary?.cgpa ??
    (cumulativeEcts > 0 ? cumulativeQp / cumulativeEcts : profile.cumulativeGpa);

  // Term summaries grouped by Year / Semester
  const termSummaries: TermSummary[] = gradeData?.termSummaries ?? [];

  // Fallback term grouping if termSummaries is not provided
  const fallbackTerms = React.useMemo(() => {
    if (termSummaries.length > 0) return termSummaries;
    const map = new Map<string, GradeRecord[]>();
    grades.forEach((g) => {
      const key = g.term || 'Semester I';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });

    return Array.from(map.entries()).map(([termName, termCourses], idx) => {
      const totalEcts = termCourses.reduce((s, c) => s + (c.ects ?? c.credits ?? 4), 0);
      const totalQualityPoints = termCourses.reduce(
        (s, c) => s + (c.qualityPoints ?? (c.gradePoints ?? c.numericGpa ?? 0) * (c.ects ?? c.credits ?? 4)),
        0
      );
      const semesterGpa = totalEcts > 0 ? Math.round((totalQualityPoints / totalEcts) * 100) / 100 : 0;

      return {
        term: termName,
        academicYear: '2024/2025',
        semester: termName,
        yearLevelLabel: `Year ${idx + 1}`,
        courses: termCourses,
        totalEcts,
        totalQualityPoints,
        semesterGpa,
      };
    });
  }, [termSummaries, grades]);

  // GPA Simulator — use ONLY real enrolled courses (zero fake/mock data)
  const simCourses = enrolledCourses;

  const [simValues, setSimValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(simCourses.map((c) => [c.id, 4.0]))
  );

  const simKeys = simCourses.map((c) => c.id).join(',');
  React.useEffect(() => {
    setSimValues((prev) => {
      const next: Record<string, number> = {};
      simCourses.forEach((c) => {
        next[c.id] = prev[c.id] ?? 4.0;
      });
      return next;
    });
  }, [simKeys]);

  // Calculate simulated CGPA using ECTS weighting
  const calculateSimulatedGpa = () => {
    const newEcts = simCourses.reduce((s, c) => s + (c.ects ?? c.credits ?? 4), 0);
    const newPoints = simCourses.reduce(
      (s, c) => s + (simValues[c.id] ?? 4.0) * (c.ects ?? c.credits ?? 4),
      0
    );
    const totalEcts = cumulativeEcts + newEcts;
    const totalPoints = cumulativeQp + newPoints;
    return totalEcts > 0 ? formatGPA(totalPoints / totalEcts) : formatGPA(officialCgpa);
  };

  const gpaLabels: Record<number, string> = {
    4.0: 'A (4.00)',
    3.75: 'A- (3.75)',
    3.5: 'B+ (3.50)',
    3.0: 'B (3.00)',
    2.75: 'B- (2.75)',
    2.5: 'C+ (2.50)',
    2.0: 'C (2.00)',
    1.75: 'C- (1.75)',
    1.0: 'D (1.00)',
    0.0: 'F (0.00)',
  };
  const gpaSteps = [4.0, 3.75, 3.5, 3.0, 2.75, 2.5, 2.0, 1.75, 1.0, 0.0];

  const transcriptData = {
    studentName: profile.name,
    studentId: profile.id,
    major: profile.major,
    degree: profile.degree,
    cumulativeGpa: officialCgpa,
    completedCredits: cumulativeEcts,
    expectedGraduation: profile.expectedGraduation,
    email: profile.email,
    grades,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Grade Portal Closed Notification */}
      {!isPortalOpen && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-amber-300">Grade Portal Closed</h3>
            <p className="text-sm text-amber-200/90 mt-1 leading-relaxed">
              The Grade Portal is currently closed. Please contact the Registrar Office for assistance.
            </p>
            <p className="text-xs text-amber-200/60 mt-1 font-mono">
              Grades awaiting publication by the Registrar are locked from display.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-2">
          <p
            className="font-mono text-xs uppercase font-bold tracking-wider"
            style={{ color: 'var(--text-faint)' }}
          >
            Cumulative GPA (CGPA)
          </p>
          <div className="flex items-baseline justify-between">
            <h3
              className="font-serif text-4xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {formatGPA(officialCgpa)}
            </h3>
            <Badge variant="gold">{gpaLabel(officialCgpa)}</Badge>
          </div>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
            Calculated across {cumulativeEcts} completed ECTS credits
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2">
          <p
            className="font-mono text-xs uppercase font-bold tracking-wider"
            style={{ color: 'var(--text-faint)' }}
          >
            Academic Standing
          </p>
          <h3
            className="font-serif text-2xl sm:text-3xl font-bold"
            style={{ color: gpaColor(officialCgpa) }}
          >
            {gpaLabel(officialCgpa)}
          </h3>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
            Quality Points: {formatQualityPoints(cumulativeQp)} · Total ECTS: {cumulativeEcts}
          </p>
        </Card>

        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <p
              className="font-mono text-xs uppercase font-bold tracking-wider"
              style={{ color: 'var(--text-faint)' }}
            >
              Official Institutional Transcript
            </p>
            <p className="font-sans text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Digitally verified watermarked academic record with ECTS weighting.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowTranscriptModal(true)}
            icon={<Download className="w-4 h-4" />}
            className="mt-4"
          >
            Download Official Transcript
          </Button>
        </Card>
      </div>

      {/* Main Body: Official Year/Semester Breakdown + GPA Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Official Academic Record
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Structured by Year and Semester. GPA is weighted strictly by ECTS (Quality Point = Grade Point × ECTS).
              </p>
            </div>
          </div>

          {fallbackTerms.length === 0 ? (
            <Card hoverable={false} className="p-8 text-center text-xs text-zinc-400">
              No officially published course grades found for your student profile.
            </Card>
          ) : (
            fallbackTerms.map((term, tIdx) => (
              <div
                key={term.term || tIdx}
                className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-sm"
              >
                {/* Semester Header */}
                <div className="px-5 py-3.5 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#E9C349]" />
                    <span className="font-serif font-bold text-sm text-white">{term.term}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                      {term.yearLevelLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-zinc-400">
                      ECTS: <strong className="text-white">{term.totalEcts}</strong>
                    </span>
                    <span className="text-zinc-400">
                      QP: <strong className="text-white">{formatQualityPoints(term.totalQualityPoints)}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 text-[#E9C349] font-bold">
                      Semester GPA: {formatGPA(term.semesterGpa)}
                    </span>
                  </div>
                </div>

                {/* Courses Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans">
                    <thead className="bg-black/20 border-b border-white/5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Course</th>
                        <th className="px-2 py-3 text-center">Cr.Hr</th>
                        <th className="px-2 py-3 text-center">ECTS</th>
                        <th className="px-2 py-3 text-center">Final Mark</th>
                        <th className="px-2 py-3 text-center">Grade</th>
                        <th className="px-2 py-3 text-center">Grade Pt</th>
                        <th className="px-2 py-3 text-center">Quality Pt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {term.courses.map((c) => {
                        const ects = c.ects ?? c.credits ?? 4;
                        const creditHours = c.creditHours ?? 3;
                        const gradePoints = c.gradePoints ?? c.numericGpa ?? 0;
                        const qualityPoints =
                          c.qualityPoints ?? calculateQualityPoints(gradePoints, ects);

                        return (
                          <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-white">{c.courseCode}</div>
                              <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                                {c.courseTitle}
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-zinc-400">
                              {creditHours}
                            </td>
                            <td className="px-2 py-3 text-center font-mono font-semibold text-zinc-200">
                              {ects}
                            </td>
                            <td className="px-2 py-3 text-center font-mono font-bold text-indigo-300">
                              {c.finalMark != null ? c.finalMark : '—'}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border ${gradeBadgeColor(
                                  c.grade
                                )}`}
                              >
                                {c.grade}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-zinc-300">
                              {formatGradePoint(gradePoints)}
                            </td>
                            <td className="px-2 py-3 text-center font-mono font-semibold text-purple-300">
                              {formatQualityPoints(qualityPoints)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Semester Summary Footer */}
                <div className="px-5 py-3 bg-black/30 border-t border-white/5 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400">
                  <span>
                    Courses: <strong className="text-white">{term.courses.length}</strong>
                  </span>
                  <div className="flex items-center gap-4">
                    <span>
                      Total ECTS: <strong className="text-white">{term.totalEcts}</strong>
                    </span>
                    <span>
                      Total QP: <strong className="text-white">{formatQualityPoints(term.totalQualityPoints)}</strong>
                    </span>
                    <span className="text-white font-bold">
                      Semester GPA:{' '}
                      <span className="text-[#E9C349]">{formatGPA(term.semesterGpa)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Academic Summary (Cumulative) Card */}
          {grades.length > 0 && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#E9C349]/15 via-[#E9C349]/5 to-transparent border border-[#E9C349]/30 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#E9C349] font-bold">
                    Official Academic Summary (Cumulative)
                  </p>
                  <p className="text-xs text-zinc-300 mt-1">
                    Cumulative Quality Points across all completed courses ÷ Cumulative ECTS
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase tracking-wider">
                    Official CGPA
                  </span>
                  <span className="font-serif text-4xl font-extrabold text-[#E9C349]">
                    {formatGPA(officialCgpa)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Total Courses</span>
                  <span className="font-bold text-white text-base">{grades.length}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Total ECTS</span>
                  <span className="font-bold text-white text-base">{cumulativeEcts}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Total Quality Points</span>
                  <span className="font-bold text-purple-300 text-base">
                    {formatQualityPoints(cumulativeQp)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Standing</span>
                  <span className="font-bold text-emerald-400 text-base">{gpaLabel(officialCgpa)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GPA Simulator with Real Enrolled Courses */}
        <Card hoverable={false} className="lg:col-span-4 space-y-6 h-fit">
          <div
            className="flex items-center gap-2.5 border-b pb-4"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <Calculator className="w-5 h-5 text-[#E9C349]" />
            <div>
              <h3 className="font-sans font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                GPA Simulator
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Weighted by ECTS: Quality Point = Grade Point × ECTS
              </p>
            </div>
          </div>

          {simCourses.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No currently active enrolled courses available to simulate.
            </p>
          ) : (
            <>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Select projected grades for your currently enrolled courses to preview your resulting CGPA:
              </p>

              <div className="space-y-4">
                {simCourses.map((course) => {
                  const ects = course.ects ?? course.credits ?? 4;
                  const val = simValues[course.id] ?? 4.0;
                  return (
                    <div key={course.id} className="space-y-1.5">
                      <div
                        className="flex justify-between text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span className="truncate max-w-[65%]">
                          {course.code}: {course.name} ({ects} ECTS)
                        </span>
                        <span
                          className="font-mono shrink-0 ml-2 text-[#E9C349]"
                        >
                          {gpaLabels[val] ?? `${val.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {gpaSteps.slice(0, 6).map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() =>
                              setSimValues((prev) => ({ ...prev, [course.id]: step }))
                            }
                            className={`flex-1 py-1 rounded text-[10px] font-mono transition-all ${
                              val === step
                                ? 'bg-[#E9C349] text-black font-bold'
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {step === 4.0
                              ? 'A'
                              : step === 3.75
                              ? 'A-'
                              : step === 3.5
                              ? 'B+'
                              : step === 3.0
                              ? 'B'
                              : step === 2.75
                              ? 'B-'
                              : 'C+'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simulation Result */}
              <div className="p-4 rounded-xl bg-black/40 border border-[#E9C349]/30 space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Projected Cumulative CGPA
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-3xl font-bold text-[#E9C349]">
                    {calculateSimulatedGpa()}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    Current: {formatGPA(officialCgpa)}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Official Transcript SlidePanel */}
      <SlidePanel
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        title="Official Academic Transcript"
        subtitle="Institutional Watermarked Record"
        width="max-w-4xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <p className="text-xs text-zinc-400">
            Office of the Registrar · Harmony College Academic Records
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => printTranscript(transcriptData)}
            icon={<Download className="w-4 h-4" />}
          >
            Save as PDF / Print
          </Button>
        </div>

        {/* Transcript document */}
        <div
          id="official-transcript"
          className="bg-white text-black rounded-2xl border border-gray-200 overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="bg-[#0F0F10] p-6 flex items-start justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E9C349]/60 shrink-0">
                <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold tracking-wide text-white">
                  HARMONY COLLEGE
                </h2>
                <p className="font-mono text-[10px] text-[#E9C349] uppercase tracking-widest">
                  Sheger, Burayu, Ethiopia
                </p>
                <p className="font-mono text-[9px] text-white/50 uppercase tracking-widest mt-0.5">
                  OFFICIAL ACADEMIC TRANSCRIPT · OFFICE OF THE REGISTRAR
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-[10px] text-white/40">Date Issued</p>
              <p className="font-mono text-xs text-white font-bold">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="font-mono text-[10px] text-[#E9C349] mt-1">{profile.id}</p>
            </div>
          </div>

          {/* Student Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 font-semibold">Student Name</span>
                <span className="font-bold text-black">{profile.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 font-semibold">Student ID</span>
                <span className="font-mono font-bold text-black">{profile.id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 font-semibold">Program / Major</span>
                <span className="font-bold text-black">{profile.major}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 font-semibold">Degree</span>
                <span className="font-bold text-black">{profile.degree}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 font-semibold">Total ECTS Earned</span>
                <span className="font-mono font-bold text-black">{cumulativeEcts}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 font-semibold">Cumulative GPA (CGPA)</span>
                <span className="font-mono font-bold text-black">{formatGPA(officialCgpa)}</span>
              </div>
            </div>
          </div>

          {/* Course History Table */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="font-serif text-xs font-bold text-black mb-3 uppercase tracking-wide">
              Official Course History & Academic Record
            </h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-[10px] font-mono uppercase text-gray-700">
                  <th className="py-2 px-2.5 text-left border border-gray-200">Course Code</th>
                  <th className="py-2 px-2.5 text-left border border-gray-200">Course Title</th>
                  <th className="py-2 px-2.5 text-center border border-gray-200">Cr.Hr</th>
                  <th className="py-2 px-2.5 text-center border border-gray-200">ECTS</th>
                  <th className="py-2 px-2.5 text-center border border-gray-200">Final Mark</th>
                  <th className="py-2 px-2.5 text-center border border-gray-200">Grade</th>
                  <th className="py-2 px-2.5 text-center border border-gray-200">Grade Pt</th>
                  <th className="py-2 px-2.5 text-center border border-gray-200">Quality Pt</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => {
                  const ects = g.ects ?? g.credits ?? 4;
                  const creditHours = g.creditHours ?? 3;
                  const gradePoints = g.numericGpa ?? 0;
                  const qualityPoints =
                    g.qualityPoints ?? calculateQualityPoints(gradePoints, ects);

                  return (
                    <tr key={g.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-black border border-gray-100 text-[11px]">
                        {g.courseCode}
                      </td>
                      <td className="py-1.5 px-2.5 text-gray-800 border border-gray-100 text-[11px]">
                        {g.courseTitle}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono text-gray-600 border border-gray-100 text-[11px]">
                        {creditHours}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-black border border-gray-100 text-[11px]">
                        {ects}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-gray-800 border border-gray-100 text-[11px]">
                        {g.finalMark != null ? g.finalMark : '—'}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-black border border-gray-100 text-[11px]">
                        {g.grade}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono text-gray-700 border border-gray-100 text-[11px]">
                        {formatGradePoint(gradePoints)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-gray-800 border border-gray-100 text-[11px]">
                        {formatQualityPoints(qualityPoints)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold font-mono text-[11px]">
                  <td colSpan={3} className="py-2 px-2.5 text-gray-800 border border-gray-200">
                    CUMULATIVE TOTALS
                  </td>
                  <td className="py-2 px-2.5 text-center text-black border border-gray-200">
                    {cumulativeEcts}
                  </td>
                  <td colSpan={3} className="py-2 px-2.5 text-right text-gray-600 border border-gray-200">
                    TOTAL QP: {formatQualityPoints(cumulativeQp)} · CGPA:
                  </td>
                  <td className="py-2 px-2.5 text-center text-black border border-gray-200 text-sm">
                    {formatGPA(officialCgpa)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Institutional Stamp & Signature */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E9C349]/60 shrink-0">
                <img src="/logo2.jpg" alt="Harmony College Seal" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-serif text-sm font-bold text-black">HARMONY COLLEGE</p>
                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
                  Sheger, Burayu, Ethiopia · Tel: +251 911 000 000
                </p>
                <p className="font-mono text-[9px] text-yellow-700 font-bold mt-0.5">
                  OFFICIAL RECORD — NOT VALID WITHOUT REGISTRAR EMBOSSED SEAL
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center bg-gray-50 shrink-0">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-mono text-[9px] font-bold text-black uppercase tracking-wider">
                    Institutional Cryptographic Verification
                  </p>
                  <p className="font-mono text-[8px] text-gray-500">
                    Token: HC-REG-{profile.id} · Certified by Harmony College Registrar Office
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="border-b-2 border-black w-40 mb-1 ml-auto" />
                <p className="font-sans text-[10px] font-bold text-black">Registrar, Harmony College</p>
                <p className="font-mono text-[8px] text-gray-400">Office of Academic Records</p>
              </div>
            </div>
          </div>
        </div>
      </SlidePanel>
    </motion.div>
  );
};
