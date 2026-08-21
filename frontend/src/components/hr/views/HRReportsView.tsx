'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BarChart3, Users, CalendarCheck, TrendingUp, Banknote, Download } from 'lucide-react';
import {
  hrDashboardApi, hrEmployeesApi, hrLeaveApi, hrPayrollApi, type HRDashboardData,
  LEAVE_TYPE_LABEL, PAYROLL_STAGE_LABEL,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { BarChart, DonutChart } from '../../dh/DHCharts';
import { SkeletonPage, ErrorState } from '../../ui/States';

export const HRReportsView: React.FC = () => {
  const [data,    setData]    = useState<HRDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [leaveStats, setLeaveStats] = useState<Record<string, number>>({});
  const [payrollHistory, setPayrollHistory] = useState<{ month: string; net: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dash, leaveRes, payrollRes] = await Promise.all([
        hrDashboardApi.get(),
        hrLeaveApi.list({ limit: 200 }),
        hrPayrollApi.list(),
      ]);
      setData(dash);

      // Leave type distribution
      const counts: Record<string, number> = {};
      for (const r of leaveRes.requests) {
        counts[r.leaveType] = (counts[r.leaveType] ?? 0) + 1;
      }
      setLeaveStats(counts);

      // Payroll history (last 6 months)
      setPayrollHistory(payrollRes.slice(0, 6).reverse().map(p => ({
        month: `${p.month.slice(0, 3)} ${p.year}`,
        net: p.totalNet,
      })));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load reports'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonPage />;
  if (error || !data) return <ErrorState variant="network" onRetry={load} description={error ?? 'Failed to load'} />;

  const { kpis, departmentBreakdown, statusBreakdown, employmentTypeBreakdown, currentPayroll } = data;

  const deptBar = departmentBreakdown.map(d => ({
    label: d.name.split(' ')[0].slice(0, 6),
    value: d.employeeCount,
    color: 'var(--brand-gold)',
  }));

  const leaveBar = Object.entries(leaveStats).map(([type, count]) => ({
    label: (LEAVE_TYPE_LABEL as Record<string,string>)[type]?.slice(0, 4) ?? type.slice(0, 4),
    value: count,
    color: 'var(--status-info)',
  }));

  const payrollBar = payrollHistory.map(p => ({
    label: p.month.slice(0, 6),
    value: Math.round(p.net / 1000),
    color: 'var(--status-success)',
  }));

  const statusSegs = statusBreakdown.map(s => ({
    label: s.status,
    value: s.count,
    color: s.status === 'ACTIVE' ? 'var(--status-success)'
         : s.status === 'ON_LEAVE' ? 'var(--brand-gold)'
         : s.status === 'TERMINATED' ? 'var(--status-danger)'
         : 'var(--text-faint)',
  }));
  const totalEmps = statusBreakdown.reduce((a, s) => a + s.count, 0);

  const typeSegs = employmentTypeBreakdown.map(t => ({
    label: t.type.replace('_', '-'),
    value: t.count,
    color: t.type === 'FULL_TIME' ? 'var(--brand-gold)'
         : t.type === 'PART_TIME' ? 'var(--status-info)'
         : t.type === 'CONTRACT' ? 'var(--status-warning)'
         : 'var(--text-faint)',
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="HR Reports"
        subtitle="Live analytics from real HR database data"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export PDF</Button>}
      />

      {/* KPI summary cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees',    value: kpis.totalEmployees,         icon: <Users className="w-5 h-5 text-(--brand-gold)" /> },
          { label: 'Active Employees',   value: kpis.activeEmployees,        icon: <Users className="w-5 h-5 text-(--status-success)" /> },
          { label: 'Pending Leave',      value: kpis.pendingLeaveRequests,   icon: <CalendarCheck className="w-5 h-5 text-(--status-warning)" /> },
          { label: 'Reviews Due',        value: kpis.reviewsDue,             icon: <TrendingUp className="w-5 h-5 text-(--status-info)" /> },
        ].map(k => (
          <Card key={k.label} hoverable={false} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center shrink-0">
              {k.icon}
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-(--text-primary)">{k.value}</p>
              <p className="font-sans text-xs text-(--text-muted)">{k.label}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* Charts row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Headcount by Department</h3>
            <Badge variant="glass">{kpis.activeEmployees} active</Badge>
          </div>
          <BarChart data={deptBar} height={130} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-base font-bold text-(--text-primary)">Employee Status Breakdown</h3>
          <DonutChart segments={statusSegs} total={totalEmps} centerLabel={String(totalEmps)} />
        </Card>
      </section>

      {/* Charts row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-base font-bold text-(--text-primary)">Employment Types</h3>
          <DonutChart segments={typeSegs} total={totalEmps} centerLabel={String(totalEmps)} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-base font-bold text-(--text-primary)">Leave Requests by Type</h3>
          {leaveBar.length > 0 ? <BarChart data={leaveBar} height={130} /> : <p className="text-xs text-(--text-faint) py-8 text-center">No leave data</p>}
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-base font-bold text-(--text-primary)">Payroll Net (ETB 000s)</h3>
          {payrollBar.length > 0 ? <BarChart data={payrollBar} height={130} /> : <p className="text-xs text-(--text-faint) py-8 text-center">No payroll data</p>}
        </Card>
      </section>

      {/* Current payroll summary */}
      {currentPayroll && (
        <Card hoverable={false} className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Banknote className="w-5 h-5 text-(--brand-gold)" />
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Current Payroll Summary</h3>
            <Badge variant="gold" className="ml-auto">{PAYROLL_STAGE_LABEL[currentPayroll.stage] ?? currentPayroll.stage}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[['Period', `${currentPayroll.month} ${currentPayroll.year}`], ['Total Gross', `ETB ${currentPayroll.totalGross.toLocaleString()}`], ['Total Net', `ETB ${currentPayroll.totalNet.toLocaleString()}`]].map(([k, v]) => (
              <div key={k} className="text-center p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                <p className="font-mono text-sm font-bold text-(--text-primary) mt-1">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Department budget table */}
      <Card hoverable={false} className="overflow-x-auto">
        <h3 className="font-serif text-base font-bold text-(--text-primary) mb-4">Department Overview</h3>
        <table className="w-full text-xs font-sans">
          <thead className="border-b border-(--border-default)">
            <tr>{['Department','Active Employees','Budget (ETB)'].map(h => (
              <th key={h} className="py-2 text-left font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {departmentBreakdown.map(d => (
              <tr key={d.id} className="hover:bg-(--hover-overlay) transition-colors">
                <td className="py-3 font-semibold text-(--text-primary)">{d.name}</td>
                <td className="py-3 font-mono text-(--text-secondary)">{d.employeeCount}</td>
                <td className="py-3 font-mono text-(--text-secondary)">{d.budget.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </motion.div>
  );
};
