'use client';
/**
 * Admin cross-module views: Registrar, Attendance, Finance, HR, Documents, Reports
 * All powered by real API data — no mock arrays.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  FileText, CalendarCheck, DollarSign, Users2, FolderOpen,
  BarChart3, TrendingDown, BookOpen, AlertTriangle, ChevronLeft,
  ChevronRight, Search,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SkeletonCard, SkeletonTable, ErrorState, EmptyState } from '../../ui/States';
import { BarChart, LineChart, DonutChart } from '../../dh/DHCharts';
import {
  adminAdmissionsApi, adminAnalyticsApi, adminOfferingsApi,
  AdminAnalytics, ApiAdmission, ApiOffering,
} from '../../../lib/adminApi';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mini KPI card
// ─────────────────────────────────────────────────────────────────────────────

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
      <p className="font-mono text-[10px] uppercase text-(--text-faint)">{label}</p>
      <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminRegistrarView — admissions + offerings overview
// ─────────────────────────────────────────────────────────────────────────────

export const AdminRegistrarView: React.FC = () => {
  const [admissions, setAdmissions] = useState<ApiAdmission[]>([]);
  const [adTotal, setAdTotal]       = useState(0);
  const [adPage, setAdPage]         = useState(1);
  const [adPages, setAdPages]       = useState(1);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [analytics, setAnalytics]   = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    setLoading(true); setError('');
    Promise.all([
      adminAdmissionsApi.list({ page: adPage, limit: 10, search }),
      adminAnalyticsApi.get(),
    ]).then(([admRes, analyticsRes]) => {
      setAdmissions(admRes.applications);
      setAdTotal(admRes.total);
      setAdPages(admRes.totalPages);
      setAnalytics(analyticsRes);
    }).catch(e => setError(e.message ?? 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [adPage, search]);

  const STATUS_BADGE: Record<string, 'emerald' | 'amber' | 'rose' | 'glass' | 'gold'> = {
    ACCEPTED: 'emerald', SUBMITTED: 'gold', UNDER_REVIEW: 'amber',
    REJECTED: 'rose', DRAFT: 'glass', WAITLISTED: 'amber',
  };
  const STATUS_LABEL: Record<string, string> = {
    ACCEPTED: 'Accepted', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
    REJECTED: 'Rejected', DRAFT: 'Draft', WAITLISTED: 'Waitlisted',
  };

  if (error) return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="pb-16">
      <ErrorState compact description={error} onRetry={() => { setLoading(true); setError(''); setAdPage(1); }} />
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Registrar" subtitle="Enrollment, admissions, and academic records" icon={<FileText className="w-5 h-5" />} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniKPI label="Active Students"    value={analytics.enrollment.byStatus['ACTIVE'] ?? 0}    color="text-(--status-success)" />
          <MiniKPI label="Total Admissions"   value={adTotal}                                          color="text-(--brand-gold)" />
          <MiniKPI label="Active Offerings"   value={analytics.offerings.active}                       color="text-(--status-info)" />
          <MiniKPI label="At-Risk Students"   value={analytics.academic.atRiskCount}                   color="text-(--status-danger)" />
        </div>
      )}

      {/* Admissions table */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Admissions</h3>
          <div className="w-64">
            <Input icon={<Search className="w-4 h-4" />} placeholder="Search applicants..."
              value={search} onChange={e => { setSearch(e.target.value); setAdPage(1); }} />
          </div>
        </div>
        {loading ? <SkeletonTable rows={6} cols={5} /> : admissions.length === 0 ? (
          <EmptyState compact description="No admissions match your search." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans min-w-[600px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>{['Applicant', 'Program', 'Year', 'Onboarding', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {admissions.map(a => (
                    <tr key={a.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-(--text-primary)">{a.user.fullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{a.user.email ?? a.user.phone ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--brand-gold)">{a.program}</td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{a.academicYear}</td>
                      <td className="px-4 py-3"><Badge variant={a.onboardingStatus === 'APPROVED' ? 'emerald' : a.onboardingStatus === 'SUBMITTED' ? 'gold' : 'glass'} className="text-[10px]">{a.onboardingStatus}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={STATUS_BADGE[a.status] ?? 'glass'} className="text-[10px]">{STATUS_LABEL[a.status] ?? a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {adPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="font-sans text-xs text-(--text-faint)">{adTotal} applications · Page {adPage} of {adPages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setAdPage(p => Math.max(1, p - 1))} disabled={adPage === 1}>Prev</Button>
                  <Button variant="secondary" size="sm"
                    onClick={() => setAdPage(p => Math.min(adPages, p + 1))} disabled={adPage === adPages}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminAttendanceView — institution-wide attendance analytics
// ─────────────────────────────────────────────────────────────────────────────

export const AdminAttendanceView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    adminAnalyticsApi.get()
      .then(setAnalytics)
      .catch(e => setError(e.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (error) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16">
      <ErrorState compact description={error} onRetry={() => { setLoading(true); setError(''); adminAnalyticsApi.get().then(setAnalytics).finally(() => setLoading(false)); }} />
    </motion.div>
  );

  const att = analytics?.attendance;
  const barData = att?.byDepartment?.map(d => ({
    label: d.code.slice(0, 6),
    value: d.rate ?? 0,
    color: (d.rate ?? 0) >= 90 ? 'var(--status-success)' : (d.rate ?? 0) >= 80 ? 'var(--brand-gold)' : 'var(--status-danger)',
  })) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Attendance"
        subtitle={att ? `${att.lowAttendanceCount} students below 80% threshold` : 'Loading...'}
        icon={<CalendarCheck className="w-5 h-5" />}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : att && (
        <>
          {att.lowAttendanceCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
              <p className="font-sans text-sm font-semibold text-(--status-warning)">
                {att.lowAttendanceCount} student{att.lowAttendanceCount !== 1 ? 's' : ''} below the 80% attendance requirement.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniKPI label="Overall Rate"    value={att.overallRate !== null ? `${att.overallRate}%` : 'N/A'} color="text-(--brand-gold)" />
            <MiniKPI label="Departments"     value={att.byDepartment.length}                                    color="text-(--status-info)" />
            <MiniKPI label="Below 80%"       value={att.lowAttendanceCount}                                     color="text-(--status-danger)" />
            <MiniKPI label="Above 90%"       value={att.byDepartment.filter(d => (d.rate ?? 0) >= 90).length}  color="text-(--status-success)" />
          </div>

          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Rate by Department</h3>
            {barData.length > 0 ? <BarChart data={barData} height={150} /> : (
              <EmptyState variant="attendance" compact />
            )}
          </Card>

          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Department Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>{['Department', 'Total Records', 'Present', 'Rate'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {att.byDepartment.map(d => (
                    <tr key={d.code} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-semibold text-(--text-primary)">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{d.total}</td>
                      <td className="px-4 py-3 font-mono text-xs text-(--status-success)">{d.present}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm font-bold ${(d.rate ?? 0) >= 90 ? 'text-(--status-success)' : (d.rate ?? 0) >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)'}`}>
                          {d.rate !== null ? `${d.rate}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminFinanceView — financial account overview using real student financial data
// ─────────────────────────────────────────────────────────────────────────────

export const AdminFinanceView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    adminAnalyticsApi.get()
      .then(setAnalytics)
      .catch(e => setError(e.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (error) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16">
      <ErrorState compact description={error} onRetry={() => { setLoading(true); setError(''); adminAnalyticsApi.get().then(setAnalytics).finally(() => setLoading(false)); }} />
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Finance" subtitle="Financial overview and enrollment metrics" icon={<DollarSign className="w-5 h-5" />} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : analytics && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniKPI label="Active Students"  value={analytics.enrollment.byStatus['ACTIVE'] ?? 0}   color="text-(--status-success)" />
            <MiniKPI label="Total Enrolled"   value={analytics.enrollment.total}                       color="text-(--brand-gold)" />
            <MiniKPI label="Total Programs"   value={analytics.enrollment.byProgram.length}             color="text-(--status-info)" />
            <MiniKPI label="Avg GPA"          value={analytics.academic.avgGpa.toFixed(2)}              color="text-(--status-success)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment by Department</h3>
              {analytics.enrollment.byDepartment.length > 0 ? (
                <BarChart
                  data={analytics.enrollment.byDepartment.slice(0, 8).map(d => ({
                    label: d.code.slice(0, 6),
                    value: d.count,
                    color: 'var(--brand-gold)',
                  }))}
                  height={150}
                />
              ) : <EmptyState compact description="No enrollment data available." />}
            </Card>

            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Students by Year Level</h3>
              {analytics.enrollment.byYearLevel.length > 0 ? (
                <DonutChart
                  segments={analytics.enrollment.byYearLevel.map((y, i) => ({
                    label: `Year ${y.year}`,
                    value: y.count,
                    color: ['var(--brand-gold)', 'var(--status-success)', 'var(--status-info)', 'var(--status-warning)', 'var(--status-danger)'][i % 5],
                  }))}
                  total={analytics.enrollment.total}
                  centerLabel={String(analytics.enrollment.total)}
                />
              ) : <EmptyState compact description="No year-level data available." />}
            </Card>
          </div>

          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Top Enrolled Programs</h3>
            <div className="space-y-2">
              {analytics.enrollment.byProgram.slice(0, 8).map((p, i) => (
                <div key={p.code} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-(--text-faint) w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans text-xs font-semibold text-(--text-primary)">{p.code}</span>
                      <span className="font-mono text-xs text-(--text-faint)">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-(--brand-gold)"
                        style={{ width: `${Math.min(100, (p.count / (analytics.enrollment.byProgram[0]?.count ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminHRView — faculty/staff analytics from real DB
// ─────────────────────────────────────────────────────────────────────────────

export const AdminHRView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    adminAnalyticsApi.get()
      .then(setAnalytics)
      .catch(e => setError(e.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (error) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16">
      <ErrorState compact description={error} onRetry={() => { setLoading(true); setError(''); adminAnalyticsApi.get().then(setAnalytics).finally(() => setLoading(false)); }} />
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="HR Management" subtitle="System-wide staff and faculty overview" icon={<Users2 className="w-5 h-5" />} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : analytics && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniKPI label="Total Faculty"   value={analytics.faculty.total}                                   color="text-(--brand-gold)" />
            <MiniKPI label="Active Faculty"  value={analytics.faculty.active}                                  color="text-(--status-success)" />
            <MiniKPI label="Avg Offerings"   value={analytics.faculty.avgOfferings}                            color="text-(--status-info)" />
            <MiniKPI label="Departments"     value={analytics.faculty.byDepartment.length}                     color="text-(--text-primary)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Faculty by Department</h3>
              {analytics.faculty.byDepartment.length > 0 ? (
                <BarChart
                  data={analytics.faculty.byDepartment.map(d => ({
                    label: d.code.slice(0, 6),
                    value: d.count,
                    color: 'var(--brand-gold)',
                  }))}
                  height={150}
                />
              ) : <EmptyState variant="faculty" compact />}
            </Card>

            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Course Offerings Utilization</h3>
              {analytics.offerings.byDepartment.length > 0 ? (
                <DonutChart
                  segments={analytics.offerings.byDepartment.slice(0, 6).map((d, i) => ({
                    label: d.code,
                    value: d.active,
                    color: ['var(--brand-gold)', 'var(--status-success)', 'var(--status-info)', 'var(--status-warning)', 'var(--status-danger)', '#a855f7'][i],
                  }))}
                  total={analytics.offerings.active}
                  centerLabel={String(analytics.offerings.active)}
                />
              ) : <EmptyState compact description="No offerings data." />}
            </Card>
          </div>

          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Faculty Distribution Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>{['Department', 'Active Faculty', 'Active Offerings', 'Utilization'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {analytics.faculty.byDepartment.map(d => {
                    const offd = analytics.offerings.byDepartment.find(o => o.code === d.code);
                    return (
                      <tr key={d.code} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">{d.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-(--status-success)">{d.count}</td>
                        <td className="px-4 py-3 font-mono text-xs text-(--status-info)">{offd?.active ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs text-(--brand-gold)">
                          {offd && offd.total > 0 ? `${Math.round((offd.active / offd.total) * 100)}%` : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminDocumentsView — document categories (application docs)
// ─────────────────────────────────────────────────────────────────────────────

export const AdminDocumentsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    adminAnalyticsApi.get().then(setAnalytics).finally(() => setLoading(false));
  }, []);

  const categories = [
    { title: 'Student Application Docs',   icon: <FileText className="w-8 h-8 text-(--brand-gold)" />,        desc: 'ID, transcripts, forms' },
    { title: 'Academic Records',           icon: <BookOpen className="w-8 h-8 text-(--status-info)" />,        desc: 'Grades, certificates, transcripts' },
    { title: 'Employee Contracts & CV',    icon: <Users2 className="w-8 h-8 text-(--status-success)" />,       desc: 'HR documents, NDAs, agreements' },
    { title: 'Financial Records',          icon: <DollarSign className="w-8 h-8 text-(--status-warning)" />,   desc: 'Receipts, payment proofs' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Documents" subtitle="System-wide document management" icon={<FolderOpen className="w-5 h-5" />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map(cat => (
          <Card key={cat.title} hoverable className="space-y-3">
            {cat.icon}
            <p className="font-sans text-sm font-semibold text-(--text-primary)">{cat.title}</p>
            <p className="font-sans text-xs text-(--text-faint)">{cat.desc}</p>
          </Card>
        ))}
      </div>

      {!loading && analytics && (
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Document Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniKPI label="Active Students"  value={analytics.enrollment.byStatus['ACTIVE'] ?? 0}  color="text-(--status-success)" />
            <MiniKPI label="Graduated"        value={analytics.enrollment.byStatus['GRADUATED'] ?? 0} color="text-(--brand-gold)" />
            <MiniKPI label="Total Faculty"    value={analytics.faculty.total}                          color="text-(--status-info)" />
            <MiniKPI label="Total Courses"    value={analytics.courses.total}                           color="text-(--text-primary)" />
          </div>
          <p className="font-sans text-xs text-(--text-muted)">
            Document storage is managed through the file upload system. Navigate to individual student,
            employee, or application records to view and manage documents.
          </p>
        </Card>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminReportsView — comprehensive analytics dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const AdminReportsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeSection, setActiveSection] = useState<'enrollment' | 'academic' | 'attendance' | 'faculty'>('enrollment');

  useEffect(() => {
    adminAnalyticsApi.get()
      .then(setAnalytics)
      .catch(e => setError(e.message ?? 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    { id: 'enrollment' as const, label: 'Enrollment' },
    { id: 'academic'   as const, label: 'Academic' },
    { id: 'attendance' as const, label: 'Attendance' },
    { id: 'faculty'    as const, label: 'Faculty' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Reports & Analytics"
        subtitle="Institution-wide performance metrics"
        icon={<BarChart3 className="w-5 h-5" />}
      />

      {error ? (
        <ErrorState compact description={error} onRetry={() => { setLoading(true); setError(''); adminAnalyticsApi.get().then(setAnalytics).finally(() => setLoading(false)); }} />
      ) : (
        <>
          {/* Section tabs */}
          <div className="flex gap-2 flex-wrap">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-4 py-2 rounded-xl font-sans text-xs font-semibold transition-all border ${
                  activeSection === s.id
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                    : 'text-(--text-secondary) hover:bg-(--hover-overlay) border-(--border-default)'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SkeletonCard rows={4} /><SkeletonCard rows={4} />
            </div>
          ) : analytics && (
            <>
              {/* ── Enrollment ── */}
              {activeSection === 'enrollment' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MiniKPI label="Active Students"  value={analytics.enrollment.byStatus['ACTIVE'] ?? 0}    color="text-(--status-success)" />
                    <MiniKPI label="Departments"      value={analytics.enrollment.byDepartment.length}          color="text-(--brand-gold)" />
                    <MiniKPI label="Programs"         value={analytics.enrollment.byProgram.length}             color="text-(--status-info)" />
                    <MiniKPI label="Avg Util."        value={`${analytics.offerings.avgUtilization}%`}          color="text-(--status-warning)" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">By Department</h3>
                      <BarChart
                        data={analytics.enrollment.byDepartment.slice(0, 8).map(d => ({ label: d.code.slice(0, 6), value: d.count, color: 'var(--brand-gold)' }))}
                        height={160}
                      />
                    </Card>
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">By Year Level</h3>
                      <DonutChart
                        segments={analytics.enrollment.byYearLevel.map((y, i) => ({
                          label: `Year ${y.year}`, value: y.count,
                          color: ['var(--brand-gold)', 'var(--status-success)', 'var(--status-info)', 'var(--status-warning)', 'var(--status-danger)'][i % 5],
                        }))}
                        total={analytics.enrollment.total}
                        centerLabel={String(analytics.enrollment.total)}
                      />
                    </Card>
                  </div>
                  <Card hoverable={false} className="space-y-3">
                    <h3 className="font-serif text-lg font-bold text-(--text-primary)">Top Programs by Enrollment</h3>
                    <div className="space-y-2">
                      {analytics.enrollment.byProgram.slice(0, 10).map((p, i) => (
                        <div key={p.code} className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-(--text-faint) w-5 shrink-0">{i + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-sans text-xs text-(--text-primary)">{p.name}</span>
                              <span className="font-mono text-xs text-(--brand-gold) font-bold">{p.count}</span>
                            </div>
                            <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-(--brand-gold)"
                                style={{ width: `${Math.min(100, (p.count / (analytics.enrollment.byProgram[0]?.count ?? 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* ── Academic ── */}
              {activeSection === 'academic' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MiniKPI label="Avg GPA"       value={analytics.academic.avgGpa.toFixed(2)} color="text-(--brand-gold)" />
                    <MiniKPI label="At-Risk (<2.0)" value={analytics.academic.atRiskCount}       color="text-(--status-danger)" />
                    <MiniKPI label="Grade Entries"  value={analytics.academic.gradeDist.reduce((s, g) => s + g.count, 0)} color="text-(--status-info)" />
                    <MiniKPI label="Departments"    value={analytics.academic.gpaByDept.length}  color="text-(--status-success)" />
                  </div>
                  {analytics.academic.atRiskCount > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-2xl">
                      <TrendingDown className="w-5 h-5 text-(--status-danger) shrink-0" />
                      <p className="font-sans text-sm font-semibold text-(--status-danger)">
                        {analytics.academic.atRiskCount} active students have GPA below 2.0 and may be at academic risk.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">GPA by Department</h3>
                      <BarChart
                        data={analytics.academic.gpaByDept.map(d => ({
                          label: d.code.slice(0, 6), value: d.avgGpa,
                          color: d.avgGpa >= 3.5 ? 'var(--status-success)' : d.avgGpa >= 3.0 ? 'var(--brand-gold)' : 'var(--status-danger)',
                        }))}
                        height={160}
                      />
                    </Card>
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">Grade Distribution</h3>
                      {analytics.academic.gradeDist.length > 0 ? (
                        <DonutChart
                          segments={analytics.academic.gradeDist.slice(0, 8).map((g, i) => ({
                            label: g.grade ?? '?', value: g.count,
                            color: ['var(--status-success)', 'var(--brand-gold)', 'var(--status-info)', 'var(--status-warning)', 'var(--status-danger)', '#a855f7', '#ec4899', '#14b8a6'][i % 8],
                          }))}
                          total={analytics.academic.gradeDist.reduce((s, g) => s + g.count, 0)}
                          centerLabel="Grades"
                        />
                      ) : <EmptyState compact description="No grade data recorded yet." />}
                    </Card>
                  </div>
                </div>
              )}

              {/* ── Attendance ── */}
              {activeSection === 'attendance' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MiniKPI label="Overall Rate"     value={analytics.attendance.overallRate !== null ? `${analytics.attendance.overallRate}%` : 'N/A'} color="text-(--brand-gold)" />
                    <MiniKPI label="Below 80%"        value={analytics.attendance.lowAttendanceCount} color="text-(--status-danger)" />
                    <MiniKPI label="Departments"      value={analytics.attendance.byDepartment.length} color="text-(--status-info)" />
                    <MiniKPI label="Above 90%"        value={analytics.attendance.byDepartment.filter(d => (d.rate ?? 0) >= 90).length} color="text-(--status-success)" />
                  </div>
                  <Card hoverable={false} className="space-y-4">
                    <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance by Department</h3>
                    {analytics.attendance.byDepartment.length > 0 ? (
                      <BarChart
                        data={analytics.attendance.byDepartment.map(d => ({
                          label: d.code.slice(0, 6), value: d.rate ?? 0,
                          color: (d.rate ?? 0) >= 90 ? 'var(--status-success)' : (d.rate ?? 0) >= 80 ? 'var(--brand-gold)' : 'var(--status-danger)',
                        }))}
                        height={160}
                      />
                    ) : <EmptyState variant="attendance" compact />}
                  </Card>
                </div>
              )}

              {/* ── Faculty ── */}
              {activeSection === 'faculty' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MiniKPI label="Total Faculty"    value={analytics.faculty.total}          color="text-(--brand-gold)" />
                    <MiniKPI label="Active"           value={analytics.faculty.active}          color="text-(--status-success)" />
                    <MiniKPI label="Avg Offerings"    value={analytics.faculty.avgOfferings}    color="text-(--status-info)" />
                    <MiniKPI label="Active Offerings" value={analytics.offerings.active}        color="text-(--status-warning)" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">Faculty by Department</h3>
                      <BarChart
                        data={analytics.faculty.byDepartment.map(d => ({ label: d.code.slice(0, 6), value: d.count, color: 'var(--brand-gold)' }))}
                        height={160}
                      />
                    </Card>
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">Offering Utilization by Dept</h3>
                      {analytics.offerings.byDepartment.length > 0 ? (
                        <DonutChart
                          segments={analytics.offerings.byDepartment.slice(0, 6).map((d, i) => ({
                            label: d.code, value: d.active,
                            color: ['var(--brand-gold)', 'var(--status-success)', 'var(--status-info)', 'var(--status-warning)', 'var(--status-danger)', '#a855f7'][i],
                          }))}
                          total={analytics.offerings.active}
                          centerLabel={`${analytics.offerings.avgUtilization}%`}
                        />
                      ) : <EmptyState compact description="No offerings data." />}
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
};
