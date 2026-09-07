'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CreditCard, Search, Filter, X, ChevronLeft, ChevronRight,
  Download, Eye, Plus, RefreshCw, Undo2, CheckCircle2, Printer,
  ShieldCheck, AlertTriangle, FileText, UserCheck, Clock
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import {
  recordStudentPayment, getTransactions, reverseTransaction, getStudentAccounts,
  getPendingRegistrationPayments, getVerifiedRegistrationPayments,
  verifyRegistrationPayment, unverifyRegistrationPayment
} from '../../../lib/foApi';

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}ETB ${abs}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Record Payment Drawer Modal ────────────────────────────────────────────────
function RecordPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [form, setForm] = useState({
    studentId: '', method: 'Bank Transfer' as const, amount: '',
    reference: '', date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStudentAccounts({ limit: 100 })
      .then((res: any) => {
        const list = res?.accounts ?? res?.data ?? (Array.isArray(res) ? res : []);
        setStudents(list);
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  const selected = students.find((s) => s.studentRecordId === form.studentId || s.id === form.studentId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = 'Please select a student';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a valid positive amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await recordStudentPayment({
        studentRecordId: selected?.studentRecordId || form.studentId,
        amount: Number(form.amount),
        paymentMethod: form.method as any,
        referenceNumber: form.reference.trim() || undefined,
        description: form.notes.trim() || `Payment via ${form.method}`,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrors({ api: err?.message || 'Failed to record payment' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SlidePanel isOpen onClose={onClose} title={<span>Record Student Payment</span>} subtitle="Finance Officer — Payments" width="max-w-xl">
      <div className="space-y-5 font-sans text-xs">
        {errors.api && <InlineError message={errors.api} />}

        <div>
          <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-1.5">Select Student Account *</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2 font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
          >
            <option value="">-- Select student account --</option>
            {students.map((s) => (
              <option key={s.id || s.studentRecordId} value={s.studentRecordId || s.id}>
                {s.name || s.student?.fullName || 'Student'} ({s.studentId || s.student?.studentId})
              </option>
            ))}
          </select>
          {errors.studentId && <p className="font-sans text-[11px] text-(--status-danger) mt-1">{errors.studentId}</p>}
        </div>

        {selected && (
          <div className="p-3.5 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl flex items-center justify-between font-mono">
            <div>
              <p className="text-[10px] text-(--text-muted) uppercase">Current Balance</p>
              <p className={`text-base font-bold ${selected.balance > 0 ? 'text-(--status-danger)' : 'text-(--status-success)'}`}>
                {fmtETB(selected.balance ?? 0)}
              </p>
            </div>
            <Badge variant={selected.clearedForTerm ? 'emerald' : 'rose'}>
              {selected.clearedForTerm ? `Cleared (${selected.clearedForTerm})` : 'Uncleared'}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-1">Amount (ETB) *</label>
            <input
              type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2 font-mono text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            />
            {errors.amount && <p className="font-sans text-[11px] text-(--status-danger) mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-1">Payment Method *</label>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as any }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2 font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="Bank Transfer">Commercial Bank of Ethiopia (CBE)</option>
              <option value="Telebirr">Telebirr Digital Wallet</option>
              <option value="Chapa">Chapa Payment Gateway</option>
              <option value="Cash">Cash Deposit at Counter</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-1">Reference / Bank Slip No.</label>
            <input
              type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. CBE-FT-981240"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2 font-mono text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-1">Payment Date</label>
            <input
              type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2 font-mono text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            />
          </div>
        </div>

        <div>
          <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-1">Description / Notes</label>
          <textarea
            value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2} placeholder="e.g. First semester tuition fee payment verified"
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2 font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting} icon={<CreditCard className="w-4 h-4" />}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOPaymentsView: React.FC = () => {
  const [activeTab, setActiveTab]       = useState<'ledger' | 'pending' | 'verified'>('ledger');

  // Ledger state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Registration verifications state
  const [pendingPayments, setPendingPayments]   = useState<any[]>([]);
  const [pendingLoading, setPendingLoading]     = useState(false);
  const [verifiedPayments, setVerifiedPayments] = useState<any[]>([]);
  const [verifiedLoading, setVerifiedLoading]   = useState(false);
  const [verifyingId, setVerifyingId]           = useState<string | null>(null);

  // Modals & Tools
  const [recordOpen, setRecordOpen]         = useState(false);
  const [receiptTx, setReceiptTx]           = useState<any | null>(null);
  const [reversalModalTxId, setReversalModalTxId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing]           = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Transactions Ledger
  const fetchTransactions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getTransactions({
        page,
        limit: 15,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      const list = res?.transactions ?? res?.data ?? [];
      setTransactions(list);
      setTotal(res?.total ?? list.length);
      setTotalPages(res?.totalPages ?? 1);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  // ── Fetch Pending Registration Payments
  const fetchPendingPayments = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await getPendingRegistrationPayments();
      setPendingPayments(data.payments || []);
    } catch {
      // Graceful fallback
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // ── Fetch Verified Registration Payments
  const fetchVerifiedPayments = useCallback(async () => {
    setVerifiedLoading(true);
    try {
      const data = await getVerifiedRegistrationPayments();
      setVerifiedPayments(data.payments || []);
    } catch {
      // Graceful fallback
    } finally {
      setVerifiedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') fetchTransactions();
    else if (activeTab === 'pending') fetchPendingPayments();
    else if (activeTab === 'verified') fetchVerifiedPayments();
  }, [activeTab, fetchTransactions, fetchPendingPayments, fetchVerifiedPayments]);

  // ── Verify Registration Payment
  const handleVerifyRegistration = async (userId: string) => {
    setVerifyingId(userId);
    try {
      await verifyRegistrationPayment(userId);
      showToast('Registration fee payment verified! Student notified & added to Registrar Queue', 'success');
      fetchPendingPayments();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to verify payment', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  // ── Unverify Registration Payment
  const handleUnverifyRegistration = async (userId: string) => {
    setVerifyingId(userId);
    try {
      await unverifyRegistrationPayment(userId);
      showToast('Registration fee payment unverification recorded', 'info');
      fetchVerifiedPayments();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to unverify payment', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  // ── Reverse Transaction Handler
  const handleReverseTransaction = async () => {
    if (!reversalModalTxId) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      showToast('Mandatory reversal reason of at least 3 characters is required', 'error');
      return;
    }
    setReversing(true);
    try {
      await reverseTransaction(reversalModalTxId, reversalReason.trim());
      showToast('Transaction reversed successfully', 'warning');
      setReversalModalTxId(null);
      setReversalReason('');
      fetchTransactions();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to reverse transaction', 'error');
    } finally {
      setReversing(false);
    }
  };

  // ── Export CSV Handler
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const csvRows = ['Transaction ID,Student Name,Student ID,Type,Category,Description,Amount (ETB),Status,Receipt ID,Reference ID,Transaction Date'];
    transactions.forEach(t => {
      const studentName = t.financialAccount?.studentRecord?.user?.fullName || 'Student';
      const studentId = t.financialAccount?.studentRecord?.studentId || '';
      csvRows.push(`"${t.id}","${studentName}","${studentId}","${t.type}","${t.category}","${t.description}",${t.amount},"${t.status}","${t.receiptId || ''}","${t.referenceId || ''}","${formatDate(t.transactionDate)}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = `Harmony_College_Payment_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    showToast('Exported payment collection ledger to CSV', 'success');
  };

  const totalCollected = transactions
    .filter(t => t.status === 'POSTED' && t.type === 'PAYMENT')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <FOPageHeader
        title="Payment Verification &amp; Collections Ledger"
        subtitle="Registration fee verification, cashier payment recording, and audited transaction ledger"
        icon={<CreditCard className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
              Export Ledger CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setRecordOpen(true)} icon={<Plus className="w-4 h-4" />}>
              Record Payment
            </Button>
          </div>
        }
      />

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-(--border-subtle) pb-3 flex-wrap">
        {[
          { id: 'ledger' as const,   label: 'Collections & Ledger',        icon: <CreditCard className="w-4 h-4" /> },
          { id: 'pending' as const,  label: `Pending Registration (${pendingPayments.length})`, icon: <Clock className="w-4 h-4" /> },
          { id: 'verified' as const, label: 'Verified Registrations',     icon: <UserCheck className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-sans text-xs font-semibold transition-all border ${
              activeTab === t.id
                ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                : 'text-(--text-muted) hover:bg-(--hover-overlay) border-(--border-default)'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: COLLECTIONS & LEDGER ── */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
              <p className="font-mono text-[10px] text-(--text-muted) uppercase tracking-wider">Total Ledger Records</p>
              <p className="font-mono text-2xl font-bold mt-1 text-(--text-primary)">{total}</p>
            </div>
            <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
              <p className="font-mono text-[10px] text-(--text-muted) uppercase tracking-wider">Page Collection Total</p>
              <p className="font-mono text-2xl font-bold mt-1 text-(--status-success)">{fmtETB(totalCollected)}</p>
            </div>
            <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
              <p className="font-mono text-[10px] text-(--text-muted) uppercase tracking-wider">Payment Transactions</p>
              <p className="font-mono text-2xl font-bold mt-1 text-(--brand-gold)">{transactions.filter(t => t.type === 'PAYMENT').length}</p>
            </div>
            <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
              <p className="font-mono text-[10px] text-(--text-muted) uppercase tracking-wider">Active Status</p>
              <p className="font-mono text-2xl font-bold mt-1 text-(--status-info)">{transactions.filter(t => t.status === 'POSTED').length}</p>
            </div>
          </div>

          {/* Filters Card */}
          <Card hoverable={false} className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by student name, receipt ID, reference..."
                  className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-10 pr-4 py-2 font-sans text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--brand-gold)"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              >
                <option value="">All Transaction Types</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="TUITION">TUITION</option>
                <option value="FEE">FEE</option>
                <option value="SCHOLARSHIP">SCHOLARSHIP</option>
                <option value="GRANT">GRANT</option>
                <option value="REFUND">REFUND</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              >
                <option value="">All Statuses</option>
                <option value="POSTED">POSTED</option>
                <option value="REVERSED">REVERSED</option>
              </select>
              <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchTransactions}>
                Refresh
              </Button>
            </div>
          </Card>

          {/* Table */}
          {loading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : error ? (
            <ErrorState compact description={error} onRetry={fetchTransactions} />
          ) : transactions.length === 0 ? (
            <EmptyState compact description="No financial transactions match your filter criteria." />
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
                <table className="w-full text-left text-xs font-sans min-w-[850px]">
                  <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                    <tr>
                      {['Student', 'Description', 'Type', 'Amount', 'Receipt / Ref', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {transactions.map(t => {
                      const studentName = t.financialAccount?.studentRecord?.user?.fullName || 'Student';
                      const studentId = t.financialAccount?.studentRecord?.studentId || '';
                      return (
                        <tr key={t.id} className="hover:bg-(--hover-overlay) transition-colors">
                          <td className="px-4 py-3 font-semibold text-(--text-primary)">
                            {studentName}
                            {studentId && <span className="block font-mono text-[10px] text-(--brand-gold)">{studentId}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-(--text-primary)">{t.description}</span>
                            <span className="block text-[10px] text-(--text-muted)">{t.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={t.type === 'PAYMENT' ? 'emerald' : t.type === 'REFUND' ? 'rose' : 'gold'}>{t.type}</Badge>
                          </td>
                          <td className={`px-4 py-3 font-mono font-bold ${t.amount < 0 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                            {fmtETB(t.amount)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">
                            {t.receiptId ? (
                              <button onClick={() => setReceiptTx(t)} className="text-(--brand-gold) hover:underline font-bold">
                                {t.receiptId}
                              </button>
                            ) : (t.referenceId || 'N/A')}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={t.status === 'POSTED' ? 'emerald' : 'rose'}>{t.status}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                            {formatDate(t.transactionDate)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {t.receiptId && (
                                <Button variant="ghost" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setReceiptTx(t)}>
                                  Receipt
                                </Button>
                              )}
                              {t.status === 'POSTED' && (
                                <button
                                  onClick={() => setReversalModalTxId(t.id)}
                                  className="px-2 py-1 rounded bg-(--hover-overlay) border border-(--border-default) text-[10px] font-mono text-(--status-danger) hover:bg-(--active-overlay) transition-colors"
                                >
                                  Reverse
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between font-sans text-xs pt-2">
                  <span className="font-mono text-xs text-(--text-muted)">
                    Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total} records
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" disabled={page <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                    <Button variant="ghost" size="sm" disabled={page >= totalPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PENDING REGISTRATION VERIFICATIONS ── */}
      {activeTab === 'pending' && (
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Pending Registration Fee Verifications</h3>
              <p className="font-sans text-xs text-(--text-muted)">
                Onboarding students who uploaded registration fee payment receipts on `/onboarding/about` awaiting Finance Officer confirmation.
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchPendingPayments}>
              Refresh Queue
            </Button>
          </div>

          {pendingLoading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : pendingPayments.length === 0 ? (
            <EmptyState compact description="No pending registration fee verification requests in queue." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-xl">
              <table className="w-full text-left text-xs font-sans min-w-[700px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Student Name', 'Email / Phone', 'Selected Department', 'Fee Submission Date', 'Verification Action'].map(h => (
                      <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {pendingPayments.map(p => (
                    <tr key={p.userId} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-semibold text-(--text-primary)">
                        {p.user?.fullName || 'Student'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                        {p.user?.email || 'N/A'} · {p.user?.phone || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-sans text-xs text-(--brand-gold)">
                        {p.selectedDepartment?.name || 'General'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                        {formatDate(p.registrationFeePaidAt || p.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={verifyingId === p.userId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          onClick={() => handleVerifyRegistration(p.userId)}
                          disabled={verifyingId === p.userId}
                        >
                          {verifyingId === p.userId ? 'Verifying...' : 'Verify Registration Fee'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 3: VERIFIED REGISTRATION PAYMENTS ── */}
      {activeTab === 'verified' && (
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Verified Registration Fee Ledger</h3>
              <p className="font-sans text-xs text-(--text-muted)">
                Students whose registration fee payment was verified by the Finance Office and added to Registrar Queue.
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchVerifiedPayments}>
              Refresh Queue
            </Button>
          </div>

          {verifiedLoading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : verifiedPayments.length === 0 ? (
            <EmptyState compact description="No verified registration fee payments found." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-xl">
              <table className="w-full text-left text-xs font-sans min-w-[700px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Student Name', 'Email / Phone', 'Department', 'Verified Date', 'Status', 'Unverify Action'].map(h => (
                      <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {verifiedPayments.map(p => (
                    <tr key={p.userId} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-semibold text-(--text-primary)">
                        {p.user?.fullName || 'Student'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                        {p.user?.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-sans text-xs text-(--brand-gold)">
                        {p.selectedDepartment?.name || 'General'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                        {formatDate(p.paymentVerifiedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="emerald">Verified</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Undo2 className="w-3.5 h-3.5 text-(--status-danger)" />}
                          onClick={() => handleUnverifyRegistration(p.userId)}
                          disabled={verifyingId === p.userId}
                        >
                          Unverify
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Record Payment Slide Panel Modal */}
      {recordOpen && (
        <RecordPaymentModal
          onClose={() => setRecordOpen(false)}
          onSuccess={() => { showToast('Payment recorded successfully!', 'success'); fetchTransactions(); }}
        />
      )}

      {/* Printable Receipt Modal */}
      <Modal isOpen={Boolean(receiptTx)} onClose={() => setReceiptTx(null)} title="Official Payment Receipt">
        {receiptTx && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
              <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                  <p className="text-[11px] text-(--text-muted)">Official Payment Receipt</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-(--text-primary)">{receiptTx.receiptId}</span>
                  <span className="block text-[10px] text-(--text-muted)">{formatDate(receiptTx.transactionDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div>
                  <span className="text-(--text-muted) text-[10px]">STUDENT NAME</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.financialAccount?.studentRecord?.user?.fullName || 'Student'}</p>
                  <p className="text-(--brand-gold)">ID: {receiptTx.financialAccount?.studentRecord?.studentId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-(--text-muted) text-[10px]">TYPE &amp; CATEGORY</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.type}</p>
                  <p className="text-(--text-muted)">{receiptTx.category}</p>
                </div>
              </div>

              <div className="border-t border-b border-(--border-subtle) py-3 space-y-2">
                <div className="flex justify-between font-semibold text-(--text-primary)">
                  <span>{receiptTx.description}</span>
                  <span className="font-mono">{fmtETB(receiptTx.amount)}</span>
                </div>
                {receiptTx.referenceId && (
                  <p className="font-mono text-[11px] text-(--text-muted)">Reference / Bank Ref: {receiptTx.referenceId}</p>
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

      {/* Reversal Audit Modal */}
      <Modal isOpen={Boolean(reversalModalTxId)} onClose={() => setReversalModalTxId(null)} title="Reverse Transaction">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-3 rounded-xl bg-(--status-warning-bg) border border-(--status-warning-border) flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0" />
            <p className="text-(--status-warning)">
              Reversing a transaction marks it as REVERSED, recalculates the student's account balance, and writes an audit log.
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-(--text-muted) uppercase mb-1">Mandatory Reversal Reason</label>
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
            <Button variant="danger" size="sm" onClick={handleReverseTransaction} disabled={reversing}>
              {reversing ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
