'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Users2, Search, RefreshCw, ChevronLeft, ChevronRight, Eye,
  Plus, Send, CheckCircle2, XCircle, AlertTriangle, FileText,
  User, Calendar, Mail, UserCheck, Check, Clock, Undo2, Lock
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import {
  SkeletonCard, SkeletonTable, EmptyState, ErrorState,
  InlineError, useToast, ToastContainer
} from '../../ui/States';
import {
  hrEmployeesApi, hrLeaveApi, hrPayrollApi, hrDepartmentsApi,
  HREmployeeApi, HRLeaveRequestApi, HRPayrollRecordApi, HRDepartmentApi,
  EMPLOYMENT_TYPE_LABEL, CONTRACT_STATUS_LABEL, EMPLOYEE_STATUS_LABEL,
  LEAVE_TYPE_LABEL, LEAVE_STATUS_LABEL, PAYROLL_STAGE_LABEL
} from '../../../lib/hrApi';
import {
  adminInvitationsApi, ApiStaffInvitation, adminDepartmentsApi, ApiDepartment
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function fmtETB(amount: number) {
  return `ETB ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminHRView: React.FC = () => {
  const [tab, setTab] = useState<'employees' | 'invitations' | 'leave' | 'payroll'>('employees');

  // Summary / Stats
  const [employeesTotal, setEmployeesTotal] = useState(0);
  const [activeEmpCount, setActiveEmpCount] = useState(0);
  const [onLeaveCount, setOnLeaveCount]     = useState(0);
  const [statsLoading, setStatsLoading]     = useState(true);

  // Departments List
  const [hrDepartments, setHrDepartments] = useState<HRDepartmentApi[]>([]);
  const [acadDepartments, setAcadDepartments] = useState<ApiDepartment[]>([]);

  // ── Tab 1: Employee Directory State
  const [employees, setEmployees]         = useState<HREmployeeApi[]>([]);
  const [empPage, setEmpPage]             = useState(1);
  const [empPages, setEmpPages]           = useState(1);
  const [empLoading, setEmpLoading]       = useState(false);
  const [empError, setEmpError]           = useState('');
  const [search, setSearch]               = useState('');
  const [deptFilter, setDeptFilter]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Tab 2: Staff Invitations State
  const [invitations, setInvitations]     = useState<ApiStaffInvitation[]>([]);
  const [invTotal, setInvTotal]           = useState(0);
  const [invLoading, setInvLoading]       = useState(false);
  const [invError, setInvError]           = useState('');
  const [inviteOpen, setInviteOpen]       = useState(false);
  const [inviteName, setInviteName]       = useState('');
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteRole, setInviteRole]       = useState('INSTRUCTOR');
  const [inviteDeptId, setInviteDeptId]   = useState('');
  const [inviteTitle, setInviteTitle]     = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError]     = useState('');

  // ── Tab 3: Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState<HRLeaveRequestApi[]>([]);
  const [leaveTotal, setLeaveTotal]       = useState(0);
  const [leaveLoading, setLeaveLoading]   = useState(false);
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('PENDING');
  const [reviewLeave, setReviewLeave]     = useState<HRLeaveRequestApi | null>(null);
  const [reviewAction, setReviewAction]   = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ── Tab 4: Payroll Ledger State
  const [payrolls, setPayrolls]           = useState<HRPayrollRecordApi[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<HRPayrollRecordApi | null>(null);
  const [approvePayrollObj, setApprovePayrollObj] = useState<HRPayrollRecordApi | null>(null);
  const [approvePayrollComment, setApprovePayrollComment] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // Employee Detail Drawer
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeDetail, setEmployeeDetail]         = useState<HREmployeeApi | null>(null);
  const [empDetailLoading, setEmpDetailLoading]     = useState(false);

  // Create Employee Modal
  const [createEmpOpen, setCreateEmpOpen] = useState(false);
  const [newEmpCode, setNewEmpCode]       = useState('');
  const [newEmpName, setNewEmpName]       = useState('');
  const [newEmpEmail, setNewEmpEmail]     = useState('');
  const [newEmpPhone, setNewEmpPhone]     = useState('');
  const [newEmpPos, setNewEmpPos]         = useState('');
  const [newEmpDept, setNewEmpDept]       = useState('');
  const [newEmpGender, setNewEmpGender]   = useState<any>('MALE');
  const [newEmpType, setNewEmpType]       = useState<any>('FULL_TIME');
  const [newEmpSalary, setNewEmpSalary]   = useState('15000');
  const [newEmpHireDate, setNewEmpHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createEmpError, setCreateEmpError]   = useState('');

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Load Departments & Stats Reference Data
  const fetchReferenceData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [hrDepts, acadDepts] = await Promise.all([
        hrDepartmentsApi.list(),
        adminDepartmentsApi.list(),
      ]);
      setHrDepartments(hrDepts);
      setAcadDepartments(acadDepts.filter(d => d.isActive));
    } catch {
      // Graceful fallback
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchReferenceData(); }, [fetchReferenceData]);

  // ── Fetch Employees
  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true); setEmpError('');
    try {
      const res = await hrEmployeesApi.list({
        page: empPage,
        limit: 12,
        search,
        departmentId: deptFilter || undefined,
        status: statusFilter || undefined,
        employmentType: typeFilter || undefined,
      });
      setEmployees(res.employees);
      setEmployeesTotal(res.total);
      setEmpPages(res.totalPages);

      // Compute status counts for KPIs
      const active = res.employees.filter(e => e.status === 'ACTIVE').length;
      const leave  = res.employees.filter(e => e.status === 'ON_LEAVE').length;
      setActiveEmpCount(active);
      setOnLeaveCount(leave);
    } catch (e: any) {
      setEmpError(e.message ?? 'Failed to load employees');
    } finally {
      setEmpLoading(false);
    }
  }, [empPage, search, deptFilter, statusFilter, typeFilter]);

  useEffect(() => {
    if (tab === 'employees') {
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => fetchEmployees(), 280);
    }
  }, [tab, empPage, search, deptFilter, statusFilter, typeFilter, fetchEmployees]);

  // ── Fetch Staff Invitations
  const fetchInvitations = useCallback(async () => {
    setInvLoading(true); setInvError('');
    try {
      const res = await adminInvitationsApi.list({ limit: 50 });
      setInvitations(res.invitations);
      setInvTotal(res.total);
    } catch (e: any) {
      setInvError(e.message ?? 'Failed to load staff invitations');
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'invitations') fetchInvitations();
  }, [tab, fetchInvitations]);

  // ── Fetch Leave Requests
  const fetchLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await hrLeaveApi.list({ status: leaveFilterStatus || undefined, limit: 50 });
      setLeaveRequests(res.requests);
      setLeaveTotal(res.total);
    } catch {
      showToast('Failed to load leave requests', 'error');
    } finally {
      setLeaveLoading(false);
    }
  }, [leaveFilterStatus, showToast]);

  useEffect(() => {
    if (tab === 'leave') fetchLeaveRequests();
  }, [tab, leaveFilterStatus, fetchLeaveRequests]);

  // ── Fetch Payroll Records
  const fetchPayroll = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const records = await hrPayrollApi.list();
      setPayrolls(records);
    } catch {
      showToast('Failed to load payroll batches', 'error');
    } finally {
      setPayrollLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (tab === 'payroll') fetchPayroll();
  }, [tab, fetchPayroll]);

  // ── Submit New Staff Invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !inviteDeptId) {
      setInviteError('Name, email, and department are required');
      return;
    }

    setInviteError(''); setInviteSubmitting(true);
    try {
      const res = await adminInvitationsApi.create({
        fullName: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        departmentId: inviteDeptId,
        positionTitle: inviteTitle.trim() || undefined,
      });
      showToast(res.message || `Invitation sent to ${inviteEmail}`, 'success');
      setInviteOpen(false); setInviteName(''); setInviteEmail(''); setInviteTitle('');
      fetchInvitations();
    } catch (err: any) {
      setInviteError(err.message ?? 'Failed to send staff invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // ── Handle Review Leave Request
  const handleReviewLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewLeave) return;
    setReviewSubmitting(true);
    try {
      await hrLeaveApi.review(reviewLeave.id, { action: reviewAction, comment: reviewComment.trim() || undefined });
      showToast(`Leave request ${reviewAction.toLowerCase()}!`, 'success');
      setReviewLeave(null); setReviewComment('');
      fetchLeaveRequests();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to update leave request', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Handle Approve Payroll Batch
  const handleApprovePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvePayrollObj) return;
    setApproveSubmitting(true);
    try {
      await hrPayrollApi.approve(approvePayrollObj.id, approvePayrollComment.trim() || undefined);
      showToast(`Payroll batch for ${approvePayrollObj.month} ${approvePayrollObj.year} approved!`, 'success');
      setApprovePayrollObj(null); setApprovePayrollComment('');
      fetchPayroll();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to approve payroll batch', 'error');
    } finally {
      setApproveSubmitting(false);
    }
  };

  // ── Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpCode || !newEmpName || !newEmpEmail || !newEmpPos || !newEmpDept) {
      setCreateEmpError('Code, name, email, position, and department are required');
      return;
    }

    setCreateEmpError(''); setCreateSubmitting(true);
    try {
      await hrEmployeesApi.create({
        employeeCode: newEmpCode.trim(),
        fullName: newEmpName.trim(),
        email: newEmpEmail.trim(),
        phone: newEmpPhone.trim() || undefined,
        position: newEmpPos.trim(),
        departmentId: newEmpDept,
        gender: newEmpGender,
        employmentType: newEmpType,
        basicSalary: parseFloat(newEmpSalary) || 0,
        allowances: 0,
        deductions: 0,
        hireDate: newEmpHireDate,
      });
      showToast(`Employee record created for ${newEmpName}!`, 'success');
      setCreateEmpOpen(false); setNewEmpCode(''); setNewEmpName(''); setNewEmpEmail(''); setNewEmpPos('');
      fetchEmployees();
    } catch (err: any) {
      setCreateEmpError(err.message ?? 'Failed to create employee record');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Open Employee Detail Drawer
  const openEmployeeDetail = async (empId: string) => {
    setSelectedEmployeeId(empId); setEmpDetailLoading(true); setEmployeeDetail(null);
    try {
      const full = await hrEmployeesApi.getFullById(empId);
      setEmployeeDetail(full);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load employee details', 'error');
      setSelectedEmployeeId(null);
    } finally {
      setEmpDetailLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Human Resources Management"
        subtitle="Staff directory, staff invitations, leave approvals, and payroll administration"
        icon={<Users2 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateEmpOpen(true)}>
              Add Employee
            </Button>
            <Button variant="ghost" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>
              Invite Staff
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { if (tab === 'employees') fetchEmployees(); if (tab === 'invitations') fetchInvitations(); if (tab === 'leave') fetchLeaveRequests(); if (tab === 'payroll') fetchPayroll(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKPI label="Total Staff & Faculty" value={employeesTotal || employees.length} color="text-(--brand-gold)" />
        <MiniKPI label="Active Employees"      value={activeEmpCount || employees.length} color="text-(--status-success)" />
        <MiniKPI label="Employees On Leave"    value={onLeaveCount}                      color="text-(--status-info)" />
        <MiniKPI label="Pending Invitations"  value={invTotal}                          color="text-(--status-warning)" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-(--border-default) gap-6 font-sans text-xs overflow-x-auto">
        <button
          onClick={() => setTab('employees')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'employees' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          👥 Employee Directory ({employeesTotal})
          {tab === 'employees' && <motion.div layoutId="hrTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('invitations')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'invitations' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          ✉️ Staff Invitations ({invTotal})
          {tab === 'invitations' && <motion.div layoutId="hrTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('leave')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'leave' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          🏖️ Leave Requests ({leaveTotal})
          {tab === 'leave' && <motion.div layoutId="hrTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setTab('payroll')}
          className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${tab === 'payroll' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          💵 Payroll Batches
          {tab === 'payroll' && <motion.div layoutId="hrTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search by employee name, code, position, email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setEmpPage(1); }}
              />
            </div>
            <select
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setEmpPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Departments</option>
              {hrDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setEmpPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Employment Types</option>
              <option value="FULL_TIME">Full-Time</option>
              <option value="PART_TIME">Part-Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setEmpPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {empLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : empError ? (
            <ErrorState compact description={empError} onRetry={fetchEmployees} />
          ) : employees.length === 0 ? (
            <EmptyState variant="employees" compact description="No employee records match your filter criteria." />
          ) : (
            <>
              <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
                <table className="w-full text-left text-xs font-sans min-w-[800px]">
                  <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                    <tr>
                      {['Employee', 'Code', 'Position / Dept', 'Employment Type', 'Status', 'Hire Date', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">
                          <button onClick={() => openEmployeeDetail(emp.id)} className="hover:underline text-(--brand-gold) text-left font-medium">
                            {emp.fullName}
                          </button>
                          <span className="block text-[11px] text-(--text-muted)">{emp.email}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{emp.employeeCode}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-(--text-primary)">{emp.position}</span>
                          <span className="block text-[11px] text-(--text-muted)">{emp.department?.name ?? 'General'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="glass">{EMPLOYMENT_TYPE_LABEL[emp.employmentType] ?? emp.employmentType}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${emp.status === 'ACTIVE' ? 'bg-(--status-success-bg) text-(--status-success)' : emp.status === 'ON_LEAVE' ? 'bg-(--status-info-bg) text-(--status-info)' : 'bg-(--status-danger-bg) text-(--status-danger)'}`}>
                            {EMPLOYEE_STATUS_LABEL[emp.status] ?? emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                          {formatDate(emp.hireDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => openEmployeeDetail(emp.id)}>
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-sans text-(--text-muted)">
                  Showing {employees.length} of {employeesTotal} employees (Page {empPage} of {empPages})
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={empPage <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setEmpPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={empPage >= empPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setEmpPage(p => Math.min(empPages, p + 1))}>Next</Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: STAFF INVITATIONS */}
      {tab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Staff Onboarding & Role Invitations</h3>
            <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>
              New Staff Invitation
            </Button>
          </div>

          {invLoading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : invError ? (
            <ErrorState compact description={invError} onRetry={fetchInvitations} />
          ) : invitations.length === 0 ? (
            <EmptyState variant="employees" compact description="No active staff invitations. Click 'New Staff Invitation' to invite Instructors, Department Heads, Registrars, or HR Officers." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
              <table className="w-full text-left text-xs font-sans min-w-[750px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Invited Staff', 'Role', 'Department', 'Status', 'Sent Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {invitations.map(inv => (
                    <tr key={inv.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-semibold text-(--text-primary)">
                        {inv.fullName}
                        <span className="block text-[11px] text-(--text-muted)">{inv.email}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-(--brand-gold)">{inv.role}</td>
                      <td className="px-4 py-3 text-(--text-secondary)">{inv.department?.name ?? 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${inv.status === 'PENDING' ? 'bg-(--status-warning-bg) text-(--status-warning)' : inv.status === 'ACCEPTED' ? 'bg-(--status-success-bg) text-(--status-success)' : 'bg-(--status-danger-bg) text-(--status-danger)'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatDate(inv.createdAt)}</td>
                      <td className="px-4 py-3">
                        {inv.status === 'PENDING' && (
                          <Button variant="ghost" size="sm" icon={<Mail className="w-3.5 h-3.5 text-(--brand-gold)" />} onClick={async () => {
                            try {
                              await adminInvitationsApi.resend(inv.id);
                              showToast(`Resent invitation to ${inv.email}`, 'success');
                            } catch (e: any) {
                              showToast(e.message ?? 'Failed to resend', 'error');
                            }
                          }}>
                            Resend Email
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEAVE REQUESTS */}
      {tab === 'leave' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <span className="text-xs font-mono text-(--text-muted)">Status Filter:</span>
            <select
              value={leaveFilterStatus}
              onChange={e => setLeaveFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="PENDING">PENDING REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="All">All Requests</option>
            </select>
          </div>

          {leaveLoading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : leaveRequests.length === 0 ? (
            <EmptyState variant="leaves" compact description="No leave requests match the selected status." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
              <table className="w-full text-left text-xs font-sans min-w-[800px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Employee', 'Leave Type', 'Duration', 'Reason', 'Status', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {leaveRequests.map(req => (
                    <tr key={req.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-semibold text-(--text-primary)">
                        {req.employee?.fullName ?? 'Employee'}
                        <span className="block text-[11px] text-(--text-muted)">{req.employee?.employeeCode ?? ''} · {req.employee?.position ?? ''}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="gold">{LEAVE_TYPE_LABEL[req.leaveType] ?? req.leaveType}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">
                        {formatDate(req.startDate)} – {formatDate(req.endDate)} ({req.daysCount} days)
                      </td>
                      <td className="px-4 py-3 text-(--text-secondary) max-w-[220px] truncate">{req.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${req.status === 'PENDING' ? 'bg-(--status-warning-bg) text-(--status-warning)' : req.status === 'APPROVED' ? 'bg-(--status-success-bg) text-(--status-success)' : 'bg-(--status-danger-bg) text-(--status-danger)'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatDate(req.submittedAt)}</td>
                      <td className="px-4 py-3">
                        {req.status === 'PENDING' ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--status-success)" />} onClick={() => { setReviewLeave(req); setReviewAction('APPROVED'); }}>
                              Approve
                            </Button>
                            <Button variant="ghost" size="sm" icon={<XCircle className="w-3.5 h-3.5 text-(--status-danger)" />} onClick={() => { setReviewLeave(req); setReviewAction('REJECTED'); }}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-(--text-muted)">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYROLL BATCHES */}
      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Institutional Payroll Batches</h3>
          </div>

          {payrollLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : payrolls.length === 0 ? (
            <EmptyState variant="payroll" compact description="No payroll batches found." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
              <table className="w-full text-left text-xs font-sans min-w-[750px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Period', 'Employees', 'Gross Payroll', 'Net Payroll', 'Stage', 'Generated', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {payrolls.map(pay => (
                    <tr key={pay.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-serif font-bold text-sm text-(--text-primary)">
                        {pay.month} {pay.year}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{pay.employeeCount} staff</td>
                      <td className="px-4 py-3 font-mono font-bold text-(--text-primary)">{fmtETB(pay.totalGross)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-(--status-success)">{fmtETB(pay.totalNet)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${pay.stage === 'APPROVED' || pay.stage === 'LOCKED' ? 'bg-(--status-success-bg) text-(--status-success)' : 'bg-(--status-warning-bg) text-(--status-warning)'}`}>
                          {PAYROLL_STAGE_LABEL[pay.stage] ?? pay.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatDate(pay.generatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={async () => {
                            try {
                              const full = await hrPayrollApi.getById(pay.id);
                              setSelectedPayroll(full);
                            } catch {
                              showToast('Failed to load payslips', 'error');
                            }
                          }}>
                            Payslips
                          </Button>
                          {pay.stage === 'PENDING_HR_APPROVAL' && (
                            <Button variant="primary" size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => setApprovePayrollObj(pay)}>
                              Approve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      <Modal isOpen={createEmpOpen} onClose={() => setCreateEmpOpen(false)} title="Create Employee Profile">
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          {createEmpError && <InlineError message={createEmpError} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Employee Code</label>
              <Input placeholder="e.g. HC-FAC-0089" value={newEmpCode} onChange={e => setNewEmpCode(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Full Name</label>
              <Input placeholder="e.g. Dr. Abebe Bikila" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Email Address</label>
              <Input type="email" placeholder="abebe@harmony.edu.et" value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Phone Number</label>
              <Input placeholder="+251 91 123 4567" value={newEmpPhone} onChange={e => setNewEmpPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Position Title</label>
              <Input placeholder="e.g. Assistant Professor" value={newEmpPos} onChange={e => setNewEmpPos(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">HR Department</label>
              <select
                value={newEmpDept}
                onChange={e => setNewEmpDept(e.target.value)}
                className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                required
              >
                <option value="">-- Select Department --</option>
                {hrDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Gender</label>
              <select value={newEmpGender} onChange={e => setNewEmpGender(e.target.value as any)} className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary)">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Employment Type</label>
              <select value={newEmpType} onChange={e => setNewEmpType(e.target.value as any)} className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary)">
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Basic Salary (ETB)</label>
              <Input type="number" value={newEmpSalary} onChange={e => setNewEmpSalary(e.target.value)} required />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-(--border-subtle)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreateEmpOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={createSubmitting}>Create Employee</Button>
          </div>
        </form>
      </Modal>

      {/* NEW STAFF INVITATION MODAL */}
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Issue Staff Invitation">
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteError && <InlineError message={inviteError} />}

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Full Name</label>
            <Input placeholder="e.g. Dr. Almaz Worku" value={inviteName} onChange={e => setInviteName(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Email Address</label>
            <Input type="email" placeholder="almaz@harmony.edu.et" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Staff Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary)">
                <option value="INSTRUCTOR">Instructor / Lecturer</option>
                <option value="DEPARTMENT_HEAD">Department Head (HoD)</option>
                <option value="REGISTRAR">Registrar Officer</option>
                <option value="HR_OFFICER">HR Officer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Academic Department</label>
              <select value={inviteDeptId} onChange={e => setInviteDeptId(e.target.value)} className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary)" required>
                <option value="">-- Choose Department --</option>
                {acadDepartments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Position Title (Optional)</label>
            <Input placeholder="e.g. Associate Professor of Computer Science" value={inviteTitle} onChange={e => setInviteTitle(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={inviteSubmitting}>Send Staff Invitation</Button>
          </div>
        </form>
      </Modal>

      {/* LEAVE REVIEW MODAL */}
      <Modal isOpen={Boolean(reviewLeave)} onClose={() => setReviewLeave(null)} title={`Review Leave Request (${reviewAction})`}>
        {reviewLeave && (
          <form onSubmit={handleReviewLeaveSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs font-sans">
              <p className="font-semibold text-(--text-primary)">{reviewLeave.employee?.fullName ?? 'Employee'}</p>
              <p className="text-(--text-muted)">{reviewLeave.leaveType} leave ({reviewLeave.daysCount} days) from {formatDate(reviewLeave.startDate)} to {formatDate(reviewLeave.endDate)}</p>
              <p className="mt-1 text-(--text-secondary)">Reason: {reviewLeave.reason}</p>
            </div>

            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Reviewer Comment</label>
              <Input placeholder="e.g. Approved as per department coverage schedule..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setReviewLeave(null)}>Cancel</Button>
              <Button type="submit" variant={reviewAction === 'APPROVED' ? 'primary' : 'danger'} size="sm" disabled={reviewSubmitting}>
                Confirm {reviewAction}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* APPROVE PAYROLL MODAL */}
      <Modal isOpen={Boolean(approvePayrollObj)} onClose={() => setApprovePayrollObj(null)} title="Approve Payroll Batch">
        {approvePayrollObj && (
          <form onSubmit={handleApprovePayrollSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs font-sans">
              <p className="font-serif font-bold text-sm text-(--text-primary)">{approvePayrollObj.month} {approvePayrollObj.year} Payroll</p>
              <p className="font-mono text-(--text-muted)">Total Employees: {approvePayrollObj.employeeCount} · Net Payroll: {fmtETB(approvePayrollObj.totalNet)}</p>
            </div>

            <div>
              <label className="block text-xs font-sans text-(--text-muted) mb-1">Approval Comment (Optional)</label>
              <Input placeholder="e.g. Audited and verified by Admin..." value={approvePayrollComment} onChange={e => setApprovePayrollComment(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setApprovePayrollObj(null)}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" disabled={approveSubmitting}>Approve Payroll</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* PAYSLIPS DRAWER */}
      <SlidePanel isOpen={Boolean(selectedPayroll)} onClose={() => setSelectedPayroll(null)} title={`Payslips — ${selectedPayroll?.month} ${selectedPayroll?.year}`}>
        {selectedPayroll && (
          <div className="space-y-4 p-1">
            <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex justify-between items-center text-xs font-sans">
              <div>
                <p className="font-bold text-(--text-primary)">Total Gross: {fmtETB(selectedPayroll.totalGross)}</p>
                <p className="text-(--status-success) font-bold">Total Net: {fmtETB(selectedPayroll.totalNet)}</p>
              </div>
              <Badge variant="gold">{selectedPayroll.stage}</Badge>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {selectedPayroll.payslips?.map(ps => (
                <div key={ps.id} className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) text-xs font-sans space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-(--text-primary)">{ps.employee?.fullName ?? 'Employee'}</span>
                    <span className="font-mono text-(--status-success)">Net: {fmtETB(ps.netSalary)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-(--text-muted) font-mono">
                    <span>Basic: {fmtETB(ps.basicSalary)}</span>
                    <span>Allowances: {fmtETB(ps.allowances)}</span>
                    <span>Tax: {fmtETB(ps.tax)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* EMPLOYEE PROFILE DETAIL SLIDE PANEL */}
      <SlidePanel isOpen={Boolean(selectedEmployeeId)} onClose={() => setSelectedEmployeeId(null)} title="Employee Record Profile">
        {empDetailLoading || !employeeDetail ? (
          <div className="p-6 space-y-4"><SkeletonCard rows={4} /></div>
        ) : (
          <div className="space-y-6 p-1">
            <div className="p-4 rounded-xl bg-(--hover-overlay) border border-(--border-default) space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-(--text-primary)">{employeeDetail.fullName}</h3>
                <Badge variant={employeeDetail.status === 'ACTIVE' ? 'emerald' : 'glass'}>{employeeDetail.status}</Badge>
              </div>
              <p className="font-mono text-xs text-(--text-secondary)">Code: {employeeDetail.employeeCode} · {employeeDetail.email}</p>
              <p className="text-xs text-(--text-muted)">{employeeDetail.position} — {employeeDetail.department?.name ?? 'General Department'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-sans text-xs">
              <div className="p-3 rounded-xl bg-(--hover-overlay) space-y-1">
                <span className="text-(--text-muted) font-mono text-[10px]">EMPLOYMENT TYPE</span>
                <p className="font-semibold text-(--text-primary)">{EMPLOYMENT_TYPE_LABEL[employeeDetail.employmentType]}</p>
              </div>
              <div className="p-3 rounded-xl bg-(--hover-overlay) space-y-1">
                <span className="text-(--text-muted) font-mono text-[10px]">HIRE DATE</span>
                <p className="font-semibold text-(--text-primary)">{formatDate(employeeDetail.hireDate)}</p>
              </div>
              <div className="p-3 rounded-xl bg-(--hover-overlay) space-y-1">
                <span className="text-(--text-muted) font-mono text-[10px]">BASIC SALARY</span>
                <p className="font-mono font-bold text-(--status-success)">{fmtETB(employeeDetail.basicSalary)}</p>
              </div>
              <div className="p-3 rounded-xl bg-(--hover-overlay) space-y-1">
                <span className="text-(--text-muted) font-mono text-[10px]">EXPERIENCE</span>
                <p className="font-semibold text-(--text-primary)">{employeeDetail.experienceYears} Years</p>
              </div>
            </div>

            {employeeDetail.leaveRequests && employeeDetail.leaveRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-serif text-sm font-bold text-(--text-primary)">Recent Leave History</h4>
                <div className="space-y-1">
                  {employeeDetail.leaveRequests.map(lr => (
                    <div key={lr.id} className="flex justify-between items-center p-2 rounded-lg bg-(--hover-overlay) text-xs font-sans">
                      <span>{lr.leaveType} ({lr.daysCount} days)</span>
                      <span className="font-mono text-[11px] text-(--text-muted)">{lr.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </motion.div>
  );
};
