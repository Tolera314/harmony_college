'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Users, Search, Filter, Eye, CreditCard, Printer, History, PlusCircle,
  X, CheckCircle2, RotateCcw, Download, RefreshCw, AlertTriangle, ShieldCheck, FileText
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, useToast, ToastContainer } from '../../ui/States';
import {
  getStudentAccounts, getStudentAccountDetail, postCharge, postCredit,
  recordStudentPayment, updateAccountClearance, reverseTransaction
} from '../../../lib/foApi';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface FOStudentAccountItem {
  id: string;
  studentRecordId: string;
  userId: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  departmentId?: string;
  departmentName: string;
  programId?: string;
  programName: string;
  year: number;
  tuition: number;
  totalCharged: number;
  totalPaid: number;
  scholarshipDiscount: number;
  outstanding: number;
  balance: number;
  clearedForTerm: string | null;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Deferred';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  lastPaymentDate: string | null;
  transactions?: any[];
}

const statusBadge: Record<string, { variant: 'emerald' | 'amber' | 'rose' | 'glass'; label: string }> = {
  Paid:     { variant: 'emerald', label: 'Paid' },
  Partial:  { variant: 'amber',   label: 'Partial' },
  Unpaid:   { variant: 'rose',    label: 'Unpaid' },
  Overdue:  { variant: 'rose',    label: 'Overdue' },
  Deferred: { variant: 'glass',   label: 'Deferred' },
};

