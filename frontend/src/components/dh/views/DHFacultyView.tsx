'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Mail, Phone, MapPin, BookOpen, Clock } from 'lucide-react';
import { Faculty } from '../../../types/department';
import { faculty, courses } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { Input } from '../../ui/Input';

const rankColors: Record<string, 'gold' | 'emerald' | 'amber' | 'glass'> = {
  Professor: 'gold',
  'Associate Professor': 'emerald',
  'Assistant Professor': 'amber',
  Lecturer: 'glass',
  'Visiting Lecturer': 'glass',
};

const statusColor: Record<Faculty['status'], string> = {
  Active: 'text-(--status-success)', 'On Leave': 'text-(--status-warning)', 'Part-Time': 'text-(--text-secondary)',
};

const workloadPct = (h: number, max: number) => Math.min(100, (h / max) * 100);
const workloadColor = (pct: number) => pct > 85 ? '#f87171' : pct > 65 ? '#E9C349' : '#34d399';

export const DHFacultyView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('All');
  const [selected, setSelected] = useState<Faculty | null>(null);

  const ranks = ['All', 'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Visiting Lecturer'];

  const filtered = faculty.filter((f) => {
    const q = search.toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.specialization.toLowerCase().includes(q);
    const matchR = rankFilter === 'All' || f.rank === rankFilter;
    return matchQ && matchR;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Faculty Management"
        subtitle={`${faculty.filter(f => f.status === 'Active').length} active · ${faculty.filter(f => f.status === 'On Leave').length} on leave`}
        icon={<Users className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search faculty by name or specialization..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ranks.map((r) => (
            <button key={r} onClick={() => setRankFilter(r)}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all whitespace-nowrap ${rankFilter === r ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-20 text-(--text-faint) font-sans text-sm">No faculty match your search.</div>
        ) : filtered.map((f) => {
          const assignedCourses = courses.filter((c) => f.courseIds.includes(c.id));
          const pct = workloadPct(f.weeklyHours, f.maxHours);
          return (
            <motion.div
              key={f.id}
              whileHover={GESTURE.cardHover}
              onClick={() => setSelected(f)}
              className="bg-(--hover-overlay) border border-(--border-default) backdrop-blur-xl rounded-2xl p-5 cursor-pointer hover:bg-(--hover-overlay) hover:border-(--border-strong) transition-all shadow-xl"
            >
              {/* Top */}
              <div className="flex items-start gap-4 mb-4">
                <div className="relative shrink-0">
                  <img src={f.avatar} alt={f.name} className="w-14 h-14 rounded-xl object-cover border-2 border-(--border-default)" />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-(--bg-base) ${f.status === 'Active' ? 'bg-(--status-success)' : f.status === 'On Leave' ? 'bg-(--status-warning)' : 'bg-white/40'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base font-bold text-(--text-primary) truncate">{f.name}</p>
                  <Badge variant={rankColors[f.rank] ?? 'glass'} className="mt-1 text-[10px]">{f.rank}</Badge>
                  <p className="font-sans text-[11px] text-(--text-muted) mt-1 truncate">{f.specialization}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                  <Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{f.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /><span>{f.officeRoom}</span>
                </div>
              </div>

              {/* Courses */}
              <div className="flex items-center gap-2 mb-4 text-xs text-(--text-secondary)">
                <BookOpen className="w-3.5 h-3.5 text-(--brand-gold)" />
                <span>{assignedCourses.length} course{assignedCourses.length !== 1 ? 's' : ''} assigned</span>
              </div>

              {/* Workload bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Weekly Load</div>
                  <span style={{ color: workloadColor(pct) }}>{f.weeklyHours}h / {f.maxHours}h</span>
                </div>
                <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: workloadColor(pct) }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2, duration: 0.7 }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail — SlidePanel */}
      <SlidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle="Faculty Profile"
        width="max-w-xl"
      >
        {selected && (() => {
          const assignedCourses = courses.filter((c) => selected.courseIds.includes(c.id));
          const pct = workloadPct(selected.weeklyHours, selected.maxHours);
          return (
            <div className="space-y-5 text-sm font-sans">
              <div className="flex items-center gap-4">
                <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-(--border-default)" />
                <div>
                  <Badge variant={rankColors[selected.rank] ?? 'glass'}>{selected.rank}</Badge>
                  <p className={`font-sans text-xs mt-2 font-semibold ${statusColor[selected.status]}`}>● {selected.status}</p>
                  <p className="text-(--text-muted) text-xs mt-1">{selected.specialization}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Email', selected.email], ['Phone', selected.phone], ['Office', selected.officeRoom], ['Employee ID', selected.id], ['Joined', selected.joinedYear], ['Department', selected.department]].map(([k, v]) => (
                  <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                    <p className="text-(--text-secondary) text-xs mt-1 truncate">{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-(--text-muted)">
                  <span>Weekly Workload</span>
                  <span className="font-mono" style={{ color: workloadColor(pct) }}>{selected.weeklyHours}h / {selected.maxHours}h max</span>
                </div>
                <div className="h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: workloadColor(pct) }} />
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-3">Assigned Courses</p>
                {assignedCourses.length === 0 ? (
                  <p className="text-(--text-faint) text-xs">No courses assigned this semester.</p>
                ) : (
                  <div className="space-y-2">
                    {assignedCourses.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                        <div>
                          <span className="font-mono text-xs text-(--brand-gold)">{c.code}</span>
                          <span className="text-(--text-secondary) text-xs ml-2">{c.title}</span>
                        </div>
                        <Badge variant="glass">{c.credits}cr</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </SlidePanel>
    </motion.div>
  );
};
