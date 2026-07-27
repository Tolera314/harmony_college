'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
    <Modal isOpen onClose={onClose} title={<><Plus className="w-5 h-5 inline mr-2 text-[#E9C349]" />Record Payment</>} maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Student selector */}
        <div>
          <label className="block font-mono text-[11px] text-white/50 uppercase tracking-wider mb-2">Student *</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-sans text-sm text-white outline-none focus:border-[#E9C349]/50 transition-colors"
          >
            <option value="" style={{ backgroundColor: 'var(--bg-panel)' }}>Select student...</option>
            {financeStudents.map((s) => (
              <option key={s.id} value={s.id} style={{ backgroundColor: 'var(--bg-panel)' }}>
                {s.name} — {s.studentId}
              </option>
            ))}
          </select>
          {errors.studentId && <p className="font-sans text-xs text-rose-400 mt-1">{errors.studentId}</p>}
        </div>

        {/* Outstanding balance hint */}
        {selected && (
          <div className="p-3 bg-[#E9C349]/5 border border-[#E9C349]/20 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-sans text-xs text-white/70">Outstanding Balance</p>
              <p className="font-mono text-lg font-bold text-[#E9C349]">ETB {selected.outstanding.toLocaleString()}</p>
            </div>
            <Badge variant={selected.outstanding > 0 ? 'rose' : 'emerald'}>{selected.paymentStatus}</Badge>
          </div>
        )}

        {/* Amount + Method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] text-white/50 uppercase tracking-wider mb-2">Amount (ETB) *</label>
            <input
              type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/20 outline-none focus:border-[#E9C349]/50 transition-colors"
            />
            {errors.amount && <p className="font-sans text-xs text-rose-400 mt-1">{errors.amount}</p>}
            {selected && Number(form.amount) > 0 && (
              <p className="font-sans text-[10px] text-white/40 mt-1">
                Remaining after: ETB {Math.max(0, selected.outstanding - Number(form.amount)).toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <label className="block font-mono text-[11px] text-white/50 uppercase tracking-wider mb-2">Payment Method *</label>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-sans text-sm text-white outline-none focus:border-[#E9C349]/50 transition-colors"
            >
              {(['Cash', 'Bank Transfer', 'Telebirr', 'Chapa'] as PaymentMethod[]).map((m) => (
                <option key={m} value={m} style={{ backgroundColor: 'var(--bg-panel)' }}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reference + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] text-white/50 uppercase tracking-wider mb-2">Reference No. *</label>
            <input
              type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. BT-HC-12345"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/20 outline-none focus:border-[#E9C349]/50 transition-colors"
            />
            {errors.reference && <p className="font-sans text-xs text-rose-400 mt-1">{errors.reference}</p>}
          </div>
          <div>
            <label className="block font-mono text-[11px] text-white/50 uppercase tracking-wider mb-2">Payment Date</label>
            <input
              type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-[#E9C349]/50 transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-mono text-[11px] text-white/50 uppercase tracking-wider mb-2">Notes (optional)</label>
          <textarea
            value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2} placeholder="Add any notes about this payment..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-sans text-sm text-white placeholder:text-white/20 outline-none focus:border-[#E9C349]/50 transition-colors resize-none"
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
          <div key={label} className="flex justify-between items-start border-b border-white/5 pb-3">
            <span className="font-mono text-[11px] text-white/40 uppercase tracking-wider shrink-0">{label}</span>
            <span className={`font-sans text-sm text-right ml-4 ${label === 'Amount' ? 'font-mono font-bold text-[#E9C349]' : 'text-white/80'}`}>{value}</span>
          </div>
        ))}
        {txn.gatewayTxnId && (
          <div className="flex justify-between items-start border-b border-white/5 pb-3">
            <span className="font-mono text-[11px] text-white/40 uppercase tracking-wider">Gateway ID</span>
            <span className="font-mono text-xs text-white/60">{txn.gatewayTxnId}</span>
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
    Cash: 'text-amber-400', 'Bank Transfer': 'text-blue-400',
    Telebirr: 'text-green-400', Chapa: 'text-purple-400',
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
          { label: 'Total Transactions', value: transactions.length, mono: true, color: 'text-white' },
          { label: 'Total Collected', value: `ETB ${(totalAmount/1000).toFixed(0)}K`, mono: true, color: 'text-[#E9C349]' },
          { label: 'Cash Payments', value: transactions.filter((t) => t.paymentMethod === 'Cash').length, mono: true, color: 'text-amber-400' },
          { label: 'Online Payments', value: transactions.filter((t) => t.paymentMethod !== 'Cash').length, mono: true, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by student, reference, type..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E9C349]/50 transition-colors"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-white/40 shrink-0" />
            {(['All', 'Cash', 'Bank Transfer', 'Telebirr', 'Chapa'] as const).map((m) => (
              <button key={m} onClick={() => { setMethodFilter(m as PaymentMethod | 'All'); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${methodFilter === m ? 'bg-[#E9C349]/20 text-[#E9C349] border-[#E9C349]/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                {m}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-xs sm:text-sm font-sans min-w-[860px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">Student</th>
              <th className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">Type</th>
              <th className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">Method</th>
              <th className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">Reference</th>
              <th className="p-4 text-right font-mono text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 select-none" onClick={() => { setSortField('amount'); setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center justify-end gap-1">Amount {sortField === 'amount' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 select-none" onClick={() => { setSortField('date'); setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center gap-1">Date {sortField === 'date' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">Status</th>
              <th className="p-4 text-center font-mono text-[10px] text-white/40 uppercase tracking-wider">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-4">
                  <p className="font-sans text-sm text-white font-medium truncate max-w-[140px]">{t.studentName}</p>
                  <p className="font-mono text-[10px] text-white/40 truncate">{t.studentProgramName}</p>
                </td>
                <td className="p-4 font-sans text-xs text-white/60">{t.type}</td>
                <td className="p-4">
                  <span className={`font-sans text-xs font-medium ${methodColors[t.paymentMethod] ?? 'text-white/60'}`}>{t.paymentMethod}</span>
                </td>
                <td className="p-4 font-mono text-xs text-white/50">{t.referenceNumber}</td>
                <td className="p-4 text-right font-mono text-sm font-bold text-[#E9C349]">
                  ETB {t.amount.toLocaleString()}
                </td>
                <td className="p-4 font-mono text-xs text-white/50">{t.date}<br /><span className="text-white/30">{t.time}</span></td>
                <td className="p-4">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                    t.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                    t.status === 'Pending'   ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                    'bg-rose-950/40 text-rose-300 border-rose-800/40'
                  }`}>{t.status}</span>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => setDetailTxn(t)} className="p-1.5 rounded-lg bg-white/5 hover:bg-[#E9C349]/15 text-white/40 hover:text-[#E9C349] transition-colors touch-target">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="p-12 text-center">
                <CreditCard className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-white/30">No transactions found.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-white/40">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p === page ? 'bg-[#E9C349]/20 text-[#E9C349] border border-[#E9C349]/40' : 'text-white/40 hover:bg-white/5'}`}>
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
