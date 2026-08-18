'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAuditApi, AdminAuditLog, ROLE_DISPLAY } from '../../../lib/adminApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SkeletonTable, EmptyState, ErrorState } from '../../ui/States';

// action → status badge color
function auditBadge(action: string): 'emerald' | 'rose' | 'amber' | 'glass' {
  if (['LOGIN_SUCCESS', 'ACCOUNT_UNLOCKED', 'OAUTH_LINKED'].includes(action)) return 'emerald';
  if (['LOGIN_FAILED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_LOCKED', 'ACCOUNT_SUSPENDED'].includes(action)) return 'rose';
  if (['PASSWORD_CHANGED', 'ROLE_CHANGED', 'SESSION_REVOKED'].includes(action)) return 'amber';
  return 'glass';
}

const KNOWN_ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED',
  'ROLE_CHANGED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DEACTIVATED',
  'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'SESSION_REVOKED', 'OAUTH_LINKED',
];

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs]           = useState<AdminAuditLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // filters
  const [search, setSearch]         = useState('');
  const [actionFilter, setAction]   = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchLogs = useCallback(async (p: number, action: string, from: string, to: string) => {
    setLoading(true); setError('');
    try {
      const res = await adminAuditApi.list({ page: p, limit: 20, action, from, to });
      setLogs(res.logs); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLogs(page, actionFilter, fromDate, toDate), 300);
  }, [page, actionFilter, fromDate, toDate, fetchLogs]);

  // client-side search filter on the loaded page
  const filtered = search
    ? logs.filter(l => {
        const q = search.toLowerCase();
        return (
          l.action.toLowerCase().includes(q) ||
          (l.user?.fullName ?? '').toLowerCase().includes(q) ||
          (l.user?.email ?? '').toLowerCase().includes(q) ||
          (l.ipAddress ?? '').includes(q)
        );
      })
    : logs;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Audit Logs"
        subtitle={`${total} events total`}
        icon={<FileText className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search user, action, IP..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={actionFilter} onChange={e => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option className="bg-(--bg-card-solid)" value="">All Actions</option>
          {KNOWN_ACTIONS.map(a => <option key={a} className="bg-(--bg-card-solid)" value={a}>{a}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
          aria-label="From date" />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
          aria-label="To date" />
      </div>

      {loading ? <SkeletonTable rows={10} cols={6} /> : error ? (
        <ErrorState compact description={error} onRetry={() => fetchLogs(page, actionFilter, fromDate, toDate)} />
      ) : filtered.length === 0 ? (
        <EmptyState variant="audit" compact />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans min-w-[900px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Timestamp', 'User', 'Role', 'Action', 'IP Address', 'Status'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-muted) whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-(--text-primary) text-xs">{log.user?.fullName ?? '—'}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">{log.user?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {log.user?.role ? <Badge variant="glass" className="text-[10px]">{ROLE_DISPLAY[log.user.role] ?? log.user.role}</Badge> : <span className="text-(--text-faint)">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={auditBadge(log.action)} className="text-[10px] whitespace-nowrap">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-faint)">{log.ipAddress ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={auditBadge(log.action)}>{auditBadge(log.action) === 'rose' ? 'Failed' : auditBadge(log.action) === 'amber' ? 'Warning' : 'Success'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} events · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
