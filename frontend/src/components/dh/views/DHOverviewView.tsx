'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, BookOpen, GraduationCap, CheckSquare, TrendingUp, CalendarCheck, Loader2 } from 'lucide-react';
import { KPICard } from '../KPICard';
import { DHPageHeader } from '../DHPageHeader';
import { LineChart, BarChart } from '../DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DHNavTab } from '../../../types/department';
import { hodDashboardApi, type DashboardData, type HoDProfile } from '../../../lib/hodApi';
import { ErrorState, SkeletonKPICard } from '../../ui/States';

interface DHOverviewViewProps {
  profile: HoDProfile | null;
  setActiveTab: (tab: DHNavTab) => void;
}

export const DHOverviewView: React.FC<DHOverviewViewProps> = ({ profile, setActiveTab }) => {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await hodDashboardApi.get();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState variant="generic" title="Dashboard unavailable" description={error} onRetry={load} />;

  const dept = profile?.departmentHeadRecord?.department;
  const kpis = data?.kpis;
  const notifications = data?.notifications ?? [];
  const enrollTrend   = (data?.enrollmentTrend ?? []).map(e => ({ label: e.semester, value: e.count }));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-8 pb-16">

      {/* Hero banner */}
      <section className="relative rounded-3xl overflow-hidden border border-(--border-default) shadow-2xl min-h-[200px]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-linear-to-br from-(--accent-gold-subtle) via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-(--accent-gold-subtle) rounded-full blur-3xl pointer-events-none" />
        </div>
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-[11px] font-mono font-semibold text-(--brand-gold) uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" />
              {dept?.name ?? 'Department Head Portal'} · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-(--text-primary) leading-tight">
              Welcome back{profile ? `, ${profile.fullName.split(' ')[1] ?? profile.fullName}.` : '.'}
            </h2>
            <p className="font-sans text-sm text-(--text-secondary) max-w-xl leading-relaxed">
              {profile?.departmentHeadRecord?.title ?? 'Department Head'} · {dept?.name ?? ''}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {(kpis?.pendingOfferings ?? 0) > 0 && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('approvals')} icon={<CheckSquare className="w-4 h-4" />}>
                  {kpis!.pendingOfferings} Pending Approval{kpis!.pendingOfferings > 1 ? 's' : ''}
                </Button>
              )}
              {(data?.unreadNotifications ?? 0) > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('notifications')}>
                  {data!.unreadNotifications} Unread Alert{data!.unreadNotifications > 1 ? 's' : ''}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('reports')}>
                View Reports
              </Button>
            </div>
          </div>
          {profile && (
            <div className="hidden lg:flex flex-col items-center gap-2 shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-(--accent-gold-border) shadow-xl bg-(--hover-overlay) flex items-center justify-center">
                <span className="font-serif font-bold text-3xl text-(--brand-gold)">
                  {profile.fullName.charAt(0)}
                </span>
              </div>
              <p className="font-sans text-xs text-(--text-muted) text-center">{profile.departmentHeadRecord?.employeeId}</p>
            </div>
          )}
        </div>
      </section>

      {/* KPI Grid */}
      <section>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonKPICard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              label="Active Students"     value={kpis?.activeStudents ?? 0}
              icon={<GraduationCap className="w-5 h-5" />}
              trend="neutral" trendLabel="In department"
              sparkline={enrollTrend.map(e => e.value)}
              onClick={() => setActiveTab('students')}
            />
            <KPICard
              label="Faculty Members"     value={kpis?.activeFaculty ?? 0}
              icon={<Users className="w-5 h-5" />}
              trend="neutral" trendLabel="Active faculty"
              onClick={() => setActiveTab('faculty')}
            />
            <KPICard
              label="Active Offerings"    value={kpis?.activeOfferings ?? 0}
              icon={<BookOpen className="w-5 h-5" />}
              trend="up" trendLabel="Current semester"
              onClick={() => setActiveTab('courses')}
            />
            <KPICard
              label="Pending Approvals"   value={kpis?.pendingOfferings ?? 0}
              icon={<CheckSquare className="w-5 h-5" />}
              trend={(kpis?.pendingOfferings ?? 0) > 0 ? 'down' : 'neutral'}
              trendLabel="Action required"
              accent={(kpis?.pendingOfferings ?? 0) > 0}
              onClick={() => setActiveTab('approvals')}
            />
            <KPICard
              label="Average GPA"         value={kpis?.avgGpa ?? 0}
              icon={<TrendingUp className="w-5 h-5" />}
              trend="neutral" trendLabel="Department avg."
              onClick={() => setActiveTab('reports')}
            />
            <KPICard
              label="Attendance Rate"     value={kpis ? `${kpis.attendanceRate}%` : '—'}
              icon={<CalendarCheck className="w-5 h-5" />}
              trend="neutral" trendLabel="Dept. average"
              onClick={() => setActiveTab('attendance')}
            />
          </div>
        )}
      </section>

      {/* Charts row */}
      {!loading && data && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment Trend</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-0.5">Students enrolled per semester</p>
              </div>
              {enrollTrend.length > 1 && (
                <Badge variant={enrollTrend[enrollTrend.length - 1].value >= enrollTrend[enrollTrend.length - 2].value ? 'emerald' : 'amber'}>
                  {enrollTrend[enrollTrend.length - 1].value} this term
                </Badge>
              )}
            </div>
            {enrollTrend.length > 0
              ? <LineChart data={enrollTrend} height={130} />
              : <p className="font-sans text-sm text-(--text-faint) text-center py-8">No enrollment trend data yet.</p>
            }
          </Card>

          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Capacity Overview</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-0.5">Current semester utilization</p>
              </div>
              <Badge variant={
                (kpis?.capacityUtilization ?? 0) >= 90 ? 'rose' :
                (kpis?.capacityUtilization ?? 0) >= 70 ? 'amber' : 'emerald'
              }>
                {kpis?.capacityUtilization ?? 0}% utilized
              </Badge>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Active Offerings',  value: kpis?.activeOfferings  ?? 0, color: 'var(--status-success)' },
                  { label: 'Pending Approval',  value: kpis?.pendingOfferings ?? 0, color: 'var(--brand-gold)' },
                  { label: 'Leave Requests',    value: kpis?.pendingLeaves    ?? 0, color: 'var(--status-warning)' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 text-xs font-sans">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-(--text-secondary) flex-1">{item.label}</span>
                    <span className="font-mono font-bold text-(--text-primary)">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${kpis?.capacityUtilization ?? 0}%`,
                    backgroundColor: (kpis?.capacityUtilization ?? 0) >= 90
                      ? 'var(--status-danger)' : (kpis?.capacityUtilization ?? 0) >= 70
                      ? 'var(--brand-gold)' : 'var(--status-success)',
                  }}
                />
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Recent notifications */}
      <section>
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent Notifications</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('notifications')}>View all</Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-(--text-faint)" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="font-sans text-sm text-(--text-faint) text-center py-6">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.isRead ? 'border-(--border-subtle) bg-transparent' : 'border-[#E9C349]/15 bg-[#E9C349]/5'}`}>
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-(--active-overlay)' : n.type === 'WARNING' || n.type === 'ERROR' ? 'bg-(--status-warning)' : 'bg-[#E9C349]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-sans text-xs font-semibold ${n.isRead ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                    <p className="font-sans text-xs text-(--text-faint) truncate mt-0.5">{n.message}</p>
                  </div>
                  <p className="font-mono text-[10px] text-(--text-faint) shrink-0 hidden sm:block">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

    </motion.div>
  );
};
