'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserCheck, Search } from 'lucide-react';
import { employees, departments } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const AdminFacultyView: React.FC = () => {
  const [search, setSearch] = useState('');
  const faculty = employees.filter(e => e.position.toLowerCase().includes('professor') || e.position.toLowerCase().includes('lecturer') || e.position.toLowerCase().includes('instructor'));
  const filtered = faculty.filter(f => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.employeeId.toLowerCase().includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Faculty" subtitle={`${faculty.filter(f => f.status === 'Active').length} active · ${faculty.length} total`} icon={<UserCheck className="w-5 h-5" />} />
      <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search faculty..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(f => {
          const dept = departments.find(d => d.id === f.departmentId);
          return (
            <motion.div key={f.id} whileHover={{ y: -3 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:bg-white/[0.08] transition-all">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img src={f.avatar} alt={f.name} className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0F0F10] ${f.status === 'Active' ? 'bg-emerald-400' : f.status === 'On Leave' ? 'bg-amber-400' : 'bg-white/30'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-white truncate">{f.name}</p>
                  <Badge variant={f.rank === 'Professor' ? 'gold' : f.rank === 'Associate Professor' ? 'emerald' : 'glass'} className="mt-1 text-[10px]">{f.rank}</Badge>
                </div>
              </div>
              <p className="font-sans text-xs text-white/50 truncate">{f.specialization}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>{dept?.name.split(' ')[0]}</span>
                <span>{f.employeeId}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
