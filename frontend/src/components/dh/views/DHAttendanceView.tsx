'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { CalendarCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { hodReportsApi, type AttendanceReport } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { LineChart } from '../DHCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState, SkeletonCard } from '../../ui/States';

const attColor = (rate: number) =>
  rate >= 90 ? 'text-(--status-success)' : rate >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)';

const attBadge = (rate: number): 'emerald' | 'gold' | 'rose' =>
  rate >= 90 ? 'emerald' : rate >= 80 ? 'gold' : 'rose';

export const DHAttendanceView: React.FC = () => {
  const [data,    setData]    = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [view,    setView]    = useState<'courses' | 'students'>('courses');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodReportsApi.attendance();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState variant="generic" description={error} onRetry={load} />;

  const trendData = (data?.weeklyTrend ?? []).map(w => ({ label: w.week, value: w.rate }));
  const lowStudents = data?.lowStudents ?? [];
  const byCourse    = data?.byCourse   ?? [];
  const lastRate    = trendData[trendData.length - 1]?.value ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Attendance Tracking"
        subtitle={loading ? 'Loading…' : `${lowStudents.length} student${lowStudents.length !== 1 ? 's' : ''} below 80% threshold`}
        icon={<CalendarCheck className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>}
      />

      {/* Trend chart */}
      {loading ? <SkeletonCard rows={4} /> : (
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Department Attendance Trend</h3>
              <p className="text-xs text-(--text-faint) mt-0.5">Weekly average — current semester</p>
            </div>
            {trendData.length > 0 && (
              <Badge variant={lastRate >= 90 ? 'emerald' : 'amber'}>
                Latest: {lastRate}%
              </Badge>
            )}
          </div>
          {trendData.length > 0
            ? <LineChart data={trendData} color="#34d399" height={130} />
            : <p className="font-sans text-sm text-(--text-faint) text-center py-8">No attendance session data yet for this semester.</p>
          }
        </Card>
      )}

      {/* Alert banner */}
      {!loading && lowStudents.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-(--status-warning)">{lowStudents.length} student{lowStudents.length > 1 ? 's' : ''} below the 80% attendance threshold</p>
            <p className="font-sans text-xs text-(--status-warning)/70 mt-0.5">
              {lowStudents.slice(0, 4).map(s => s.name.split(' ')[0]).join(', ')}{lowStudents.length > 4 ? ` +${lowStudents.length - 4} more` : ''} — academic standing review recommended.
            </p>
          </div>
        </div>
      )}

      {/* Toggle */}
      <div className="flex gap-2">
        {(['courses', 'students'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${view === v ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            By {v}
          </button>
        ))}
      </div>

      {/* Course attendance table */}
      {view === 'courses' && (
        loading ? <SkeletonCard rows={6} /> : (
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans" style={{ minWidth: '600px' }}>
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Course', 'Total Sessions', 'Present', 'Avg Attendance', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {byCourse.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-(--text-faint) font-sans text-sm">No attendance records yet for this semester.</td></tr>
                ) : byCourse.map(c => (
                  <tr key={c.code} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs font-bold text-(--brand-gold)">{c.code}</p>
                      <p className="text-(--text-secondary) text-xs mt-0.5 max-w-[200px] truncate">{c.name}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{c.total}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{c.present}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${attColor(c.rate)}`}>{c.rate}%</span>
                        <div className="w-16 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.rate}%`, backgroundColor: c.rate >= 90 ? '#34d399' : c.rate >= 80 ? '#E9C349' : '#f87171' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={attBadge(c.rate)}>{c.rate >= 90 ? 'Excellent' : c.rate >= 80 ? 'Acceptable' : 'Below Threshold'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Student attendance table */}
      {view === 'students' && (
        loading ? <SkeletonCard rows={6} /> : (
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans" style={{ minWidth: '500px' }}>
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Student', 'Student ID', 'Attendance Rate', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {lowStudents.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-(--text-faint) font-sans text-sm">
                    {byCourse.length === 0 ? 'No attendance data yet.' : '✓ All students are above the 80% threshold.'}
                  </td></tr>
                ) : lowStudents.map(s => (
                  <tr key={s.id} className="hover:bg-(--hover-overlay) transition-colors bg-(--status-danger-bg)">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-(--accent-gold-subtle) flex items-center justify-center border border-(--accent-gold-border) shrink-0">
                          <span className="font-serif font-bold text-xs text-(--brand-gold)">{s.name.charAt(0)}</span>
                        </div>
                        <span className="font-semibold text-(--text-primary) text-xs">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{s.studentId}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${attColor(s.rate)}`}>{s.rate}%</span>
                        <div className="w-16 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.rate}%`, backgroundColor: '#f87171' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="rose">At Risk</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </motion.div>
  );
};
