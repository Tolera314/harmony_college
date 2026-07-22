'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Search, Download } from 'lucide-react';
import { DeptStudent } from '../../../types/department';
import { students, faculty } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

const standingConfig: Record<DeptStudent['standing'], { variant: 'emerald'|'gold'|'amber'|'rose'; color: string }> = {
  Excellent: { variant: 'emerald', color: 'text-emerald-400' },
  Good:      { variant: 'gold',    color: 'text-[#E9C349]' },
  Warning:   { variant: 'amber',   color: 'text-amber-400' },
  Probation: { variant: 'rose',    color: 'text-rose-400' },
};

const riskConfig: Record<DeptStudent['riskLevel'], { variant: 'emerald'|'gold'|'amber'|'rose' }> = {
  Low:      { variant: 'emerald' },
  Medium:   { variant: 'amber' },
  High:     { variant: 'rose' },
  Critical: { variant: 'rose' },
};

export const DHStudentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<'All'|'1'|'2'|'3'|'4'>('All');
  const [standingFilter, setStandingFilter] = useState<'All'|DeptStudent['standing']>('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.program.toLowerCase().includes(q);
    const matchY = yearFilter === 'All' || s.year === Number(yearFilter);
    const matchSt = standingFilter === 'All' || s.standing === standingFilter;
    return matchQ && matchY && matchSt;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Student Performance"
        subtitle={`${students.length} enrolled · ${students.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Critical').length} at risk`}
        icon={<GraduationCap className="w-5 h-5" />}
        actions={
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export CSV</Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, ID, or program..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['All', '1', '2', '3', '4'] as const).map((y) => (
            <button key={y} onClick={() => { setYearFilter(y); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${yearFilter === y ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
              {y === 'All' ? 'All Years' : `Year ${y}`}
            </button>
          ))}
          <select value={standingFilter} onChange={(e) => { setStandingFilter(e.target.value as typeof standingFilter); setPage(1); }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
            {['All', 'Excellent', 'Good', 'Warning', 'Probation'].map((s) => <option key={s} value={s} className="bg-[#1a1a1b]">{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Student', 'Program', 'Year', 'CGPA', 'Credits', 'Attendance', 'Standing', 'Advisor', 'Risk'].map((h) => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/85">
            {paginated.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16 text-white/30 font-sans text-sm">No students match your filters.</td></tr>
            ) : paginated.map((s) => {
              const advisor = faculty.find((f) => f.id === s.advisorId);
              const sc = standingConfig[s.standing];
              const rc = riskConfig[s.riskLevel];
              const attColor = s.attendanceRate >= 90 ? 'text-emerald-400' : s.attendanceRate >= 80 ? 'text-[#E9C349]' : 'text-rose-400';
              return (
                <tr key={s.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      <div>
                        <p className="font-semibold text-white text-xs">{s.name}</p>
                        <p className="font-mono text-[10px] text-white/40">{s.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-white/60 max-w-[150px]">
                    <span className="truncate block text-xs">{s.program.replace('BA ', '')}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-white/60">{s.year}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-white">{s.cgpa.toFixed(2)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-white/60">{s.creditsEarned}/{s.totalCredits}</td>
                  <td className="px-4 py-3.5">
                    <span className={`font-mono text-xs font-semibold ${attColor}`}>{s.attendanceRate}%</span>
                  </td>
                  <td className="px-4 py-3.5"><Badge variant={sc.variant}>{s.standing}</Badge></td>
                  <td className="px-4 py-3.5 text-white/60 text-xs truncate max-w-[120px]">
                    {advisor ? advisor.name.replace('Dr. ', '').replace('Prof. ', '') : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={rc.variant}>{s.riskLevel}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-white/40">{filtered.length} students · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
