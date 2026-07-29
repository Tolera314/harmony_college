'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { FileText, Search, Download, Filter } from 'lucide-react';
import { adminAuditLog } from '../../../data/adminData2';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/States';
import { Input } from '../../ui/Input';

export const AdminAuditLogsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [impersonatedOnly, setImpersonatedOnly] = useState(false);
  const modules = ['All', ...Array.from(new Set(adminAuditLog.map(e => e.module)))];
  const filtered = adminAuditLog.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.action.toLowerCase().includes(q) || e.user.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    const matchM = moduleFilter === 'All' || e.module === moduleFilter;
    const matchI = !impersonatedOnly || e.isImpersonated;
    return matchQ && matchM && matchI;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Audit Logs" subtitle={`${adminAuditLog.length} events · ${adminAuditLog.filter(e => e.isImpersonated).length} via role override`}
        icon={<FileText className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search actions, users, descriptions..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          {modules.map(m => <option key={m} className="bg-(--bg-card-solid)" value={m}>{m}</option>)}
        </select>
        <button onClick={() => setImpersonatedOnly(!impersonatedOnly)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${impersonatedOnly ? 'bg-(--status-warning-bg) border-amber-700/50 text-(--status-warning)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
          <Filter className="w-3.5 h-3.5" />Role Override Only
        </button>
      </div>
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>{['Timestamp', 'User', 'Role', 'Module', 'Action', 'IP', 'Status', 'Override'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {filtered.length === 0 ? <tr><td colSpan={8} className="p-0"><EmptyState variant="audit" compact /></td></tr>
            : filtered.map(entry => (
              <tr key={entry.id} className={`hover:bg-(--hover-overlay) transition-colors ${entry.isImpersonated ? 'bg-(--status-warning-bg)' : ''}`}>
                <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-muted) whitespace-nowrap">{entry.timestamp}</td>
                <td className="px-4 py-3.5 font-semibold text-(--text-primary) text-xs">{entry.user}</td>
                <td className="px-4 py-3.5"><Badge variant={entry.role === 'Super Admin' ? 'gold' : 'glass'} className="text-[10px]">{entry.role}</Badge></td>
                <td className="px-4 py-3.5"><Badge variant="glass" className="text-[10px]">{entry.module}</Badge></td>
                <td className="px-4 py-3.5 text-(--text-primary) font-semibold">{entry.action}</td>
                <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-faint)">{entry.ip}</td>
                <td className="px-4 py-3.5"><Badge variant={entry.status === 'Success' ? 'emerald' : entry.status === 'Warning' ? 'amber' : 'rose'}>{entry.status}</Badge></td>
                <td className="px-4 py-3.5">{entry.isImpersonated ? <span className="font-mono text-[10px] text-(--status-warning) bg-(--status-warning-bg) px-2 py-0.5 rounded-full">Role Override</span> : <span className="text-(--text-faint)">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
