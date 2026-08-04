'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Search, Filter, ChevronDown, Eye, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Course } from '../../../types/department';
import { courses, faculty, classrooms, approvalRequests } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';import { Input } from '../../ui/Input';

const statusBadge = (s: Course['status']) => {
  const map: Record<Course['status'], { variant: 'emerald'|'gold'|'rose'|'glass'|'amber'; label: string }> = {
    Active:           { variant: 'emerald', label: 'Active' },
    'Pending Approval': { variant: 'amber',   label: 'Pending' },
    Approved:         { variant: 'gold',    label: 'Approved' },
    Rejected:         { variant: 'rose',    label: 'Rejected' },
    Cancelled:        { variant: 'glass',   label: 'Cancelled' },
  };
  const m = map[s] ?? { variant: 'glass', label: s };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

const capacityBar = (reg: number, cap: number) => {
  const pct = Math.min(100, (reg / cap) * 100);
  const col = pct >= 90 ? '#f87171' : pct >= 70 ? '#E9C349' : '#34d399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col }} />
      </div>
      <span className="font-mono text-[11px] text-(--text-secondary)">{reg}/{cap}</span>
    </div>
  );
};

export const DHCoursesView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState<'All' | 'Fall 2024' | 'Spring 2025'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | Course['status']>('All');
  const [selected, setSelected] = useState<Course | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ course: Course; action: 'Approve' | 'Reject' } | null>(null);
  const [actionDone, setActionDone] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    const matchSem = semFilter === 'All' || c.semester === semFilter;
    const matchSt = statusFilter === 'All' || c.status === statusFilter;
    return matchQ && matchSem && matchSt;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleAction = (action: 'Approve' | 'Reject') => {
    if (!confirmModal) return;
    setActionDone((prev) => new Set(prev).add(confirmModal.course.id + action));
    setConfirmModal(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Course Offerings"
        subtitle={`${courses.filter(c => c.status === 'Active').length} active · ${courses.filter(c => c.status === 'Pending Approval').length} pending approval`}
        icon={<BookOpen className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search course code or title..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2">
          {(['All', 'Fall 2024', 'Spring 2025'] as const).map((s) => (
            <button key={s} onClick={() => { setSemFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${semFilter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              {s}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          {['All', 'Active', 'Pending Approval', 'Approved', 'Rejected'].map((s) => <option key={s} value={s} className="bg-(--bg-card-solid)">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[800px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Course', 'Instructor', 'Semester', 'Credits', 'Room', 'Enrolled', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
            {paginated.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-(--text-faint) font-sans text-sm">No courses match your filters.</td></tr>
            ) : paginated.map((c) => {
              const f = faculty.find((x) => x.id === c.facultyId);
              const room = classrooms.find((r) => r.id === c.roomId);
              const isPending = c.status === 'Pending Approval';
              return (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors group">
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-xs font-bold text-(--brand-gold)">{c.code}</p>
                    <p className="text-(--text-secondary) text-xs mt-0.5 max-w-[200px] truncate">{c.title}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {f && <img src={f.avatar} alt={f.name} className="w-6 h-6 rounded-full object-cover border border-(--border-default) shrink-0" />}
                      <span className="text-(--text-secondary) truncate max-w-[120px]">{f?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{c.semester}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-(--text-secondary)">{c.credits}</td>
                  <td className="px-4 py-3.5 text-(--text-secondary) max-w-[120px] truncate">{room?.name ?? '—'}</td>
                  <td className="px-4 py-3.5">{capacityBar(c.registered, c.capacity)}</td>
                  <td className="px-4 py-3.5">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(c)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {isPending && !actionDone.has(c.id + 'Approve') && (
                        <button onClick={() => setConfirmModal({ course: c, action: 'Approve' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-emerald-500 transition-colors" aria-label="Approve">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {isPending && !actionDone.has(c.id + 'Reject') && (
                        <button onClick={() => setConfirmModal({ course: c, action: 'Reject' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--status-danger) transition-colors" aria-label="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{filtered.length} courses · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.code} — ${selected.title}` : ''} subtitle="Course Details" width="max-w-2xl">
        {selected && (() => {
          const f = faculty.find((x) => x.id === selected.facultyId);
          const room = classrooms.find((r) => r.id === selected.roomId);
          return (
            <div className="space-y-5 text-sm font-sans">
              <div className="grid grid-cols-2 gap-4">
                {[['Semester', selected.semester], ['Credits', selected.credits], ['Schedule', selected.schedule], ['Room', room?.name ?? '—'], ['Capacity', selected.capacity], ['Registered', selected.registered]].map(([k, v]) => (
                  <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                    <p className="font-semibold text-(--text-primary) mt-1">{v}</p>
                  </div>
                ))}
              </div>
              {f && (
                <div className="flex items-center gap-3 p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-full object-cover border border-(--border-default)" />
                  <div>
                    <p className="font-semibold text-(--text-primary) text-sm">{f.name}</p>
                    <p className="text-(--text-muted) text-xs">{f.rank} · {f.email}</p>
                  </div>
                </div>
              )}
              <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Description</p>
                <p className="text-(--text-secondary) leading-relaxed text-xs">{selected.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>{statusBadge(selected.status)}</div>
                {selected.status === 'Pending Approval' && (
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => { setSelected(null); setConfirmModal({ course: selected, action: 'Reject' }); }}>Reject</Button>
                    <Button variant="primary" size="sm" onClick={() => { setSelected(null); setConfirmModal({ course: selected, action: 'Approve' }); }}>Approve</Button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </SlidePanel>

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-5">
            <p className="font-sans text-sm text-(--text-secondary) leading-relaxed">
              Are you sure you want to <span className="font-semibold text-(--text-primary)">{confirmModal.action.toLowerCase()}</span> the course offering for{' '}
              <span className="text-(--brand-gold) font-mono">{confirmModal.course.code}</span> — {confirmModal.course.title}?
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
                rows={3} placeholder="Optional: Reason for rejection..."
              />
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                variant={confirmModal.action === 'Approve' ? 'primary' : 'danger'}
                className="flex-1"
                onClick={() => handleAction(confirmModal.action)}
                icon={confirmModal.action === 'Approve' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              >
                {confirmModal.action}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
