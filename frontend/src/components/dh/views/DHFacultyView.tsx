'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Mail, BookOpen, Clock, RefreshCw } from 'lucide-react';
import { hodFacultyApi, type FacultySummary, type FacultyDetail } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SlidePanel } from '../../ui/SlidePanel';
import { Input } from '../../ui/Input';
import { ErrorState, EmptyState, SkeletonCard } from '../../ui/States';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const workloadColor = (offerings: number) =>
  offerings >= 4 ? '#f87171' : offerings >= 2 ? '#E9C349' : '#34d399';

export const DHFacultyView: React.FC = () => {
  const [faculty,  setFaculty]  = useState<FacultySummary[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<FacultyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 12;

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodFacultyApi.list({ page: p, limit: LIMIT, search: q || undefined });
      setFaculty(res.faculty);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load faculty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await hodFacultyApi.get(id);
      setSelected(d);
    } catch { /* silently fail */ }
    finally { setDetailLoading(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const activeFaculty = faculty.filter(f => f.isActive).length;

  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page, search)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Faculty Management"
        subtitle={loading ? 'Loading…' : `${activeFaculty} active · ${total} total in department`}
        icon={<Users className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page, search)}>Refresh</Button>}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search faculty by name, employee ID, or specialization…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : faculty.length === 0 ? (
        <EmptyState variant="faculty" description="No faculty members found matching your search." compact />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {faculty.map(f => (
            <motion.div
              key={f.id}
              whileHover={GESTURE.cardHover}
              onClick={() => openDetail(f.id)}
              className="bg-(--hover-overlay) border border-(--border-default) backdrop-blur-xl rounded-2xl p-5 cursor-pointer hover:border-(--border-strong) transition-all shadow-xl"
            >
              {/* Avatar + info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center">
                    <span className="font-serif font-bold text-2xl text-(--brand-gold)">{f.fullName.charAt(0)}</span>
                  </div>
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-(--bg-base) ${f.isActive ? 'bg-(--status-success)' : 'bg-(--status-warning)'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base font-bold text-(--text-primary) truncate">{f.fullName}</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5 font-medium">{f.title}</p>
                  <p className="font-sans text-[11px] text-(--text-faint) mt-0.5 truncate">{f.specialization ?? 'No specialization'}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.email ?? '—'}</span>
                </div>
              </div>

              {/* Courses & workload */}
              <div className="flex items-center gap-2 mb-4 text-xs text-(--text-secondary)">
                <BookOpen className="w-3.5 h-3.5 text-(--brand-gold)" />
                <span>{f.currentOfferings} offering{f.currentOfferings !== 1 ? 's' : ''} this semester</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Current Load</div>
                  <span style={{ color: workloadColor(f.currentOfferings) }}>{f.currentOfferings} offerings</span>
                </div>
                <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: workloadColor(f.currentOfferings) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (f.currentOfferings / 5) * 100)}%` }}
                    transition={{ delay: 0.2, duration: 0.7 }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} faculty · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.user.fullName ?? 'Faculty Profile'} subtitle="Faculty Profile" width="max-w-xl">
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 rounded-full border-2 border-(--brand-gold) border-t-transparent" />
          </div>
        ) : selected && (
          <div className="space-y-5 text-sm font-sans">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center shrink-0">
                <span className="font-serif font-bold text-3xl text-(--brand-gold)">{selected.user.fullName.charAt(0)}</span>
              </div>
              <div>
                <p className="font-serif text-base font-bold text-(--text-primary)">{selected.user.fullName}</p>
                <p className="text-(--text-muted) text-xs">{selected.title}</p>
                <p className="text-(--text-faint) text-xs mt-0.5">{selected.specialization ?? 'No specialization listed'}</p>
                <Badge variant={selected.isActive ? 'emerald' : 'amber'} className="mt-1">
                  {selected.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',       selected.user.email   ?? '—'],
                ['Phone',       selected.user.phone   ?? '—'],
                ['Employee ID', selected.employeeId],
                ['Joined',      new Date(selected.createdAt).getFullYear()],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1 truncate">{v}</p>
                </div>
              ))}
            </div>

            {/* Current offerings */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-3">Current Course Offerings</p>
              {selected.offerings.length === 0 ? (
                <p className="text-(--text-faint) text-xs">No active offerings this semester.</p>
              ) : (
                <div className="space-y-2">
                  {selected.offerings.map(o => (
                    <div key={o.id} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-(--brand-gold)">{o.course.code}</span>
                        <Badge variant="glass">{o.course.creditHours} cr</Badge>
                      </div>
                      <p className="text-(--text-secondary) text-xs">{o.course.name}</p>
                      {o.timetables.length > 0 && (
                        <p className="text-(--text-faint) text-[10px] font-mono mt-1">
                          {o.timetables.map(t => `${DAY_NAMES[t.dayOfWeek]} ${t.startTime}`).join(', ')}
                        </p>
                      )}
                      <p className="text-(--text-faint) text-[10px] mt-1">{o._count.enrollments} enrolled / {o.capacity} capacity</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent leave requests */}
            {selected.leaveRequests.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-3">Recent Leave Requests</p>
                <div className="space-y-2">
                  {selected.leaveRequests.map(lr => (
                    <div key={lr.id} className="flex items-center justify-between p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-xs">
                      <div>
                        <p className="font-semibold text-(--text-primary)">{lr.leaveType.replace('_', ' ')}</p>
                        <p className="text-(--text-faint) font-mono text-[10px]">
                          {new Date(lr.startDate).toLocaleDateString()} – {new Date(lr.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={lr.status.includes('APPROVED') ? 'emerald' : lr.status.includes('REJECTED') ? 'rose' : 'amber'}>
                        {lr.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </motion.div>
  );
};
