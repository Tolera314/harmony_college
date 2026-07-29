'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Search, Plus } from 'lucide-react';
import { programs } from '../../../data/adminData';
import { departments } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const AdminProgramsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const filtered = programs.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Programs" subtitle={`${programs.filter(p => p.status === 'Active').length} active · ${programs.filter(p => p.status === 'Under Review').length} under review`}
        icon={<BookOpen className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add Program</Button>}
      />
      <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search programs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans min-w-[800px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>{['Program', 'Code', 'Department', 'Level', 'Duration', 'Credits', 'Students', 'Courses', 'Status'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {filtered.map(p => {
              const dept = departments.find(d => d.id === p.departmentId);
              return (
                <tr key={p.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-(--text-primary)">{p.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--brand-gold)">{p.code}</td>
                  <td className="px-4 py-3.5 text-(--text-secondary) max-w-[130px] truncate">{dept?.name.split(' ')[0]}</td>
                  <td className="px-4 py-3.5"><Badge variant={p.level === 'Undergraduate' ? 'glass' : p.level === 'Postgraduate' ? 'gold' : 'amber'} className="text-[10px]">{p.level}</Badge></td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{p.duration}yr</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{p.credits}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">{p.studentCount}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{p.courseCount}</td>
                  <td className="px-4 py-3.5"><Badge variant={p.status === 'Active' ? 'emerald' : p.status === 'Under Review' ? 'amber' : 'glass'}>{p.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
