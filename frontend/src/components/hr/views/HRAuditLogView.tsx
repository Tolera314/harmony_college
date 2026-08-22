'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { FileText, Search, Filter } from 'lucide-react';
import { hrAuditApi, type HRAuditLogApi } from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';

const statusConfig: Record<'SUCCESS'|'WARNING'|'FAILED', { variant: 'emerald'|'amber'|'rose'; label: string }> = {
  SUCCESS: { variant: 'emerald', label: 'Success' },
  WARNING: { variant: 'amber',   label: 'Warning' },
  FAILED:  { variant: 'rose',    label: 'Failed'  },
};

const MODULES = ['All','Employees','Leave','Payroll','Performance','Documents','Onboarding','System'];

export const HRAuditLogView: React.FC = () => {
  const [logs,      setLogs]      = useState<HRAuditLogApi[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [module,    setModule]    = useState('All');
  const [page,      setPage]      = useState(1);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await hrAuditApi.list({
        page, limit: PER_PAGE,
        search: search || undefined,
        module: module !== 'All' ? module : undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load audit log'); }
    finally { setLoading(false); }
  }, [page, search, module]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PER_PAGE);

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="HR Audit Log"
        subtitle={`${total} entries · append-only record of all HR actions`}
        icon={<FileText className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search actions, employees, descriptions…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {MODULES.map(m => (
            <button key={m} onClick={() => { setModule(m); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${module === m ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              <Filter className="w-3 h-3 inline mr-1 opacity-60" />{m}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      {logs.length === 0 ? (
        <EmptyState variant="audit" description="No audit log entries match your search." />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans min-w-[750px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Time','Action','Employee','Module','Actor','Status','Description'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {logs.map(entry => {
                const sc = statusConfig[entry.status] ?? statusConfig.SUCCESS;
                return (
                  <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-(--text-faint) whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-(--text-primary) whitespace-nowrap">{entry.action}</td>
                    <td className="px-4 py-3 text-(--text-secondary) truncate max-w-[120px]">{entry.employeeName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg bg-(--hover-overlay) border border-(--border-subtle) font-mono text-[10px] text-(--text-secondary)">
                        {entry.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-(--text-secondary) truncate max-w-[110px]">{entry.actorName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-(--text-faint) text-[11px] truncate max-w-[200px]">{entry.description}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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
