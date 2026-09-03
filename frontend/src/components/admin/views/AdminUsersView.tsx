'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Plus, Eye, Edit, Lock, Unlock, UserX, UserCheck, RotateCcw, ChevronLeft, ChevronRight, X, Trash2, Mail, Send, CheckCircle2, ShieldAlert, Clock, Building2, Copy } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import {
  adminUsersApi, adminSessionsApi, adminUserSessionsApi, adminInvitationsApi, adminDepartmentsApi,
  AdminUser, AdminUserDetail, ApiStaffInvitation, ApiDepartment,
  ROLE_DISPLAY, STATUS_DISPLAY,
} from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'emerald' | 'amber' | 'rose' | 'glass' | 'gold'> = {
  ACTIVE:               'emerald',
  PENDING_VERIFICATION: 'gold',
  SUSPENDED:            'amber',
  DEACTIVATED:          'glass',
  LOCKED:               'rose',
};

const INVITATION_STATUS_BADGE: Record<string, 'emerald' | 'amber' | 'rose' | 'glass' | 'gold'> = {
  PENDING:  'gold',
  ACCEPTED: 'emerald',
  EXPIRED:  'glass',
  REVOKED:  'rose',
};

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_BADGE[status] ?? 'glass'}>{STATUS_DISPLAY[status] ?? status}</Badge>;
}

function InvitationStatusBadge({ status }: { status: string }) {
  return <Badge variant={INVITATION_STATUS_BADGE[status] ?? 'glass'}>{status}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === 'SUPER_ADMIN' ? 'gold' : 'glass'} className="text-[10px]">
      {ROLE_DISPLAY[role] ?? role}
    </Badge>
  );
}

const ROLES = ['INSTRUCTOR', 'DEPARTMENT_HEAD', 'HR_OFFICER', 'FINANCE_OFFICER', 'REGISTRAR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT'] as const;
const STAFF_ROLES_LIST = ['INSTRUCTOR', 'DEPARTMENT_HEAD', 'HR_OFFICER', 'FINANCE_OFFICER', 'REGISTRAR', 'ADMIN', 'SUPER_ADMIN'] as const;
const STATUSES = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DEACTIVATED', 'LOCKED'] as const;

// ── component ─────────────────────────────────────────────────────────────────

