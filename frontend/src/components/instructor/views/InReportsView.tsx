'use client';

import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Download, TrendingUp, Users, CalendarCheck, ClipboardList } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { LineChart, BarChart, DonutChart, HorizontalBarChart } from '../../dh/DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  attendanceSparkline, assessments, gradeEntries,
  film402StudentIds, film301StudentIds,
} from '../../../data/instructorData';
import { students } from '../../../data/departmentData';

export const InReportsView: React.FC = () => {
  const attendLine = attendanceSparkline.map((v, i) => ({ label: `Wk${i + 1}`, value: v }));

  const film402Published = assessments.filter(a => a.courseId === 'c01' && a.status === 'Published');
  const gradeBar = film402Published.map(a => {
    const entries = gradeEntries.filter(g => g.assessmentId === a.id && g.score != null);
    const avg = entries.length
      ? Math.round(entries.reduce((s, g) => s + (g.score ?? 0), 0) / entries.length)
      : 0;
    return { label: a.type.slice(0, 5), value: avg, color: avg >= 80 ? '#34d399' : avg >= 60 ? '#E9C349' : '#f87171' };
  });

  const myStudentIds = [...new Set([...film402StudentIds, ...film301StudentIds])];
  const myStudents = students.filter(s => myStudentIds.includes(s.id));

  const standingSegs = [
    { label: 'Excellent', value: myStudents.filter(s => s.standing === 'Excellent').length, color: '#34d399' },
    { label: 'Good',      value: myStudents.filter(s => s.standing === 'Good').length,      color: '#E9C349' },
    { label: 'Warning',   value: myStudents.filter(s => s.standing === 'Warning').length,   color: '#fb923c' },
    { label: 'Probation', value: myStudents.filter(s => s.standing === 'Probation').length, color: '#f87171' },
  ].filter(s => s.value > 0);

  const published  = gradeEntries.filter(g => g.status === 'Published').length;
  const pending    = gradeEntries.filter(g => g.status === 'Pending').length;
  const total      = gradeEntries.length;
  const subSegs    = [
    { label: 'Published', value: published, color: '#34d399' },
    { label: 'Pending',   value: pending,   color: '#E9C349' },
  ];

  const workload = assessments.filter(a => a.courseId === 'c01').map(a => ({
    label: a.type.slice(0, 6),
    value: gradeEntries.filter(g => g.assessmentId === a.id && g.score != null).length,
    max: film402StudentIds.length,
  }));

  const avgAttendance = Math.round(myStudents.reduce((s, x) => s + x.attendanceRate, 0) / myStudents.length);
  const avgGpa = (myStudents.reduce((s, x) => s + x.cgpa, 0) / myStudents.length).toFixed(2);
  const atRisk = myStudents.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Critical').length;
  const lastAtt = attendanceSparkline[attendanceSparkline.length - 1];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Reports"
        subtitle="Academic analytics · Fall 2024 · Dr. Marcus Vance"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export PDF</Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'My Students',    value: myStudents.length, icon: <Users className="w-4 h-4" />,           color: 'text-white' },
          { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: <CalendarCheck className="w-4 h-4" />, color: avgAttendance >= 80 ? 'text-emerald-400' : 'text-rose-400' },
          { label: 'Avg GPA',        value: avgGpa,            icon: <TrendingUp className="w-4 h-4" />,      color: 'text-[#E9C349]' },
          { label: 'At Risk',        value: atRisk,            icon: <ClipboardList className="w-4 h-4" />,   color: atRisk > 0 ? 'text-rose-400' : 'text-emerald-400' },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Attendance Trend</h3>
              <p className="font-sans text-xs text-white/40 mt-0.5">Dept-wide · Weeks 1–8</p>
            </div>
            <Badge variant={lastAtt >= 90 ? 'emerald' : 'amber'}>{lastAtt}% wk 8</Badge>
          </div>
          <LineChart data={attendLine} color="#34d399" height={140} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">FILM402 — Avg Scores</h3>
            <p className="font-sans text-xs text-white/40 mt-0.5">Published assessments</p>
          </div>
          {gradeBar.length > 0
            ? <BarChart data={gradeBar} height={140} />
            : <p className="text-center py-8 text-white/30 text-sm">No published grades yet.</p>
          }
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Student Standing</h3>
          <DonutChart segments={standingSegs} total={myStudents.length} centerLabel={String(myStudents.length)} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Submission Status</h3>
          <DonutChart segments={subSegs} total={total} centerLabel={`${Math.round((published / total) * 100)}%`} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Grading Progress</h3>
          <p className="font-sans text-xs text-white/40">Graded vs enrolled · FILM402</p>
          <HorizontalBarChart data={workload} />
        </Card>
      </div>

      {/* Row 3: student table */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Student Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans min-w-[560px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Student', 'CGPA', 'Attendance', 'Risk', 'Standing'].map(h => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-white/50 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/85">
              {myStudents.map(s => (
                <tr key={s.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={s.avatar} alt="" className="w-7 h-7 rounded-full border border-white/10 shrink-0" />
                      <span className="font-semibold text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-white">{s.cgpa.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs font-semibold ${s.attendanceRate >= 90 ? 'text-emerald-400' : s.attendanceRate >= 80 ? 'text-[#E9C349]' : 'text-rose-400'}`}>
                      {s.attendanceRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.riskLevel === 'Low' ? 'emerald' : s.riskLevel === 'Medium' ? 'amber' : 'rose'} className="text-[10px]">
                      {s.riskLevel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.standing === 'Excellent' ? 'emerald' : s.standing === 'Good' ? 'gold' : s.standing === 'Warning' ? 'amber' : 'rose'} className="text-[10px]">
                      {s.standing}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};
