'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Plus, Eye, Edit, Lock, Unlock, UserX, RotateCcw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import {
  adminUsersApi, adminSessionsApi, AdminUser, AdminUserDetail,
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

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_BADGE[status] ?? 'glass'}>{STATUS_DISPLAY[status] ?? status}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === 'SUPER_ADMIN' ? 'gold' : 'glass'} className="text-[10px]">
      {ROLE_DISPLAY[role] ?? role}
    </Badge>
  );
}

const ROLES = ['INSTRUCTOR', 'DEPARTMENT_HEAD', 'HR_OFFICER', 'FINANCE_OFFICER', 'REGISTRAR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT'] as const;
const STATUSES = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DEACTIVATED', 'LOCKED'] as const;

// ── component ─────────────────────────────────────────────────────────────────

export const AdminUsersView: React.FC<{ callerRole?: string }> = ({ callerRole = 'ADMIN' }) => {
  // ── list state
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // ── filters
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── detail panel
  const [selected, setSelected]   = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── modals
  const [createOpen, setCreateOpen]         = useState(false);
  const [editTarget, setEditTarget]         = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction]   = useState<{ user: AdminUser; action: string } | null>(null);
  const [actionLoading, setActionLoading]   = useState(false);
  const [formError, setFormError]           = useState('');

  // ── create form
  const [cf, setCf] = useState({ fullName: '', email: '', phone: '', password: '', role: 'INSTRUCTOR' });
  // ── edit form
  const [ef, setEf] = useState({ fullName: '', email: '', phone: '', role: '' });

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── fetch list ──────────────────────────────────────────────────────────────
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

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(page, search, roleFilter, statusFilter), 280);
  }, [page, search, roleFilter, statusFilter, fetchUsers]);

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

  // ── create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setActionLoading(true);
    try {
      await adminUsersApi.create({ ...cf, email: cf.email || undefined, phone: cf.phone || undefined });
      showToast('Staff account created', 'success');
      setCreateOpen(false);
      setCf({ fullName: '', email: '', phone: '', password: '', role: 'INSTRUCTOR' });
      fetchUsers(1, search, roleFilter, statusFilter);
      setPage(1);
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  // ── edit ────────────────────────────────────────────────────────────────────
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

  // ── confirm action (status / revoke / delete) ────────────────────────────────
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { user, action } = confirmAction;
    setActionLoading(true);
    try {
      if (action === 'Suspend')    await adminUsersApi.updateStatus(user.id, 'SUSPENDED');
      if (action === 'Unlock')     await adminUsersApi.updateStatus(user.id, 'ACTIVE');
      if (action === 'Deactivate') await adminUsersApi.softDelete(user.id);
      if (action === 'Revoke Sessions') await adminUsersApi.revokeAllSessions(user.id);
      showToast(`Action "${action}" applied`, 'success');
      setConfirmAction(null);
      fetchUsers(page, search, roleFilter, statusFilter);
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
        subtitle={`${total} total · ${users.filter(u => u.status === 'ACTIVE').length} active this page`}
        icon={<Users className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setCreateOpen(true); setFormError(''); }}>Add Staff</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search name, email, phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option className="bg-(--bg-card-solid)" value="">All Roles</option>
          {ROLES.map(r => <option key={r} className="bg-(--bg-card-solid)" value={r}>{ROLE_DISPLAY[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option className="bg-(--bg-card-solid)" value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} className="bg-(--bg-card-solid)" value={s}>{STATUS_DISPLAY[s]}</option>)}
        </select>
      </div>

      {/* Table */}
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
                      <button onClick={() => openDetail(u)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      {u.activeSessions > 0 && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'Revoke Sessions' })} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--status-warning) transition-colors" aria-label="Revoke sessions"><RotateCcw className="w-3.5 h-3.5" /></button>
                      )}
                      {u.status === 'ACTIVE' && u.role !== 'SUPER_ADMIN' && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'Suspend' })} className="p-1.5 rounded-lg hover:bg-(--status-warning-bg) text-(--text-muted) hover:text-(--status-warning) transition-colors" aria-label="Suspend"><UserX className="w-3.5 h-3.5" /></button>
                      )}
                      {u.status === 'LOCKED' && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'Unlock' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-(--text-muted) hover:text-(--status-success) transition-colors" aria-label="Unlock"><Unlock className="w-3.5 h-3.5" /></button>
                      )}
                      {u.status !== 'DEACTIVATED' && !(u.role === 'SUPER_ADMIN' && !isSuperAdmin) && (
                        <button onClick={() => setConfirmAction({ user: u, action: 'Deactivate' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors" aria-label="Deactivate"><X className="w-3.5 h-3.5" /></button>
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
          <p className="font-sans text-xs text-(--text-faint)">{total} users · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
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
            {selected.studentRecord && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) space-y-1">
                <p className="font-mono text-[10px] uppercase text-(--text-faint) mb-2">Student Record</p>
                <p className="text-xs text-(--text-secondary)"><span className="text-(--text-faint)">ID:</span> {selected.studentRecord.studentId}</p>
                <p className="text-xs text-(--text-secondary)"><span className="text-(--text-faint)">Program:</span> {selected.studentRecord.program?.name ?? '—'}</p>
                <p className="text-xs text-(--text-secondary)"><span className="text-(--text-faint)">GPA:</span> {selected.studentRecord.gpa}</p>
              </div>
            )}
            {selected.auditLogs?.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase text-(--text-faint) mb-2">Recent Activity</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selected.auditLogs.slice(0, 8).map(log => (
                    <div key={log.id} className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-(--hover-overlay)">
                      <span className="font-mono text-(--text-secondary)">{log.action}</span>
                      <span className="text-(--text-faint)">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Staff Account" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label="Full Name" required value={cf.fullName} onChange={e => setCf({ ...cf, fullName: e.target.value })} />
          <Input label="Email" type="email" value={cf.email} onChange={e => setCf({ ...cf, email: e.target.value })} />
          <Input label="Phone" value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} />
          <Input label="Password" type="password" required value={cf.password} onChange={e => setCf({ ...cf, password: e.target.value })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Role</label>
            <select value={cf.role} onChange={e => setCf({ ...cf, role: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {ROLES.filter(r => r !== 'STUDENT').map(r => (
                <option key={r} value={r} disabled={r === 'SUPER_ADMIN' && !isSuperAdmin}>{ROLE_DISPLAY[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
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

      {/* Confirm modal */}
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
                variant={confirmAction.action === 'Unlock' ? 'primary' : 'danger'}
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
    </motion.div>
  );
};
