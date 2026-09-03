'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Users, Search, Download, Eye, EyeOff, UserX, Edit, Plus,
  Phone, Mail, AlertTriangle, Send, CheckCircle2, RotateCw, Loader2, Check,
} from 'lucide-react';
import {
  hrEmployeesApi, hrDepartmentsApi,
  type HREmployeeApi, type HRDepartmentApi,
  EMPLOYMENT_TYPE_LABEL, CONTRACT_STATUS_LABEL, EMPLOYEE_STATUS_LABEL,
} from '../../../lib/hrApi';
import { DHPageHeader }     from '../../dh/DHPageHeader';
import { Badge }            from '../../ui/Badge';
import { Button }           from '../../ui/Button';
import { Input }            from '../../ui/Input';
import { SlidePanel }       from '../../ui/SlidePanel';
import { ConfirmModal }     from '../../ui/ConfirmModal';
import { SkeletonPage, ErrorState } from '../../ui/States';
import { EmployeeFormPanel } from '../EmployeeFormPanel';

// ── Badge helpers ─────────────────────────────────────────────────────────────
function statusBadge(s: HREmployeeApi['status']) {
  const m: Record<string, 'emerald' | 'amber' | 'glass' | 'rose'> = {
    ACTIVE: 'emerald', ON_LEAVE: 'amber', INACTIVE: 'glass', TERMINATED: 'rose',
  };
  return <Badge variant={m[s] ?? 'glass'}>{(EMPLOYEE_STATUS_LABEL as Record<string, string>)[s] ?? s}</Badge>;
}

function contractBadge(s: HREmployeeApi['contractStatus']) {
  const m: Record<string, 'emerald' | 'amber' | 'rose' | 'gold'> = {
    ACTIVE: 'emerald', EXPIRING_SOON: 'amber', EXPIRED: 'rose', PROBATION: 'gold',
  };
  return <Badge variant={m[s] ?? 'glass'}>{(CONTRACT_STATUS_LABEL as Record<string, string>)[s] ?? s}</Badge>;
}

