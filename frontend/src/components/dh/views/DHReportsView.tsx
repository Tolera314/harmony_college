'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { hodReportsApi, type EnrollmentReport, type PerformanceReport, type WorkloadReport } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { LineChart, BarChart, HorizontalBarChart } from '../DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState, SkeletonCard } from '../../ui/States';

const progressBar = (val: number, max: number, color = '#E9C349') => {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
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

type Tab = 'enrollment' | 'performance' | 'workload';

export const DHReportsView: React.FC = () => {
  const [tab,         setTab]         = useState<Tab>('enrollment');
  const [enrollment,  setEnrollment]  = useState<EnrollmentReport | null>(null);
  const [performance, setPerformance] = useState<PerformanceReport | null>(null);
  const [workload,    setWorkload]    = useState<WorkloadReport[] | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (t === 'enrollment' && !enrollment) {
        setEnrollment(await hodReportsApi.enrollment());
      } else if (t === 'performance' && !performance) {
        setPerformance(await hodReportsApi.performance());
      } else if (t === 'workload' && !workload) {
        setWorkload(await hodReportsApi.workload());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [enrollment, performance, workload]);

  useEffect(() => { load(tab); }, [tab, load]);

  const reload = () => {
    if (tab === 'enrollment')  setEnrollment(null);
    if (tab === 'performance') setPerformance(null);
    if (tab === 'workload')    setWorkload(null);
    load(tab);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'enrollment',  label: 'Enrollment' },
    { key: 'performance', label: 'Academic Performance' },
    { key: 'workload',    label: 'Faculty Workload' },
  ];

  if (error) return <ErrorState variant="generic" description={error} onRetry={reload} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Department Reports"
        subtitle="Real-time academic analytics from department data"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={reload}>Refresh</Button>}
      />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${tab === t.key ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} rows={5} />)}
        </div>
      ) : (

        /* ── ENROLLMENT TAB ── */
        tab === 'enrollment' && enrollment ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card hoverable={false} className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment Trend</h3>
                    <p className="text-xs text-(--text-faint) mt-0.5">Students enrolled per semester</p>
                  </div>
                  {enrollment.trend.length > 1 && (
                    <Badge variant={enrollment.trend[enrollment.trend.length - 1].count >= enrollment.trend[enrollment.trend.length - 2].count ? 'emerald' : 'amber'}>
                      {enrollment.trend[enrollment.trend.length - 1].count} latest
                    </Badge>
                  )}
                </div>
                {enrollment.trend.length > 0
                  ? <LineChart data={enrollment.trend.map(e => ({ label: e.semester, value: e.count }))} height={140} />
                  : <p className="text-sm text-(--text-faint) text-center py-8">No semester enrollment data yet.</p>
                }
              </Card>
              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">By Program</h3>
                {enrollment.byProgram.length === 0
                  ? <p className="text-sm text-(--text-faint) text-center py-8">No data.</p>
                  : enrollment.byProgram.map(p => (
                    <div key={p.program}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-(--text-secondary) truncate max-w-[140px]">{p.program}</span>
                        <span className="font-mono text-(--brand-gold)">{p.count}</span>
                      </div>
                      {progressBar(p.count, Math.max(...enrollment.byProgram.map(x => x.count)))}
                    </div>
                  ))
                }
              </Card>
            </div>

            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment by Course</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-sans" style={{ minWidth: '500px' }}>
                  <thead className="border-b border-(--border-default)">
                    <tr>{['Code', 'Name', 'Enrolled', 'Capacity', 'Utilization'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-mono text-[10px] uppercase text-(--text-muted)">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {enrollment.byCourse.map(c => (
                      <tr key={c.code} className="hover:bg-(--hover-overlay)">
                        <td className="px-3 py-2.5 font-mono text-(--brand-gold) font-bold">{c.code}</td>
                        <td className="px-3 py-2.5 text-(--text-secondary) max-w-[200px] truncate">{c.name}</td>
                        <td className="px-3 py-2.5 font-mono text-(--text-primary)">{c.enrolled}</td>
                        <td className="px-3 py-2.5 font-mono text-(--text-secondary)">{c.capacity}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${c.pct}%`,
                                backgroundColor: c.pct >= 90 ? '#f87171' : c.pct >= 70 ? '#E9C349' : '#34d399',
                              }} />
                            </div>
                            <span className="font-mono text-[10px] text-(--text-secondary)">{c.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )

        /* ── PERFORMANCE TAB ── */
        : tab === 'performance' && performance ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Dept. Avg GPA',   value: performance.avgGpa.toFixed(2), color: 'text-(--brand-gold)' },
                { label: 'Programs',         value: performance.gpaByProgram.length, color: 'text-(--text-primary)' },
                { label: 'At-Risk Students', value: performance.atRiskCount, color: 'text-(--status-danger)' },
                { label: 'Grade Entries',    value: performance.gradeDist.reduce((s, g) => s + g.count, 0), color: 'text-(--status-success)' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{item.label}</p>
                  <p className={`font-mono text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">GPA by Program</h3>
                {performance.gpaByProgram.length === 0
                  ? <p className="text-sm text-(--text-faint) text-center py-8">No GPA data yet.</p>
                  : performance.gpaByProgram.map(p => (
                    <div key={p.program}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-(--text-secondary) truncate max-w-[150px]">{p.program}</span>
                        <span className="font-mono font-bold text-(--brand-gold)">{p.avgGpa.toFixed(2)}</span>
                      </div>
                      {progressBar(p.avgGpa, 4.0, '#E9C349')}
                    </div>
                  ))
                }
              </Card>

              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Grade Distribution</h3>
                {performance.gradeDist.length === 0
                  ? <p className="text-sm text-(--text-faint) text-center py-8">No graded assessments yet.</p>
                  : <BarChart
                      data={performance.gradeDist.map(g => ({ label: g.grade ?? '—', value: g.count, color: 'var(--brand-gold)' }))}
                      height={160}
                    />
                }
              </Card>
            </div>
          </div>
        )

        /* ── WORKLOAD TAB ── */
        : tab === 'workload' && workload ? (
          <div className="space-y-6">
            <Card hoverable={false} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-(--text-primary)">Faculty Workload</h3>
                  <p className="text-xs text-(--text-faint) mt-0.5">Current semester offerings and enrollment</p>
                </div>
                <Badge variant="glass">{workload.length} active faculty</Badge>
              </div>
              {workload.length === 0
                ? <p className="text-sm text-(--text-faint) text-center py-8">No faculty data available.</p>
                : <HorizontalBarChart
                    data={workload.map(w => ({
                      label: w.fullName.split(' ').slice(-1)[0],
                      value: w.offerings,
                      max:   5,
                    }))}
                  />
              }
            </Card>

            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
              <table className="w-full text-xs font-sans" style={{ minWidth: '500px' }}>
                <thead className="border-b border-(--border-default)">
                  <tr>{['Faculty', 'Employee ID', 'Offerings', 'Students Taught'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left font-mono text-[10px] uppercase text-(--text-muted)">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {workload.map(w => (
                    <tr key={w.instructorId} className="hover:bg-(--hover-overlay)">
                      <td className="px-4 py-3.5 font-semibold text-(--text-primary)">{w.fullName}</td>
                      <td className="px-4 py-3.5 font-mono text-(--text-faint)">{w.employeeId}</td>
                      <td className="px-4 py-3.5 font-mono text-(--brand-gold) font-bold">{w.offerings}</td>
                      <td className="px-4 py-3.5 font-mono text-(--text-secondary)">{w.enrolled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      )}
    </motion.div>
  );
};
