'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Users, CalendarCheck, TrendingUp, Banknote, UserPlus, AlertTriangle, ArrowRight } from 'lucide-react';
import { HRNavTab } from '../../../types/hr';
import { KPICard } from '../../dh/KPICard';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { LineChart, BarChart, DonutChart } from '../../dh/DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  hrKPIs, employees, departments, leaveRequests,
  payrollRecords, performanceReviews, hrNotifications, hrAuditLog,
} from '../../../data/hrData';

interface HROverviewViewProps {
  setActiveTab: (tab: HRNavTab) => void;
}

const statusColor: Record<string, string> = {
  Active: 'text-emerald-400', 'On Leave': 'text-amber-400',
  Terminated: 'text-rose-400', Inactive: 'text-white/40',
};

export const HROverviewView: React.FC<HROverviewViewProps> = ({ setActiveTab }) => {
  const pendingLeave = leaveRequests.filter(l => l.status === 'Pending');
  const unread = hrNotifications.filter(n => !n.read);
  const expiringContracts = employees.filter(e => e.contractStatus === 'Expiring Soon');
  const currentPayroll = payrollRecords[0];

  // Chart data
  const deptBar = departments.map(d => ({ label: d.name.split(' ')[0], value: d.employeeCount, color: '#E9C349' }));
  const hiresByMonth = [
    { label: 'Feb', value: 1 }, { label: 'Mar', value: 0 }, { label: 'Apr', value: 0 },
    { label: 'May', value: 1 }, { label: 'Jun', value: 0 }, { label: 'Jul', value: 0 },
  ];
  const statusSegs = [
    { label: 'Active',   value: employees.filter(e => e.status === 'Active').length,     color: '#34d399' },
    { label: 'On Leave', value: employees.filter(e => e.status === 'On Leave').length,   color: '#E9C349' },
    { label: 'Terminated', value: employees.filter(e => e.status === 'Terminated').length, color: '#f87171' },
  ];
  const leaveTypeSpark = [4, 6, 5, 8, 7, 9, 12];
  const payrollSpark  = [5.6, 5.7, 5.7, 5.8, 5.8];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-7 pb-16">

      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[180px]">
        <div className="absolute inset-0 bg-linear-to-br from-[#E9C349]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9C349]/10 border border-[#E9C349]/30 text-[11px] font-mono font-semibold text-[#E9C349] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" /> Harmony College HRIS · Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              HR Officer Dashboard
            </h2>
            <p className="font-sans text-sm text-white/55 max-w-lg">Human Resources · Academic Year 2024–2025</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {pendingLeave.length > 0 && (
                <Button variant="primary" size="sm" icon={<CalendarCheck className="w-4 h-4" />} onClick={() => setActiveTab('leave')}>
                  {pendingLeave.length} Pending Leave
                </Button>
              )}
              {currentPayroll.stage === 'Pending HR Approval' && (
                <Button variant="outline" size="sm" icon={<Banknote className="w-4 h-4" />} onClick={() => setActiveTab('payroll')}>
                  Payroll Awaiting Approval
                </Button>
              )}
              {expiringContracts.length > 0 && (
                <Button variant="secondary" size="sm" icon={<AlertTriangle className="w-4 h-4" />} onClick={() => setActiveTab('employees')}>
                  {expiringContracts.length} Expiring Contracts
                </Button>
              )}
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-right">
              <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">Payroll Stage</p>
              <p className="font-mono text-sm font-bold text-[#E9C349] mt-0.5">{currentPayroll.stage}</p>
              <p className="font-mono text-xs text-white/40 mt-0.5">{currentPayroll.month} {currentPayroll.year}</p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Active Employees"       value={hrKPIs.activeEmployees}        icon={<Users className="w-5 h-5" />}        trend="up"     trendLabel="+1 this month"   sparkline={[120,122,124,126,126,128]}  onClick={() => setActiveTab('employees')} />
        <KPICard label="Pending Leave"          value={hrKPIs.pendingLeaveRequests}   icon={<CalendarCheck className="w-5 h-5" />} trend="down"  trendLabel="Needs action"    sparkline={leaveTypeSpark}             accent={hrKPIs.pendingLeaveRequests > 0} onClick={() => setActiveTab('leave')} />
        <KPICard label="Reviews Due"            value={hrKPIs.performanceReviewsDue}  icon={<TrendingUp className="w-5 h-5" />}   trend="down"  trendLabel="Action required" sparkline={[2,3,4,5,6,8]}             onClick={() => setActiveTab('performance')} />
        <KPICard label="Upcoming Payroll"       value={`${currentPayroll.month} ${currentPayroll.year}`} icon={<Banknote className="w-5 h-5" />} trend="neutral" trendLabel={currentPayroll.stage} sparkline={payrollSpark} accent={currentPayroll.stage === 'Pending HR Approval'} onClick={() => setActiveTab('payroll')} />
        <KPICard label="New Hires This Month"   value={hrKPIs.newEmployeesThisMonth}  icon={<UserPlus className="w-5 h-5" />}     trend="up"     trendLabel="Since May 2024"  sparkline={[0,1,0,0,1,0]}             onClick={() => setActiveTab('onboarding')} />
        <KPICard label="Expiring Contracts"     value={hrKPIs.expiringContracts}      icon={<AlertTriangle className="w-5 h-5" />} trend={hrKPIs.expiringContracts > 0 ? 'down' : 'neutral'} trendLabel="Renewal needed" sparkline={[0,0,1,1,2,2]} onClick={() => setActiveTab('employees')} />
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Department Headcount</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Active employees per department</p>
            </div>
            <Badge variant="glass">{employees.filter(e => e.status === 'Active').length} total</Badge>
          </div>
          <BarChart data={deptBar} height={140} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Employee Status</h3>
          <DonutChart segments={statusSegs} total={employees.length} centerLabel={String(employees.length)} />
        </Card>
      </section>

      {/* Pending leave + Contract alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Pending Leave Requests</h3>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => setActiveTab('leave')}>View all</Button>
          </div>
          {pendingLeave.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">No pending leave requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingLeave.slice(0, 4).map(req => {
                const emp = employees.find(e => e.id === req.employeeId);
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/8 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={emp?.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-sans text-xs font-semibold text-white truncate">{emp?.name}</p>
                        <p className="font-mono text-[10px] text-white/40">{req.type} · {req.days}d · {req.startDate}</p>
                      </div>
                    </div>
                    <Badge variant="amber">Pending</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Contract Alerts</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('employees')}>View all</Button>
          </div>
          <div className="space-y-2">
            {expiringContracts.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                  <div>
                    <p className="font-sans text-xs font-semibold text-white">{emp.name}</p>
                    <p className="font-mono text-[10px] text-white/40">Expires {emp.contractEndDate}</p>
                  </div>
                </div>
                <Badge variant="amber">Expiring Soon</Badge>
              </div>
            ))}
            {expiringContracts.length === 0 && <p className="text-sm text-white/30 text-center py-6">No expiring contracts.</p>}
          </div>
        </Card>
      </section>

      {/* Recent activity */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">Recent HR Activity</h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('audit_log')}>View log</Button>
        </div>
        <div className="space-y-2">
          {hrAuditLog.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.status === 'Success' ? 'bg-emerald-400' : entry.status === 'Warning' ? 'bg-amber-400' : 'bg-rose-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs font-semibold text-white">{entry.action} — <span className="text-white/60">{entry.employee}</span></p>
                <p className="font-sans text-xs text-white/40 truncate mt-0.5">{entry.description}</p>
              </div>
              <p className="font-mono text-[10px] text-white/30 shrink-0 hidden sm:block">{entry.date.split(' ')[0]}</p>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