// ── Masked sensitive field ────────────────────────────────────────────────────
function MaskedField({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = value.slice(0, 2) + '•'.repeat(Math.max(0, value.length - 4)) + value.slice(-2);
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 30000);
    return () => clearTimeout(t);
  }, [revealed]);
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-xs text-(--text-secondary)">{revealed ? value : masked}</span>
      <button type="button" onClick={() => setRevealed(p => !p)}
        className="text-(--text-faint) hover:text-(--brand-gold) transition-colors">
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(data: HREmployeeApi[]) {
  const headers = ['Employee Code', 'Full Name', 'Department', 'Position', 'Role', 'Type', 'Status', 'Contract', 'Email', 'Phone', 'Hire Date'];
  const rows = data.map(e => [
    e.employeeCode, e.fullName, e.department?.name ?? '', e.position, e.systemRole ?? '',
    (EMPLOYMENT_TYPE_LABEL as Record<string, string>)[e.employmentType] ?? e.employmentType,
    (EMPLOYEE_STATUS_LABEL as Record<string, string>)[e.status]         ?? e.status,
    (CONTRACT_STATUS_LABEL as Record<string, string>)[e.contractStatus] ?? e.contractStatus,
    e.email, e.phone ?? '', new Date(e.hireDate).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'employees.csv';
  a.click();
}

// ─────────────────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

export const HREmployeesView: React.FC = () => {
  const [empList,    setEmpList]    = useState<HREmployeeApi[]>([]);
  const [depts,      setDepts]      = useState<HRDepartmentApi[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // filters
  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter,   setTypeFilter]   = useState('All');
  const [roleFilter,   setRoleFilter]   = useState('All');
  const [page,         setPage]         = useState(1);

  // panel / modal state
  const [profileEmp,       setProfileEmp]       = useState<HREmployeeApi | null>(null);
  const [profileFull,      setProfileFull]      = useState<HREmployeeApi | null>(null);
  const [loadingFull,      setLoadingFull]      = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<HREmployeeApi | null>(null);

  // invitation action state
  const [invitingId,     setInvitingId]     = useState<string | null>(null);
  const [inviteMessage,  setInviteMessage]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Shared form panel state ─────────────────────────────────────────────────
  const [formPanelOpen,    setFormPanelOpen]    = useState(false);
  const [formPanelMode,    setFormPanelMode]    = useState<'create' | 'edit'>('create');
  const [formPanelEmployee, setFormPanelEmployee] = useState<HREmployeeApi | null>(null);

  // ── Load employees + departments ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [res, deptRes] = await Promise.all([
        hrEmployeesApi.list({
          page,
          limit: PER_PAGE,
          search:         search        || undefined,
          departmentId:   deptFilter    !== 'All' ? deptFilter    : undefined,
          status:         statusFilter  !== 'All' ? statusFilter  : undefined,
          employmentType: typeFilter    !== 'All' ? typeFilter    : undefined,
          systemRole:     roleFilter    !== 'All' ? roleFilter    : undefined,
        }),
        hrDepartmentsApi.list(),
      ]);
      setEmpList(res.employees);
      setTotal(res.total);
      setDepts(deptRes);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load employees'); }
    finally { setLoading(false); }
  }, [page, search, deptFilter, statusFilter, typeFilter, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // ── Open form panel ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setFormPanelMode('create');
    setFormPanelEmployee(null);
    setFormPanelOpen(true);
  };

  const openEdit = async (emp: HREmployeeApi) => {
    // Fetch full record so sensitive fields / document URLs are in the form
    let full = emp;
    try {
      full = await hrEmployeesApi.getFullById(emp.id);
    } catch { /* fall back to list record */ }
    setFormPanelMode('edit');
    setFormPanelEmployee(full);
    setFormPanelOpen(true);
  };

  // ── Open profile panel ──────────────────────────────────────────────────────
  const openProfile = async (emp: HREmployeeApi) => {
    setProfileEmp(emp);
    setProfileFull(null);
    setLoadingFull(true);
    try {
      const full = await hrEmployeesApi.getFullById(emp.id);
      setProfileFull(full);
    } catch { /* show partial */ }
    finally { setLoadingFull(false); }
  };

  // ── Deactivate ──────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await hrEmployeesApi.deactivate(deactivateTarget.id);
      load();
      if (profileEmp?.id === deactivateTarget.id) {
        setProfileEmp(null); setProfileFull(null);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Deactivation failed'); }
    finally { setDeactivateTarget(null); }
  };

  // ── Invite & Resend Actions ────────────────────────────────────────────────
  const handleInvite = async (emp: HREmployeeApi) => {
    if (!emp.email || !emp.email.trim()) {
      setInviteMessage({ type: 'error', text: `Cannot invite ${emp.fullName}: Employee has no registered email address.` });
      return;
    }
    if (!emp.systemRole) {
      setInviteMessage({ type: 'error', text: `Cannot invite ${emp.fullName}: Please edit the employee to assign a system role first.` });
      return;
    }

    setInvitingId(emp.id);
    setInviteMessage(null);
    try {
      await hrEmployeesApi.invite(emp.id);
      setEmpList(prev => prev.map(e => e.id === emp.id ? { ...e, invitationStatus: 'PENDING' } : e));
      setInviteMessage({ type: 'success', text: `Account invitation email successfully sent to ${emp.email} for ${emp.fullName}.` });
    } catch (e: any) {
      setInviteMessage({ type: 'error', text: e?.message || 'Failed to send invitation email.' });
    } finally {
      setInvitingId(null);
    }
  };

  const handleResendInvite = async (emp: HREmployeeApi) => {
    setInvitingId(emp.id);
    setInviteMessage(null);
    try {
      await hrEmployeesApi.resendInvite(emp.id);
      setEmpList(prev => prev.map(e => e.id === emp.id ? { ...e, invitationStatus: 'PENDING' } : e));
      setInviteMessage({ type: 'success', text: `Account invitation email successfully resent to ${emp.email} for ${emp.fullName}.` });
    } catch (e: any) {
      setInviteMessage({ type: 'error', text: e?.message || 'Failed to resend invitation email.' });
    } finally {
      setInvitingId(null);
    }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  const activeCount   = empList.filter(e => e.status === 'ACTIVE').length;
  const expiringCount = empList.filter(e => e.contractStatus === 'EXPIRING_SOON').length;

  return (
    <div className="space-y-6 pb-16">
      <DHPageHeader
        title="Employees"
        subtitle={`${activeCount} active · ${expiringCount} expiring contracts · ${total} total`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
              onClick={() => exportCsv(empList)}>
              Export
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={openCreate}>
              Add Employee
            </Button>
          </div>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />}
            placeholder="Search by name, ID, position, or email…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className={filterSel}>
            <option value="All">All Depts</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={filterSel}>
            {['All','ACTIVE','ON_LEAVE','INACTIVE','TERMINATED'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Status' : (EMPLOYEE_STATUS_LABEL as Record<string,string>)[s] ?? s}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={filterSel}>
            {['All','FULL_TIME','PART_TIME','CONTRACT','INTERN'].map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : (EMPLOYMENT_TYPE_LABEL as Record<string,string>)[t] ?? t}</option>
            ))}
          </select>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className={filterSel}>
            {['All','INSTRUCTOR','DEPARTMENT_HEAD','REGISTRAR','FINANCE_OFFICER','HR_OFFICER'].map(r => (
              <option key={r} value={r}>{r === 'All' ? 'All Roles' : r.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Invite Feedback Toast/Banner ───────────────────────────────── */}
      {inviteMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-sans transition-all ${
          inviteMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {inviteMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{inviteMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setInviteMessage(null)}
            className="text-(--text-faint) hover:text-white text-xs px-2 py-0.5 rounded-md hover:bg-(--hover-overlay) transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[960px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Employee','Department','Position / Role','Type','Contract','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {empList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-(--text-faint) font-sans text-sm">
                  No employees match your filters.
                </td>
              </tr>
            ) : empList.map(emp => (
              <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="hover:bg-(--hover-overlay) transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img src={emp.avatarUrl ?? '/tigist.png'} alt={emp.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-(--border-default)" />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-(--bg-base) ${
                        emp.status === 'ACTIVE'   ? 'bg-(--status-success)'  :
                        emp.status === 'ON_LEAVE' ? 'bg-(--status-warning)'  : 'bg-(--active-overlay)'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-(--text-primary) text-xs">{emp.fullName}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{emp.employeeCode}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[120px]">
                  {emp.department?.name.split('&')[0].trim()}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-(--text-secondary) text-xs truncate max-w-[160px]">{emp.position}</p>
                  {emp.systemRole && (
                    <Badge variant="glass" className="text-[9px] mt-0.5">
                      {emp.systemRole.replace('_', ' ')}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant="glass" className="text-[10px]">
                    {(EMPLOYMENT_TYPE_LABEL as Record<string,string>)[emp.employmentType] ?? emp.employmentType}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">{contractBadge(emp.contractStatus)}</td>
                <td className="px-4 py-3.5">{statusBadge(emp.status)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Invite Button / Status */}
                    {(() => {
                      const isInviting = invitingId === emp.id;
                      const status = emp.invitationStatus ?? 'NONE';

                      if (status === 'ACCEPTED') {
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg"
                            title="Account Activated & Active"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Active
                          </span>
                        );
                      }

                      if (status === 'PENDING') {
                        return (
                          <div className="inline-flex items-center gap-1">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-(--brand-gold) bg-(--brand-gold)/10 border border-(--brand-gold)/20 px-2 py-1 rounded-lg"
                              title="Invitation sent and pending account activation"
                            >
                              <Check className="w-3 h-3 text-(--brand-gold)" />
                              Invited
                            </span>
                            <button
                              type="button"
                              title="Resend account invitation email"
                              onClick={() => handleResendInvite(emp)}
                              disabled={isInviting}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-(--text-muted) hover:text-(--brand-gold) hover:bg-(--hover-overlay) px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                              <span className="hidden xl:inline">Resend</span>
                            </button>
                          </div>
                        );
                      }

                      if (status === 'EXPIRED') {
                        return (
                          <button
                            type="button"
                            title="Invitation link expired. Click to resend."
                            onClick={() => handleResendInvite(emp)}
                            disabled={isInviting}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                            Resend Invite
                          </button>
                        );
                      }

                      // Default: 'NONE' (Not invited yet)
                      return (
                        <button
                          type="button"
                          title={emp.systemRole ? "Send Harmony College account invitation" : "Edit employee to assign a system role before inviting"}
                          onClick={() => handleInvite(emp)}
                          disabled={isInviting}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-(--brand-gold) hover:text-white bg-(--brand-gold)/10 hover:bg-(--brand-gold)/25 border border-(--brand-gold)/30 px-2.5 py-1 rounded-lg transition-all shadow-xs disabled:opacity-50"
                        >
                          {isInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Invite
                        </button>
                      );
                    })()}

                    <button title="View Profile" onClick={() => openProfile(emp)}
                      className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button title="Edit Employee" onClick={() => openEdit(emp)}
                      className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--brand-gold) transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    {emp.status === 'ACTIVE' && (
                      <button title="Deactivate" onClick={() => setDeactivateTarget(emp)}
                        className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                    {emp.contractStatus === 'EXPIRING_SOON' && (
                      <span title="Contract expiring soon" aria-label="Contract expiring soon">
                        <AlertTriangle className="w-4 h-4 text-(--status-warning)" />
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">
            {total} employee{total !== 1 ? 's' : ''} · Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="secondary" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Shared Employee Form SlidePanel (create + edit) ─────────────── */}
      <EmployeeFormPanel
        isOpen={formPanelOpen}
        onClose={() => setFormPanelOpen(false)}
        mode={formPanelMode}
        employee={formPanelEmployee}
        onSuccess={() => { setFormPanelOpen(false); load(); }}
      />

      {/* ── Profile SlidePanel ──────────────────────────────────────────── */}
      <SlidePanel
        isOpen={!!profileEmp}
        onClose={() => { setProfileEmp(null); setProfileFull(null); }}
        title={profileEmp?.fullName ?? ''}
        subtitle="Employee Profile"
        width="max-w-2xl"
      >
        {profileEmp && (() => {
          const emp = profileFull ?? profileEmp;
          return (
            <div className="space-y-5 text-sm font-sans px-6 py-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <img src={emp.avatarUrl ?? '/tigist.png'} alt={emp.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-(--border-default)" />
                <div className="flex-1">
                  <p className="font-sans text-base font-bold text-(--text-primary)">{emp.position}</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5">{emp.department?.name}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {statusBadge(emp.status)}
                    {contractBadge(emp.contractStatus)}
                    {emp.systemRole && (
                      <Badge variant="glass" className="text-[10px]">{emp.systemRole.replace('_', ' ')}</Badge>
                    )}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openEdit(emp)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Employment grid */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['Employee ID',    emp.employeeCode],
                  ['Hire Date',      new Date(emp.hireDate).toLocaleDateString()],
                  ['Type',           (EMPLOYMENT_TYPE_LABEL as Record<string,string>)[emp.employmentType] ?? emp.employmentType],
                  ['Education',      emp.education ?? '—'],
                  ['Experience',     `${emp.experienceYears} yr${emp.experienceYears !== 1 ? 's' : ''}`],
                  ['Contract End',   emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString() : 'Permanent'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                    <p className="text-(--text-secondary) text-xs mt-1">{v}</p>
                  </div>
                ))}
              </div>

              {/* Salary (masked) */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  ['Basic Salary',   `ETB ${emp.basicSalary.toLocaleString()}`],
                  ['Allowances',     `ETB ${emp.allowances.toLocaleString()}`],
                  ['Gross Monthly',  `ETB ${(emp.basicSalary + emp.allowances).toLocaleString()}`],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                    <MaskedField value={v} />
                  </div>
                ))}
              </div>

              {/* Sensitive fields — only when full record loaded */}
              {loadingFull && <p className="text-xs text-(--text-faint) animate-pulse">Loading details…</p>}
              {profileFull && (
                <>
                  {(profileFull.nationalId || profileFull.bankAccount || profileFull.taxNumber) && (
                    <div className="grid grid-cols-3 gap-3">
                      {profileFull.nationalId  && <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)"><p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">National ID</p><MaskedField value={profileFull.nationalId} /></div>}
                      {profileFull.bankAccount && <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)"><p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Bank Account</p><MaskedField value={profileFull.bankAccount} /></div>}
                      {profileFull.taxNumber   && <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)"><p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Tax Number</p><MaskedField value={profileFull.taxNumber} /></div>}
                    </div>
                  )}
                  {/* Document quick-links */}
                  {(profileFull.certificateUrl || profileFull.faydaIdUrl) && (
                    <div className="grid grid-cols-2 gap-3">
                      {profileFull.certificateUrl && (
                        <a href={profileFull.certificateUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl hover:border-(--brand-gold)/40 transition-colors text-xs text-(--brand-gold) font-semibold">
                          📄 Certificate
                        </a>
                      )}
                      {profileFull.faydaIdUrl && (
                        <a href={profileFull.faydaIdUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl hover:border-(--brand-gold)/40 transition-colors text-xs text-(--brand-gold) font-semibold">
                          🪪 Fayda ID
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Emergency contact */}
              {emp.emergencyName && (
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-1">Emergency Contact</p>
                  <div className="flex items-center gap-4 text-xs text-(--text-secondary) flex-wrap">
                    <span className="font-semibold text-(--text-primary)">{emp.emergencyName}</span>
                    {emp.emergencyRelation && <><span>·</span><span>{emp.emergencyRelation}</span></>}
                    {emp.emergencyPhone    && <><span>·</span><span className="font-mono">{emp.emergencyPhone}</span></>}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="flex items-center gap-4 text-xs text-(--text-secondary) flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-(--text-faint)" />{emp.email}
                </span>
                {emp.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-(--text-faint)" />
                    <span className="font-mono">{emp.phone}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </SlidePanel>

      {/* ── Deactivate Confirm ──────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Employee"
        message={`This will set ${deactivateTarget?.fullName} to Inactive and revoke system access. All historical records are preserved.`}
        icon={<UserX className="w-6 h-6" />}
        variant="danger"
        confirmLabel="Confirm Deactivate"
      />
    </div>
  );
};
