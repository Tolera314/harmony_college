'use client';

import React, { useState } from 'react';
import { NavTab, StudentProfile, Course, TimetableEvent, AlertItem } from '../types';
import {
  Sparkles,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  BookOpen,
  X,
  FileText,
  GraduationCap,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';

interface DashboardViewProps {
  profile: StudentProfile;
  activeCourses: Course[];
  timetable: TimetableEvent[];
  alerts: AlertItem[];
  setActiveTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile, activeCourses, timetable, alerts, setActiveTab
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
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
                <span className="font-semibold" style={{ color: 'var(--brand-gold)' }}>85% of your core degree requirements</span>{' '}
                for the {profile.major} major.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => setActiveTab('registration')} icon={<UserCheck className="w-4 h-4" />}>Register Courses</Button>
                <Button variant="secondary" onClick={() => setActiveTab('grades')} icon={<GraduationCap className="w-4 h-4" />}>View Transcript</Button>
                <Button variant="secondary" onClick={() => setActiveTab('financials')} icon={<CreditCard className="w-4 h-4" />}>Pay Tuition</Button>
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
              <h2 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Active Courses</h2>
              <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Fall 2024 Academic Term Schedule & Syllabus</p>
            </div>
            <button onClick={() => setActiveTab('registration')} className="font-sans text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: 'var(--brand-gold)' }}>
              View Full Schedule <ArrowRight className="w-4 h-4" />
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
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-sans text-base font-bold" style={{ color: 'var(--text-primary)' }}>July 2024</h3>
              <div className="flex gap-1">
                <button className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center font-mono text-xs">
              {['M','T','W','T','F','S','S'].map((day, idx) => (
                <span key={idx} className="font-bold" style={{ color: 'var(--text-faint)' }}>{day}</span>
              ))}
              {[15,16,17,18,19,20,21,22,23,24,25,26,27,28].map((day) => {
                const isSelected = selectedCalendarDay === day;
                return (
                  <button key={day} onClick={() => setSelectedCalendarDay(day)}
                    className={`py-1 w-7 h-7 mx-auto rounded-full transition-all text-xs font-semibold ${isSelected ? 'shadow-sm font-bold scale-105' : ''}`}
                    style={isSelected
                      ? { backgroundColor: 'var(--brand-gold)', color: 'var(--text-inverse)' }
                      : { color: 'var(--text-primary)' }
                    }
                  >{day}</button>
                );
              })}
            </div>
          </section>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          <section className="space-y-4">
            <h3 className="font-sans text-base font-bold" style={{ color: 'var(--text-primary)' }}>Today's Timetable</h3>
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
            </div>
          </section>
        </div>
      </div>

      {/* 4. Course Detail Modal */}
      <Modal isOpen={!!selectedCourse} onClose={() => setSelectedCourse(null)} title={selectedCourse ? `${selectedCourse.code}: ${selectedCourse.title}` : undefined}>
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

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedCourse(null)}>Close Modal</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
