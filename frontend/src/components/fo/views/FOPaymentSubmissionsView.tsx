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

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FOPaymentSubmissionsView() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        getPaymentSubmissions({ search: searchQuery.trim() || undefined }),
        getPaymentSubmissionAnalytics().catch(() => null),
      ]);
      setSubmissions(subsData?.submissions ?? []);
      if (anaData) setAnalytics(anaData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handle Approve ────────────────────────────────────────────────────────
  const handleApprove = async (sub: any) => {
    if (!window.confirm(`Approve payment of ${fmtETB(sub.amount)} for ${sub.student?.user?.fullName || 'student'}? This will mark the installment PAID and generate an official receipt.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await approvePaymentSubmission(sub.id);
      showToast(`Payment approved successfully. Receipt: ${result.receipt.receiptNumber}`, 'success');
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
      setRejectError('Please provide a specific rejection reason explaining why the payment cannot be verified.');
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
        title="Payment Submissions Review"
        subtitle="Review student-uploaded bank slips, verify transaction IDs, approve to generate official receipts, or reject with reasons."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => loadData(true)}
          >
            Refresh
          </Button>
        }
      />

      {/* ── ANALYTICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-amber-500">
            Pending Submissions
          </p>
          <h3 className="font-serif text-2xl font-bold text-amber-500">
            {analytics?.pendingCount ?? submissions.length}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Awaiting Finance Officer verification</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--brand-gold)' }}>
            Pending Total Amount
          </p>
          <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--brand-gold)' }}>
            {fmtETB(analytics?.totalPendingAmount ?? 0)}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Submitted funds waiting for approval</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-emerald-500">
            Approved Payments
          </p>
          <h3 className="font-serif text-2xl font-bold text-emerald-500">
            {analytics?.approvedCount ?? 0}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Successfully verified & cleared</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-rose-500">
            Rejected Submissions
          </p>
          <h3 className="font-serif text-2xl font-bold text-rose-500">
            {analytics?.rejectedCount ?? 0}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sent back for correction</p>
        </Card>
      </div>

      {/* ── SEARCH BAR ── */}
      <Card hoverable={false} className="p-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by student name, ID, or reference number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none focus:border-[var(--brand-gold)]"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          />
        </div>
      </Card>

      {/* ── PENDING SUBMISSIONS TABLE ── */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No Pending Payment Submissions"
          description="All student payment submissions have been reviewed. New submissions from students will appear here in real time."
        />
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead
                className="font-mono text-[11px] uppercase tracking-wider border-b"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}
              >
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Student</th>
                  <th className="py-3.5 px-4 font-semibold">Program / Context</th>
                  <th className="py-3.5 px-4 font-semibold">Month & Expected</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Method & Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Evidence</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="transition-colors hover:bg-[var(--hover-overlay)]"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    {/* Student */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {sub.student?.user?.fullName || 'Student'}
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        ID: {sub.student?.studentId || '—'}
                      </span>
                    </td>

                    {/* Program / Context */}
                    <td className="py-4 px-4">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {sub.student?.department?.name || 'Department'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {sub.installment?.academicContext === 'SHORT_PROGRAM' ? (
                          <Badge variant="info">Short Program ({sub.installment.durationMonths || '—'}M)</Badge>
                        ) : (
                          <Badge variant="amber">TVET</Badge>
                        )}
                      </div>
                    </td>

                    {/* Month & Expected */}
                    <td className="py-4 px-4">
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {sub.installment?.monthLabel || 'Installment'}
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        Exp: {fmtETB(sub.installment?.expectedAmount ?? 0)}
                      </span>
                    </td>

                    {/* Submitted Amount */}
                    <td className="py-4 px-4 font-mono font-bold text-sm text-emerald-500">
                      {fmtETB(sub.amount)}
                    </td>

                    {/* Method & Ref */}
                    <td className="py-4 px-4">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {sub.paymentMethod}
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        Ref: {sub.referenceNumber || 'None'}
                      </span>
                    </td>

                    {/* Evidence Button */}
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        View Slip
                      </Button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                          onClick={() => openRejectModal(sub)}
                          disabled={actionLoading}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          onClick={() => handleApprove(sub)}
                          disabled={actionLoading}
                        >
                          Approve
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EVIDENCE PREVIEW MODAL ── */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title="Payment Evidence & Verification Details"
        maxWidth="max-w-xl"
      >
        {selectedSubmission && (
          <div className="space-y-4 text-xs font-sans p-1">
            {/* Detail Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-[10px] font-mono uppercase text-muted">Student Name</p>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {selectedSubmission.student?.user?.fullName}
                </p>
                <p className="text-[11px] font-mono text-muted">ID: {selectedSubmission.student?.studentId}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-muted">Program & Track</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedSubmission.student?.department?.name}
                </p>
                <p className="text-[11px] text-muted">
                  {selectedSubmission.installment?.academicContext === 'SHORT_PROGRAM' ? `Short Program (${selectedSubmission.installment.durationMonths}M)` : 'TVET Track'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-muted">Billing Month</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedSubmission.installment?.monthLabel} (Month {selectedSubmission.installment?.monthIndex})
                </p>
                <p className="text-[11px] font-mono text-muted">Expected: {fmtETB(selectedSubmission.installment?.expectedAmount ?? 0)}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-muted">Submitted Amount</p>
                <p className="font-mono font-bold text-base text-emerald-500">
                  {fmtETB(selectedSubmission.amount)}
                </p>
                <p className="text-[11px] text-muted">Paid Date: {formatDate(selectedSubmission.paymentDate)}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-muted">Payment Channel</p>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedSubmission.paymentMethod}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase text-muted">Reference / Transaction ID</p>
                <p className="font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>
                  {selectedSubmission.referenceNumber || 'No reference entered'}
                </p>
              </div>

              {selectedSubmission.note && (
                <div className="col-span-2 border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="text-[10px] font-mono uppercase text-muted">Student Remarks</p>
                  <p className="italic text-muted mt-0.5">"{selectedSubmission.note}"</p>
                </div>
              )}
            </div>

            {/* Evidence Image / PDF Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Uploaded Bank Slip / Transfer Proof
                </span>
                <a
                  href={selectedSubmission.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--brand-gold)] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
              </div>

              {selectedSubmission.evidenceUrl.endsWith('.pdf') ? (
                <div className="p-8 text-center border rounded-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
                  <FileText className="w-12 h-12 mx-auto text-rose-500 mb-2" />
                  <p className="font-semibold">{selectedSubmission.evidenceFileName || 'PDF Document'}</p>
                  <p className="text-[11px] text-muted mt-1">Click above to view full PDF document.</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border max-h-96 flex items-center justify-center bg-black/20" style={{ borderColor: 'var(--border-default)' }}>
                  <img
                    src={selectedSubmission.evidenceUrl}
                    alt="Payment evidence"
                    className="max-h-96 object-contain w-full"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
              <Button
                variant="secondary"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
              </Button>
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
                  Approve & Issue Receipt
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── REJECTION REASON MODAL (Spec §10) ── */}
      <Modal
        isOpen={!!rejectingSub}
        onClose={() => setRejectingSub(null)}
        title="Reject Payment Submission"
        maxWidth="max-w-md"
      >
        {rejectingSub && (
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs font-sans p-1">
            <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {rejectingSub.student?.user?.fullName} — {fmtETB(rejectingSub.amount)}
              </p>
              <p className="text-[11px] text-muted font-mono">
                {rejectingSub.installment?.monthLabel} · Ref: {rejectingSub.referenceNumber || 'N/A'}
              </p>
            </div>

            {rejectError && (
              <div className="p-3 rounded-lg text-rose-500 bg-rose-500/10 border border-rose-500/20 text-xs">
                {rejectError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify reason (e.g. Bank slip transaction number could not be matched, blurry photo, amount discrepancy...)"
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans outline-none focus:border-rose-500"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              />
              <p className="text-[10px] text-muted">
                This explanation will be sent directly to the student via notification and displayed on their payment portal so they can correct and resubmit.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setRejectingSub(null)}
              >
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

      {/* ── OFFICIAL RECEIPT PREVIEW (after approval) ── */}
      <Modal
        isOpen={!!approvedReceipt}
        onClose={() => setApprovedReceipt(null)}
        title="Official Payment Receipt Generated"
        maxWidth="max-w-md"
      >
        {approvedReceipt && (
          <div className="space-y-4 text-xs font-sans p-1">
            <div className="p-4 rounded-xl border text-center space-y-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <h4 className="font-serif font-bold text-base text-neutral-900">Payment Successfully Verified</h4>
              <p className="text-[11px] font-mono font-semibold">
                Receipt Number: {approvedReceipt.receiptNumber}
              </p>
            </div>

            <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
              <div className="flex justify-between">
                <span className="text-muted">Amount Paid:</span>
                <span className="font-mono font-bold text-sm text-emerald-500">{fmtETB(approvedReceipt.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Installment Month:</span>
                <span className="font-semibold">{approvedReceipt.monthLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Payment Date:</span>
                <span className="font-mono">{formatDate(approvedReceipt.paymentDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Payment Method:</span>
                <span>{approvedReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setApprovedReceipt(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
