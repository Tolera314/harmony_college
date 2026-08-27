'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { ClipboardList, CheckCircle2, XCircle, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SlidePanel } from '../../ui/SlidePanel';
import { Modal } from '../../ui/Modal';
import { SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import { adminAdmissionsApi, ApiAdmission } from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'emerald' | 'gold' | 'amber' | 'rose' | 'glass'> = {
  ACCEPTED:     'emerald',
  SUBMITTED:    'gold',
  UNDER_REVIEW: 'amber',
  DRAFT:        'glass',
  WAITLISTED:   'amber',
  REJECTED:     'rose',
};
const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  DRAFT: 'Draft', WAITLISTED: 'Waitlisted', REJECTED: 'Rejected',
};
const ONBOARDING_BADGE: Record<string, 'emerald' | 'gold' | 'glass' | 'amber' | 'rose'> = {
  APPROVED: 'emerald', SUBMITTED: 'gold', PENDING: 'glass', REJECTED: 'rose',
};

const ALL_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'WAITLISTED', 'REJECTED', 'DRAFT'] as const;

// ── component ─────────────────────────────────────────────────────────────────

export const AdminAdmissionsView: React.FC = () => {
  const [admissions, setAdmissions] = useState<ApiAdmission[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // ── filters
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── detail panel
  const [selected, setSelected]     = useState<ApiAdmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── action modals
  const [actionTarget, setActionTarget] = useState<{ admission: ApiAdmission; action: 'accept' | 'reject' } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]   = useState('');

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── fetch
  const fetchAdmissions = useCallback(async (p: number, s: string, st: string) => {
    setLoading(true); setError('');
    try {
      const res = await adminAdmissionsApi.list({ page: p, limit: 10, search: s, status: st });
      setAdmissions(res.applications); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load admissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchAdmissions(page, search, statusFilter), 280);
  }, [page, search, statusFilter, fetchAdmissions]);

  // ── open detail
  const openDetail = async (a: ApiAdmission) => {
    setDetailLoading(true); setSelected(null);
    try {
      const detail = await adminAdmissionsApi.getById(a.id);
      setSelected(detail);
    } catch {
      showToast('Failed to load admission details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── handle action (accept/reject)
  const handleAction = async () => {
    if (!actionTarget) return;
    setActionError(''); setActionLoading(true);
    try {
      const newStatus = actionTarget.action === 'accept' ? 'ACCEPTED' : 'REJECTED';
      await adminAdmissionsApi.updateStatus(actionTarget.admission.id, newStatus, actionComment || undefined);
      showToast(`Application ${actionTarget.action === 'accept' ? 'accepted' : 'rejected'}`, 'success');
      setActionTarget(null);
      setActionComment('');
      fetchAdmissions(page, search, statusFilter);
    } catch (e: any) {
      setActionError(e.message ?? 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Admissions"
        subtitle={`${total} total applications`}
        icon={<ClipboardList className="w-5 h-5" />}
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${
            statusFilter === '' ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${
              statusFilter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            {STATUS_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-xs">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search applicants..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={8} cols={6} /> : error ? (
        <ErrorState compact description={error}
          onRetry={() => fetchAdmissions(page, search, statusFilter)} />
      ) : admissions.length === 0 ? (
        <EmptyState compact description="No admissions match your filters." />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans min-w-[800px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Applicant', 'Program', 'Year', 'Onboarding', 'Status', 'Applied', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {admissions.map(a => (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-xs shrink-0">
                        {a.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary)">{a.user.fullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{a.user.email ?? a.user.phone ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--brand-gold)">{a.program}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">{a.academicYear}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={ONBOARDING_BADGE[a.onboardingStatus] ?? 'glass'} className="text-[10px]">
                      {a.onboardingStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_BADGE[a.status] ?? 'glass'}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDetail(a)}
                        className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                        aria-label="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {(a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW') && (
                        <>
                          <button
                            onClick={() => { setActionTarget({ admission: a, action: 'accept' }); setActionComment(''); setActionError(''); }}
                            className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-(--text-muted) hover:text-(--status-success) transition-colors"
                            aria-label="Accept">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setActionTarget({ admission: a, action: 'reject' }); setActionComment(''); setActionError(''); }}
                            className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors"
                            aria-label="Reject">
                            <XCircle className="w-3.5 h-3.5" />
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

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} applications · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      <SlidePanel
        isOpen={!!selected || detailLoading}
        onClose={() => setSelected(null)}
        title={selected?.user.fullName ?? 'Loading...'}
        subtitle="Admission Record"
        width="max-w-lg"
      >
        {detailLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-(--hover-overlay) rounded-xl" />)}
          </div>
        ) : selected && (
          <div className="space-y-5 font-sans text-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-2xl font-serif">
                {selected.user.fullName.charAt(0)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={STATUS_BADGE[selected.status] ?? 'glass'}>{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                <Badge variant={ONBOARDING_BADGE[selected.onboardingStatus] ?? 'glass'} className="text-[10px]">{selected.onboardingStatus}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',       selected.user.email ?? '—'],
                ['Phone',       selected.user.phone ?? '—'],
                ['Program',     selected.program],
                ['Year',        selected.academicYear],
                ['Applied',     new Date(selected.createdAt).toLocaleDateString()],
                ['Reviewed',    selected.reviewedAt ? new Date(selected.reviewedAt).toLocaleDateString() : '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1">{String(v)}</p>
                </div>
              ))}
            </div>
            {selected.reviewComment && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint) mb-1">Review Comment</p>
                <p className="font-sans text-xs text-(--text-secondary) italic">"{selected.reviewComment}"</p>
              </div>
            )}
            {selected.documents?.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase text-(--text-faint) mb-2">Documents ({selected.documents.length})</p>
                <div className="space-y-1.5">
                  {selected.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-(--hover-overlay)">
                      <span className="font-sans text-(--text-secondary)">{doc.type}</span>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-(--brand-gold) hover:underline">View</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Action modal */}
      <Modal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={`${actionTarget?.action === 'accept' ? 'Accept' : 'Reject'} Application`}
        maxWidth="max-w-sm"
      >
        {actionTarget && (
          <div className="space-y-4 font-sans text-sm">
            {actionError && <InlineError message={actionError} />}
            <p className="text-(--text-secondary)">
              {actionTarget.action === 'accept' ? 'Accept' : 'Reject'} application from{' '}
              <span className="font-semibold text-(--text-primary)">{actionTarget.admission.user.fullName}</span>?
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Comment (optional)</label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={e => setActionComment(e.target.value)}
                placeholder="Add a review comment..."
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setActionTarget(null)}>Cancel</Button>
              <Button
                variant={actionTarget.action === 'accept' ? 'primary' : 'danger'}
                className="flex-1"
                disabled={actionLoading}
                onClick={handleAction}
              >
                {actionLoading ? 'Saving...' : actionTarget.action === 'accept' ? 'Accept' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
