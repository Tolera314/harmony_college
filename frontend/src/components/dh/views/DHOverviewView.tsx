'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Users, BookOpen, GraduationCap, CheckSquare, TrendingUp, CalendarCheck } from 'lucide-react';
import { KPICard } from '../KPICard';
import { DHPageHeader } from '../DHPageHeader';
import { LineChart, BarChart, HorizontalBarChart, DonutChart } from '../DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DHNavTab, DHProfile } from '../../../types/department';
import {
  kpiData, enrollmentTrend, gpaByCourseTrend, attendanceTrend, facultyWorkload,
  courses, approvalRequests, notifications as allNotifs, faculty, students,
  dhProfile,
} from '../../../data/departmentData';

interface DHOverviewViewProps {
  profile: DHProfile;
  setActiveTab: (tab: DHNavTab) => void;
}

const standingColor: Record<string, string> = {
  Excellent: 'text-emerald-400', Good: 'text-white/80', Warning: 'text-amber-400', Probation: 'text-rose-400',
};

export const DHOverviewView: React.FC<DHOverviewViewProps> = ({ profile, setActiveTab }) => {
  const pending = approvalRequests.filter((a) => a.status === 'Pending');
  const unread  = allNotifs.filter((n) => !n.read);
  const atRisk  = students.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Critical');

  const enrollLine = enrollmentTrend.map((e) => ({ label: e.semester, value: e.count }));
  const gpaBar     = gpaByCourseTrend.map((g) => ({ label: g.course, value: g.avgGpa, color: '#E9C349' }));
  const attendLine = attendanceTrend.map((a) => ({ label: a.week, value: a.rate }));
  const workload   = facultyWorkload.map((w) => ({ label: w.facultyName, value: w.hours, max: w.maxHours }));

  const capacitySegments = [
    { label: '≥ 90% full', value: courses.filter((c) => c.registered / c.capacity >= 0.9).length, color: '#f87171' },
    { label: '70–89% full', value: courses.filter((c) => { const r = c.registered / c.capacity; return r >= 0.7 && r < 0.9; }).length, color: '#E9C349' },
    { label: '< 70% full', value: courses.filter((c) => c.registered / c.capacity < 0.7).length, color: '#34d399' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-8 pb-16">

      {/* Hero banner */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[200px]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E9C349]/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#E9C349]/6 rounded-full blur-3xl pointer-events-none" />
        </div>
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9C349]/10 border border-[#E9C349]/30 text-[11px] font-mono font-semibold text-[#E9C349] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" /> {profile.currentSemester} · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Welcome back, {profile.name.split(' ')[1]}.
            </h2>
            <p className="font-sans text-sm text-white/60 max-w-xl leading-relaxed">
              {profile.department} · {profile.college}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {pending.length > 0 && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('approvals')} icon={<CheckSquare className="w-4 h-4" />}>
                  {pending.length} Pending Approval{pending.length > 1 ? 's' : ''}
                </Button>
              )}
              {unread.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('notifications')}>
                  {unread.length} Unread Alerts
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('reports')}>
                View Reports
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center gap-2 shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#E9C349]/40 shadow-xl">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <p className="font-sans text-xs text-white/50 text-center">{profile.employeeId}</p>
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            label="Department Students" value={kpiData.totalStudents}
            icon={<GraduationCap className="w-5 h-5" />}
            trend="up" trendLabel="+12 vs last sem."
            sparkline={[198, 215, 230, 218, 248]}
            onClick={() => setActiveTab('students')}
          />
          <KPICard
            label="Faculty Members" value={kpiData.facultyCount}
            icon={<Users className="w-5 h-5" />}
            trend="neutral" trendLabel="1 on leave"
            sparkline={[9, 9, 10, 10, 10]}
            onClick={() => setActiveTab('faculty')}
          />
          <KPICard
            label="Active Courses" value={kpiData.activeCourses}
            icon={<BookOpen className="w-5 h-5" />}
            trend="up" trendLabel="Fall 2024 term"
            sparkline={[38, 40, 39, 41, 42]}
            onClick={() => setActiveTab('courses')}
          />
          <KPICard
            label="Pending Approvals" value={kpiData.pendingApprovals}
            icon={<CheckSquare className="w-5 h-5" />}
            trend={kpiData.pendingApprovals > 0 ? 'down' : 'neutral'}
            trendLabel="Action required"
            accent={kpiData.pendingApprovals > 0}
            sparkline={[0, 1, 3, 2, 2]}
            onClick={() => setActiveTab('approvals')}
          />
          <KPICard
            label="Average GPA" value={kpiData.avgGpa}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="down" trendLabel="−0.08 vs last sem."
            sparkline={[3.58, 3.62, 3.55, 3.50, 3.42]}
            onClick={() => setActiveTab('reports')}
          />
          <KPICard
            label="Attendance Rate" value={`${kpiData.avgAttendance}%`}
            icon={<CalendarCheck className="w-5 h-5" />}
            trend="neutral" trendLabel="Dept. average"
            sparkline={[94, 93, 91, 90, 91]}
            onClick={() => setActiveTab('attendance')}
          />
        </div>
      </section>

      {/* Analytics row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Trend */}
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Enrollment Trend</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Total students enrolled per semester</p>
            </div>
            <Badge variant="emerald">+5.1% this term</Badge>
          </div>
          <LineChart data={enrollLine} height={130} />
        </Card>

        {/* Capacity Utilization */}
        <Card hoverable={false} className="space-y-5">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Capacity Utilization</h3>
            <p className="font-sans text-xs text-white/40 mt-0.5">Current semester — {courses.filter(c=>c.status==='Active').length} active courses</p>
          </div>
          <DonutChart
            segments={capacitySegments}
            total={courses.filter(c=>c.status==='Active').length}
            centerLabel={`${courses.filter(c=>c.status==='Active').length}`}
          />
        </Card>
      </section>

      {/* Analytics row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPA by Course */}
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Average GPA by Course</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Fall 2024 semester</p>
            </div>
          </div>
          <BarChart data={gpaBar} height={150} />
        </Card>

        {/* Attendance Trend */}
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Weekly Attendance Trend</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Dept-wide average · Fall 2024</p>
            </div>
            <Badge variant="amber">Week 8</Badge>
          </div>
          <LineChart data={attendLine} color="#34d399" height={130} />
        </Card>
      </section>

      {/* Bottom row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faculty Workload */}
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Faculty Workload</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Weekly teaching hours vs maximum</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('faculty')}>View all</Button>
          </div>
          <HorizontalBarChart data={workload} />
        </Card>

        {/* At-Risk Students */}
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">At-Risk Students</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('students')}>View all</Button>
          </div>
          {atRisk.length === 0 ? (
            <p className="font-sans text-sm text-white/40 py-4 text-center">No at-risk students currently.</p>
          ) : (
            <div className="space-y-3">
              {atRisk.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/8">
                  <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs font-semibold text-white truncate">{s.name}</p>
                    <p className={`font-mono text-[10px] ${standingColor[s.standing]}`}>{s.standing} · {s.riskLevel} Risk</p>
                  </div>
                  <span className="font-mono text-xs text-white/50">{s.cgpa}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Recent activity */}
      <section>
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Recent Notifications</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('notifications')}>View all</Button>
          </div>
          <div className="space-y-2">
            {allNotifs.slice(0, 5).map((n) => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.read ? 'border-white/5 bg-transparent' : 'border-[#E9C349]/15 bg-[#E9C349]/5'}`}>
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-white/20' : n.type === 'alert' || n.type === 'warning' ? 'bg-amber-400' : 'bg-[#E9C349]'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-sans text-xs font-semibold ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                  <p className="font-sans text-xs text-white/40 truncate mt-0.5">{n.message}</p>
                </div>
                <p className="font-mono text-[10px] text-white/30 shrink-0 hidden sm:block">{n.timestamp.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

    </motion.div>
  );
};
