'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  GraduationCap, Users, Building2, BookOpen, DollarSign, AlertTriangle,
  TrendingUp, CalendarCheck, UserCheck, ArrowRight, Shield, RefreshCw,
} from 'lucide-react';
import { AdminNavTab } from '../../../types/admin';
import { KPICard } from '../../dh/KPICard';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SkeletonKPICard, SkeletonCard, ErrorState } from '../../ui/States';
import {
  adminDashboardApi, adminSystemApi,
  AdminDashboardStats, AdminSystemHealth, ROLE_DISPLAY,
} from '../../../lib/adminApi';
import { BarChart } from '../../dh/DHCharts';

// ─────────────────────────────────────────────────────────────────────────────

interface Props { setActiveTab: (tab: AdminNavTab) => void; }

const healthColor: Record<string, string> = {
  Healthy:  'bg-(--status-success)',
  Degraded: 'bg-(--status-warning)',
  Down:     'bg-(--status-danger)',
};

// ─────────────────────────────────────────────────────────────────────────────

export const AdminOverviewView: React.FC<Props> = ({ setActiveTab }) => {
  const [stats,   setStats]   = useState<AdminDashboardStats | null>(null);
  const [health,  setHealth]  = useState<AdminSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadData = () => {
    setLoading(true); setError('');
    Promise.all([
      adminDashboardApi.getStats(),
      adminSystemApi.health(),
    ])
      .then(([s, h]) => { setStats(s); setHealth(h); })
      .catch(e => setError(e.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // Users-by-role bar chart (real data)
  const roleBarData = stats
    ? Object.entries(stats.usersByRole)
        .filter(([, v]) => v > 0)
        .map(([role, count]) => ({
          label: ROLE_DISPLAY[role]?.split(' ')[0].slice(0, 7) ?? role.slice(0, 7),
          value: count,
          color: 'var(--brand-gold)',
        }))
    : [];

  if (error) {
    return (
      <ErrorState
        compact
        description={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      {/* ── Hero banner ── */}
      <section className="relative rounded-3xl overflow-hidden border border-(--border-default) shadow-2xl">
        <div className="absolute inset-0 bg-linear-to-br from-[#E9C349]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-[10px] font-mono font-semibold text-(--brand-gold) uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" /> System Admin · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-(--text-primary) leading-tight">
              Institutional Overview
            </h2>
            <p className="font-sans text-sm text-(--text-muted) max-w-xl">
              Harmony College Administration · Complete system authority
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" size="sm" icon={<Users className="w-3.5 h-3.5" />} onClick={() => setActiveTab('users')}>
                Manage Users
              </Button>
              <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => setActiveTab('audit_logs')}>
                Audit Logs
              </Button>
            </div>
          </div>

          {/* Real system health panel */}
          <div className="hidden lg:flex flex-col gap-1.5 shrink-0 min-w-[180px]">
            <div className="flex items-center justify-between mb-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">System Health</p>
              <button
                onClick={loadData}
                className="p-1 rounded hover:bg-(--hover-overlay) transition-colors"
                title="Refresh health"
              >
                <RefreshCw className="w-3 h-3 text-(--text-faint)" />
              </button>
            </div>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                  <div className="h-2.5 w-24 bg-(--hover-overlay) rounded" />
                  <div className="w-2 h-2 rounded-full bg-(--hover-overlay)" />
                </div>
              ))
            ) : health ? (
              health.services.map(s => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-xs text-(--text-secondary) truncate max-w-[120px]">
                    {s.name.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${healthColor[s.status] ?? 'bg-(--active-overlay)'}`} />
                    <span className="font-mono text-[10px] text-(--text-faint)">{s.responseTime}</span>
                  </div>
                </div>
              ))
            ) : null}
            {health && (
              <p className="font-mono text-[10px] text-(--text-faint) mt-1">
                API: {health.responseTimeMs}ms
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── KPI Row 1: auth/session stats ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonKPICard key={i} />)
          : stats
          ? <>
              <KPICard label="Total Users"     value={stats.totalUsers}                     icon={<Users className="w-4 h-4" />}         trend="neutral" trendLabel="All roles"     sparkline={[0,0,0,0,0,stats.totalUsers]}               onClick={() => setActiveTab('users')} />
              <KPICard label="Students"        value={stats.usersByRole['STUDENT'] ?? 0}    icon={<GraduationCap className="w-4 h-4" />}  trend="neutral" trendLabel="Enrolled"      sparkline={[0,0,0,0,0,stats.usersByRole['STUDENT']??0]} onClick={() => setActiveTab('students')} />
              <KPICard label="Active Sessions" value={stats.activeSessions}                 icon={<Shield className="w-4 h-4" />}         trend="neutral" trendLabel="Right now"     sparkline={[0,0,0,0,0,stats.activeSessions]} />
              <KPICard label="New Today"       value={stats.newUsersToday}                  icon={<UserCheck className="w-4 h-4" />}      trend="up"      trendLabel="Registrations" sparkline={[0,0,0,0,0,stats.newUsersToday]} accent onClick={() => setActiveTab('users')} />
              <KPICard label="Logins Today"    value={stats.loginSuccessToday}              icon={<CalendarCheck className="w-4 h-4" />}  trend="neutral" trendLabel="Successful"    sparkline={[0,0,0,0,0,stats.loginSuccessToday]} />
              <KPICard label="Failed Logins"   value={stats.loginFailedToday}               icon={<AlertTriangle className="w-4 h-4" />}  trend={stats.loginFailedToday > 0 ? 'down' : 'neutral'} trendLabel="Today" sparkline={[0,0,0,0,0,stats.loginFailedToday]} accent={stats.loginFailedToday > 5} />
            </>
          : null}
      </section>

      {/* ── KPI Row 2: role breakdown ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonKPICard key={i} />)
          : stats
          ? <>
              <KPICard label="Instructors"      value={stats.usersByRole['INSTRUCTOR'] ?? 0}      icon={<BookOpen className="w-4 h-4" />}    trend="neutral" trendLabel="" sparkline={[]} onClick={() => setActiveTab('faculty')} />
              <KPICard label="Registrars"       value={stats.usersByRole['REGISTRAR'] ?? 0}        icon={<ClipboardIcon />}                    trend="neutral" trendLabel="" sparkline={[]} />
              <KPICard label="Finance Officers" value={stats.usersByRole['FINANCE_OFFICER'] ?? 0}  icon={<DollarSign className="w-4 h-4" />}  trend="neutral" trendLabel="" sparkline={[]} onClick={() => setActiveTab('finance')} />
              <KPICard label="Dept. Heads"      value={stats.usersByRole['DEPARTMENT_HEAD'] ?? 0}  icon={<Building2 className="w-4 h-4" />}   trend="neutral" trendLabel="" sparkline={[]} onClick={() => setActiveTab('departments')} />
              <KPICard label="Admins"           value={(stats.usersByRole['ADMIN'] ?? 0) + (stats.usersByRole['SUPER_ADMIN'] ?? 0)} icon={<Shield className="w-4 h-4" />} trend="neutral" trendLabel="" sparkline={[]} />
              <KPICard label="New This Month"   value={stats.newUsersThisMonth}                   icon={<TrendingUp className="w-4 h-4" />}   trend="up" trendLabel="Registrations" sparkline={[0,0,0,0,0,stats.newUsersThisMonth]} accent onClick={() => setActiveTab('users')} />
            </>
          : null}
      </section>

      {/* ── Real system stats (from health check) ── */}
      {!loading && health && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'DB Active Sessions', value: health.stats.activeSessions,   color: 'text-(--status-success)' },
            { label: 'Total Users in DB',  value: health.stats.totalUsers,        color: 'text-(--brand-gold)' },
            { label: 'Active Students',    value: health.stats.activeStudents,    color: 'text-(--status-info)' },
            { label: 'Active Offerings',   value: health.stats.activeOfferings,   color: 'text-(--status-warning)' },
          ].map(k => (
            <div key={k.label} className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
              <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k.label}</p>
              <p className={`font-mono text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Charts + recent audit activity ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Users by Role</h3>
          {loading ? <SkeletonCard rows={3} /> : <BarChart data={roleBarData} height={130} />}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent Audit Activity</h3>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => setActiveTab('audit_logs')}>
              View all
            </Button>
          </div>
          {loading ? (
            <SkeletonCard rows={5} />
          ) : !stats?.recentAuditLogs?.length ? (
            <p className="text-sm text-(--text-faint) py-8 text-center">No audit events yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentAuditLogs.slice(0, 6).map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-(--hover-overlay) transition-colors">
                  <div className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-(--brand-gold)" />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs font-semibold text-(--text-primary)">
                      {entry.action} — <span className="text-(--text-muted)">{entry.user?.fullName ?? 'System'}</span>
                    </p>
                    {entry.user && (
                      <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">
                        {ROLE_DISPLAY[entry.user.role] ?? entry.user.role}
                      </p>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-(--text-faint) shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── Real service health detail (from /api/admin/system-health) ── */}
      {!loading && health && (
        <section>
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Service Status</h3>
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 text-xs font-sans text-(--text-faint) hover:text-(--text-secondary) transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {health.services.map(s => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthColor[s.status] ?? 'bg-(--active-overlay)'}`} />
                    <div className="min-w-0">
                      <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{s.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{s.detail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`font-mono text-xs font-bold ${
                      s.status === 'Healthy' ? 'text-(--status-success)' :
                      s.status === 'Degraded' ? 'text-(--status-warning)' : 'text-(--status-danger)'
                    }`}>{s.status}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">{s.responseTime}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-(--text-faint)">
              Last checked: {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
            </p>
          </Card>
        </section>
      )}
    </motion.div>
  );
};

function ClipboardIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
