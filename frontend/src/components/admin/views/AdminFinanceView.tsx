'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  DollarSign, Search, RefreshCw, ChevronLeft, ChevronRight, Eye,
  Plus, Undo2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText,
  User, CreditCard, ShieldCheck, ArrowUpRight, ArrowDownLeft
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
  adminFinanceApi, adminDepartmentsApi,
  AdminFinanceStats, AdminFinanceTransactionItem, AdminStudentFinancialAccountItem,
  AdminStudentFinancialDetail, AdminFinanceTrends, ApiDepartment
} from '../../../lib/adminApi';

// ── Formatter Helpers ────────────────────────────────────────────────────────

const TYPE_BADGES: Record<string, 'emerald' | 'rose' | 'amber' | 'gold' | 'glass'> = {
  PAYMENT:     'emerald',
  TUITION:     'amber',
  FEE:         'glass',
  SCHOLARSHIP: 'gold',
  GRANT:       'gold',
  REFUND:      'rose',
  PENALTY:     'rose',
};

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}ETB ${abs}`;
}

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

export const AdminFinanceView: React.FC = () => {
  // Tabs
  const [tab, setTab] = useState<'overview' | 'ledger' | 'accounts'>('overview');

  // Stats & Reference Data
  const [stats, setStats]               = useState<AdminFinanceStats | null>(null);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError]     = useState('');

  // ── Ledger Tab State
  const [transactions, setTransactions] = useState<AdminFinanceTransactionItem[]>([]);
  const [txTotal, setTxTotal]           = useState(0);
  const [txPage, setTxPage]             = useState(1);
  const [txPages, setTxPages]           = useState(1);
  const [txLoading, setTxLoading]       = useState(false);
  const [txError, setTxError]           = useState('');

  // Ledger Filters
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter]     = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Accounts Tab State
  const [accounts, setAccounts]         = useState<AdminStudentFinancialAccountItem[]>([]);
  const [accTotal, setAccTotal]         = useState(0);
  const [accPage, setAccPage]           = useState(1);
  const [accPages, setAccPages]         = useState(1);
  const [accLoading, setAccLoading]     = useState(false);
  const [clearanceFilter, setClearanceFilter] = useState('');
  const [balanceFilter, setBalanceFilter]     = useState('');

  // ── Trends State
  const [trendsData, setTrendsData]     = useState<AdminFinanceTrends | null>(null);

  // ── Modals / Drawers State
  // Post Transaction Modal
  const [postOpen, setPostOpen]                 = useState(false);
  const [allStudents, setAllStudents]           = useState<{ id: string; studentId: string; fullName: string }[]>([]);
  const [postStudentId, setPostStudentId]       = useState('');
  const [postType, setPostType]                 = useState<string>('PAYMENT');
  const [postAmount, setPostAmount]             = useState('');
  const [postDesc, setPostDesc]                 = useState('');
  const [postRef, setPostRef]                   = useState('');
  const [postSubmitting, setPostSubmitting]     = useState(false);
  const [postError, setPostError]               = useState('');

  // Reversal Modal
  const [reversingTx, setReversingTx]           = useState<AdminFinanceTransactionItem | null>(null);
  const [reverseReason, setReverseReason]       = useState('');
  const [reversing, setReversing]               = useState(false);
  const [reverseError, setReverseError]         = useState('');

  // Student Detail Drawer
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail]         = useState<AdminStudentFinancialDetail | null>(null);
  const [studentLoading, setStudentLoading]       = useState(false);

  // Clearance Modal
  const [clearanceStudent, setClearanceStudent]   = useState<AdminStudentFinancialAccountItem | null>(null);
  const [clearanceTermInput, setClearanceTermInput] = useState('Fall 2026');
  const [clearanceSubmitting, setClearanceSubmitting] = useState(false);

  // Receipt Modal
  const [receiptTx, setReceiptTx]               = useState<AdminFinanceTransactionItem | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Stats & Reference Data
  const fetchStats = useCallback(async () => {
    setStatsLoading(true); setStatsError('');
    try {
      const [st, depts, tr] = await Promise.all([
        adminFinanceApi.getStats({ departmentId: deptFilter || undefined }),
        adminDepartmentsApi.list(),
        adminFinanceApi.getTrends({ departmentId: deptFilter || undefined }),
      ]);
      setStats(st);
      setDepartments(depts.filter(d => d.isActive));
      setTrendsData(tr);
    } catch (e: any) {
      setStatsError(e.message ?? 'Failed to load financial statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [deptFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch Students List for Post Transaction dropdown
  useEffect(() => {
    adminFinanceApi.listAccounts({ limit: 100 })
      .then(res => setAllStudents(res.accounts.map(a => ({ id: a.student.id, studentId: a.student.studentId, fullName: a.student.fullName }))))
      .catch(() => {});
  }, []);

  // ── Fetch Ledger Transactions
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true); setTxError('');
    try {
      const res = await adminFinanceApi.listTransactions({
        page: txPage,
        limit: 12,
        search,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        departmentId: deptFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setTransactions(res.transactions);
      setTxTotal(res.total);
      setTxPages(res.totalPages);
    } catch (e: any) {
      setTxError(e.message ?? 'Failed to load transaction ledger');
    } finally {
      setTxLoading(false);
    }
  }, [txPage, search, typeFilter, statusFilter, deptFilter, startDate, endDate]);

  useEffect(() => {
    if (tab === 'ledger') {
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => fetchTransactions(), 280);
    }
  }, [tab, txPage, search, typeFilter, statusFilter, deptFilter, startDate, endDate, fetchTransactions]);

  // ── Fetch Student Financial Accounts
  const fetchAccounts = useCallback(async () => {
    setAccLoading(true);
    try {
      const res = await adminFinanceApi.listAccounts({
        page: accPage,
        limit: 12,
        search,
        departmentId: deptFilter || undefined,
        clearanceStatus: clearanceFilter || undefined,
        balanceFilter: balanceFilter || undefined,
      });
      setAccounts(res.accounts);
      setAccTotal(res.total);
      setAccPages(res.totalPages);
    } catch {
      showToast('Failed to load student accounts', 'error');
    } finally {
      setAccLoading(false);
    }
  }, [accPage, search, deptFilter, clearanceFilter, balanceFilter, showToast]);

  useEffect(() => {
    if (tab === 'accounts') fetchAccounts();
  }, [tab, accPage, search, deptFilter, clearanceFilter, balanceFilter, fetchAccounts]);

  // ── Handle Post Transaction
  const handlePostTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postStudentId) { setPostError('Please select a student'); return; }
    const amt = parseFloat(postAmount);
    if (isNaN(amt) || amt === 0) { setPostError('Please enter a non-zero amount'); return; }
    if (!postDesc || postDesc.trim().length < 3) { setPostError('Description must be at least 3 characters'); return; }

    setPostError(''); setPostSubmitting(true);
    try {
      const res = await adminFinanceApi.postTransaction({
        studentRecordId: postStudentId,
        type: postType,
        amount: amt,
        description: postDesc.trim(),
        referenceId: postRef.trim() || undefined,
      });
      showToast(`Transaction posted! New balance: ${fmtETB(res.accountBalance)}`, 'success');
      setPostOpen(false); setPostStudentId(''); setPostAmount(''); setPostDesc(''); setPostRef('');
      fetchStats();
      if (tab === 'ledger') fetchTransactions();
      if (tab === 'accounts') fetchAccounts();
    } catch (err: any) {
      setPostError(err.message ?? 'Failed to post transaction');
    } finally {
      setPostSubmitting(false);
    }
  };

  // ── Handle Transaction Reversal
  const handleReverseTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingTx) return;
    if (!reverseReason || reverseReason.trim().length < 5) {
      setReverseError('Please enter a reversal reason (at least 5 characters).');
      return;
    }

    setReverseError(''); setReversing(true);
    try {
      const res = await adminFinanceApi.reverseTransaction(reversingTx.id, reverseReason.trim());
      showToast(`Transaction reversed! Account balance: ${fmtETB(res.accountBalance)}`, 'success');
      setReversingTx(null); setReverseReason('');
      fetchStats();
      if (tab === 'ledger') fetchTransactions();
      if (tab === 'accounts') fetchAccounts();
    } catch (err: any) {
      setReverseError(err.message ?? 'Failed to reverse transaction');
    } finally {
      setReversing(false);
    }
  };

  // ── Handle Update Clearance
  const handleUpdateClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceStudent) return;
    setClearanceSubmitting(true);
    try {
      await adminFinanceApi.updateClearance(clearanceStudent.student.id, clearanceTermInput ? clearanceTermInput.trim() : null);
      showToast(`Clearance updated for ${clearanceStudent.student.fullName}`, 'success');
      setClearanceStudent(null);
      fetchStats();
      if (tab === 'accounts') fetchAccounts();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to update clearance', 'error');
    } finally {
      setClearanceSubmitting(false);
    }
  };

  // ── Open Student Detail Drawer
  const openStudentDetail = async (studentId: string) => {
    setSelectedStudentId(studentId); setStudentLoading(true); setStudentDetail(null);
    try {
      const res = await adminFinanceApi.getStudentDetail(studentId);
      setStudentDetail(res);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load student financial profile', 'error');
      setSelectedStudentId(null);
    } finally {
      setStudentLoading(false);
    }
  };

  // Trends Bar Chart Data
  const trendBarData = trendsData?.trends.slice(-7).map(t => ({
    label: formatDate(t.date).slice(0, 6),
    value: t.payments,
    color: 'var(--brand-gold)',
  })) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Financial Management"
        subtitle={stats ? `Total Revenue: ${fmtETB(stats.totalRevenue)} · Total Outstanding: ${fmtETB(stats.totalOutstanding)}` : 'Loading financial overview...'}
        icon={<DollarSign className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setPostOpen(true)}>
              Post Transaction
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchStats(); if (tab === 'ledger') fetchTransactions(); if (tab === 'accounts') fetchAccounts(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : statsError ? (
        <ErrorState compact description={statsError} onRetry={fetchStats} />
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKPI label="Total Revenue"      value={fmtETB(stats.totalRevenue)}      color="text-(--status-success)" />
          <MiniKPI label="Outstanding Balance"value={fmtETB(stats.totalOutstanding)}  color="text-(--status-danger)" />
          <MiniKPI label="Scholarships & Aid" value={fmtETB(stats.totalScholarships)} color="text-(--brand-gold)" />
          <MiniKPI label="Fees & Tuition"     value={fmtETB(stats.totalTuitionCharged + stats.totalFeesCharged)} color="text-(--status-info)" />
          <MiniKPI label="Cleared Students"   value={`${stats.clearedCount} / ${stats.totalAccounts}`}           color="text-(--status-success)" />
          <MiniKPI label="Total Ledger Recs"  value={stats.totalTransactions}         color="text-(--text-primary)" />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-(--border-default) gap-6 font-sans text-xs overflow-x-auto">
        <button
          onClick={() => setTab('overview')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'overview' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          📊 Overview & Trends
          {tab === 'overview' && <motion.div layoutId="finTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('ledger')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'ledger' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          💳 Transaction Ledger ({txTotal})
          {tab === 'ledger' && <motion.div layoutId="finTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('accounts')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'accounts' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          🎓 Student Accounts & Clearance ({accTotal})
          {tab === 'accounts' && <motion.div layoutId="finTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
      </div>

      {/* Search & Global Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by student name, student ID, receipt ID, reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setTxPage(1); setAccPage(1); }}
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setTxPage(1); setAccPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
        </select>

        {tab === 'ledger' && (
          <>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setTxPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Types</option>
              <option value="PAYMENT">Payment</option>
              <option value="TUITION">Tuition</option>
              <option value="FEE">Fee</option>
              <option value="SCHOLARSHIP">Scholarship</option>
              <option value="GRANT">Grant</option>
              <option value="REFUND">Refund</option>
              <option value="PENALTY">Penalty</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setTxPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Statuses</option>
              <option value="POSTED">POSTED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
          </>
        )}

        {tab === 'accounts' && (
          <>
            <select
              value={clearanceFilter}
              onChange={e => { setClearanceFilter(e.target.value); setAccPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Clearance Status</option>
              <option value="cleared">Cleared for Term</option>
              <option value="uncleared">Uncleared</option>
            </select>
            <select
              value={balanceFilter}
              onChange={e => { setBalanceFilter(e.target.value); setAccPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Balances</option>
              <option value="outstanding">Outstanding Balance (&gt;0)</option>
              <option value="credit">Credit Balance (&lt;0)</option>
              <option value="zero">Zero Balance (0)</option>
            </select>
          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW & TRENDS */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">30-Day Revenue Collection Trend</h3>
              {trendBarData.length > 0 ? (
                <BarChart data={trendBarData} height={160} />
              ) : (
                <EmptyState variant="payments" compact description="No revenue collection data available." />
              )}
            </Card>

            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Institutional Financial Summary</h3>
              {stats && (
                <div className="space-y-3 font-sans text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-(--hover-overlay)">
                    <span className="text-(--text-muted)">Total Tuition Charged</span>
                    <span className="font-mono font-bold text-(--text-primary)">{fmtETB(stats.totalTuitionCharged)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-(--hover-overlay)">
                    <span className="text-(--text-muted)">Total Mandatory Fees Charged</span>
                    <span className="font-mono font-bold text-(--text-primary)">{fmtETB(stats.totalFeesCharged)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-(--hover-overlay)">
                    <span className="text-(--text-muted)">Total Scholarships & Aid Granted</span>
                    <span className="font-mono font-bold text-(--brand-gold)">{fmtETB(stats.totalScholarships)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-(--hover-overlay)">
                    <span className="text-(--text-muted)">Total Payments Collected</span>
                    <span className="font-mono font-bold text-(--status-success)">{fmtETB(stats.totalRevenue)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTION LEDGER TABLE */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          {txLoading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : txError ? (
            <ErrorState compact description={txError} onRetry={fetchTransactions} />
          ) : transactions.length === 0 ? (
            <EmptyState variant="payments" compact description="No financial transactions match your filter criteria." />
          ) : (
            <>
              <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
                <table className="w-full text-left text-xs font-sans min-w-[850px]">
                  <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                    <tr>
                      {['Student', 'Student ID', 'Transaction Details', 'Type', 'Amount', 'Receipt / Ref', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">
                          <button onClick={() => openStudentDetail(t.student.id)} className="hover:underline text-(--brand-gold) text-left font-medium">
                            {t.student.fullName}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{t.student.studentId}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-(--text-primary)">{t.description}</span>
                          <span className="block text-[11px] text-(--text-muted)">{t.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={TYPE_BADGES[t.type] ?? 'glass'}>{t.type}</Badge>
                        </td>
                        <td className={`px-4 py-3 font-mono font-bold ${t.amount < 0 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                          {fmtETB(t.amount)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">
                          {t.receiptId ? (
                            <button onClick={() => setReceiptTx(t)} className="text-(--brand-gold) hover:underline">
                              {t.receiptId}
                            </button>
                          ) : (t.referenceId || 'N/A')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${t.status === 'POSTED' ? 'bg-(--status-success-bg) text-(--status-success)' : 'bg-(--status-danger-bg) text-(--status-danger)'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                          {formatDate(t.transactionDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {t.receiptId && (
                              <Button variant="ghost" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setReceiptTx(t)}>
                                Receipt
                              </Button>
                            )}
                            {t.status === 'POSTED' && (
                              <Button variant="ghost" size="sm" icon={<Undo2 className="w-3.5 h-3.5 text-(--status-danger)" />} onClick={() => setReversingTx(t)}>
                                Reverse
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-sans text-(--text-muted)">
                  Showing {transactions.length} of {txTotal} transactions (Page {txPage} of {txPages})
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={txPage <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setTxPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={txPage >= txPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setTxPage(p => Math.min(txPages, p + 1))}>Next</Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: STUDENT ACCOUNTS & CLEARANCE */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          {accLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : accounts.length === 0 ? (
            <EmptyState variant="payments" compact description="No student financial accounts match your filter criteria." />
          ) : (
            <>
              <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
                <table className="w-full text-left text-xs font-sans min-w-[800px]">
                  <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                    <tr>
                      {['Student', 'Student ID', 'Department / Program', 'Current Balance', 'Term Clearance', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {accounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">
                          <button onClick={() => openStudentDetail(acc.student.id)} className="hover:underline text-(--brand-gold) text-left font-medium">
                            {acc.student.fullName}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{acc.student.studentId}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-(--text-primary)">{acc.student.department?.code ?? 'N/A'}</span>
                          <span className="block text-[11px] text-(--text-muted)">{acc.student.program?.name ?? ''}</span>
                        </td>
                        <td className={`px-4 py-3 font-mono font-bold text-sm ${acc.balance > 0 ? 'text-(--status-danger)' : acc.balance < 0 ? 'text-(--status-success)' : 'text-(--text-muted)'}`}>
                          {fmtETB(acc.balance)}
                        </td>
                        <td className="px-4 py-3">
                          {acc.isCleared ? (
                            <span className="inline-flex items-center gap-1 text-(--status-success) font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Cleared {acc.clearedForTerm ? `(${acc.clearedForTerm})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-(--status-danger) font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Uncleared
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => openStudentDetail(acc.student.id)}>
                              Statement
                            </Button>
                            <Button variant="ghost" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-(--brand-gold)" />} onClick={() => { setClearanceStudent(acc); setClearanceTermInput(acc.clearedForTerm || 'Fall 2026'); }}>
                              Clearance
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-sans text-(--text-muted)">
                  Showing {accounts.length} of {accTotal} student accounts
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={accPage <= 1} onClick={() => setAccPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={accPage >= accPages} onClick={() => setAccPage(p => Math.min(accPages, p + 1))}>Next</Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* POST TRANSACTION MODAL */}
      <Modal isOpen={postOpen} onClose={() => setPostOpen(false)} title="Post Financial Transaction">
        <form onSubmit={handlePostTransaction} className="space-y-4">
          {postError && <InlineError message={postError} />}

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Select Student</label>
            <select
              value={postStudentId}
              onChange={e => setPostStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              required
            >
              <option value="">-- Choose Student --</option>
              {allStudents.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.studentId})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Transaction Type</label>
              <select
                value={postType}
                onChange={e => setPostType(e.target.value)}
                className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              >
                <option value="PAYMENT">PAYMENT (Student Payment Received)</option>
                <option value="TUITION">TUITION (Tuition Charge)</option>
                <option value="FEE">FEE (Mandatory Fee Charge)</option>
                <option value="SCHOLARSHIP">SCHOLARSHIP (Merit Scholarship Credit)</option>
                <option value="GRANT">GRANT (Financial Aid Grant)</option>
                <option value="REFUND">REFUND (Overpayment Refund)</option>
                <option value="PENALTY">PENALTY (Late Registration Charge)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Amount (ETB)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 5000.00"
                value={postAmount}
                onChange={e => setPostAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Description</label>
            <Input
              placeholder="e.g. Fall 2026 Registration Fee Payment via Telebirr..."
              value={postDesc}
              onChange={e => setPostDesc(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Reference ID (Bank / Gateway Transaction #)</label>
            <Input
              placeholder="e.g. CBE-TXN-981240192"
              value={postRef}
              onChange={e => setPostRef(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-(--border-subtle)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={postSubmitting}>Post Transaction</Button>
          </div>
        </form>
      </Modal>

      {/* REVERSAL MODAL */}
      <Modal isOpen={Boolean(reversingTx)} onClose={() => setReversingTx(null)} title="Reverse Financial Transaction (Audited)">
        {reversingTx && (
          <form onSubmit={handleReverseTransaction} className="space-y-4">
            <div className="p-3 rounded-xl bg-(--status-danger-bg) border border-(--status-danger-border) text-xs font-sans space-y-1">
              <p className="font-semibold text-(--status-danger)">Warning: Transaction Reversal Action</p>
              <p className="text-(--text-secondary)">
                Reversing transaction <strong>{reversingTx.receiptId || reversingTx.id}</strong> ({fmtETB(reversingTx.amount)}) will update student account balance immediately.
              </p>
            </div>

            {reverseError && <InlineError message={reverseError} />}

            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Mandatory Reversal Audit Reason (Min 5 chars)</label>
              <Input
                placeholder="e.g. Bank chargeback confirmed / duplicate transaction entry error..."
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setReversingTx(null)}>Cancel</Button>
              <Button type="submit" variant="danger" size="sm" disabled={reversing}>Confirm Reversal</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CLEARANCE MODAL */}
      <Modal isOpen={Boolean(clearanceStudent)} onClose={() => setClearanceStudent(null)} title="Update Academic / Registration Clearance">
        {clearanceStudent && (
          <form onSubmit={handleUpdateClearance} className="space-y-4">
            <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs font-sans">
              <p className="font-semibold text-(--text-primary)">{clearanceStudent.student.fullName} ({clearanceStudent.student.studentId})</p>
              <p className="font-mono text-(--text-muted)">Current Balance: {fmtETB(clearanceStudent.balance)}</p>
            </div>

            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Cleared For Term (e.g. "Fall 2026" or leave empty to revoke)</label>
              <Input
                placeholder="e.g. Fall 2026"
                value={clearanceTermInput}
                onChange={e => setClearanceTermInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setClearanceStudent(null)}>Cancel</Button>
              <Button type="button" variant="danger" size="sm" onClick={() => { setClearanceTermInput(''); }}>Revoke Clearance</Button>
              <Button type="submit" variant="primary" size="sm" disabled={clearanceSubmitting}>Save Clearance</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* RECEIPT VIEW MODAL */}
      <Modal isOpen={Boolean(receiptTx)} onClose={() => setReceiptTx(null)} title="Official Financial Receipt">
        {receiptTx && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
              <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                  <p className="text-[11px] text-(--text-muted)">Official Payment & Financial Receipt</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-(--text-primary)">{receiptTx.receiptId}</span>
                  <span className="block text-[10px] text-(--text-muted)">{formatDate(receiptTx.transactionDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-(--text-muted) font-mono text-[10px]">STUDENT NAME</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.student.fullName}</p>
                  <p className="font-mono text-(--text-secondary)">ID: {receiptTx.student.studentId}</p>
                </div>
                <div>
                  <span className="text-(--text-muted) font-mono text-[10px]">DEPARTMENT / PROGRAM</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.student.department?.code}</p>
                  <p className="text-(--text-secondary)">{receiptTx.student.program?.name}</p>
                </div>
              </div>

              <div className="border-t border-b border-(--border-subtle) py-3 space-y-2">
                <div className="flex justify-between font-semibold text-(--text-primary)">
                  <span>{receiptTx.description}</span>
                  <span className="font-mono">{fmtETB(receiptTx.amount)}</span>
                </div>
                {receiptTx.referenceId && (
                  <p className="font-mono text-[11px] text-(--text-muted)">Reference Gateway Ref: {receiptTx.referenceId}</p>
                )}
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono text-(--text-muted)">
                <span>Status: <strong className="text-(--status-success)">{receiptTx.status}</strong></span>
                <span>Verified by Harmony College Finance</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReceiptTx(null)}>Close</Button>
              <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Receipt</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* STUDENT FINANCIAL STATEMENT SLIDE PANEL */}
      <SlidePanel isOpen={Boolean(selectedStudentId)} onClose={() => setSelectedStudentId(null)} title="Student Financial Statement">
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
              <MiniKPI label="Balance"          value={fmtETB(studentDetail.summary.balance)}        color={studentDetail.summary.balance > 0 ? 'text-(--status-danger)' : 'text-(--status-success)'} />
              <MiniKPI label="Total Charges"    value={fmtETB(studentDetail.summary.totalCharges)}   color="text-(--text-primary)" />
              <MiniKPI label="Total Payments"   value={fmtETB(studentDetail.summary.totalPayments)}  color="text-(--status-success)" />
              <MiniKPI label="Scholarships/Aid" value={fmtETB(studentDetail.summary.totalAid)}       color="text-(--brand-gold)" />
            </div>

            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold text-(--text-primary)">Transaction History Timeline</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {studentDetail.transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-(--hover-overlay) text-xs font-sans">
                    <div>
                      <span className="font-mono text-(--text-muted)">{formatDate(t.transactionDate)}</span>
                      <span className="block font-semibold text-(--text-primary)">{t.description}</span>
                      {t.receiptId && <span className="font-mono text-[10px] text-(--brand-gold)">{t.receiptId}</span>}
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${t.amount < 0 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                        {fmtETB(t.amount)}
                      </span>
                      <span className="block text-[10px] text-(--text-muted)">{t.status}</span>
                    </div>
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
