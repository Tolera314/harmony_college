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
export { AdminAttendanceView } from './AdminAttendanceView';

// ─────────────────────────────────────────────────────────────────────────────
export { AdminFinanceView } from './AdminFinanceView';

export { AdminHRView } from './AdminHRView';

export { AdminPaymentsView } from './AdminPaymentsView';

export { AdminDocumentsView } from './AdminDocumentsView';

export { AdminReportsView } from './AdminReportsView';

export { AdminAuditLogsView } from './AdminAuditLogsView';

export { AdminSecurityView } from './AdminSecurityView';

export { AdminBackupView } from './AdminBackupView';

export { AdminSettingsView } from './AdminSettingsView';
