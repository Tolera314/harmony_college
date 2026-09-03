'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  BarChart3, TrendingUp, TrendingDown, Users, BookOpen, CreditCard,
  Building, Calendar, Download, Printer, RefreshCw, CheckCircle2, AlertTriangle, FileText
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { BarChart, DonutChart } from '../../dh/DHCharts';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, useToast, ToastContainer } from '../../ui/States';
import {
  adminAnalyticsApi, adminFinanceApi,
  AdminAnalytics, AdminFinanceStats
} from '../../../lib/adminApi';
import { hrDashboardApi, HRDashboardData } from '../../../lib/hrApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-xl font-mono font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}ETB ${abs}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminReportsView: React.FC = () => {
  const [analytics, setAnalytics]   = useState<AdminAnalytics | null>(null);
  const [financeStats, setFinanceStats] = useState<AdminFinanceStats | null>(null);
  const [hrOverview, setHrOverview]   = useState<HRDashboardData | null>(null);

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeSection, setActiveSection] = useState<'enrollment' | 'academic' | 'attendance' | 'faculty' | 'finance' | 'hr'>('enrollment');
  const [printOpen, setPrintOpen]   = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  const fetchAllData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [analyticsData, financeData, hrData] = await Promise.all([
        adminAnalyticsApi.get(),
        adminFinanceApi.getStats().catch(() => null),
        hrDashboardApi.get().catch(() => null),
      ]);
      setAnalytics(analyticsData);
      setFinanceStats(financeData);
      setHrOverview(hrData);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load institutional analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── CSV Export Handler
  const handleExportCSV = () => {
    if (!analytics) return;
    let csvRows: string[] = [];

    if (activeSection === 'enrollment') {
      csvRows.push('Department Code,Department Name,Student Count');
      analytics.enrollment.byDepartment.forEach(d => {
        csvRows.push(`"${d.code}","${d.name}",${d.count}`);
      });
    } else if (activeSection === 'academic') {
      csvRows.push('Department Code,Department Name,Average GPA');
      analytics.academic.gpaByDept.forEach(d => {
        csvRows.push(`"${d.code}","${d.name}",${d.avgGpa.toFixed(2)}`);
      });
    } else if (activeSection === 'attendance') {
      csvRows.push('Department Code,Department Name,Attendance Rate (%)');
      analytics.attendance.byDepartment.forEach(d => {
        csvRows.push(`"${d.code}","${d.name}",${d.rate ?? 0}`);
      });
    } else if (activeSection === 'faculty') {
      csvRows.push('Department Code,Department Name,Faculty Count');
      analytics.faculty.byDepartment.forEach(d => {
        csvRows.push(`"${d.code}","${d.name}",${d.count}`);
      });
    } else if (activeSection === 'finance' && financeStats) {
      csvRows.push('Metric,Value');
      csvRows.push(`"Total Revenue Collected",${financeStats.totalRevenue}`);
      csvRows.push(`"Total Outstanding Debt",${financeStats.totalOutstanding}`);
      csvRows.push(`"Total Scholarships Granted",${financeStats.totalScholarships}`);
      csvRows.push(`"Cleared Students Count",${financeStats.clearedCount}`);
    } else if (activeSection === 'hr' && hrOverview) {
      csvRows.push('Metric,Value');
      csvRows.push(`"Total Staff",${hrOverview.kpis.totalEmployees}`);
      csvRows.push(`"Active Employees",${hrOverview.kpis.activeEmployees}`);
      csvRows.push(`"On Leave",${hrOverview.kpis.onLeave}`);
      csvRows.push(`"Pending Leave Requests",${hrOverview.kpis.pendingLeaveRequests}`);
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Harmony_College_${activeSection.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${activeSection} report to CSV successfully!`, 'success');
  };

  const sections = [
    { id: 'enrollment' as const, label: 'Enrollment' },
    { id: 'academic'   as const, label: 'Academic' },
    { id: 'attendance' as const, label: 'Attendance' },
    { id: 'faculty'    as const, label: 'Faculty' },
    { id: 'finance'    as const, label: 'Finance & Revenue' },
    { id: 'hr'         as const, label: 'HR & Staff' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Reports & Analytics Dashboard"
        subtitle="Institution-wide performance metrics across academic, operational, and financial domains"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setPrintOpen(true)}>
              Print Executive Summary
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
              Export {activeSection.toUpperCase()} CSV
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchAllData}>
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState compact description={error} onRetry={fetchAllData} />
      ) : (
        <>
          {/* Section Tabs */}
          <div className="flex gap-2 flex-wrap border-b border-(--border-subtle) pb-3">
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
              <SkeletonCard rows={5} /><SkeletonCard rows={5} />
            </div>
          ) : analytics && (
            <>
              {/* ── Enrollment ── */}
              {activeSection === 'enrollment' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MiniKPI label="Active Students"  value={analytics.enrollment.byStatus['ACTIVE'] ?? 0}    color="text-(--status-success)" />
                    <MiniKPI label="Departments"      value={analytics.enrollment.byDepartment.length}          color="text-(--brand-gold)" />
                    <MiniKPI label="Degree Programs"  value={analytics.enrollment.byProgram.length}             color="text-(--status-info)" />
                    <MiniKPI label="Avg Course Util." value={`${analytics.offerings.avgUtilization}%`}          color="text-(--status-warning)" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment by Department</h3>
                      <BarChart
                        data={analytics.enrollment.byDepartment.slice(0, 8).map(d => ({ label: d.code.slice(0, 6), value: d.count, color: 'var(--brand-gold)' }))}
                        height={160}
                      />
                    </Card>
                    <Card hoverable={false} className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">Enrollment by Year Level</h3>
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
                    <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Rate by Department</h3>
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
                    <MiniKPI label="Active Instructors" value={analytics.faculty.active}        color="text-(--status-success)" />
                    <MiniKPI label="Avg Offerings"    value={analytics.faculty.avgOfferings}    color="text-(--status-info)" />
                    <MiniKPI label="Active Courses"   value={analytics.offerings.active}        color="text-(--status-warning)" />
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
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">Course Utilization by Dept</h3>
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

              {/* ── Finance & Revenue ── */}
              {activeSection === 'finance' && (
                <div className="space-y-5">
                  {financeStats ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MiniKPI label="Total Revenue Collected" value={fmtETB(financeStats.totalRevenue)}      color="text-(--status-success)" />
                        <MiniKPI label="Outstanding Debt Owed"    value={fmtETB(financeStats.totalOutstanding)}  color="text-(--status-danger)" />
                        <MiniKPI label="Scholarships Granted"     value={fmtETB(financeStats.totalScholarships)} color="text-(--brand-gold)" />
                        <MiniKPI label="Cleared Accounts Ratio"  value={`${financeStats.clearedCount} / ${financeStats.totalAccounts}`} color="text-(--text-primary)" />
                      </div>
                      <Card hoverable={false} className="space-y-3">
                        <h3 className="font-serif text-lg font-bold text-(--text-primary)">Financial Summary & Accounts</h3>
                        <p className="font-sans text-xs text-(--text-muted)">
                          Institutional revenue and student accounts are synchronized live with PostgreSQL `FinancialTransaction` and `FinancialAccount` tables.
                        </p>
                      </Card>
                    </>
                  ) : <SkeletonCard rows={4} />}
                </div>
              )}

              {/* ── HR & Staff ── */}
              {activeSection === 'hr' && (
                <div className="space-y-5">
                  {hrOverview ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MiniKPI label="Total Staff & Faculty" value={hrOverview.kpis.totalEmployees} color="text-(--text-primary)" />
                        <MiniKPI label="Active Employees"      value={hrOverview.kpis.activeEmployees} color="text-(--status-success)" />
                        <MiniKPI label="Employees On Leave"    value={hrOverview.kpis.onLeave} color="text-(--brand-gold)" />
                        <MiniKPI label="Pending Leave Requests" value={hrOverview.kpis.pendingLeaveRequests} color="text-(--status-warning)" />
                      </div>
                      <Card hoverable={false} className="space-y-3">
                        <h3 className="font-serif text-lg font-bold text-(--text-primary)">HR & Institutional Headcount</h3>
                        <p className="font-sans text-xs text-(--text-muted)">
                          Staff employment types, leave approvals, and monthly payroll batches are managed directly through `HREmployee`, `HRLeaveRequest`, and `HRPayrollRecord`.
                        </p>
                      </Card>
                    </>
                  ) : <SkeletonCard rows={4} />}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* PRINT EXECUTIVE SUMMARY MODAL */}
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} title="Harmony College — Executive Summary Report">
        {analytics && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
              <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                  <p className="text-[11px] text-(--text-muted)">Institutional Performance Executive Summary</p>
                </div>
                <div className="text-right font-mono text-[10px] text-(--text-muted)">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-2.5 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-[10px] text-(--text-muted)">TOTAL ENROLLMENT</span>
                  <p className="text-base font-bold text-(--text-primary)">{analytics.enrollment.total} Students</p>
                </div>
                <div className="p-2.5 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-[10px] text-(--text-muted)">AVERAGE GPA</span>
                  <p className="text-base font-bold text-(--brand-gold)">{analytics.academic.avgGpa.toFixed(2)} / 4.0</p>
                </div>
                <div className="p-2.5 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-[10px] text-(--text-muted)">ATTENDANCE RATE</span>
                  <p className="text-base font-bold text-(--status-success)">{analytics.attendance.overallRate ?? 'N/A'}%</p>
                </div>
              </div>

              {financeStats && (
                <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) space-y-1">
                  <span className="font-mono text-[10px] text-(--text-muted)">FINANCIAL HIGHLIGHTS</span>
                  <div className="flex justify-between font-mono text-xs">
                    <span>Total Revenue Collected:</span>
                    <span className="font-bold text-(--status-success)">{fmtETB(financeStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-xs">
                    <span>Outstanding Student Debt:</span>
                    <span className="font-bold text-(--status-danger)">{fmtETB(financeStats.totalOutstanding)}</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-(--text-muted) italic">
                Report generated for Board of Trustees & Executive Management. Confidential.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPrintOpen(false)}>Close</Button>
              <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Executive Summary</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
