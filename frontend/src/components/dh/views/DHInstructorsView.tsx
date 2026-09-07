'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { UserCog, Loader2, Search, Mail, Phone, BookOpen, BarChart2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState } from '../../ui/States';
import { hodInstructorsApi, type DHInstructor } from '../../../lib/hodApi';

export const DHInstructorsView: React.FC = () => {
  const [instructors, setInstructors] = useState<DHInstructor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<'all' | 'active' | 'inactive'>('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setInstructors(await hodInstructorsApi.list()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load instructors'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = instructors.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.user.fullName.toLowerCase().includes(q) || i.employeeId.toLowerCase().includes(q) || (i.specialization ?? '').toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'active' ? i.isActive : !i.isActive);
    return matchSearch && matchFilter;
  });

  if (error) return <ErrorState variant="generic" title="Instructors unavailable" description={error} onRetry={load} />;

  const totalHours = instructors.reduce((a, i) => a + i.totalCreditHours, 0);
  const activeCount = instructors.filter(i => i.isActive).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Instructors</h1>
        <p className="font-sans text-sm text-(--text-secondary) mt-1">Department instructors with workload overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Instructors', value: instructors.length,   color: 'text-(--brand-gold)' },
          { label: 'Active',            value: activeCount,           color: 'text-(--status-success)' },
          { label: 'On Leave / Inactive', value: instructors.length - activeCount, color: 'text-(--status-warning)' },
          { label: 'Total Credit Hours', value: totalHours,           color: 'text-(--status-info)' },
        ].map(s => (
          <Card key={s.label} hoverable={false} className="p-4">
            <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all placeholder:text-(--text-faint)"
            placeholder="Search by name, ID, or specialization..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'primary' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : filtered.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center">
          <UserCog className="w-10 h-10 text-(--text-faint) mx-auto mb-3" />
          <p className="font-sans text-sm text-(--text-secondary)">{search ? 'No instructors match your search.' : 'No instructors in this department.'}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(inst => (
            <Card key={inst.id} className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-serif font-bold text-lg shrink-0">
                  {inst.user.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-serif text-sm font-bold text-(--text-primary) truncate">{inst.user.fullName}</h3>
                    <Badge variant={inst.isActive ? 'emerald' : 'glass'} className="shrink-0">{inst.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="font-mono text-xs text-(--brand-gold)">{inst.title} · {inst.employeeId}</p>
                  {inst.specialization && <p className="font-sans text-xs text-(--text-faint) mt-0.5">{inst.specialization}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Offerings',  value: inst.assignedOfferings, icon: <BookOpen className="w-3 h-3" /> },
                  { label: 'Cr. Hours',  value: inst.totalCreditHours,  icon: <BarChart2 className="w-3 h-3" /> },
                  { label: 'ECTS',       value: inst.totalEcts,          icon: <BarChart2 className="w-3 h-3" /> },
                ].map(s => (
                  <div key={s.label} className="text-center bg-(--hover-overlay) rounded-xl p-2">
                    <div className="flex justify-center text-(--text-faint) mb-0.5">{s.icon}</div>
                    <p className="font-mono text-sm font-bold text-(--text-primary)">{s.value}</p>
                    <p className="font-sans text-[10px] text-(--text-faint)">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs font-sans text-(--text-secondary)">
                {inst.user.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-(--text-faint)" />
                    <span className="truncate">{inst.user.email}</span>
                  </div>
                )}
                {inst.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-(--text-faint)" />
                    <span>{inst.user.phone}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

