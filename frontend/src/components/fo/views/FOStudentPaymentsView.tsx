'use client';

/**
 * Finance Officer → Student Payments View
 * 
 * View combining monthly fee tracking and payment management.
 * Summary cards, student payment table, and payment approval workflow.
 * All calculations use real database records - no mock data.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Filter, RefreshCw, ChevronDown, Eye,
  DollarSign, Clock, AlertTriangle, CheckCircle2,
  Calendar, CreditCard, FileText, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { SlidePanel } from '../../ui/SlidePanel';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { FOPageHeader } from '../FOPageHeader';
import { 
  getStudentPayments, 
  getStudentPaymentDetail,
  getStudentPaymentsPrograms,
  approvePaymentSubmission,
  rejectPaymentSubmission 
} from '../../../lib/foApi';
import { fmtETB } from '../FOCharts';

interface StudentPayment {
  id: string;
  studentRecordId: string;
  studentId: string;
  name: string;
  email: string | null;
  phone: string | null;
  programId: string;
  programName: string;
  programCode: string;
  departmentId: string;
  departmentName: string;
  programType: 'TVET' | 'SHORT_PROGRAM';
  monthlyFee: number;
  approvedPaid: number;
  outstanding: number;
  dueDate: Date | null;
  paymentStatus: string;
  hasPendingSubmissions: boolean;
}

interface StudentPaymentDetail {
  student: {
    id: string;
    studentId: string;
    name: string;
    email: string | null;
    phone: string | null;
    programName: string;
    programCode: string;
    departmentName: string;
    programType: string;
  };
  financialSummary: {
    totalExpected: number;
    totalPaid: number;
    totalPending: number;
    outstanding: number;
    accountBalance: number;
  };
  installments: Array<{
    id: string;
    billingMonth: string;
    billingLabel: string;
    expectedAmount: number;
    dueDate: Date;
    status: string;
    paymentInstructions: string | null;
    submissions: Array<{
      id: string;
      amount: number;
      paymentDate: Date;
      paymentMethod: string;
      referenceNumber: string | null;
      evidenceUrl: string;
      evidenceFileName: string | null;
      note: string | null;
      status: string;
      rejectionReason: string | null;
      reviewedAt: Date | null;
      createdAt: Date;
      receipt: any;
    }>;
    receipt: any;
  }>;
  paymentHistory: any[];
  transactions: any[];
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'Paid': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Partial': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Unpaid': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
  'Pending Verification': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Overdue': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

interface FOStudentPaymentsViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

export function FOStudentPaymentsView({ programType: initialProgramType = 'TVET' }: FOStudentPaymentsViewProps) {
  const [programType, setProgramType] = useState<'TVET' | 'SHORT_PROGRAM'>(initialProgramType);
  const [summary, setSummary] = useState({ totalExpected: 0, collected: 0, remaining: 0, awaitingVerification: 0 });
  const [students, setStudents] = useState<StudentPayment[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedProgram, setSelectedProgram] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [studentDetail, setStudentDetail] = useState<StudentPaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setProgramType(initialProgramType);
  }, [initialProgramType]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsData, programsData] = await Promise.all([
        getStudentPayments({
          programType,
          billingMonth: selectedMonth || undefined,
          billingYear: selectedYear || undefined,
          programId: selectedProgram || undefined,
          paymentStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery || undefined,
          page,
          limit: 50,
        }),
        getStudentPaymentsPrograms(programType),
      ]);

      setSummary(paymentsData.summary || { totalExpected: 0, collected: 0, remaining: 0, awaitingVerification: 0 });
      setStudents(paymentsData.students || []);
      setPrograms(programsData || []);
      setTotalPages(paymentsData.pagination?.totalPages || 1);
    } catch (err) {
      console.error('[Student Payments]', err);
    } finally {
      setLoading(false);
    }
  }, [programType, selectedMonth, selectedYear, selectedProgram, statusFilter, searchQuery, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetails = async (studentRecordId: string) => {
    setSelectedStudent(studentRecordId);
    setDetailsOpen(true);
    setDetailLoading(true);
    try {
      const data = await getStudentPaymentDetail(studentRecordId);
      setStudentDetail(data);
    } catch (err) {
      console.error('[Student Details]', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedStudent(null);
    setStudentDetail(null);
  };

  const handleApprove = async (submissionId: string) => {
    if (!confirm('Approve this payment submission?')) return;
    setActionLoading(true);
    try {
      await approvePaymentSubmission(submissionId);
      await loadData();
      if (selectedStudent) {
        const data = await getStudentPaymentDetail(selectedStudent);
        setStudentDetail(data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (submissionId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason || !reason.trim()) return;
    setActionLoading(true);
    try {
      await rejectPaymentSubmission(submissionId, reason.trim());
      await loadData();
      if (selectedStudent) {
        const data = await getStudentPaymentDetail(selectedStudent);
        setStudentDetail(data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMonth('');
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedProgram('');
    setStatusFilter('ALL');
    setPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 pb-16"
    >
      <FOPageHeader
        title="Student Payments"
        subtitle="Monitor monthly fee payments, review submissions, and track balances"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Total Expected</span>
            <DollarSign className="w-4 h-4 text-[#E9C349]" />
          </div>
          <p className="text-2xl font-bold font-mono text-(--text-primary)">
            ETB {fmtETB(summary.totalExpected)}
          </p>
        </Card>

        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            ETB {fmtETB(summary.collected)}
          </p>
        </Card>

        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Remaining</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">
            ETB {fmtETB(summary.remaining)}
          </p>
        </Card>

        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Awaiting Review</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400">
            {summary.awaitingVerification}
          </p>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-10 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm placeholder:text-(--text-faint) focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-primary)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                icon={<Filter className="w-3.5 h-3.5" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              {(selectedMonth || selectedProgram || statusFilter !== 'ALL' || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                  >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => { setSelectedProgram(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                  >
                    <option value="">All Programs</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Pending">Pending Verification</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Student Table */}
      <Card hoverable={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-(--border-subtle)">
              <tr className="bg-(--hover-overlay)">
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Student</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Program</th>
                <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Monthly Fee</th>
                <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Approved</th>
                <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Outstanding</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Due Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-(--text-faint)">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-(--text-faint)">
                    No students found matching filters
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-(--text-primary)">{student.name}</span>
                        <span className="text-xs font-mono text-(--text-faint)">{student.studentId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-(--text-primary)">{student.programName}</span>
                        <Badge variant="glass" className="w-fit text-[10px] mt-1">
                          {student.programType === 'TVET' ? '🎓 TVET' : '⏱ Short Program'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-(--text-primary)">
                      ETB {fmtETB(student.monthlyFee)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-emerald-400">
                      ETB {fmtETB(student.approvedPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-amber-400">
                      ETB {fmtETB(student.outstanding)}
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-faint)">
                      {student.dueDate ? new Date(student.dueDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="glass"
                        className={`text-[10px] ${statusColors[student.paymentStatus]?.text || 'text-zinc-400'}`}
                      >
                        {student.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => openDetails(student.studentRecordId)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-subtle)">
            <p className="text-xs text-(--text-faint)">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Student Payment Details Panel */}
      <SlidePanel
        isOpen={detailsOpen}
        onClose={closeDetails}
        title="Student Payment Details"
        subtitle="Review payment history and approve submissions"
        width="max-w-3xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-(--brand-gold)" />
          </div>
        ) : studentDetail ? (
          <div className="space-y-6">
            {/* Student Info */}
            <Card hoverable={false} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-(--text-primary)">{studentDetail.student.name}</h3>
                  <p className="text-sm text-(--text-faint) font-mono mt-1">
                    {studentDetail.student.studentId} · {studentDetail.student.programName}
                  </p>
                </div>
                <Badge variant="glass">
                  {studentDetail.student.programType === 'TVET' ? '🎓 TVET' : '⏱ Short Program'}
                </Badge>
              </div>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card hoverable={false} className="p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint) mb-1">Expected</p>
                <p className="text-lg font-bold font-mono text-(--text-primary)">
                  ETB {fmtETB(studentDetail.financialSummary.totalExpected)}
                </p>
              </Card>
              <Card hoverable={false} className="p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint) mb-1">Paid</p>
                <p className="text-lg font-bold font-mono text-emerald-400">
                  ETB {fmtETB(studentDetail.financialSummary.totalPaid)}
                </p>
              </Card>
              <Card hoverable={false} className="p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint) mb-1">Pending</p>
                <p className="text-lg font-bold font-mono text-blue-400">
                  ETB {fmtETB(studentDetail.financialSummary.totalPending)}
                </p>
              </Card>
              <Card hoverable={false} className="p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint) mb-1">Outstanding</p>
                <p className="text-lg font-bold font-mono text-amber-400">
                  ETB {fmtETB(studentDetail.financialSummary.outstanding)}
                </p>
              </Card>
            </div>

            {/* Installments & Submissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold font-sans text-(--text-primary)">Payment Submissions</h4>
              {studentDetail.installments.map((installment) => (
                <Card key={installment.id} hoverable={false} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="text-sm font-bold text-(--text-primary)">{installment.billingLabel}</h5>
                      <p className="text-xs text-(--text-faint) mt-1">
                        Expected: ETB {fmtETB(installment.expectedAmount)} · 
                        Due: {new Date(installment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={installment.status === 'PAID' ? 'emerald' : 'amber'}>
                      {installment.status}
                    </Badge>
                  </div>

                  {installment.submissions.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {installment.submissions.map((submission) => (
                        <div
                          key={submission.id}
                          className={`p-3 rounded-xl border ${
                            submission.status === 'PENDING_REVIEW'
                              ? 'border-blue-500/30 bg-blue-500/5'
                              : submission.status === 'APPROVED'
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-rose-500/30 bg-rose-500/5'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-(--text-primary)">
                                ETB {fmtETB(submission.amount)} · {submission.paymentMethod}
                              </p>
                              <p className="text-xs text-(--text-faint) mt-0.5">
                                {submission.referenceNumber || 'No reference'} · 
                                Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                              </p>
                              {submission.note && (
                                <p className="text-xs text-(--text-secondary) mt-1 italic">{submission.note}</p>
                              )}
                            </div>
                            <Badge variant={submission.status === 'PENDING_REVIEW' ? 'amber' : submission.status === 'APPROVED' ? 'emerald' : 'rose'}>
                              {submission.status}
                            </Badge>
                          </div>

                          {submission.evidenceUrl && (
                            <a
                              href={submission.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#E9C349] hover:underline flex items-center gap-1 mt-2"
                            >
                              <FileText className="w-3 h-3" />
                              View Payment Proof
                            </a>
                          )}

                          {submission.rejectionReason && (
                            <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                              <p className="text-xs text-rose-400">
                                <strong>Rejected:</strong> {submission.rejectionReason}
                              </p>
                            </div>
                          )}

                          {submission.status === 'PENDING_REVIEW' && (
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleApprove(submission.id)}
                                disabled={actionLoading}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<X className="w-3.5 h-3.5" />}
                                onClick={() => handleReject(submission.id)}
                                disabled={actionLoading}
                              >
                                Reject
                              </Button>
                            </div>
                          )}

                          {submission.receipt && (
                            <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <p className="text-xs text-emerald-400">
                                <strong>Receipt:</strong> {submission.receipt.receiptNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {installment.receipt && installment.submissions.length === 0 && (
                    <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-emerald-400">
                        <strong>Receipt:</strong> {installment.receipt.receiptNumber} · 
                        Paid: ETB {fmtETB(installment.receipt.amountPaid || 0)}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Payment History */}
            {studentDetail.paymentHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold font-sans text-(--text-primary)">Payment History</h4>
                <Card hoverable={false} className="p-4">
                  <div className="space-y-2">
                    {studentDetail.paymentHistory.map((receipt: any) => (
                      <div key={receipt.id} className="flex items-center justify-between p-2 rounded-lg bg-(--hover-overlay)">
                        <div>
                          <p className="text-xs font-semibold text-(--text-primary)">{receipt.receiptNumber}</p>
                          <p className="text-xs text-(--text-faint) mt-0.5">
                            {receipt.billingLabel} · {new Date(receipt.approvedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-xs font-mono font-bold text-emerald-400">
                          ETB {fmtETB(receipt.amountPaid)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-(--text-faint)">
            No details available
          </div>
        )}
      </SlidePanel>
    </motion.div>
  );
}
