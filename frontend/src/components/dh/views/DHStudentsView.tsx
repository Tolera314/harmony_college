'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { GraduationCap, Search, Download } from 'lucide-react';
import { DeptStudent } from '../../../types/department';
import { students, faculty } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

const standingConfig: Record<DeptStudent['standing'], { variant: 'emerald'|'gold'|'amber'|'rose'; color: string }> = {
  Excellent: { variant: 'emerald', color: 'text-(--status-success)' },
  Good:      { variant: 'gold',    color: 'text-(--brand-gold)' },
  Warning:   { variant: 'amber',   color: 'text-(--status-warning)' },
  Probation: { variant: 'rose',    color: 'text-(--status-danger)' },
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
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
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
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${yearFilter === y ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              {y === 'All' ? 'All Years' : `Year ${y}`}
            </button>
          ))}
          <select value={standingFilter} onChange={(e) => { setStandingFilter(e.target.value as typeof standingFilter); setPage(1); }}
            className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            {['All', 'Excellent', 'Good', 'Warning', 'Probation'].map((s) => <option key={s} value={s} className="bg-(--bg-card-solid)">{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Student', 'Program', 'Year', 'CGPA', 'Credits', 'Attendance', 'Standing', 'Advisor', 'Risk'].map((h) => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
            {paginated.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16 text-(--text-faint) font-sans text-sm">No students match your filters.</td></tr>
            ) : paginated.map((s) => {
              const advisor = faculty.find((f) => f.id === s.advisorId);
              const sc = standingConfig[s.standing];
              const rc = riskConfig[s.riskLevel];
              const attColor = s.attendanceRate >= 90 ? 'text-(--status-success)' : s.attendanceRate >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)';
              return (
                <tr key={s.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-(--border-default) shrink-0" />
                      <div>
                        <p className="font-semibold text-(--text-primary) text-xs">{s.name}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-(--text-secondary) max-w-[150px]">
                    <span className="truncate block text-xs">{s.program.replace('BA ', '')}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-(--text-secondary)">{s.year}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">{s.cgpa.toFixed(2)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{s.creditsEarned}/{s.totalCredits}</td>
                  <td className="px-4 py-3.5">
                    <span className={`font-mono text-xs font-semibold ${attColor}`}>{s.attendanceRate}%</span>
                  </td>
                  <td className="px-4 py-3.5"><Badge variant={sc.variant}>{s.standing}</Badge></td>
                  <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[120px]">
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
          <p className="font-sans text-xs text-(--text-faint)">{filtered.length} students · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
