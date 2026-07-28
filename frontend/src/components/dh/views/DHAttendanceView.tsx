'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { CalendarCheck, AlertTriangle } from 'lucide-react';
import { DHPageHeader } from '../DHPageHeader';
import { LineChart } from '../DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { courses, students, attendanceTrend } from '../../../data/departmentData';

const attColor = (rate: number) =>
  rate >= 90 ? 'text-(--status-success)' : rate >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)';

const attBadge = (rate: number) =>
  rate >= 90 ? 'emerald' : rate >= 80 ? 'gold' : 'rose';

export const DHAttendanceView: React.FC = () => {
  const [view, setView] = useState<'courses' | 'students'>('courses');

  const activeCourses = courses.filter((c) => c.status === 'Active');
  const belowThreshold = students.filter((s) => s.attendanceRate < 80);

  const attendLine = attendanceTrend.map((a) => ({ label: a.week, value: a.rate }));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Attendance Tracking"
        subtitle={`${belowThreshold.length} student${belowThreshold.length !== 1 ? 's' : ''} below 80% threshold`}
        icon={<CalendarCheck className="w-5 h-5" />}
      />

      {/* Trend chart */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Department Attendance Trend</h3>
            <p className="text-xs text-(--text-faint) mt-0.5">Weekly average · Fall 2024</p>
          </div>
          <Badge variant={attendanceTrend[attendanceTrend.length - 1].rate >= 90 ? 'emerald' : 'amber'}>
            Week 8: {attendanceTrend[attendanceTrend.length - 1].rate}%
          </Badge>
        </div>
        <LineChart data={attendLine} color="#34d399" height={130} />
      </Card>

      {/* Alert banner */}
      {belowThreshold.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-(--status-warning)">{belowThreshold.length} students below the 80% attendance threshold</p>
            <p className="font-sans text-xs text-(--status-warning)/70 mt-0.5">
              {belowThreshold.map(s => s.name.split(' ')[0]).join(', ')} — academic standing review recommended.
            </p>
          </div>
        </div>
      )}

      {/* Toggle */}
      <div className="flex gap-2">
        {(['courses', 'students'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${view === v ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            By {v}
          </button>
        ))}
      </div>

      {/* Course attendance table */}
      {view === 'courses' && (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[600px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Course', 'Schedule', 'Enrolled', 'Avg Attendance', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {activeCourses.map((c) => {
                const enrolled = students.filter((s) => s.enrolledCourseIds.includes(c.id));
                const avg = enrolled.length ? Math.round(enrolled.reduce((s, x) => s + x.attendanceRate, 0) / enrolled.length) : 0;
                return (
                  <tr key={c.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs font-bold text-(--brand-gold)">{c.code}</p>
                      <p className="text-(--text-secondary) text-xs mt-0.5 max-w-[200px] truncate">{c.title}</p>
                    </td>
                    <td className="px-4 py-3.5 text-(--text-secondary) text-xs">{c.schedule}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{c.registered}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${attColor(avg)}`}>{avg}%</span>
                        <div className="w-16 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${avg}%`, backgroundColor: avg >= 90 ? '#34d399' : avg >= 80 ? '#E9C349' : '#f87171' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={attBadge(avg) as 'emerald'|'gold'|'rose'}>
                        {avg >= 90 ? 'Excellent' : avg >= 80 ? 'Acceptable' : 'Below Threshold'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Student attendance table */}
      {view === 'students' && (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[640px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Student', 'Program', 'Year', 'Attendance', 'Standing'].map((h) => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {[...students].sort((a, b) => a.attendanceRate - b.attendanceRate).map((s) => (
                <tr key={s.id} className={`hover:bg-(--hover-overlay) transition-colors ${s.attendanceRate < 80 ? 'bg-(--status-danger-bg)' : ''}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <img src={s.avatar} alt={s.name} className="w-7 h-7 rounded-full object-cover border border-(--border-default) shrink-0" />
                      <span className="font-semibold text-(--text-primary) text-xs">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[140px]">{s.program.replace('BA ', '')}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary) text-center">{s.year}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm font-bold ${attColor(s.attendanceRate)}`}>{s.attendanceRate}%</span>
                      <div className="w-16 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.attendanceRate}%`, backgroundColor: s.attendanceRate >= 90 ? '#34d399' : s.attendanceRate >= 80 ? '#E9C349' : '#f87171' }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={attBadge(s.attendanceRate) as 'emerald'|'gold'|'rose'}>
                      {s.attendanceRate >= 90 ? 'Excellent' : s.attendanceRate >= 80 ? 'Acceptable' : 'At Risk'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
