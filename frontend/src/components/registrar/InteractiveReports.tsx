'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, RefreshCw, Download, Users, BookOpen,
  GraduationCap, ClipboardList, CalendarCheck, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonPage, ErrorState } from '../ui/States';
import { reportsApi, offeringsApi } from '@/src/lib/registrarApi';
import { dateToEthiopianTime } from '@/src/lib/utils';

// ── Attendance API helpers ────────────────────────────────────────────────────
async function fetchAttendanceReport(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const res = await fetch(`/api/attendance/report?${qs.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchBelowThreshold(courseOfferingId: string, threshold = 75) {
  const res = await fetch(
    `/api/attendance/below-threshold?courseOfferingId=${courseOfferingId}&threshold=${threshold}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const InteractiveReports: React.FC = () => {
  const [enrollData, setEnrollData]     = useState<any>(null);
  const [admissData, setAdmissData]     = useState<any>(null);
  const [gradData, setGradData]         = useState<any>(null);
  const [utilData, setUtilData]         = useState<any[]>([]);
  const [semesters, setSemesters]       = useState<any[]>([]);
  const [offerings, setOfferings]       = useState<any[]>([]);
  const [semesterFilter, setSF]         = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Attendance report state
  const [attendData, setAttendData]     = useState<any>(null);
  const [attendLoading, setAttendLoading] = useState(false);
  const [belowData, setBelowData]       = useState<any[]>([]);
  const [belowLoading, setBelowLoading] = useState(false);
  const [attendCourse, setAttendCourse] = useState('');
  const [attendSem, setAttendSem]       = useState('');
  const [attendPage, setAttendPage]     = useState(1);
  const ATTEND_LIMIT = 15;

  const load = useCallback(async (sem = semesterFilter) => {
    setLoading(true); setError(null);
    try {
      const [e, a, g, u, meta] = await Promise.all([
        reportsApi.enrollments({ ...(sem && { semesterId: sem }) }),
        reportsApi.admissions(),
        reportsApi.graduation(),
        reportsApi.courseUtilization(sem || undefined),
        offeringsApi.getMeta(),
      ]);
      setEnrollData(e); setAdmissData(a); setGradData(g); setUtilData(u);
      setSemesters(meta.semesters);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load reports'); }
    finally { setLoading(false); }
  }, [semesterFilter]);

  // Load offerings for attendance course filter
  const loadOfferings = useCallback(async () => {
    try {
      const res = await offeringsApi.list({ limit: 200, ...(attendSem && { semesterId: attendSem }) });
      setOfferings(res.offerings ?? []);
    } catch { /* ignore */ }
  }, [attendSem]);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadOfferings(); }, [attendSem]);

  const loadAttendance = useCallback(async (page = attendPage) => {
    setAttendLoading(true);
    try {
      const data = await fetchAttendanceReport({
        page, limit: ATTEND_LIMIT,
        ...(attendSem    && { semesterId: attendSem }),
        ...(attendCourse && { courseOfferingId: attendCourse }),
      });
      setAttendData(data);
    } catch { setAttendData(null); }
    finally { setAttendLoading(false); }
  }, [attendPage, attendSem, attendCourse]);

  const loadBelowThreshold = useCallback(async () => {
    if (!attendCourse) return;
    setBelowLoading(true);
    try {
      const data = await fetchBelowThreshold(attendCourse, 75);
      setBelowData(Array.isArray(data) ? data : (data.students ?? []));
    } catch { setBelowData([]); }
    finally { setBelowLoading(false); }
  }, [attendCourse]);

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename; a.click();
  };

  if (loading) return <SkeletonPage />;
  if (error) return <ErrorState variant="network" onRetry={() => load()} description={error} />;

  const admissByStatus = admissData?.byStatus ?? [];
  const totalApps = admissData?.total ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Interactive Reports</h2>
          <p className="text-xs text-(--text-muted)">Real-time analytics from PostgreSQL — no mock data.</p>
        </div>
        <div className="flex gap-2">
          <select value={semesterFilter} onChange={e => { setSF(e.target.value); load(e.target.value); }}
            className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option value="">All Semesters</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name} — {s.academicYear?.name}</option>)}
          </select>
          <Button variant="secondary" size="sm" onClick={() => load(semesterFilter)}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,         label: 'Active Students',    value: enrollData?.summary?.activeStudents ?? 0,     color: 'var(--brand-gold)' },
          { icon: BookOpen,      label: 'Total Enrollments',  value: enrollData?.summary?.totalEnrollments ?? 0,   color: 'var(--status-info)' },
          { icon: ClipboardList, label: 'Seat Utilization',   value: `${enrollData?.summary?.utilizationRate ?? 0}%`, color: 'var(--status-success)' },
          { icon: GraduationCap, label: 'Graduated (Year)',   value: gradData?.graduatedThisYear ?? 0,             color: 'var(--brand-gold)' },
        ].map((kpi, i) => (
          <div key={i} className="p-5 ds-card rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-[10px] font-mono text-(--text-faint) uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-mono font-bold text-(--text-primary) mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Report Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Enrollments by Program */}
        <div className="ds-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Students by Program</h3>
            <button onClick={() => exportCSV(enrollData?.byProgram ?? [], 'by_program.csv')}
              className="text-xs text-(--brand-gold) hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
          <div className="space-y-3">
            {(enrollData?.byProgram ?? []).map((p: any, i: number) => {
              const total = (enrollData?.byProgram ?? []).reduce((s: number, x: any) => s + x.count, 0) || 1;
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-(--text-secondary) truncate max-w-[70%]">{p.program}</span>
                    <span className="font-mono text-(--text-primary) font-semibold">{p.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div className="h-full bg-(--brand-gold) rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Admissions by Status */}
        <div className="ds-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Admissions by Status</h3>
            <button onClick={() => exportCSV(admissByStatus, 'admissions_status.csv')}
              className="text-xs text-(--brand-gold) hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
          <div className="space-y-3">
            {admissByStatus.map((s: any, i: number) => {
              const pct = totalApps > 0 ? Math.round((s.count / totalApps) * 100) : 0;
              const colors: Record<string, string> = { ACCEPTED: 'bg-(--status-success)', REJECTED: 'bg-(--status-danger)', SUBMITTED: 'bg-(--status-info)', UNDER_REVIEW: 'bg-(--brand-gold)', DRAFT: 'bg-(--text-faint)' };
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-(--text-secondary)">{s.status}</span>
                    <span className="font-mono text-(--text-primary) font-semibold">{s.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[s.status] ?? 'bg-(--text-faint)'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Graduation by Status */}
        <div className="ds-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Graduation Audits</h3>
            <button onClick={() => exportCSV(gradData?.byStatus ?? [], 'graduation.csv')}
              className="text-xs text-(--brand-gold) hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
          <div className="space-y-3">
            {(gradData?.byStatus ?? []).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                <span className="text-xs text-(--text-secondary)">{s.status}</span>
                <span className="font-mono text-sm font-bold text-(--text-primary)">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Course Utilization */}
        <div className="ds-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Course Utilization</h3>
            <button onClick={() => exportCSV(utilData, 'utilization.csv')}
              className="text-xs text-(--brand-gold) hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border-default)">
                  {['Code', 'Enrolled', 'Capacity', 'Util%'].map(h => (
                    <th key={h} className="pb-2 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {utilData.slice(0, 8).map((row: any, i) => (
                  <tr key={i}>
                    <td className="py-2 font-mono font-bold text-(--text-primary)">{row.code}</td>
                    <td className="py-2 text-(--text-secondary)">{row.enrolled}</td>
                    <td className="py-2 text-(--text-muted)">{row.capacity}</td>
                    <td className="py-2">
                      <span className={`font-mono font-bold ${row.utilization >= 90 ? 'text-(--status-danger)' : row.utilization >= 70 ? 'text-(--brand-gold)' : 'text-(--status-success)'}`}>
                        {row.utilization}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Attendance Reports ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
            <CalendarCheck className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Reports</h3>
            <p className="text-xs text-(--text-muted)">Session-by-session records and below-threshold alerts.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 ds-card rounded-2xl">
          <select value={attendSem} onChange={e => { setAttendSem(e.target.value); setAttendPage(1); }}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <option value="">All Semesters</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name} — {s.academicYear?.name}</option>)}
          </select>
          <select value={attendCourse} onChange={e => { setAttendCourse(e.target.value); setAttendPage(1); }}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <option value="">All Courses</option>
            {offerings.map(o => (
              <option key={o.id} value={o.id}>
                {o.course?.code ?? o.courseCode ?? o.id} — {o.course?.name ?? o.courseName ?? ''}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => loadAttendance(1)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Load Report
          </Button>
          {attendCourse && (
            <Button variant="secondary" size="sm" onClick={loadBelowThreshold}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Below 75%
            </Button>
          )}
        </div>

        {/* Below-threshold alert list */}
        {belowData.length > 0 && (
          <div className="ds-card p-5 rounded-2xl border border-(--status-danger-border) space-y-4"
            style={{ backgroundColor: 'var(--status-danger-bg)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-danger)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--status-danger)' }}>
                {belowData.length} Student{belowData.length !== 1 ? 's' : ''} Below 75% Attendance
              </h4>
              <button onClick={() => exportCSV(belowData, 'below_threshold.csv')}
                className="ml-auto text-xs flex items-center gap-1" style={{ color: 'var(--brand-gold)' }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Student', 'ID', 'Rate', 'Present', 'Absent', 'Total'].map(h => (
                      <th key={h} className="pb-2 text-left font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--text-faint)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {belowData.map((s: any, i) => (
                    <tr key={i} style={{ borderBottom: i < belowData.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                      <td className="py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{s.studentName ?? s.fullName ?? '—'}</td>
                      <td className="py-2 font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.studentId ?? '—'}</td>
                      <td className="py-2">
                        <span className="font-mono font-bold" style={{ color: 'var(--status-danger)' }}>{s.attendanceRate ?? s.rate ?? '—'}%</span>
                      </td>
                      <td className="py-2 font-mono" style={{ color: 'var(--status-success)' }}>{s.present ?? '—'}</td>
                      <td className="py-2 font-mono" style={{ color: 'var(--status-danger)' }}>{s.absent ?? '—'}</td>
                      <td className="py-2 font-mono" style={{ color: 'var(--text-muted)' }}>{s.total ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {belowLoading && <p className="text-xs text-(--text-faint) font-mono">Loading threshold data…</p>}

        {/* Attendance session records table */}
        {attendLoading ? (
          <div className="ds-card p-6 rounded-2xl"><SkeletonPage /></div>
        ) : attendData ? (
          <div className="ds-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Attendance Records
                <span className="ml-2 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
                  ({attendData.total ?? 0} total)
                </span>
              </h4>
              <button onClick={() => exportCSV(attendData?.records ?? [], 'attendance_records.csv')}
                className="text-xs flex items-center gap-1" style={{ color: 'var(--brand-gold)' }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr style={{ backgroundColor: 'var(--hover-overlay)', borderBottom: '1px solid var(--border-default)' }}>
                    {['Date', 'Course', 'Student', 'Status', 'Method', 'Marked At'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--text-faint)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(attendData.records ?? []).map((rec: any, i: number) => {
                    const statusColors: Record<string, string> = {
                      PRESENT: 'var(--status-success)', LATE: 'var(--status-warning)',
                      ABSENT: 'var(--status-danger)', EXCUSED: 'var(--text-secondary)',
                    };
                    return (
                      <tr key={rec.id ?? i} className="transition-colors"
                        style={{ borderBottom: i < (attendData.records.length - 1) ? '1px solid var(--border-subtle)' : undefined }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {rec.sessionDate ? new Date(rec.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>
                          {rec.courseCode ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {rec.studentName ?? rec.student?.fullName ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: statusColors[rec.status] ?? 'var(--text-muted)' }}>
                          {rec.status ?? '—'}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-faint)' }}>
                          {rec.method ?? 'Manual'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                          {rec.markedAt ? dateToEthiopianTime(new Date(rec.markedAt)) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(attendData.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                  Page {attendData.page} of {attendData.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={attendPage <= 1}
                    onClick={() => { setAttendPage(p => p - 1); loadAttendance(attendPage - 1); }}
                    className="p-1.5 rounded-lg border transition-colors disabled:opacity-40"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={attendPage >= (attendData.totalPages ?? 1)}
                    onClick={() => { setAttendPage(p => p + 1); loadAttendance(attendPage + 1); }}
                    className="p-1.5 rounded-lg border transition-colors disabled:opacity-40"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ds-card p-8 rounded-2xl text-center">
            <CalendarCheck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Select filters above and click "Load Report" to view attendance data.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
