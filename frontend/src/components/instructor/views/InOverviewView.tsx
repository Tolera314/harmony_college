'use client';

import React from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Users, ClipboardList, CalendarCheck, Clock, ArrowRight, QrCode, TrendingUp } from 'lucide-react';
import { InstructorNavTab, InstructorProfile } from '../../../types/instructor';
import { KPICard }       from '../../dh/KPICard';
import { DHPageHeader }  from '../../dh/DHPageHeader';
import { LineChart }     from '../../dh/DHCharts';
import { Card }          from '../../ui/Card';
import { Badge }         from '../../ui/Badge';
import { Button }        from '../../ui/Button';
import { EmptyState, SkeletonPage } from '../../ui/States';
import type { DashboardData } from '../../../lib/instructorApi';

interface InOverviewViewProps {
  profile:     InstructorProfile;
  dashData:    DashboardData | null;
  setActiveTab: (tab: InstructorNavTab) => void;
}

const attColor = (r: number) =>
  r >= 90 ? 'text-(--status-success)' : r >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)';

const lifecycleLabel = (lc: string | null) => {
  if (!lc || lc === 'NOT_STARTED') return null;
  if (lc === 'OPEN')      return { label: 'Active Now', variant: 'emerald' as const };
  if (lc === 'CLOSED')    return { label: 'Closed',     variant: 'glass'   as const };
  if (lc === 'FINALIZED') return { label: 'Finalized',  variant: 'glass'   as const };
  return null;
};

