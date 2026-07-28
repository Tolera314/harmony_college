'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { RefreshCw, Search, X, CheckCircle2, AlertTriangle, XCircle, Clock, Eye } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { reconciliationEntries } from '../../../data/financeData';
import { ReconciliationEntry, ReconciliationStatus, GatewaySource } from '../../../types/finance';

// ── Status config ─────────────────────────────────────────────────────────────
const statusConfig: Record<ReconciliationStatus, { icon: React.ReactNode; badge: 'emerald'|'rose'|'amber'|'glass'; label: string }> = {
  Matched:        { icon: <CheckCircle2 className="w-4 h-4 text-(--status-success)" />, badge: 'emerald', label: 'Matched' },
  Unmatched:      { icon: <AlertTriangle className="w-4 h-4 text-(--status-warning)" />,  badge: 'amber',   label: 'Unmatched' },
  Failed:         { icon: <XCircle className="w-4 h-4 text-(--status-danger)" />,         badge: 'rose',    label: 'Failed' },
  'Pending Review': { icon: <Clock className="w-4 h-4 text-blue-400" />,         badge: 'glass',   label: 'Pending Review' },
};

const gatewayColor: Record<GatewaySource, string> = {
  Chapa:           'text-purple-400',
  Telebirr:        'text-green-400',
  'Bank Transfer': 'text-blue-400',
  Manual:          'text-(--text-secondary)',
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
function EntryDetailModal({ entry, onClose }: { entry: ReconciliationEntry; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Reconciliation Details" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-default)">
          {statusConfig[entry.status].icon}
          <div>
            <p className="font-sans text-sm font-bold text-(--text-primary)">{entry.status}</p>
            <p className="font-mono text-xs text-(--text-faint)">{entry.gatewayTxnId}</p>
          </div>
          <Badge variant={statusConfig[entry.status].badge} className="ml-auto">{statusConfig[entry.status].label}</Badge>
        </div>

        {[
          ['Gateway ID',    entry.gatewayTxnId],
          ['Source',        entry.source],
          ['Amount',        `ETB ${entry.amount.toLocaleString()}`],
          ['Student',       entry.studentName ?? 'Unknown'],
          ['Date',          `${entry.date}  ${entry.time}`],
          ['Matched Receipt', entry.matchedReceiptId ?? 'None'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center border-b border-(--border-subtle) pb-3">
            <span className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">{label}</span>
            <span className={`font-sans text-sm ${label === 'Amount' ? 'font-mono font-bold text-(--brand-gold)' : 'text-(--text-secondary)'}`}>{value}</span>
          </div>
        ))}

        {(entry.failureReason || entry.reviewNotes) && (
          <div className="p-3 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl">
            <p className="font-mono text-[10px] text-(--status-warning) uppercase tracking-wider mb-1">
              {entry.failureReason ? 'Failure Reason' : 'Review Notes'}
            </p>
            <p className="font-sans text-xs text-(--text-secondary)">{entry.failureReason ?? entry.reviewNotes}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {entry.status === 'Unmatched' && (
            <Button variant="primary" className="flex-1" onClick={() => { alert('Match dialog opened.'); onClose(); }}>
              Match Transaction
            </Button>
          )}
          {entry.status === 'Pending Review' && (
            <Button variant="outline" className="flex-1" onClick={() => { alert('Marked as resolved.'); onClose(); }}>
              Resolve
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOReconciliationView: React.FC = () => {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<GatewaySource | 'All'>('All');
  const [detail, setDetail]         = useState<ReconciliationEntry | null>(null);
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    let list = [...reconciliationEntries];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.gatewayTxnId.toLowerCase().includes(q) ||
        (e.studentName ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') list = list.filter((e) => e.status === statusFilter);
    if (sourceFilter !== 'All') list = list.filter((e) => e.source === sourceFilter);
    return list;
  }, [search, statusFilter, sourceFilter]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const counts = {
    Matched:        reconciliationEntries.filter((e) => e.status === 'Matched').length,
    Unmatched:      reconciliationEntries.filter((e) => e.status === 'Unmatched').length,
    Failed:         reconciliationEntries.filter((e) => e.status === 'Failed').length,
    'Pending Review': reconciliationEntries.filter((e) => e.status === 'Pending Review').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Payment Reconciliation"
        subtitle="Match gateway transactions to student receipts"
        icon={<RefreshCw className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => alert('Auto-reconciliation running…')}>
            Run Auto-Match
          </Button>
        }
      />

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: 'Matched',        color: 'text-(--status-success)', bg: 'bg-(--status-success-bg) border-(--status-success-border)' },
          { key: 'Unmatched',      color: 'text-(--status-warning)',   bg: 'bg-(--status-warning-bg) border-(--status-warning-border)' },
          { key: 'Failed',         color: 'text-(--status-danger)',    bg: 'bg-(--status-danger-bg) border-rose-800/20' },
          { key: 'Pending Review', color: 'text-blue-400',    bg: 'bg-blue-950/20 border-blue-800/20' },
        ] as const).map((s) => (
          <motion.div key={s.key} whileHover={{ y: -3 }}
            onClick={() => { setStatusFilter(s.key as ReconciliationStatus); setPage(1); }}
            className={`cursor-pointer border rounded-2xl p-4 transition-all ${s.bg} ${statusFilter === s.key ? 'ring-2 ring-[#E9C349]/40' : ''}`}>
            <div className="flex items-center gap-2 mb-1">{statusConfig[s.key as ReconciliationStatus].icon}<p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{s.key}</p></div>
            <p className={`font-mono text-3xl font-bold ${s.color}`}>{counts[s.key as keyof typeof counts]}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search gateway ID, student name…"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All','Matched','Unmatched','Failed','Pending Review'] as const).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s as ReconciliationStatus|'All'); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${statusFilter === s ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All','Chapa','Telebirr','Bank Transfer'] as const).map((s) => (
              <button key={s} onClick={() => { setSourceFilter(s as GatewaySource|'All'); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${sourceFilter === s ? 'bg-(--active-overlay) text-(--text-primary) border-white/30' : 'bg-(--hover-overlay) text-(--text-faint) border-(--border-default) hover:bg-(--hover-overlay)'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-xs sm:text-sm font-sans min-w-[800px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Gateway ID','Student','Source','Amount','Date','Status','Actions'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {paginated.map((e) => (
              <tr key={e.id} className={`transition-colors hover:bg-white/[0.04] ${
                e.status === 'Failed' ? 'bg-(--status-danger-bg)' :
                e.status === 'Unmatched' ? 'bg-(--status-warning-bg)' : ''
              }`}>
                <td className="p-4 font-mono text-xs text-(--text-secondary)">{e.gatewayTxnId}</td>
                <td className="p-4">
                  <p className="font-sans text-sm text-(--text-primary) font-medium">{e.studentName ?? <span className="text-(--text-faint) italic">Unknown</span>}</p>
                  {e.studentId && <p className="font-mono text-[10px] text-(--text-faint)">{e.studentId}</p>}
                </td>
                <td className="p-4">
                  <span className={`font-sans text-xs font-semibold ${gatewayColor[e.source]}`}>{e.source}</span>
                </td>
                <td className="p-4 font-mono text-sm font-bold text-(--brand-gold)">ETB {e.amount.toLocaleString()}</td>
                <td className="p-4 font-mono text-xs text-(--text-muted)">{e.date}<br /><span className="text-(--text-faint)">{e.time}</span></td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    {statusConfig[e.status].icon}
                    <Badge variant={statusConfig[e.status].badge}>{statusConfig[e.status].label}</Badge>
                  </div>
                  {e.failureReason && <p className="font-sans text-[10px] text-(--status-danger) mt-1 max-w-[180px] truncate">{e.failureReason}</p>}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setDetail(e)} title="View Details"
                      className="p-1.5 rounded-lg bg-(--hover-overlay) hover:bg-(--accent-gold-subtle) text-(--text-faint) hover:text-(--brand-gold) transition-colors touch-target">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {(e.status === 'Unmatched' || e.status === 'Pending Review') && (
                      <button title="Match / Resolve"
                        className="px-2 py-1 rounded-lg bg-(--accent-gold-subtle) hover:bg-(--accent-gold-subtle) text-(--brand-gold) font-mono text-[10px] transition-colors">
                        {e.status === 'Unmatched' ? 'Match' : 'Resolve'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center">
                <RefreshCw className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-(--text-faint)">No entries match your filter.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-(--text-faint)">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={page===1}>Prev</Button>
            {Array.from({length:totalPages},(_,i)=>i+1).map((p)=>(
              <button key={p} onClick={()=>setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p===page?'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)':'text-(--text-faint) hover:bg-(--hover-overlay)'}`}>{p}</button>
            ))}
            <Button variant="ghost" size="sm" onClick={()=>setPage((p)=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detail && <EntryDetailModal entry={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
