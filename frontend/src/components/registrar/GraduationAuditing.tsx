'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, GraduationCap, CheckCircle2, XCircle, Play } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { graduationApi, studentsApi } from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = {
  PENDING: 'amber', ELIGIBLE: 'emerald', APPROVED: 'gold',
  REJECTED: 'rose', GRADUATED: 'glass',
};

export const GraduationAuditing: React.FC = () => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setSF]   = useState('');
  const [page, setPage]         = useState(1);
  const searchTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setAL]  = useState<string | null>(null);
  const [notes, setNotes]       = useState('');
  const [runTarget, setRT]      = useState('');

  const load = useCallback(async (pg = page, q = search, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await graduationApi.list({ page: pg, limit: 15, ...(q && { search: q }), ...(st && { status: st }) });
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

  const doAction = async (id: string, action: 'approve' | 'reject') => {
    setAL(id);
    try {
      await (action === 'approve' ? graduationApi.approve(id, notes) : graduationApi.reject(id, notes));
      setNotes(''); setSelected(null); await load(page, search, statusFilter);
    } catch { /* silently */ }
    finally { setAL(null); }
  };

  const runAudit = async (studentRecordId: string) => {
    setRT(studentRecordId);
    try { await graduationApi.runAudit(studentRecordId); await load(page, search, statusFilter); }
    catch { /* silently */ }
    finally { setRT(''); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Graduation Auditing</h2>
          <p className="text-xs text-(--text-muted)">Compute degree eligibility and approve graduation from real academic data.</p>
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
          {['PENDING', 'ELIGIBLE', 'APPROVED', 'REJECTED', 'GRADUATED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-x-auto border ds-card rounded-2xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Credits</th>
                <th className="px-5 py-4">GPA</th>
                <th className="px-5 py-4">Eligible</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.audits ?? []).map((audit: any) => (
                <tr key={audit.id} className="ds-table-row transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-(--text-primary)">{audit.studentRecord?.user?.fullName}</p>
                    <p className="text-[10px] font-mono text-(--text-faint)">{audit.studentRecord?.studentId}</p>
                  </td>
                  <td className="px-5 py-4 text-(--text-secondary) max-w-[140px] truncate">{audit.studentRecord?.program?.name}</td>
                  <td className="px-5 py-4 font-mono">
                    <span className="text-(--text-primary) font-semibold">{audit.completedCredits}</span>
                    <span className="text-(--text-faint)">/{audit.requiredCredits}</span>
                  </td>
                  <td className="px-5 py-4 font-mono">
                    <span className={`font-semibold ${audit.currentGpa >= audit.requiredGpa ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                      {audit.currentGpa?.toFixed(2)}
                    </span>
                    <span className="text-(--text-faint)">/{audit.requiredGpa?.toFixed(1)}</span>
                  </td>
                  <td className="px-5 py-4">
                    {audit.isEligible
                      ? <CheckCircle2 className="w-4 h-4 text-(--status-success)" />
                      : <XCircle className="w-4 h-4 text-(--status-danger)" />}
                  </td>
                  <td className="px-5 py-4"><Badge variant={STATUS_BADGE[audit.status] ?? 'glass'}>{audit.status}</Badge></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => runAudit(audit.studentRecordId)} disabled={runTarget === audit.studentRecordId}
                        className="px-2.5 py-1.5 bg-(--hover-overlay) border border-(--border-default) rounded-lg text-[10px] hover:text-(--brand-gold) transition-all flex items-center gap-1">
                        <Play className="w-3 h-3" /> {runTarget === audit.studentRecordId ? '…' : 'Re-run'}
                      </button>
                      {audit.status === 'ELIGIBLE' && (
                        <button onClick={() => setSelected(audit)}
                          className="px-2.5 py-1.5 bg-(--accent-gold-subtle) border border-(--brand-gold)/30 rounded-lg text-[10px] text-(--brand-gold) hover:opacity-80 transition-all">
                          Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.audits ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="default" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} audits · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Review panel */}
      {selected && (
        <div className="ds-card p-6 rounded-2xl space-y-4 border border-(--brand-gold)/30">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">
              Review: {selected.studentRecord?.user?.fullName}
            </h3>
            <button onClick={() => setSelected(null)} className="text-xs text-(--text-faint) hover:text-(--text-primary)">Close</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="text-(--text-faint) text-[10px] mb-1">Credits</p>
              <p className="font-semibold">{selected.completedCredits} / {selected.requiredCredits}</p>
            </div>
            <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="text-(--text-faint) text-[10px] mb-1">GPA</p>
              <p className="font-semibold">{selected.currentGpa?.toFixed(2)} / {selected.requiredGpa?.toFixed(1)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Audit Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal review notes..."
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none focus:border-(--brand-gold)" />
          </div>
          <div className="flex gap-3">
            <Button variant="gold" size="sm" className="flex-1 flex items-center justify-center gap-1.5"
              disabled={actionLoading === selected.id} onClick={() => doAction(selected.id, 'approve')}>
              <CheckCircle2 className="w-4 h-4" /> {actionLoading === selected.id ? 'Processing…' : 'Approve Graduation'}
            </Button>
            <Button variant="rose" size="sm" className="flex-1 flex items-center justify-center gap-1.5"
              disabled={actionLoading === selected.id} onClick={() => doAction(selected.id, 'reject')}>
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
