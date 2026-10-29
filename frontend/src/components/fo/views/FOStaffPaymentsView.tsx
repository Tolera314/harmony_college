'use client';

/**
 * Finance Officer → Staff Payments View
 * 
 * Manage monthly staff salary payments using HR-assigned salaries
 * Record payments and track financial reporting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Users, Search, X, Calendar, DollarSign, CheckCircle2,
  AlertTriangle, Clock, RefreshCw, Filter, Eye, Download,
  CreditCard, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { SlidePanel } from '../../ui/SlidePanel';
import { fmtETB } from '../FOCharts';

interface StaffPayment {
  id: string;
  employeeId: string;
  payrollMonth: string;
  payrollYear: number;
  assignedSalary: number;
  status: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  transactionReference: string | null;
  notes: string | null;
  paidByName: string | null;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    position: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    departmentId: string;
    department: {
      name: string;
    };
  };
}

interface PayrollSummary {
  totalExpected: number;
  totalPaid: number;
  pendingCount: number;
  paidCount: number;
  failedCount: number;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'PENDING': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'PAID': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'FAILED': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function FOStaffPaymentsView() {
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({ totalExpected: 0, totalPaid: 0, pendingCount: 0, paidCount: 0, failedCount: 0 });
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = MONTHS[new Date().getMonth()];
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail panel
  const [selectedPayment, setSelectedPayment] = useState<StaffPayment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Payment recording form
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, deptsRes] = await Promise.all([
        fetch(`/api/staff-payments?payrollMonth=${selectedMonth}&payrollYear=${selectedYear}&departmentId=${departmentFilter !== 'ALL' ? departmentFilter : ''}&status=${statusFilter !== 'ALL' ? statusFilter : ''}&search=${searchQuery}&page=${page}&limit=50`, {
          credentials: 'include',
        }),
        fetch('/api/staff-payments/api/departments', {
          credentials: 'include',
        }),
      ]);

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
        setSummary(data.summary || { totalExpected: 0, totalPaid: 0, pendingCount: 0, paidCount: 0, failedCount: 0 });
        setTotalPages(data.pagination?.totalPages || 1);
      }

      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('[Staff Payments]', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, departmentFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordPayment = async () => {
    if (!selectedPayment) return;
    if (!paymentDate || !paymentMethod) {
      alert('Payment date and method are required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/staff-payments/${selectedPayment.id}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentDate,
          paymentMethod,
          transactionReference: transactionRef || null,
          notes: paymentNotes || null,
        }),
      });

      if (res.ok) {
        alert('Payment recorded successfully');
        setDetailsOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkFailed = async () => {
    if (!selectedPayment) return;
    const reason = prompt('Enter failure reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/staff-payments/${selectedPayment.id}/mark-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: reason }),
      });

      if (res.ok) {
        alert('Payment marked as failed');
        setDetailsOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to mark payment as failed');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark payment as failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (payment: StaffPayment) => {
    setSelectedPayment(payment);
    setPaymentDate(payment.paymentDate || new Date().toISOString().split('T')[0]);
    setPaymentMethod(payment.paymentMethod || 'Bank Transfer');
    setTransactionRef(payment.transactionReference || '');
    setPaymentNotes(payment.notes || '');
    setDetailsOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('ALL');
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
        title="Staff Payments"
        subtitle="Manage monthly staff salary payments using HR-assigned salaries"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Total Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            ETB {fmtETB(summary.totalPaid)}
          </p>
        </Card>

        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{summary.pendingCount}</p>
        </Card>

        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Paid</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">{summary.paidCount}</p>
        </Card>

        <Card hoverable={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Failed</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400">{summary.failedCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
                <input
                  type="text"
                  placeholder="Search by name or employee code..."
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
              {(searchQuery || departmentFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-hidden"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
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
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
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
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {/* Payments Table */}
      <Card hoverable={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-(--border-subtle)">
              <tr className="bg-(--hover-overlay)">
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Employee</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Department</th>
                <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Salary</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Period</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-(--text-faint)">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-(--text-faint)">
                    No staff payments found for the selected period.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-(--text-primary)">{payment.employee.fullName}</span>
                        <span className="text-xs font-mono text-(--text-faint)">{payment.employee.employeeCode}</span>
                        <span className="text-xs text-(--text-muted)">{payment.employee.position}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-primary)">{payment.employee.department.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#E9C349]">
                      ETB {fmtETB(payment.assignedSalary)}
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-faint)">
                      {payment.payrollMonth} {payment.payrollYear}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="glass"
                        className={`text-[10px] ${statusColors[payment.status]?.text || 'text-zinc-400'}`}
                      >
                        {payment.status}
                      </Badge>
                      {payment.paymentDate && (
                        <p className="text-[10px] text-(--text-faint) mt-1">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => openDetails(payment)}
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

      {/* Payment Details Panel */}
      {selectedPayment && (
        <SlidePanel
          isOpen={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title="Payment Details"
          subtitle={`${selectedPayment.employee.fullName} — ${selectedPayment.payrollMonth} ${selectedPayment.payrollYear}`}
          width="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Employee Info */}
            <Card hoverable={false} className="p-4">
              <h3 className="text-sm font-bold font-sans text-(--text-primary) mb-3">Employee Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-mono uppercase text-(--text-faint)">Employee Code</p>
                  <p className="text-(--text-primary) font-mono">{selectedPayment.employee.employeeCode}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-(--text-faint)">Position</p>
                  <p className="text-(--text-primary)">{selectedPayment.employee.position}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-(--text-faint)">Department</p>
                  <p className="text-(--text-primary)">{selectedPayment.employee.department.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-(--text-faint)">Email</p>
                  <p className="text-(--text-primary) text-xs">{selectedPayment.employee.email}</p>
                </div>
              </div>
            </Card>

            {/* Payment Status */}
            <Card hoverable={false} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold font-sans text-(--text-primary)">Payment Status</h3>
                <Badge
                  variant="glass"
                  className={`${statusColors[selectedPayment.status]?.text || 'text-zinc-400'}`}
                >
                  {selectedPayment.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-mono uppercase text-(--text-faint)">Assigned Salary</p>
                  <p className="text-[#E9C349] font-mono font-bold text-lg">
                    ETB {fmtETB(selectedPayment.assignedSalary)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-(--text-faint)">Period</p>
                  <p className="text-(--text-primary)">{selectedPayment.payrollMonth} {selectedPayment.payrollYear}</p>
                </div>
              </div>

              {selectedPayment.status === 'PAID' && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-emerald-400">Payment Date</p>
                      <p className="text-emerald-400">{selectedPayment.paymentDate ? new Date(selectedPayment.paymentDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase text-emerald-400">Payment Method</p>
                      <p className="text-emerald-400">{selectedPayment.paymentMethod || 'N/A'}</p>
                    </div>
                    {selectedPayment.transactionReference && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-mono uppercase text-emerald-400">Transaction Reference</p>
                        <p className="text-emerald-400 font-mono text-xs">{selectedPayment.transactionReference}</p>
                      </div>
                    )}
                    {selectedPayment.paidByName && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-mono uppercase text-emerald-400">Paid By</p>
                        <p className="text-emerald-400">{selectedPayment.paidByName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.notes && (
                <div className="mt-4 p-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl">
                  <p className="text-[10px] font-mono uppercase text-(--text-faint) mb-1">Notes</p>
                  <p className="text-sm text-(--text-secondary)">{selectedPayment.notes}</p>
                </div>
              )}
            </Card>

            {/* Record Payment Form (only for PENDING status) */}
            {selectedPayment.status === 'PENDING' && (
              <Card hoverable={false} className="p-4">
                <h3 className="text-sm font-bold font-sans text-(--text-primary) mb-4">Record Payment</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono uppercase text-(--text-faint) mb-1 block">Payment Date *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase text-(--text-faint) mb-1 block">Payment Method *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase text-(--text-faint) mb-1 block">Transaction Reference</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Optional transaction ID or reference number"
                      className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm placeholder:text-(--text-faint) focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase text-(--text-faint) mb-1 block">Notes</label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Optional payment notes"
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border bg-(--bg-secondary) border-(--border-default) text-(--text-primary) text-sm placeholder:text-(--text-faint) focus:outline-none focus:ring-2 focus:ring-[#E9C349]/50"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="primary"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={handleRecordPayment}
                      disabled={actionLoading}
                      className="flex-1"
                    >
                      {actionLoading ? 'Recording...' : 'Record Payment'}
                    </Button>
                    <Button
                      variant="outline"
                      icon={<AlertTriangle className="w-3.5 h-3.5" />}
                      onClick={handleMarkFailed}
                      disabled={actionLoading}
                    >
                      Mark Failed
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </SlidePanel>
      )}
    </motion.div>
  );
}
