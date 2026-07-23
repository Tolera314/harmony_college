'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Search, Plus, Eye, Edit, Lock, Unlock, UserX, RotateCcw, UserCog } from 'lucide-react';
import { SystemUser, UserRole } from '../../../types/admin';
import { systemUsers } from '../../../data/adminData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';

const statusBadge = (s: SystemUser['status']) => {
  const m: Record<SystemUser['status'], 'emerald'|'amber'|'rose'|'glass'> = {
    Active: 'emerald', Inactive: 'glass', Suspended: 'amber', Locked: 'rose', Pending: 'gold' as 'gold',
  };
  return <Badge variant={m[s] as 'emerald'|'amber'|'rose'|'glass'|'gold'}>{s}</Badge>;
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Users & Roles"
        subtitle={`${systemUsers.filter(u => u.status === 'Active').length} active · ${systemUsers.filter(u => u.status === 'Suspended' || u.status === 'Locked').length} suspended/locked`}
        icon={<Users className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add User</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, email, or user ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as typeof roleFilter); setPage(1); }} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
          <option className="bg-[#1a1a1b]" value="All">All Roles</option>
          {ROLES.map(r => <option key={r} className="bg-[#1a1a1b]" value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
          {['All', 'Active', 'Inactive', 'Suspended', 'Locked'].map(s => <option key={s} className="bg-[#1a1a1b]" value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[850px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>{['User', 'Role', 'Status', '2FA', 'Last Login', 'Sessions', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-16 text-white/30">No users match your filters.</td></tr>
            : paginated.map(u => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-xs">{u.name}</p>
                      <p className="font-mono text-[10px] text-white/40">{u.userId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={u.role === 'Super Admin' ? 'gold' : 'glass'} className="text-[10px]">{u.role}</Badge>
                </td>
                <td className="px-4 py-3.5">{statusBadge(u.status)}</td>
                <td className="px-4 py-3.5">
                  <span className={`font-mono text-xs font-semibold ${u.twoFactorEnabled ? 'text-emerald-400' : 'text-white/30'}`}>{u.twoFactorEnabled ? '✓ On' : '✗ Off'}</span>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-white/50">{u.lastLogin ?? '—'}</td>
                <td className="px-4 py-3.5">
                  <span className={`font-mono text-xs font-bold ${u.sessions > 0 ? 'text-emerald-400' : 'text-white/30'}`}>{u.sessions}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(u)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="View"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Reset password"><RotateCcw className="w-3.5 h-3.5" /></button>
                    {u.status === 'Active' && u.role !== 'Super Admin' && (
                      <button onClick={() => setConfirmAction({ user: u, action: 'Suspend' })} className="p-1.5 rounded-lg hover:bg-amber-950/30 text-white/50 hover:text-amber-400 transition-colors" aria-label="Suspend"><UserX className="w-3.5 h-3.5" /></button>
                    )}
                    {u.status === 'Locked' && (
                      <button onClick={() => setConfirmAction({ user: u, action: 'Unlock' })} className="p-1.5 rounded-lg hover:bg-emerald-950/30 text-white/50 hover:text-emerald-400 transition-colors" aria-label="Unlock"><Unlock className="w-3.5 h-3.5" /></button>
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
          <p className="font-sans text-xs text-white/40">{filtered.length} users · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* User detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name} maxWidth="max-w-xl">
        {selected && (
          <div className="space-y-4 font-sans text-sm">
            <div className="flex items-center gap-4">
              <img src={selected.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
              <div>
                <Badge variant={selected.role === 'Super Admin' ? 'gold' : 'glass'}>{selected.role}</Badge>
                {statusBadge(selected.status)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['User ID', selected.userId], ['Email', selected.email], ['Department', selected.department ?? '—'], ['Sessions', selected.sessions], ['Logins', selected.loginCount], ['Failed Attempts', selected.failedLoginAttempts], ['Created', selected.createdAt], ['2FA', selected.twoFactorEnabled ? 'Enabled' : 'Disabled']].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase text-white/40">{k}</p>
                  <p className="text-white/80 text-xs mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm action modal */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={`Confirm: ${confirmAction?.action} User`} maxWidth="max-w-sm">
        {confirmAction && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-white/70">Are you sure you want to <span className="font-semibold text-white">{confirmAction.action.toLowerCase()}</span> <span className="text-[#E9C349]">{confirmAction.user.name}</span>?</p>
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
