'use client';

import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Download, Users, TrendingUp, CalendarCheck, Banknote } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { LineChart, BarChart, DonutChart, HorizontalBarChart } from '../../dh/DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { employees, departments, leaveRequests, payrollRecords, performanceReviews } from '../../../data/hrData';

export const HRReportsView: React.FC = () => {
  // Employee distribution by department
  const deptBar = departments.map(d => ({
    label: d.name.split(' ')[0].slice(0, 6),
    value: d.employeeCount,
    color: '#E9C349',
  }));

  // Employment type donut
  const empTypes = [
    { label: 'Full-Time', value: employees.filter(e => e.employmentType === 'Full-Time').length,  color: '#34d399' },
    { label: 'Part-Time', value: employees.filter(e => e.employmentType === 'Part-Time').length,  color: '#E9C349' },
    { label: 'Contract',  value: employees.filter(e => e.employmentType === 'Contract').length,   color: '#fb923c' },
    { label: 'Intern',    value: employees.filter(e => e.employmentType === 'Intern').length,     color: '#a78bfa' },
  ].filter(s => s.value > 0);

  // Leave trend (6 months)
  const leaveTrend = [
    { label: 'Feb', value: 2 }, { label: 'Mar', value: 4 }, { label: 'Apr', value: 3 },
    { label: 'May', value: 5 }, { label: 'Jun', value: 7 }, { label: 'Jul', value: 12 },
  ];

  // Payroll trend (4 months)
  const payrollTrend = payrollRecords.slice().reverse().map(p => ({
    label: p.month.slice(0, 3),
    value: Math.round(p.totalNet / 1_000_000 * 10) / 10,
    color: '#E9C349',
  }));

  // Performance score distribution
  const scoreSegs = [
    { label: '4.5–5.0 Excellent', value: performanceReviews.filter(r => (r.overallScore ?? 0) >= 4.5).length, color: '#34d399' },
    { label: '3.5–4.4 Good',      value: performanceReviews.filter(r => (r.overallScore ?? 0) >= 3.5 && (r.overallScore ?? 0) < 4.5).length, color: '#E9C349' },
    { label: '< 3.5 Needs Work',  value: performanceReviews.filter(r => (r.overallScore ?? 0) > 0 && (r.overallScore ?? 0) < 3.5).length, color: '#fb923c' },
  ].filter(s => s.value > 0);

  // Gender distribution
  const genderSegs = [
    { label: 'Male',   value: employees.filter(e => e.gender === 'Male').length,   color: '#60a5fa' },
    { label: 'Female', value: employees.filter(e => e.gender === 'Female').length, color: '#f472b6' },
  ];

  // Dept workload proxy
  const deptWorkload = departments.map(d => ({
    label: d.name.split(' ')[0].slice(0, 8),
    value: d.employeeCount,
    max: 20,
  }));

  const activeCount  = employees.filter(e => e.status === 'Active').length;
  const avgPayroll   = payrollRecords[0]?.totalNet ?? 0;
  const pendingLeave = leaveRequests.filter(l => l.status === 'Pending').length;
  const avgScore     = performanceReviews.filter(r => r.overallScore).reduce((s, r) => s + (r.overallScore ?? 0), 0) / Math.max(1, performanceReviews.filter(r => r.overallScore).length);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="HR Reports"
        subtitle="Analytics overview · Academic Year 2024–2025"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export PDF</Button>}
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Staff',     value: activeCount,                                icon: <Users className="w-4 h-4" />,        color: 'text-white' },
          { label: 'Avg Perf. Score',  value: `${avgScore.toFixed(1)}/5`,                 icon: <TrendingUp className="w-4 h-4" />,   color: 'text-[#E9C349]' },
          { label: 'Pending Leave',    value: pendingLeave,                               icon: <CalendarCheck className="w-4 h-4" />, color: pendingLeave > 0 ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Payroll (Jul)',     value: `ETB ${(avgPayroll / 1_000_000).toFixed(2)}M`, icon: <Banknote className="w-4 h-4" />, color: 'text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/40">{item.icon}</span>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
            </div>
            <p className={`font-mono text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Department Headcount</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Active employees per department</p>
            </div>
            <Badge variant="glass">{employees.length} total</Badge>
          </div>
          <BarChart data={deptBar} height={150} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Contract Types</h3>
          <DonutChart segments={empTypes} total={employees.length} centerLabel={String(employees.length)} />
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Leave Trend</h3>
            <p className="font-sans text-xs text-white/40 mt-0.5">Total leave requests per month</p>
          </div>
          <LineChart data={leaveTrend} color="#fb923c" height={140} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Payroll Summary</h3>
            <p className="font-sans text-xs text-white/40 mt-0.5">Net payroll (ETB millions)</p>
          </div>
          <BarChart data={payrollTrend} height={140} />
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Performance Scores</h3>
          <DonutChart segments={scoreSegs} total={performanceReviews.filter(r => r.overallScore).length} centerLabel={`${avgScore.toFixed(1)}`} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Gender Distribution</h3>
          <DonutChart segments={genderSegs} total={employees.length} centerLabel={String(employees.length)} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Staff by Department</h3>
          <p className="font-sans text-xs text-white/40">vs. max 20 target</p>
          <HorizontalBarChart data={deptWorkload} />
        </Card>
      </div>
    </motion.div>
  );
};
