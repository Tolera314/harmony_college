'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Search, X, Download, Filter, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { foAuditLog } from '../../../data/financeData';
import { FOAuditEntry } from '../../../types/finance';

const statusConfig: Record<FOAuditEntry['status'], { icon: React.ReactNode; badge: 'emerald'|'amber'|'rose' }> = {
  Success: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, badge: 'emerald' },
  Warning: { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,  badge: 'amber'   },
  Failed:  { icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,         badge: 'rose'    },
};

export const FOAuditLogView: React.FC = () => {
  const [search, setSearch]       = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<FOAuditEntry['status'] | 'All'>('All');
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 10;

  const modules = ['All', ...Array.from(new Set(foAuditLog.map((e) => e.module)))];

  const filtered = useMemo(() => {
    let list = [...foAuditLog];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.action.toLowerCase().includes(q) ||
        e.officerName.toLowerCase().includes(q) ||
        (e.studentName ?? '').toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q)
      );
    }
    if (moduleFilter !== 'All') list = list.filter((e) => e.module === moduleFilter);
    if (statusFilter !== 'All') list = list.filter((e) => e.status === statusFilter);
    list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return list;
  }, [search, moduleFilter, statusFilter]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Audit Log"
        subtitle="Complete record of all finance officer actions"
        icon={<ClipboardList className="w-5 h-5" />}
        actions={
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}
            onClick={() => alert('Exporting audit log…')}>
            Export CSV
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entries', value: foAuditLog.length, color: 'text-white' },
          { label: 'Warnings',      value: foAuditLog.filter((e) => e.status === 'Warning').length, color: 'text-amber-400' },
          { label: 'Failed',        value: foAuditLog.filter((e) => e.status === 'Failed').length,  color: 'text-rose-400'  },
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
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search action, officer, student, module…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E9C349]/50 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Filter className="w-4 h-4 text-white/40 self-center" />
            {modules.slice(0, 7).map((m) => (
              <button key={m} onClick={() => { setModuleFilter(m); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${moduleFilter === m ? 'bg-[#E9C349]/20 text-[#E9C349] border-[#E9C349]/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['All','Success','Warning','Failed'] as const).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${statusFilter === s ? 'bg-[#E9C349]/20 text-[#E9C349] border-[#E9C349]/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-xs font-sans min-w-[900px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Date & Time','Officer','Student','Action','Module','Amount','Prev Value','New Value','Status'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.map((e) => (
              <tr key={e.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-4 font-mono text-xs text-white/50 whitespace-nowrap">{e.date}<br /><span className="text-white/30">{e.time}</span></td>
                <td className="p-4">
                  <p className="font-sans text-xs text-white font-medium whitespace-nowrap">{e.officerName}</p>
                  <p className="font-mono text-[10px] text-white/40">{e.officerId}</p>
                </td>
                <td className="p-4">
                  {e.studentName
                    ? <><p className="font-sans text-xs text-white/70 whitespace-nowrap">{e.studentName}</p><p className="font-mono text-[10px] text-white/30">{e.studentId}</p></>
                    : <span className="text-white/20 italic text-xs">—</span>}
                </td>
                <td className="p-4 font-sans text-xs text-white/80 max-w-[150px]">
                  <span className="truncate block">{e.action}</span>
                </td>
                <td className="p-4">
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-white/8 rounded-full text-white/50">{e.module}</span>
                </td>
                <td className="p-4 font-mono text-xs text-[#E9C349]">
                  {e.amount != null ? `ETB ${e.amount.toLocaleString()}` : <span className="text-white/20">—</span>}
                </td>
                <td className="p-4 font-mono text-[10px] text-white/40 max-w-[120px]">
                  <span className="truncate block">{e.previousValue ?? '—'}</span>
                </td>
                <td className="p-4 font-mono text-[10px] text-white/60 max-w-[140px]">
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
                <p className="font-sans text-sm text-white/30">No log entries match your filter.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-white/40">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={page===1}>Prev</Button>
            {Array.from({length:totalPages},(_,i)=>i+1).map((p)=>(
              <button key={p} onClick={()=>setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p===page?'bg-[#E9C349]/20 text-[#E9C349] border border-[#E9C349]/40':'text-white/40 hover:bg-white/5'}`}>{p}</button>
            ))}
            <Button variant="ghost" size="sm" onClick={()=>setPage((p)=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
