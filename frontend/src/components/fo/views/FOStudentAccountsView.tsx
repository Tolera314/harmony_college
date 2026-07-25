'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Filter, ChevronDown, ChevronUp, Eye,
  CreditCard, Printer, History, CalendarClock, X, CheckCircle2,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { financeStudents, installmentPlans, transactions, foProfile } from '../../../data/financeData';
import { FinanceStudent, PaymentStatus } from '../../../types/finance';

// ── Helpers ────────────────────────────────────────────────────────────────────
const statusBadge: Record<PaymentStatus, { variant: 'emerald'|'amber'|'rose'|'glass'; label: string }> = {
  Paid:     { variant: 'emerald', label: 'Paid' },
  Partial:  { variant: 'amber',   label: 'Partial' },
  Unpaid:   { variant: 'rose',    label: 'Unpaid' },
  Overdue:  { variant: 'rose',    label: 'Overdue' },
  Deferred: { variant: 'glass',   label: 'Deferred' },
};

const riskColor: Record<string, string> = {
  Low:      'text-emerald-400',
  Medium:   'text-amber-400',
  High:     'text-orange-400',
  Critical: 'text-rose-400',
};

// ── Ledger Detail Modal ────────────────────────────────────────────────────────
function LedgerModal({ student, onClose }: { student: FinanceStudent; onClose: () => void }) {
  const plan = installmentPlans.find((p) => p.studentId === student.id);
  const studentTxns = transactions.filter((t) => t.studentId === student.id);

  const charges = [
    { label: 'Tuition Fee',          amount: student.tuition },
    { label: 'Administrative Fees',  amount: student.adminFees },
    { label: 'Laboratory Fees',      amount: student.labFees },
    { label: 'Library Fines',        amount: student.libraryFines },
    { label: 'Other Charges',        amount: student.otherCharges },
  ].filter((c) => c.amount > 0);

  return (
    <Modal isOpen onClose={onClose} title={<span>Ledger — <span className="text-[#E9C349]">{student.name}</span></span>} maxWidth="max-w-3xl">
      <div className="space-y-6">
        {/* Student info */}
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
          <img src={student.avatar} alt={student.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#E9C349]/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-sans font-bold text-white">{student.name}</p>
            <p className="font-mono text-xs text-[#E9C349]">{student.studentId}</p>
            <p className="font-sans text-xs text-white/50 mt-0.5">{student.programName} · Year {student.year} · {student.semester}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-2xl font-bold text-white">ETB {student.outstanding.toLocaleString()}</p>
            <p className="font-sans text-xs text-white/50 mt-0.5">Outstanding balance</p>
            <Badge variant={statusBadge[student.paymentStatus].variant} className="mt-1">{statusBadge[student.paymentStatus].label}</Badge>
          </div>
        </div>

        {/* Charges breakdown */}
        <div>
          <h4 className="font-serif text-base font-bold text-white mb-3">Charges</h4>
          <div className="space-y-2">
            {charges.map((c) => (
              <div key={c.label} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="font-sans text-sm text-white/70">{c.label}</span>
                <span className="font-mono text-sm text-white">ETB {c.amount.toLocaleString()}</span>
              </div>
            ))}
            {student.scholarshipDiscount > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="font-sans text-sm text-emerald-400">Scholarship / Discount</span>
                <span className="font-mono text-sm text-emerald-400">− ETB {student.scholarshipDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3">
              <span className="font-sans text-sm font-bold text-white">Total Charged</span>
              <span className="font-mono text-sm font-bold text-[#E9C349]">ETB {student.totalCharged.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-sm text-white/70">Total Paid</span>
              <span className="font-mono text-sm text-emerald-400">ETB {student.totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="font-sans text-sm font-bold text-white">Remaining Balance</span>
              <span className={`font-mono text-sm font-bold ${student.outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ETB {student.outstanding.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Installment plan */}
        {plan && (
          <div>
            <h4 className="font-serif text-base font-bold text-white mb-3">Installment Plan</h4>
            <div className="space-y-2">
              {plan.installments.map((inst) => (
                <div key={inst.id} className={`flex items-center gap-3 p-3 rounded-xl border ${inst.paid ? 'border-emerald-800/30 bg-emerald-950/20' : 'border-white/10 bg-white/5'}`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${inst.paid ? 'text-emerald-400' : 'text-white/20'}`} />
                  <div className="flex-1">
                    <p className="font-sans text-xs text-white/80">Due: <span className="font-mono">{inst.dueDate}</span></p>
                    {inst.paidDate && <p className="font-mono text-[10px] text-emerald-400">Paid on {inst.paidDate}</p>}
                  </div>
                  <span className="font-mono text-sm font-bold text-white">ETB {inst.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction history */}
        {studentTxns.length > 0 && (
          <div>
            <h4 className="font-serif text-base font-bold text-white mb-3">Transaction History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {studentTxns.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/8">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-xs text-white font-medium">{t.description}</p>
                    <p className="font-mono text-[10px] text-white/40">{t.referenceNumber} · {t.date} {t.time}</p>
                  </div>
                  <span className={`font-mono text-xs font-bold ${t.type === 'Scholarship' ? 'text-emerald-400' : 'text-[#E9C349]'}`}>
                    {t.type === 'Scholarship' ? '−' : '+'}ETB {Math.abs(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {student.notes && (
          <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
            <p className="font-sans text-xs text-amber-300"><span className="font-bold">Note:</span> {student.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOStudentAccountsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [sortField, setSortField] = useState<'name' | 'outstanding' | 'daysOverdue'>('outstanding');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudent | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    let list = [...financeStudents];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.programName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') list = list.filter((s) => s.paymentStatus === statusFilter);
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return mul * a.name.localeCompare(b.name);
      if (sortField === 'outstanding') return mul * (a.outstanding - b.outstanding);
      return mul * (a.daysOverdue - b.daysOverdue);
    });
    return list;
  }, [search, statusFilter, sortField, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null;

  const summary = {
    total: financeStudents.length,
    paid: financeStudents.filter((s) => s.paymentStatus === 'Paid').length,
    partial: financeStudents.filter((s) => s.paymentStatus === 'Partial').length,
    overdue: financeStudents.filter((s) => s.paymentStatus === 'Overdue').length,
    unpaid: financeStudents.filter((s) => s.paymentStatus === 'Unpaid').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Student Accounts"
        subtitle={`${financeStudents.length} students · ${foProfile.currentSemester}`}
        icon={<Users className="w-5 h-5" />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: summary.total, color: 'text-white' },
          { label: 'Fully Paid',     value: summary.paid,    color: 'text-emerald-400' },
          { label: 'Partial / Plan', value: summary.partial, color: 'text-amber-400' },
          { label: 'Overdue / Unpaid', value: summary.overdue + summary.unpaid, color: 'text-rose-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
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
              placeholder="Search student name, ID, program..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E9C349]/50 transition-colors"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-white/40 shrink-0" />
            {(['All', 'Paid', 'Partial', 'Overdue', 'Unpaid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${
                  statusFilter === s
                    ? 'bg-[#E9C349]/20 text-[#E9C349] border-[#E9C349]/40'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                }`}
              >{s}</button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[800px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider">Student</th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider">Program</th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider">Semester</th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 select-none" onClick={() => toggleSort('outstanding')}>
                <div className="flex items-center gap-1">Outstanding <SortIcon field="outstanding" /></div>
              </th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider">Status</th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 select-none" onClick={() => toggleSort('daysOverdue')}>
                <div className="flex items-center gap-1">Days Overdue <SortIcon field="daysOverdue" /></div>
              </th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider">Risk</th>
              <th className="p-4 font-mono text-[10px] text-white/40 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/90">
            {paginated.map((s) => (
              <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                    <div>
                      <p className="font-sans text-sm font-semibold text-white">{s.name}</p>
                      <p className="font-mono text-[10px] text-white/40">{s.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-sans text-xs text-white/70 max-w-[160px] truncate">{s.programName}</p>
                  <p className="font-mono text-[10px] text-white/40">Yr {s.year}</p>
                </td>
                <td className="p-4 font-mono text-xs text-white/60">{s.semester}</td>
                <td className="p-4">
                  <p className={`font-mono text-sm font-bold ${s.outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ETB {s.outstanding.toLocaleString()}
                  </p>
                  <p className="font-mono text-[10px] text-white/30">of {s.totalCharged.toLocaleString()}</p>
                </td>
                <td className="p-4">
                  <Badge variant={statusBadge[s.paymentStatus].variant}>{statusBadge[s.paymentStatus].label}</Badge>
                </td>
                <td className="p-4 font-mono text-xs">
                  {s.daysOverdue > 0
                    ? <span className="text-rose-400">{s.daysOverdue}d</span>
                    : <span className="text-white/30">—</span>}
                </td>
                <td className="p-4">
                  <span className={`font-mono text-[10px] font-bold ${riskColor[s.riskLevel]}`}>{s.riskLevel}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setSelectedStudent(s)}
                      title="View Ledger"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-[#E9C349]/15 text-white/50 hover:text-[#E9C349] transition-colors touch-target"
                    ><Eye className="w-3.5 h-3.5" /></button>
                    <button title="Record Payment" className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-900/30 text-white/50 hover:text-emerald-400 transition-colors touch-target">
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    <button title="Payment History" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors touch-target">
                      <History className="w-3.5 h-3.5" />
                    </button>
                    {s.installmentPlan && (
                      <button title="Installment Plan" className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-900/30 text-white/50 hover:text-amber-400 transition-colors touch-target">
                        <CalendarClock className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="p-12 text-center">
                <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-white/30">No students match your search.</p>
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p === page ? 'bg-[#E9C349]/20 text-[#E9C349] border border-[#E9C349]/40' : 'text-white/40 hover:bg-white/5'}`}>
                {p}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      <AnimatePresence>
        {selectedStudent && <LedgerModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};


