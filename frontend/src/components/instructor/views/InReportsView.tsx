'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BarChart3, Download, RefreshCw, AlertTriangle, ChevronDown, Users, CalendarCheck } from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { LineChart, BarChart } from '../../dh/DHCharts';
import { Card }           from '../../ui/Card';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { SkeletonPage, EmptyState, ErrorState } from '../../ui/States';
import {
  instructorClassesApi,
  type ClassOffering,
  type LowAttendanceStudent,
  type AttendanceReportResponse,
} from '../../../lib/instructorApi';

export interface InReportsViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

export const InReportsView: React.FC<InReportsViewProps> = ({ programType }) => {
  const [classes,          setClasses]         = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [attReport,        setAttReport]       = useState<AttendanceReportResponse | null>(null);
  const [lowAtt,           setLowAtt]          = useState<LowAttendanceStudent[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [error,            setError]           = useState<string | null>(null);
  const [threshold,        setThreshold]       = useState(75);

  // ── Load classes ──────────────────────────────────────────────────────────
  useEffect(() => {
    instructorClassesApi.list(programType)
      .then(data => {
        setClasses(data);
        if (data.length > 0) {
          const current = data.find(o => o.semester.isCurrent);
          setSelectedOffering(prev => (prev && data.some(d => d.id === prev)) ? prev : (current ? current.id : data[0].id));
        } else {
          setSelectedOffering('');
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, [programType]);

  // ── Load reports ──────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!selectedOffering) return;
    setLoading(true); setError(null);
    try {
      const [report, low] = await Promise.all([
        instructorClassesApi.getAttendanceReport(selectedOffering, { limit: 100 }),
        instructorClassesApi.getLowAttendance(selectedOffering, threshold),
      ]);
      setAttReport(report);
      setLowAtt(low);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [selectedOffering, threshold]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const selectedClass = classes.find(c => c.id === selectedOffering);

  // Build attendance trend from records
  const attTrend = React.useMemo(() => {
    if (!attReport) return [];
    // Group by session date
    const byDate: Record<string, { present: number; total: number }> = {};
    for (const r of attReport.records) {
      const date = new Date(r.attendanceSession.classSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDate[date]) byDate[date] = { present: 0, total: 0 };
      byDate[date].total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') byDate[date].present++;
    }
    return Object.entries(byDate)
      .slice(-8)
      .map(([date, v]) => ({ label: date, value: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0 }));
  }, [attReport]);

  // Attendance status distribution
  const statusDist = React.useMemo(() => {
    if (!attReport) return [];
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const r of attReport.records) {
      counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] ?? 0) + 1;
    }
    return [
      { label: 'Present', value: counts.PRESENT, color: 'var(--status-success)' },
      { label: 'Absent',  value: counts.ABSENT,  color: 'var(--status-danger)'  },
      { label: 'Late',    value: counts.LATE,    color: 'var(--status-warning)' },
      { label: 'Excused', value: counts.EXCUSED, color: 'var(--text-secondary)' },
    ].filter(s => s.value > 0);
  }, [attReport]);

  const exportCSV = () => {
    if (!attReport) return;
    const headers = ['Date', 'Student', 'Status', 'Method'];
    const rows = attReport.records.map(r => [
      new Date(r.attendanceSession.classSession.date).toLocaleDateString(),
      r.studentRecord.user.fullName,
      r.status,
      r.method,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `attendance-report-${selectedClass?.course.code ?? 'course'}.csv`;
    a.click();
  };

  if (loading && !selectedOffering) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Reports"
        subtitle={selectedClass ? `${selectedClass.course.code} · Attendance & Analytics` : 'Class Reports'}
        icon={<BarChart3 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadReports}>
              Refresh
            </Button>
            {attReport && attReport.records.length > 0 && (
              <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>
                Export CSV
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {classes.length > 1 && (
          <div className="relative">
            <select
              value={selectedOffering}
              onChange={e => setSelectedOffering(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.course.code} — Section {c.section}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
          <span className="font-mono">Low-att threshold:</span>
          <input
            type="number"
            min={50}
            max={100}
            value={threshold}
            onChange={e => setThreshold(parseInt(e.target.value, 10))}
            className="w-16 bg-(--hover-overlay) border border-(--border-default) rounded-lg px-2 py-1.5 font-mono text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            aria-label="Low attendance threshold"
          />
          <span className="font-mono">%</span>
        </div>
      </div>

      {error && <ErrorState variant="network" onRetry={loadReports} description={error} />}

      {loading ? (
        <SkeletonPage />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Overall Rate',     value: `${attReport?.overallRate ?? 0}%`, color: (attReport?.overallRate ?? 0) >= 75 ? 'var(--status-success)' : 'var(--status-danger)' },
              { label: 'Total Records',    value: attReport?.total ?? 0,             color: 'var(--text-primary)'  },
              { label: 'Below Threshold',  value: lowAtt.length,                     color: lowAtt.length > 0 ? 'var(--status-warning)' : 'var(--status-success)' },
              { label: 'Enrolled',         value: selectedClass?.enrolled ?? 0,      color: 'var(--brand-gold)'   },
            ].map(item => (
              <div key={item.label} className="p-4 bg-(--hover-overlay) rounded-2xl border border-(--border-default) text-center">
                <p className="font-mono text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="font-mono text-[11px] text-(--text-faint) mt-0.5 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card hoverable={false} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Trend</h3>
                  <p className="font-sans text-xs text-(--text-faint) mt-0.5">Session-by-session attendance rate</p>
                </div>
              </div>
              {attTrend.length > 0 ? (
                <LineChart data={attTrend} color="#34d399" height={130} />
              ) : (
                <EmptyState variant="timetable" compact description="No attendance sessions recorded yet." />
              )}
            </Card>

            <Card hoverable={false} className="space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Status Distribution</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-0.5">Breakdown of attendance statuses</p>
              </div>
              {statusDist.length > 0 ? (
                <BarChart data={statusDist} height={130} showValues />
              ) : (
                <EmptyState variant="timetable" compact description="No attendance data." />
              )}
            </Card>
          </div>

          {/* Low-attendance students */}
          {lowAtt.length > 0 && (
            <Card hoverable={false} className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-(--status-warning)" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-(--text-primary)">Low Attendance Students</h3>
                  <p className="font-sans text-xs text-(--text-faint) mt-0.5">
                    Students below {threshold}% attendance threshold
                  </p>
                </div>
                <Badge variant="amber" className="ml-auto">{lowAtt.length} at risk</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-sans min-w-[500px]">
                  <thead className="border-b border-(--border-default)">
                    <tr>
                      {['Student', 'Student ID', 'Attendance', 'Present', 'Absent', 'Sessions'].map(h => (
                        <th key={h} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-(--text-muted) text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {lowAtt.map(s => (
                      <tr key={s.studentRecordId} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-3 py-2.5 font-sans font-semibold text-(--text-primary)">{s.fullName}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-(--text-faint)">{s.studentId}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden max-w-[60px]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${s.rate}%`, backgroundColor: 'var(--status-danger)' }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-(--status-danger)">{s.rate}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-(--status-success)">{s.present}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-(--status-danger)">{s.absent}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-(--text-secondary)">{s.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {!attReport || attReport.total === 0 ? (
            <EmptyState
              variant="timetable"
              title="No attendance data"
              description="No attendance sessions have been recorded for this course yet."
            />
          ) : null}
        </>
      )}
    </motion.div>
  );
};
