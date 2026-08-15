'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { BarChart3, RefreshCw, Download, Users, BookOpen, GraduationCap, ClipboardList } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonPage, ErrorState } from '../ui/States';
import { reportsApi, offeringsApi } from '@/src/lib/registrarApi';

export const InteractiveReports: React.FC = () => {
  const [enrollData, setEnrollData]     = useState<any>(null);
  const [admissData, setAdmissData]     = useState<any>(null);
  const [gradData, setGradData]         = useState<any>(null);
  const [utilData, setUtilData]         = useState<any[]>([]);
  const [semesters, setSemesters]       = useState<any[]>([]);
  const [semesterFilter, setSF]         = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

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

  useEffect(() => { load(); }, []);

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
    </motion.div>
  );
};
