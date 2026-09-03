'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CreditCard, Search, RefreshCw, ChevronLeft, ChevronRight, Eye,
  Plus, Undo2, CheckCircle2, Printer, DollarSign, FileText, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import {
  SkeletonCard, SkeletonTable, EmptyState, ErrorState,
  InlineError, useToast, ToastContainer
} from '../../ui/States';
import {
  adminFinanceApi, adminDepartmentsApi,
  AdminFinanceStats, AdminFinanceTransactionItem, ApiDepartment
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color}`}>{value}</p>
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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminPaymentsView: React.FC = () => {
  // Reference Stats & Departments
  const [stats, setStats]               = useState<AdminFinanceStats | null>(null);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Payments Ledger State
  const [transactions, setTransactions] = useState<AdminFinanceTransactionItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Filters
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<string>(''); // default to All Types
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter]     = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Modals
  // Record Payment Modal
  const [recordOpen, setRecordOpen]             = useState(false);
  const [allStudents, setAllStudents]           = useState<{ id: string; studentId: string; fullName: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentAmount, setPaymentAmount]       = useState('');
  const [paymentDesc, setPaymentDesc]           = useState('');
  const [paymentRef, setPaymentRef]             = useState('');
  const [paymentType, setPaymentType]           = useState<'PAYMENT' | 'REFUND'>('PAYMENT');
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError]           = useState('');

  // Reversal Modal
  const [reversingTx, setReversingTx]           = useState<AdminFinanceTransactionItem | null>(null);
  const [reverseReason, setReverseReason]       = useState('');
  const [reversing, setReversing]               = useState(false);
  const [reverseError, setReverseError]         = useState('');

  // Receipt Modal
  const [receiptTx, setReceiptTx]               = useState<AdminFinanceTransactionItem | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Reference Stats & Departments
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [st, depts] = await Promise.all([
        adminFinanceApi.getStats({ departmentId: deptFilter || undefined }),
        adminDepartmentsApi.list(),
      ]);
      setStats(st);
      setDepartments(depts.filter(d => d.isActive));
    } catch {
      // Graceful fallback
    } finally {
      setStatsLoading(false);
    }
  }, [deptFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch Students List for Record Payment Modal
  useEffect(() => {
    adminFinanceApi.listAccounts({ limit: 100 })
      .then(res => setAllStudents(res.accounts.map(a => ({ id: a.student.id, studentId: a.student.studentId, fullName: a.student.fullName }))))
      .catch(() => {});
  }, []);

  // ── Fetch Payment Transactions
  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminFinanceApi.listTransactions({
        page,
        limit: 15,
        search,
        type: (typeFilter || undefined) as any,
        status: statusFilter || undefined,
        departmentId: deptFilter || undefined,
      });
      setTransactions(res.transactions);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load payment transactions');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, deptFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPayments(), 280);
  }, [page, search, typeFilter, statusFilter, deptFilter, fetchPayments]);

  // ── Handle Record Payment Submission
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) { setRecordError('Please select a student'); return; }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) { setRecordError('Please enter a valid positive payment amount'); return; }
    if (!paymentDesc || paymentDesc.trim().length < 3) { setRecordError('Description must be at least 3 characters'); return; }

    setRecordError(''); setRecordSubmitting(true);
    try {
      const res = await adminFinanceApi.postTransaction({
        studentRecordId: selectedStudentId,
        type: paymentType,
        amount: amt,
        description: paymentDesc.trim(),
        referenceId: paymentRef.trim() || undefined,
      });
      showToast(`Payment recorded successfully! New student balance: ${fmtETB(res.accountBalance)}`, 'success');
      setRecordOpen(false); setSelectedStudentId(''); setPaymentAmount(''); setPaymentDesc(''); setPaymentRef('');
      fetchStats();
      fetchPayments();
    } catch (err: any) {
      setRecordError(err.message ?? 'Failed to record payment');
    } finally {
      setRecordSubmitting(false);
    }
  };

  // ── Handle Payment Reversal
  const handleReversePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingTx) return;
    if (!reverseReason || reverseReason.trim().length < 5) {
      setReverseError('Please enter a reversal reason (at least 5 characters).');
      return;
    }

    setReverseError(''); setReversing(true);
    try {
      const res = await adminFinanceApi.reverseTransaction(reversingTx.id, reverseReason.trim());
      showToast(`Payment transaction reversed! Student balance: ${fmtETB(res.accountBalance)}`, 'success');
      setReversingTx(null); setReverseReason('');
      fetchStats();
      fetchPayments();
    } catch (err: any) {
      setReverseError(err.message ?? 'Failed to reverse payment');
    } finally {
      setReversing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Payment & Revenue Ledger"
        subtitle={stats ? `Total Revenue Collected: ${fmtETB(stats.totalRevenue)} · Outstanding Balance: ${fmtETB(stats.totalOutstanding)}` : 'Loading payment records...'}
        icon={<CreditCard className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setRecordOpen(true)}>
              Record Student Payment
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchStats(); fetchPayments(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPI label="Total Revenue Collected" value={fmtETB(stats.totalRevenue)}      color="text-(--status-success)" />
          <MiniKPI label="Outstanding Debt Owed"    value={fmtETB(stats.totalOutstanding)}  color="text-(--status-danger)" />
          <MiniKPI label="Scholarships & Grants"   value={fmtETB(stats.totalScholarships)} color="text-(--brand-gold)" />
          <MiniKPI label="Cleared Students Ratio"  value={`${stats.clearedCount} / ${stats.totalAccounts}`} color="text-(--text-primary)" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by student name, ID, receipt ID, bank reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="PAYMENT">Payments Only</option>
          <option value="REFUND">Refunds Only</option>
          <option value="">All Transaction Types</option>
          <option value="TUITION">Tuition Charges</option>
          <option value="FEE">Fee Charges</option>
          <option value="SCHOLARSHIP">Scholarships</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Statuses</option>
          <option value="POSTED">POSTED</option>
          <option value="REVERSED">REVERSED</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} cols={7} />
      ) : error ? (
        <ErrorState compact description={error} onRetry={fetchPayments} />
      ) : transactions.length === 0 ? (
        <EmptyState variant="payments" compact description="No payment records match your filter criteria." />
      ) : (
        <>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs font-sans min-w-[850px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Student', 'Student ID', 'Description', 'Type', 'Amount (ETB)', 'Receipt / Gateway Ref', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3 font-semibold text-(--text-primary)">
                      {t.student.fullName}
                      <span className="block text-[11px] text-(--text-muted)">{t.student.department?.code ?? 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{t.student.studentId}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-(--text-primary)">{t.description}</span>
                      <span className="block text-[11px] text-(--text-muted)">{t.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.type === 'PAYMENT' ? 'emerald' : t.type === 'REFUND' ? 'rose' : 'gold'}>{t.type}</Badge>
                    </td>
                    <td className={`px-4 py-3 font-mono font-bold text-sm ${t.amount < 0 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
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
              Showing {transactions.length} of {total} payment records (Page {page} of {totalPages})
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </>
      )}

      {/* RECORD PAYMENT MODAL */}
      <Modal isOpen={recordOpen} onClose={() => setRecordOpen(false)} title="Record Student Payment / Deposit">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {recordError && <InlineError message={recordError} />}

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Select Student Account</label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
              required
            >
              <option value="">-- Choose Student --</option>
              {allStudents.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.studentId})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Action Type</label>
              <select
                value={paymentType}
                onChange={e => setPaymentType(e.target.value as any)}
                className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary)"
              >
                <option value="PAYMENT">PAYMENT (Credit Student Balance)</option>
                <option value="REFUND">REFUND (Overpayment Refund)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Amount (ETB)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 7500.00"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Payment Description</label>
            <Input
              placeholder="e.g. CBE Bank Transfer — Fall 2026 Tuition Settlement..."
              value={paymentDesc}
              onChange={e => setPaymentDesc(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Gateway / Bank Reference ID</label>
            <Input
              placeholder="e.g. CBE-FT-2026-981240"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-(--border-subtle)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={recordSubmitting}>Save Payment</Button>
          </div>
        </form>
      </Modal>

      {/* PAYMENT REVERSAL MODAL */}
      <Modal isOpen={Boolean(reversingTx)} onClose={() => setReversingTx(null)} title="Audited Payment Reversal">
        {reversingTx && (
          <form onSubmit={handleReversePayment} className="space-y-4">
            <div className="p-3 rounded-xl bg-(--status-danger-bg) border border-(--status-danger-border) text-xs font-sans space-y-1">
              <p className="font-semibold text-(--status-danger)">Warning: Transaction Reversal</p>
              <p className="text-(--text-secondary)">
                Reversing payment transaction <strong>{reversingTx.receiptId || reversingTx.id}</strong> ({fmtETB(reversingTx.amount)}) will update student balance immediately.
              </p>
            </div>

            {reverseError && <InlineError message={reverseError} />}

            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Mandatory Audit Reason (Min 5 chars)</label>
              <Input
                placeholder="e.g. Duplicate bank deposit entry / bank chargeback confirmed..."
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

      {/* PRINTABLE RECEIPT MODAL */}
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
                  <p className="font-semibold text-(--text-primary)">{receiptTx.student.fullName}</p>
                  <p className="font-mono text-(--text-secondary)">ID: {receiptTx.student.studentId}</p>
                </div>
                <div>
                  <span className="text-(--text-muted) font-mono text-[10px]">DEPARTMENT / PROGRAM</span>
                  <p className="font-semibold text-(--text-primary)">{receiptTx.student.department?.code ?? 'N/A'}</p>
                  <p className="text-(--text-secondary)">{receiptTx.student.program?.name ?? ''}</p>
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
    </motion.div>
  );
};
