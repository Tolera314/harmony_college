'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { FileText, Search, RefreshCw } from 'lucide-react';
import { DHPageHeader }    from '../../dh/DHPageHeader';
import { Badge }           from '../../ui/Badge';
import { Button }          from '../../ui/Button';
import { Input }           from '../../ui/Input';
import { SkeletonPage, EmptyState } from '../../ui/States';
import { instructorAuditApi, type AuditLogEntry } from '../../../lib/instructorApi';

// Map RegistrarAction enum values to human-readable labels
function actionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Derive a status from action name
function actionStatus(action: string): 'emerald' | 'amber' | 'rose' | 'glass' {
  const a = action.toLowerCase();
  if (a.includes('created') || a.includes('approved') || a.includes('issued'))  return 'emerald';
  if (a.includes('updated') || a.includes('changed') || a.includes('corrected')) return 'amber';
  if (a.includes('rejected') || a.includes('cancelled') || a.includes('revoked')) return 'rose';
  return 'glass';
}

export const InAuditLogView: React.FC = () => {
  const [logs,       setLogs]       = useState<AuditLogEntry[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const LIMIT = 20;

  const loadLogs = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const res = await instructorAuditApi.list({
        search: search || undefined,
        page:   p,
        limit:  LIMIT,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => loadLogs(1), 350);
    return () => clearTimeout(t);
  }, [search, loadLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Audit Log"
        subtitle={`${total} events recorded`}
        icon={<FileText className="w-5 h-5" />}
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => loadLogs(1)}>
            Refresh
          </Button>
        }
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search actions, entity types…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">{error}</div>
      )}

      {loading ? (
        <SkeletonPage />
      ) : logs.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No audit events"
          description={search ? `No results for "${search}".` : 'No audit events recorded yet.'}
          compact
        />
      ) : (
        <>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[700px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Date & Time', 'Action', 'Entity', 'Description', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {logs.map(e => (
                  <tr key={e.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-muted) whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-sans text-xs font-semibold text-(--text-primary)">
                      {actionLabel(e.action)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="glass" className="text-[10px]">{e.entityType}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-(--text-muted) text-xs max-w-[280px]">
                      <p className="line-clamp-2">{e.description}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={actionStatus(e.action)}>
                        {actionStatus(e.action) === 'emerald' ? 'Success' :
                         actionStatus(e.action) === 'amber'   ? 'Modified' :
                         actionStatus(e.action) === 'rose'    ? 'Removed' : 'Info'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-mono text-(--text-faint)">
              <span>{total} events · Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => loadLogs(page - 1)}>← Prev</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => loadLogs(page + 1)}>Next →</Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
