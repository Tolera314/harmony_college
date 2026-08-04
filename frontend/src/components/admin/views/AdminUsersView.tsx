'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Plus, Eye, Edit, Lock, Unlock, UserX, RotateCcw, UserCog } from 'lucide-react';
import { SystemUser, UserRole } from '../../../types/admin';
import { systemUsers } from '../../../data/adminData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';

const statusBadge = (s: SystemUser['status']) => {
  const m: Record<SystemUser['status'], 'emerald'|'amber'|'rose'|'glass'|'gold'> = {
    Active: 'emerald', Inactive: 'glass', Suspended: 'amber', Locked: 'rose', Pending: 'gold',
  };
  return <Badge variant={m[s]}>{s}</Badge>;
};

const ROLES: UserRole[] = ['Super Admin', 'Admin', 'Department Head', 'Instructor', 'HR Officer', 'Finance Officer', 'Registrar', 'Student'];

export const AdminUsersView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All'|UserRole>('All');
  const [statusFilter, setStatusFilter] = useState<'All'|SystemUser['status']>('All');
  const [selected, setSelected] = useState<SystemUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: SystemUser; action: string } | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = systemUsers.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q);
    const matchR = roleFilter === 'All' || u.role === roleFilter;
    const matchS = statusFilter === 'All' || u.status === statusFilter;
    return matchQ && matchR && matchS;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Users & Roles"
        subtitle={`${systemUsers.filter(u => u.status === 'Active').length} active · ${systemUsers.filter(u => u.status === 'Suspended' || u.status === 'Locked').length} suspended/locked`}
        icon={<Users className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add User</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, email, or user ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as typeof roleFilter); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option className="bg-(--bg-card-solid)" value="All">All Roles</option>
          {ROLES.map(r => <option key={r} className="bg-(--bg-card-solid)" value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          {['All', 'Active', 'Inactive', 'Suspended', 'Locked'].map(s => <option key={s} className="bg-(--bg-card-solid)" value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[850px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>{['User', 'Role', 'Status', '2FA', 'Last Login', 'Sessions', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-16 text-(--text-faint)">No users match your filters.</td></tr>
            : paginated.map(u => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-(--border-default) shrink-0" />
                    <div>
                      <p className="font-semibold text-(--text-primary) text-xs">{u.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{u.userId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={u.role === 'Super Admin' ? 'gold' : 'glass'} className="text-[10px]">{u.role}</Badge>
                </td>
                <td className="px-4 py-3.5">{statusBadge(u.status)}</td>
                <td className="px-4 py-3.5">
                  <span className={`font-mono text-xs font-semibold ${u.twoFactorEnabled ? 'text-(--status-success)' : 'text-(--text-faint)'}`}>{u.twoFactorEnabled ? '✓ On' : '✗ Off'}</span>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">{u.lastLogin ?? '—'}</td>
                <td className="px-4 py-3.5">
                  <span className={`font-mono text-xs font-bold ${u.sessions > 0 ? 'text-(--status-success)' : 'text-(--text-faint)'}`}>{u.sessions}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(u)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Reset password"><RotateCcw className="w-3.5 h-3.5" /></button>
                    {u.status === 'Active' && u.role !== 'Super Admin' && (
                      <button onClick={() => setConfirmAction({ user: u, action: 'Suspend' })} className="p-1.5 rounded-lg hover:bg-(--status-warning-bg) text-(--text-muted) hover:text-(--status-warning) transition-colors" aria-label="Suspend"><UserX className="w-3.5 h-3.5" /></button>
                    )}
                    {u.status === 'Locked' && (
                      <button onClick={() => setConfirmAction({ user: u, action: 'Unlock' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-(--text-muted) hover:text-(--status-success) transition-colors" aria-label="Unlock"><Unlock className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{filtered.length} users · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* User detail — SlidePanel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name} subtitle="User Profile" width="max-w-xl">
        {selected && (
          <div className="space-y-4 font-sans text-sm">
            <div className="flex items-center gap-4">
              <img src={selected.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-(--border-default)" />
              <div>
                <Badge variant={selected.role === 'Super Admin' ? 'gold' : 'glass'}>{selected.role}</Badge>
                {statusBadge(selected.status)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['User ID', selected.userId], ['Email', selected.email], ['Department', selected.department ?? '—'], ['Sessions', selected.sessions], ['Logins', selected.loginCount], ['Failed Attempts', selected.failedLoginAttempts], ['Created', selected.createdAt], ['2FA', selected.twoFactorEnabled ? 'Enabled' : 'Disabled']].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Confirm action — stays centered Modal */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={`Confirm: ${confirmAction?.action} User`} maxWidth="max-w-sm">
        {confirmAction && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">Are you sure you want to <span className="font-semibold text-(--text-primary)">{confirmAction.action.toLowerCase()}</span> <span className="text-(--brand-gold)">{confirmAction.user.name}</span>?</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant={confirmAction.action === 'Unlock' ? 'primary' : 'danger'} className="flex-1" onClick={() => setConfirmAction(null)}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
