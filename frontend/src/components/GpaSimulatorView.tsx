'use client';

import React, { useState, useMemo } from 'react';
import { Course, GradeRecord, StudentProfile } from '../types';
import { type GradeHistory } from '../lib/studentApi';
import {
  Calculator,
  TrendingUp,
  Award,
  Sparkles,
  Info,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { formatGPA, formatQualityPoints } from '@/src/lib/grading';

function gpaLabel(gpa: number): string {
  if (gpa >= 3.9) return 'Summa Cum Laude';
  if (gpa >= 3.7) return 'Magna Cum Laude';
  if (gpa >= 3.5) return 'Cum Laude';
  if (gpa >= 3.0) return 'Good Standing';
  if (gpa >= 2.0) return 'Satisfactory';
  return 'Academic Warning';
}

interface GpaSimulatorViewProps {
  profile: StudentProfile;
  enrolledCourses: Course[];
  gradeData?: GradeHistory | null;
  grades: GradeRecord[];
}

interface GradeOption {
  label: string;
  points: number;
}

const GRADE_OPTIONS: GradeOption[] = [
  { label: 'A', points: 4.0 },
  { label: 'A-', points: 3.75 },
  { label: 'B+', points: 3.5 },
  { label: 'B', points: 3.0 },
  { label: 'B-', points: 2.75 },
  { label: 'C+', points: 2.5 },
  { label: 'C', points: 2.0 },
  { label: 'D', points: 1.0 },
  { label: 'F', points: 0.0 },
];

export const GpaSimulatorView: React.FC<GpaSimulatorViewProps> = ({
  profile,
  enrolledCourses,
  gradeData,
  grades,
}) => {
  // Current completed academic history totals
  const currentEcts =
    gradeData?.academicSummary?.totalEcts ??
    grades.reduce((s, g) => s + (g.ects ?? g.credits ?? 4), 0);

  const currentQualityPoints =
    gradeData?.academicSummary?.totalQualityPoints ??
    grades.reduce((s, g) => s + (g.qualityPoints ?? (g.numericGpa * (g.ects ?? g.credits ?? 4))), 0);

  const currentCgpa =
    gradeData?.academicSummary?.cgpa ??
    (currentEcts > 0 ? currentQualityPoints / currentEcts : profile.cumulativeGpa);

  // Active enrolled courses strictly from the authenticated student
  const activeCourses = useMemo(() => {
    return enrolledCourses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      ects: Number(c.credits ?? 4),
      instructor: c.instructor,
    }));
  }, [enrolledCourses]);

  // Projected grade points per course (defaults to 4.0 / A)
  const [projectedGrades, setProjectedGrades] = useState<Record<string, number>>(() =>
    Object.fromEntries(activeCourses.map((c) => [c.id, 4.0]))
  );

  // Keep state synchronized if courses change
  const courseKey = activeCourses.map((c) => c.id).join(',');
  React.useEffect(() => {
    setProjectedGrades((prev) => {
      const next: Record<string, number> = {};
      activeCourses.forEach((c) => {
        next[c.id] = prev[c.id] ?? 4.0;
      });
      return next;
    });
  }, [courseKey]);

  const handleGradeSelect = (courseId: string, points: number) => {
    setProjectedGrades((prev) => ({
      ...prev,
      [courseId]: points,
    }));
  };

  const setAllGrades = (points: number) => {
    const updated: Record<string, number> = {};
    activeCourses.forEach((c) => {
      updated[c.id] = points;
    });
    setProjectedGrades(updated);
  };

  // ECTS-based calculation
  const { newEcts, newPoints, projectedTotalEcts, projectedTotalPoints, projectedCgpa } =
    useMemo(() => {
      const addedEcts = activeCourses.reduce((acc, c) => acc + c.ects, 0);
      const addedPoints = activeCourses.reduce((acc, c) => {
        const gp = projectedGrades[c.id] ?? 4.0;
        return acc + gp * c.ects;
      }, 0);

      const totalEcts = currentEcts + addedEcts;
      const totalPoints = currentQualityPoints + addedPoints;
      const cgpa = totalEcts > 0 ? totalPoints / totalEcts : currentCgpa;

      return {
        newEcts: addedEcts,
        newPoints: addedPoints,
        projectedTotalEcts: totalEcts,
        projectedTotalPoints: totalPoints,
        projectedCgpa: cgpa,
      };
    }, [activeCourses, projectedGrades, currentEcts, currentQualityPoints, currentCgpa]);

  const gpaDelta = projectedCgpa - currentCgpa;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold)">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                GPA Simulator
              </h1>
              <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Simulate projected grades for your currently enrolled courses to preview your cumulative CGPA.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-(--text-muted) hidden sm:inline">Set all:</span>
          <button
            type="button"
            onClick={() => setAllGrades(4.0)}
            className="px-2.5 py-1 text-xs font-mono rounded-lg border border-(--border-default) bg-(--hover-overlay) text-(--brand-gold) hover:bg-(--accent-gold-subtle) transition-colors"
          >
            All A
          </button>
          <button
            type="button"
            onClick={() => setAllGrades(3.5)}
            className="px-2.5 py-1 text-xs font-mono rounded-lg border border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) hover:text-white transition-colors"
          >
            All B+
          </button>
          <button
            type="button"
            onClick={() => setAllGrades(3.0)}
            className="px-2.5 py-1 text-xs font-mono rounded-lg border border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) hover:text-white transition-colors"
          >
            All B
          </button>
          <button
            type="button"
            onClick={() => setAllGrades(4.0)}
            className="p-1.5 rounded-lg border border-(--border-default) bg-(--hover-overlay) text-(--text-muted) hover:text-white transition-colors ml-1"
            title="Reset Simulator"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Projection Overview Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Current CGPA */}
        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Current Official CGPA
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatGPA(currentCgpa)}
            </h3>
            <Badge variant="glass">{gpaLabel(currentCgpa)}</Badge>
          </div>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
            From {currentEcts} completed ECTS credits
          </p>
        </Card>

        {/* Projected CGPA */}
        <Card hoverable={false} className="space-y-2 border-(--accent-gold-border) bg-gradient-to-br from-[#E9C349]/10 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase font-bold tracking-wider text-(--brand-gold)">
              Projected CGPA
            </p>
            <Sparkles className="w-4 h-4 text-(--brand-gold)" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl sm:text-4xl font-extrabold text-(--brand-gold)">
              {formatGPA(projectedCgpa)}
            </h3>
            <Badge variant="gold">{gpaLabel(projectedCgpa)}</Badge>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span
              className={`font-bold ${
                gpaDelta > 0
                  ? 'text-emerald-400'
                  : gpaDelta < 0
                  ? 'text-rose-400'
                  : 'text-zinc-400'
              }`}
            >
              {gpaDelta > 0 ? `+${gpaDelta.toFixed(2)}` : gpaDelta.toFixed(2)} pts
            </span>
            <span style={{ color: 'var(--text-muted)' }}>from current standing</span>
          </div>
        </Card>

        {/* Total ECTS in Simulation */}
        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Projected Total ECTS
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              {projectedTotalEcts}
            </h3>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300">
              +{newEcts} Active
            </span>
          </div>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
            {currentEcts} completed + {newEcts} enrolled
          </p>
        </Card>

        {/* Total Quality Points */}
        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Projected Quality Points
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-purple-300">
              {formatQualityPoints(projectedTotalPoints)}
            </h3>
            <span className="font-mono text-xs text-purple-400">
              +{formatQualityPoints(newPoints)} pts
            </span>
          </div>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
            Strictly weighted: Quality Point = Grade Point × ECTS
          </p>
        </Card>
      </div>

      {/* Main Course Simulation Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-(--brand-gold)" />
            <h2 className="font-serif text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Currently Enrolled Courses
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-(--hover-overlay) text-(--text-muted)">
              {activeCourses.length} {activeCourses.length === 1 ? 'course' : 'courses'}
            </span>
          </div>
          <p className="text-xs font-mono text-(--text-muted) hidden sm:block">
            Click a grade to project your outcome
          </p>
        </div>

        {activeCourses.length === 0 ? (
          <Card hoverable={false} className="p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-(--text-muted) mx-auto opacity-40" />
            <p className="text-sm font-semibold text-(--text-primary)">No currently active enrolled courses</p>
            <p className="text-xs text-(--text-muted) max-w-md mx-auto">
              You are not currently enrolled in active courses for this term, or your registration is pending.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeCourses.map((course) => {
              const selectedPoints = projectedGrades[course.id] ?? 4.0;
              const selectedOption = GRADE_OPTIONS.find((o) => o.points === selectedPoints) ?? GRADE_OPTIONS[0];
              const courseQp = selectedPoints * course.ects;

              return (
                <div
                  key={course.id}
                  className="p-4 sm:p-5 rounded-2xl border transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--hover-overlay)',
                    borderColor: 'var(--border-default)',
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Course Information */}
                    <div className="min-w-0 space-y-1 lg:max-w-md">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-(--brand-gold)">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/10 text-zinc-300">
                          {course.ects} ECTS
                        </span>
                      </div>
                      <h3 className="font-serif text-sm sm:text-base font-bold text-(--text-primary) truncate">
                        {course.title}
                      </h3>
                      {course.instructor && (
                        <p className="text-xs font-sans text-(--text-muted)">
                          Instructor: {course.instructor}
                        </p>
                      )}
                    </div>

                    {/* Quality Point Preview */}
                    <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-(--text-muted) uppercase tracking-wider block">
                          Projected QP
                        </span>
                        <span className="font-bold text-purple-300 text-sm">
                          {formatQualityPoints(courseQp)}
                        </span>
                      </div>

                      {/* Grade Selector Buttons */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {GRADE_OPTIONS.map((opt) => {
                          const isSelected = selectedPoints === opt.points;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => handleGradeSelect(course.id, opt.points)}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-(--brand-gold) text-black shadow-md font-bold scale-105'
                                  : 'bg-white/5 text-(--text-secondary) hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {opt.label}
                              <span className="text-[10px] opacity-70 ml-1 hidden md:inline">
                                ({opt.points.toFixed(1)})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Projection Formula & Policy Notice */}
      <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-blue-200/90">
          <p className="font-semibold text-blue-300">
            Preview Tool Only
          </p>
          <p className="leading-relaxed">
            This simulator allows you to explore hypothetical GPA outcomes based on Harmony College ECTS weighting rules.
            Adjusting grades in this tool does not modify your official academic records, instructors&apos; gradebooks, or transcripts.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default GpaSimulatorView;
