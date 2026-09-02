'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { ClipboardList, Search, X, Download, Filter, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { FOAuditEntry } from '../../../types/finance';
import { getAuditLogs } from '../../../lib/foApi';

const statusConfig: Record<FOAuditEntry['status'], { icon: React.ReactNode; badge: 'emerald'|'amber'|'rose' }> = {
  Success: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-(--status-success)" />, badge: 'emerald' },
  Warning: { icon: <AlertTriangle className="w-3.5 h-3.5 text-(--status-warning)" />,  badge: 'amber'   },
  Failed:  { icon: <XCircle className="w-3.5 h-3.5 text-(--status-danger)" />,         badge: 'rose'    },
};

export const FOAuditLogView: React.FC = () => {
  const [auditLog,     setAuditLog]     = useState<FOAuditEntry[]>([]);
  const [total,        setTotal]        = useState(0);
  const [search,       setSearch]       = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<FOAuditEntry['status'] | 'All'>('All');
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 10;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadLogs = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const data: any = await getAuditLogs({ search: search || undefined, status: statusFilter !== 'All' ? statusFilter : undefined, page, limit: PAGE_SIZE });
        if (data && Array.isArray(data.logs)) { setAuditLog(data.logs); setTotal(data.total ?? data.logs.length); }
        else if (data && Array.isArray(data))  { setAuditLog(data); setTotal(data.length); }
      } catch { /* keep default */ }
    }, 280);
  }, [search, statusFilter, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const modules = ['All', ...Array.from(new Set(auditLog.map((e) => e.module)))];

  const filtered = useMemo(() => {
    let list = [...auditLog];
    if (moduleFilter !== 'All') list = list.filter((e) => e.module === moduleFilter);
    list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return list;
  }, [auditLog, moduleFilter]);

  const paginated  = filtered;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Audit Log"
        subtitle="Complete record of all finance officer actions"
        icon={<ClipboardList className="w-5 h-5" />}
        actions={
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}
            onClick={() => {}}>
            Export CSV
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entries', value: total, color: 'text-(--text-primary)' },
          { label: 'Warnings',      value: auditLog.filter((e) => e.status === 'Warning').length, color: 'text-(--status-warning)' },
          { label: 'Failed',        value: auditLog.filter((e) => e.status === 'Failed').length,  color: 'text-(--status-danger)'  },
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
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search action, officer, student, module…"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Filter className="w-4 h-4 text-(--text-faint) self-center" />
            {modules.slice(0, 7).map((m) => (
              <button key={m} onClick={() => { setModuleFilter(m); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${moduleFilter === m ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['All','Success','Warning','Failed'] as const).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${statusFilter === s ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)' : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-xs font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Date & Time','Officer','Student','Action','Module','Amount','Prev Value','New Value','Status'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {paginated.map((e) => (
              <tr key={e.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-4 font-mono text-xs text-(--text-muted) whitespace-nowrap">{e.date}<br /><span className="text-(--text-faint)">{e.time}</span></td>
                <td className="p-4">
                  <p className="font-sans text-xs text-(--text-primary) font-medium whitespace-nowrap">{e.officerName}</p>
                  <p className="font-mono text-[10px] text-(--text-faint)">{e.officerId}</p>
                </td>
                <td className="p-4">
                  {e.studentName
                    ? <><p className="font-sans text-xs text-(--text-secondary) whitespace-nowrap">{e.studentName}</p><p className="font-mono text-[10px] text-(--text-faint)">{e.studentId}</p></>
                    : <span className="text-(--text-faint) italic text-xs">—</span>}
                </td>
                <td className="p-4 font-sans text-xs text-(--text-secondary) max-w-[150px]">
                  <span className="truncate block">{e.action}</span>
                </td>
                <td className="p-4">
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-(--hover-overlay) rounded-full text-(--text-muted)">{e.module}</span>
                </td>
                <td className="p-4 font-mono text-xs text-(--brand-gold)">
                  {e.amount != null ? `ETB ${e.amount.toLocaleString()}` : <span className="text-(--text-faint)">—</span>}
                </td>
                <td className="p-4 font-mono text-[10px] text-(--text-faint) max-w-[120px]">
                  <span className="truncate block">{e.previousValue ?? '—'}</span>
                </td>
                <td className="p-4 font-mono text-[10px] text-(--text-secondary) max-w-[140px]">
                  <span className="truncate block">{e.newValue ?? '—'}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    {statusConfig[e.status].icon}
                    <Badge variant={statusConfig[e.status].badge}>{e.status}</Badge>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={9} className="p-12 text-center">
                <ClipboardList className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-(--text-faint)">No log entries match your filter.</p>
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
    </motion.div>
  );
};
