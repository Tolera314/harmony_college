'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { ClipboardList, Loader2, BookOpen, CalendarCheck, FileText } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { ErrorState } from '../../ui/States';
import { hodAcademicMonitoringApi, type DHAcademicMonitoring } from '../../../lib/hodApi';

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ value: number; max?: number; color?: string }> = ({ value, max = 100, color }) => {
  const pct = Math.min(100, (value / (max || 1)) * 100);
  const bg = color ?? (pct >= 80 ? 'var(--status-success)' : pct >= 60 ? 'var(--brand-gold)' : 'var(--status-danger)');
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bg }} />
      </div>
      <span className="font-mono text-xs text-(--text-secondary) w-12 text-right">{value.toFixed(1)}%</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export const DHAcademicMonitoringView: React.FC = () => {
  const [data,    setData]    = useState<DHAcademicMonitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await hodAcademicMonitoringApi.get()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load academic monitoring data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState variant="generic" title="Academic Monitoring unavailable" description={error} onRetry={load} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Academic Monitoring</h1>
        <p className="font-sans text-sm text-(--text-secondary) mt-1">Department-wide attendance, exam progress, and course activity</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : !data ? null : (() => {
        const attendance = data.attendance ?? {
          totalSessions: 0,
          attendedSessions: 0,
          atRiskStudents: 0,
          attendanceRate: 0,
          byCourse: [],
        };
        const attendanceByCourse = Array.isArray(attendance.byCourse) ? attendance.byCourse : [];

        const examProgress = data.examProgress ?? {
          totalGradeRecords: 0,
          midExamSubmitted: 0,
          finalExamSubmitted: 0,
          midSubmissionRate: 0,
          finalSubmissionRate: 0,
          byCourse: [],
        };
        const examByCourse = Array.isArray(examProgress.byCourse) ? examProgress.byCourse : [];

        const courseProgress = data.courseProgress ?? { byCourse: [] };
        const courseProgressByCourse = Array.isArray(courseProgress.byCourse) ? courseProgress.byCourse : [];

        return (
          <>
            {/* Attendance Summary */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-(--brand-gold)" />
                <h2 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Overview</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sessions',  value: attendance.totalSessions ?? 0, color: 'text-(--text-primary)' },
                  { label: 'Attended Sessions', value: attendance.attendedSessions ?? 0, color: 'text-(--status-success)' },
                  { label: 'At-Risk Students', value: attendance.atRiskStudents ?? 0, color: 'text-(--status-danger)' },
                  { label: 'Attendance Rate',  value: `${(attendance.attendanceRate ?? 0).toFixed(1)}%`, color: (attendance.attendanceRate ?? 0) >= 75 ? 'text-(--status-success)' : 'text-(--status-danger)' },
                ].map(s => (
                  <Card key={s.label} hoverable={false} className="p-4">
                    <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
                  </Card>
                ))}
              </div>

              {attendanceByCourse.length > 0 && (
                <Card hoverable={false} className="overflow-hidden">
                  <div className="p-4 border-b border-(--border-subtle)">
                    <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Attendance by Course</h3>
                  </div>
                  <div className="divide-y divide-(--border-subtle)">
                    {attendanceByCourse.map((c, i) => (
                      <div key={i} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-(--brand-gold)">{c.courseCode}</span>
                            <span className="font-sans text-sm text-(--text-primary) ml-2">{c.courseName}</span>
                          </div>
                          <Badge variant={(c.attendanceRate ?? 0) >= 75 ? 'emerald' : 'rose'}>{c.sessionsHeld ?? 0} sessions</Badge>
                        </div>
                        <ProgressBar value={c.attendanceRate ?? 0} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>

            {/* Exam Submission Progress */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-(--brand-gold)" />
                <h2 className="font-serif text-lg font-bold text-(--text-primary)">Exam Marks Progress</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total Grade Records', value: examProgress.totalGradeRecords ?? 0, color: 'text-(--text-primary)' },
                  { label: 'Mid-Exam Submitted', value: examProgress.midExamSubmitted ?? 0, color: 'text-(--status-info)' },
                  { label: 'Final Submitted',     value: examProgress.finalExamSubmitted ?? 0, color: 'text-(--status-success)' },
                ].map(s => (
                  <Card key={s.label} hoverable={false} className="p-4">
                    <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card hoverable={false} className="p-4 space-y-3">
                  <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Mid-Exam Submission Rate</h3>
                  <ProgressBar value={examProgress.midSubmissionRate ?? 0} color="var(--status-info)" />
                  <p className="font-sans text-xs text-(--text-faint)">{examProgress.midExamSubmitted ?? 0} of {examProgress.totalGradeRecords ?? 0} submitted</p>
                </Card>
                <Card hoverable={false} className="p-4 space-y-3">
                  <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Final Exam Submission Rate</h3>
                  <ProgressBar value={examProgress.finalSubmissionRate ?? 0} color="var(--status-success)" />
                  <p className="font-sans text-xs text-(--text-faint)">{examProgress.finalExamSubmitted ?? 0} of {examProgress.totalGradeRecords ?? 0} submitted</p>
                </Card>
              </div>

              {examByCourse.length > 0 && (
                <Card hoverable={false} className="overflow-hidden">
                  <div className="p-4 border-b border-(--border-subtle)">
                    <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Exam Submission by Course</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-(--border-subtle)">
                          {['Course', 'Total', 'Mid Submitted', 'Final Submitted'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-sans text-xs font-semibold text-(--text-faint) uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-(--border-subtle)">
                        {examByCourse.map((c, i) => (
                          <tr key={i} className="hover:bg-(--hover-overlay) transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-(--brand-gold)">{c.courseCode}</span>
                              <span className="font-sans text-sm text-(--text-primary) ml-2">{c.courseName}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm text-(--text-primary)">{c.total}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-(--text-primary)">{c.midSubmitted}/{c.total}</span>
                                <Badge variant={c.midSubmitted === c.total ? 'emerald' : c.midSubmitted > 0 ? 'amber' : 'rose'}>
                                  {c.total > 0 ? `${Math.round((c.midSubmitted / c.total) * 100)}%` : '—'}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-(--text-primary)">{c.finalSubmitted}/{c.total}</span>
                                <Badge variant={c.finalSubmitted === c.total ? 'emerald' : c.finalSubmitted > 0 ? 'amber' : 'rose'}>
                                  {c.total > 0 ? `${Math.round((c.finalSubmitted / c.total) * 100)}%` : '—'}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>

            {/* Course Progress */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-(--brand-gold)" />
                <h2 className="font-serif text-lg font-bold text-(--text-primary)">Course Session Progress</h2>
              </div>
              {courseProgressByCourse.length === 0 ? (
                <Card hoverable={false} className="py-10 text-center">
                  <p className="font-sans text-sm text-(--text-faint)">No course session data available yet.</p>
                </Card>
              ) : (
                <Card hoverable={false} className="overflow-hidden">
                  <div className="divide-y divide-(--border-subtle)">
                    {courseProgressByCourse.map((c, i) => (
                      <div key={i} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-(--brand-gold)">{c.courseCode}</span>
                            <span className="font-sans text-sm text-(--text-primary) ml-2">{c.courseName}</span>
                          </div>
                          <span className="font-sans text-xs text-(--text-secondary)">{c.sessionsHeld}/{c.expectedSessions} sessions</span>
                        </div>
                        <ProgressBar value={c.progressPct} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>
          </>
        );
      })()}
    </motion.div>
  );
};
