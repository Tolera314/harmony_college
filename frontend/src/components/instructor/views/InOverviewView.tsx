'use client';

import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Users, ClipboardList, CalendarCheck, Clock, TrendingUp, ArrowRight, QrCode } from 'lucide-react';
import { InstructorNavTab, InstructorProfile } from '../../../types/instructor';
import { KPICard } from '../../dh/KPICard';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { LineChart, BarChart } from '../../dh/DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  instructorKPIs, todaySchedule, attendanceSessions, announcements,
  instructorNotifications, gradeEntries, assessments, attendanceSparkline, gradeSparkline,
} from '../../../data/instructorData';
import { courses, students, classrooms } from '../../../data/departmentData';

interface InOverviewViewProps {
  profile: InstructorProfile;
  setActiveTab: (tab: InstructorNavTab) => void;
}

const attColor = (r: number) => r >= 90 ? 'text-emerald-400' : r >= 80 ? 'text-[#E9C349]' : 'text-rose-400';

export const InOverviewView: React.FC<InOverviewViewProps> = ({ profile, setActiveTab }) => {
  const myCourses = courses.filter(c => c.facultyId === 'f01');
  const activeSession = attendanceSessions.find(s => s.isActive);
  const unread = instructorNotifications.filter(n => !n.read);
  const pending = gradeEntries.filter(g => g.status === 'Pending');
  const pinnedAnnouncement = announcements.find(a => a.isPinned);

  const attendLine = attendanceSparkline.map((v, i) => ({ label: `Wk${i + 1}`, value: v }));
  const gradeBar = assessments
    .filter(a => a.courseId === 'c01' && a.status === 'Published')
    .map(a => {
      const entries = gradeEntries.filter(g => g.assessmentId === a.id && g.score !== null);
      const avg = entries.length ? Math.round(entries.reduce((s, g) => s + (g.score ?? 0), 0) / entries.length) : 0;
      return { label: a.type.slice(0, 4), value: avg, color: '#E9C349' };
    });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-7 pb-16">

      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[188px]">
        <div className="absolute inset-0 bg-linear-to-br from-[#E9C349]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9C349]/10 border border-[#E9C349]/30 text-[11px] font-mono font-semibold text-[#E9C349] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" /> {profile.currentSemester} · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Good morning, {profile.name.split(' ')[2]}.
            </h2>
            <p className="font-sans text-sm text-white/55 max-w-lg">
              {profile.specialization} · {profile.department}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeSession && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('attendance')} icon={<QrCode className="w-4 h-4" />}>
                  Live Attendance Session
                </Button>
              )}
              {pending.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('grades')}>
                  {pending.length} Grades to Submit
                </Button>
              )}
              {unread.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('notifications')}>
                  {unread.length} Unread Alerts
                </Button>
              )}
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-[#E9C349]/40 shadow-xl w-20 h-20">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Classes Today" value={instructorKPIs.classesToday} icon={<BookOpen className="w-5 h-5" />} trend="neutral" trendLabel={`${todaySchedule.find(s => s.isNow) ? '1 active now' : 'Next at 14:00'}`} sparkline={[2,2,3,2,2,3,2,2]} onClick={() => setActiveTab('my_classes')} />
        <KPICard label="Students Taught" value={instructorKPIs.studentsTaught} icon={<Users className="w-5 h-5" />} trend="up" trendLabel="+2 this week" sparkline={[58, 59, 60, 61, 61, 61]} onClick={() => setActiveTab('students')} />
        <KPICard label="Pending Grades" value={instructorKPIs.pendingGrades} icon={<ClipboardList className="w-5 h-5" />} trend={instructorKPIs.pendingGrades > 0 ? 'down' : 'neutral'} trendLabel="Action needed" sparkline={[0, 4, 8, 4, 8, 4]} accent={instructorKPIs.pendingGrades > 0} onClick={() => setActiveTab('grades')} />
        <KPICard label="Active Sessions" value={instructorKPIs.activeSessions} icon={<QrCode className="w-5 h-5" />} trend={instructorKPIs.activeSessions > 0 ? 'up' : 'neutral'} trendLabel={activeSession ? 'QR Live' : 'None active'} sparkline={[0,0,1,0,1,0,1,1]} accent={instructorKPIs.activeSessions > 0} onClick={() => setActiveTab('attendance')} />
        <KPICard label="Upcoming Classes" value={instructorKPIs.upcomingClasses} icon={<Clock className="w-5 h-5" />} trend="neutral" trendLabel="Today" sparkline={[1,2,1,2,1,2,1,1]} onClick={() => setActiveTab('my_classes')} />
        <KPICard label="Avg Attendance" value={`${instructorKPIs.avgAttendance}%`} icon={<CalendarCheck className="w-5 h-5" />} trend="neutral" trendLabel="Both courses" sparkline={attendanceSparkline} onClick={() => setActiveTab('attendance')} />
      </section>

      {/* Today's schedule + quick attendance */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Today&apos;s Schedule</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('my_classes')} icon={<ArrowRight className="w-4 h-4" />}>All classes</Button>
          </div>
          <div className="space-y-3">
            {todaySchedule.map(cls => {
              const course = courses.find(c => c.id === cls.courseId);
              const room = classrooms.find(r => r.name === cls.room);
              return (
                <div key={cls.courseId} className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${cls.isNow ? 'bg-[#E9C349]/8 border-[#E9C349]/25' : 'bg-white/5 border-white/8'}`}>
                  {cls.isNow && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  <div className={`w-1 h-full min-h-[48px] rounded-full shrink-0 ${cls.isNow ? 'bg-[#E9C349]' : 'bg-white/20'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#E9C349]">{course?.code}</span>
                      {cls.isNow && <Badge variant="emerald" className="text-[10px] py-0">Active Now</Badge>}
                      {cls.isNext && <Badge variant="glass" className="text-[10px] py-0">Up Next</Badge>}
                    </div>
                    <p className="font-sans text-sm font-semibold text-white mt-0.5 truncate">{course?.title}</p>
                    <p className="font-sans text-xs text-white/50 mt-0.5">{cls.startTime}–{cls.endTime} · {cls.room} · {cls.duration}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => setActiveTab('attendance')}>Attendance</Button>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('students')}>Students</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick stats */}
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Course Summary</h3>
          <div className="space-y-3">
            {myCourses.map(c => {
              const enrolled = c.registered;
              const capPct = Math.round((enrolled / c.capacity) * 100);
              const myStudents = students.filter(s => s.enrolledCourseIds.includes(c.id));
              const avgAtt = myStudents.length ? Math.round(myStudents.reduce((s, x) => s + x.attendanceRate, 0) / myStudents.length) : 0;
              return (
                <div key={c.id} className="p-3.5 bg-white/5 border border-white/8 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#E9C349]">{c.code}</span>
                    <Badge variant="glass" className="text-[10px]">{enrolled} students</Badge>
                  </div>
                  <p className="font-sans text-xs text-white/70 truncate mb-2">{c.title}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40 mb-1">
                    <span>Capacity</span><span className={attColor(capPct)}>{capPct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full bg-[#E9C349]" style={{ width: `${capPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>Avg attendance</span>
                    <span className={attColor(avgAtt)}>{avgAtt}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Attendance Trend</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Weekly dept-wide average</p>
            </div>
            <Badge variant="emerald">{attendanceSparkline[attendanceSparkline.length - 1]}% wk 8</Badge>
          </div>
          <LineChart data={attendLine} color="#34d399" height={120} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">FILM402 Average Scores</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Published assessments</p>
            </div>
          </div>
          {gradeBar.length > 0 ? <BarChart data={gradeBar} height={120} /> : (
            <div className="h-30 flex items-center justify-center text-white/30 text-sm">No published grades yet.</div>
          )}
        </Card>
      </section>

      {/* Announcements + Recent notifications */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Pinned Announcement</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('announcements')}>View all</Button>
          </div>
          {pinnedAnnouncement ? (
            <div className="p-4 bg-[#E9C349]/8 border border-[#E9C349]/20 rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <Badge variant="gold" className="text-[10px] shrink-0">Pinned</Badge>
                <Badge variant="glass" className="text-[10px]">{pinnedAnnouncement.audience}</Badge>
              </div>
              <p className="font-serif text-sm font-bold text-white">{pinnedAnnouncement.title}</p>
              <p className="font-sans text-xs text-white/55 mt-1.5 leading-relaxed line-clamp-3">{pinnedAnnouncement.body}</p>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-white/35">
                <span>{pinnedAnnouncement.publishedAt}</span>
                <span>·</span>
                <span>{pinnedAnnouncement.views} views</span>
              </div>
            </div>
          ) : <p className="text-sm text-white/30">No pinned announcements.</p>}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Recent Alerts</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('notifications')}>View all</Button>
          </div>
          <div className="space-y-2">
            {instructorNotifications.slice(0, 4).map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.read ? 'border-white/5' : 'border-[#E9C349]/15 bg-[#E9C349]/4'}`}>
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-white/20' : 'bg-[#E9C349]'}`} />
                <div className="min-w-0">
                  <p className={`font-sans text-xs font-semibold ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                  <p className="font-sans text-xs text-white/40 truncate mt-0.5">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </motion.div>
  );
};
