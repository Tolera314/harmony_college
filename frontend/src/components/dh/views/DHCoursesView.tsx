'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Search, Eye, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { hodOfferingsApi, hodSemestersApi, type CourseOfferingSummary, type Semester } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { Input } from '../../ui/Input';
import { ErrorState, SkeletonTable } from '../../ui/States';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const statusBadge = (s: string) => {
  const map: Record<string, { variant: 'emerald' | 'gold' | 'rose' | 'glass' | 'amber'; label: string }> = {
    ACTIVE:               { variant: 'emerald', label: 'Active' },
    SCHEDULED:            { variant: 'emerald', label: 'Scheduled' },
    INSTRUCTOR_ASSIGNED:  { variant: 'gold',    label: 'Approved' },
    DRAFT:                { variant: 'amber',   label: 'Pending Approval' },
    CANCELLED:            { variant: 'rose',    label: 'Rejected' },
    CLOSED:               { variant: 'glass',   label: 'Closed' },
  };
  const m = map[s] ?? { variant: 'glass' as const, label: s };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

const capacityBar = (enrolled: number, cap: number) => {
  const pct = cap > 0 ? Math.min(100, (enrolled / cap) * 100) : 0;
  const col = pct >= 90 ? '#f87171' : pct >= 70 ? '#E9C349' : '#34d399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
      </div>
      <span className="font-mono text-[11px] text-(--text-secondary)">{enrolled}/{cap}</span>
    </div>
  );
};

