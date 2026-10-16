'use client';

import React from 'react';
import { formatGradePoint, formatQualityPoints, formatGPA, calculateQualityPoints } from '../../lib/grading';
import { type TermSummary } from '../../lib/studentApi';
import { Badge } from '../ui/Badge';

interface AcademicPeriodCourseTableProps {
  term: TermSummary;
  isShortProgram?: boolean;
  isPortalOpen?: boolean;
  className?: string;
}

const getGradeBadgeColor = (letter: string | undefined | null) => {
  if (!letter) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  if (letter.startsWith('A')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (letter.startsWith('B')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (letter.startsWith('C')) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  if (letter === 'D') return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
};

export const AcademicPeriodCourseTable: React.FC<AcademicPeriodCourseTableProps> = ({
  term,
  isShortProgram = false,
  isPortalOpen = true,
  className = '',
}) => {
  const isSP = isShortProgram || term.programType === 'SHORT_PROGRAM' || term.term?.toLowerCase().startsWith('term');
  const currentLabel = term.currentSummary?.label || (isSP ? 'Current Term:' : 'Current Semester:');

  const currentEcts = term.currentSummary?.totalEcts ?? term.totalEcts;
  const currentQP = term.currentSummary?.totalQualityPoints ?? term.totalQualityPoints;
  const currentGpa = term.currentSummary?.gpa ?? term.semesterGpa;

  const cumulativeEcts = term.cumulativeSummary?.totalEcts ?? term.totalEcts;
  const cumulativeQP = term.cumulativeSummary?.totalQualityPoints ?? term.totalQualityPoints;
  const cumulativeGpa = term.cumulativeSummary?.gpa ?? (cumulativeEcts > 0 ? cumulativeQP / cumulativeEcts : currentGpa);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Separate Academic Period Course Table (8 Ordered Columns) ───────── */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <table className="w-full text-left text-sm font-sans border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--hover-overlay)] text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
              <th className="px-3.5 py-3 text-center w-12">#</th>
              <th className="px-4 py-3 text-left">Course Title</th>
              <th className="px-3.5 py-3 text-left">Course Code</th>
              <th className="px-3 py-3 text-center">Cr. Hr.</th>
              <th className="px-3 py-3 text-center">ECTS</th>
              <th className="px-3 py-3 text-center">Grade</th>
              <th className="px-3 py-3 text-center">Grade Point</th>
              <th className="px-3.5 py-3 text-center">GPT/QP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {term.courses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-[var(--text-muted)] italic">
                  No courses enrolled in this academic period.
                </td>
              </tr>
            ) : (
              term.courses.map((course, idx) => {
                const rowNum = course.index ?? idx + 1;
                const courseTitle = course.courseTitle || (course as any).courseName || (course as any).title || 'Untitled Course';
                const courseCode = course.courseCode || (course as any).code || '—';
                const creditHours = course.creditHours ?? course.credits ?? (course as any).credit_hours ?? 3;
                const ects = course.ects ?? (course as any).ects_credits ?? creditHours;
                const gradeLetter = course.grade || (course as any).letterGrade || '—';
                const gradePt = course.gradePoints ?? (course as any).numericGpa ?? (course as any).grade_point ?? 0;
                const qp = course.qualityPoints ?? calculateQualityPoints(gradePt, ects);

                const isGradeVisible = isPortalOpen && gradeLetter !== '—';

                return (
                  <tr
                    key={course.id || `${term.semester}-${courseCode}-${idx}`}
                    className="hover:bg-[var(--hover-overlay)] transition-colors"
                  >
                    {/* 1. # */}
                    <td className="px-3.5 py-3 text-center font-mono text-xs text-[var(--text-muted)] font-medium">
                      {rowNum}
                    </td>

                    {/* 2. Course Title */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--text-primary)] text-sm">
                        {courseTitle}
                      </div>
                      {course.instructor && (
                        <div className="text-[11px] text-[var(--text-muted)] font-sans mt-0.5 truncate max-w-xs">
                          {course.instructor}
                        </div>
                      )}
                    </td>

                    {/* 3. Course Code */}
                    <td className="px-3.5 py-3">
                      <span className="font-mono text-xs font-bold text-[var(--brand-gold)] px-2 py-0.5 rounded bg-[var(--accent-gold-subtle)] border border-[var(--accent-gold-border)]">
                        {courseCode}
                      </span>
                    </td>

                    {/* 4. Cr. Hr. */}
                    <td className="px-3 py-3 text-center font-mono text-sm text-[var(--text-secondary)]">
                      {creditHours}
                    </td>

                    {/* 5. ECTS */}
                    <td className="px-3 py-3 text-center font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {ects}
                    </td>

                    {/* 6. Grade */}
                    <td className="px-3 py-3 text-center">
                      {isGradeVisible ? (
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${getGradeBadgeColor(gradeLetter)}`}>
                          {gradeLetter}
                        </span>
                      ) : (
                        <Badge variant="amber">Pending</Badge>
                      )}
                    </td>

                    {/* 7. Grade Point */}
                    <td className="px-3 py-3 text-center font-mono text-sm text-[var(--text-secondary)]">
                      {isGradeVisible ? formatGradePoint(gradePt) : '—'}
                    </td>

                    {/* 8. GPT/QP */}
                    <td className="px-3.5 py-3 text-center font-mono text-sm font-bold text-[var(--brand-gold)]">
                      {isGradeVisible ? formatQualityPoints(qp) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 4-Column Academic Summary Table Directly Below Course Table ───────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <table className="w-full text-sm font-mono border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--hover-overlay)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
              <th className="px-4 py-2.5 text-left font-sans font-semibold">Summary Label</th>
              <th className="px-4 py-2.5 text-center font-semibold">Total ECTS</th>
              <th className="px-4 py-2.5 text-center font-semibold">Total QP</th>
              <th className="px-4 py-2.5 text-center font-semibold">GPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
            {/* Row 1: Current Semester / Current Term */}
            <tr className="hover:bg-[var(--hover-overlay)] transition-colors">
              <td className="px-4 py-2.5 font-sans font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-gold)]" />
                {currentLabel}
              </td>
              <td className="px-4 py-2.5 text-center font-bold text-[var(--text-primary)]">
                {currentEcts}
              </td>
              <td className="px-4 py-2.5 text-center font-bold text-[var(--brand-gold)]">
                {formatQualityPoints(currentQP)}
              </td>
              <td className="px-4 py-2.5 text-center font-bold text-[var(--brand-gold)] text-sm">
                {formatGPA(currentGpa)}
              </td>
            </tr>

            {/* Row 2: Cumulative */}
            <tr className="bg-[var(--accent-gold-subtle)]/30 hover:bg-[var(--accent-gold-subtle)]/50 transition-colors">
              <td className="px-4 py-2.5 font-sans font-bold text-[var(--brand-gold)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Cumulative:
              </td>
              <td className="px-4 py-2.5 text-center font-bold text-[var(--text-primary)]">
                {cumulativeEcts}
              </td>
              <td className="px-4 py-2.5 text-center font-bold text-[var(--brand-gold)]">
                {formatQualityPoints(cumulativeQP)}
              </td>
              <td className="px-4 py-2.5 text-center font-extrabold text-[var(--brand-gold)] text-sm">
                {formatGPA(cumulativeGpa)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
