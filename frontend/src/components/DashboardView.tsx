'use client';

import React, { useState, useEffect } from 'react';
import { NavTab, StudentProfile, Course, TimetableEvent, AlertItem } from '../types';
import {
  Sparkles,
  Star,
  ArrowRight,
  MapPin,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  X,
  FileText,
  GraduationCap,
  CreditCard,
  CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { SlidePanel } from './ui/SlidePanel';

// ── Registration Under Review Banner ─────────────────────────────────────────
// Shows only while paymentVerifiedByFinance is still false (i.e. student
// has submitted but Finance Officer has not yet verified the payment).
function RegistrationStatusBanner() {
  const [status, setStatus] = React.useState<'loading' | 'pending' | 'verified' | 'hidden'>('loading');

  useEffect(() => {
    fetch('/api/student/onboarding/prereqs', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { setStatus('hidden'); return; }
        // If both prereqs are met but Finance hasn't verified yet, show banner
        if (d.feePaid && d.departmentSelected && !d.paymentVerifiedByFinance) {
          setStatus('pending');
        } else {
          setStatus('hidden');
        }
      })
      .catch(() => setStatus('hidden'));
  }, []);

  if (status === 'loading' || status === 'hidden' || status === 'verified') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      style={{
        background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(234,179,8,0.03) 100%)',
        border: '1px solid rgba(234,179,8,0.3)',
      }}
      role="status"
      aria-label="Registration under review"
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <ClipboardCheck className="w-5 h-5" style={{ color: '#EAB308' }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Registration Status: Under Review
          </p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
            style={{ backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)', color: '#EAB308' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#EAB308' }} />
            Under Review
          </span>
        </div>
        <p className="text-xs font-sans mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your registration is currently being reviewed by the administration. Please wait for approval.
        </p>
      </div>
    </motion.div>
  );
}

