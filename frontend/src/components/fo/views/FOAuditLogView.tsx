'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Search, X, Download, Filter, CheckCircle2, AlertTriangle, XCircle, Eye, ShieldAlert, Laptop } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { SlidePanel } from '../../ui/SlidePanel';
import { FOAuditEntry } from '../../../types/finance';
import { getAuditLogs } from '../../../lib/foApi';

const statusConfig: Record<FOAuditEntry['status'], { icon: React.ReactNode; badge: 'emerald' | 'amber' | 'rose' }> = {
  Success: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-(--status-success)" />, badge: 'emerald' },
  Warning: { icon: <AlertTriangle className="w-3.5 h-3.5 text-(--status-warning)" />,  badge: 'amber'   },
  Failed:  { icon: <XCircle className="w-3.5 h-3.5 text-(--status-danger)" />,         badge: 'rose'    },
};

// ── Detail Slide-over Modal ───────────────────────────────────────────────────
function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: FOAuditEntry;
  onClose: () => void;
}) {
  return (
    <SlidePanel
      isOpen
      onClose={onClose}
      title="Audit Log Entry Details"
      subtitle="Finance Officer Audit System"
      width="max-w-md"
    >
      <div className="space-y-4 pt-2 font-sans">
        {/* Header Status Card */}
        <div className="flex items-center gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-default)">
          {statusConfig[entry.status].icon}
          <div>
            <p className="font-sans text-xs font-bold text-(--text-primary)">{entry.action}</p>
            <p className="font-mono text-[10px] text-(--text-faint)">{entry.id}</p>
          </div>
          <Badge variant={statusConfig[entry.status].badge} className="ml-auto">
            {entry.status}
          </Badge>
        </div>

        {/* Detailed Fields */}
        {[
          ['Timestamp',     `${entry.date} at ${entry.time}`],
          ['Finance Officer', `${entry.officerName} (${entry.officerId || 'SYS'})`],
          ['Target Student',  entry.studentName ? `${entry.studentName} (${entry.studentId || 'N/A'})` : 'N/A (System / Batch)'],
          ['Module',         entry.module],
          ['Amount Impact',  entry.amount != null ? `ETB ${entry.amount.toLocaleString()}` : 'N/A'],
          ['IP Address',     entry.ipAddress || '127.0.0.1'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center border-b border-(--border-subtle) pb-2.5">
            <span className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{label}</span>
            <span className={`font-sans text-xs ${label === 'Amount Impact' && entry.amount != null ? 'font-mono font-bold text-(--brand-gold)' : 'text-(--text-secondary)'}`}>
              {value}
            </span>
          </div>
        ))}

        {/* Audit Value Diffs */}
        {(entry.previousValue || entry.newValue) && (
          <div className="p-3 bg.(--hover-overlay)/40 border border-(--border-default) rounded-xl space-y-2">
            <p className="font-mono text-[10px] text-(--brand-gold) uppercase tracking-wider font-semibold">State Transformation Diff</p>
            {entry.previousValue && (
              <div>
                <span className="font-mono text-[10px] text-(--text-faint) block">PREVIOUS VALUE:</span>
                <p className="font-mono text-xs text-rose-400 bg-rose-950/20 p-2 rounded-lg mt-0.5 border border-rose-800/20 break-all">
                  {entry.previousValue}
                </p>
              </div>
            )}
            {entry.newValue && (
              <div>
                <span className="font-mono text-[10px] text-(--text-faint) block">NEW VALUE:</span>
                <p className="font-mono text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded-lg mt-0.5 border border-emerald-800/20 break-all">
                  {entry.newValue}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Main View Component ────────────────────────────────────────────────────────
export const FOAuditLogView: React.FC = () => {
  const [search, setSearch]             = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<FOAuditEntry['status'] | 'All'>('All');
  const [page, setPage]                 = useState(1);
  const [logs, setLogs]                 = useState<FOAuditEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [summary, setSummary]           = useState({ total: 0, successCount: 0, warningCount: 0, failedCount: 0 });
  const [detailEntry, setDetailEntry]   = useState<FOAuditEntry | null>(null);

  const PAGE_SIZE = 10;

  const modulesList = [
    'All',
    'Student Accounts',
    'Admissions & Verifications',
    'Reconciliation',
    'Payments & Collections',
    'Payment Gateways',
  ];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        search: search.trim() || undefined,
        module: moduleFilter !== 'All' ? moduleFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (res) {
        if (Array.isArray(res.auditLogs)) {
          setLogs(
            res.auditLogs.map((l: any) => ({
              id: l.id,
              date: l.date,
              time: l.time,
              officerName: l.actorName || l.officerName || 'Finance Officer',
              officerId: l.actorUserId || l.officerId || 'FO-01',
              studentName: l.studentName || undefined,
              studentId: l.studentId || undefined,
              action: l.action,
              module: l.module || 'Finance',
              amount: l.amount != null ? Number(l.amount) : undefined,
              previousValue: l.previousValue || undefined,
              newValue: l.newValue || undefined,
              status: l.status || 'Success',
              ipAddress: l.ipAddress || '127.0.0.1',
            }))
          );
        }
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);

        if (res.summary) {
          setSummary(res.summary);
        } else {
          setSummary({
            total: res.total || 0,
            successCount: (res.auditLogs || []).filter((l: any) => l.status === 'Success').length,
            warningCount: (res.auditLogs || []).filter((l: any) => l.status === 'Warning').length,
            failedCount: (res.auditLogs || []).filter((l: any) => l.status === 'Failed').length,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, [search, moduleFilter, statusFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export CSV function
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No audit logs available to export.');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Time',
      'Officer',
      'Officer ID',
      'Student Name',
      'Student ID',
      'Action',
      'Module',
      'Amount (ETB)',
      'Previous Value',
      'New Value',
      'Status',
      'IP Address',
    ];

    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.date}"`,
      `"${l.time}"`,
      `"${l.officerName}"`,
      `"${l.officerId}"`,
      `"${l.studentName || ''}"`,
      `"${l.studentId || ''}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.module}"`,
      l.amount != null ? l.amount : '',
      `"${(l.previousValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.ipAddress || '127.0.0.1'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finance_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Audit Log"
        subtitle="Complete chronological audit trail of finance officer activities and transactions"
        icon={<ClipboardList className="w-5 h-5" />}
        actions={
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
            Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Logs', value: summary.total || totalCount, color: 'text-(--text-primary)', bg: 'bg-(--hover-overlay)' },
          { label: 'Successful', value: summary.successCount, color: 'text-(--status-success)', bg: 'bg-(--status-success-bg)' },
          { label: 'Warnings',   value: summary.warningCount, color: 'text-(--status-warning)', bg: 'bg-(--status-warning-bg)' },
          { label: 'Failed',     value: summary.failedCount,  color: 'text-(--status-danger)',  bg: 'bg-(--status-danger-bg)' },
        ].map((s) => (
          <div key={s.label} className={`border border-(--border-default) rounded-2xl p-4 transition-all ${s.bg}`}>
            <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <Card hoverable={false} className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search action, officer, student, module, IP…"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2.5 font-sans text-xs sm:text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex gap-1.5 self-start sm:self-center">
            {(['All', 'Success', 'Warning', 'Failed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${
                  statusFilter === s
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border) font-bold'
                    : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Module Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-(--border-subtle)">
          <Filter className="w-3.5 h-3.5 text-(--text-faint) shrink-0" />
          {modulesList.map((m) => (
            <button
              key={m}
              onClick={() => { setModuleFilter(m); setPage(1); }}
              className={`px-3 py-1 rounded-full font-mono text-[11px] transition-all border ${
                moduleFilter === m
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border) font-medium'
                  : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-xs font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Date & Time', 'Officer', 'Student', 'Action Description', 'Module', 'Amount', 'Status', 'Inspect'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="p-4 h-12 bg-white/[0.02]" />
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <ClipboardList className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="font-sans text-sm text-(--text-faint)">No audit log entries match your criteria.</p>
                </td>
              </tr>
            ) : (
              logs.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setDetailEntry(e)}
                  className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <td className="p-4 font-mono text-xs text-(--text-muted) whitespace-nowrap">
                    {e.date}<br />
                    <span className="text-(--text-faint)">{e.time}</span>
                  </td>
                  <td className="p-4">
                    <p className="font-sans text-xs text-(--text-primary) font-medium whitespace-nowrap">{e.officerName}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">{e.officerId}</p>
                  </td>
                  <td className="p-4">
                    {e.studentName ? (
                      <>
                        <p className="font-sans text-xs text-(--text-secondary) whitespace-nowrap">{e.studentName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{e.studentId}</p>
                      </>
                    ) : (
                      <span className="text-(--text-faint) italic text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4 font-sans text-xs text-(--text-secondary) max-w-[200px]">
                    <span className="truncate block font-medium group-hover:text-(--brand-gold) transition-colors">{e.action}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-[10px] px-2.5 py-0.5 bg-(--hover-overlay) border border-(--border-default) rounded-full text-(--text-muted)">
                      {e.module}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-(--brand-gold) font-bold">
                    {e.amount != null ? `ETB ${e.amount.toLocaleString()}` : <span className="text-(--text-faint) font-normal">—</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {statusConfig[e.status]?.icon}
                      <Badge variant={statusConfig[e.status]?.badge || 'emerald'}>{e.status}</Badge>
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setDetailEntry(e); }}
                      title="Inspect Details"
                      className="p-1.5 rounded-lg bg-(--hover-overlay) hover:bg-(--accent-gold-subtle) text-(--text-faint) hover:text-(--brand-gold) transition-colors touch-target"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-xs text-(--text-faint)">
            Showing <span className="text-(--text-secondary) font-bold">{(page - 1) * PAGE_SIZE + 1}</span>–
            <span className="text-(--text-secondary) font-bold">{Math.min(page * PAGE_SIZE, totalCount)}</span> of{' '}
            <span className="text-(--text-secondary) font-bold">{totalCount}</span> entries
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${
                  p === page
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border) font-bold'
                    : 'text-(--text-faint) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                }`}
              >
                {p}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      <AnimatePresence>
        {detailEntry && <AuditDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
