'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  AlertTriangle, Search, X, Mail, Phone, CreditCard,
  CalendarClock, Flag, Filter,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { financeStudents } from '../../../data/financeData';
import { FinanceStudent, FinanceRiskLevel } from '../../../types/finance';

// ── Risk config ───────────────────────────────────────────────────────────────
const riskConfig: Record<FinanceRiskLevel, { label: string; badge: 'rose'|'amber'|'gold'|'glass'; bar: string; bg: string }> = {
  Low:      { label: 'Low',      badge: 'glass', bar: '#34d399', bg: 'bg-(--status-success-bg) border-(--status-success-border)' },
  Medium:   { label: 'Medium',   badge: 'amber', bar: '#E9C349', bg: 'bg-(--status-warning-bg) border-(--status-warning-border)' },
  High:     { label: 'High',     badge: 'rose',  bar: '#fb923c', bg: 'bg-orange-950/20 border-orange-800/30' },
  Critical: { label: 'Critical', badge: 'rose',  bar: '#f87171', bg: 'bg-(--status-danger-bg) border-rose-800/30' },
};

// ── Reminder Modal ────────────────────────────────────────────────────────────
function ReminderModal({ student, onClose }: { student: FinanceStudent; onClose: () => void }) {
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [msg, setMsg] = useState(
    `Dear ${student.name},\n\nThis is a reminder that your account at Harmony College has an outstanding balance of ETB ${student.outstanding.toLocaleString()}.\n\nPlease settle your balance by visiting the Finance Office or paying via bank transfer / Telebirr.\n\nRegards,\nHarmony College Finance Office`
  );
  return (
    <SlidePanel isOpen onClose={onClose} title="Send Payment Reminder" subtitle="Finance — Outstanding Accounts" width="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-default)">
          <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-(--border-default)" />
          <div>
            <p className="font-sans text-sm font-bold text-(--text-primary)">{student.name}</p>
            <p className="font-mono text-xs text-(--status-danger)">ETB {student.outstanding.toLocaleString()} · {student.daysOverdue}d overdue</p>
          </div>
        </div>
        <div className="flex gap-3">
          {(['email','phone'] as const).map((c) => (
            <button key={c} onClick={() => setChannel(c)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border font-sans text-sm transition-colors ${channel === c ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-muted) hover:bg-(--hover-overlay)'}`}>
              {c === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              {c === 'email' ? `Email (${student.email})` : `SMS (${student.phone})`}
            </button>
          ))}
        </div>
        <div>
          <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">Message</label>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={7}
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors resize-none" />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={() => { onClose(); }} icon={<Mail className="w-4 h-4" />}>
            Send Reminder
          </Button>
        </div>
      </div>
    </SlidePanel>
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
            onClick={() => {}}>
            Send All Reminders
          </Button>
        }
      />

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['Critical','High','Medium','Low'] as FinanceRiskLevel[]).map((level) => (
          <motion.div key={level} whileHover={{ y: -3 }} onClick={() => { setRiskFilter(level); setPage(1); }}
            className={`cursor-pointer border rounded-2xl p-4 transition-all ${riskFilter === level ? 'ring-2 ring-[#E9C349]/40' : ''} ${riskConfig[level].bg}`}>
            <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{level} Risk</p>
            <p className="font-mono text-3xl font-bold mt-1" style={{ color: riskConfig[level].bar }}>{counts[level]}</p>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">students</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, ID, program…"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-(--text-faint) shrink-0" />
            {(['All','Critical','High','Medium','Low'] as const).map((r) => (
              <button key={r} onClick={() => { setRiskFilter(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${riskFilter === r ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Cards grid on mobile / table on desktop */}
      {/* Desktop table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl hidden sm:block">
        <table className="w-full text-xs sm:text-sm font-sans min-w-[860px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Student','Program','Balance','Days Overdue','Risk Level','Phone','Email','Actions'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {paginated.map((s) => (
              <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`transition-colors hover:bg-white/[0.04] ${s.riskLevel === 'Critical' ? 'bg-(--status-danger-bg)' : s.riskLevel === 'High' ? 'bg-orange-950/5' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-(--border-default) shrink-0" />
                    <div>
                      <p className="font-sans text-sm font-semibold text-(--text-primary)">{s.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-sans text-xs text-(--text-secondary) max-w-[140px]"><span className="truncate block">{s.programName}</span></td>
                <td className="p-4">
                  <p className="font-mono text-sm font-bold text-(--status-danger)">ETB {s.outstanding.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-(--text-faint)">of {s.totalCharged.toLocaleString()}</p>
                </td>
                <td className="p-4">
                  <span className={`font-mono text-sm font-bold ${s.daysOverdue > 30 ? 'text-(--status-danger)' : s.daysOverdue > 0 ? 'text-(--status-warning)' : 'text-(--text-faint)'}`}>
                    {s.daysOverdue > 0 ? `${s.daysOverdue}d` : '—'}
                  </span>
                </td>
                <td className="p-4">
                  <Badge variant={riskConfig[s.riskLevel].badge as any}>{riskConfig[s.riskLevel].label}</Badge>
                </td>
                <td className="p-4 font-mono text-xs text-(--text-muted)">{s.phone}</td>
                <td className="p-4 font-mono text-xs text-(--text-muted) max-w-[140px] truncate">{s.email}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setReminder(s)} title="Send Reminder"
                      className="p-1.5 rounded-lg bg-(--hover-overlay) hover:bg-(--accent-gold-subtle) text-(--text-faint) hover:text-(--brand-gold) transition-colors touch-target">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button title="Record Payment"
                      className="p-1.5 rounded-lg bg-(--hover-overlay) hover:bg-emerald-900/30 text-(--text-faint) hover:text-(--status-success) transition-colors touch-target">
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    <button title="Payment Plan"
                      className="p-1.5 rounded-lg bg-(--hover-overlay) hover:bg-amber-900/30 text-(--text-faint) hover:text-(--status-warning) transition-colors touch-target">
                      <CalendarClock className="w-3.5 h-3.5" />
                    </button>
                    {s.riskLevel === 'Critical' && (
                      <button title="Flag Account"
                        className="p-1.5 rounded-lg bg-(--status-danger-bg) text-(--status-danger) hover:bg-rose-900/40 transition-colors touch-target">
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
                <p className="font-sans text-sm text-(--text-faint)">No outstanding accounts match your filter.</p>
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
              <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-(--border-default)" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-bold text-(--text-primary) truncate">{s.name}</p>
                <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
              </div>
              <Badge variant={riskConfig[s.riskLevel].badge as any}>{s.riskLevel}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-sans text-(--text-muted)">Outstanding</span>
              <span className="font-mono font-bold text-(--status-danger)">ETB {s.outstanding.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-sans text-(--text-muted)">Days Overdue</span>
              <span className={`font-mono font-bold ${s.daysOverdue > 0 ? 'text-(--status-warning)' : 'text-(--text-faint)'}`}>{s.daysOverdue > 0 ? `${s.daysOverdue}d` : '—'}</span>
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
          <p className="font-mono text-xs text-(--text-faint)">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1}>Prev</Button>
            {Array.from({length: totalPages}, (_,i)=>i+1).map((p) => (
              <button key={p} onClick={()=>setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p===page?'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)':'text-(--text-faint) hover:bg-(--hover-overlay)'}`}>{p}</button>
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
