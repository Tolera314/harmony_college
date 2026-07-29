'use client';

import React from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BarChart3, Download } from 'lucide-react';
import { DHPageHeader } from '../DHPageHeader';
import { LineChart, BarChart, HorizontalBarChart, DonutChart } from '../DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { enrollmentTrend, gpaByCourseTrend, attendanceTrend, facultyWorkload, courses, students, kpiData } from '../../../data/departmentData';

const progressBar = (val: number, max: number, color = '#E9C349') => {
  const pct = Math.min(100, (val / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
      <span className="font-mono text-xs text-(--text-secondary) w-12 text-right">{Math.round(pct)}%</span>
    </div>
  );
};

export const DHReportsView: React.FC = () => {
  const enrollLine    = enrollmentTrend.map((e) => ({ label: e.semester, value: e.count }));
  const gpaBar        = gpaByCourseTrend.map((g) => ({ label: g.course, value: g.avgGpa, color: 'var(--brand-gold)' }));
  const attendLine    = attendanceTrend.map((a) => ({ label: a.week, value: a.rate }));
  const workload      = facultyWorkload.map((w) => ({ label: w.facultyName, value: w.hours, max: w.maxHours }));

  const standingDist  = [
    { label: 'Excellent', value: students.filter(s => s.standing === 'Excellent').length, color: 'var(--status-success)' },
    { label: 'Good',      value: students.filter(s => s.standing === 'Good').length,      color: 'var(--brand-gold)' },
    { label: 'Warning',   value: students.filter(s => s.standing === 'Warning').length,   color: 'var(--status-warning)' },
    { label: 'Probation', value: students.filter(s => s.standing === 'Probation').length, color: 'var(--status-danger)' },
  ];

  const capacitySegments = [
    { label: '≥ 90% full',  value: courses.filter(c => c.registered / c.capacity >= 0.9 && c.status === 'Active').length, color: 'var(--status-danger)' },
    { label: '70–89% full', value: courses.filter(c => { const r = c.registered / c.capacity; return r >= 0.7 && r < 0.9 && c.status === 'Active'; }).length, color: 'var(--brand-gold)' },
    { label: '< 70% full',  value: courses.filter(c => c.registered / c.capacity < 0.7 && c.status === 'Active').length, color: 'var(--status-success)' },
  ];

  const activeCourses  = courses.filter(c => c.status === 'Active');
  const totalEnrolled  = activeCourses.reduce((s, c) => s + c.registered, 0);
  const totalCapacity  = activeCourses.reduce((s, c) => s + c.capacity, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Department Reports"
        subtitle="Academic analytics for Fall 2024 · Theatrical Art & Digital Media"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Save as PDF</Button>}
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: kpiData.totalStudents, color: 'text-(--text-primary)' },
          { label: 'Dept. Avg GPA',  value: kpiData.avgGpa,        color: 'text-(--brand-gold)' },
          { label: 'Avg Attendance', value: `${kpiData.avgAttendance}%`, color: 'text-(--status-success)' },
          { label: 'Total Enrolled', value: totalEnrolled,          color: 'text-(--status-info)' },
        ].map((item) => (
          <div key={item.label} className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
            <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{item.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment Trend</h3>
              <p className="text-xs text-(--text-faint) mt-0.5">Students per semester</p>
            </div>
            <Badge variant="emerald">+12 this term</Badge>
          </div>
          <LineChart data={enrollLine} height={140} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Student Standing</h3>
          <DonutChart segments={standingDist} total={students.length} centerLabel={`${students.length}`} />
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Average GPA by Course</h3>
            <p className="text-xs text-(--text-faint) mt-0.5">Fall 2024 — department average</p>
          </div>
          <BarChart data={gpaBar} height={160} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Weekly Attendance</h3>
            <p className="text-xs text-(--text-faint) mt-0.5">Department-wide · Weeks 1–8</p>
          </div>
          <LineChart data={attendLine} color="#34d399" height={140} />
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Faculty Workload</h3>
            <Badge variant="glass">{facultyWorkload.length} active faculty</Badge>
          </div>
          <HorizontalBarChart data={workload} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Course Capacity</h3>
            <p className="text-xs text-(--text-faint) mt-0.5">{totalEnrolled}/{totalCapacity} seats filled</p>
          </div>
          <DonutChart segments={capacitySegments} total={activeCourses.length} centerLabel={`${Math.round(totalEnrolled / totalCapacity * 100)}%`} />
        </Card>
      </div>

      {/* Graduation Progress */}
      <Card hoverable={false} className="space-y-5">
        <h3 className="font-serif text-lg font-bold text-(--text-primary)">Graduation Progress by Year</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((year) => {
            const yearStudents = students.filter((s) => s.year === year);
            const avgCredits = yearStudents.length ? Math.round(yearStudents.reduce((s, x) => s + x.creditsEarned, 0) / yearStudents.length) : 0;
            const expectedCredits = year * 30;
            return (
              <div key={year}>
                <div className="flex items-center justify-between mb-1.5 text-xs font-sans">
                  <span className="text-(--text-secondary) font-medium">Year {year} — {yearStudents.length} students</span>
                  <span className="font-mono text-(--text-muted)">{avgCredits} avg credits</span>
                </div>
                {progressBar(avgCredits, expectedCredits)}
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
};
