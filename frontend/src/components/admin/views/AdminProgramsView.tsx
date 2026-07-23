'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Programs" subtitle={`${programs.filter(p => p.status === 'Active').length} active · ${programs.filter(p => p.status === 'Under Review').length} under review`}
        icon={<BookOpen className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add Program</Button>}
      />
      <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search programs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans min-w-[800px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>{['Program', 'Code', 'Department', 'Level', 'Duration', 'Credits', 'Students', 'Courses', 'Status'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(p => {
              const dept = departments.find(d => d.id === p.departmentId);
              return (
                <tr key={p.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-white">{p.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#E9C349]">{p.code}</td>
                  <td className="px-4 py-3.5 text-white/60 max-w-[130px] truncate">{dept?.name.split(' ')[0]}</td>
                  <td className="px-4 py-3.5"><Badge variant={p.level === 'Undergraduate' ? 'glass' : p.level === 'Postgraduate' ? 'gold' : 'amber'} className="text-[10px]">{p.level}</Badge></td>
                  <td className="px-4 py-3.5 font-mono text-xs text-white/60">{p.duration}yr</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-white/60">{p.credits}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-white">{p.studentCount}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-white/60">{p.courseCount}</td>
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