const riskColor: Record<string, string> = {
  Low:      'text-(--status-success)',
  Medium:   'text-(--status-warning)',
  High:     'text-orange-400',
  Critical: 'text-(--status-danger)',
};

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOStudentAccountsView: React.FC = () => {
  const [accounts, setAccounts]         = useState<FOStudentAccountItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);

  // Filters
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const limit = 15;

  // Selected Student Drawer & Modals State
  const [selectedStudentId, setSelectedStudentId]   = useState<string | null>(null);
  const [studentDetail, setStudentDetail]           = useState<any | null>(null);
  const [detailLoading, setDetailLoading]           = useState(false);

  // Action Modals inside Drawer
  const [chargeModalOpen, setChargeModalOpen]       = useState(false);
  const [chargeForm, setChargeForm]                 = useState({ amount: '', category: 'Tuition', description: '' });
  const [submittingCharge, setSubmittingCharge]     = useState(false);

  const [creditModalOpen, setCreditModalOpen]       = useState(false);
  const [creditForm, setCreditForm]                 = useState({ amount: '', category: 'Scholarship', description: '' });
  const [submittingCredit, setSubmittingCredit]     = useState(false);

  const [paymentModalOpen, setPaymentModalOpen]     = useState(false);
  const [paymentForm, setPaymentForm]               = useState({ amount: '', paymentMethod: 'Bank Transfer' as const, referenceNumber: '', description: '' });
  const [submittingPayment, setSubmittingPayment]   = useState(false);

  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [clearanceTermInput, setClearanceTermInput] = useState('');
  const [submittingClearance, setSubmittingClearance] = useState(false);

  const [reversalModalTxId, setReversalModalTxId]   = useState<string | null>(null);
  const [reversalReason, setReversalReason]         = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);

  const [statementPrintOpen, setStatementPrintOpen] = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Accounts List
  const fetchAccounts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getStudentAccounts({
        search: search.trim() || undefined,
        paymentStatus: statusFilter !== 'All' ? statusFilter : undefined,
        page,
        limit,
      });
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load student accounts');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ── Fetch Student Detail
  const fetchStudentDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await getStudentAccountDetail(id);
      setStudentDetail(data);
      setClearanceTermInput(data.clearedForTerm || '2025/2026 Semester I');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load student detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  const handleOpenDetail = (studentRecordId: string) => {
    setSelectedStudentId(studentRecordId);
    fetchStudentDetail(studentRecordId);
  };

  // ── Post Charge Handler
  const handlePostCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const numAmount = Number(chargeForm.amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Enter a valid positive charge amount', 'error');
      return;
    }
    setSubmittingCharge(true);
    try {
      await postCharge(selectedStudentId, {
        amount: numAmount,
        category: chargeForm.category,
        description: chargeForm.description || `${chargeForm.category} Charge`,
      });
      showToast('Charge posted successfully', 'success');
      setChargeModalOpen(false);
      setChargeForm({ amount: '', category: 'Tuition', description: '' });
      fetchStudentDetail(selectedStudentId);
      fetchAccounts();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to post charge', 'error');
    } finally {
      setSubmittingCharge(false);
    }
  };

  // ── Post Credit Handler
  const handlePostCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const numAmount = Number(creditForm.amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Enter a valid positive credit amount', 'error');
      return;
    }
    setSubmittingCredit(true);
    try {
      await postCredit(selectedStudentId, {
        amount: numAmount,
        category: creditForm.category,
        description: creditForm.description || `${creditForm.category} Credit`,
      });
      showToast('Credit/scholarship posted successfully', 'success');
      setCreditModalOpen(false);
      setCreditForm({ amount: '', category: 'Scholarship', description: '' });
      fetchStudentDetail(selectedStudentId);
      fetchAccounts();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to post credit', 'error');
    } finally {
      setSubmittingCredit(false);
    }
  };

  // ── Record Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const numAmount = Number(paymentForm.amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Enter a valid positive payment amount', 'error');
      return;
    }
    setSubmittingPayment(true);
    try {
      const res = await recordStudentPayment({
        studentRecordId: selectedStudentId,
        amount: numAmount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        description: paymentForm.description || `Payment via ${paymentForm.paymentMethod}`,
      });
      showToast(`Payment recorded successfully! Receipt ID: ${res.receiptId}`, 'success');
      setPaymentModalOpen(false);
      setPaymentForm({ amount: '', paymentMethod: 'Bank Transfer', referenceNumber: '', description: '' });
      fetchStudentDetail(selectedStudentId);
      fetchAccounts();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to record payment', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ── Update Clearance Handler
  const handleUpdateClearance = async (clearForTerm: boolean) => {
    if (!selectedStudentId) return;
    setSubmittingClearance(true);
    try {
      const termValue = clearForTerm ? (clearanceTermInput || '2025/2026 Semester I') : null;
      await updateAccountClearance(selectedStudentId, { clearedForTerm: termValue });
      showToast(clearForTerm ? `Student cleared for ${termValue}` : 'Term clearance revoked', clearForTerm ? 'success' : 'info');
      setClearanceModalOpen(false);
      fetchStudentDetail(selectedStudentId);
      fetchAccounts();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update clearance status', 'error');
    } finally {
      setSubmittingClearance(false);
    }
  };

  // ── Reverse Transaction Handler
  const handleReverseTransaction = async () => {
    if (!reversalModalTxId || !selectedStudentId) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      showToast('Please provide a reason of at least 3 characters for reversal audit log', 'error');
      return;
    }
    setSubmittingReversal(true);
    try {
      await reverseTransaction(reversalModalTxId, reversalReason.trim());
      showToast('Transaction reversed successfully', 'warning');
      setReversalModalTxId(null);
      setReversalReason('');
      fetchStudentDetail(selectedStudentId);
      fetchAccounts();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to reverse transaction', 'error');
    } finally {
      setSubmittingReversal(false);
    }
  };

  // ── Export CSV Handler
  const handleExportCSV = () => {
    if (accounts.length === 0) return;
    const csvRows = ['Student ID,Full Name,Email,Department,Program,Year Level,Outstanding (ETB),Balance (ETB),Status,Cleared For Term'];
    accounts.forEach(a => {
      csvRows.push(`"${a.studentId}","${a.name}","${a.email}","${a.departmentName}","${a.programName}",${a.year},${a.outstanding},${a.balance},"${a.paymentStatus}","${a.clearedForTerm || 'None'}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = `Harmony_College_Student_Accounts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    showToast('Exported student financial accounts to CSV', 'success');
  };

  // Summary counts
  const summary = {
    total,
    paid: accounts.filter((s) => s.paymentStatus === 'Paid').length,
    partial: accounts.filter((s) => s.paymentStatus === 'Partial').length,
    overdue: accounts.filter((s) => s.paymentStatus === 'Overdue' || s.paymentStatus === 'Unpaid').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <FOPageHeader
        title="Student Financial Accounts Directory"
        subtitle="PostgreSQL authoritative ledger for tuition, fees, payments, scholarships, and term clearance"
        icon={<Users className="w-5 h-5" />}
        actions={
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
            Export Accounts CSV
          </Button>
        }
      />

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Student Accounts', value: summary.total, color: 'text-(--text-primary)' },
          { label: 'Fully Cleared / Paid',     value: summary.paid,    color: 'text-(--status-success)' },
          { label: 'Partial Balance',          value: summary.partial, color: 'text-(--status-warning)' },
          { label: 'Outstanding / Overdue',    value: summary.overdue, color: 'text-(--status-danger)' },
        ].map((s) => (
          <div key={s.label} className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
            <p className="font-mono text-[10px] text-(--text-muted) uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <Card hoverable={false} className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by student name, ID (e.g. HC-2024-001), or email..."
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-10 pr-4 py-2.5 font-sans text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--brand-gold) transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary)">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-(--text-muted) shrink-0" />
            {(['All', 'Paid', 'Partial', 'Overdue', 'Unpaid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${
                  statusFilter === s
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                    : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--active-overlay)'
                }`}
              >
                {s}
              </button>
            ))}
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchAccounts}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState description={error} onRetry={fetchAccounts} />
      ) : accounts.length === 0 ? (
        <EmptyState description="No student financial accounts match your search or filter parameters." />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
          <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[850px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                <th className="p-4 font-mono text-[11px] text-(--text-muted) uppercase tracking-wider">Student</th>
                <th className="p-4 font-mono text-[11px] text-(--text-muted) uppercase tracking-wider">Department &amp; Program</th>
                <th className="p-4 font-mono text-[11px] text-(--text-muted) uppercase tracking-wider">Outstanding</th>
                <th className="p-4 font-mono text-[11px] text-(--text-muted) uppercase tracking-wider">Status</th>
                <th className="p-4 font-mono text-[11px] text-(--text-muted) uppercase tracking-wider">Term Clearance</th>
                <th className="p-4 font-mono text-[11px] text-(--text-muted) uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-primary)">
              {accounts.map((s) => (
                <tr key={s.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center font-bold text-xs text-(--brand-gold) shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-sans text-sm font-semibold text-(--text-primary)">{s.name}</p>
                        <p className="font-mono text-[11px] text-(--brand-gold)">{s.studentId}</p>
                        <p className="font-sans text-[10px] text-(--text-muted)">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-sans text-xs font-medium text-(--text-primary)">{s.programName}</p>
                    <p className="font-sans text-[11px] text-(--text-muted)">{s.departmentName} · Year {s.year}</p>
                  </td>
                  <td className="p-4">
                    <p className={`font-mono text-sm font-bold ${s.outstanding > 0 ? 'text-(--status-danger)' : 'text-(--status-success)'}`}>
                      ETB {s.outstanding.toLocaleString()}
                    </p>
                    <p className="font-mono text-[10px] text-(--text-muted)">Total Charged: ETB {s.totalCharged.toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant={statusBadge[s.paymentStatus]?.variant ?? 'glass'}>{statusBadge[s.paymentStatus]?.label ?? s.paymentStatus}</Badge>
                  </td>
                  <td className="p-4">
                    {s.clearedForTerm ? (
                      <Badge variant="emerald" className="text-[10px]">Cleared ({s.clearedForTerm})</Badge>
                    ) : s.balance <= 0 ? (
                      <Badge variant="emerald" className="text-[10px]">Zero Balance</Badge>
                    ) : (
                      <Badge variant="rose" className="text-[10px]">Uncleared</Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleOpenDetail(s.studentRecordId)}>
                        View Ledger
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-sans text-xs">
          <p className="font-mono text-xs text-(--text-muted)">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} accounts
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${
                  p === page ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-muted) hover:bg-(--hover-overlay)'
                }`}
              >
                {p}
              </button>
            ))}

            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── STUDENT ACCOUNT DETAIL DRAWER / SLIDE PANEL ── */}
      <SlidePanel
        isOpen={Boolean(selectedStudentId)}
        onClose={() => { setSelectedStudentId(null); setStudentDetail(null); }}
        title={<span>Student Ledger &amp; Financial Account — <span className="text-(--brand-gold)">{studentDetail?.name || 'Loading...'}</span></span>}
        subtitle="Real-time PostgreSQL financial ledger, charge posting, payments, and term clearance"
        width="max-w-4xl"
      >
        {detailLoading ? (
          <div className="p-6"><SkeletonTable rows={5} cols={4} /></div>
        ) : studentDetail && (
          <div className="space-y-6 font-sans text-xs">

            {/* Profile & Balance Summary Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-(--hover-overlay) rounded-2xl border border-(--border-default)">
              <div>
                <p className="font-serif text-base font-bold text-(--text-primary)">{studentDetail.name}</p>
                <p className="font-mono text-xs font-bold text-(--brand-gold)">{studentDetail.studentId}</p>
                <p className="font-sans text-xs text-(--text-muted) mt-0.5">
                  {studentDetail.programName} · {studentDetail.departmentName} · Year {studentDetail.year}
                </p>
                <p className="font-sans text-[11px] text-(--text-muted)">{studentDetail.email} · {studentDetail.phone}</p>
              </div>

              <div className="text-right font-mono">
                <p className="text-2xl font-bold text-(--text-primary)">ETB {studentDetail.outstanding.toLocaleString()}</p>
                <p className="text-[11px] text-(--text-muted)">Outstanding Account Balance</p>
                <div className="flex gap-1.5 justify-end mt-1.5">
                  <Badge variant={statusBadge[studentDetail.paymentStatus]?.variant ?? 'glass'}>
                    {statusBadge[studentDetail.paymentStatus]?.label ?? studentDetail.paymentStatus}
                  </Badge>
                  {studentDetail.clearedForTerm ? (
                    <Badge variant="emerald">Cleared ({studentDetail.clearedForTerm})</Badge>
                  ) : (
                    <Badge variant="rose">Uncleared</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Totals Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                <span className="text-(--text-muted) uppercase">Total Charges</span>
                <p className="font-bold text-(--text-primary) mt-0.5">ETB {(studentDetail.totalCharged || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                <span className="text-(--text-muted) uppercase">Total Payments</span>
                <p className="font-bold text-(--status-success) mt-0.5">ETB {(studentDetail.totalPaid || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                <span className="text-(--text-muted) uppercase">Scholarship / Aid</span>
                <p className="font-bold text-(--brand-gold) mt-0.5">ETB {(studentDetail.totalAid || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                <span className="text-(--text-muted) uppercase">Current Balance</span>
                <p className={`font-bold mt-0.5 ${studentDetail.balance > 0 ? 'text-(--status-danger)' : 'text-(--status-success)'}`}>
                  ETB {studentDetail.balance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* In-Drawer Actions Toolbar */}
            <div className="flex gap-2 flex-wrap p-3 rounded-xl bg-(--hover-overlay) border border-(--border-default)">
              <Button variant="primary" size="sm" icon={<CreditCard className="w-3.5 h-3.5" />} onClick={() => setPaymentModalOpen(true)}>
                Record Payment
              </Button>
              <Button variant="secondary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={() => setChargeModalOpen(true)}>
                Post Charge
              </Button>
              <Button variant="secondary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={() => setCreditModalOpen(true)}>
                Post Credit / Waiver
              </Button>
              <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />} onClick={() => setClearanceModalOpen(true)}>
                Term Clearance
              </Button>
              <Button variant="ghost" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setStatementPrintOpen(true)}>
                Print Statement
              </Button>
            </div>

            {/* Financial Transaction Ledger */}
            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold text-(--text-primary)">Complete Financial Ledger</h4>

              {studentDetail.transactions.length === 0 ? (
                <EmptyState compact description="No financial transactions recorded for this student account yet." />
              ) : (
                <div className="overflow-x-auto border border-(--border-subtle) rounded-xl">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-(--hover-overlay) border-b border-(--border-subtle)">
                      <tr>
                        {['Date', 'Type & Category', 'Description', 'Receipt / Ref ID', 'Amount', 'Status', 'Reversal'].map(h => (
                          <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] uppercase text-(--text-muted)">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border-subtle)">
                      {studentDetail.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-(--hover-overlay) transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-(--text-muted)">
                            {new Date(t.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Badge variant={t.amount > 0 ? 'rose' : t.type === 'PAYMENT' ? 'emerald' : 'gold'}>
                              {t.type}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5 font-sans text-xs text-(--text-primary)">{t.description}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-(--brand-gold)">
                            {t.receiptId || t.referenceId || 'N/A'}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs font-bold">
                            <span className={t.amount > 0 ? 'text-(--status-danger)' : 'text-(--status-success)'}>
                              {t.amount > 0 ? `+ETB ${t.amount.toLocaleString()}` : `−ETB ${Math.abs(t.amount).toLocaleString()}`}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Badge variant={t.status === 'POSTED' ? 'emerald' : t.status === 'REVERSED' ? 'rose' : 'amber'}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5">
                            {t.status === 'POSTED' && (
                              <button
                                onClick={() => setReversalModalTxId(t.id)}
                                className="px-2 py-1 rounded bg-(--hover-overlay) border border-(--border-default) text-[10px] font-mono text-(--status-danger) hover:bg-(--active-overlay) transition-colors"
                              >
                                Reverse
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </SlidePanel>

      {/* ── MODAL: POST CHARGE ── */}
      <Modal isOpen={chargeModalOpen} onClose={() => setChargeModalOpen(false)} title="Post Charge to Student Account">
        <form onSubmit={handlePostCharge} className="space-y-4 font-sans text-xs">
          <p className="text-(--text-muted)">Post tuition, lab, penalty, or administrative charges to the student account.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Charge Amount (ETB)</label>
              <input
                type="number"
                placeholder="e.g. 2500"
                value={chargeForm.amount}
                onChange={e => setChargeForm({ ...chargeForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Charge Category</label>
              <select
                value={chargeForm.category}
                onChange={e => setChargeForm({ ...chargeForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              >
                <option value="Tuition">Tuition Charge</option>
                <option value="Fee">Administrative Fee</option>
                <option value="Lab">Laboratory Fee</option>
                <option value="Penalty">Late Penalty / Fine</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Description / Notes</label>
              <input
                type="text"
                placeholder="e.g. Semester II Laboratory Facility Fee"
                value={chargeForm.description}
                onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setChargeModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submittingCharge}>
              {submittingCharge ? 'Posting...' : 'Post Charge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: POST CREDIT / SCHOLARSHIP ── */}
      <Modal isOpen={creditModalOpen} onClose={() => setCreditModalOpen(false)} title="Post Credit or Scholarship Waiver">
        <form onSubmit={handlePostCredit} className="space-y-4 font-sans text-xs">
          <p className="text-(--text-muted)">Apply scholarship grants, financial waivers, or discount credits to reduce balance.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Credit / Waiver Amount (ETB)</label>
              <input
                type="number"
                placeholder="e.g. 1500"
                value={creditForm.amount}
                onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Credit Category</label>
              <select
                value={creditForm.category}
                onChange={e => setCreditForm({ ...creditForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              >
                <option value="Scholarship">Merit Scholarship</option>
                <option value="Grant">Financial Grant</option>
                <option value="Waiver">Administrative Fee Waiver</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Description / Notes</label>
              <input
                type="text"
                placeholder="e.g. Academic Excellence 50% Tuition Waiver"
                value={creditForm.description}
                onChange={e => setCreditForm({ ...creditForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setCreditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submittingCredit}>
              {submittingCredit ? 'Posting...' : 'Apply Credit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: RECORD PAYMENT ── */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Student Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4 font-sans text-xs">
          <p className="text-(--text-muted)">Record a tuition or fee payment received via bank deposit, Telebirr, or cash.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Payment Amount Received (ETB)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={paymentForm.amount}
                onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Payment Channel / Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              >
                <option value="Bank Transfer">Commercial Bank of Ethiopia (CBE)</option>
                <option value="Telebirr">Telebirr Digital Wallet</option>
                <option value="Chapa">Chapa Payment Gateway</option>
                <option value="Cash">Cash at Counter</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Bank Reference / Deposit Voucher Number</label>
              <input
                type="text"
                placeholder="e.g. CBE-FT-981240"
                value={paymentForm.referenceNumber}
                onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Description / Notes</label>
              <input
                type="text"
                placeholder="e.g. First Installment Payment"
                value={paymentForm.description}
                onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submittingPayment}>
              {submittingPayment ? 'Processing...' : 'Record Payment & Generate Receipt'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: UPDATE TERM CLEARANCE ── */}
      <Modal isOpen={clearanceModalOpen} onClose={() => setClearanceModalOpen(false)} title="Update Academic Term Clearance">
        <div className="space-y-4 font-sans text-xs">
          <p className="text-(--text-muted)">
            Updating financial clearance enables or blocks course registration, transcript requests, and graduation eligibility across Registrar and Student dashboards.
          </p>
          <div>
            <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Clearance Term Label</label>
            <input
              type="text"
              value={clearanceTermInput}
              onChange={e => setClearanceTermInput(e.target.value)}
              placeholder="e.g. 2025/2026 Semester I"
              className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="danger" size="sm" onClick={() => handleUpdateClearance(false)} disabled={submittingClearance}>
              Revoke Clearance
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleUpdateClearance(true)} disabled={submittingClearance}>
              {submittingClearance ? 'Updating...' : 'Grant Financial Clearance'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: REVERSE TRANSACTION AUDIT REASON ── */}
      <Modal isOpen={Boolean(reversalModalTxId)} onClose={() => setReversalModalTxId(null)} title="Reverse Financial Transaction">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-3 rounded-xl bg-(--status-warning-bg) border border-(--status-warning-border) flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0" />
            <p className="text-(--status-warning)">
              Reversing a transaction marks it as REVERSED, adjusts student balance automatically, and logs an immutable audit event.
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Mandatory Reversal Audit Reason</label>
            <input
              type="text"
              placeholder="e.g. Duplicate deposit entry corrected by FO"
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setReversalModalTxId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReverseTransaction} disabled={submittingReversal}>
              {submittingReversal ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── PRINT OFFICIAL FINANCIAL STATEMENT MODAL ── */}
      <Modal isOpen={statementPrintOpen} onClose={() => setStatementPrintOpen(false)} title="Official Statement of Account — Harmony College">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                <p className="text-[11px] text-(--text-muted)">Finance &amp; Accounts Office — Official Student Financial Statement</p>
              </div>
              <div className="text-right font-mono text-[10px] text-(--text-muted)">
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {studentDetail && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-(--text-muted)">STUDENT NAME</span>
                    <p className="font-bold text-(--text-primary)">{studentDetail.name}</p>
                  </div>
                  <div>
                    <span className="text-(--text-muted)">STUDENT ID</span>
                    <p className="font-bold text-(--brand-gold)">{studentDetail.studentId}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Total Charges:</span>
                    <span className="font-bold text-(--text-primary)">ETB {(studentDetail.totalCharged || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Payments Received:</span>
                    <span className="font-bold text-(--status-success)">ETB {(studentDetail.totalPaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-(--border-subtle) pt-1 mt-1">
                    <span>Outstanding Balance:</span>
                    <span className="font-bold text-(--status-danger)">ETB {studentDetail.balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-(--text-muted) italic">
              Certified Official Financial Statement. Confirmed by Finance Office.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStatementPrintOpen(false)}>Close</Button>
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Statement</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
