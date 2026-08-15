'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Shield, RefreshCw, Filter } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { auditApi } from '@/src/lib/registrarApi';

const ACTION_BADGE: Record<string, any> = {
  ADMISSION_APPROVED: 'emerald', ADMISSION_REJECTED: 'rose', COURSE_CREATED: 'gold',
  COURSE_UPDATED: 'amber', OFFERING_CREATED: 'gold', OFFERING_UPDATED: 'amber',
  ENROLLMENT_ADDED: 'emerald', ENROLLMENT_DROPPED: 'rose',
  ENROLLMENT_FORCE_ADDED: 'amber', ENROLLMENT_FORCE_DROPPED: 'rose',
  STUDENT_SUSPENDED: 'rose', STUDENT_REACTIVATED: 'emerald',
  GRADUATION_APPROVED: 'emerald', GRADUATION_REJECTED: 'rose',
  CERTIFICATE_ISSUED: 'gold', CERTIFICATE_REVOKED: 'rose',
  TRANSCRIPT_GENERATED: 'glass', ANNOUNCEMENT_PUBLISHED: 'gold',
};

const ACTION_LABELS: Record<string, string> = {
  ADMISSION_APPROVED: 'Admission Approved', ADMISSION_REJECTED: 'Admission Rejected',
  ADMISSION_REVIEW_REQUESTED: 'Correction Requested', ADMISSION_COMMENT_ADDED: 'Comment Added',
  STUDENT_CREATED: 'Student Created', STUDENT_UPDATED: 'Student Updated',
  STUDENT_SUSPENDED: 'Student Suspended', STUDENT_REACTIVATED: 'Student Reactivated',
  COURSE_CREATED: 'Course Created', COURSE_UPDATED: 'Course Updated',
  COURSE_DEACTIVATED: 'Course Deactivated', COURSE_REACTIVATED: 'Course Reactivated',
  OFFERING_CREATED: 'Offering Created', OFFERING_UPDATED: 'Offering Updated',
  OFFERING_CANCELLED: 'Offering Cancelled',
  ENROLLMENT_ADDED: 'Enrollment Added', ENROLLMENT_DROPPED: 'Enrollment Dropped',
  ENROLLMENT_FORCE_ADDED: 'Force Add', ENROLLMENT_FORCE_DROPPED: 'Force Drop',
  TIMETABLE_CREATED: 'Timetable Created', TIMETABLE_UPDATED: 'Timetable Updated',
  TIMETABLE_DELETED: 'Timetable Deleted',
  TRANSCRIPT_GENERATED: 'Transcript Generated',
  TRANSCRIPT_REQUEST_APPROVED: 'Transcript Approved', TRANSCRIPT_REQUEST_REJECTED: 'Transcript Rejected',
  GRADUATION_APPROVED: 'Graduation Approved', GRADUATION_REJECTED: 'Graduation Rejected',
  CERTIFICATE_ISSUED: 'Certificate Issued', CERTIFICATE_REVOKED: 'Certificate Revoked',
  ANNOUNCEMENT_PUBLISHED: 'Announcement Published', ANNOUNCEMENT_ARCHIVED: 'Announcement Archived',
  CALENDAR_EVENT_CREATED: 'Calendar Event Created', CALENDAR_EVENT_UPDATED: 'Calendar Event Updated',
};

export const AuditLogsTimeline: React.FC = () => {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [actionFilter, setAF] = useState('');
  const [fromDate, setFrom]   = useState('');
  const [toDate, setTo]       = useState('');
  const [page, setPage]       = useState(1);
  const searchTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pg = page, q = search, action = actionFilter, from = fromDate, to = toDate) => {
    setLoading(true); setError(null);
    try {
      const res = await auditApi.list({ page: pg, limit: 20, ...(q && { search: q }), ...(action && { action }), ...(from && { from }), ...(to && { to }) });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally { setLoading(false); }
  }, [page, search, actionFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, actionFilter, fromDate, toDate), 350);
  };

  const allActions = Object.keys(ACTION_LABELS);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Audit Logs</h2>
          <p className="text-xs text-(--text-muted)">Write-once ledger of all registrar operations — real database records.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load(page, search, actionFilter, fromDate, toDate)}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Compliance banner */}
      <div className="flex items-start gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl text-xs text-(--status-warning)">
        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Audit logs represent an append-only ledger of privileged registrar operations. Records cannot be modified or deleted.</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ds-card p-4 rounded-2xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search descriptions..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={actionFilter} onChange={e => { setAF(e.target.value); setPage(1); load(1, search, e.target.value, fromDate, toDate); }}
          className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Actions</option>
          {allActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={fromDate} onChange={e => { setFrom(e.target.value); load(1, search, actionFilter, e.target.value, toDate); }}
            className="flex-1 px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)" />
          <input type="date" value={toDate} onChange={e => { setTo(e.target.value); load(1, search, actionFilter, fromDate, e.target.value); }}
            className="flex-1 px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
      </div>

      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-x-auto border ds-card rounded-2xl backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Entity</th>
                <th className="px-5 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.logs ?? []).map((log: any) => (
                <tr key={log.id} className="ds-table-row transition-colors">
                  <td className="px-5 py-4 font-mono text-[10px] text-(--text-faint) whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-(--text-primary)">{log.user?.fullName ?? 'System'}</p>
                    <p className="text-[10px] font-mono text-(--text-faint)">{log.user?.role ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={ACTION_BADGE[log.action] ?? 'glass'} className="text-[10px] whitespace-nowrap">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 font-mono text-[10px] text-(--brand-gold) bg-(--accent-gold-subtle) rounded-lg px-2 max-w-[100px] truncate">
                    {log.entityType}
                  </td>
                  <td className="px-5 py-4 text-xs text-(--text-secondary) max-w-[280px] truncate" title={log.description}>
                    {log.description}
                  </td>
                </tr>
              ))}
              {(data?.logs ?? []).length === 0 && (
                <tr><td colSpan={5} className="p-0"><EmptyState variant="audit" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} log entries · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
