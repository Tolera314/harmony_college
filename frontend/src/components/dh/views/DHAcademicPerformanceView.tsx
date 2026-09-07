'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { TrendingUp, Loader2, AlertTriangle, Star, Award } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { BarChart } from '../../dh/DHCharts';
import { ErrorState } from '../../ui/States';
import { hodAcademicPerformanceApi, type DHAcademicPerformance } from '../../../lib/hodApi';

// ─────────────────────────────────────────────────────────────────────────────
// GPA color helper
// ─────────────────────────────────────────────────────────────────────────────
function gpaColor(gpa: number) {
  if (gpa >= 3.5) return 'text-(--status-success)';
  if (gpa >= 2.5) return 'text-(--brand-gold)';
  if (gpa >= 2.0) return 'text-(--status-warning)';
  return 'text-(--status-danger)';
}

function gpaVariant(gpa: number): 'emerald' | 'gold' | 'amber' | 'rose' {
  if (gpa >= 3.5) return 'emerald';
  if (gpa >= 2.5) return 'gold';
  if (gpa >= 2.0) return 'amber';
  return 'rose';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export const DHAcademicPerformanceView: React.FC = () => {
  const [data,    setData]    = useState<DHAcademicPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await hodAcademicPerformanceApi.get()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load academic performance data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState variant="generic" title="Academic Performance unavailable" description={error} onRetry={load} />;

  const gradeDist: { grade: string; count: number; percentage: number }[] = Array.isArray(data?.gradeDistribution)
    ? data.gradeDistribution
    : data?.gradeDistribution && typeof data.gradeDistribution === 'object'
      ? Object.entries(data.gradeDistribution).map(([grade, count]) => ({
          grade,
          count: Number(count) || 0,
          percentage: 0,
        }))
      : [];

  const gradeChartData = gradeDist.map(g => ({ label: g.grade, value: g.count }));
  const atRiskList = Array.isArray(data?.atRiskStudents) ? data.atRiskStudents : [];
  const coursePerfList = Array.isArray(data?.coursePerformance) ? data.coursePerformance : [];
  const topStudentsList = Array.isArray(data?.topStudents) ? data.topStudents : [];
  const avgGpa = data?.avgGpa ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Academic Performance</h1>
        <p className="font-sans text-sm text-(--text-secondary) mt-1">Department GPA, grade distribution, and student performance analysis</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : !data ? null : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Dept. Average GPA', value: avgGpa.toFixed(2), color: gpaColor(avgGpa) },
              { label: 'Total Students Graded', value: gradeDist.reduce((a, g) => a + g.count, 0), color: 'text-(--text-primary)' },
              { label: 'At-Risk Students', value: atRiskList.length, color: 'text-(--status-danger)' },
              { label: 'Courses Tracked', value: coursePerfList.length, color: 'text-(--status-info)' },
            ].map(s => (
              <Card key={s.label} hoverable={false} className="p-4">
                <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Grade Distribution Chart */}
          {gradeChartData.length > 0 && (
            <Card hoverable={false} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-(--text-primary)">Grade Distribution</h3>
                  <p className="font-sans text-xs text-(--text-faint) mt-0.5">Overall letter grade breakdown</p>
                </div>
                <Badge variant="gold">Dept. Wide</Badge>
              </div>
              <BarChart data={gradeChartData} height={160} />
              {/* Grade legend */}
              <div className="flex flex-wrap gap-2 pt-2">
                {gradeDist.map(g => (
                  <div key={g.grade} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-(--hover-overlay)">
                    <span className="font-mono text-xs font-bold text-(--text-primary)">{g.grade}</span>
                    <span className="font-sans text-xs text-(--text-faint)">{g.count} ({g.percentage ? g.percentage.toFixed(1) : '0'}%)</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Course Performance Table */}
          {coursePerfList.length > 0 && (
            <Card hoverable={false} className="overflow-hidden">
              <div className="p-4 border-b border-(--border-subtle)">
                <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Course Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-(--border-subtle)">
                      {['Course', 'Students', 'Avg Score', 'Pass Rate'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-sans text-xs font-semibold text-(--text-faint) uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {coursePerfList.map((c, i) => {
                      const courseCode = c.courseCode ?? (c as any).code ?? '—';
                      const courseName = c.courseName ?? (c as any).name ?? '—';
                      const studentsCount = c.totalStudents ?? (c as any).totalGrades ?? 0;
                      const avgScore = c.avgScore ?? 0;
                      const passRate = c.passRate ?? 0;
                      return (
                        <tr key={i} className="hover:bg-(--hover-overlay) transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-bold text-(--brand-gold)">{courseCode}</p>
                            <p className="font-sans text-sm text-(--text-primary)">{courseName}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-(--text-primary)">{studentsCount}</td>
                          <td className="px-4 py-3">
                            <span className={`font-mono text-sm font-bold ${gpaColor(avgScore / 25)}`}>{avgScore.toFixed(1)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${passRate}%`,
                                  backgroundColor: passRate >= 70 ? 'var(--status-success)' : passRate >= 50 ? 'var(--brand-gold)' : 'var(--status-danger)',
                                }} />
                              </div>
                              <span className="font-mono text-xs text-(--text-secondary)">{passRate.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* At-Risk Students */}
          {atRiskList.length > 0 && (
            <Card hoverable={false} className="overflow-hidden">
              <div className="p-4 border-b border-(--border-default) flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-(--status-danger)" />
                <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Students Requiring Attention</h3>
                <Badge variant="rose">{atRiskList.length}</Badge>
              </div>
              <div className="divide-y divide-(--border-subtle)">
                {atRiskList.map((s, i) => {
                  const studentName = s.fullName ?? (s as any).name ?? 'Student';
                  const code = s.studentCode ?? (s as any).studentId ?? '—';
                  const gpa = s.gpa ?? 0;
                  const failing = s.failingCourses ?? 0;
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-(--status-danger-bg) flex items-center justify-center text-(--status-danger) font-serif font-bold text-sm">
                          {studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-sans text-sm font-semibold text-(--text-primary)">{studentName}</p>
                          <p className="font-mono text-xs text-(--text-faint)">{code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className={`font-mono text-sm font-bold ${gpaColor(gpa)}`}>{gpa.toFixed(2)} GPA</p>
                          {failing > 0 && <p className="font-sans text-[10px] text-(--status-danger)">{failing} failing course{failing > 1 ? 's' : ''}</p>}
                        </div>
                        <Badge variant={gpaVariant(gpa)}>{gpa < 2.0 ? 'At Risk' : 'Warning'}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Top Students */}
          {topStudentsList.length > 0 && (
            <Card hoverable={false} className="overflow-hidden">
              <div className="p-4 border-b border-(--border-default) flex items-center gap-2">
                <Star className="w-4 h-4 text-(--brand-gold)" />
                <h3 className="font-sans text-sm font-semibold text-(--text-primary)">Top Performers</h3>
              </div>
              <div className="divide-y divide-(--border-subtle)">
                {topStudentsList.slice(0, 10).map((s, i) => {
                  const studentName = s.fullName ?? (s as any).name ?? 'Student';
                  const code = s.studentCode ?? (s as any).studentId ?? '—';
                  const gpa = s.gpa ?? 0;
                  const credits = s.totalCredits ?? 0;
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center">
                          <span className="font-mono text-xs font-bold text-(--brand-gold)">#{i + 1}</span>
                        </div>
                        <div>
                          <p className="font-sans text-sm font-semibold text-(--text-primary)">{studentName}</p>
                          <p className="font-mono text-xs text-(--text-faint)">{code} · {credits} cr</p>
                        </div>
                      </div>
                      <p className="font-mono text-sm font-bold text-(--status-success)">{gpa.toFixed(2)} GPA</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
};
