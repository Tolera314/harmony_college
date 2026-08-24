'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { CheckSquare, CheckCircle2, XCircle, Eye, Clock, Loader2, RefreshCw } from 'lucide-react';
import { hodOfferingsApi, hodSemestersApi, type CourseOfferingSummary, type Semester } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState, ErrorState, SkeletonCard } from '../../ui/States';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const statusConfig: Record<string, { variant: 'amber' | 'emerald' | 'rose' | 'glass'; label: string }> = {
  DRAFT:               { variant: 'amber',   label: 'Pending Approval' },
  INSTRUCTOR_ASSIGNED: { variant: 'emerald', label: 'Approved' },
  SCHEDULED:           { variant: 'emerald', label: 'Scheduled' },
  ACTIVE:              { variant: 'emerald', label: 'Active' },
  CANCELLED:           { variant: 'rose',    label: 'Rejected' },
  CLOSED:              { variant: 'glass',   label: 'Closed' },
};

export const DHApprovalsView: React.FC = () => {
  const [offerings, setOfferings] = useState<CourseOfferingSummary[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'ALL' | 'DRAFT' | 'INSTRUCTOR_ASSIGNED' | 'CANCELLED'>('ALL');
  const [selected,  setSelected]  = useState<CourseOfferingSummary | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ offering: CourseOfferingSummary; action: 'Approve' | 'Reject' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offData, semData] = await Promise.all([
        hodOfferingsApi.list({ limit: 50 }),
        hodSemestersApi.list(),
      ]);
      setOfferings(offData.offerings);
      setSemesters(semData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load offerings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = offerings.filter(o => filter === 'ALL' || o.status === filter);
  const pendingCount   = offerings.filter(o => o.status === 'DRAFT').length;
  const approvedCount  = offerings.filter(o => ['INSTRUCTOR_ASSIGNED', 'SCHEDULED', 'ACTIVE'].includes(o.status)).length;
  const rejectedCount  = offerings.filter(o => o.status === 'CANCELLED').length;

  const handleAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    setActionError('');
    try {
      if (confirmModal.action === 'Approve') {
        await hodOfferingsApi.approve(confirmModal.offering.id);
      } else {
        if (!rejectReason.trim() || rejectReason.trim().length < 5) {
          setActionError('Please provide a reason (minimum 5 characters).');
          setActionLoading(false);
          return;
        }
        await hodOfferingsApi.reject(confirmModal.offering.id, rejectReason.trim());
      }
      setConfirmModal(null);
      setRejectReason('');
      setSelected(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (error) return <ErrorState variant="generic" description={error} onRetry={load} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Approval Center"
        subtitle={`${pendingCount} pending · ${approvedCount} approved · ${rejectedCount} rejected`}
        icon={<CheckSquare className="w-5 h-5" />}
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
            Refresh
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'ALL',               label: 'All',       count: offerings.length },
          { key: 'DRAFT',             label: 'Pending',   count: pendingCount },
          { key: 'INSTRUCTOR_ASSIGNED', label: 'Approved', count: approvedCount },
          { key: 'CANCELLED',         label: 'Rejected',  count: rejectedCount },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === tab.key ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {tab.label}
            <span className="ml-1.5 font-mono text-[10px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <div className="col-span-2">
                <EmptyState variant="default" description="No course offerings in this category." compact />
              </div>
            ) : filtered.map(offering => {
              const sc = statusConfig[offering.status] ?? { variant: 'glass' as const, label: offering.status };
              const isPending = offering.status === 'DRAFT';
              return (
                <motion.div key={offering.id} layout
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className={`relative bg-(--hover-overlay) border rounded-2xl p-5 transition-all ${isPending ? 'border-(--accent-gold-border) bg-[#E9C349]/[0.03]' : 'border-(--border-default)'}`}>
                  {isPending && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#E9C349] animate-pulse" />}

                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="glass" className="text-[10px]">Course Offering</Badge>
                        <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                      </div>
                      <h3 className="font-serif text-base font-bold text-(--text-primary)">
                        {offering.course.code} — {offering.course.name}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-sans">
                    <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="text-(--text-faint) text-[10px] font-mono uppercase">Credits</p>
                      <p className="text-(--text-primary) font-semibold mt-0.5">{offering.course.creditHours} cr</p>
                    </div>
                    <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="text-(--text-faint) text-[10px] font-mono uppercase">Room</p>
                      <p className="text-(--text-primary) font-semibold mt-0.5 truncate">
                        {offering.room ? `${offering.room.building} ${offering.room.name}` : '—'}
                      </p>
                    </div>
                    <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="text-(--text-faint) text-[10px] font-mono uppercase">Capacity</p>
                      <p className="text-(--text-primary) font-semibold mt-0.5">{offering.capacity} seats</p>
                    </div>
                    <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="text-(--text-faint) text-[10px] font-mono uppercase">Semester</p>
                      <p className="text-(--text-primary) font-semibold mt-0.5 truncate">
                        {offering.semester.name} {offering.semester.academicYear.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-xs text-(--text-muted)">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Instructor: <span className="text-(--text-secondary) font-medium">
                        {offering.instructor ? `${offering.instructor.title} ${offering.instructor.user.fullName}` : 'Unassigned'}
                      </span>
                    </span>
                  </div>

                  {offering.timetables.length > 0 && (
                    <p className="text-xs text-(--text-muted) font-mono bg-(--hover-overlay) rounded-xl px-3 py-2 border border-(--border-subtle) mb-4">
                      {offering.timetables.map(t => `${DAY_NAMES[t.dayOfWeek]} ${t.startTime}–${t.endTime}`).join(', ')}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(offering)} icon={<Eye className="w-4 h-4" />}>Details</Button>
                    {isPending && (
                      <>
                        <Button variant="danger" size="sm" onClick={() => setConfirmModal({ offering, action: 'Reject' })}>Reject</Button>
                        <Button variant="primary" size="sm" onClick={() => setConfirmModal({ offering, action: 'Approve' })} icon={<CheckCircle2 className="w-4 h-4" />}>Approve</Button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title="Course Offering Details" subtitle="Approval Center" width="max-w-xl">
        {selected && (
          <div className="space-y-4 text-sm font-sans">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="glass">Course Offering</Badge>
              <Badge variant={(statusConfig[selected.status]?.variant) ?? 'glass'}>
                {statusConfig[selected.status]?.label ?? selected.status}
              </Badge>
            </div>
            <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="font-mono text-xs text-(--brand-gold) mb-1">{selected.course.code} · Section {selected.section}</p>
              <p className="font-semibold text-(--text-primary)">{selected.course.name}</p>
              <p className="text-(--text-muted) text-xs mt-1">{selected.course.creditHours} credit hours</p>
            </div>

            {selected.instructor && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-1">Instructor</p>
                <p className="text-(--text-secondary) font-semibold">
                  {selected.instructor.title} {selected.instructor.user.fullName}
                </p>
                <p className="text-(--text-faint) text-xs">{selected.instructor.user.email}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Semester', `${selected.semester.name} ${selected.semester.academicYear.name}`],
                ['Room',     selected.room ? `${selected.room.building} ${selected.room.name}` : '—'],
                ['Capacity', `${selected.capacity} seats`],
                ['Enrolled', `${selected.enrolledCount} / ${selected.capacity} (${selected.utilizationPct}%)`],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1 font-semibold">{v}</p>
                </div>
              ))}
            </div>

            {selected.timetables.length > 0 && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Schedule</p>
                {selected.timetables.map((t, i) => (
                  <p key={i} className="text-xs text-(--text-secondary) font-mono">
                    {DAY_NAMES[t.dayOfWeek]} · {t.startTime} – {t.endTime}
                  </p>
                ))}
              </div>
            )}

            {selected.course.prerequisites.length > 0 && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-2">Prerequisites</p>
                {selected.course.prerequisites.map((p, i) => (
                  <span key={i} className="inline-block mr-2 mb-1 font-mono text-xs text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">
                    {p.prerequisite.code}
                  </span>
                ))}
              </div>
            )}

            {selected.status === 'DRAFT' && (
              <div className="flex gap-3 pt-2">
                <Button variant="danger" className="flex-1"
                  onClick={() => { setConfirmModal({ offering: selected, action: 'Reject' }); setSelected(null); }}>
                  Reject
                </Button>
                <Button variant="primary" className="flex-1"
                  onClick={() => { setConfirmModal({ offering: selected, action: 'Approve' }); setSelected(null); }}>
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Confirm modal */}
      <Modal isOpen={!!confirmModal} onClose={() => { setConfirmModal(null); setActionError(''); setRejectReason(''); }} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-4">
            <p className="font-sans text-sm text-(--text-secondary)">
              Are you sure you want to{' '}
              <span className="font-semibold text-(--text-primary)">{confirmModal.action.toLowerCase()}</span>{' '}
              the offering for <span className="text-(--brand-gold) font-mono">{confirmModal.offering.course.code}</span>?
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
                rows={3} placeholder="Reason for rejection (required, min 5 chars)..."
              />
            )}
            {actionError && <p className="text-xs text-(--status-danger)">{actionError}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setConfirmModal(null); setActionError(''); setRejectReason(''); }} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={confirmModal.action === 'Approve' ? 'primary' : 'danger'}
                className="flex-1" onClick={handleAction} disabled={actionLoading}
                icon={actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {actionLoading ? 'Processing…' : `Confirm ${confirmModal.action}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
