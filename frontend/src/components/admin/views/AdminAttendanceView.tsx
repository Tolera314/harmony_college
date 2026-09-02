'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CalendarCheck, AlertTriangle, Search, Filter, RefreshCw,
  ChevronLeft, ChevronRight, Eye, Edit, CheckCircle2, XCircle, Clock, FileText,
  User, BookOpen, Building2, UserCheck
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { BarChart } from '../../dh/DHCharts';
import {
  SkeletonCard, SkeletonTable, EmptyState, ErrorState,
  InlineError, useToast, ToastContainer
} from '../../ui/States';
import {
  adminAttendanceApi, adminDepartmentsApi,
  AdminAttendanceStats, AdminAttendanceRecordItem, AdminAttendanceRecordDetail,
  AdminAttendanceTrends, AdminLowAttendanceStudentItem, AdminStudentAttendanceDetail,
  AdminCourseAttendanceDetail, AdminDepartmentAttendance, ApiDepartment
} from '../../../lib/adminApi';

// ── Badges & Formatter Helpers ───────────────────────────────────────────────

const STATUS_BADGES: Record<string, 'emerald' | 'rose' | 'amber' | 'gold'> = {
  PRESENT: 'emerald',
  ABSENT:  'rose',
  LATE:    'amber',
  EXCUSED: 'gold',
};

