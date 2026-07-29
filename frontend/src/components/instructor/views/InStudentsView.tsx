'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { GraduationCap, Search } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { students } from '../../../data/departmentData';
import { film402StudentIds, film301StudentIds } from '../../../data/instructorData';

export const InStudentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const myStudentIds = [...new Set([...film402StudentIds, ...film301StudentIds])];
  const myStudents = students.filter(s => myStudentIds.includes(s.id));
  const filtered = myStudents.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Students" subtitle={`${myStudents.length} students across 2 courses`} icon={<GraduationCap className="w-5 h-5" />} />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search by name or student ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[700px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Student', 'Program', 'Year', 'CGPA', 'Attendance', 'Standing'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
            {filtered.map(s => (
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
                <td className="px-4 py-3.5 text-(--text-secondary) max-w-[150px] truncate text-xs">{s.program.replace('BA ', '')}</td>
                <td className="px-4 py-3.5 text-center font-mono text-xs text-(--text-secondary)">{s.year}</td>
                <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">{s.cgpa.toFixed(2)}</td>
                <td className="px-4 py-3.5">
                  <span className={`font-mono text-xs font-semibold ${s.attendanceRate >= 90 ? 'text-(--status-success)' : s.attendanceRate >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)'}`}>
                    {s.attendanceRate}%
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={s.standing === 'Excellent' ? 'emerald' : s.standing === 'Good' ? 'gold' : s.standing === 'Warning' ? 'amber' : 'rose'}>
                    {s.standing}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
