'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, FileText, RefreshCw, CheckCircle2, XCircle, Download } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { transcriptsApi, studentsApi } from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = { PENDING: 'amber', PROCESSING: 'glass', ISSUED: 'emerald', REJECTED: 'rose' };

export const TranscriptServices: React.FC = () => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setSF]   = useState('');
  const [page, setPage]         = useState(1);
  const searchTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionLoading, setAL]  = useState<string | null>(null);
  const [preview, setPreview]   = useState<any>(null);
  const [previewLoading, setPL] = useState(false);

  const load = useCallback(async (pg = page, q = search, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await transcriptsApi.list({ page: pg, limit: 15, ...(q && { search: q }), ...(st && { status: st }) });
      setData(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, statusFilter), 350);
  };

  const doAction = async (id: string, action: 'approve' | 'reject' | 'issue', reason?: string) => {
    setAL(id);
    try {
      if (action === 'approve') await transcriptsApi.approve(id);
      else if (action === 'reject') await transcriptsApi.reject(id, reason ?? 'Rejected by registrar');
      else await transcriptsApi.issue(id);
      await load(page, search, statusFilter);
    } catch { /* silently */ }
    finally { setAL(null); }
  };

  const loadPreview = async (studentRecordId: string) => {
    setPL(true);
    try { setPreview(await transcriptsApi.getStudentData(studentRecordId)); }
    catch { setPreview(null); }
    finally { setPL(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Transcript Services</h2>
          <p className="text-xs text-(--text-muted)">Process and issue official transcripts from real academic records.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load(page, search, statusFilter)}><RefreshCw className="w-3.5 h-3.5" /></Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search by student name or ID..."
            className="w-full pl-9 pr-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={statusFilter} onChange={e => { setSF(e.target.value); setPage(1); load(1, search, e.target.value); }}
          className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Statuses</option>
          {['PENDING', 'PROCESSING', 'ISSUED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="space-y-4">
          {(data?.requests ?? []).length === 0 ? <EmptyState variant="documents" /> : (
            <div className="overflow-x-auto border ds-card rounded-2xl">
              <table className="w-full text-left text-xs font-sans">
                <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Program</th>
                    <th className="px-5 py-4">Purpose</th>
                    <th className="px-5 py-4">Requested</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y ds-table-row ds-table-cell">
                  {(data?.requests ?? []).map((req: any) => (
                    <tr key={req.id} className="ds-table-row transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-(--text-primary)">{req.studentRecord?.user?.fullName}</p>
                        <p className="text-[10px] font-mono text-(--text-faint)">{req.studentRecord?.studentId}</p>
                      </td>
                      <td className="px-5 py-4 text-(--text-secondary) max-w-[140px] truncate">{req.studentRecord?.program?.name}</td>
                      <td className="px-5 py-4 text-(--text-muted)">{req.purpose ?? '—'}</td>
                      <td className="px-5 py-4 font-mono text-(--text-faint)">{new Date(req.requestedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4"><Badge variant={STATUS_BADGE[req.status] ?? 'glass'}>{req.status}</Badge></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => loadPreview(req.studentRecordId)}
                            className="px-2.5 py-1.5 bg-(--hover-overlay) border border-(--border-default) rounded-lg text-[10px] hover:text-(--brand-gold) transition-all">
                            Preview
                          </button>
                          {req.status === 'PENDING' && (
                            <button onClick={() => doAction(req.id, 'approve')} disabled={actionLoading === req.id}
                              className="px-2.5 py-1.5 bg-(--status-success-bg) border border-(--status-success-border) rounded-lg text-[10px] text-(--status-success) hover:opacity-80 transition-all">
                              {actionLoading === req.id ? '…' : 'Approve'}
                            </button>
                          )}
                          {req.status === 'PROCESSING' && (
                            <button onClick={() => doAction(req.id, 'issue')} disabled={actionLoading === req.id}
                              className="px-2.5 py-1.5 bg-(--accent-gold-subtle) border border-(--brand-gold)/30 rounded-lg text-[10px] text-(--brand-gold) hover:opacity-80 transition-all">
                              {actionLoading === req.id ? '…' : 'Issue'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} requests · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Transcript Preview */}
      {previewLoading && <div className="text-center text-xs text-(--text-faint) py-8">Loading transcript data…</div>}
      {preview && !previewLoading && (
        <div className="ds-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Transcript Preview</h3>
            <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>Close</Button>
          </div>
          <div className="border border-(--border-default) rounded-xl p-6 bg-white/5 space-y-4 font-sans">
            <div className="text-center border-b border-(--border-subtle) pb-4">
              <p className="font-serif text-lg font-bold text-(--text-primary)">Harmony College</p>
              <p className="text-xs text-(--text-muted)">Official Academic Transcript</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><span className="text-(--text-faint)">Student: </span><span className="font-semibold text-(--text-primary)">{preview.student?.fullName}</span></div>
              <div><span className="text-(--text-faint)">ID: </span><span className="font-mono text-(--brand-gold)">{preview.student?.studentId}</span></div>
              <div><span className="text-(--text-faint)">Program: </span><span className="text-(--text-secondary)">{preview.student?.program}</span></div>
              <div><span className="text-(--text-faint)">Cumulative GPA: </span><span className="font-bold text-(--text-primary)">{preview.student?.gpa?.toFixed(2)}</span></div>
            </div>
            {(preview.semesters ?? []).map((sem: any, i: number) => (
              <div key={i} className="space-y-2">
                <p className="font-mono text-[10px] text-(--brand-gold) uppercase">{sem.academicYear} — {sem.semesterName}</p>
                {sem.courses.map((c: any, j: number) => (
                  <div key={j} className="flex justify-between text-xs text-(--text-secondary) py-1 border-b border-(--border-subtle) last:border-0">
                    <span className="font-mono">{c.code}</span>
                    <span className="flex-1 px-3 truncate">{c.name}</span>
                    <span className="w-8 text-right">{c.creditHours}cr</span>
                    <span className="w-8 text-right font-bold text-(--text-primary)">{c.grade}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