const METHOD_LABELS: Record<string, string> = {
  MANUAL:       'Manual',
  QR_CODE:      'QR Code',
  SELF_CHECKIN: 'Self Check-in',
  SYSTEM:       'System',
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminAttendanceView: React.FC = () => {
  // Active sub-tab
  const [tab, setTab] = useState<'overview' | 'records' | 'low' | 'departments'>('overview');

  // Stats & Reference Data
  const [stats, setStats]               = useState<AdminAttendanceStats | null>(null);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError]     = useState('');

  // ── Records Tab State
  const [records, setRecords]           = useState<AdminAttendanceRecordItem[]>([]);
  const [recTotal, setRecTotal]         = useState(0);
  const [recPage, setRecPage]           = useState(1);
  const [recPages, setRecPages]         = useState(1);
  const [recLoading, setRecLoading]     = useState(false);
  const [recError, setRecError]         = useState('');

  // Filters
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter]     = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Low Attendance Tab State
  const [lowStudents, setLowStudents]   = useState<AdminLowAttendanceStudentItem[]>([]);
  const [lowTotal, setLowTotal]         = useState(0);
  const [lowPage, setLowPage]           = useState(1);
  const [lowPages, setLowPages]         = useState(1);
  const [lowLoading, setLowLoading]     = useState(false);
  const [threshold, setThreshold]       = useState(75);

  // ── Department Analytics Tab State
  const [deptAnalytics, setDeptAnalytics] = useState<AdminDepartmentAttendance[]>([]);
  const [deptLoading, setDeptLoading]     = useState(false);

  // ── Trends State
  const [trendsData, setTrendsData]     = useState<AdminAttendanceTrends | null>(null);

  // ── Modals / Drawers State
  const [selectedRecordId, setSelectedRecordId]   = useState<string | null>(null);
  const [recordDetail, setRecordDetail]           = useState<AdminAttendanceRecordDetail | null>(null);
  const [detailLoading, setDetailLoading]         = useState(false);

  // Correction Modal
  const [correcting, setCorrecting]               = useState(false);
  const [newStatus, setNewStatus]                 = useState<'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>('PRESENT');
  const [correctReason, setCorrectReason]         = useState('');
  const [correctError, setCorrectError]           = useState('');

  // Student Detail Drawer
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail]         = useState<AdminStudentAttendanceDetail | null>(null);
  const [studentLoading, setStudentLoading]       = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Initial Stats & Ref Fetch
  const fetchStats = useCallback(async () => {
    setStatsLoading(true); setStatsError('');
    try {
      const [st, depts, tr] = await Promise.all([
        adminAttendanceApi.getStats({ departmentId: deptFilter || undefined }),
        adminDepartmentsApi.list(),
        adminAttendanceApi.getTrends({ departmentId: deptFilter || undefined }),
      ]);
      setStats(st);
      setDepartments(depts.filter(d => d.isActive));
      setTrendsData(tr);
    } catch (e: any) {
      setStatsError(e.message ?? 'Failed to load attendance statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [deptFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch Records
  const fetchRecords = useCallback(async () => {
    setRecLoading(true); setRecError('');
    try {
      const res = await adminAttendanceApi.listRecords({
        page: recPage,
        limit: 12,
        search,
        status: statusFilter || undefined,
        departmentId: deptFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setRecords(res.records);
      setRecTotal(res.total);
      setRecPages(res.totalPages);
    } catch (e: any) {
      setRecError(e.message ?? 'Failed to load records');
    } finally {
      setRecLoading(false);
    }
  }, [recPage, search, statusFilter, deptFilter, startDate, endDate]);

  useEffect(() => {
    if (tab === 'records') {
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => fetchRecords(), 280);
    }
  }, [tab, recPage, search, statusFilter, deptFilter, startDate, endDate, fetchRecords]);

  // ── Fetch Low Attendance
  const fetchLowAttendance = useCallback(async () => {
    setLowLoading(true);
    try {
      const res = await adminAttendanceApi.getLowAttendance({
        page: lowPage,
        limit: 10,
        search,
        threshold,
        departmentId: deptFilter || undefined,
      });
      setLowStudents(res.students);
      setLowTotal(res.total);
      setLowPages(res.totalPages);
    } catch {
      showToast('Failed to load low attendance students', 'error');
    } finally {
      setLowLoading(false);
    }
  }, [lowPage, search, threshold, deptFilter, showToast]);

  useEffect(() => {
    if (tab === 'low') fetchLowAttendance();
  }, [tab, lowPage, threshold, search, deptFilter, fetchLowAttendance]);

  // ── Fetch Department Analytics
  const fetchDepartmentAnalytics = useCallback(async () => {
    setDeptLoading(true);
    try {
      const res = await adminAttendanceApi.getDepartmentAnalytics({ departmentId: deptFilter || undefined });
      setDeptAnalytics(res);
    } catch {
      showToast('Failed to load department analytics', 'error');
    } finally {
      setDeptLoading(false);
    }
  }, [deptFilter, showToast]);

  useEffect(() => {
    if (tab === 'departments') fetchDepartmentAnalytics();
  }, [tab, deptFilter, fetchDepartmentAnalytics]);

  // ── Open Record Detail
  const openRecordDetail = async (recordId: string) => {
    setSelectedRecordId(recordId); setDetailLoading(true); setRecordDetail(null); setCorrectError('');
    try {
      const detail = await adminAttendanceApi.getRecordDetail(recordId);
      setRecordDetail(detail);
      setNewStatus(detail.status);
      setCorrectReason('');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load record details', 'error');
      setSelectedRecordId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Handle Attendance Correction
  const handleCorrectRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordDetail) return;
    if (!correctReason || correctReason.trim().length < 5) {
      setCorrectError('Please enter a detailed reason (at least 5 characters).');
      return;
    }
    setCorrectError(''); setCorrecting(true);
    try {
      await adminAttendanceApi.correctRecord(recordDetail.id, newStatus, correctReason.trim());
      showToast(`Attendance updated to ${newStatus}`, 'success');
      // Refresh details & records
      openRecordDetail(recordDetail.id);
      fetchStats();
      if (tab === 'records') fetchRecords();
    } catch (err: any) {
      setCorrectError(err.message ?? 'Failed to correct attendance record');
    } finally {
      setCorrecting(false);
    }
  };

  // ── Open Student Detail Drawer
  const openStudentDetail = async (studentId: string) => {
    setSelectedStudentId(studentId); setStudentLoading(true); setStudentDetail(null);
    try {
      const res = await adminAttendanceApi.getStudentDetail(studentId);
      setStudentDetail(res);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load student attendance', 'error');
      setSelectedStudentId(null);
    } finally {
      setStudentLoading(false);
    }
  };

  // Department Bar Chart Data
  const deptBarData = trendsData?.byDepartment.map(d => ({
    label: d.code.slice(0, 6),
    value: d.rate ?? 0,
    color: (d.rate ?? 0) >= 90 ? 'var(--status-success)' : (d.rate ?? 0) >= 80 ? 'var(--brand-gold)' : 'var(--status-danger)',
  })) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Attendance Management"
        subtitle={stats ? `Institution-wide rate: ${stats.overallRate !== null ? stats.overallRate + '%' : 'N/A'} · ${stats.lowAttendanceCount} students at-risk` : 'Loading institutional attendance data...'}
        icon={<CalendarCheck className="w-5 h-5" />}
        actions={
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchStats(); if (tab === 'records') fetchRecords(); }}>
            Refresh
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : statsError ? (
        <ErrorState compact description={statsError} onRetry={fetchStats} />
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <MiniKPI label="Overall Rate"    value={stats.overallRate !== null ? `${stats.overallRate}%` : 'N/A'} color="text-(--brand-gold)" />
          <MiniKPI label="Today's Rate"    value={stats.todayRate !== null ? `${stats.todayRate}%` : 'N/A'}   color="text-(--status-info)" />
          <MiniKPI label="Present"         value={stats.present}                                              color="text-(--status-success)" />
          <MiniKPI label="Absent"          value={stats.absent}                                               color="text-(--status-danger)" />
          <MiniKPI label="Late / Excused"  value={stats.late + stats.excused}                                 color="text-(--status-warning)" />
          <MiniKPI label="At-Risk (<75%)"  value={stats.lowAttendanceCount}                                   color="text-(--status-danger)" />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-(--border-default) gap-6 font-sans text-xs overflow-x-auto">
        <button
          onClick={() => setTab('overview')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'overview' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          📊 Overview & Trends
          {tab === 'overview' && <motion.div layoutId="attTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('records')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'records' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          📋 Attendance Records ({recTotal})
          {tab === 'records' && <motion.div layoutId="attTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('low')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${tab === 'low' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          ⚠️ Low Attendance
          {stats && stats.lowAttendanceCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-(--status-danger-bg) text-(--status-danger) font-bold">
              {stats.lowAttendanceCount}
            </span>
          )}
          {tab === 'low' && <motion.div layoutId="attTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('departments')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'departments' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          🏢 Department Analytics
          {tab === 'departments' && <motion.div layoutId="attTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by student name, ID, course code..."
            value={search}
            onChange={e => { setSearch(e.target.value); setRecPage(1); setLowPage(1); }}
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setRecPage(1); setLowPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
        </select>
        {tab === 'records' && (
          <>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setRecPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setRecPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
              title="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setRecPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
              title="End Date"
            />
          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW & TRENDS */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {stats && stats.lowAttendanceCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-(--status-warning)">
                  Institutional Alert: {stats.lowAttendanceCount} student{stats.lowAttendanceCount !== 1 ? 's are' : ' is'} below the 75% attendance threshold.
                </p>
                <p className="font-sans text-xs text-(--text-secondary) mt-0.5">
                  Click on the <strong>Low Attendance</strong> tab to inspect affected students and trigger academic notifications.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Attendance Rate by Department</h3>
              {deptBarData.length > 0 ? (
                <BarChart data={deptBarData} height={160} />
              ) : (
                <EmptyState variant="attendance" compact description="No department attendance data available." />
              )}
            </Card>

            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent 30-Day Daily Attendance Trend</h3>
              {trendsData && trendsData.trends.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-(--text-muted)">
                    <span>Date</span>
                    <span>Present / Total</span>
                    <span>Rate</span>
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {trendsData.trends.slice(-7).reverse().map(t => (
                      <div key={t.date} className="flex items-center justify-between p-2 rounded-lg bg-(--hover-overlay) text-xs font-sans">
                        <span className="font-mono text-(--text-primary)">{formatDate(t.date)}</span>
                        <span className="font-mono text-(--text-secondary)">{t.present} / {t.total} records</span>
                        <span className={`font-mono font-bold ${t.rate >= 90 ? 'text-(--status-success)' : t.rate >= 75 ? 'text-(--brand-gold)' : 'text-(--status-danger)'}`}>
                          {t.rate}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState variant="attendance" compact description="No daily trend data available." />
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE RECORDS TABLE */}
      {tab === 'records' && (
        <div className="space-y-4">
          {recLoading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : recError ? (
            <ErrorState compact description={recError} onRetry={fetchRecords} />
          ) : records.length === 0 ? (
            <EmptyState variant="attendance" compact description="No attendance records match your search and filter criteria." />
          ) : (
            <>
              <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
                <table className="w-full text-left text-xs font-sans min-w-[850px]">
                  <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                    <tr>
                      {['Student', 'Student ID', 'Course', 'Instructor', 'Date & Session', 'Status', 'Method', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {records.map(r => (
                      <tr key={r.id} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">
                          <button
                            onClick={() => openStudentDetail(r.student.id)}
                            className="hover:underline text-(--brand-gold) text-left font-medium"
                          >
                            {r.student.fullName}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{r.student.studentId}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-(--text-primary)">{r.course.code}</span>
                          <span className="block text-[11px] text-(--text-muted) truncate max-w-[160px]">{r.course.name}</span>
                        </td>
                        <td className="px-4 py-3 text-(--text-secondary)">{r.instructor.fullName}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-(--text-primary)">{formatDate(r.session.date)}</span>
                          <span className="block text-[11px] text-(--text-muted)">{r.session.startTime} - {r.session.endTime}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGES[r.status] ?? 'glass'}>
                            {r.status}
                          </Badge>
                          {r.correctedAt && (
                            <span className="block text-[10px] text-(--brand-gold) mt-0.5">Corrected</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-(--text-muted)">
                          {METHOD_LABELS[r.method] ?? r.method}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => openRecordDetail(r.id)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-sans text-(--text-muted)">
                  Showing {records.length} of {recTotal} records (Page {recPage} of {recPages})
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={recPage <= 1}
                    icon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setRecPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={recPage >= recPages}
                    icon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setRecPage(p => Math.min(recPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: LOW ATTENDANCE LIST */}
      {tab === 'low' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
            <div>
              <h3 className="font-serif text-sm font-bold text-(--text-primary)">Low Attendance Policy Threshold</h3>
              <p className="font-sans text-xs text-(--text-secondary)">Flag students with overall attendance rate below threshold.</p>
            </div>
            <select
              value={threshold}
              onChange={e => { setThreshold(parseInt(e.target.value, 10)); setLowPage(1); }}
              className="px-3 py-1.5 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs font-bold text-(--brand-gold)"
            >
              <option value="80">Below 80% Requirement</option>
              <option value="75">Below 75% Institutional Min</option>
              <option value="60">Below 60% Critical Risk</option>
            </select>
          </div>

          {lowLoading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : lowStudents.length === 0 ? (
            <EmptyState variant="attendance" compact description={`No students currently below ${threshold}% attendance.`} />
          ) : (
            <>
              <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
                <table className="w-full text-left text-xs font-sans min-w-[800px]">
                  <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                    <tr>
                      {['Student', 'Student ID', 'Department / Program', 'Sessions Attended', 'Missed Sessions', 'Attendance Rate', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {lowStudents.map(item => (
                      <tr key={item.student.id} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">
                          {item.student.user.fullName}
                          <span className="block text-[11px] text-(--text-muted)">{item.student.user.email}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{item.student.studentId}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-(--text-primary)">{item.student.department?.code ?? 'N/A'}</span>
                          <span className="block text-[11px] text-(--text-muted)">{item.student.program?.name ?? ''}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--status-success)">
                          {item.present + item.late} / {item.totalSessions}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--status-danger)">
                          {item.absent} missed
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-sm text-(--status-danger)">
                          {item.attendanceRate}%
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<User className="w-3.5 h-3.5" />}
                            onClick={() => openStudentDetail(item.student.id)}
                          >
                            View History
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-sans text-(--text-muted)">
                  Showing {lowStudents.length} of {lowTotal} at-risk students
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={lowPage <= 1} onClick={() => setLowPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={lowPage >= lowPages} onClick={() => setLowPage(p => Math.min(lowPages, p + 1))}>Next</Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: DEPARTMENT ANALYTICS */}
      {tab === 'departments' && (
        <div className="space-y-6">
          {deptLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={3} />)}
            </div>
          ) : deptAnalytics.length === 0 ? (
            <EmptyState variant="attendance" compact description="No department analytics available." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deptAnalytics.map(d => (
                <Card key={d.id} hoverable={false} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                    <div>
                      <h3 className="font-serif text-base font-bold text-(--text-primary)">{d.name} ({d.code})</h3>
                      <span className="text-xs font-sans text-(--text-muted)">{d.totalRecords} total attendance records</span>
                    </div>
                    <span className={`font-mono text-xl font-bold ${(d.rate ?? 0) >= 90 ? 'text-(--status-success)' : (d.rate ?? 0) >= 75 ? 'text-(--brand-gold)' : 'text-(--status-danger)'}`}>
                      {d.rate !== null ? `${d.rate}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-muted)">Academic Programs</h4>
                    {d.programs.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-(--hover-overlay) text-xs font-sans">
                        <div>
                          <span className="font-semibold text-(--text-primary)">{p.name} ({p.code})</span>
                          <span className="block text-[10px] text-(--text-muted)">{p.studentsCount} active enrolled students</span>
                        </div>
                        <span className={`font-mono font-bold ${p.rate !== null && p.rate >= 75 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                          {p.rate !== null ? `${p.rate}%` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECORD DETAIL & CORRECTION MODAL */}
      <Modal
        isOpen={Boolean(selectedRecordId)}
        onClose={() => setSelectedRecordId(null)}
        title="Attendance Record Details & Audited Correction"
      >
        {detailLoading || !recordDetail ? (
          <div className="p-6 space-y-4">
            <SkeletonCard rows={3} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Record Information */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-(--hover-overlay) text-xs font-sans">
              <div>
                <span className="text-(--text-muted) font-mono">Student</span>
                <p className="font-semibold text-(--text-primary) text-sm">{recordDetail.student.fullName}</p>
                <p className="font-mono text-(--text-secondary)">ID: {recordDetail.student.studentId}</p>
              </div>
              <div>
                <span className="text-(--text-muted) font-mono">Course</span>
                <p className="font-semibold text-(--text-primary) text-sm">{recordDetail.courseOffering.course.code}</p>
                <p className="text-(--text-secondary)">{recordDetail.courseOffering.course.name}</p>
              </div>
              <div>
                <span className="text-(--text-muted) font-mono">Instructor</span>
                <p className="text-(--text-primary)">{recordDetail.courseOffering.instructor?.fullName ?? 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-(--text-muted) font-mono">Recorded Date & Method</span>
                <p className="text-(--text-primary)">{formatDate(recordDetail.session.date)} ({METHOD_LABELS[recordDetail.method]})</p>
              </div>
            </div>

            {/* Attendance Status Correction Form */}
            <form onSubmit={handleCorrectRecord} className="p-4 rounded-xl border border-(--border-default) space-y-4">
              <h4 className="font-serif text-sm font-bold text-(--text-primary)">Update Attendance Status (Audited)</h4>

              {correctError && <InlineError message={correctError} />}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-sans text-(--text-muted) mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="LATE">LATE</option>
                    <option value="EXCUSED">EXCUSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-sans text-(--text-muted) mb-1">Current Status</label>
                  <div className="pt-1.5">
                    <Badge variant={STATUS_BADGES[recordDetail.status]}>{recordDetail.status}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans text-(--text-muted) mb-1">Audit Correction Reason (Required)</label>
                <Input
                  placeholder="e.g. Medical excuse certificate verified by Admin..."
                  value={correctReason}
                  onChange={e => setCorrectReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRecordId(null)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" disabled={correcting}>Save Correction</Button>
              </div>
            </form>

            {/* Correction Audit Log History */}
            {recordDetail.corrections.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-serif text-xs font-bold text-(--text-primary) uppercase tracking-wider">Past Correction Audit History</h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {recordDetail.corrections.map(c => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-(--hover-overlay) border border-(--border-subtle) text-xs font-sans space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-(--text-muted)">{formatDate(c.changedAt)} {formatTime(c.changedAt)}</span>
                        <span className="font-bold text-(--brand-gold)">{c.oldStatus} → {c.newStatus}</span>
                      </div>
                      <p className="text-(--text-secondary)">Reason: {c.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* STUDENT ATTENDANCE HISTORY DRAWER */}
      <SlidePanel
        isOpen={Boolean(selectedStudentId)}
        onClose={() => setSelectedStudentId(null)}
        title="Student Attendance History"
      >
        {studentLoading || !studentDetail ? (
          <div className="p-6 space-y-4"><SkeletonCard rows={4} /></div>
        ) : (
          <div className="space-y-6 p-1">
            <div className="p-4 rounded-xl bg-(--hover-overlay) border border-(--border-default) space-y-2">
              <h3 className="font-serif text-base font-bold text-(--text-primary)">{studentDetail.student.fullName}</h3>
              <p className="font-mono text-xs text-(--text-secondary)">ID: {studentDetail.student.studentId} · {studentDetail.student.email}</p>
              <p className="text-xs text-(--text-muted)">{studentDetail.student.department?.name ?? ''} — {studentDetail.student.program?.name ?? ''}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniKPI label="Overall Rate" value={studentDetail.overallRate !== null ? `${studentDetail.overallRate}%` : 'N/A'} color="text-(--brand-gold)" />
              <MiniKPI label="Present"      value={studentDetail.present}                                                         color="text-(--status-success)" />
              <MiniKPI label="Absent"       value={studentDetail.absent}                                                          color="text-(--status-danger)" />
              <MiniKPI label="Late/Excused" value={studentDetail.late + studentDetail.excused}                                    color="text-(--status-warning)" />
            </div>

            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold text-(--text-primary)">Course Breakdown</h4>
              <div className="space-y-2">
                {studentDetail.courseBreakdown.map(cb => (
                  <div key={cb.courseOfferingId} className="flex items-center justify-between p-3 rounded-xl bg-(--hover-overlay) text-xs font-sans">
                    <div>
                      <span className="font-semibold text-(--text-primary)">{cb.course.code} — {cb.course.name}</span>
                      <span className="block text-[11px] text-(--text-muted)">Instructor: {cb.instructorName} · {cb.present} / {cb.totalSessions} sessions</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${cb.rate !== null && cb.rate >= 75 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                      {cb.rate !== null ? `${cb.rate}%` : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold text-(--text-primary)">Recent Attendance Timeline</h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {studentDetail.recentRecords.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-(--hover-overlay) text-xs font-sans">
                    <div>
                      <span className="font-mono text-(--text-primary)">{formatDate(r.sessionDate)}</span>
                      <span className="block text-[11px] font-semibold text-(--text-secondary)">{r.course.code} — {r.sessionTitle || 'Class Session'}</span>
                    </div>
                    <Badge variant={STATUS_BADGES[r.status] ?? 'glass'}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </motion.div>
  );
};
