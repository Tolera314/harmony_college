'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, CalendarCheck, TrendingUp, Banknote, UserPlus, AlertTriangle, ArrowRight } from 'lucide-react';
import { HRNavTab } from '../../../types/hr';
import { KPICard } from '../../dh/KPICard';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { BarChart, DonutChart } from '../../dh/DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SkeletonPage, ErrorState } from '../../ui/States';
import {
  hrDashboardApi, type HRDashboardData,
  EMPLOYMENT_TYPE_LABEL, EMPLOYEE_STATUS_LABEL, LEAVE_TYPE_LABEL,
  PAYROLL_STAGE_LABEL,
} from '../../../lib/hrApi';

interface HROverviewViewProps {
  setActiveTab: (tab: HRNavTab) => void;
}

export const HROverviewView: React.FC<HROverviewViewProps> = ({ setActiveTab }) => {
  const [data, setData]       = useState<HRDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await hrDashboardApi.get()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonPage />;
  if (error || !data) return <ErrorState variant="network" onRetry={load} description={error ?? 'Could not load HR dashboard'} />;

  const { kpis, currentPayroll, departmentBreakdown, employmentTypeBreakdown, statusBreakdown,
          pendingLeaveRequests, expiringContractList, recentAudit, sparklines } = data;

  const deptBar = departmentBreakdown.map(d => ({
    label: d.name.split(' ')[0].slice(0, 6),
    value: d.employeeCount,
    color: 'var(--brand-gold)',
  }));

  const statusSegs = statusBreakdown.map(s => ({
    label: EMPLOYEE_STATUS_LABEL[s.status] ?? s.status,
    value: s.count,
    color: s.status === 'ACTIVE' ? 'var(--status-success)'
         : s.status === 'ON_LEAVE' ? 'var(--brand-gold)'
         : s.status === 'TERMINATED' ? 'var(--status-danger)'
         : 'var(--text-faint)',
  }));

  const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
    FULL_TIME: 'var(--status-success)',
    PART_TIME: 'var(--brand-gold)',
    CONTRACT:  'var(--status-info)',
    INTERN:    'var(--text-faint)',
  };
  const employmentTypeSegs = employmentTypeBreakdown.map(t => ({
    label: EMPLOYMENT_TYPE_LABEL[t.type] ?? t.type,
    value: t.count,
    color: EMPLOYMENT_TYPE_COLORS[t.type] ?? 'var(--text-faint)',
  }));
  const totalEmpsByType = employmentTypeBreakdown.reduce((a, t) => a + t.count, 0);

  const totalEmps = statusBreakdown.reduce((a, s) => a + s.count, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-7 pb-16">

      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-(--border-default) shadow-2xl min-h-[180px]">
        <div className="absolute inset-0 bg-linear-to-br from-[#E9C349]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-[11px] font-mono font-semibold text-(--brand-gold) uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" /> Harmony College HRIS · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-(--text-primary)">HR Officer Dashboard</h2>
            <p className="font-sans text-sm text-(--text-muted)">Human Resources · Academic Year 2024–2025</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {kpis.pendingLeaveRequests > 0 && (
                <Button variant="primary" size="sm" icon={<CalendarCheck className="w-4 h-4" />} onClick={() => setActiveTab('leave')}>
                  {kpis.pendingLeaveRequests} Pending Leave
                </Button>
              )}
              {currentPayroll?.stage === 'PENDING_HR_APPROVAL' && (
                <Button variant="outline" size="sm" icon={<Banknote className="w-4 h-4" />} onClick={() => setActiveTab('payroll')}>
                  Payroll Awaiting Approval
                </Button>
              )}
              {kpis.expiringContracts > 0 && (
                <Button variant="secondary" size="sm" icon={<AlertTriangle className="w-4 h-4" />} onClick={() => setActiveTab('employees')}>
                  {kpis.expiringContracts} Expiring Contracts
                </Button>
              )}
            </div>
          </div>
          {currentPayroll && (
            <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
              <div className="p-3 bg-(--hover-overlay) border border-(--border-default) rounded-2xl text-right">
                <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Payroll Stage</p>
                <p className="font-mono text-sm font-bold text-(--brand-gold) mt-0.5">{PAYROLL_STAGE_LABEL[currentPayroll.stage] ?? currentPayroll.stage}</p>
                <p className="font-mono text-xs text-(--text-faint) mt-0.5">{currentPayroll.month} {currentPayroll.year}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Active Employees"     value={kpis.activeEmployees}        icon={<Users className="w-5 h-5" />}           trend="up"     trendLabel="+1 this month"   sparkline={sparklines.activeEmployees}      onClick={() => setActiveTab('employees')} />
        <KPICard label="Pending Leave"        value={kpis.pendingLeaveRequests}   icon={<CalendarCheck className="w-5 h-5" />}   trend="down"   trendLabel="Needs action"    sparkline={sparklines.pendingLeave}          accent={kpis.pendingLeaveRequests > 0} onClick={() => setActiveTab('leave')} />
        <KPICard label="Reviews Due"          value={kpis.reviewsDue}             icon={<TrendingUp className="w-5 h-5" />}      trend="down"   trendLabel="Action required" sparkline={sparklines.reviewsDue}            onClick={() => setActiveTab('performance')} />
        <KPICard label="Upcoming Payroll"     value={currentPayroll ? `${currentPayroll.month} ${currentPayroll.year}` : '—'} icon={<Banknote className="w-5 h-5" />} trend="neutral" trendLabel={currentPayroll ? (PAYROLL_STAGE_LABEL[currentPayroll.stage] ?? currentPayroll.stage) : '—'} sparkline={sparklines.payrollNet} accent={currentPayroll?.stage === 'PENDING_HR_APPROVAL'} onClick={() => setActiveTab('payroll')} />
        <KPICard label="New Hires This Month" value={kpis.newHiresThisMonth}      icon={<UserPlus className="w-5 h-5" />}        trend="up"     trendLabel="Since this month" sparkline={sparklines.newHires}             onClick={() => setActiveTab('onboarding')} />
        <KPICard label="Expiring Contracts"   value={kpis.expiringContracts}      icon={<AlertTriangle className="w-5 h-5" />}   trend={kpis.expiringContracts > 0 ? 'down' : 'neutral'} trendLabel="Renewal needed" sparkline={sparklines.expiringContracts} onClick={() => setActiveTab('employees')} />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Department Headcount</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Active employees per department</p>
            </div>
            <Badge variant="glass">{kpis.activeEmployees} total</Badge>
          </div>
          <BarChart data={deptBar} height={140} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Employee Status</h3>
          <DonutChart segments={statusSegs} total={totalEmps} centerLabel={String(totalEmps)} />
        </Card>
      </section>

      {/* Employment type breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Employment Type</h3>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">Breakdown by contract type</p>
          </div>
          <DonutChart segments={employmentTypeSegs} total={totalEmpsByType} centerLabel={String(totalEmpsByType)} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
            {employmentTypeSegs.map(seg => (
              <div key={seg.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="font-sans text-xs text-(--text-secondary) truncate">{seg.label}</span>
                <span className="font-mono text-xs text-(--text-faint) ml-auto">{seg.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card hoverable={false} className="lg:col-span-2 space-y-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Department Budget Overview</h3>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">Allocated budget per department (ETB)</p>
          </div>
          <div className="space-y-2.5">
            {departmentBreakdown
              .filter(d => d.budget > 0)
              .sort((a, b) => b.budget - a.budget)
              .map(d => {
                const maxBudget = Math.max(...departmentBreakdown.map(x => x.budget), 1);
                const pct = Math.round((d.budget / maxBudget) * 100);
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs text-(--text-secondary) truncate max-w-[55%]">{d.name}</span>
                      <span className="font-mono text-xs text-(--text-faint)">
                        {d.budget >= 1_000_000
                          ? `${(d.budget / 1_000_000).toFixed(1)}M`
                          : `${(d.budget / 1_000).toFixed(0)}K`} ETB
                        <span className="text-(--text-faint) ml-1.5">· {d.employeeCount} staff</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-(--border-default) overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: 'var(--brand-gold)' }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </section>

      {/* Pending leave + Contract alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Pending Leave Requests</h3>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => setActiveTab('leave')}>View all</Button>
          </div>
          {pendingLeaveRequests.length === 0 ? (
            <p className="text-sm text-(--text-faint) text-center py-6">No pending leave requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingLeaveRequests.slice(0, 4).map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={req.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-(--border-default) shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{req.employee?.fullName}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{LEAVE_TYPE_LABEL[req.leaveType]} · {req.daysCount}d · {new Date(req.startDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="amber">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Contract Alerts</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('employees')}>View all</Button>
          </div>
          <div className="space-y-2">
            {expiringContractList.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl">
                <div className="flex items-center gap-3">
                  <img src={emp.avatarUrl ?? '/tigist.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-(--border-default) shrink-0" />
                  <div>
                    <p className="font-sans text-xs font-semibold text-(--text-primary)">{emp.fullName}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">Expires {emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <Badge variant="amber">Expiring Soon</Badge>
              </div>
            ))}
            {expiringContractList.length === 0 && <p className="text-sm text-(--text-faint) text-center py-6">No expiring contracts.</p>}
          </div>
        </Card>
      </section>

      {/* Recent activity */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent HR Activity</h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('audit_log')}>View log</Button>
        </div>
        <div className="space-y-2">
          {recentAudit.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-(--hover-overlay) transition-colors">
              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.status === 'SUCCESS' ? 'bg-(--status-success)' : entry.status === 'WARNING' ? 'bg-(--status-warning)' : 'bg-(--status-danger)'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs font-semibold text-(--text-primary)">{entry.action} — <span className="text-(--text-secondary)">{entry.employeeName}</span></p>
                <p className="font-sans text-xs text-(--text-faint) truncate mt-0.5">{entry.description}</p>
              </div>
              <p className="font-mono text-[10px] text-(--text-faint) shrink-0 hidden sm:block">{new Date(entry.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
