'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, Search, X, Mail, Phone, CreditCard,
  CalendarClock, Flag, Filter,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { financeStudents } from '../../../data/financeData';
import { FinanceStudent, FinanceRiskLevel } from '../../../types/finance';

// ── Risk config ───────────────────────────────────────────────────────────────
const riskConfig: Record<FinanceRiskLevel, { label: string; badge: 'rose'|'amber'|'gold'|'glass'; bar: string; bg: string }> = {
  Low:      { label: 'Low',      badge: 'glass', bar: '#34d399', bg: 'bg-emerald-950/10 border-emerald-800/20' },
  Medium:   { label: 'Medium',   badge: 'amber', bar: '#E9C349', bg: 'bg-amber-950/20 border-amber-800/30' },
  High:     { label: 'High',     badge: 'rose',  bar: '#fb923c', bg: 'bg-orange-950/20 border-orange-800/30' },
  Critical: { label: 'Critical', badge: 'rose',  bar: '#f87171', bg: 'bg-rose-950/20 border-rose-800/30' },
};

// ── Reminder Modal ────────────────────────────────────────────────────────────
function ReminderModal({ student, onClose }: { student: FinanceStudent; onClose: () => void }) {
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [msg, setMsg] = useState(
    `Dear ${student.name},\n\nThis is a reminder that your account at Harmony College has an outstanding balance of ETB ${student.outstanding.toLocaleString()}.\n\nPlease settle your balance by visiting the Finance Office or paying via bank transfer / Telebirr.\n\nRegards,\nHarmony College Finance Office`
  );
  return (
    <Modal isOpen onClose={onClose} title="Send Payment Reminder" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
          <div>
            <p className="font-sans text-sm font-bold text-white">{student.name}</p>
            <p className="font-mono text-xs text-rose-400">ETB {student.outstanding.toLocaleString()} · {student.daysOverdue}d overdue</p>
          </div>
        </div>
        <div className="flex gap-3">
          {(['email','phone'] as const).map((c) => (
            <button key={c} onClick={() => setChannel(c)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border font-sans text-sm transition-colors ${channel === c ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
              {c === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              {c === 'email' ? `Email (${student.email})` : `SMS (${student.phone})`}
            </button>
          ))}
        </div>
        <div>
          <label className="block font-mono text-[11px] text-white/40 uppercase tracking-wider mb-2">Message</label>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={7}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white outline-none focus:border-[#E9C349]/50 transition-colors resize-none" />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={() => { alert('Reminder sent!'); onClose(); }} icon={<Mail className="w-4 h-4" />}>
            Send Reminder
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOOutstandingView: React.FC = () => {
  const [search, setSearch]         = useState('');
  const [riskFilter, setRiskFilter] = useState<FinanceRiskLevel | 'All'>('All');
  const [reminder, setReminder]     = useState<FinanceStudent | null>(null);
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 8;

  const outstanding = useMemo(() =>
    financeStudents.filter((s) => s.outstanding > 0), []);

  const filtered = useMemo(() => {
    let list = [...outstanding];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.programName.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== 'All') list = list.filter((s) => s.riskLevel === riskFilter);
    list.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return list;
  }, [search, riskFilter, outstanding]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const totalOwed  = outstanding.reduce((s, st) => s + st.outstanding, 0);

  const counts = {
    Critical: outstanding.filter((s) => s.riskLevel === 'Critical').length,
    High:     outstanding.filter((s) => s.riskLevel === 'High').length,
    Medium:   outstanding.filter((s) => s.riskLevel === 'Medium').length,
    Low:      outstanding.filter((s) => s.riskLevel === 'Low').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Outstanding Accounts"
        subtitle={`${outstanding.length} students with unpaid balances · ETB ${(totalOwed/1000).toFixed(0)}K total outstanding`}
        icon={<AlertTriangle className="w-5 h-5" />}
        actions={
          <Button variant="danger" size="sm" icon={<Mail className="w-4 h-4" />}
            onClick={() => alert('Bulk reminder sent to all overdue accounts.')}>
            Send All Reminders
          </Button>
        }
      />

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['Critical','High','Medium','Low'] as FinanceRiskLevel[]).map((level) => (
          <motion.div key={level} whileHover={{ y: -3 }} onClick={() => { setRiskFilter(level); setPage(1); }}
            className={`cursor-pointer border rounded-2xl p-4 transition-all ${riskFilter === level ? 'ring-2 ring-[#E9C349]/40' : ''} ${riskConfig[level].bg}`}>
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{level} Risk</p>
            <p className="font-mono text-3xl font-bold mt-1" style={{ color: riskConfig[level].bar }}>{counts[level]}</p>
            <p className="font-sans text-xs text-white/40 mt-0.5">students</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, ID, program…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E9C349]/50 transition-colors"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-white/40 shrink-0" />
            {(['All','Critical','High','Medium','Low'] as const).map((r) => (
              <button key={r} onClick={() => { setRiskFilter(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${riskFilter === r ? 'bg-[#E9C349]/20 text-[#E9C349] border-[#E9C349]/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Cards grid on mobile / table on desktop */}
      {/* Desktop table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl hidden sm:block">
        <table className="w-full text-xs sm:text-sm font-sans min-w-[860px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Student','Program','Balance','Days Overdue','Risk Level','Phone','Email','Actions'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.map((s) => (
              <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`transition-colors hover:bg-white/[0.04] ${s.riskLevel === 'Critical' ? 'bg-rose-950/10' : s.riskLevel === 'High' ? 'bg-orange-950/5' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                    <div>
                      <p className="font-sans text-sm font-semibold text-white">{s.name}</p>
                      <p className="font-mono text-[10px] text-white/40">{s.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-sans text-xs text-white/60 max-w-[140px]"><span className="truncate block">{s.programName}</span></td>
                <td className="p-4">
                  <p className="font-mono text-sm font-bold text-rose-400">ETB {s.outstanding.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-white/30">of {s.totalCharged.toLocaleString()}</p>
                </td>
                <td className="p-4">
                  <span className={`font-mono text-sm font-bold ${s.daysOverdue > 30 ? 'text-rose-400' : s.daysOverdue > 0 ? 'text-amber-400' : 'text-white/30'}`}>
                    {s.daysOverdue > 0 ? `${s.daysOverdue}d` : '—'}
                  </span>
                </td>
                <td className="p-4">
                  <Badge variant={riskConfig[s.riskLevel].badge as any}>{riskConfig[s.riskLevel].label}</Badge>
                </td>
                <td className="p-4 font-mono text-xs text-white/50">{s.phone}</td>
                <td className="p-4 font-mono text-xs text-white/50 max-w-[140px] truncate">{s.email}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setReminder(s)} title="Send Reminder"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-[#E9C349]/15 text-white/40 hover:text-[#E9C349] transition-colors touch-target">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button title="Record Payment"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-900/30 text-white/40 hover:text-emerald-400 transition-colors touch-target">
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    <button title="Payment Plan"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-900/30 text-white/40 hover:text-amber-400 transition-colors touch-target">
                      <CalendarClock className="w-3.5 h-3.5" />
                    </button>
                    {s.riskLevel === 'Critical' && (
                      <button title="Flag Account"
                        className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 transition-colors touch-target">
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="p-12 text-center">
                <AlertTriangle className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-white/30">No outstanding accounts match your filter.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {paginated.map((s) => (
          <div key={s.id} className={`border rounded-2xl p-4 space-y-3 ${riskConfig[s.riskLevel].bg}`}>
            <div className="flex items-center gap-3">
              <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-bold text-white truncate">{s.name}</p>
                <p className="font-mono text-[10px] text-white/40">{s.studentId}</p>
              </div>
              <Badge variant={riskConfig[s.riskLevel].badge as any}>{s.riskLevel}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-sans text-white/50">Outstanding</span>
              <span className="font-mono font-bold text-rose-400">ETB {s.outstanding.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-sans text-white/50">Days Overdue</span>
              <span className={`font-mono font-bold ${s.daysOverdue > 0 ? 'text-amber-400' : 'text-white/30'}`}>{s.daysOverdue > 0 ? `${s.daysOverdue}d` : '—'}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setReminder(s)} icon={<Mail className="w-3.5 h-3.5" />}>Remind</Button>
              <Button variant="secondary" size="sm" className="flex-1" icon={<CreditCard className="w-3.5 h-3.5" />}>Pay</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-white/40">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1}>Prev</Button>
            {Array.from({length: totalPages}, (_,i)=>i+1).map((p) => (
              <button key={p} onClick={()=>setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p===page?'bg-[#E9C349]/20 text-[#E9C349] border border-[#E9C349]/40':'text-white/40 hover:bg-white/5'}`}>{p}</button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {reminder && <ReminderModal student={reminder} onClose={() => setReminder(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