export const InOverviewView: React.FC<InOverviewViewProps> = ({ profile, dashData, setActiveTab }) => {
  if (!dashData) return <SkeletonPage />;

  const { kpis, todaySessions, attendanceTrend, notifications, instructor } = dashData;

  const hasActiveSession = todaySessions.some(s => s.attendanceSessionLifecycle === 'OPEN');
  const unreadCount      = notifications.filter(n => !n.isRead).length;

  const attendLine = (attendanceTrend.length > 0 ? attendanceTrend : [75, 78, 80, 82, 80, 85, 88, 90])
    .map((v, i) => ({ label: `Wk${i + 1}`, value: v }));

  const currentSemester = dashData.instructor.department?.name ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-7 pb-16"
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative rounded-3xl overflow-hidden border border-(--border-default) shadow-2xl min-h-[188px]">
        <div className="absolute inset-0 bg-linear-to-br from-[#E9C349]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-[11px] font-mono font-semibold text-(--brand-gold) uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" />
              {instructor.department.name} · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-(--text-primary) leading-tight">
              Welcome, {instructor.fullName.split(' ').pop()}.
            </h2>
            <p className="font-sans text-sm text-(--text-muted) max-w-lg">
              {instructor.specialization ?? instructor.title} · {instructor.department.name}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {hasActiveSession && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('attendance')} icon={<QrCode className="w-4 h-4" />}>
                  Live Attendance Session
                </Button>
              )}
              {kpis.ungradedSubmissions > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('assignments')}>
                  {kpis.ungradedSubmissions} Ungraded Submissions
                </Button>
              )}
              {unreadCount > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('notifications')}>
                  {unreadCount} Unread Alerts
                </Button>
              )}
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-(--accent-gold-border) shadow-xl bg-(--bg-card) flex items-center justify-center">
              <span className="font-serif font-bold text-3xl text-(--brand-gold)">
                {instructor.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Classes Today"
          value={kpis.classesToday}
          icon={<BookOpen className="w-5 h-5" />}
          trend="neutral"
          trendLabel={hasActiveSession ? '1 active now' : 'No active session'}
          sparkline={[2,2,3,2,2,3,2,2]}
          onClick={() => setActiveTab('my_classes')}
        />
        <KPICard
          label="Students Taught"
          value={kpis.studentsTaught}
          icon={<Users className="w-5 h-5" />}
          trend="neutral"
          trendLabel="Current semester"
          sparkline={[55,57,58,59,60,60]}
          onClick={() => setActiveTab('students')}
        />
        <KPICard
          label="Ungraded"
          value={kpis.ungradedSubmissions}
          icon={<ClipboardList className="w-5 h-5" />}
          trend={kpis.ungradedSubmissions > 0 ? 'down' : 'neutral'}
          trendLabel="Action needed"
          sparkline={[0,4,8,4,8,4]}
          accent={kpis.ungradedSubmissions > 0}
          onClick={() => setActiveTab('assignments')}
        />
        <KPICard
          label="Active Sessions"
          value={kpis.activeSessions}
          icon={<QrCode className="w-5 h-5" />}
          trend={kpis.activeSessions > 0 ? 'up' : 'neutral'}
          trendLabel={kpis.activeSessions > 0 ? 'QR Live' : 'None active'}
          sparkline={[0,0,1,0,1,0,1,1]}
          accent={kpis.activeSessions > 0}
          onClick={() => setActiveTab('attendance')}
        />
        <KPICard
          label="Upcoming"
          value={kpis.upcomingClasses}
          icon={<Clock className="w-5 h-5" />}
          trend="neutral"
          trendLabel="Today"
          sparkline={[1,2,1,2,1,2,1,1]}
          onClick={() => setActiveTab('my_classes')}
        />
        <KPICard
          label="My Courses"
          value={kpis.currentOfferings}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="neutral"
          trendLabel="Current semester"
          sparkline={[2,2,2,2,3,3,3,3]}
          onClick={() => setActiveTab('my_classes')}
        />
      </section>

      {/* ── Today's Schedule + Notifications ─────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Today&apos;s Schedule</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('my_classes')} icon={<ArrowRight className="w-4 h-4" />}>
              All classes
            </Button>
          </div>
          {todaySessions.length === 0 ? (
            <EmptyState
              variant="timetable"
              compact
              title="No classes today"
              description="Your schedule is clear for today."
            />
          ) : (
            <div className="space-y-3">
              {todaySessions.map(cls => {
                const badge   = lifecycleLabel(cls.attendanceSessionLifecycle);
                const isNow   = cls.attendanceSessionLifecycle === 'OPEN';
                return (
                  <div
                    key={cls.id}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      isNow
                        ? 'bg-[#E9C349]/8 border-(--accent-gold-border)'
                        : 'bg-(--hover-overlay) border-(--border-subtle)'
                    }`}
                  >
                    {isNow && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    <div className={`w-1 min-h-[48px] rounded-full shrink-0 ${isNow ? 'bg-[#E9C349]' : 'bg-(--active-overlay)'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-(--brand-gold)">{cls.courseCode}</span>
                        {badge && <Badge variant={badge.variant} className="text-[10px] py-0">{badge.label}</Badge>}
                      </div>
                      <p className="font-sans text-sm font-semibold text-(--text-primary) mt-0.5 truncate">{cls.courseName}</p>
                      <p className="font-sans text-xs text-(--text-muted) mt-0.5">
                        {cls.startTime}–{cls.endTime} · {cls.room}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('attendance')}>Attendance</Button>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('students')}>Roster</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent notifications */}
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent Alerts</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('notifications')}>View all</Button>
          </div>
          {notifications.length === 0 ? (
            <EmptyState variant="notifications" compact description="No notifications yet." />
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    !n.isRead
                      ? 'border-[#E9C349]/15 bg-[#E9C349]/4'
                      : 'border-(--border-subtle)'
                  }`}
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-[#E9C349]' : 'bg-(--active-overlay)'}`} />
                  <div className="min-w-0">
                    <p className={`font-sans text-xs font-semibold ${!n.isRead ? 'text-(--text-primary)' : 'text-(--text-secondary)'}`}>
                      {n.title}
                    </p>
                    <p className="font-sans text-xs text-(--text-faint) truncate mt-0.5">{n.message}</p>
                    <p className="font-mono text-[10px] text-(--text-faint) mt-1 opacity-50">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── Attendance Trend ─────────────────────────────────────────────── */}
      {attendanceTrend.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Trend</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-0.5">Recent session attendance rates</p>
              </div>
              <Badge variant="emerald">
                {attendanceTrend[attendanceTrend.length - 1]}%
              </Badge>
            </div>
            <LineChart data={attendLine} color="#34d399" height={120} />
          </Card>

          <Card hoverable={false} className="space-y-4 p-6">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Take Attendance',   tab: 'attendance'   as InstructorNavTab, color: 'var(--status-success)'  },
                { label: 'Enter Grades',      tab: 'grades'       as InstructorNavTab, color: 'var(--brand-gold)'     },
                { label: 'New Assignment',    tab: 'assignments'  as InstructorNavTab, color: 'var(--status-info)'    },
                { label: 'New Announcement',  tab: 'announcements' as InstructorNavTab, color: 'var(--status-warning)' },
                { label: 'My Classes',        tab: 'my_classes'   as InstructorNavTab, color: 'var(--brand-gold)'     },
                { label: 'Reports',           tab: 'reports'      as InstructorNavTab, color: 'var(--text-secondary)' },
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className="p-3 rounded-xl border border-(--border-default) bg-(--hover-overlay) hover:bg-(--active-overlay) transition-all text-left"
                >
                  <p className="font-sans text-xs font-semibold" style={{ color: item.color }}>
                    {item.label}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </section>
      )}
    </motion.div>
  );
};
