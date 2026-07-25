'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Search, Download } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { hrAuditLog } from '../../../data/hrData';

const statusConfig: Record<'Success'|'Warning'|'Failed', { variant: 'emerald'|'amber'|'rose' }> = {
  Success: { variant: 'emerald' },
  Warning: { variant: 'amber' },
  Failed:  { variant: 'rose' },
};

export const HRAuditLogView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const modules = ['All', ...Array.from(new Set(hrAuditLog.map(e => e.module)))];

  const filtered = hrAuditLog.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.action.toLowerCase().includes(q) || e.employee.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    const matchM = moduleFilter === 'All' || e.module === moduleFilter;
    return matchQ && matchM;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Audit Logs"
        subtitle={`${hrAuditLog.length} events recorded`}
        icon={<ClipboardList className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search actions, employees, descriptions..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {modules.map(m => (
            <button key={m} onClick={() => { setModuleFilter(m); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all whitespace-nowrap ${moduleFilter === m ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[750px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Date & Time', 'Action', 'Employee', 'Module', 'User', 'Description', 'Status'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/85">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-white/30">No log entries found.</td></tr>
            ) : paginated.map(entry => (
              <tr key={entry.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-4 py-3.5 font-mono text-[11px] text-white/50 whitespace-nowrap">{entry.date}</td>
                <td className="px-4 py-3.5 font-sans text-xs font-semibold text-white">{entry.action}</td>
                <td className="px-4 py-3.5 text-white/70 text-xs">{entry.employee}</td>
                <td className="px-4 py-3.5"><Badge variant="glass" className="text-[10px]">{entry.module}</Badge></td>
                <td className="px-4 py-3.5 text-white/60 text-xs">{entry.user}</td>
                <td className="px-4 py-3.5 text-white/55 text-xs max-w-[220px] truncate">{entry.description}</td>
                <td className="px-4 py-3.5"><Badge variant={statusConfig[entry.status].variant}>{entry.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-white/40">{filtered.length} entries · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
