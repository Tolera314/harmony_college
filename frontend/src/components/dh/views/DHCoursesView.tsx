'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Filter, ChevronDown, Eye, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Course } from '../../../types/department';
import { courses, faculty, classrooms, approvalRequests } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';

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
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col }} />
      </div>
      <span className="font-mono text-[11px] text-white/60">{reg}/{cap}</span>
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
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
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${semFilter === s ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]"
        >
          {['All', 'Active', 'Pending Approval', 'Approved', 'Rejected'].map((s) => <option key={s} value={s} className="bg-[#1a1a1b]">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[800px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Course', 'Instructor', 'Semester', 'Credits', 'Room', 'Enrolled', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/85">
            {paginated.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-white/30 font-sans text-sm">No courses match your filters.</td></tr>
            ) : paginated.map((c) => {
              const f = faculty.find((x) => x.id === c.facultyId);
              const room = classrooms.find((r) => r.id === c.roomId);
              const isPending = c.status === 'Pending Approval';
              return (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.04] transition-colors group">
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-xs font-bold text-[#E9C349]">{c.code}</p>
                    <p className="text-white/80 text-xs mt-0.5 max-w-[200px] truncate">{c.title}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {f && <img src={f.avatar} alt={f.name} className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />}
                      <span className="text-white/70 truncate max-w-[120px]">{f?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-white/60">{c.semester}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-white/60">{c.credits}</td>
                  <td className="px-4 py-3.5 text-white/60 max-w-[120px] truncate">{room?.name ?? '—'}</td>
                  <td className="px-4 py-3.5">{capacityBar(c.registered, c.capacity)}</td>
                  <td className="px-4 py-3.5">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(c)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {isPending && !actionDone.has(c.id + 'Approve') && (
                        <button onClick={() => setConfirmModal({ course: c, action: 'Approve' })} className="p-1.5 rounded-lg hover:bg-emerald-950/40 text-emerald-500 transition-colors" aria-label="Approve">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {isPending && !actionDone.has(c.id + 'Reject') && (
                        <button onClick={() => setConfirmModal({ course: c, action: 'Reject' })} className="p-1.5 rounded-lg hover:bg-rose-950/30 text-rose-400 transition-colors" aria-label="Reject">
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
          <p className="font-sans text-xs text-white/40">{filtered.length} courses · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.code} — ${selected.title}` : ''} maxWidth="max-w-2xl">
        {selected && (() => {
          const f = faculty.find((x) => x.id === selected.facultyId);
          const room = classrooms.find((r) => r.id === selected.roomId);
          return (
            <div className="space-y-5 text-sm font-sans">
              <div className="grid grid-cols-2 gap-4">
                {[['Semester', selected.semester], ['Credits', selected.credits], ['Schedule', selected.schedule], ['Room', room?.name ?? '—'], ['Capacity', selected.capacity], ['Registered', selected.registered]].map(([k, v]) => (
                  <div key={String(k)} className="p-3 bg-white/5 rounded-xl border border-white/8">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{k}</p>
                    <p className="font-semibold text-white mt-1">{v}</p>
                  </div>
                ))}
              </div>
              {f && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/8">
                  <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  <div>
                    <p className="font-semibold text-white text-sm">{f.name}</p>
                    <p className="text-white/50 text-xs">{f.rank} · {f.email}</p>
                  </div>
                </div>
              )}
              <div className="p-4 bg-white/5 rounded-xl border border-white/8">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-2">Description</p>
                <p className="text-white/70 leading-relaxed text-xs">{selected.description}</p>
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
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-5">
            <p className="font-sans text-sm text-white/70 leading-relaxed">
              Are you sure you want to <span className="font-semibold text-white">{confirmModal.action.toLowerCase()}</span> the course offering for{' '}
              <span className="text-[#E9C349] font-mono">{confirmModal.course.code}</span> — {confirmModal.course.title}?
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E9C349] resize-none"
                rows={3} placeholder="Optional: Reason for rejection..."
              />
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                variant={confirmModal.action === 'Approve' ? 'primary' : 'danger'}
                className="flex-1"
                onClick={handleAction}
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
