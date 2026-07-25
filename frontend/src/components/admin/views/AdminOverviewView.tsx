'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap, Users, Building2, BookOpen, DollarSign, AlertTriangle,
  TrendingUp, CalendarCheck, UserCheck, ArrowRight, Shield, HardDrive,
} from 'lucide-react';
import { AdminNavTab } from '../../../types/admin';
import { KPICard } from '../../dh/KPICard';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { LineChart, BarChart, DonutChart } from '../../dh/DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { adminKPIs, adminNotifications, adminAuditLog, systemHealth, admissions, payments, gateways } from '../../../data/adminData2';
import { programs, adminStudents, systemUsers } from '../../../data/adminData';
import { departments, employees } from '../../../data/hrData';

interface AdminOverviewViewProps {
  setActiveTab: (tab: AdminNavTab) => void;
}

const healthColor: Record<string, string> = {
  Healthy: 'bg-emerald-400', Degraded: 'bg-amber-400', Down: 'bg-rose-500',
};

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({ setActiveTab }) => {
  const unread = adminNotifications.filter(n => !n.read);
  const criticals = adminNotifications.filter(n => !n.read && n.severity === 'critical');

  // Chart data
  const enrollmentTrend = [
    { label: 'Sep 23', value: 312 }, { label: 'Nov 23', value: 318 },
    { label: 'Feb 24', value: 298 }, { label: 'Apr 24', value: 305 },
    { label: 'Jul 24', value: 315 },
  ];
  const revenueTrend = [
    { label: 'Apr', value: 4.2 }, { label: 'May', value: 4.5 },
    { label: 'Jun', value: 4.8 }, { label: 'Jul', value: 5.1 },
  ];
  const deptBar = departments.map(d => ({ label: d.name.split(' ')[0].slice(0, 6), value: d.employeeCount, color: '#E9C349' }));
  const admissionSegs = [
    { label: 'Enrolled', value: admissions.filter(a => a.status === 'Enrolled').length, color: '#34d399' },
    { label: 'Approved', value: admissions.filter(a => a.status === 'Approved').length, color: '#E9C349' },
    { label: 'Under Review', value: admissions.filter(a => a.status === 'Under Review' || a.status === 'Applied').length, color: '#fb923c' },
    { label: 'Rejected', value: admissions.filter(a => a.status === 'Rejected').length, color: '#f87171' },
  ].filter(s => s.value > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-linear-to-br from-[#E9C349]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E9C349]/10 border border-[#E9C349]/30 text-[10px] font-mono font-semibold text-[#E9C349] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" /> Academic Year 2024–2025 · Active
              </div>
              {criticals.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-semibold text-rose-400 uppercase">
                  <AlertTriangle className="w-3 h-3" /> {criticals.length} Critical Alert{criticals.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Institutional Overview
            </h2>
            <p className="font-sans text-sm text-white/55 max-w-xl">
              Harmony College Super Administration · Complete system authority
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {unread.length > 0 && <Button variant="primary" size="sm" icon={<AlertTriangle className="w-3.5 h-3.5" />} onClick={() => setActiveTab('notifications')}>{unread.length} Unread Alerts</Button>}
              <Button variant="secondary" size="sm" icon={<Users className="w-3.5 h-3.5" />} onClick={() => setActiveTab('users')}>Manage Users</Button>
              <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => setActiveTab('security')}>Security Center</Button>
            </div>
          </div>

          {/* System health mini */}
          <div className="hidden lg:flex flex-col gap-1.5 shrink-0 min-w-[180px]">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-1">System Health</p>
            {systemHealth.slice(0, 5).map(s => (
              <div key={s.name} className="flex items-center justify-between gap-3">
                <span className="font-sans text-xs text-white/60 truncate max-w-[120px]">{s.name.split(' ')[0]}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${healthColor[s.status]}`} />
                  <span className="font-mono text-[10px] text-white/40">{s.responseTime}</span>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-[10px] mt-1 px-2 py-1" onClick={() => setActiveTab('backup')}>
              View all services →
            </Button>
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Total Students"       value={adminKPIs.totalStudents}  icon={<GraduationCap className="w-4 h-4" />}  trend="up"      trendLabel="+2 this month"   sparkline={[298,305,308,310,312,315]}  onClick={() => setActiveTab('students')} />
        <KPICard label="Faculty & Staff"      value={adminKPIs.totalEmployees} icon={<UserCheck className="w-4 h-4" />}      trend="up"      trendLabel="Active employees" sparkline={[36,37,38,39,40,40]}        onClick={() => setActiveTab('faculty')} />
        <KPICard label="Active Programs"      value={adminKPIs.totalPrograms}  icon={<BookOpen className="w-4 h-4" />}       trend="neutral" trendLabel="1 under review"   sparkline={[11,11,12,12,13,13]}        onClick={() => setActiveTab('programs')} />
        <KPICard label="Revenue (Jul)"        value={`ETB ${(adminKPIs.totalRevenue / 1000).toFixed(0)}K`} icon={<DollarSign className="w-4 h-4" />} trend="up" trendLabel="+6% vs Jun" sparkline={[4.2,4.5,4.8,4.9,5.0,5.1]} accent onClick={() => setActiveTab('finance')} />
        <KPICard label="Outstanding"          value={`ETB ${(adminKPIs.outstandingPayments / 1000).toFixed(0)}K`} icon={<AlertTriangle className="w-4 h-4" />} trend="down" trendLabel="Needs collection" sparkline={[62,58,55,52,50,49]} onClick={() => setActiveTab('payments')} />
        <KPICard label="Pending Admissions"   value={adminKPIs.pendingAdmissions} icon={<ClipboardIcon />}                  trend="neutral" trendLabel="Awaiting review"   sparkline={[2,3,3,4,2,2]}             onClick={() => setActiveTab('admissions')} />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Avg Attendance"       value={`${adminKPIs.avgAttendance}%`} icon={<CalendarCheck className="w-4 h-4" />} trend="neutral" trendLabel="Dept avg"   sparkline={[90,91,91,90,91,90]} onClick={() => setActiveTab('attendance')} />
        <KPICard label="Avg GPA"              value={adminKPIs.avgGpa}           icon={<TrendingUp className="w-4 h-4" />}     trend="up"      trendLabel="+0.05 vs last" sparkline={[3.38,3.40,3.41,3.42,3.44,3.44]} onClick={() => setActiveTab('students')} />
        <KPICard label="Departments"          value={adminKPIs.totalDepartments} icon={<Building2 className="w-4 h-4" />}     trend="neutral" trendLabel="All active"     sparkline={[6,6,6,6,6,6]}           onClick={() => setActiveTab('departments')} />
        <KPICard label="Active Users"         value={adminKPIs.activeUsers}      icon={<Users className="w-4 h-4" />}         trend="up"      trendLabel="System users"   sparkline={[9,10,10,11,11,11]}      onClick={() => setActiveTab('users')} />
        <KPICard label="System Alerts"        value={adminKPIs.systemAlerts}     icon={<AlertTriangle className="w-4 h-4" />} trend={adminKPIs.systemAlerts > 0 ? 'down' : 'neutral'} trendLabel="Unread" sparkline={[0,1,2,3,4,5]} accent={adminKPIs.systemAlerts > 0} onClick={() => setActiveTab('notifications')} />
        <KPICard label="Storage Used"         value="89%"                        icon={<HardDrive className="w-4 h-4" />}     trend="down"    trendLabel="Warning level"  sparkline={[72,75,78,82,85,89]} accent onClick={() => setActiveTab('backup')} />
      </section>

      {/* Analytics row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Student Enrollment Trend</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Total enrolled students — 6 months</p>
            </div>
            <Badge variant="emerald">+1.0% growth</Badge>
          </div>
          <LineChart data={enrollmentTrend} height={130} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Admissions Funnel</h3>
          <DonutChart segments={admissionSegs} total={admissions.length} centerLabel={String(admissions.length)} />
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Revenue Trend (ETB M)</h3>
            <p className="font-sans text-xs text-white/40 mt-0.5">Monthly net payments collected</p>
          </div>
          <BarChart data={revenueTrend.map(r => ({ label: r.label, value: r.value, color: '#E9C349' }))} height={130} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Staff by Department</h3>
            <p className="font-sans text-xs text-white/40 mt-0.5">Active employees per department</p>
          </div>
          <BarChart data={deptBar} height={130} />
        </Card>
      </section>

      {/* Bottom row: recent activity + payment gateways */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Recent Audit Activity</h3>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => setActiveTab('audit_logs')}>View all</Button>
          </div>
          <div className="space-y-2">
            {adminAuditLog.slice(0, 5).map(entry => (
              <div key={entry.id} className={`flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors ${entry.isImpersonated ? 'bg-amber-950/15 border border-amber-800/20' : ''}`}>
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.status === 'Success' ? 'bg-emerald-400' : entry.status === 'Warning' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-xs font-semibold text-white">{entry.action} — <span className="text-white/55">{entry.user}</span></p>
                  <p className="font-sans text-[11px] text-white/40 truncate mt-0.5">{entry.description}</p>
                  {entry.isImpersonated && <span className="font-mono text-[9px] text-amber-400 mt-0.5 block">via Role Override</span>}
                </div>
                <p className="font-mono text-[10px] text-white/25 shrink-0">{entry.timestamp.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Payment Gateways</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('system_config')}>Configure</Button>
          </div>
          <div className="space-y-2">
            {gateways.map(gw => (
              <div key={gw.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/8">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${gw.connected && gw.enabled ? 'bg-emerald-400' : gw.enabled ? 'bg-amber-400' : 'bg-white/20'}`} />
                  <p className="font-sans text-xs font-semibold text-white">{gw.name}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
                  <span>{gw.transactionCount} txn</span>
                  <span>ETB {(gw.totalVolume / 1000).toFixed(0)}K</span>
                  <Badge variant={gw.enabled && gw.connected ? 'emerald' : 'glass'} className="text-[9px] py-0">{gw.enabled ? 'Active' : 'Off'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </motion.div>
  );
};

// inline placeholder icon
function ClipboardIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>; }
