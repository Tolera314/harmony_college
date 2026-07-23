'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Search, Download, Plus } from 'lucide-react';
import { AdminStudent } from '../../../types/admin';
import { adminStudents, programs } from '../../../data/adminData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const AdminStudentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All'|AdminStudent['status']>('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const standingBadge = (s: AdminStudent['standing']) => {
    const m: Record<string, 'emerald'|'gold'|'amber'|'rose'> = { Excellent: 'emerald', Good: 'gold', Warning: 'amber', Probation: 'rose' };
    return <Badge variant={m[s]}>{s}</Badge>;
  };

  const filtered = adminStudents.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchS = statusFilter === 'All' || s.status === statusFilter;
    return matchQ && matchS;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Students" subtitle={`${adminStudents.filter(s => s.status === 'Active').length} active · ${adminStudents.filter(s => s.tuitionBalance > 0).length} with outstanding balance`}
        icon={<GraduationCap className="w-5 h-5" />}
        actions={<div className="flex gap-2"><Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button><Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add Student</Button></div>}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, ID, or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
          {['All', 'Active', 'Graduated', 'Suspended', 'Dropped', 'On Leave'].map(s => <option key={s} className="bg-[#1a1a1b]" value={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans min-w-[900px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>{['Student', 'Program', 'Year', 'CGPA', 'Attendance', 'Balance', 'Standing', 'Status'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.length === 0 ? <tr><td colSpan={8} className="text-center py-16 text-white/30">No students found.</td></tr>
            : paginated.map(s => {
              const prog = programs.find(p => p.id === s.programId);
              return (
                <tr key={s.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      <div><p className="font-semibold text-white">{s.name}</p><p className="font-mono text-[10px] text-white/40">{s.studentId}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-white/60 max-w-[140px] truncate">{prog?.code ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-white/60 text-center">{s.year}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-white">{s.cgpa.toFixed(2)}</td>
                  <td className="px-4 py-3.5"><span className={`font-mono text-xs font-semibold ${s.attendanceRate >= 90 ? 'text-emerald-400' : s.attendanceRate >= 80 ? 'text-[#E9C349]' : 'text-rose-400'}`}>{s.attendanceRate}%</span></td>
                  <td className="px-4 py-3.5"><span className={`font-mono text-xs font-semibold ${s.tuitionBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{s.tuitionBalance > 0 ? `ETB ${s.tuitionBalance.toLocaleString()}` : 'Cleared'}</span></td>
                  <td className="px-4 py-3.5">{standingBadge(s.standing)}</td>
                  <td className="px-4 py-3.5"><Badge variant={s.status === 'Active' ? 'emerald' : s.status === 'Suspended' ? 'amber' : 'glass'}>{s.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-white/40">{filtered.length} students · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