interface DashboardViewProps {
  profile: StudentProfile;
  activeCourses: Course[];
  timetable: TimetableEvent[];
  alerts: AlertItem[];
  setActiveTab: (tab: NavTab) => void;
  degreeCompletionPct?: number;      // real value from /api/student/dashboard/degree-audit
  upcomingEvents?: { id: string; title: string; eventType: string; startDate: string; endDate: string }[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile, activeCourses, timetable, alerts, setActiveTab,
  degreeCompletionPct, upcomingEvents = [],
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Calendar: derive from upcoming events or fall back to current month
  const today = new Date();
  const calendarYear  = today.getFullYear();
  const calendarMonth = today.getMonth(); // 0-indexed
  const monthName     = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Days in current month for mini-calendar grid
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDow    = new Date(calendarYear, calendarMonth, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Sun becomes 6
  const firstDowMon = firstDow === 0 ? 6 : firstDow - 1;

  // Which days have events
  const eventDays = new Set(
    upcomingEvents
      .filter(e => {
        const d = new Date(e.startDate);
        return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
      })
      .map(e => new Date(e.startDate).getDate()),
  );
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(today.getDate());

  // Events for the selected calendar day
  const eventsForDay = upcomingEvents.filter(e => {
    const d = new Date(e.startDate);
    return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && d.getDate() === selectedCalendarDay;
  });

  // Degree completion: use real value if available, fall back to computed
  const completionPct = degreeCompletionPct != null
    ? degreeCompletionPct
    : profile.totalRequiredCredits > 0
      ? Math.round((profile.completedCredits / profile.totalRequiredCredits) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Registration Under Review banner — shown until payment is verified */}
      <RegistrationStatusBanner />

      {/* 1. Hero Card Banner */}
      <section
        className="relative w-full min-h-80 rounded-3xl overflow-hidden shadow-2xl border"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80')` }}
        />
        <div className="absolute inset-0 hero-overlay-dark flex items-center px-6 sm:px-10 lg:px-12 py-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full">
            <div className="flex-1 text-white space-y-4">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md text-xs font-mono font-semibold"
                style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-strong)', color: 'var(--brand-gold)' }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Harmony Fall 2024 Active
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white">
                Welcome back, {profile.name.split(' ')[0]}.
              </h2>
              <p className="font-sans text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
                You're making outstanding progress at Harmony College. You've completed{' '}
                <span className="font-semibold" style={{ color: 'var(--brand-gold)' }}>{completionPct}% of your core degree requirements</span>{' '}
                for the {profile.major} major.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => setActiveTab('my_courses')} icon={<BookOpen className="w-4 h-4" />}>My Courses</Button>
                <Button variant="secondary" onClick={() => setActiveTab('timetable')} icon={<CalendarDays className="w-4 h-4" />}>My Timetable</Button>
                <Button variant="secondary" onClick={() => setActiveTab('assignments')} icon={<ClipboardList className="w-4 h-4" />}>Assignments</Button>
                <Button variant="secondary" onClick={() => setActiveTab('grades')} icon={<GraduationCap className="w-4 h-4" />}>View Transcript</Button>
              </div>
            </div>
            <div
              className="hidden lg:block w-40 h-40 rounded-2xl overflow-hidden border-4 shadow-2xl shrink-0"
              style={{ borderColor: 'var(--accent-gold-border)' }}
            >
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Academic Summary KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* GPA */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Cumulative GPA</p>
            <h3 className="font-mono text-3xl sm:text-4xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>{profile.cumulativeGpa.toFixed(2)}</h3>
          </div>
          <div className="flex justify-between items-end pt-3">
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--brand-gold)' }}>+{profile.gpaChange} from last term</span>
            <div className="w-16 h-6 rounded overflow-hidden" style={{ backgroundColor: 'var(--accent-gold-subtle)' }}>
              <svg className="w-full h-full" viewBox="0 0 60 24" preserveAspectRatio="none">
                <polygon points="0,18 12,14 24,10 36,12 48,6 60,3 60,24 0,24" fill="var(--accent-gold-subtle)" />
                <polyline points="0,18 12,14 24,10 36,12 48,6 60,3" fill="none" stroke="var(--brand-gold)" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Credits */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Completed Credits</p>
            <h3 className="font-mono text-3xl sm:text-4xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {profile.completedCredits}
              <span className="text-lg font-normal" style={{ color: 'var(--text-faint)' }}>/{profile.totalRequiredCredits}</span>
            </h3>
          </div>
          <div className="space-y-1.5 pt-3">
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
              <div className="h-full transition-all duration-700" style={{ width: `${(profile.completedCredits / profile.totalRequiredCredits) * 100}%`, backgroundColor: 'var(--brand-gold)' }} />
            </div>
            <p className="text-[10px] text-right font-mono" style={{ color: 'var(--text-muted)' }}>
              {((profile.completedCredits / profile.totalRequiredCredits) * 100).toFixed(1)}% Completed
            </p>
          </div>
        </Card>

        {/* Attendance */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Attendance Rate</p>
            <h3 className="font-mono text-3xl sm:text-4xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>{profile.attendanceRate}%</h3>
          </div>
          <div className="flex justify-between items-center pt-3">
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{profile.cohortPercentile}</span>
            <Star className="w-5 h-5" style={{ color: 'var(--brand-gold)', fill: 'var(--brand-gold)' }} />
          </div>
        </Card>

        {/* Balance */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Account Balance</p>
            <h3 className="font-mono text-3xl sm:text-4xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>${profile.accountBalance.toFixed(2)}</h3>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-success)' }} />
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Cleared for {profile.clearedTerm}</span>
          </div>
        </Card>
      </section>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Courses */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Courses</h2>
              <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Semester 5 — Enrolled curriculum courses</p>
            </div>
            <button onClick={() => setActiveTab('my_courses')} className="font-sans text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: 'var(--brand-gold)' }}>
              View All Courses <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCourses.map((course) => (
              <Card key={course.id} onClick={() => setSelectedCourse(course)} className="flex flex-col cursor-pointer group">
                <div className="p-1 flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Badge variant="gold">{course.code}</Badge>
                      <h4 className="font-sans text-base font-semibold mt-2 transition-colors leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {course.title}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border shrink-0" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
                      <img src={course.instructorPhoto} alt={course.instructor} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span style={{ color: 'var(--text-muted)' }}>Course Progress</span>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{course.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                      <div className="h-full" style={{ width: `${course.progress}%`, backgroundColor: 'var(--brand-gold)' }} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs" style={{ borderColor: 'var(--border-default)' }}>
                  {course.midtermAlert ? (
                    <span className="font-mono font-bold" style={{ color: 'var(--status-danger)' }}>{course.midtermAlert}</span>
                  ) : course.assignmentsDueText ? (
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{course.assignmentsDueText}</span>
                  ) : (
                    <span className="font-mono" style={{ color: 'var(--text-faint)' }}>No pending tasks</span>
                  )}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--text-muted)' }} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Calendar & Timetable */}
        <div className="lg:col-span-4 space-y-6 rounded-2xl p-6 shadow-xl border" style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-default)' }}>
          {/* ── Mini Calendar ── */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-sans text-base font-bold" style={{ color: 'var(--text-primary)' }}>{monthName}</h3>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center font-mono text-xs">
              {['M','T','W','T','F','S','S'].map((day, idx) => (
                <span key={idx} className="font-bold py-1" style={{ color: 'var(--text-faint)' }}>{day}</span>
              ))}
              {/* Leading blank cells */}
              {Array.from({ length: firstDowMon }).map((_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = selectedCalendarDay === day;
                const hasEvent   = eventDays.has(day);
                const isToday    = day === today.getDate();
                return (
                  <button key={day} onClick={() => setSelectedCalendarDay(day)}
                    className="relative py-1 w-7 h-7 mx-auto rounded-full transition-all text-xs font-semibold flex items-center justify-center"
                    style={isSelected
                      ? { backgroundColor: 'var(--brand-gold)', color: 'var(--text-inverse)' }
                      : isToday
                        ? { border: '1.5px solid var(--brand-gold)', color: 'var(--brand-gold)' }
                        : { color: 'var(--text-primary)' }
                    }>
                    {day}
                    {hasEvent && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ backgroundColor: 'var(--brand-gold)' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Events for selected day */}
            {eventsForDay.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {eventsForDay.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--brand-gold)' }} />
                    <span className="font-semibold truncate" style={{ color: 'var(--brand-gold)' }}>{ev.title}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-bold" style={{ color: 'var(--text-primary)' }}>Today's Timetable</h3>
              <button
                onClick={() => setActiveTab('timetable')}
                className="font-sans text-xs font-semibold hover:underline flex items-center gap-1"
                style={{ color: 'var(--brand-gold)' }}
              >
                Full Timetable <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-[9px] top-2 bottom-2 w-0.5" style={{ backgroundColor: 'var(--border-default)' }} />
              {timetable.map((event) => (
                <div key={event.id} className="relative">
                  <div
                    className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2"
                    style={event.isCurrent
                      ? { borderColor: 'var(--brand-gold)', backgroundColor: 'var(--bg-card-solid)', boxShadow: '0 0 0 4px var(--accent-gold-subtle)' }
                      : { borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-card-solid)' }
                    }
                  />
                  <p className="font-mono text-xs" style={{ color: event.isCurrent ? 'var(--brand-gold)' : 'var(--text-muted)', fontWeight: event.isCurrent ? 700 : undefined }}>
                    {event.time}
                  </p>
                  <h4 className="font-sans text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{event.title}</h4>
                  <p className="font-mono text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
                    {event.location}
                  </p>
                </div>
              ))}
              {timetable.length === 0 && (
                <p className="text-xs font-sans italic" style={{ color: 'var(--text-faint)' }}>No classes scheduled today.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 4. Course Detail — SlidePanel */}
      <SlidePanel
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        title={selectedCourse ? `${selectedCourse.code}: ${selectedCourse.title}` : ''}
        subtitle="My Courses"
        width="max-w-xl"
      >
        {selectedCourse && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
              <img src={selectedCourse.instructorPhoto} alt={selectedCourse.instructor} className="w-14 h-14 rounded-full object-cover border-2 shrink-0" style={{ borderColor: 'var(--accent-gold-border)' }} />
              <div>
                <h4 className="font-sans font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedCourse.instructor}</h4>
                <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedCourse.instructorTitle}</p>
                <p className="font-mono text-xs mt-1 font-semibold" style={{ color: 'var(--brand-gold)' }}>Schedule: {selectedCourse.schedule} ({selectedCourse.room})</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-sans font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} /> Course Syllabus & Objectives
              </h4>
              <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedCourse.description}</p>
              <p className="font-sans text-xs leading-relaxed italic pt-1" style={{ color: 'var(--text-secondary)' }}>"{selectedCourse.syllabusOverview}"</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-sans font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FileText className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} /> Assignments & Grading
              </h4>
              <div className="space-y-2">
                {selectedCourse.assignments.map((asgn) => (
                  <div key={asgn.id} className="p-3.5 rounded-xl flex items-center justify-between text-xs border" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{asgn.title}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>Due: {asgn.dueDate}</p>
                    </div>
                    {asgn.status === 'graded' ? <Badge variant="emerald">{asgn.grade}</Badge> : <Button variant="primary" size="sm">Submit Task</Button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </motion.div>
  );
};
