'use client';

import React, { useState, useMemo, useEffect, useCallback,useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CreditCard, Search, Filter, X, ChevronLeft, ChevronRight,
  Download, Eye, Plus, RefreshCw, Undo2, CheckCircle2, Printer
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import { Transaction, PaymentMethod } from '../../../types/finance';

import { recordStudentPayment, getTransactions, reverseTransaction, getPendingRegistrationPayments, getVerifiedRegistrationPayments, getStudentAccounts } from '../../../lib/foApi';

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}ETB ${abs}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Registration Fee Summary Card ─────────────────────────────────────────────
interface RegFeeSummary {
  totalStudents:     number;
  paidCount:         number;
  pendingCount:      number;   // paid but not yet verified by FO
  verifiedCount:     number;
  totalCollected:    number;   // verified × ETB 500
  totalPending:      number;   // submitted but unverified × ETB 500
  totalExpected:     number;   // all paid × ETB 500
}
const REG_FEE = 500; // ETB

function RegistrationFeeSummaryCard() {
  const [summary, setSummary] = useState<RegFeeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pending, verified] = await Promise.all([
          getPendingRegistrationPayments({ limit: 1 }) as Promise<any>,
          getVerifiedRegistrationPayments({ limit: 1 }) as Promise<any>,
        ]);
        const paidCount     = (pending.total ?? 0) + (verified.total ?? 0);
        const verifiedCount = verified.total ?? 0;
        const pendingCount  = pending.total  ?? 0;
        setSummary({
          totalStudents:  paidCount,
          paidCount,
          pendingCount,
          verifiedCount,
          totalCollected: verifiedCount * REG_FEE,
          totalPending:   pendingCount  * REG_FEE,
          totalExpected:  paidCount     * REG_FEE,
        });
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const pct = summary && summary.paidCount > 0
    ? Math.round((summary.verifiedCount / summary.paidCount) * 100)
    : 0;

  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--accent-gold-border)' }}>
      {/* Gold top strip */}
      <div className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Registration Fee Summary
            </p>
            <p className="text-[11px] font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
              ETB {REG_FEE.toLocaleString()} per student · one-time fee
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
            <CreditCard className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ backgroundColor: 'var(--active-overlay)' }} />
            ))}
          </div>
        ) : summary ? (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Students Paid',    value: summary.paidCount,     unit: 'students', color: 'var(--text-primary)' },
                { label: 'Verified by FO',   value: summary.verifiedCount, unit: 'students', color: 'var(--status-success)' },
                { label: 'Awaiting Review',  value: summary.pendingCount,  unit: 'students', color: '#EAB308' },
                { label: 'Total Collected',  value: `ETB ${summary.totalCollected.toLocaleString()}`, unit: '', color: 'var(--brand-gold)', large: true },
              ].map((item: any) => (
                <div key={item.label} className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                  <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    {item.label}
                  </p>
                  <p className={`font-mono font-bold mt-1.5 ${item.large ? 'text-sm' : 'text-2xl'}`}
                    style={{ color: item.color }}>
                    {item.value}
                  </p>
                  {item.unit && (
                    <p className="font-sans text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{item.unit}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Calculation breakdown */}
            <div className="p-4 rounded-xl space-y-2.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                style={{ color: 'var(--text-faint)' }}>Fee Calculation</p>
              {[
                { label: `Verified payments  (${summary.verifiedCount} × ETB ${REG_FEE})`,  value: `ETB ${summary.totalCollected.toLocaleString()}`,  color: 'var(--status-success)' },
                { label: `Pending review     (${summary.pendingCount}  × ETB ${REG_FEE})`,   value: `ETB ${summary.totalPending.toLocaleString()}`,    color: '#EAB308' },
                { label: `Total expected     (${summary.paidCount}     × ETB ${REG_FEE})`,   value: `ETB ${summary.totalExpected.toLocaleString()}`,   color: 'var(--text-primary)', bold: true },
              ].map((row: any) => (
                <div key={row.label} className={`flex items-center justify-between ${row.bold ? 'pt-2 border-t' : ''}`}
                  style={row.bold ? { borderColor: 'var(--border-subtle)' } : {}}>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'pre' }}>
                    {row.label}
                  </span>
                  <span className={`font-mono text-sm ${row.bold ? 'font-bold' : 'font-semibold'}`}
                    style={{ color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>
                  Verification progress
                </p>
                <p className="font-mono text-xs font-bold" style={{ color: 'var(--brand-gold)' }}>{pct}%</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--border-default)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
                />
              </div>
              <p className="font-sans text-[11px]" style={{ color: 'var(--text-faint)' }}>
                {summary.verifiedCount} of {summary.paidCount} paid registrations verified by Finance Officer
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs font-sans py-4 text-center" style={{ color: 'var(--text-faint)' }}>
            No registration payment data available.
          </p>
        )}
      </div>
    </div>
  );
}
// ── Record Payment Modal ───────────────────────────────────────────────────────
function RecordPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [form, setForm] = useState({
    studentId: '', method: 'Cash' as const, amount: '',
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

  const selectedStudent = students.find((s) => s.studentRecordId === form.studentId || s.id === form.studentId);

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
        studentRecordId: selectedStudent?.studentRecordId || form.studentId,
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

  const [studentAccounts, setStudentAccounts] = useState<any[]>([]);
  useEffect(() => {
    getStudentAccounts({ limit: 100 })
      .then((d: any) => { if (d?.accounts) setStudentAccounts(d.accounts); })
      .catch(() => {});
  }, []);

  const selectedAccount = studentAccounts.find((s: any) => s.id === form.studentId || s.studentRecordId === form.studentId);

  return (
    <SlidePanel isOpen onClose={onClose} title={<><Plus className="w-5 h-5 inline mr-2 text-(--brand-gold)" />Record Student Payment</>} subtitle="Finance Officer — Payments" width="max-w-xl">
      <div className="space-y-5 font-sans">
        {errors.api && <InlineError message={errors.api} />}

        {/* Student selector */}
        <div>
          <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Select Student Account *</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold) transition-colors"
          >
            <option value="" className="bg-(--bg-card-solid)">-- Select student --</option>
            {students.map((s) => (
              <option key={s.id || s.studentRecordId} value={s.studentRecordId || s.id} className="bg-(--bg-card-solid)">
                {s.student?.fullName || s.studentName || 'Student'} ({s.student?.studentId || s.studentId})
              </option>
            ))}
          </select>
          {errors.studentId && <p className="font-sans text-xs text-(--status-danger) mt-1">{errors.studentId}</p>}
        </div>

        {/* Balance hint */}
        {selectedAccount && (
          <div className="p-3 bg-[#E9C349]/5 border border-(--accent-gold-border) rounded-xl flex items-center justify-between">
            <div>
              <p className="font-sans text-xs text-(--text-secondary)">Current Outstanding Balance</p>
              <p className={`font-mono text-lg font-bold ${selectedAccount.balance > 0 ? 'text-(--status-danger)' : 'text-(--status-success)'}`}>
                {fmtETB(selectedAccount.balance ?? 0)}
              </p>
            </div>
            <Badge variant={selectedAccount.balance > 0 ? 'rose' : 'emerald'}>
              {selectedAccount.isCleared ? 'Cleared' : 'Uncleared'}
            </Badge>
          </div>
        )}

        {/* Amount + Method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Amount (ETB) *</label>
            <input
              type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold) transition-colors"
            />
            {errors.amount && <p className="font-sans text-xs text-(--status-danger) mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Payment Method *</label>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as any }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold) transition-colors"
            >
              <option value="Cash" className="bg-(--bg-card-solid)">Cash Deposit</option>
              <option value="Bank Transfer" className="bg-(--bg-card-solid)">Bank Transfer (CBE / Awash)</option>
              <option value="Telebirr" className="bg-(--bg-card-solid)">Telebirr / Mobile Money</option>
              <option value="Chapa" className="bg-(--bg-card-solid)">Chapa Online Payment</option>
            </select>
          </div>
        </div>

        {/* Reference + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Reference No. (Bank Slip / Gateway Ref)</label>
            <input
              type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. CBE-FT-981240"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold) transition-colors"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Payment Date</label>
            <input
              type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) outline-none focus:border-(--brand-gold) transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Description / Notes</label>
          <textarea
            value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2} placeholder="e.g. CBE cash deposit verified for Fall 2026 registration..."
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold) transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit} disabled={submitting} icon={<CreditCard className="w-4 h-4" />}>
            Record Payment
          </Button>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOPaymentsView: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [recordOpen, setRecordOpen]     = useState(false);
  const [receiptTx, setReceiptTx]       = useState<any | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchTransactions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getTransactions({
        page,
        limit: 15,
        search: search || undefined,
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

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchTransactions(), 280);
  }, [page, search, typeFilter, statusFilter, fetchTransactions]);

  const totalCollected = transactions
    .filter(t => t.status === 'POSTED' && t.type === 'PAYMENT')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <FOPageHeader
        title="Payment & Collections Ledger"
        subtitle={`${total} total financial transaction records`}
        icon={<CreditCard className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setRecordOpen(true)} icon={<Plus className="w-4 h-4" />}>
              Record Payment
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchTransactions} icon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
          </div>
        }
      />

      {loading && <div className="h-1 bg-(--accent-gold-subtle) rounded-full overflow-hidden"><div className="h-full bg-(--brand-gold) animate-pulse w-1/2" /></div>}

      {/* Registration Fee Summary Card */}
      <RegistrationFeeSummaryCard />

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
          <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Total Ledger Records</p>
          <p className="font-mono text-2xl font-bold mt-1 text-(--text-primary)">{total}</p>
        </div>
        <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
          <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Page Collection Total</p>
          <p className="font-mono text-2xl font-bold mt-1 text-(--status-success)">{fmtETB(totalCollected)}</p>
        </div>
        <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
          <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Payment Transactions</p>
          <p className="font-mono text-2xl font-bold mt-1 text-(--brand-gold)">{transactions.filter(t => t.type === 'PAYMENT').length}</p>
        </div>
        <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
          <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Active Status</p>
          <p className="font-mono text-2xl font-bold mt-1 text-blue-400">{transactions.filter(t => t.status === 'POSTED').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search student name, receipt ID, reference..."
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold) transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Types</option>
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
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Statuses</option>
          <option value="POSTED">POSTED</option>
          <option value="REVERSED">REVERSED</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState compact description={error} onRetry={fetchTransactions} />
      ) : transactions.length === 0 ? (
        <EmptyState variant="payments" compact description="No financial transactions match your filter criteria." />
      ) : (
        <>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs font-sans min-w-[800px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Student', 'Description', 'Type', 'Amount', 'Receipt / Ref', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
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
                        {studentId && <span className="block font-mono text-[10px] text-(--text-muted)">{studentId}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-(--text-primary)">{t.description}</span>
                        <span className="block text-[11px] text-(--text-muted)">{t.category}</span>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${t.status === 'POSTED' ? 'bg-(--status-success-bg) text-(--status-success)' : 'bg-(--status-danger-bg) text-(--status-danger)'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                        {formatDate(t.transactionDate)}
                      </td>
                      <td className="px-4 py-3">
                        {t.receiptId && (
                          <Button variant="ghost" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setReceiptTx(t)}>
                            Receipt
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-sans text-(--text-muted)">
              Showing {transactions.length} of {total} records (Page {page} of {totalPages})
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </>
      )}

      {/* Record Payment Slide Panel */}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-(--text-muted) font-mono text-[10px]">STUDENT NAME</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.financialAccount?.studentRecord?.user?.fullName || 'Student'}</p>
                  <p className="font-mono text-(--text-secondary)">ID: {receiptTx.financialAccount?.studentRecord?.studentId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-(--text-muted) font-mono text-[10px]">TYPE & CATEGORY</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.type}</p>
                  <p className="text-(--text-secondary)">{receiptTx.category}</p>
                </div>
              </div>

              <div className="border-t border-b border-(--border-subtle) py-3 space-y-2">
                <div className="flex justify-between font-semibold text-(--text-primary)">
                  <span>{receiptTx.description}</span>
                  <span className="font-mono">{fmtETB(receiptTx.amount)}</span>
                </div>
                {receiptTx.referenceId && (
                  <p className="font-mono text-[11px] text-(--text-muted)">Reference Gateway / Bank Ref: {receiptTx.referenceId}</p>
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
    </motion.div>
  );
};