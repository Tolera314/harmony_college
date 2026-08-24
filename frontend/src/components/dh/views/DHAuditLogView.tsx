'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { ClipboardList, Search, RefreshCw } from 'lucide-react';
import { hodAuditApi, type AuditLogEntry } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState, ErrorState, SkeletonTable } from '../../ui/States';
import { Input } from '../../ui/Input';

const ACTION_CONFIG: Record<string, { variant: 'emerald' | 'amber' | 'rose' | 'glass'; label: string }> = {
  OFFERING_APPROVED: { variant: 'emerald', label: 'Offering Approved' },
  OFFERING_REJECTED: { variant: 'rose',    label: 'Offering Rejected' },
  LEAVE_APPROVED:    { variant: 'emerald', label: 'Leave Approved' },
  LEAVE_REJECTED:    { variant: 'rose',    label: 'Leave Rejected' },
  PROFILE_UPDATED:   { variant: 'glass',   label: 'Profile Updated' },
  PASSWORD_CHANGED:  { variant: 'amber',   label: 'Password Changed' },
};

export const DHAuditLogView: React.FC = () => {
  const [logs,    setLogs]    = useState<AuditLogEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const LIMIT = 15;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodAuditApi.list({
        page:   p,
        limit:  LIMIT,
        search: search || undefined,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter]);

  useEffect(() => { load(page); }, [page, search, actionFilter, load]);

  const totalPages = Math.ceil(total / LIMIT);
  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Audit Log"
        subtitle={loading ? 'Loading…' : `${total} actions recorded`}
        icon={<ClipboardList className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>Refresh</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search actions, descriptions…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'OFFERING_APPROVED', 'OFFERING_REJECTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED'] as const).map(a => (
            <button key={a} onClick={() => { setActionFilter(a); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all whitespace-nowrap ${actionFilter === a ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              {a === 'ALL' ? 'All Actions' : ACTION_CONFIG[a]?.label ?? a}
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonTable rows={8} cols={5} /> : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[700px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Date & Time', 'Action', 'Entity', 'Description', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="p-0"><EmptyState variant="audit" compact /></td></tr>
              ) : logs.map(entry => {
                const ac = ACTION_CONFIG[entry.action] ?? { variant: 'glass' as const, label: entry.action };
                const isSuccess = entry.action.includes('APPROVED') || entry.action.includes('UPDATED');
                const isReject  = entry.action.includes('REJECTED');
                return (
                  <tr key={entry.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-muted) whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={ac.variant} className="text-[10px]">{ac.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-sans text-xs font-semibold text-(--text-primary)">{entry.entityType}</p>
                      <p className="font-mono text-[10px] text-(--text-faint) truncate max-w-[120px]">{entry.entityId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3.5 text-(--text-muted) text-xs max-w-[280px] truncate">{entry.description}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={isSuccess ? 'emerald' : isReject ? 'rose' : 'amber'}>
                        {isSuccess ? 'Success' : isReject ? 'Rejected' : 'Info'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} entries · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
