'use client';

/**
 * My Courses — Student Dashboard View
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays only real course data from the database/API.
 * When a student has no enrolled courses, displays a clean empty state.
 * No mock/fallback courses, fake instructors, fake attendance, or fake semesters.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Course, NavTab } from '../types';
import {
  BookOpen, Calendar, MapPin, User, Award,
  Clock, ClipboardList, Info, TrendingUp, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { DURATION, EASE, SPRING } from '../lib/motion';

interface MyCoursesViewProps {
  enrolledCourses: Course[];
  setActiveTab: (tab: NavTab) => void;
  programName?: string;
  semesterName?: string;
}

/** Attendance rate color indicator */
function AttendanceDot({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'var(--status-success)' :
                rate >= 75 ? 'var(--status-warning)' :
                             'var(--status-danger)';
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={`Attendance: ${rate}%`}
    />
  );
}

export const MyCoursesView: React.FC<MyCoursesViewProps> = ({
  enrolledCourses = [],
  setActiveTab,
  programName,
  semesterName,
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const closeDrawer = useCallback(() => setSelectedCourse(null), []);

  // Escape key closes the drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDrawer]);

  const hasCourses = enrolledCourses.length > 0;

  // Real calculations only when courses exist
  const totalCredits = hasCourses
    ? enrolledCourses.reduce((s, c) => s + (typeof c.credits === 'number' ? c.credits : 0), 0)
    : 0;

  // Only calculate average attendance if courses have actual attendance numbers recorded
  const coursesWithAttendance = enrolledCourses.filter(
    c => typeof c.attendanceRate === 'number' && c.attendanceRate !== null && !isNaN(c.attendanceRate)
  );
  const avgAttendance = coursesWithAttendance.length > 0
    ? Math.round(coursesWithAttendance.reduce((s, c) => s + (c.attendanceRate as number), 0) / coursesWithAttendance.length)
    : null;

  // Active semester name derived from actual enrolled courses or provided prop
  const currentSemesterLabel = enrolledCourses[0]?.semester || semesterName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {hasCourses && (
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {currentSemesterLabel && (
                <Badge variant="gold">
                  {currentSemesterLabel}
                </Badge>
              )}
              <Badge variant="glass">
                Enrolled Courses
              </Badge>
            </div>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            My Courses
          </h1>
          <p className="font-sans text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {hasCourses ? (
              <>
                {programName ? `${programName} · ` : ''}
                {enrolledCourses.length} {enrolledCourses.length === 1 ? 'course' : 'courses'} · {totalCredits} credits this semester
              </>
            ) : (
              <>
                {programName ? `${programName} · ` : ''}
                View your enrolled curriculum courses
              </>
            )}
          </p>
        </div>

        {/* Real Summary pills — only rendered if the student has actual enrolled courses */}
        {hasCourses && (
          <div className="flex items-center gap-3 flex-wrap">
            {avgAttendance !== null && (
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
              >
                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} aria-hidden="true" />
                <span style={{ color: 'var(--text-secondary)' }}>Avg Attendance</span>
                <span className="font-mono font-bold" style={{ color: 'var(--status-success)' }}>{avgAttendance}%</span>
              </div>
            )}
            {totalCredits > 0 && (
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
              >
                <Award className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
                <span style={{ color: 'var(--text-secondary)' }}>Credits</span>
                <span className="font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>{totalCredits} cr</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Enrollment Notice ──────────────────────────────────────────── */}
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

      {/* ── Main Content: Clean Empty State or Real Courses Grid ─────────── */}
      {!hasCourses ? (
        <div
          className="py-16 px-6 text-center rounded-2xl border flex flex-col items-center justify-center max-w-lg mx-auto my-6"
          style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(233,195,73,0.1)', border: '1px solid var(--accent-gold-border)' }}
          >
            <BookOpen className="w-8 h-8" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <h2 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Courses Yet
          </h2>
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            You have not been enrolled in any courses yet. Your courses will appear here once they are assigned to you.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {enrolledCourses.map((course, i) => {
            const hasInstructor = Boolean(course.instructor && course.instructor !== 'TBA' && course.instructor !== 'Not Assigned');
            const hasAttendance = typeof course.attendanceRate === 'number' && course.attendanceRate !== null && !isNaN(course.attendanceRate);
            const hasProgress = typeof course.progress === 'number' && !isNaN(course.progress);

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...DURATION.medium, delay: i * 0.05, ...EASE.out }}
              >
                <Card
                  onClick={() => setSelectedCourse(course)}
                  className="flex flex-col group cursor-pointer h-full"
                >
                  <div className="flex-1 space-y-4">
                    {/* Course header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {course.code && <Badge variant="gold">{course.code}</Badge>}
                          {course.currentGrade && (
                            <Badge variant="emerald">{course.currentGrade}</Badge>
                          )}
                        </div>
                        <h3
                          className="font-sans text-sm font-semibold leading-snug transition-colors group-hover:opacity-80"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {course.title || 'Untitled Course'}
                        </h3>
                      </div>
                      {hasInstructor && (
                        <div
                          className="w-10 h-10 rounded-full overflow-hidden border shrink-0 flex items-center justify-center font-serif font-bold text-xs"
                          style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)' }}
                        >
                          {course.instructorPhoto ? (
                            <img src={course.instructorPhoto} alt={course.instructor} className="w-full h-full object-cover" />
                          ) : (
                            course.instructor.charAt(0).toUpperCase()
                          )}
                        </div>
                      )}
                    </div>

                    {/* Course meta */}
                    <div className="space-y-1.5 text-xs font-sans">
                      {hasInstructor && (
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{course.instructor}</span>
                        </div>
                      )}
                      {course.schedule && course.schedule !== 'TBA' && (
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{course.schedule}</span>
                        </div>
                      )}
                      {course.room && course.room !== 'TBA' && (
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{course.room}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar — only shown if progress is defined */}
                    {hasProgress && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{course.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%`, backgroundColor: 'var(--brand-gold)' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-4 pt-3 border-t flex items-center justify-between"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    {hasAttendance ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <AttendanceDot rate={course.attendanceRate as number} />
                        <span style={{ color: 'var(--text-muted)' }}>{course.attendanceRate}% attendance</span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Enrolled</span>
                    )}
                    {typeof course.credits === 'number' && course.credits > 0 && (
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-faint)' }}>
                        {course.credits} cr
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>
      )}

      {/* ── Course Detail Drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="course-drawer-title">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ ...DURATION.standard, ...EASE.inOut }}
              className="absolute inset-0 bg-black"
              onClick={closeDrawer}
            />

            {/* Drawer panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={SPRING.drawer}
                className="w-screen max-w-lg flex flex-col shadow-2xl"
                style={{ backgroundColor: 'var(--bg-modal)', borderLeft: '1px solid var(--border-default)' }}
              >
                {/* Drawer header */}
                <div
                  className="p-5 flex items-start justify-between gap-4 sticky top-0 z-10 backdrop-blur-xl shrink-0"
                  style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-modal-hdr)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
                      aria-hidden="true"
                    >
                      <BookOpen className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
                    </div>
                    <div className="min-w-0">
                      {selectedCourse.code && (
                        <p className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--brand-gold)' }}>
                          {selectedCourse.code}
                        </p>
                      )}
                      <h2
                        id="course-drawer-title"
                        className="font-serif text-base sm:text-lg font-bold leading-snug truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {selectedCourse.title}
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={closeDrawer}
                    aria-label="Close course details"
                    className="p-1.5 rounded-full transition-colors shrink-0 ds-focus-ring mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Drawer content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">

                  {/* Instructor (only if assigned) */}
                  {selectedCourse.instructor && selectedCourse.instructor !== 'TBA' && selectedCourse.instructor !== 'Not Assigned' ? (
                    <div
                      className="flex items-center gap-4 p-4 rounded-2xl border"
                      style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                    >
                      <div
                        className="w-14 h-14 rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center font-serif font-bold text-lg"
                        style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)' }}
                      >
                        {selectedCourse.instructorPhoto ? (
                          <img src={selectedCourse.instructorPhoto} alt={selectedCourse.instructor} className="w-full h-full object-cover" />
                        ) : (
                          selectedCourse.instructor.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {selectedCourse.instructor}
                        </h3>
                        {selectedCourse.instructorTitle && (
                          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {selectedCourse.instructorTitle}
                          </p>
                        )}
                        {selectedCourse.schedule && selectedCourse.schedule !== 'TBA' && (
                          <p className="font-mono text-xs mt-1 font-semibold" style={{ color: 'var(--brand-gold)' }}>
                            {selectedCourse.schedule}
                          </p>
                        )}
                        {selectedCourse.room && selectedCourse.room !== 'TBA' && (
                          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {selectedCourse.room}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {typeof selectedCourse.credits === 'number' && (
                      <div
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                      >
                        <span style={{ color: 'var(--brand-gold)' }} aria-hidden="true"><BookOpen className="w-4 h-4" /></span>
                        <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCourse.credits} cr</span>
                        <span className="font-sans text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Credits</span>
                      </div>
                    )}
                    {typeof selectedCourse.attendanceRate === 'number' && selectedCourse.attendanceRate !== null && (
                      <div
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                      >
                        <span style={{ color: 'var(--brand-gold)' }} aria-hidden="true"><TrendingUp className="w-4 h-4" /></span>
                        <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCourse.attendanceRate}%</span>
                        <span className="font-sans text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Attendance</span>
                      </div>
                    )}
                    {selectedCourse.currentGrade && (
                      <div
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                      >
                        <span style={{ color: 'var(--brand-gold)' }} aria-hidden="true"><Award className="w-4 h-4" /></span>
                        <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCourse.currentGrade}</span>
                        <span className="font-sans text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Grade</span>
                      </div>
                    )}
                  </div>

                  {/* Progress (if exists) */}
                  {typeof selectedCourse.progress === 'number' && !isNaN(selectedCourse.progress) && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--brand-gold)' }}>
                        Course Progress
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCourse.progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                          <motion.div
                            className="h-full rounded-full origin-left"
                            style={{ backgroundColor: 'var(--brand-gold)' }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: selectedCourse.progress / 100 }}
                            transition={{ ...DURATION.large, ...EASE.out }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Course overview */}
                  {selectedCourse.description && (
                    <>
                      <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />
                      <div className="space-y-2">
                        <h4 className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--brand-gold)' }}>
                          Course Overview
                        </h4>
                        <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {selectedCourse.description}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Real Assignments (only if exist) */}
                  {selectedCourse.assignments && selectedCourse.assignments.length > 0 && (
                    <>
                      <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />
                      <div className="space-y-3">
                        <h4 className="font-mono text-xs uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--brand-gold)' }}>
                          <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                          Assignments
                        </h4>
                        <div className="space-y-2">
                          {selectedCourse.assignments.map(asgn => (
                            <div
                              key={asgn.id}
                              className="p-3.5 rounded-xl flex items-center justify-between text-xs border"
                              style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
                            >
                              <div className="min-w-0 flex-1 mr-3">
                                <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{asgn.title}</p>
                                <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                                  Due: {asgn.dueDate}
                                </p>
                              </div>
                              {asgn.status === 'graded'
                                ? <Badge variant="emerald">{asgn.grade}</Badge>
                                : <Badge variant="amber">Pending</Badge>
                              }
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full text-xs font-semibold"
                          icon={<ClipboardList className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedCourse(null);
                            setActiveTab('assignments');
                          }}
                        >
                          View All in Assignments Hub
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};