'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { FileText, CheckCircle2, XCircle, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { hodLeaveApi, type LeaveRequestSummary } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState, ErrorState, SkeletonCard } from '../../ui/States';
import { Modal } from '../../ui/Modal';

const STATUS_CONFIG: Record<string, { variant: 'amber' | 'emerald' | 'rose' | 'glass'; label: string }> = {
  PENDING_DH:   { variant: 'amber',   label: 'Pending Review' },
  DH_APPROVED:  { variant: 'emerald', label: 'Approved by DH' },
  DH_REJECTED:  { variant: 'rose',    label: 'Rejected by DH' },
  HR_APPROVED:  { variant: 'emerald', label: 'HR Approved' },
  HR_REJECTED:  { variant: 'rose',    label: 'HR Rejected' },
  WITHDRAWN:    { variant: 'glass',   label: 'Withdrawn' },
};

const TYPE_COLOR: Record<string, string> = {
  MEDICAL:    'text-(--status-danger)',
  PERSONAL:   'text-(--text-secondary)',
  CONFERENCE: 'text-(--brand-gold)',
  RESEARCH:   'text-(--status-success)',
  ANNUAL:     'text-(--status-info)',
  MATERNITY:  'text-(--status-info)',
  PATERNITY:  'text-(--status-info)',
  EMERGENCY:  'text-(--status-danger)',
};

export const DHLeaveRequestsView: React.FC = () => {
  const [requests,  setRequests]  = useState<LeaveRequestSummary[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState('ALL');
  const [confirmModal, setConfirmModal] = useState<{ req: LeaveRequestSummary; action: 'Approve' | 'Reject' } | null>(null);
  const [comment,   setComment]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');
  const LIMIT = 10;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodLeaveApi.list({ page: p, limit: LIMIT, status: filter !== 'ALL' ? filter : undefined });
      setRequests(res.requests);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(page); }, [page, filter, load]);

  const handleAction = async () => {
    if (!confirmModal) return;
    if (confirmModal.action === 'Reject' && (!comment.trim() || comment.trim().length < 5)) {
      setActionError('A rejection reason is required (minimum 5 characters).');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      if (confirmModal.action === 'Approve') {
        await hodLeaveApi.approve(confirmModal.req.id, comment.trim() || undefined);
      } else {
        await hodLeaveApi.reject(confirmModal.req.id, comment.trim());
      }
      setConfirmModal(null);
      setComment('');
      await load(page);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const pendingCount = requests.filter(r => r.status === 'PENDING_DH').length;

  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Faculty Leave Requests"
        subtitle={loading ? 'Loading…' : `${pendingCount} pending review · ${total} total`}
        icon={<FileText className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { setPage(1); load(1); }}>Refresh</Button>}
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'PENDING_DH', 'DH_APPROVED', 'DH_REJECTED', 'HR_APPROVED'] as const).map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {STATUS_CONFIG[s]?.label ?? 'All'}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : requests.length === 0 ? (
        <EmptyState variant="leaves" description="No leave requests in this category." compact />
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const sc = STATUS_CONFIG[req.status] ?? { variant: 'glass' as const, label: req.status };
            const isPending = req.status === 'PENDING_DH';
            return (
              <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-(--hover-overlay) border rounded-2xl p-5 transition-all ${isPending ? 'border-(--accent-gold-border)' : 'border-(--border-default)'}`}>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Instructor */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center shrink-0">
                      <span className="font-serif font-bold text-lg text-(--brand-gold)">{req.instructor.user.fullName.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-bold text-(--text-primary) truncate">
                        {req.instructor.title} {req.instructor.user.fullName}
                      </p>
                      <p className="font-sans text-xs text-(--text-muted)">{req.instructor.specialization ?? req.instructor.employeeId}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-(--text-faint)" />
                      <span className="text-(--text-secondary)">
                        {new Date(req.startDate).toLocaleDateString()} → {new Date(req.endDate).toLocaleDateString()}
                      </span>
                      <Badge variant="glass" className="text-[10px]">{req.durationDays}d</Badge>
                    </div>
                    <span className={`font-semibold ${TYPE_COLOR[req.leaveType] ?? ''}`}>
                      {req.leaveType.replace('_', ' ')}
                    </span>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                    {req.supportingDocUrl && (
                      <span className="text-[10px] text-(--text-faint) font-mono">📎 doc</span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs text-(--text-secondary) leading-relaxed italic">&quot;{req.reason}&quot;</p>

                {req.dhComment && (
                  <div className="mt-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] text-(--text-faint) uppercase mb-1">DH Comment</p>
                    <p className="text-xs text-(--text-secondary)">{req.dhComment}</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex gap-2 mt-4">
                    <Button variant="danger" size="sm" onClick={() => setConfirmModal({ req, action: 'Reject' })} icon={<XCircle className="w-4 h-4" />}>Reject</Button>
                    <Button variant="primary" size="sm" onClick={() => setConfirmModal({ req, action: 'Approve' })} icon={<CheckCircle2 className="w-4 h-4" />}>Approve</Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} requests · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal isOpen={!!confirmModal} onClose={() => { setConfirmModal(null); setActionError(''); setComment(''); }} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-4">
            <p className="font-sans text-sm text-(--text-secondary)">
              You are about to <span className="font-semibold text-(--text-primary)">{confirmModal.action.toLowerCase()}</span> the leave request from{' '}
              <span className="text-(--brand-gold)">{confirmModal.req.instructor.title} {confirmModal.req.instructor.user.fullName}</span>.
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
              rows={3}
              placeholder={confirmModal.action === 'Reject' ? 'Rejection reason (required, min 5 chars)…' : 'Optional comment for the faculty member…'}
            />
            {actionError && <p className="text-xs text-(--status-danger)">{actionError}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setConfirmModal(null); setActionError(''); setComment(''); }} disabled={actionLoading}>Cancel</Button>
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
