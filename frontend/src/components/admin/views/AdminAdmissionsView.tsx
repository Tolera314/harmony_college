'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { ClipboardList, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Admission } from '../../../types/admin';
import { admissions } from '../../../data/adminData2';
import { programs } from '../../../data/adminData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

const statusColor: Record<Admission['status'], 'emerald'|'gold'|'amber'|'rose'|'glass'> = {
  Enrolled: 'emerald', Approved: 'gold', 'Under Review': 'amber', Applied: 'glass', Waitlisted: 'amber', Rejected: 'rose',
};

export const AdminAdmissionsView: React.FC = () => {
  const [filter, setFilter] = useState<'All'|Admission['status']>('All');
  const [selected, setSelected] = useState<Admission | null>(null);
  const filtered = admissions.filter(a => filter === 'All' || a.status === filter);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Admissions" subtitle={`${admissions.filter(a => a.status === 'Enrolled').length} enrolled · ${admissions.filter(a => a.status === 'Under Review' || a.status === 'Applied').length} pending review`}
        icon={<ClipboardList className="w-5 h-5" />} />
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Applied', 'Under Review', 'Approved', 'Enrolled', 'Waitlisted', 'Rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {s} <span className="ml-1 font-mono text-[10px] opacity-60">({admissions.filter(a => s === 'All' || a.status === s).length})</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans min-w-[750px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>{['Applicant', 'Program', 'Applied', 'Entry Score', 'Interview', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {filtered.map(a => {
              const prog = programs.find(p => p.id === a.programId);
              return (
                <tr key={a.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img src={a.avatar} alt="" className="w-8 h-8 rounded-full border border-(--border-default) shrink-0" />
                      <div><p className="font-semibold text-(--text-primary)">{a.name}</p><p className="font-mono text-[10px] text-(--text-faint)">{a.applicationId}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-(--text-secondary) text-xs">{prog?.code ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">{a.appliedAt}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">{a.entryScore > 0 ? a.entryScore : '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{a.interviewScore ?? '—'}</td>
                  <td className="px-4 py-3.5"><Badge variant={statusColor[a.status]}>{a.status}</Badge></td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(a)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      {(a.status === 'Applied' || a.status === 'Under Review') && (
                        <>
                          <button className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-emerald-500 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--status-danger) transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name} maxWidth="max-w-md">
        {selected && (
          <div className="space-y-3 font-sans text-sm">
            <div className="flex items-center gap-3">
              <img src={selected.avatar} alt="" className="w-12 h-12 rounded-xl border border-(--border-default)" />
              <div><p className="font-semibold text-(--text-primary)">{selected.email}</p><p className="font-mono text-xs text-(--text-faint)">{selected.phone}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['App ID', selected.applicationId], ['Program', programs.find(p => p.id === selected.programId)?.code], ['Status', selected.status], ['Entry Score', selected.entryScore], ['Interview', selected.interviewScore ?? '—'], ['Reviewer', selected.reviewedBy ?? '—']].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1">{v}</p>
                </div>
              ))}
            </div>
            {selected.notes && <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)"><p className="font-sans text-xs text-(--text-secondary) italic">&quot;{selected.notes}&quot;</p></div>}
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
