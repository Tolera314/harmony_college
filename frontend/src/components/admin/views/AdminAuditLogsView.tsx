'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Shield, Search, Filter, Eye, Download, Printer, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle2, Lock, UserCheck, CreditCard, Users
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, useToast, ToastContainer } from '../../ui/States';
import {
  adminAuditApi, AdminAuditStats, AdminAuditLog
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

const MODULE_BADGE: Record<string, 'gold' | 'emerald' | 'amber' | 'info' | 'glass'> = {
  AUTHENTICATION:  'gold',
  USER_MANAGEMENT: 'emerald',
  FINANCE:         'amber',
  HR:              'info',
  ACADEMICS:       'glass',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminAuditLogsView: React.FC = () => {
  const [stats, setStats]               = useState<AdminAuditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [logs, setLogs]                 = useState<AdminAuditLog[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Filters
  const [search, setSearch]             = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Modals
  const [selectedLog, setSelectedLog]   = useState<AdminAuditLog | null>(null);
  const [printOpen, setPrintOpen]       = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const st = await adminAuditApi.getStats();
      setStats(st);
    } catch {
      // Graceful fallback
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch Audit Logs
  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAuditApi.list({
        page,
        limit: 15,
        search: search || undefined,
        module: moduleFilter || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load audit logs trail');
    } finally {
      setLoading(false);
    }
  }, [page, search, moduleFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLogs(), 280);
  }, [page, search, moduleFilter, fetchLogs]);

  // ── Export CSV Handler
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const csvRows = [
      'Timestamp,Action,Module,Actor Name,Actor Email,Actor Role,IP Address',
    ];

    logs.forEach(l => {
      csvRows.push(
        `"${formatDate(l.createdAt)}","${l.action}","${l.module}","${l.actorName}","${l.actorEmail || 'N/A'}","${l.actorRole || 'N/A'}","${l.ipAddress || 'N/A'}"`
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Harmony_College_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported audit trail to CSV successfully!', 'success');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Audit Logs & Compliance Trail"
        subtitle={`${total} logged administrative and security events across all modules`}
        icon={<Shield className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setPrintOpen(true)}>
              Print Compliance Report
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
              Export Audit CSV
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchStats(); fetchLogs(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPI label="Total Audit Entries"  value={stats.totalLogs}   color="text-(--text-primary)" />
          <MiniKPI label="Auth & Security Logs" value={stats.authLogs}    color="text-(--brand-gold)" />
          <MiniKPI label="Financial Actions"    value={stats.financeLogs} color="text-(--status-success)" />
          <MiniKPI label="HR & Staff Actions"   value={stats.hrLogs}      color="text-(--status-info)" />
        </div>
      )}

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search action, actor name, email, or IP address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: '', label: 'All Modules' },
            { id: 'AUTHENTICATION', label: 'Auth & Security' },
            { id: 'FINANCE', label: 'Finance' },
            { id: 'HR', label: 'HR & Payroll' },
            { id: 'ACADEMICS', label: 'Academics' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setModuleFilter(tab.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-sans text-xs font-semibold transition-all border ${
                moduleFilter === tab.id
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                  : 'text-(--text-secondary) hover:bg-(--hover-overlay) border-(--border-default)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} cols={6} />
      ) : error ? (
        <ErrorState compact description={error} onRetry={fetchLogs} />
      ) : logs.length === 0 ? (
        <EmptyState variant="reports" compact description="No audit log records match your filter criteria." />
      ) : (
        <>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs font-sans min-w-[850px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Action Event', 'Module', 'Actor / User', 'IP Address', 'Timestamp', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3 font-semibold text-(--text-primary)">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-(--brand-gold) shrink-0" />
                        <span className="font-mono text-xs text-(--text-primary)">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={MODULE_BADGE[log.module] ?? 'glass'}>{log.module}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-(--text-primary)">
                      {log.actorName}
                      <span className="block text-[11px] text-(--text-muted) font-mono">
                        {log.actorEmail ? log.actorEmail : (log.actorRole || 'SYSTEM')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelectedLog(log)}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-sans text-(--text-muted)">
              Showing {logs.length} of {total} audit records (Page {page} of {totalPages})
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </>
      )}

      {/* METADATA INSPECTOR MODAL */}
      <Modal isOpen={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} title="Audit Event Inspector">
        {selectedLog && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-4 rounded-xl bg-(--hover-overlay) border border-(--border-default) space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-(--brand-gold)">{selectedLog.action}</span>
                <Badge variant={MODULE_BADGE[selectedLog.module] ?? 'glass'}>{selectedLog.module}</Badge>
              </div>
              <p className="text-(--text-muted)">Recorded at {formatDate(selectedLog.createdAt)}</p>
            </div>

            <div className="space-y-2 border-t border-b border-(--border-subtle) py-3 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Actor Name:</span>
                <span className="text-(--text-primary) font-bold">{selectedLog.actorName}</span>
              </div>
              {selectedLog.actorEmail && (
                <div className="flex justify-between">
                  <span className="text-(--text-muted)">Actor Email:</span>
                  <span className="text-(--text-secondary)">{selectedLog.actorEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Actor Role:</span>
                <span className="text-(--text-secondary)">{selectedLog.actorRole || 'SYSTEM'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Request IP Address:</span>
                <span className="text-(--text-secondary)">{selectedLog.ipAddress || 'Internal / Direct'}</span>
              </div>
            </div>

            {Boolean(selectedLog.metadata) && (
              <div className="space-y-1">
                <label className="block text-xs font-mono text-(--text-muted) uppercase">Metadata Payload (JSON)</label>
                <pre className="p-3 rounded-xl bg-(--bg-card-solid) border border-(--border-default) font-mono text-[11px] text-(--brand-gold) overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* PRINT COMPLIANCE REPORT MODAL */}
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} title="Harmony College — Audit & Compliance Report">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                <p className="text-[11px] text-(--text-muted)">Official Security Audit & Compliance Log</p>
              </div>
              <div className="text-right font-mono text-[10px] text-(--text-muted)">
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">TOTAL LOGS</span>
                  <p className="font-bold text-(--text-primary)">{stats.totalLogs}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">AUTH EVENTS</span>
                  <p className="font-bold text-(--brand-gold)">{stats.authLogs}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">FINANCE ACTIONS</span>
                  <p className="font-bold text-(--status-success)">{stats.financeLogs}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">HR ACTIONS</span>
                  <p className="font-bold text-(--status-info)">{stats.hrLogs}</p>
                </div>
              </div>
            )}

            <div className="border-t border-b border-(--border-subtle) py-3 space-y-2">
              <span className="font-mono text-[10px] text-(--text-muted) uppercase">Recent Audit Trail Snapshot</span>
              {logs.slice(0, 5).map(l => (
                <div key={l.id} className="flex justify-between font-mono text-[11px]">
                  <span>{l.action} ({l.actorName})</span>
                  <span className="text-(--text-muted)">{formatDate(l.createdAt)}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-(--text-muted) italic">
              Official Immutable Audit Record generated for Institutional Compliance & Cyber Security Review.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrintOpen(false)}>Close</Button>
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Compliance Report</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