export const DHCoursesView: React.FC = () => {
  const [offerings, setOfferings] = useState<CourseOfferingSummary[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [selected,  setSelected]  = useState<CourseOfferingSummary | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ offering: CourseOfferingSummary; action: 'Approve' | 'Reject' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');
  const LIMIT = 12;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [offData, semData] = await Promise.all([
        hodOfferingsApi.list({
          page:       p,
          limit:      LIMIT,
          search:     search || undefined,
          status:     statusFilter || undefined,
          semesterId: semFilter || undefined,
        }),
        semesters.length === 0 ? hodSemestersApi.list() : Promise.resolve(semesters),
      ]);
      setOfferings(offData.offerings);
      setTotal(offData.total);
      if (semesters.length === 0) setSemesters(semData as Semester[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load course offerings');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, semFilter, semesters]);

  useEffect(() => { load(page); }, [page, search, statusFilter, semFilter, load]);

  const handleAction = async () => {
    if (!confirmModal) return;
    if (confirmModal.action === 'Reject' && rejectReason.trim().length < 5) {
      setActionError('A rejection reason is required (min 5 characters).');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      if (confirmModal.action === 'Approve') {
        await hodOfferingsApi.approve(confirmModal.offering.id);
      } else {
        await hodOfferingsApi.reject(confirmModal.offering.id, rejectReason.trim());
      }
      setConfirmModal(null);
      setRejectReason('');
      setSelected(null);
      await load(page);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const pendingCount = offerings.filter(o => o.status === 'DRAFT').length;

  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Course Offerings"
        subtitle={loading ? 'Loading…' : `${total} offerings · ${pendingCount} pending approval`}
        icon={<BookOpen className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>Refresh</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search course code or name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={semFilter}
          onChange={e => { setSemFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">Current Semester</option>
          {semesters.map(s => (
            <option key={s.id} value={s.id} className="bg-(--bg-card-solid)">
              {s.name} {s.academicYear.name}{s.isCurrent ? ' (Current)' : ''}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Pending Approval</option>
          <option value="INSTRUCTOR_ASSIGNED">Approved</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ACTIVE">Active</option>
          <option value="CANCELLED">Rejected/Cancelled</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={8} cols={7} /> : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm font-sans" style={{ minWidth: '800px' }}>
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Course', 'Instructor', 'Semester', 'Schedule', 'Enrolled', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {offerings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-(--text-faint) font-sans text-sm">No course offerings match your filters.</td></tr>
              ) : offerings.map(o => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-xs font-bold text-(--brand-gold)">{o.course.code}</p>
                    <p className="text-(--text-secondary) text-xs mt-0.5 max-w-[200px] truncate">{o.course.name}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-(--text-secondary) text-xs truncate max-w-[130px] block">
                      {o.instructor ? `${o.instructor.title} ${o.instructor.user.fullName}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">
                    {o.semester.name} {o.semester.academicYear.name}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">
                    {o.timetables.length > 0
                      ? o.timetables.map(t => `${DAY_NAMES[t.dayOfWeek]} ${t.startTime}`).join(', ')
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3.5">{capacityBar(o.enrolledCount, o.capacity)}</td>
                  <td className="px-4 py-3.5">{statusBadge(o.status)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(o)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {o.status === 'DRAFT' && (
                        <>
                          <button onClick={() => setConfirmModal({ offering: o, action: 'Approve' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-emerald-500 transition-colors" aria-label="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmModal({ offering: o, action: 'Reject' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--status-danger) transition-colors" aria-label="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} offerings · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.course.code} — ${selected.course.name}` : ''} subtitle="Course Offering Details" width="max-w-2xl">
        {selected && (
          <div className="space-y-5 text-sm font-sans">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Semester',  `${selected.semester.name} ${selected.semester.academicYear.name}`],
                ['Section',   selected.section],
                ['Credits',   `${selected.course.creditHours} credit hours`],
                ['Room',      selected.room ? `${selected.room.building} ${selected.room.name}` : '—'],
                ['Capacity',  `${selected.capacity} seats`],
                ['Enrolled',  `${selected.enrolledCount} (${selected.utilizationPct}%)`],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="font-semibold text-(--text-primary) mt-1 text-sm">{v}</p>
                </div>
              ))}
            </div>
            {selected.instructor && (
              <div className="flex items-center gap-3 p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <div className="w-10 h-10 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-(--brand-gold)">{selected.instructor.user.fullName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-(--text-primary) text-sm">
                    {selected.instructor.title} {selected.instructor.user.fullName}
                  </p>
                  <p className="text-(--text-muted) text-xs">{selected.instructor.user.email}</p>
                  <p className="font-mono text-[10px] text-(--text-faint)">{selected.instructor.employeeId}</p>
                </div>
              </div>
            )}
            {selected.timetables.length > 0 && (
              <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Schedule</p>
                {selected.timetables.map((t, i) => (
                  <p key={i} className="text-xs text-(--text-secondary) font-mono">{DAY_NAMES[t.dayOfWeek]} · {t.startTime} – {t.endTime}</p>
                ))}
              </div>
            )}
            {selected.course.prerequisites.length > 0 && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Prerequisites</p>
                {selected.course.prerequisites.map((p, i) => (
                  <span key={i} className="inline-block mr-2 mb-1 font-mono text-xs text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">{p.prerequisite.code}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>{statusBadge(selected.status)}</div>
              {selected.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => { setSelected(null); setConfirmModal({ offering: selected, action: 'Reject' }); }}>Reject</Button>
                  <Button variant="primary" size="sm" onClick={() => { setSelected(null); setConfirmModal({ offering: selected, action: 'Approve' }); }}>Approve</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Confirm modal */}
      <Modal isOpen={!!confirmModal} onClose={() => { setConfirmModal(null); setActionError(''); setRejectReason(''); }} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-5">
            <p className="font-sans text-sm text-(--text-secondary) leading-relaxed">
              {confirmModal.action === 'Approve'
                ? 'Approving this offering will move it to Instructor Assigned status. This action is recorded in the audit log.'
                : 'Rejecting this offering will cancel it. Please provide a reason.'}
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
                rows={3} placeholder="Rejection reason (required, min 5 chars)…"
              />
            )}
            {actionError && <p className="text-xs text-(--status-danger)">{actionError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setConfirmModal(null); setActionError(''); setRejectReason(''); }} disabled={actionLoading}>Cancel</Button>
              <Button
                variant={confirmModal.action === 'Approve' ? 'primary' : 'danger'}
                className="flex-1" onClick={handleAction} disabled={actionLoading}
                icon={actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {actionLoading ? 'Processing…' : confirmModal.action}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
