import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StudentProfile } from '../types';
import {
  MonthlyInstallmentItem,
  InstallmentScheduleResponse,
  PaymentSubmissionItem,
  PaymentReceiptItem,
  studentDashApi,
} from '../lib/studentApi';
import {
  CreditCard,
  CheckCircle2,
  Receipt,
  Clock,
  AlertTriangle,
  Upload,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Info,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { SlidePanel } from './ui/SlidePanel';
import { Input } from './ui/Input';
import { SkeletonCard, SkeletonTable, EmptyState } from './ui/States';

interface FinancialsViewProps {
  profile: StudentProfile;
  transactions?: any[];
}

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `ETB ${abs}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const PAYMENT_METHODS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Telebirr',
  'CBE Birr',
  'Awash Bank',
  'Bank of Abyssinia',
  'Cash Deposit at Finance Office',
  'Other Bank Transfer',
];

export const FinancialsView: React.FC<FinancialsViewProps> = ({ profile }) => {
  const [scheduleData, setScheduleData] = useState<InstallmentScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Panels
  const [payModalInstallment, setPayModalInstallment] = useState<MonthlyInstallmentItem | null>(null);
  const [receiptModal, setReceiptModal] = useState<PaymentReceiptItem | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<{ submission: PaymentSubmissionItem; monthLabel: string } | null>(null);

  // Payment Submission Form State
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [refNumber, setRefNumber] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Installments ──────────────────────────────────────────────────────
  const loadInstallments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await studentDashApi.getInstallments();
      setScheduleData(data);
    } catch (err) {
      console.error('Failed to load installment schedule:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInstallments();
  }, [loadInstallments]);

  // ── Handle Open Pay Modal ───────────────────────────────────────────────────
  const openPayModal = (inst: MonthlyInstallmentItem) => {
    setPayModalInstallment(inst);
    setPayAmount(String(inst.expectedAmount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setRefNumber('');
    setNote('');
    setEvidenceFile(null);
    setEvidenceUrl('');
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  // ── File Upload Handler ─────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEvidenceFile(file);
    setUploadingFile(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.fileUrl) {
        throw new Error(data.error ?? 'Upload failed');
      }
      setEvidenceUrl(data.fileUrl);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to upload payment evidence');
      setEvidenceFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  // ── Submit Payment Evidence ─────────────────────────────────────────────────
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInstallment) return;

    if (!evidenceUrl) {
      setSubmitError('Please upload your payment screenshot or receipt document as evidence.');
      return;
    }

    const numAmount = parseFloat(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await studentDashApi.submitInstallmentPayment(payModalInstallment.id, {
        amount: numAmount,
        paymentDate,
        paymentMethod,
        referenceNumber: refNumber.trim() || undefined,
        evidenceUrl,
        evidenceFileName: evidenceFile?.name,
        note: note.trim() || undefined,
      });

      setSubmitSuccess(true);
      await loadInstallments(true);
      setTimeout(() => {
        setPayModalInstallment(null);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setSubmitError(err.message || 'Payment submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: MonthlyInstallmentItem['status']) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald">Paid</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="amber">Pending Review</Badge>;
      case 'DUE':
        return <Badge variant="info">Payment Due</Badge>;
      case 'OVERDUE':
        return <Badge variant="rose">Overdue</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">Correction Required</Badge>;
      case 'UPCOMING':
      default:
        return <Badge variant="glass">Upcoming</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable rows={4} />
      </div>
    );
  }

  const nextDue = scheduleData?.nextDue;
  const countdown = scheduleData?.countdown;
  const installments = scheduleData?.installments ?? [];
  const hasConfig = scheduleData?.hasConfig ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-12"
    >
      {/* ── TOP HEADER & REFRESH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Financials & Monthly Tuition
          </h2>
          <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Official installment payment schedule, verification status, and tax-compliant receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadInstallments(true)}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── LARGE PAYMENT COUNTDOWN BANNER (Spec §4) ── */}
      {hasConfig && countdown && nextDue ? (
        <div
          className="relative rounded-2xl overflow-hidden p-6 sm:p-8 border-2 shadow-lg"
          style={{
            backgroundColor: 'var(--hover-overlay)',
            borderColor: countdown.isOverdue
              ? 'var(--status-danger)'
              : countdown.isDueToday
              ? 'var(--status-warning)'
              : 'var(--brand-gold)',
          }}
        >
          {/* Subtle gradient glow */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-10"
            style={{
              backgroundColor: countdown.isOverdue ? 'var(--status-danger)' : 'var(--brand-gold)',
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    color: countdown.isOverdue ? 'var(--status-danger)' : 'var(--brand-gold)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  MONTHLY TUITION · {nextDue.monthLabel}
                </span>
                {renderStatusBadge(nextDue.status)}
              </div>

              {/* Countdown Main Display */}
              <div>
                <h1
                  className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight"
                  style={{
                    color: countdown.isOverdue
                      ? 'var(--status-danger)'
                      : countdown.isDueToday
                      ? 'var(--status-warning)'
                      : 'var(--text-primary)',
                  }}
                >
                  {countdown.label}
                </h1>
                <p className="font-mono text-sm sm:text-base font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {countdown.isOverdue
                    ? 'Your monthly tuition payment is overdue. Please submit evidence immediately.'
                    : countdown.isDueToday
                    ? 'Payment is due today. Submit your payment evidence before end of day.'
                    : 'Until Next Payment Due Date'}
                </p>
              </div>

              {/* Amount & Due Date details */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs sm:text-sm font-sans">
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>Monthly Tuition:</span>
                  <span className="font-mono font-bold text-base" style={{ color: 'var(--brand-gold)' }}>
                    {fmtETB(nextDue.expectedAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>Payment Due:</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatDate(nextDue.dueDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              {nextDue.status === 'PENDING_REVIEW' ? (
                <div className="p-4 rounded-xl text-center space-y-1" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                  <p className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Payment Submitted
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Waiting for Finance Officer approval.
                  </p>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  icon={<CreditCard className="w-5 h-5" />}
                  onClick={() => openPayModal(nextDue)}
                  className="shadow-lg"
                >
                  Submit Payment Evidence
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : !hasConfig ? (
        <Card hoverable={false} className="p-6 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Tuition Configuration Pending
              </h3>
              <p className="text-xs font-sans max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                The Finance Office has not yet published an active tuition rate for your academic program ({scheduleData?.departmentName || profile.major || 'Your Department'}).
                Once configured, your monthly payment schedule will appear here automatically.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card hoverable={false} className="p-6 text-center border-emerald-500/40 bg-emerald-500/5">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h3 className="font-serif font-bold text-xl text-emerald-500">All Installments Cleared</h3>
          <p className="text-xs font-sans text-muted mt-1">
            You have no outstanding tuition payments for the current academic period.
          </p>
        </Card>
      )}

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card hoverable={false} className="space-y-2 p-5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Monthly Tuition Rate
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--brand-gold)' }}>
            {nextDue ? fmtETB(nextDue.expectedAmount) : hasConfig && installments[0] ? fmtETB(installments[0].expectedAmount) : '—'}
          </h3>
          <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>
            {scheduleData?.programType === 'SHORT_PROGRAM' ? `Short Program (${scheduleData?.shortProgramDuration || 'Duration'} schedule)` : 'TVET Program Rate'}
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2 p-5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Total Paid to Date
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-500">
            {fmtETB(scheduleData?.totalPaid ?? 0)}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Official Approved Payments</span>
          </div>
        </Card>

        <Card hoverable={false} className="space-y-2 p-5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Total Outstanding
          </p>
          <h3
            className="font-serif text-2xl sm:text-3xl font-bold"
            style={{
              color: (scheduleData?.totalOutstanding ?? 0) > 0 ? 'var(--status-danger)' : 'var(--text-primary)',
            }}
          >
            {fmtETB(scheduleData?.totalOutstanding ?? 0)}
          </h3>
          <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>
            Remaining scheduled tuition
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2 p-5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Financial Clearance
          </p>
          <div className="flex items-center gap-2 pt-1">
            {(scheduleData?.totalOutstanding ?? 0) === 0 && installments.length > 0 ? (
              <Badge variant="emerald">Cleared for Term</Badge>
            ) : nextDue?.status === 'PENDING_REVIEW' ? (
              <Badge variant="amber">Verification Pending</Badge>
            ) : nextDue?.status === 'OVERDUE' ? (
              <Badge variant="rose">Action Required</Badge>
            ) : (
              <Badge variant="info">In Good Standing</Badge>
            )}
          </div>
          <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>
            {profile.clearedTerm ? `Term: ${profile.clearedTerm}` : 'Academic Year 2026-2027'}
          </p>
        </Card>
      </div>

      {/* ── MONTHLY INSTALLMENT SCHEDULE TABLE ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Monthly Payment Schedule & History
            </h3>
            <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Complete record of all billing months, payment submissions, and official receipts.
            </p>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            {installments.length} Monthly Cycles
          </span>
        </div>

        {installments.length === 0 ? (
          <EmptyState
            title="No Payment Schedule Found"
            description="Your monthly payment schedule has not been generated yet. Please ensure your program enrollment is finalized or contact the Finance Office."
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
                    <th className="py-3.5 px-4 font-semibold">Billing Month</th>
                    <th className="py-3.5 px-4 font-semibold">Due Date</th>
                    <th className="py-3.5 px-4 font-semibold">Expected Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Paid Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {installments.map((inst) => {
                    const latestSub = inst.paymentSubmissions?.[0];
                    const approvedReceipt = inst.receipts?.[0];

                    return (
                      <tr
                        key={inst.id}
                        className="transition-colors hover:bg-[var(--hover-overlay)]"
                        style={{ backgroundColor: 'var(--card-bg)' }}
                      >
                        {/* Month */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {inst.monthLabel}
                          </div>
                          <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>
                            Month {inst.monthIndex}
                          </span>
                        </td>

                        {/* Due Date */}
                        <td className="py-4 px-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(inst.dueDate)}
                        </td>

                        {/* Expected */}
                        <td className="py-4 px-4 font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {fmtETB(inst.expectedAmount)}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-4 px-4 font-mono font-bold" style={{ color: inst.paidAmount > 0 ? 'var(--status-success)' : 'var(--text-faint)' }}>
                          {inst.paidAmount > 0 ? fmtETB(inst.paidAmount) : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {renderStatusBadge(inst.status)}
                            {inst.status === 'REJECTED' && latestSub?.rejectionReason && (
                              <p className="text-[10px] text-rose-500 font-sans max-w-xs">
                                Reason: {latestSub.rejectionReason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inst.status === 'PAID' && approvedReceipt ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Receipt className="w-3.5 h-3.5 text-[var(--brand-gold)]" />}
                                onClick={() => setReceiptModal(approvedReceipt)}
                              >
                                View Receipt
                              </Button>
                            ) : inst.status === 'PENDING_REVIEW' && latestSub ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
                                onClick={() => setEvidenceModal({ submission: latestSub, monthLabel: inst.monthLabel })}
                              >
                                Under Review
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<Upload className="w-3.5 h-3.5" />}
                                onClick={() => openPayModal(inst)}
                              >
                                {inst.status === 'REJECTED' ? 'Resubmit Payment' : 'Submit Payment'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── SUBMIT PAYMENT EVIDENCE SLIDEPANEL ── */}
      <SlidePanel
        isOpen={!!payModalInstallment}
        side="right"
        onClose={() => {
          if (!submitting) setPayModalInstallment(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
            <span>Submit Payment Evidence</span>
          </div>
        }
        subtitle={payModalInstallment ? `${payModalInstallment.monthLabel} · Month ${payModalInstallment.monthIndex}` : ''}
        width="max-w-md"
      >
        {submitSuccess ? (
          <div className="text-center py-12 space-y-4">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 animate-bounce" />
            <h4 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Payment Submitted!
            </h4>
            <p className="font-sans text-xs max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Your payment evidence has been recorded and submitted for Finance Officer verification.
              Your installment status is now <span className="font-semibold text-amber-500">Pending Review</span>.
            </p>
          </div>
        ) : payModalInstallment ? (
          <form onSubmit={handleSubmitPayment} className="space-y-5 text-xs font-sans">
            {/* Installment Summary Header */}
            <div className="p-4 rounded-xl space-y-2 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Installment:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{payModalInstallment.monthLabel}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
                <span className="font-mono font-semibold">{formatDate(payModalInstallment.dueDate)}</span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Expected Amount:</span>
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--brand-gold)' }}>
                  {fmtETB(payModalInstallment.expectedAmount)}
                </span>
              </div>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-3 rounded-lg text-rose-500 bg-rose-500/10 border border-rose-500/20 text-xs">
                {submitError}
              </div>
            )}

            {/* Amount Input */}
            <Input
              label="Amount Paid (ETB)"
              type="number"
              step="0.01"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            {/* Payment Date */}
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans outline-none focus:border-[var(--brand-gold)]"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Transaction / Reference Number */}
            <Input
              label="Transaction / Reference Number (e.g. CBE / Telebirr TXN ID)"
              type="text"
              placeholder="e.g. FT2609071234 or TLB98765432"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
            />

            {/* File Upload for Evidence */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Payment Screenshot / Receipt Evidence <span className="text-rose-500">*</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors hover:border-[var(--brand-gold)]"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: evidenceUrl ? 'var(--status-success)' : 'var(--border-default)' }}
              >
                {uploadingFile ? (
                  <div className="py-4 space-y-2">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin" style={{ color: 'var(--brand-gold)' }} />
                    <p className="text-[11px] font-mono">Uploading evidence file...</p>
                  </div>
                ) : evidenceUrl ? (
                  <div className="space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="font-semibold text-emerald-500">{evidenceFile?.name || 'File Uploaded'}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click to replace file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto" style={{ color: 'var(--brand-gold)' }} />
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Click to upload bank transfer slip or screenshot
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Supports PNG, JPG, or PDF (Max 50 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Optional Note / Remarks
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special remarks regarding this payment..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans outline-none focus:border-[var(--brand-gold)]"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={submitting || uploadingFile || !evidenceUrl}
              className="w-full py-3 text-sm font-semibold mt-2"
            >
              {submitting ? 'Submitting Payment...' : `Submit ETB ${payAmount || '0.00'} for Verification`}
            </Button>
          </form>
        ) : null}
      </SlidePanel>

      {/* ── OFFICIAL RECEIPT MODAL (Spec §11) ── */}
      <Modal
        isOpen={!!receiptModal}
        onClose={() => setReceiptModal(null)}
        title=""
        maxWidth="max-w-lg"
      >
        {receiptModal && (
          <div className="p-2 space-y-6">
            {/* Printable Receipt Container */}
            <div id="official-receipt-print" className="p-6 rounded-2xl border space-y-5 bg-white text-neutral-900 shadow-sm font-sans">
              {/* College Header */}
              <div className="flex items-center justify-between border-b pb-4 border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-500">
                    <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-extrabold uppercase tracking-wide text-neutral-900 leading-tight">
                      Harmony College
                    </h2>
                    <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                      Office of the Bursar & Finance
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                    OFFICIAL RECEIPT
                  </span>
                  <p className="font-mono text-xs font-bold text-neutral-700 mt-1">
                    {receiptModal.receiptNumber}
                  </p>
                </div>
              </div>

              {/* Student & Academic Context */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-mono uppercase text-neutral-500">Student Name</p>
                  <p className="font-bold text-neutral-900">{profile.name}</p>
                  <p className="text-[11px] font-mono text-neutral-600">ID: {profile.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase text-neutral-500">Program / Context</p>
                  <p className="font-semibold text-neutral-900">{receiptModal.academicContext}</p>
                  <p className="text-[11px] text-neutral-600">{receiptModal.monthLabel}</p>
                </div>
              </div>

              {/* Payment Details Table */}
              <div className="border rounded-xl overflow-hidden border-neutral-200">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-neutral-900">Monthly Tuition — {receiptModal.monthLabel}</p>
                        <p className="text-[10px] text-neutral-500">Method: {receiptModal.paymentMethod}</p>
                        {receiptModal.referenceNumber && (
                          <p className="text-[10px] font-mono text-neutral-500">TXN Ref: {receiptModal.referenceNumber}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-neutral-900">
                        {fmtETB(receiptModal.amountPaid)}
                      </td>
                    </tr>
                    <tr className="border-t border-neutral-200 bg-neutral-50 font-bold">
                      <td className="py-2.5 px-3 text-neutral-900">Total Paid</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {fmtETB(receiptModal.amountPaid)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Approval Footer */}
              <div className="border-t pt-3 border-neutral-200 flex justify-between items-center text-[10px] font-mono text-neutral-500">
                <div>
                  <p>Approved By: <span className="font-semibold text-neutral-800">{receiptModal.approvedBy?.fullName || 'Finance Officer'}</span></p>
                  <p>Verified Date: {formatDate(receiptModal.approvedAt)}</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>VERIFIED & CLEARED</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setReceiptModal(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── VIEW SUBMITTED EVIDENCE MODAL ── */}
      <Modal
        isOpen={!!evidenceModal}
        onClose={() => setEvidenceModal(null)}
        title="Submitted Payment Evidence"
        maxWidth="max-w-lg"
      >
        {evidenceModal && (
          <div className="p-2 space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Month:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{evidenceModal.monthLabel}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Amount Submitted:</span>
                <span className="font-mono font-bold text-emerald-500">{fmtETB(evidenceModal.submission.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                <span style={{ color: 'var(--text-primary)' }}>{evidenceModal.submission.paymentMethod}</span>
              </div>
              {evidenceModal.submission.referenceNumber && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Reference No:</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{evidenceModal.submission.referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Submitted At:</span>
                <span className="font-mono">{formatDate(evidenceModal.submission.createdAt)}</span>
              </div>
              {evidenceModal.submission.note && (
                <div className="border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="text-[10px] font-mono uppercase text-muted">Student Note:</p>
                  <p className="italic mt-0.5" style={{ color: 'var(--text-secondary)' }}>"{evidenceModal.submission.note}"</p>
                </div>
              )}
            </div>

            {/* Evidence Document Preview */}
            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Uploaded Evidence
              </label>
              {evidenceModal.submission.evidenceUrl.endsWith('.pdf') ? (
                <a
                  href={evidenceModal.submission.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border hover:border-[var(--brand-gold)] transition-colors"
                  style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500" />
                    <span className="font-medium">{evidenceModal.submission.evidenceFileName || 'Payment Document (PDF)'}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted" />
                </a>
              ) : (
                <div className="rounded-xl overflow-hidden border max-h-80 flex items-center justify-center bg-black/20" style={{ borderColor: 'var(--border-default)' }}>
                  <img
                    src={evidenceModal.submission.evidenceUrl}
                    alt="Payment evidence"
                    className="max-h-80 object-contain w-full"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setEvidenceModal(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
