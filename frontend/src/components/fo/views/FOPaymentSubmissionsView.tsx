'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  User,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, SkeletonTable, EmptyState, useToast, ToastContainer } from '../../ui/States';
import {
  getPaymentSubmissions,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  getPaymentSubmissionAnalytics,
} from '../../../lib/foApi';

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `ETB ${abs}`;
}

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string | Date) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FOPaymentSubmissionsView({ programType: initialProgramType }: { programType?: 'TVET' | 'SHORT_PROGRAM' }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Status Filter Tabs: Review pending vs previous decisions
  const [statusFilter, setStatusFilter] = useState<'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING_REVIEW');
  const [contextFilter, setContextFilter] = useState<'ALL' | 'TVET' | 'SHORT_PROGRAM'>(initialProgramType || 'ALL');

  // Selected Submission for Evidence Viewing
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Reject Modal State
  const [rejectingSub, setRejectingSub] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Success Receipt Preview Modal (after approval)
  const [approvedReceipt, setApprovedReceipt] = useState<any | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Submissions & Analytics ──────────────────────────────────────────
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [subsData, anaData] = await Promise.all([
        getPaymentSubmissions({
          search: searchQuery.trim() || undefined,
          status: statusFilter,
          programType: contextFilter !== 'ALL' ? contextFilter : undefined,
        }),
        getPaymentSubmissionAnalytics().catch(() => null),
      ]);
      setSubmissions(subsData?.submissions ?? []);
      if (anaData) setAnalytics(anaData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, contextFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handle Approve ────────────────────────────────────────────────────────
  const handleApprove = async (sub: any) => {
    if (
      !window.confirm(
        `Approve payment of ${fmtETB(sub.amount)} for ${sub.student?.user?.fullName || 'student'}? This will mark the installment PAID, update their balance, and generate an official receipt.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await approvePaymentSubmission(sub.id);
      showToast(`Payment approved successfully. Official Receipt: ${result.receipt.receiptNumber}`, 'success');
      setApprovedReceipt(result.receipt);
      setSelectedSubmission(null);
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve payment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Handle Reject ─────────────────────────────────────────────────────────
  const openRejectModal = (sub: any) => {
    setRejectingSub(sub);
    setRejectionReason('');
    setRejectError(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSub) return;

    if (!rejectionReason.trim()) {
      setRejectError('Please provide a specific rejection explanation so the student understands what to correct.');
      return;
    }

    setActionLoading(true);
    setRejectError(null);
    try {
      await rejectPaymentSubmission(rejectingSub.id, rejectionReason.trim());
      showToast('Payment submission rejected and student notified.', 'warning');
      setRejectingSub(null);
      setSelectedSubmission(null);
      await loadData(true);
    } catch (err: any) {
      setRejectError(err.message || 'Failed to reject submission');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <FOPageHeader
        title="Payment Verification & Reviews"
        subtitle="Finance Officer payment review section. Inspect submitted proofs, verify transaction references, approve to issue receipts, or reject with required explanations."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />}
            onClick={() => loadData(true)}
            disabled={actionLoading}
          >
            Refresh Queue
          </Button>
        }
      />

      {/* ── ANALYTICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverable={false} className="p-4 space-y-1.5 border border-(--border-default)">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase font-bold tracking-wider text-amber-500">
              Pending Submissions
            </p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-amber-500">
            {analytics?.pendingCount ?? 0}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Awaiting FO verification</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5 border border-(--border-default)">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase font-bold tracking-wider text-emerald-500">
              Approved Receipts
            </p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-emerald-500">
            {analytics?.approvedCount ?? 0}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total verified receipts issued</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5 border border-(--border-default)">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--brand-gold)' }}>
              Total Verified Revenue
            </p>
            <Receipt className="w-4 h-4 text-(--brand-gold)" />
          </div>
          <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--brand-gold)' }}>
            {fmtETB(analytics?.totalApprovedAmount ?? 0)}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sum of approved payments</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5 border border-(--border-default)">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase font-bold tracking-wider text-rose-500">
              Rejected Submissions
            </p>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-rose-500">
            {analytics?.rejectedCount ?? 0}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Returned with required reason</p>
        </Card>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <Card hoverable={false} className="p-4 border border-(--border-default)">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Decision Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-(--hover-overlay) border border-(--border-default)">
            <button
              onClick={() => setStatusFilter('PENDING_REVIEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'PENDING_REVIEW'
                  ? 'bg-(--card-bg) text-amber-500 shadow-sm'
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
            >
              Pending Verification ({analytics?.pendingCount ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-(--card-bg) text-emerald-500 shadow-sm'
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
            >
              Approved History ({analytics?.approvedCount ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-(--card-bg) text-rose-500 shadow-sm'
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
            >
              Rejected ({analytics?.rejectedCount ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-(--card-bg) text-(--text-primary) shadow-sm'
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
            >
              All Decisions
            </button>
          </div>

          {/* Program Category Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-(--hover-overlay) border border-(--border-default)">
              <button
                onClick={() => setContextFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  contextFilter === 'ALL' ? 'bg-(--card-bg) text-(--brand-gold) shadow-sm' : 'text-(--text-muted)'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setContextFilter('TVET')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  contextFilter === 'TVET' ? 'bg-(--card-bg) text-(--brand-gold) shadow-sm' : 'text-(--text-muted)'
                }`}
              >
                TVET
              </button>
              <button
                onClick={() => setContextFilter('SHORT_PROGRAM')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  contextFilter === 'SHORT_PROGRAM' ? 'bg-(--card-bg) text-(--brand-gold) shadow-sm' : 'text-(--text-muted)'
                }`}
              >
                Short Program
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-faint)" />
              <input
                type="text"
                placeholder="Search student, ID, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-(--border-default) bg-(--card-bg) text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold)"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── SUBMISSIONS QUEUE / HISTORY TABLE ── */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={
            statusFilter === 'PENDING_REVIEW'
              ? 'No Pending Payment Submissions'
              : `No ${statusFilter.toLowerCase()} submissions found`
          }
          description={
            statusFilter === 'PENDING_REVIEW'
              ? 'All student payment submissions have been reviewed. When students submit proof, it will appear here.'
              : 'No payment submissions match the selected filter.'
          }
        />
      ) : (
        <Card hoverable={false} className="overflow-hidden border border-(--border-default)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Program & Category</th>
                  <th className="py-3 px-4">Payment Month</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method & Reference</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {submissions.map((sub) => {
                  const isPending = sub.status === 'PENDING_REVIEW';
                  const isApproved = sub.status === 'APPROVED';
                  const isRejected = sub.status === 'REJECTED';

                  return (
                    <tr key={sub.id} className="hover:bg-(--hover-overlay) transition-colors">
                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-(--text-primary)">
                          {sub.student?.user?.fullName || 'Student'}
                        </p>
                        <p className="font-mono text-[10px] text-(--text-muted)">
                          ID: {sub.student?.studentId || '—'}
                        </p>
                      </td>

                      {/* Program & Category */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="font-semibold text-(--text-primary) truncate">
                          {sub.student?.program?.name || sub.student?.department?.name || 'Program'}
                        </p>
                        <div className="mt-0.5">
                          <Badge variant={sub.student?.programType === 'TVET' ? 'gold' : 'info'}>
                            {sub.student?.programType === 'TVET' ? 'TVET' : 'Short Program'}
                          </Badge>
                        </div>
                      </td>

                      {/* Payment Month */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-(--text-primary)">
                          {sub.installment?.billingLabel || sub.installment?.billingMonth || 'Installment'}
                        </p>
                        <p className="font-mono text-[10px] text-(--text-muted)">
                          Due: {formatDate(sub.installment?.dueDate)}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-(--text-primary)">
                        {fmtETB(sub.amount)}
                      </td>

                      {/* Method & Reference */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-(--text-primary)">
                          {sub.paymentMethod}
                        </p>
                        <p className="font-mono text-[10px] text-(--brand-gold)">
                          Ref: {sub.referenceNumber || 'None'}
                        </p>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-4 text-(--text-secondary) font-mono text-[11px]">
                        {formatDateTime(sub.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isPending && <Badge variant="amber">Pending Review</Badge>}
                        {isApproved && <Badge variant="emerald">Approved</Badge>}
                        {isRejected && <Badge variant="rose">Rejected</Badge>}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setSelectedSubmission(sub)}
                          >
                            Preview Proof
                          </Button>
                          {isPending && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleApprove(sub)}
                                disabled={actionLoading}
                              >
                                Approve
                              </Button>
                              <button
                                className="p-1.5 rounded-lg hover:bg-(--hover-overlay) transition-colors text-rose-500 disabled:opacity-50"
                                onClick={() => openRejectModal(sub)}
                                disabled={actionLoading}
                                title="Reject submission"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── PREVIEW SUBMITTED PAYMENT PROOF MODAL ── */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title="Payment Verification & Proof Preview"
        maxWidth="max-w-2xl"
      >
        {selectedSubmission && (
          <div className="space-y-5 text-xs font-sans">
            {/* Student & Program Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-(--border-default) bg-(--hover-overlay)">
              <div>
                <p className="text-[10px] font-mono uppercase text-(--text-muted)">Student</p>
                <p className="font-bold text-sm text-(--text-primary)">
                  {selectedSubmission.student?.user?.fullName}
                </p>
                <p className="text-[11px] font-mono text-(--text-muted)">
                  ID: {selectedSubmission.student?.studentId}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-(--text-muted)">Program & Category</p>
                <p className="font-semibold text-(--text-primary)">
                  {selectedSubmission.student?.program?.name || selectedSubmission.student?.department?.name}
                </p>
                                <Badge variant={selectedSubmission.student?.programType === 'TVET' ? 'gold' : 'info'}>
                  {selectedSubmission.student?.programType === 'TVET' ? 'TVET Track' : 'Short Program Track'}
                </Badge>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-(--text-muted)">Payment Month</p>
                <p className="font-semibold text-(--text-primary)">
                  {selectedSubmission.installment?.billingLabel}
                </p>
                <p className="text-[11px] font-mono text-(--text-muted)">
                  Fee: {fmtETB(selectedSubmission.installment?.expectedAmount ?? 0)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-(--text-muted)">Submitted Amount</p>
                <p className="font-mono font-bold text-base text-emerald-500">
                  {fmtETB(selectedSubmission.amount)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-(--text-muted)">Payment Method</p>
                <p className="font-semibold text-(--text-primary)">
                  {selectedSubmission.paymentMethod}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-(--text-muted)">Transaction Reference</p>
                <p className="font-mono font-bold text-(--brand-gold)">
                  {selectedSubmission.referenceNumber || 'None provided'}
                </p>
              </div>

              {selectedSubmission.note && (
                <div className="col-span-full border-t border-(--border-subtle) pt-2">
                  <p className="text-[10px] font-mono uppercase text-(--text-muted)">Student Note</p>
                  <p className="italic text-(--text-secondary) mt-0.5">"{selectedSubmission.note}"</p>
                </div>
              )}

              {selectedSubmission.rejectionReason && (
                <div className="col-span-full border-t border-(--border-subtle) pt-2 p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <p className="text-[10px] font-mono uppercase font-bold">Recorded Rejection Reason:</p>
                  <p className="mt-0.5">{selectedSubmission.rejectionReason}</p>
                </div>
              )}

              {selectedSubmission.receipt && (
                <div className="col-span-full border-t border-(--border-subtle) pt-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <p className="text-[10px] font-mono uppercase font-bold">Official Receipt Issued:</p>
                  <p className="font-mono font-bold mt-0.5">{selectedSubmission.receipt.receiptNumber}</p>
                </div>
              )}
            </div>

            {/* Evidence Document Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase font-bold text-(--text-muted)">
                  Submitted Payment Proof (Screenshot / Slip)
                </span>
                <a
                  href={selectedSubmission.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-(--brand-gold) hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Document Full Screen
                </a>
              </div>

              {selectedSubmission.evidenceUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="p-8 text-center border border-(--border-default) rounded-xl bg-(--card-bg)">
                  <FileText className="w-12 h-12 mx-auto text-rose-500 mb-2" />
                  <p className="font-semibold text-sm text-(--text-primary)">
                    {selectedSubmission.evidenceFileName || 'PDF Proof Document'}
                  </p>
                  <p className="text-[11px] text-(--text-muted) mt-1">
                    Click 'Open Document Full Screen' above to view the complete PDF.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-(--border-default) max-h-[420px] flex items-center justify-center bg-black/10">
                  <img
                    src={selectedSubmission.evidenceUrl}
                    alt="Payment proof screenshot"
                    className="max-h-[420px] object-contain w-full"
                  />
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between border-t border-(--border-default) pt-3">
              <Button variant="secondary" onClick={() => setSelectedSubmission(null)}>
                Close Preview
              </Button>

              {selectedSubmission.status === 'PENDING_REVIEW' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    icon={<XCircle className="w-4 h-4 text-rose-500" />}
                    onClick={() => openRejectModal(selectedSubmission)}
                  >
                    Reject Submission
                  </Button>
                  <Button
                    variant="primary"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleApprove(selectedSubmission)}
                    disabled={actionLoading}
                  >
                    Approve & Issue Official Receipt
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── REJECTION REASON MODAL (Required Explanation) ── */}
      <Modal
        isOpen={!!rejectingSub}
        onClose={() => setRejectingSub(null)}
        title="Reject Payment Submission"
        maxWidth="max-w-md"
      >
        {rejectingSub && (
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs font-sans">
            <div className="p-3 rounded-xl border border-(--border-default) bg-(--card-bg) space-y-1">
              <p className="font-semibold text-(--text-primary)">
                {rejectingSub.student?.user?.fullName} — {fmtETB(rejectingSub.amount)}
              </p>
              <p className="text-[11px] text-(--text-muted) font-mono">
                {rejectingSub.installment?.billingLabel} · Ref: {rejectingSub.referenceNumber || 'N/A'}
              </p>
            </div>

            {rejectError && (
              <div className="p-3 rounded-lg text-rose-500 bg-rose-500/10 border border-rose-500/20 text-xs">
                {rejectError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold text-(--text-muted) block">
                Required Explanation / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why payment cannot be approved (e.g. Reference number does not match bank deposit records, blurry screenshot, invalid amount...)"
                className="w-full p-3 rounded-xl border border-(--border-default) bg-(--card-bg) text-(--text-primary) text-xs outline-none focus:border-rose-500"
              />
              <p className="text-[10px] text-(--text-muted)">
                This reason will be displayed to the student so they can correct the issue and resubmit their payment proof. Historical submission records remain preserved.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-(--border-default)">
              <Button variant="secondary" type="button" onClick={() => setRejectingSub(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={actionLoading || !rejectionReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── OFFICIAL RECEIPT PREVIEW MODAL ── */}
      <Modal
        isOpen={!!approvedReceipt}
        onClose={() => setApprovedReceipt(null)}
        title="Official Payment Receipt Issued"
        maxWidth="max-w-md"
      >
        {approvedReceipt && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl border text-center space-y-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <h4 className="font-serif font-bold text-base text-neutral-900">Payment Officially Approved</h4>
              <p className="text-[11px] font-mono font-semibold">
                Receipt Number: {approvedReceipt.receiptNumber}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-(--border-default) bg-(--card-bg) space-y-2">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Amount Paid:</span>
                <span className="font-mono font-bold text-sm text-emerald-500">{fmtETB(approvedReceipt.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Month:</span>
                <span className="font-semibold text-(--text-primary)">{approvedReceipt.billingLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Payment Method:</span>
                <span className="text-(--text-primary)">{approvedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Reference:</span>
                <span className="font-mono text-(--brand-gold)">{approvedReceipt.referenceNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Approved Date:</span>
                <span className="font-mono text-(--text-secondary)">{formatDateTime(approvedReceipt.approvedAt)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setApprovedReceipt(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
