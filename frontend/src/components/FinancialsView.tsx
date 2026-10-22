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
  Eye,
  FileCheck,
  HelpCircle,
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

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Exactly the 4 supported payment methods required
const PAYMENT_METHODS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Cooperative Bank',
  'Telebirr',
];

export const FinancialsView: React.FC<FinancialsViewProps> = ({ profile }) => {
  const [scheduleData, setScheduleData] = useState<InstallmentScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view tab: 'schedule' | 'history' | 'receipts'
  const [activeTab, setActiveTab] = useState<'schedule' | 'history' | 'receipts'>('schedule');

  // Modals & Panels
  const [payModalInstallment, setPayModalInstallment] = useState<MonthlyInstallmentItem | null>(null);
  const [receiptModal, setReceiptModal] = useState<any | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<{ submission: PaymentSubmissionItem; monthLabel: string } | null>(null);

  // Payment Submission Form State
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [refNumber, setRefNumber] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Live countdown state (updated every 1s)
  const [liveCountdown, setLiveCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  } | null>(null);

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

  // ── Live Countdown Timer Ticker ─────────────────────────────────────────────
  // Calculates live countdown values from actual stored deadline (survives page refreshes)
  useEffect(() => {
    const nextDue = scheduleData?.nextDue;
    if (!nextDue || nextDue.status === 'PAID') {
      setLiveCountdown(null);
      return;
    }

    const targetTime = new Date(nextDue.dueDate).getTime();

    const updateTicker = () => {
      const now = Date.now();
      const diffMs = targetTime - now;
      const isOverdue = diffMs < 0;
      const absMs = Math.abs(diffMs);

      const totalSec = Math.floor(absMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setLiveCountdown({ days, hours, minutes, seconds, isOverdue });
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [scheduleData?.nextDue]);

  // ── Handle Open Pay Modal ───────────────────────────────────────────────────
  const openPayModal = (inst: MonthlyInstallmentItem) => {
    setPayModalInstallment(inst);
    setPayAmount(String(inst.outstandingBalance || inst.expectedAmount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setRefNumber('');
    setNote('');
    setEvidenceFile(null);
    setEvidenceUrl('');
    setEvidencePreview(null);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  // ── File Upload Handler ─────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported formats validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setSubmitError('Invalid file type. Supported formats: PNG, JPG, or PDF.');
      return;
    }

    // Size limit validation (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('File is too large. Maximum file size is 10 MB.');
      return;
    }

    setEvidenceFile(file);
    setUploadingFile(true);
    setSubmitError(null);

    // Create local object URL for preview
    if (file.type.startsWith('image/')) {
      setEvidencePreview(URL.createObjectURL(file));
    } else {
      setEvidencePreview('pdf');
    }

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
      setSubmitError(err.message || 'Failed to upload payment proof document.');
      setEvidenceFile(null);
      setEvidencePreview(null);
    } finally {
      setUploadingFile(false);
    }
  };

  // ── Submit Payment Evidence ─────────────────────────────────────────────────
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInstallment) return;

    if (!evidenceUrl) {
      setSubmitError('Please upload your payment screenshot or proof document.');
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

  // Print Receipt Helper
  const handlePrintReceipt = () => {
    window.print();
  };

  // Status Badge Helper
  const renderStatusBadge = (status: MonthlyInstallmentItem['status']) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald">Fully Paid</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="amber">Pending Verification</Badge>;
      case 'DUE':
        return <Badge variant="info">Due Soon</Badge>;
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
  const installments = scheduleData?.installments ?? [];
  const hasConfig = scheduleData?.hasConfig ?? false;
  const receipts = scheduleData?.receipts ?? [];
  const paymentHistory = scheduleData?.paymentHistory ?? [];

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
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Financials & Tuition
            </h2>
            <Badge variant={scheduleData?.programType === 'TVET' ? 'gold' : 'info'}>
              {scheduleData?.programType === 'TVET' ? 'TVET Program' : 'Short Program'}
            </Badge>
          </div>
          <p className="font-sans text-xs sm:text-sm text-(--text-muted)">
            Enrolled Program: <strong className="text-(--text-primary)">{scheduleData?.programName || profile.major || 'Your Program'}</strong>
            {scheduleData?.programCode ? ` (${scheduleData.programCode})` : ''} · Official monthly fee schedule & verified receipts.
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

      {/* ── LIVE PAYMENT COUNTDOWN & STATUS BANNER (Spec §5) ── */}
      {hasConfig && nextDue ? (
        <div
          className={`relative rounded-2xl overflow-hidden p-6 sm:p-8 border-2 shadow-lg transition-all ${
            liveCountdown?.isOverdue
              ? 'border-(--status-danger) bg-(--status-danger-bg)'
              : nextDue.status === 'PENDING_REVIEW'
              ? 'border-amber-500/50 bg-amber-500/5'
              : 'border-(--brand-gold) bg-(--hover-overlay)'
          }`}
        >
          {/* Subtle gradient glow */}
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-10 ${
              liveCountdown?.isOverdue ? 'bg-rose-500' : 'bg-(--brand-gold)'
            }`}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-md bg-(--card-bg) border border-(--border-default) text-(--brand-gold)"
                >
                  MONTHLY TUITION · {nextDue.monthLabel}
                </span>
                {renderStatusBadge(nextDue.status)}
              </div>

              {/* Countdown Main Display */}
              <div>
                {nextDue.status === 'PAID' ? (
                  <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-emerald-500">
                    Payment Fully Cleared
                  </h1>
                ) : (
                  <div>
                    <h1
                      className={`font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-mono ${
                        liveCountdown?.isOverdue ? 'text-rose-500' : 'text-(--text-primary)'
                      }`}
                    >
                      {liveCountdown ? (
                        liveCountdown.isOverdue ? (
                          <span>
                            {liveCountdown.days}d {liveCountdown.hours}h {liveCountdown.minutes}m {liveCountdown.seconds}s OVERDUE
                          </span>
                        ) : (
                          <span>
                            {liveCountdown.days}d {liveCountdown.hours}h {liveCountdown.minutes}m {liveCountdown.seconds}s
                          </span>
                        )
                      ) : (
                        formatDate(nextDue.dueDate)
                      )}
                    </h1>
                    <p className="font-mono text-xs sm:text-sm font-semibold mt-1.5 text-(--text-secondary)">
                      {liveCountdown?.isOverdue
                        ? '⚠️ The payment deadline has passed and your tuition is overdue. Please transfer and upload proof immediately.'
                        : nextDue.status === 'PENDING_REVIEW'
                        ? '⏳ Proof submitted and currently awaiting Finance Officer verification.'
                        : nextDue.status === 'REJECTED'
                        ? '❌ Your previous submission was rejected. Please review the reason below and submit corrected evidence.'
                        : 'Remaining time until official payment deadline.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Monthly Fee & Outstanding Balance details */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs sm:text-sm font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-(--text-muted)">Monthly Fee:</span>
                  <span className="font-mono font-bold text-base text-(--brand-gold)">
                    {fmtETB(nextDue.expectedAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-(--text-muted)">Paid to Date:</span>
                  <span className="font-mono font-bold text-base text-emerald-500">
                    {fmtETB(nextDue.paidAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-(--text-muted)">Outstanding Balance:</span>
                  <span
                    className={`font-mono font-bold text-base ${
                      nextDue.outstandingBalance! > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {fmtETB(nextDue.outstandingBalance ?? nextDue.expectedAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-(--text-muted)">Deadline:</span>
                  <span className="font-mono font-semibold text-(--text-primary)">
                    {formatDate(nextDue.dueDate)}
                  </span>
                </div>
              </div>

              {/* Rejection Alert if applicable */}
              {nextDue.status === 'REJECTED' && nextDue.latestSubmission?.rejectionReason && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Finance Office Correction Note:
                  </p>
                  <p className="mt-1 font-sans">{nextDue.latestSubmission.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              {nextDue.status === 'PENDING_REVIEW' ? (
                <div className="p-4 rounded-xl text-center space-y-1.5 bg-(--card-bg) border border-(--border-default) min-w-[200px]">
                  <p className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Pending Verification
                  </p>
                  <p className="text-[11px] text-(--text-muted)">
                    Submitted for Finance Officer approval.
                  </p>
                  {nextDue.latestSubmission && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEvidenceModal({ submission: nextDue.latestSubmission!, monthLabel: nextDue.monthLabel })}
                      className="text-[11px] text-(--brand-gold)"
                    >
                      View Submitted Proof
                    </Button>
                  )}
                </div>
              ) : nextDue.status === 'PAID' ? (
                <div className="p-4 rounded-xl text-center space-y-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 min-w-[200px]">
                  <CheckCircle2 className="w-6 h-6 mx-auto" />
                  <p className="text-xs font-bold">Month Cleared</p>
                  {nextDue.receipts?.[0] && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Receipt className="w-3.5 h-3.5 text-(--brand-gold)" />}
                      onClick={() => setReceiptModal(nextDue.receipts[0])}
                    >
                      View Receipt
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  icon={<CreditCard className="w-5 h-5" />}
                  onClick={() => openPayModal(nextDue)}
                  className="shadow-lg"
                >
                  {nextDue.status === 'REJECTED' ? 'Correct & Resubmit Proof' : 'Submit Monthly Payment'}
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
              <h3 className="font-serif font-bold text-base text-(--text-primary)">
                No Active Published Fee Setup
              </h3>
              <p className="text-xs font-sans max-w-2xl leading-relaxed text-(--text-muted)">
                The Finance Office has not yet published a monthly fee for your enrolled program ({scheduleData?.programName || profile.major || 'Your Program'}).
                Draft fee setups are not visible to students. Once published by the Finance Officer, your monthly fee schedule will appear here automatically.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card hoverable={false} className="p-6 text-center border-emerald-500/40 bg-emerald-500/5">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h3 className="font-serif font-bold text-xl text-emerald-500">All Published Fees Paid</h3>
          <p className="text-xs font-sans text-(--text-muted) mt-1">
            You have no outstanding tuition payments for published months.
          </p>
        </Card>
      )}

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card hoverable={false} className="space-y-2 p-5 border border-(--border-default)">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-(--text-faint)">
            Monthly Tuition Fee
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-(--brand-gold)">
            {nextDue ? fmtETB(nextDue.expectedAmount) : hasConfig && installments[0] ? fmtETB(installments[0].expectedAmount) : '—'}
          </h3>
          <p className="text-[11px] font-sans text-(--text-muted)">
            {scheduleData?.programType === 'SHORT_PROGRAM' ? 'Short Program Cohort Rate' : 'TVET Regular Program Rate'}
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2 p-5 border border-(--border-default)">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-(--text-faint)">
            Total Approved Paid
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-500">
            {fmtETB(scheduleData?.totalPaid ?? 0)}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Official Approved Payments</span>
          </div>
        </Card>

        <Card hoverable={false} className="space-y-2 p-5 border border-(--border-default)">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-(--text-faint)">
            Total Outstanding Balance
          </p>
          <h3
            className={`font-serif text-2xl sm:text-3xl font-bold ${
              (scheduleData?.totalOutstanding ?? 0) > 0 ? 'text-rose-500' : 'text-(--text-primary)'
            }`}
          >
            {fmtETB(scheduleData?.totalOutstanding ?? 0)}
          </h3>
          <p className="text-[11px] font-sans text-(--text-muted)">
            Published fees minus approved payments
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2 p-5 border border-(--border-default)">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-(--text-faint)">
            Account Status
          </p>
          <div className="flex items-center gap-2 pt-1">
            {(scheduleData?.totalOutstanding ?? 0) === 0 && installments.length > 0 ? (
              <Badge variant="emerald">Fully Cleared</Badge>
            ) : nextDue?.status === 'PENDING_REVIEW' ? (
              <Badge variant="amber">Pending Verification</Badge>
            ) : nextDue?.status === 'OVERDUE' ? (
              <Badge variant="rose">Payment Overdue</Badge>
            ) : (
              <Badge variant="info">In Good Standing</Badge>
            )}
          </div>
          <p className="text-[11px] font-sans text-(--text-muted)">
            Program: {scheduleData?.programCode || 'Enrolled'}
          </p>
        </Card>
      </div>

      {/* ── SECTION NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-(--border-default) pb-1">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all ${
            activeTab === 'schedule'
              ? 'border-(--brand-gold) text-(--brand-gold)'
              : 'border-transparent text-(--text-muted) hover:text-(--text-primary)'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly Schedule ({installments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-(--brand-gold) text-(--brand-gold)'
              : 'border-transparent text-(--text-muted) hover:text-(--text-primary)'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Payment Submission History ({paymentHistory.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all ${
            activeTab === 'receipts'
              ? 'border-(--brand-gold) text-(--brand-gold)'
              : 'border-transparent text-(--text-muted) hover:text-(--text-primary)'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Approved Receipts ({receipts.length})</span>
        </button>
      </div>

      {/* ── TAB 1: MONTHLY INSTALLMENT SCHEDULE TABLE ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {installments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Monthly Fees Published"
              description="No monthly tuition fees have been published for your enrolled program yet."
            />
          ) : (
            <Card hoverable={false} className="overflow-hidden border border-(--border-default)">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 font-semibold">Billing Month</th>
                      <th className="py-3.5 px-4 font-semibold">Payment Deadline</th>
                      <th className="py-3.5 px-4 font-semibold">Monthly Fee</th>
                      <th className="py-3.5 px-4 font-semibold">Amount Paid</th>
                      <th className="py-3.5 px-4 font-semibold">Outstanding Balance</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {installments.map((inst) => {
                      const latestSub = inst.paymentSubmissions?.[0];
                      const approvedReceipt = inst.receipts?.[0];

                      return (
                        <tr key={inst.id} className="hover:bg-(--hover-overlay) transition-colors">
                          {/* Month */}
                          <td className="py-4 px-4">
                            <p className="font-semibold text-sm text-(--text-primary)">
                              {inst.monthLabel}
                            </p>
                            <span className="text-[11px] font-mono text-(--text-muted)">
                              Month Cycle {inst.monthIndex}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td className="py-4 px-4 font-mono text-(--text-secondary)">
                            {formatDate(inst.dueDate)}
                          </td>

                          {/* Fee Amount */}
                          <td className="py-4 px-4 font-mono font-semibold text-(--text-primary)">
                            {fmtETB(inst.expectedAmount)}
                          </td>

                          {/* Paid Amount */}
                          <td className="py-4 px-4 font-mono font-bold text-emerald-500">
                            {inst.paidAmount > 0 ? fmtETB(inst.paidAmount) : '—'}
                          </td>

                          {/* Outstanding Balance */}
                          <td
                            className={`py-4 px-4 font-mono font-bold ${
                              (inst.outstandingBalance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                            }`}
                          >
                            {fmtETB(inst.outstandingBalance ?? (inst.status === 'PAID' ? 0 : inst.expectedAmount))}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              {renderStatusBadge(inst.status)}
                              {inst.status === 'REJECTED' && latestSub?.rejectionReason && (
                                <p className="text-[10px] text-rose-500 font-sans max-w-xs mt-1">
                                  <strong>Reason:</strong> {latestSub.rejectionReason}
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
                                  icon={<Receipt className="w-3.5 h-3.5 text-(--brand-gold)" />}
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
                                  {inst.status === 'REJECTED' ? 'Correct & Resubmit' : 'Pay Tuition'}
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
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: PAYMENT SUBMISSION HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {paymentHistory.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Payment Submissions Yet"
              description="When you transfer funds and upload proof, your submission history will appear here."
            />
          ) : (
            <Card hoverable={false} className="overflow-hidden border border-(--border-default)">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 font-semibold">Payment Month</th>
                      <th className="py-3.5 px-4 font-semibold">Amount</th>
                      <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                      <th className="py-3.5 px-4 font-semibold">Transaction Reference</th>
                      <th className="py-3.5 px-4 font-semibold">Submission Date</th>
                      <th className="py-3.5 px-4 font-semibold">Status & Note</th>
                      <th className="py-3.5 px-4 text-right">Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {paymentHistory.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-(--text-primary)">
                          {sub.billingLabel || sub.billingMonth}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-(--text-primary)">
                          {fmtETB(sub.amount)}
                        </td>
                        <td className="py-3.5 px-4">{sub.paymentMethod}</td>
                        <td className="py-3.5 px-4 font-mono text-(--brand-gold)">
                          {sub.referenceNumber || 'None'}
                        </td>
                        <td className="py-3.5 px-4 text-(--text-secondary) font-mono">
                          {formatDateTime(sub.createdAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {sub.status === 'APPROVED' && <Badge variant="emerald">Approved</Badge>}
                            {sub.status === 'PENDING_REVIEW' && <Badge variant="amber">Pending Review</Badge>}
                            {sub.status === 'REJECTED' && <Badge variant="rose">Rejected</Badge>}
                            {sub.rejectionReason && (
                              <p className="text-[10px] text-rose-500 font-sans mt-0.5">
                                Reason: {sub.rejectionReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setEvidenceModal({ submission: sub, monthLabel: sub.billingLabel || 'Installment' })}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 3: APPROVED OFFICIAL RECEIPTS ── */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          {receipts.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Official Receipts Issued Yet"
              description="Official receipts are generated and viewable immediately upon approval by the Finance Office."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receipts.map((rec: any) => (
                <Card key={rec.id} hoverable={true} className="p-5 border border-(--border-default) space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      OFFICIAL RECEIPT
                    </span>
                    <span className="text-[11px] font-mono text-(--text-muted)">
                      {formatDate(rec.approvedAt)}
                    </span>
                  </div>

                  <div>
                    <p className="font-mono text-xs text-(--text-muted)">Receipt Number</p>
                    <p className="font-mono font-bold text-sm text-(--text-primary)">{rec.receiptNumber}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-(--border-subtle) pt-2">
                    <div>
                      <p className="text-(--text-muted) text-[11px]">Period</p>
                      <p className="font-semibold text-(--text-primary)">{rec.billingLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-(--text-muted) text-[11px]">Amount Paid</p>
                      <p className="font-mono font-bold text-emerald-500">{fmtETB(rec.amountPaid)}</p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    icon={<Receipt className="w-3.5 h-3.5 text-(--brand-gold)" />}
                    onClick={() => setReceiptModal(rec)}
                  >
                    View Official Printable Receipt
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT PAYMENT EVIDENCE SLIDEPANEL ── */}
      <SlidePanel
        isOpen={!!payModalInstallment}
        side="right"
        onClose={() => {
          if (!submitting) setPayModalInstallment(null);
        }}
        title="Submit Payment for Verification"
        subtitle={payModalInstallment ? `${payModalInstallment.monthLabel} Tuition` : ''}
        width="max-w-md"
      >
        {submitSuccess ? (
          <div className="text-center py-12 space-y-4">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 animate-bounce" />
            <h4 className="font-serif text-2xl font-bold text-(--text-primary)">
              Payment Evidence Submitted!
            </h4>
            <p className="font-sans text-xs max-w-sm mx-auto leading-relaxed text-(--text-secondary)">
              Your payment evidence has been recorded and submitted for Finance Officer verification.
              Your installment status is now <span className="font-semibold text-amber-500">Pending Verification</span>.
            </p>
          </div>
        ) : payModalInstallment ? (
          <form onSubmit={handleSubmitPayment} className="space-y-5 text-xs font-sans">
            {/* Clear Disclaimer: Uploading proof does NOT mean approved */}
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <p className="text-[11px] font-medium">
                Upload proof does not guarantee approval. Finance Office will verify before issuing receipt.
              </p>
            </div>

            {/* Installment Summary Header */}
            <div className="p-4 rounded-xl space-y-2 border border-(--border-default) bg-(--card-bg)">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Applicable Month:</span>
                <span className="font-semibold text-(--text-primary)">{payModalInstallment.monthLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Payment Deadline:</span>
                <span className="font-mono font-semibold">{formatDate(payModalInstallment.dueDate)}</span>
              </div>
              <div className="flex justify-between border-t border-(--border-subtle) pt-2">
                <span className="font-bold text-(--text-primary)">Monthly Fee:</span>
                <span className="font-mono font-bold text-sm text-(--brand-gold)">
                  {fmtETB(payModalInstallment.expectedAmount)}
                </span>
              </div>
            </div>

            {/* Configured Payment Instructions from Finance Officer */}
            <div className="p-3.5 rounded-xl border border-(--brand-gold)/20 bg-(--hover-overlay) space-y-2">
              <p className="font-mono text-[11px] font-bold uppercase text-(--brand-gold) flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Payment Options
              </p>
              <p className="text-xs text-(--text-muted)">
                Include Student ID in memo & upload receipt
              </p>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-3 rounded-lg text-rose-500 bg-rose-500/10 border border-rose-500/20 text-xs">
                {submitError}
              </div>
            )}

            {/* 1. Payment Method Selection */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold text-(--text-muted) block">
                1. Select Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--card-bg) text-(--text-primary) text-xs font-sans outline-none focus:border-(--brand-gold)"
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Amount Input */}
            <Input
              label="2. Amount Paid in ETB"
              type="number"
              step="0.01"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            {/* 3. Payment Date */}
            <Input
              label="3. Transfer Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />

            {/* 4. Transaction Reference */}
            <Input
              label="4. Transaction Reference / Bank Slip Number"
              type="text"
              placeholder="e.g. CBE-FT2609071234 or Telebirr Reference"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
            />

            {/* 5. Proof of Payment Upload */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold text-(--text-muted) block">
                5. Upload Payment Proof (Screenshot or PDF) <span className="text-rose-500">*</span>
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
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  evidenceUrl
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-(--border-default) bg-(--card-bg) hover:border-(--brand-gold)'
                }`}
              >
                {uploadingFile ? (
                  <div className="py-4 space-y-2">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin text-(--brand-gold)" />
                    <p className="text-[11px] font-mono text-(--text-muted)">Uploading file...</p>
                  </div>
                ) : evidenceUrl ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="font-semibold text-emerald-500">{evidenceFile?.name || 'File Uploaded'}</p>
                    <p className="text-[10px] text-(--text-muted)">Click to replace file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-(--brand-gold)" />
                    <p className="font-semibold text-(--text-primary)">
                      Click to upload bank transfer screenshot or slip
                    </p>
                    <p className="text-[10px] text-(--text-muted)">
                      Supports PNG, JPG, or PDF (Max 10 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Preview of Uploaded Evidence */}
              {evidencePreview && (
                <div className="mt-2 p-2 rounded-xl border border-(--border-default) bg-(--hover-overlay)">
                  <p className="text-[10px] font-mono uppercase text-(--text-muted) mb-1.5">
                    File Preview:
                  </p>
                  {evidencePreview === 'pdf' ? (
                    <div className="flex items-center gap-2 p-3 bg-(--card-bg) rounded-lg border border-(--border-default)">
                      <FileText className="w-6 h-6 text-rose-500 shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold truncate text-(--text-primary)">{evidenceFile?.name}</p>
                        <p className="text-[10px] text-(--text-muted)">PDF Document ready to submit</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border border-(--border-default) max-h-48 flex items-center justify-center bg-black/10">
                      <img
                        src={evidencePreview}
                        alt="Proof Preview"
                        className="max-h-48 object-contain w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold text-(--text-muted) block">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special remarks regarding this transaction..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--card-bg) text-(--text-primary) text-xs font-sans outline-none focus:border-(--brand-gold)"
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

      {/* ── SUBMISSION PROOF PREVIEW MODAL ── */}
      <Modal
        isOpen={!!evidenceModal}
        onClose={() => setEvidenceModal(null)}
        title="Submitted Payment Evidence"
        maxWidth="max-w-lg"
      >
        {evidenceModal && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl border border-(--border-default) bg-(--card-bg) space-y-2">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Month:</span>
                <span className="font-semibold text-(--text-primary)">{evidenceModal.monthLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Amount:</span>
                <span className="font-mono font-bold text-emerald-500">{fmtETB(evidenceModal.submission.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Payment Method:</span>
                <span className="text-(--text-primary)">{evidenceModal.submission.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Reference:</span>
                <span className="font-mono text-(--brand-gold)">{evidenceModal.submission.referenceNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Submitted On:</span>
                <span className="font-mono text-(--text-secondary)">{formatDateTime(evidenceModal.submission.createdAt)}</span>
              </div>
              {evidenceModal.submission.rejectionReason && (
                <div className="border-t border-(--border-subtle) pt-2 text-rose-500">
                  <p className="font-bold">Rejection Reason:</p>
                  <p className="mt-0.5">{evidenceModal.submission.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase font-bold text-(--text-muted)">Proof Document</span>
                <a
                  href={evidenceModal.submission.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-(--brand-gold) hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Full File
                </a>
              </div>

              {evidenceModal.submission.evidenceUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="p-8 text-center border border-(--border-default) rounded-xl bg-(--card-bg)">
                  <FileText className="w-10 h-10 mx-auto text-rose-500 mb-2" />
                  <p className="font-semibold">{evidenceModal.submission.evidenceFileName || 'PDF Document'}</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-(--border-default) max-h-80 flex items-center justify-center bg-black/10">
                  <img
                    src={evidenceModal.submission.evidenceUrl}
                    alt="Submitted proof"
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

      {/* ── PRINTABLE OFFICIAL RECEIPT MODAL (Spec §7) ── */}
      <Modal
        isOpen={!!receiptModal}
        onClose={() => setReceiptModal(null)}
        title=""
        maxWidth="max-w-lg"
      >
        {receiptModal && (
          <div className="p-2 space-y-4">
            {/* Printable Receipt Container */}
            <div id="official-receipt-print" className="p-6 rounded-2xl border border-neutral-200 space-y-5 bg-white text-neutral-900 shadow-sm font-sans">
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
                  <p className="text-[10px] font-mono uppercase text-neutral-500">Program / Category</p>
                  <p className="font-semibold text-neutral-900">
                    {scheduleData?.programName || profile.major || 'Academic Program'}
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    {scheduleData?.programType === 'TVET' ? 'TVET Program' : 'Short Program'}
                  </p>
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
                        <p className="font-semibold text-neutral-900">
                          Monthly Tuition — {receiptModal.billingLabel || receiptModal.monthLabel}
                        </p>
                        <p className="text-[10px] text-neutral-500">Payment Channel: {receiptModal.paymentMethod}</p>
                        {receiptModal.referenceNumber && (
                          <p className="text-[10px] font-mono text-neutral-500">
                            TXN Reference: {receiptModal.referenceNumber}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-neutral-900">
                        {fmtETB(receiptModal.amountPaid)}
                      </td>
                    </tr>
                    <tr className="border-t border-neutral-200 bg-neutral-50 font-bold">
                      <td className="py-2.5 px-3 text-neutral-900">Total Paid & Cleared</td>
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
                  <p>Verified By: <span className="font-semibold text-neutral-800">Finance & Bursar Office</span></p>
                  <p>Date: {formatDate(receiptModal.approvedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-700 font-bold">STATUS: OFFICIAL VERIFIED</p>
                  <p className="text-[9px]">Valid without physical signature</p>
                </div>
              </div>
            </div>

            {/* Print and Close Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrintReceipt}
              >
                Print Receipt
              </Button>
              <Button variant="primary" onClick={() => setReceiptModal(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
