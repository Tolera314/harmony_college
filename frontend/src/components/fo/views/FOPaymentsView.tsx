'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CreditCard, Search, Filter, X, ChevronDown, ChevronUp,
  Download, Eye, Plus,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { transactions, financeStudents } from '../../../data/financeData';
import { Transaction, PaymentMethod } from '../../../types/finance';

// ── Record Payment Modal ───────────────────────────────────────────────────────
function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    studentId: '', method: 'Cash' as PaymentMethod, amount: '',
    reference: '', date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId)       e.studentId = 'Select a student';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    if (!form.reference.trim()) e.reference = 'Reference number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    alert(`Payment of ETB ${Number(form.amount).toLocaleString()} recorded successfully!\nReceipt will be generated.`);
    onClose();
  };

  const selected = financeStudents.find((s) => s.id === form.studentId);

  return (
    <Modal isOpen onClose={onClose} title={<><Plus className="w-5 h-5 inline mr-2 text-(--brand-gold)" />Record Payment</>} maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Student selector */}
        <div>
          <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Student *</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
          >
            <option value="" className="bg-(--bg-card-solid)">Select student...</option>
            {financeStudents.map((s) => (
              <option key={s.id} value={s.id} className="bg-(--bg-card-solid)">
                {s.name} — {s.studentId}
              </option>
            ))}
          </select>
          {errors.studentId && <p className="font-sans text-xs text-(--status-danger) mt-1">{errors.studentId}</p>}
        </div>

        {/* Outstanding balance hint */}
        {selected && (
          <div className="p-3 bg-[#E9C349]/5 border border-(--accent-gold-border) rounded-xl flex items-center justify-between">
            <div>
              <p className="font-sans text-xs text-(--text-secondary)">Outstanding Balance</p>
              <p className="font-mono text-lg font-bold text-(--brand-gold)">ETB {selected.outstanding.toLocaleString()}</p>
            </div>
            <Badge variant={selected.outstanding > 0 ? 'rose' : 'emerald'}>{selected.paymentStatus}</Badge>
          </div>
        )}

        {/* Amount + Method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Amount (ETB) *</label>
            <input
              type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
            {errors.amount && <p className="font-sans text-xs text-(--status-danger) mt-1">{errors.amount}</p>}
            {selected && Number(form.amount) > 0 && (
              <p className="font-sans text-[10px] text-(--text-faint) mt-1">
                Remaining after: ETB {Math.max(0, selected.outstanding - Number(form.amount)).toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Payment Method *</label>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
            >
              {(['Cash', 'Bank Transfer', 'Telebirr', 'Chapa', 'Cheque'] as PaymentMethod[]).map((m) => (
                <option key={m} value={m} className="bg-(--bg-card-solid)">{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reference + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Reference No. *</label>
            <input
              type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. BT-HC-12345"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
            {errors.reference && <p className="font-sans text-xs text-(--status-danger) mt-1">{errors.reference}</p>}
          </div>
          <div>
            <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Payment Date</label>
            <input
              type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-mono text-[11px] text-(--text-muted) uppercase tracking-wider mb-2">Notes (optional)</label>
          <textarea
            value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2} placeholder="Add any notes about this payment..."
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit} icon={<CreditCard className="w-4 h-4" />}>
            Record Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Transaction Detail Modal ───────────────────────────────────────────────────
function TxnDetailModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Transaction Details" maxWidth="max-w-md">
      <div className="space-y-4">
        {[
          ['Transaction ID', txn.id],
          ['Student', txn.studentName],
          ['Program', txn.studentProgramName],
          ['Type', txn.type],
          ['Description', txn.description],
          ['Amount', `ETB ${txn.amount.toLocaleString()}`],
          ['Payment Method', txn.paymentMethod],
          ['Reference Number', txn.referenceNumber],
          ['Cashier', txn.cashierName],
          ['Date & Time', `${txn.date} ${txn.time}`],
          ['Status', txn.status],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-start border-b border-(--border-subtle) pb-3">
            <span className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider shrink-0">{label}</span>
            <span className={`font-sans text-sm text-right ml-4 ${label === 'Amount' ? 'font-mono font-bold text-(--brand-gold)' : 'text-(--text-secondary)'}`}>{value}</span>
          </div>
        ))}
        {txn.gatewayTxnId && (
          <div className="flex justify-between items-start border-b border-(--border-subtle) pb-3">
            <span className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Gateway ID</span>
            <span className="font-mono text-xs text-(--text-secondary)">{txn.gatewayTxnId}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOPaymentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'All'>('All');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [recordOpen, setRecordOpen] = useState(false);
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.studentName.toLowerCase().includes(q) ||
        t.referenceNumber.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      );
    }
    if (methodFilter !== 'All') list = list.filter((t) => t.paymentMethod === methodFilter);
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'amount') return mul * (a.amount - b.amount);
      return mul * (a.date + a.time).localeCompare(b.date + b.time);
    });
    return list;
  }, [search, methodFilter, sortField, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const totalAmount = filtered.filter((t) => t.status === 'Completed').reduce((s, t) => s + t.amount, 0);

  const methodColors: Record<string, string> = {
    Cash: 'text-(--status-warning)', 'Bank Transfer': 'text-blue-400',
    Telebirr: 'text-green-400', Chapa: 'text-purple-400', Cheque: 'text-(--text-secondary)',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Payments"
        subtitle={`${transactions.length} transactions recorded this semester`}
        icon={<CreditCard className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" onClick={() => setRecordOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Record Payment
          </Button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Transactions', value: transactions.length, mono: true, color: 'text-(--text-primary)' },
          { label: 'Total Collected', value: `ETB ${(totalAmount/1000).toFixed(0)}K`, mono: true, color: 'text-(--brand-gold)' },
          { label: 'Cash Payments', value: transactions.filter((t) => t.paymentMethod === 'Cash').length, mono: true, color: 'text-(--status-warning)' },
          { label: 'Online Payments', value: transactions.filter((t) => t.paymentMethod !== 'Cash').length, mono: true, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
            <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by student, reference, type..."
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-(--text-faint) shrink-0" />
            {(['All', 'Cash', 'Bank Transfer', 'Telebirr', 'Chapa'] as const).map((m) => (
              <button key={m} onClick={() => { setMethodFilter(m as PaymentMethod | 'All'); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${methodFilter === m ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'}`}>
                {m}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-xs sm:text-sm font-sans min-w-[860px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Student</th>
              <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Type</th>
              <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Method</th>
              <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Reference</th>
              <th className="p-4 text-right font-mono text-[10px] text-(--text-faint) uppercase tracking-wider cursor-pointer hover:text-(--text-secondary) select-none" onClick={() => { setSortField('amount'); setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center justify-end gap-1">Amount {sortField === 'amount' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider cursor-pointer hover:text-(--text-secondary) select-none" onClick={() => { setSortField('date'); setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center gap-1">Date {sortField === 'date' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Status</th>
              <th className="p-4 text-center font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {paginated.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-4">
                  <p className="font-sans text-sm text-(--text-primary) font-medium truncate max-w-[140px]">{t.studentName}</p>
                  <p className="font-mono text-[10px] text-(--text-faint) truncate">{t.studentProgramName}</p>
                </td>
                <td className="p-4 font-sans text-xs text-(--text-secondary)">{t.type}</td>
                <td className="p-4">
                  <span className={`font-sans text-xs font-medium ${methodColors[t.paymentMethod] ?? 'text-(--text-secondary)'}`}>{t.paymentMethod}</span>
                </td>
                <td className="p-4 font-mono text-xs text-(--text-muted)">{t.referenceNumber}</td>
                <td className="p-4 text-right font-mono text-sm font-bold text-(--brand-gold)">
                  ETB {t.amount.toLocaleString()}
                </td>
                <td className="p-4 font-mono text-xs text-(--text-muted)">{t.date}<br /><span className="text-(--text-faint)">{t.time}</span></td>
                <td className="p-4">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                    t.status === 'Completed' ? 'bg-(--status-success-bg) text-(--status-success) border-(--status-success-border)' :
                    t.status === 'Pending'   ? 'bg-(--status-warning-bg) text-(--status-warning) border-(--status-warning-border)' :
                    'bg-(--status-danger-bg) text-(--status-danger) border-rose-800/40'
                  }`}>{t.status}</span>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => setDetailTxn(t)} className="p-1.5 rounded-lg bg-(--hover-overlay) hover:bg-(--accent-gold-subtle) text-(--text-faint) hover:text-(--brand-gold) transition-colors touch-target">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="p-12 text-center">
                <CreditCard className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-(--text-faint)">No transactions found.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-(--text-faint)">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p === page ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-faint) hover:bg-(--hover-overlay)'}`}>
                {p}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {recordOpen && <RecordPaymentModal onClose={() => setRecordOpen(false)} />}
        {detailTxn && <TxnDetailModal txn={detailTxn} onClose={() => setDetailTxn(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
