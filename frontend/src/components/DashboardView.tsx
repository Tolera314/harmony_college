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
  profile,
  activeCourses,
  timetable,
  alerts,
  setActiveTab
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(20);

  const sparklinePoints = "0,18 12,14 24,10 36,12 48,6 60,3 60,24 0,24";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-8"
    >
      {/* 1. Hero Card Banner */}
      <section className="relative w-full min-h-[320px] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        <div className="absolute inset-0 hero-overlay-dark flex items-center px-6 sm:px-10 lg:px-12 py-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full">
            <div className="flex-1 text-white space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono font-semibold text-[#E9C349]">
                <Sparkles className="w-3.5 h-3.5" /> Harmony Fall 2024 Active
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                Welcome back, {profile.name.split(' ')[0]}.
              </h2>
              <p className="font-sans text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
                You're making outstanding progress at Harmony College. You've completed{' '}
                <span className="font-semibold text-[#E9C349]">85% of your core degree requirements</span> for the {profile.major} major.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => setActiveTab('registration')}
                  icon={<UserCheck className="w-4 h-4" />}
                >
                  Register Courses
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('grades')}
                  icon={<GraduationCap className="w-4 h-4" />}
                >
                  View Transcript
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('financials')}
                  icon={<CreditCard className="w-4 h-4" />}
                >
                  Pay Tuition
                </Button>
              </div>
            </div>

            {/* Profile Photo Thumbnail */}
            <div className="hidden lg:block w-40 h-40 rounded-2xl overflow-hidden border-4 border-[#E9C349]/30 shadow-2xl shrink-0">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Academic Summary KPIs Grid (4 Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Cumulative GPA */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Cumulative GPA
            </p>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold mt-1 text-white">
              {profile.cumulativeGpa.toFixed(2)}
            </h3>
          </div>
          <div className="flex justify-between items-end pt-3">
            <span className="text-[#E9C349] font-mono text-xs font-semibold">
              +{profile.gpaChange} from last term
            </span>
            <div className="w-16 h-6 bg-[#E9C349]/10 rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 60 24" preserveAspectRatio="none">
                <polygon points={sparklinePoints} fill="rgba(233, 195, 73, 0.25)" />
                <polyline
                  points="0,18 12,14 24,10 36,12 48,6 60,3"
                  fill="none"
                  stroke="#E9C349"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>
        </Card>

        {/* KPI 2: Completed Credits */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Completed Credits
            </p>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold mt-1 text-white">
              {profile.completedCredits}
              <span className="text-lg text-white/40 font-normal">/{profile.totalRequiredCredits}</span>
            </h3>
          </div>
          <div className="space-y-1.5 pt-3">
            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#E9C349] h-full transition-all duration-700"
                style={{ width: `${(profile.completedCredits / profile.totalRequiredCredits) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-right font-mono text-white/50">
              {((profile.completedCredits / profile.totalRequiredCredits) * 100).toFixed(1)}% Completed
            </p>
          </div>
        </Card>

        {/* KPI 3: Attendance Rate */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Attendance Rate
            </p>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold mt-1 text-white">
              {profile.attendanceRate}%
            </h3>
          </div>
          <div className="flex justify-between items-center pt-3">
            <span className="text-white/60 font-mono text-xs">
              {profile.cohortPercentile}
            </span>
            <Star className="w-5 h-5 text-[#E9C349] fill-[#E9C349]" />
          </div>
        </Card>

        {/* KPI 4: Account Balance */}
        <Card hoverable className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Account Balance
            </p>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold mt-1 text-white">
              ${profile.accountBalance.toFixed(2)}
            </h3>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white/60 font-mono text-xs font-semibold">
              Cleared for {profile.clearedTerm}
            </span>
          </div>
        </Card>
      </section>

      {/* 3. Main Content Grid: Active Courses (Left 8 Cols) & Schedule Sidebar (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Active Courses */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Active Courses
              </h2>
              <p className="font-sans text-xs text-white/50 mt-0.5">
                Fall 2024 Academic Term Schedule & Syllabus
              </p>
            </div>
            <button
              onClick={() => setActiveTab('registration')}
              className="text-[#E9C349] font-sans text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1"
            >
              View Full Schedule <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCourses.map((course) => (
              <Card
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="flex flex-col cursor-pointer group"
              >
                <div className="p-1 flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Badge variant="gold">{course.code}</Badge>
                      <h4 className="font-sans text-base font-semibold text-white mt-2 group-hover:text-[#E9C349] transition-colors leading-snug">
                        {course.title}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
                      <img
                        src={course.instructorPhoto}
                        alt={course.instructor}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/50">Course Progress</span>
                      <span className="font-bold text-white">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#E9C349] h-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                  {course.midtermAlert ? (
                    <span className="font-mono font-bold text-[#ff897d]">
                      {course.midtermAlert}
                    </span>
                  ) : course.assignmentsDueText ? (
                    <span className="font-mono text-white/60">
                      {course.assignmentsDueText}
                    </span>
                  ) : (
                    <span className="font-mono text-white/40">
                      No pending tasks
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Calendar & Timetable */}
        <div className="lg:col-span-4 space-y-6 bg-[#141617] border border-white/10 rounded-2xl p-6 shadow-xl">
          {/* Mini Interactive Calendar */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-sans text-base font-bold text-white">
                July 2024
              </h3>
              <div className="flex gap-1">
                <button className="p-1 hover:bg-white/10 rounded-lg text-white/50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-white/10 rounded-lg text-white/50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-2 text-center font-mono text-xs">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <span key={idx} className="text-white/40 font-bold">{day}</span>
              ))}
              {[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map((day) => {
                const isSelected = selectedCalendarDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedCalendarDay(day)}
                    className={`py-1 w-7 h-7 mx-auto rounded-full transition-all text-xs font-semibold ${
                      isSelected
                        ? 'bg-[#E9C349] text-[#0F0F10] shadow-sm font-bold scale-105'
                        : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* Today's Timetable */}
          <section className="space-y-4">
            <h3 className="font-sans text-base font-bold text-white">
              Today's Timetable
            </h3>
            <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
              {timetable.map((event) => (
                <div key={event.id} className="relative">
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 bg-[#141617] ${
                      event.isCurrent
                        ? 'border-[#E9C349] ring-4 ring-[#E9C349]/20 scale-110'
                        : 'border-white/20'
                    }`}
                  />
                  <p
                    className={`font-mono text-xs ${
                      event.isCurrent
                        ? 'text-[#E9C349] font-bold'
                        : 'text-white/50'
                    }`}
                  >
                    {event.time}
                  </p>
                  <h4 className="font-sans text-sm font-semibold text-white mt-0.5">
                    {event.title}
                  </h4>
                  <p className="font-mono text-xs text-white/50 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-white/40" />
                    {event.location}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 4. Interactive Course Detail Modal */}
      <Modal
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        title={selectedCourse ? `${selectedCourse.code}: ${selectedCourse.title}` : undefined}
      >
        {selectedCourse && (
          <div className="space-y-6">
            {/* Instructor Profile */}
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <img
                src={selectedCourse.instructorPhoto}
                alt={selectedCourse.instructor}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#E9C349]/40 shrink-0"
              />
              <div>
                <h4 className="font-sans font-semibold text-sm text-white">
                  {selectedCourse.instructor}
                </h4>
                <p className="font-sans text-xs text-white/60">
                  {selectedCourse.instructorTitle}
                </p>
                <p className="font-mono text-xs text-[#E9C349] mt-1 font-semibold">
                  Schedule: {selectedCourse.schedule} ({selectedCourse.room})
                </p>
              </div>
            </div>

            {/* Syllabus Overview */}
            <div className="space-y-2">
              <h4 className="font-sans font-bold text-sm text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#E9C349]" />
                Course Syllabus & Objectives
              </h4>
              <p className="font-sans text-xs text-white/70 leading-relaxed">
                {selectedCourse.description}
              </p>
              <p className="font-sans text-xs text-white/70 leading-relaxed italic pt-1">
                "{selectedCourse.syllabusOverview}"
              </p>
            </div>

            {/* Assignments List */}
            <div className="space-y-3">
              <h4 className="font-sans font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#E9C349]" />
                Assignments & Grading
              </h4>
              <div className="space-y-2">
                {selectedCourse.assignments.map((asgn) => (
                  <div
                    key={asgn.id}
                    className="p-3.5 bg-white/5 rounded-xl flex items-center justify-between text-xs border border-white/5"
                  >
                    <div>
                      <p className="font-semibold text-white">{asgn.title}</p>
                      <p className="font-mono text-[10px] text-white/50">Due: {asgn.dueDate}</p>
                    </div>
                    {asgn.status === 'graded' ? (
                      <Badge variant="emerald">{asgn.grade}</Badge>
                    ) : (
                      <Button variant="primary" size="sm">Submit Task</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedCourse(null)}>
                Close Modal
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
