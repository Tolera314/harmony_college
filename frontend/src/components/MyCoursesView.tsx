'use client';

/**
 * My Courses — Fixed Curriculum View
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the courses automatically assigned by the college based on the
 * student's program curriculum. Students cannot add or drop courses here.
 * Course enrollment is managed exclusively by the Registrar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Course, NavTab } from '../types';
import {
  BookOpen, Calendar, MapPin, User, Award,
  ChevronRight, Clock, ClipboardList,
  Info, TrendingUp, X, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { EmptyState } from './ui/States';
import { programCurriculum } from '../data/studentData';
import { DURATION, EASE, SPRING } from '../lib/motion';

interface MyCoursesViewProps {
  enrolledCourses: Course[];
  setActiveTab: (tab: NavTab) => void;
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

export const MyCoursesView: React.FC<MyCoursesViewProps> = ({ enrolledCourses, setActiveTab }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const closeDrawer = useCallback(() => setSelectedCourse(null), []);

  // Escape key closes the drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDrawer]);

  const totalCredits = enrolledCourses.reduce((s, c) => s + c.credits, 0);
  const avgAttendance = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((s, c) => s + (c.attendanceRate ?? 100), 0) / enrolledCourses.length)
    : 0;

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
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="gold">
              {programCurriculum.currentSemester}
            </Badge>
            <Badge variant="glass">
              Curriculum Auto-Enrolled
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            My Courses
          </h1>
          <p className="font-sans text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {programCurriculum.program} · {enrolledCourses.length} courses · {totalCredits} credits this semester
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} aria-hidden="true" />
            <span style={{ color: 'var(--text-secondary)' }}>Avg Attendance</span>
            <span className="font-mono font-bold" style={{ color: 'var(--status-success)' }}>{avgAttendance}%</span>
          </div>
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
          >
            <Award className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
            <span style={{ color: 'var(--text-secondary)' }}>Credits</span>
            <span className="font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>{totalCredits} cr</span>
          </div>
        </div>
      </section>

      {/* ── Enrollment notice ──────────────────────────────────────────── */}
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

      {/* ── Current semester courses ───────────────────────────────────── */}
      {enrolledCourses.length === 0 ? (
        <EmptyState
          variant="courses"
          description="No courses have been assigned yet for this semester. Please contact the Registrar's office."
          action={{ label: 'Contact Registrar', onClick: () => setActiveTab('support'), icon: <ChevronRight className="w-4 h-4" /> }}
        />
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {enrolledCourses.map((course, i) => (
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
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="gold">{course.code}</Badge>
                        {course.currentGrade && (
                          <Badge variant="emerald">{course.currentGrade}</Badge>
                        )}
                      </div>
                      <h3
                        className="font-sans text-sm font-semibold leading-snug transition-colors group-hover:opacity-80"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {course.title}
                      </h3>
                    </div>
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden border shrink-0"
                      style={{ borderColor: 'var(--accent-gold-border)' }}
                    >
                      <img src={course.instructorPhoto} alt={course.instructor} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Course meta */}
                  <div className="space-y-1.5 text-xs font-sans">
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{course.instructor}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{course.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{course.room}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
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
                </div>

                {/* Footer */}
                <div
                  className="mt-4 pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <AttendanceDot rate={course.attendanceRate ?? 100} />
                    <span style={{ color: 'var(--text-muted)' }}>{course.attendanceRate ?? 100}% attendance</span>
                  </div>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-faint)' }}>
                    {course.credits} cr
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </section>
      )}

      {/* ── Upcoming semester preview ──────────────────────────────────── */}
      {programCurriculum.semesters.filter(s => s.status === 'upcoming').map(sem => (
        <section key={sem.id} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
            <span className="font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border" style={{ color: 'var(--text-faint)', borderColor: 'var(--border-default)' }}>
              Upcoming · {sem.label}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sem.courses.map(c => (
              <div
                key={c.code}
                className="flex items-center gap-3 p-4 rounded-2xl border"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
              >
                <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-bold" style={{ color: 'var(--brand-gold)' }}>{c.code}</p>
                  <p className="font-sans text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{c.title}</p>
                </div>
                <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--text-faint)' }}>{c.credits}cr</span>
              </div>
            ))}
          </div>
          <p className="font-sans text-xs text-center" style={{ color: 'var(--text-faint)' }}>
            Next semester courses will be assigned by the Registrar upon successful completion of the current semester.
          </p>
        </section>
      ))}

      {/* ── Course Detail Drawer — slides in from the right ────────────── */}
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
                      <p className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--brand-gold)' }}>
                        {selectedCourse.code}
                      </p>
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

                  {/* Instructor */}
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl border"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                  >
                    <img
                      src={selectedCourse.instructorPhoto}
                      alt={selectedCourse.instructor}
                      className="w-14 h-14 rounded-full object-cover border-2 shrink-0"
                      style={{ borderColor: 'var(--accent-gold-border)' }}
                    />
                    <div>
                      <h3 className="font-sans font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {selectedCourse.instructor}
                      </h3>
                      <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {selectedCourse.instructorTitle}
                      </p>
                      <p className="font-mono text-xs mt-1 font-semibold" style={{ color: 'var(--brand-gold)' }}>
                        {selectedCourse.schedule}
                      </p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {selectedCourse.room}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Credits',     value: `${selectedCourse.credits} cr`,          icon: <BookOpen className="w-4 h-4" />      },
                      { label: 'Attendance',  value: `${selectedCourse.attendanceRate ?? 100}%`, icon: <TrendingUp className="w-4 h-4" />    },
                      { label: 'Grade',       value: selectedCourse.currentGrade ?? '—',       icon: <Award className="w-4 h-4" />         },
                    ].map(stat => (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
                      >
                        <span style={{ color: 'var(--brand-gold)' }} aria-hidden="true">{stat.icon}</span>
                        <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</span>
                        <span className="font-sans text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
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

                  <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />

                  {/* Course overview */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--brand-gold)' }}>
                      Course Overview
                    </h4>
                    <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {selectedCourse.description}
                    </p>
                    <p className="font-sans text-xs leading-relaxed italic pt-1" style={{ color: 'var(--text-muted)' }}>
                      "{selectedCourse.syllabusOverview}"
                    </p>
                  </div>

                  {/* Assignments */}
                  {selectedCourse.assignments.length > 0 && (
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

                {/* Drawer footer removed — use header X button to close */}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};