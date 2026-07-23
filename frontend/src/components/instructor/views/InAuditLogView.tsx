'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Search, Download } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { instructorAuditLog } from '../../../data/instructorData';

const statusConfig: Record<string, { variant: 'emerald'|'amber'|'rose' }> = {
  Success: { variant: 'emerald' }, Warning: { variant: 'amber' }, Failed: { variant: 'rose' },
};

export const InAuditLogView: React.FC = () => {
  const [search, setSearch] = useState('');
  const filtered = instructorAuditLog.filter(e => {
    const q = search.toLowerCase();
    return !q || e.action.toLowerCase().includes(q) || e.course.toLowerCase().includes(q) || (e.student?.toLowerCase().includes(q));
  });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Audit Log" subtitle={`${instructorAuditLog.length} events recorded`} icon={<FileText className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>} />

      <div className="flex gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search actions, courses, students..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[700px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Date & Time', 'Action', 'Course', 'Student', 'Status'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/85">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-4 py-3.5 font-mono text-[11px] text-white/50 whitespace-nowrap">{e.date}</td>
                <td className="px-4 py-3.5 font-sans text-xs font-semibold text-white">{e.action}</td>
                <td className="px-4 py-3.5"><Badge variant="glass" className="text-[10px]">{e.course}</Badge></td>
                <td className="px-4 py-3.5 text-white/55 text-xs">{e.student ?? '—'}</td>
                <td className="px-4 py-3.5"><Badge variant={statusConfig[e.status].variant}>{e.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