export const AdminUsersView: React.FC<{ callerRole?: string }> = ({ callerRole = 'ADMIN' }) => {
  // ── active tab
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // ── users list state
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // ── invitations list state
  const [invitations, setInvitations]           = useState<ApiStaffInvitation[]>([]);
  const [invTotal, setInvTotal]                 = useState(0);
  const [invTotalPages, setInvTotalPages]       = useState(1);
  const [invPage, setInvPage]                   = useState(1);
  const [invLoading, setInvLoading]             = useState(false);
  const [invError, setInvError]                 = useState('');
  const [invStatusFilter, setInvStatusFilter]   = useState('');

  // ── departments list for dropdowns
  const [departments, setDepartments]         = useState<ApiDepartment[]>([]);

  // ── filters
  const [search, setSearch]               = useState('');
  const [roleFilter, setRoleFilter]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [deptFilter, setDeptFilter]       = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── detail panel
  const [selected, setSelected]           = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── modals
  const [inviteOpen, setInviteOpen]       = useState(false);
  const [editTarget, setEditTarget]       = useState<AdminUser | null>(null);
  const [editInvTarget, setEditInvTarget] = useState<ApiStaffInvitation | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: AdminUser; action: string } | null>(null);
  const [invActionTarget, setInvActionTarget] = useState<{ inv: ApiStaffInvitation; action: 'resend' | 'revoke' } | null>(null);
  const [linkModal, setLinkModal]         = useState<{ email: string; link: string; warning?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError]         = useState('');

  // ── invite form (NO password field)
  const [invForm, setInvForm] = useState({
    fullName: '',
    email: '',
    role: 'INSTRUCTOR',
    departmentId: '',
    positionTitle: '',
    employeeId: '',
    phone: '',
    specialization: '',
  });

  // ── edit invitation form
  const [eif, setEif] = useState({
    fullName: '',
    email: '',
    role: 'INSTRUCTOR',
    departmentId: '',
    positionTitle: '',
    employeeId: '',
    phone: '',
    specialization: '',
  });

  // ── edit user form
  const [ef, setEf] = useState({ fullName: '', email: '', phone: '', role: '' });

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── fetch departments
  const fetchDepartments = useCallback(() => {
    adminDepartmentsApi.list()
      .then(depts => {
        const active = depts.filter(d => d.isActive);
        setDepartments(active);
        setInvForm(prev => ({
          ...prev,
          departmentId: prev.departmentId && active.some(a => a.id === prev.departmentId) ? prev.departmentId : (active[0]?.id ?? ''),
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // ── fetch users list ──────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (p: number, s: string, r: string, st: string) => {
    setLoading(true); setError('');
    try {
      const res = await adminUsersApi.list({ page: p, limit: 10, search: s, role: r, status: st });
      setUsers(res.users); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── fetch invitations list ───────────────────────────────────────────────────────
  const fetchInvitations = useCallback(async (p: number, s: string, r: string, d: string, st: string) => {
    setInvLoading(true); setInvError('');
    try {
      const res = await adminInvitationsApi.list({ page: p, limit: 10, search: s, role: r, departmentId: d, status: st });
      setInvitations(res.invitations); setInvTotal(res.total); setInvTotalPages(res.totalPages);
    } catch (e: any) {
      setInvError(e.message ?? 'Failed to load invitations');
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (activeTab === 'users') {
        fetchUsers(page, search, roleFilter, statusFilter);
      } else {
        fetchInvitations(invPage, search, roleFilter, deptFilter, invStatusFilter);
      }
    }, 280);
  }, [activeTab, page, invPage, search, roleFilter, statusFilter, deptFilter, invStatusFilter, fetchUsers, fetchInvitations]);

  // ── open detail ─────────────────────────────────────────────────────────────
  const openDetail = async (u: AdminUser) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const detail = await adminUsersApi.getById(u.id);
      setSelected(detail);
    } catch {
      showToast('Failed to load user details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── invite staff (no password) ──────────────────────────────────────────────
  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setActionLoading(true);

    if (!invForm.departmentId) {
      setFormError('Please select a department.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await adminInvitationsApi.create({
        fullName:       invForm.fullName.trim(),
        email:          invForm.email.trim(),
        role:           invForm.role,
        departmentId:   invForm.departmentId,
        positionTitle:  invForm.positionTitle.trim() || undefined,
        employeeId:     invForm.employeeId.trim() || undefined,
        phone:          invForm.phone.trim() || undefined,
        specialization: invForm.specialization.trim() || undefined,
      });

      setInviteOpen(false);
      setInvForm({
        fullName: '',
        email: '',
        role: 'INSTRUCTOR',
        departmentId: departments[0]?.id ?? '',
        positionTitle: '',
        employeeId: '',
        phone: '',
        specialization: '',
      });

      if (res.emailWarning && res.invitationLink) {
        setLinkModal({ email: res.invitation.email, link: res.invitationLink, warning: res.emailWarning });
      } else {
        showToast(res.message || 'Invitation successfully sent', 'success');
      }

      if (activeTab === 'invitations') {
        fetchInvitations(1, search, roleFilter, deptFilter, invStatusFilter);
      } else {
        setActiveTab('invitations');
      }
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to send staff invitation');
    } finally {
      setActionLoading(false);
    }
  };

  // ── open edit invitation ─────────────────────────────────────────────────────
  const openEditInv = (inv: ApiStaffInvitation) => {
    setEditInvTarget(inv);
    setEif({
      fullName:       inv.fullName,
      email:          inv.email,
      role:           inv.role,
      departmentId:   inv.departmentId,
      positionTitle:  inv.positionTitle ?? '',
      employeeId:     inv.employeeId ?? '',
      phone:          inv.phone ?? '',
      specialization: inv.specialization ?? '',
    });
    setFormError('');
  };

  // ── submit update invitation & re-invite ──────────────────────────────────────
  const handleUpdateInv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvTarget) return;
    setFormError(''); setActionLoading(true);

    try {
      const res = await adminInvitationsApi.update(editInvTarget.id, {
        fullName:       eif.fullName.trim() || undefined,
        email:          eif.email.trim() || undefined,
        role:           eif.role || undefined,
        departmentId:   eif.departmentId || undefined,
        positionTitle:  eif.positionTitle.trim() || undefined,
        employeeId:     eif.employeeId.trim() || undefined,
        phone:          eif.phone.trim() || undefined,
        specialization: eif.specialization.trim() || undefined,
      });

      setEditInvTarget(null);
      if (res.emailWarning && res.invitationLink) {
        setLinkModal({ email: res.invitation.email, link: res.invitationLink, warning: res.emailWarning });
      } else {
        showToast(res.message || 'Invitation updated and resent', 'success');
      }
      fetchInvitations(invPage, search, roleFilter, deptFilter, invStatusFilter);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to update invitation');
    } finally {
      setActionLoading(false);
    }
  };

  // ── edit user ───────────────────────────────────────────────────────────────
  const openEdit = (u: AdminUser) => {
    setEf({ fullName: u.fullName, email: u.email ?? '', phone: u.phone ?? '', role: u.role });
    setEditTarget(u);
    setFormError('');
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setFormError(''); setActionLoading(true);
    try {
      await adminUsersApi.update(editTarget.id, {
        fullName: ef.fullName || undefined,
        email:    ef.email    || undefined,
        phone:    ef.phone    || undefined,
        role:     ef.role     || undefined,
      });
      showToast('User updated', 'success');
      setEditTarget(null);
      fetchUsers(page, search, roleFilter, statusFilter);
    } catch (e: any) {
      setFormError(e.message ?? 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── confirm user action (status / revoke / delete) ──────────────────────────
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { user, action } = confirmAction;
    setActionLoading(true);
    try {
      if (action === 'Suspend')    await adminUsersApi.updateStatus(user.id, 'SUSPENDED');
      if (action === 'Unlock')     await adminUsersApi.updateStatus(user.id, 'ACTIVE');
      if (action === 'Reactivate') await adminUsersApi.updateStatus(user.id, 'ACTIVE');
      if (action === 'Deactivate' || action === 'Delete') await adminUsersApi.softDelete(user.id);
      if (action === 'Revoke Sessions') await adminUserSessionsApi.revokeAllSessions(user.id);
      showToast(`Action "${action}" applied`, 'success');
      setConfirmAction(null);
      fetchUsers(page, search, roleFilter, statusFilter);
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── invitation action (resend / revoke) ─────────────────────────────────────
  const handleInvitationAction = async () => {
    if (!invActionTarget) return;
    const { inv, action } = invActionTarget;
    setActionLoading(true);
    try {
      if (action === 'resend') {
        const res = await adminInvitationsApi.resend(inv.id);
        if (res.emailWarning && res.invitationLink) {
          setLinkModal({ email: res.invitation.email, link: res.invitationLink, warning: res.emailWarning });
        } else {
          showToast(res.message || 'Invitation resent successfully', 'success');
        }
      } else if (action === 'revoke') {
        const res = await adminInvitationsApi.revoke(inv.id);
        showToast(res.message || 'Invitation revoked', 'success');
      }
      setInvActionTarget(null);
      fetchInvitations(invPage, search, roleFilter, deptFilter, invStatusFilter);
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────
  const isSuperAdmin = callerRole === 'SUPER_ADMIN';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Users & Roles"
        subtitle={activeTab === 'users' ? `${total} total accounts` : `${invTotal} staff invitations`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <Button
            variant="gold"
            size="sm"
            icon={<Send className="w-4 h-4" />}
            onClick={() => { fetchDepartments(); setInviteOpen(true); setFormError(''); }}
          >
            Invite Staff
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-(--border-default) gap-6 font-sans text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-semibold transition-colors relative ${activeTab === 'users' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          Users & Roles ({total})
          {activeTab === 'users' && <motion.div layoutId="userTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 font-semibold transition-colors relative ${activeTab === 'invitations' ? 'text-(--brand-gold)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
        >
          Staff Invitations ({invTotal})
          {activeTab === 'invitations' && <motion.div layoutId="userTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--brand-gold)" />}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={activeTab === 'users' ? "Search name, email, phone..." : "Search invited name or email..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); setInvPage(1); }}
          />
        </div>

        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); setInvPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option className="bg-(--bg-card-solid)" value="">All Roles</option>
          {ROLES.map(r => <option key={r} className="bg-(--bg-card-solid)" value={r}>{ROLE_DISPLAY[r]}</option>)}
        </select>

        {activeTab === 'users' ? (
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option className="bg-(--bg-card-solid)" value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} className="bg-(--bg-card-solid)" value={s}>{STATUS_DISPLAY[s]}</option>)}
          </select>
        ) : (
          <>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setInvPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
              <option className="bg-(--bg-card-solid)" value="">All Departments</option>
              {departments.map(d => <option key={d.id} className="bg-(--bg-card-solid)" value={d.id}>{d.name}</option>)}
            </select>

            <select value={invStatusFilter} onChange={e => { setInvStatusFilter(e.target.value); setInvPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
              <option className="bg-(--bg-card-solid)" value="">All Invitation Statuses</option>
              <option className="bg-(--bg-card-solid)" value="PENDING">PENDING</option>
              <option className="bg-(--bg-card-solid)" value="ACCEPTED">ACCEPTED</option>
              <option className="bg-(--bg-card-solid)" value="EXPIRED">EXPIRED</option>
              <option className="bg-(--bg-card-solid)" value="REVOKED">REVOKED</option>
            </select>
          </>
        )}
      </div>

      {/* Users Table */}
      {activeTab === 'users' && (
        <>
          {loading ? <SkeletonTable rows={8} cols={6} /> : error ? (
            <ErrorState compact description={error} onRetry={() => fetchUsers(page, search, roleFilter, statusFilter)} />
          ) : users.length === 0 ? (
            <EmptyState variant="search" compact />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
              <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[850px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>{['User', 'Role', 'Status', 'Last Login', 'Sessions', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {users.map(u => (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-xs shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-(--text-primary) text-xs">{u.fullName}</p>
                            <p className="font-mono text-[10px] text-(--text-faint)">{u.email ?? u.phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-mono text-xs font-bold ${u.activeSessions > 0 ? 'text-(--status-success)' : 'text-(--text-faint)'}`}>{u.activeSessions}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(u)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View" title="View Details"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit" title="Edit User"><Edit className="w-3.5 h-3.5" /></button>
                          {u.activeSessions > 0 && (
                            <button onClick={() => setConfirmAction({ user: u, action: 'Revoke Sessions' })} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--status-warning) transition-colors" aria-label="Revoke sessions" title="Revoke Sessions"><RotateCcw className="w-3.5 h-3.5" /></button>
                          )}
                          {u.status === 'ACTIVE' && u.role !== 'SUPER_ADMIN' && (
                            <button onClick={() => setConfirmAction({ user: u, action: 'Suspend' })} className="p-1.5 rounded-lg hover:bg-(--status-warning-bg) text-(--text-muted) hover:text-(--status-warning) transition-colors" aria-label="Suspend" title="Suspend User"><UserX className="w-3.5 h-3.5" /></button>
                          )}
                          {u.status === 'LOCKED' && (
                            <button onClick={() => setConfirmAction({ user: u, action: 'Unlock' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-(--text-muted) hover:text-(--status-success) transition-colors" aria-label="Unlock" title="Unlock User"><Unlock className="w-3.5 h-3.5" /></button>
                          )}
                          {(u.status === 'DEACTIVATED' || u.status === 'SUSPENDED' || u.status === 'PENDING_VERIFICATION') && !(u.role === 'SUPER_ADMIN' && !isSuperAdmin) && (
                            <button onClick={() => setConfirmAction({ user: u, action: 'Reactivate' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-(--text-muted) hover:text-(--status-success) transition-colors" aria-label="Reactivate" title="Reactivate User"><UserCheck className="w-3.5 h-3.5" /></button>
                          )}
                          {u.status !== 'DEACTIVATED' && !(u.role === 'SUPER_ADMIN' && !isSuperAdmin) && (
                            <button onClick={() => setConfirmAction({ user: u, action: 'Delete' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors" aria-label="Delete" title="Delete User"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-(--text-faint)">{total} users · Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invitations Table */}
      {activeTab === 'invitations' && (
        <>
          {invLoading ? <SkeletonTable rows={6} cols={6} /> : invError ? (
            <ErrorState compact description={invError} onRetry={() => fetchInvitations(invPage, search, roleFilter, deptFilter, invStatusFilter)} />
          ) : invitations.length === 0 ? (
            <EmptyState variant="search" compact description="No staff invitations found matching your filters." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
              <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[850px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>{['Recipient', 'Role', 'Department', 'Status', 'Invited By', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {invitations.map(inv => (
                    <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#E9C349] font-bold text-xs shrink-0">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-(--text-primary) text-xs">{inv.fullName}</p>
                            <p className="font-mono text-[10px] text-(--text-faint)">{inv.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><RoleBadge role={inv.role} /></td>
                      <td className="px-4 py-3.5 text-xs text-(--text-secondary)">{inv.department?.name ?? '—'}</td>
                      <td className="px-4 py-3.5"><InvitationStatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3.5 text-xs text-(--text-muted)">{inv.invitedByUser?.fullName ?? 'Admin'}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {(inv.status === 'PENDING' || inv.status === 'EXPIRED') && (
                            <>
                              <button
                                onClick={() => openEditInv(inv)}
                                className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                                title="Edit & Re-invite"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setInvActionTarget({ inv, action: 'resend' })}
                                className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--brand-gold) transition-colors"
                                title="Resend Invitation"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {inv.status === 'PENDING' && (
                            <button
                              onClick={() => setInvActionTarget({ inv, action: 'revoke' })}
                              className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors"
                              title="Revoke Invitation"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invitations Pagination */}
          {!invLoading && !invError && invTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-(--text-faint)">{invTotal} invitations · Page {invPage} of {invTotalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setInvPage(p => Math.max(1, p - 1))} disabled={invPage === 1}>Prev</Button>
                <Button variant="secondary" size="sm" onClick={() => setInvPage(p => Math.min(invTotalPages, p + 1))} disabled={invPage === invTotalPages}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected || detailLoading} onClose={() => setSelected(null)} title={selected?.fullName ?? 'Loading...'} subtitle="User Profile" width="max-w-xl">
        {detailLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-(--hover-overlay) rounded-xl" />)}
          </div>
        ) : selected && (
          <div className="space-y-5 font-sans text-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-2xl font-serif">
                {selected.fullName.charAt(0)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <RoleBadge role={selected.role} />
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',             selected.email ?? '—'],
                ['Phone',             selected.phone ?? '—'],
                ['Created',           new Date(selected.createdAt).toLocaleDateString()],
                ['Last Login',        selected.lastLoginAt ? new Date(selected.lastLoginAt).toLocaleDateString() : '—'],
                ['Failed Attempts',   selected.failedLoginAttempts],
                ['Profile %',         `${selected.profileCompletion}%`],
                ['Active Sessions',   selected.activeSessions],
                ['OAuth Accounts',    selected.oauthAccounts?.length ?? 0],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Invite Staff Modal (Zero password field) */}
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Staff Member" maxWidth="max-w-lg">
        <form onSubmit={handleInviteStaff} className="space-y-4 font-sans text-xs">
          {formError && <InlineError message={formError} />}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
            <Send className="w-4 h-4 shrink-0" />
            <span>The staff member will receive a secure email link to set their own password and activate their account.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full Name *" required value={invForm.fullName} onChange={e => setInvForm({ ...invForm, fullName: e.target.value })} placeholder="e.g. Dr. Abebe Bikila" />
            <Input label="Official Email *" type="email" required value={invForm.email} onChange={e => setInvForm({ ...invForm, email: e.target.value })} placeholder="staff@harmony.edu.et" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Role *</label>
              <select value={invForm.role} onChange={e => setInvForm({ ...invForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {STAFF_ROLES_LIST.map(r => (
                  <option key={r} value={r} disabled={r === 'SUPER_ADMIN' && !isSuperAdmin}>{ROLE_DISPLAY[r]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Department *</label>
              <select value={invForm.departmentId} onChange={e => setInvForm({ ...invForm, departmentId: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Position / Title (Optional)" value={invForm.positionTitle} onChange={e => setInvForm({ ...invForm, positionTitle: e.target.value })} placeholder="e.g. Senior Lecturer" />
            <Input label="Employee ID (Optional)" value={invForm.employeeId} onChange={e => setInvForm({ ...invForm, employeeId: e.target.value })} placeholder="e.g. EMP-1092" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Phone Number (Optional)" value={invForm.phone} onChange={e => setInvForm({ ...invForm, phone: e.target.value })} placeholder="+251 91 123 4567" />
            <Input label="Specialization (Optional)" value={invForm.specialization} onChange={e => setInvForm({ ...invForm, specialization: e.target.value })} placeholder="e.g. Machine Learning" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Sending...' : 'Send Invitation'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit & Re-invite Staff Invitation Modal */}
      <Modal isOpen={!!editInvTarget} onClose={() => setEditInvTarget(null)} title={`Edit & Re-invite: ${editInvTarget?.fullName}`} maxWidth="max-w-lg">
        <form onSubmit={handleUpdateInv} className="space-y-4 font-sans text-xs">
          {formError && <InlineError message={formError} />}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Updating this invitation will issue a new 48-hour secure token and send a fresh invitation email to the recipient.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full Name *" required value={eif.fullName} onChange={e => setEif({ ...eif, fullName: e.target.value })} />
            <Input label="Official Email *" type="email" required value={eif.email} onChange={e => setEif({ ...eif, email: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Role *</label>
              <select value={eif.role} onChange={e => setEif({ ...eif, role: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {STAFF_ROLES_LIST.map(r => (
                  <option key={r} value={r} disabled={r === 'SUPER_ADMIN' && !isSuperAdmin}>{ROLE_DISPLAY[r]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Department *</label>
              <select value={eif.departmentId} onChange={e => setEif({ ...eif, departmentId: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Position / Title (Optional)" value={eif.positionTitle} onChange={e => setEif({ ...eif, positionTitle: e.target.value })} />
            <Input label="Employee ID (Optional)" value={eif.employeeId} onChange={e => setEif({ ...eif, employeeId: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Phone Number (Optional)" value={eif.phone} onChange={e => setEif({ ...eif, phone: e.target.value })} />
            <Input label="Specialization (Optional)" value={eif.specialization} onChange={e => setEif({ ...eif, specialization: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditInvTarget(null)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Updating & Resending...' : 'Update & Re-invite'}</Button>
          </div>
        </form>
      </Modal>

      {/* Invitation Link & Provider Warning Modal */}
      <Modal isOpen={!!linkModal} onClose={() => setLinkModal(null)} title="Staff Invitation Details" maxWidth="max-w-lg">
        {linkModal && (
          <div className="space-y-4 font-sans text-xs">
            {linkModal.warning ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Resend Email Restriction Notice</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Your Resend free account restricts email delivery to your registered address (<span className="underline font-mono">banadawithunde@gmail.com</span>). To deliver emails to other recipients (<span className="font-mono">{linkModal.email}</span>), verify a custom domain at <span className="font-mono">resend.com/domains</span> or copy the invitation link below to test manually:
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Invitation link created and sent to {linkModal.email}!</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Invitation Link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={linkModal.link}
                  className="flex-1 px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl font-mono text-[11px] text-(--text-primary) focus:outline-none"
                />
                <Button
                  variant="gold"
                  size="sm"
                  icon={<Copy className="w-3.5 h-3.5" />}
                  onClick={() => {
                    navigator.clipboard.writeText(linkModal.link);
                    showToast('Invitation link copied to clipboard!', 'success');
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setLinkModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit user modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.fullName}`} maxWidth="max-w-md">
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label="Full Name" required value={ef.fullName} onChange={e => setEf({ ...ef, fullName: e.target.value })} />
          <Input label="Email" type="email" value={ef.email} onChange={e => setEf({ ...ef, email: e.target.value })} />
          <Input label="Phone" value={ef.phone} onChange={e => setEf({ ...ef, phone: e.target.value })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Role</label>
            <select value={ef.role} onChange={e => setEf({ ...ef, role: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {ROLES.map(r => (
                <option key={r} value={r} disabled={r === 'SUPER_ADMIN' && !isSuperAdmin}>{ROLE_DISPLAY[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm User action modal */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={`Confirm: ${confirmAction?.action}`} maxWidth="max-w-sm">
        {confirmAction && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">
              Apply <span className="font-semibold text-(--text-primary)">{confirmAction.action.toLowerCase()}</span> to{' '}
              <span className="text-(--brand-gold)">{confirmAction.user.fullName}</span>?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={(confirmAction.action === 'Unlock' || confirmAction.action === 'Reactivate') ? 'primary' : 'danger'}
                className="flex-1"
                disabled={actionLoading}
                onClick={handleConfirmAction}
              >
                {actionLoading ? 'Working...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Invitation action modal (Resend / Revoke) */}
      <Modal isOpen={!!invActionTarget} onClose={() => setInvActionTarget(null)} title={`Confirm ${invActionTarget?.action === 'resend' ? 'Resend' : 'Revoke'} Invitation`} maxWidth="max-w-sm">
        {invActionTarget && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">
              Are you sure you want to <span className="font-semibold text-(--brand-gold)">{invActionTarget.action}</span> the staff invitation for{' '}
              <span className="font-semibold text-(--text-primary)">{invActionTarget.inv.fullName}</span> ({invActionTarget.inv.email})?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setInvActionTarget(null)}>Cancel</Button>
              <Button
                variant={invActionTarget.action === 'resend' ? 'gold' : 'danger'}
                className="flex-1"
                disabled={actionLoading}
                onClick={handleInvitationAction}
              >
                {actionLoading ? 'Working...' : invActionTarget.action === 'resend' ? 'Resend' : 'Revoke'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
