'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, ShieldCheck, ShieldX, Award } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { SlidePanel } from '../ui/SlidePanel';
import { certificatesApi, studentsApi } from '@/src/lib/registrarApi';

export const DigitalCertificates: React.FC = () => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setSF]   = useState('');
  const [page, setPage]         = useState(1);
  const searchTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [revokeTarget, setRT]   = useState<any>(null);
  const [revokeReason, setRR]   = useState('');
  const [actionLoading, setAL]  = useState<string | null>(null);
  const [actionError, setAE]    = useState<string | null>(null);

  // Issue panel
  const [issuePanel, setIP]     = useState(false);
  const [studentSearch, setSS]  = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [issueLoading, setIL]   = useState(false);
  const [issueError, setIE]     = useState<string | null>(null);

  const load = useCallback(async (pg = page, q = search, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await certificatesApi.list({ page: pg, limit: 15, ...(q && { search: q }), ...(st && { status: st }) });
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

  const handleRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setAL(revokeTarget.id); setAE(null);
    try {
      await certificatesApi.revoke(revokeTarget.id, revokeReason);
      setRT(null); setRR(''); await load(page, search, statusFilter);
    } catch (e: unknown) { setAE(e instanceof Error ? e.message : 'Revocation failed'); }
    finally { setAL(null); }
  };

  const searchStudents = async (q: string) => {
    setSS(q);
    if (q.trim().length < 2) { setStudents([]); return; }
    try {
      const res = await studentsApi.list({ search: q, limit: 8, status: 'GRADUATED' });
      setStudents(res.students);
    } catch { setStudents([]); }
  };

  const handleIssue = async (studentRecordId: string) => {
    setIL(true); setIE(null);
    try {
      await certificatesApi.issue(studentRecordId);
      setIP(false); setSS(''); setStudents([]);
      await load(page, search, statusFilter);
    } catch (e: unknown) { setIE(e instanceof Error ? e.message : 'Issue failed'); }
    finally { setIL(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Digital Certificates</h2>
          <p className="text-xs text-(--text-muted)">Issue, manage, and verify academic certificates from PostgreSQL.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => load(page, search, statusFilter)}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button variant="gold" size="sm" onClick={() => { setIP(true); setIE(null); }} className="flex items-center gap-1.5 text-xs">
            <Award className="w-4 h-4" /> Issue Certificate
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search certificates..."
            className="w-full pl-9 pr-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={statusFilter} onChange={e => { setSF(e.target.value); setPage(1); load(1, search, e.target.value); }}
          className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Statuses</option>
          <option value="ISSUED">Issued</option>
          <option value="REVOKED">Revoked</option>
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
                <th className="px-5 py-4">Certificate #</th>
                <th className="px-5 py-4">Verification Code</th>
                <th className="px-5 py-4">Issued</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.certificates ?? []).map((cert: any) => (
                <tr key={cert.id} className="ds-table-row transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-(--text-primary)">{cert.studentRecord?.user?.fullName}</p>
                    <p className="text-[10px] font-mono text-(--text-faint)">{cert.studentRecord?.studentId ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-(--text-secondary) max-w-[140px] truncate">{cert.studentRecord?.program?.name}</td>
                  <td className="px-5 py-4 font-mono text-[11px] text-(--brand-gold)">{cert.certificateNumber}</td>
                  <td className="px-5 py-4 font-mono text-[10px] text-(--text-faint) max-w-[120px] truncate">{cert.verificationCode}</td>
                  <td className="px-5 py-4 font-mono text-(--text-muted)">{new Date(cert.issuedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <Badge variant={cert.status === 'ISSUED' ? 'emerald' : 'rose'}>{cert.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {cert.status === 'ISSUED' && (
                      <button onClick={() => { setRT(cert); setRR(''); setAE(null); }}
                        className="px-2.5 py-1.5 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-lg text-[10px] text-(--status-danger) hover:opacity-80 transition-all">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.certificates ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="certificates" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} certificates · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Issue Certificate Panel */}
      <SlidePanel isOpen={issuePanel} onClose={() => setIP(false)}
        title="Issue Digital Certificate" subtitle="Digital Certificates" width="max-w-md">
        <div className="space-y-4 font-sans">
          {issueError && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{issueError}</div>}
          <p className="text-xs text-(--text-muted)">Search for a graduated student to issue their digital certificate.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input value={studentSearch} onChange={e => searchStudents(e.target.value)} placeholder="Search graduated students..."
              className="w-full pl-9 pr-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {students.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-(--text-primary)">{s.user.fullName}</p>
                  <p className="text-[10px] font-mono text-(--text-faint)">{s.studentId} · {s.program.name}</p>
                </div>
                <Button variant="gold" size="sm" disabled={issueLoading} onClick={() => handleIssue(s.id)}>
                  {issueLoading ? '…' : 'Issue'}
                </Button>
              </div>
            ))}
            {studentSearch.length >= 2 && students.length === 0 && (
              <p className="text-xs text-(--text-faint) text-center py-4">No graduated students found</p>
            )}
          </div>
        </div>
      </SlidePanel>

      {/* Revoke Panel */}
      <SlidePanel isOpen={!!revokeTarget} onClose={() => setRT(null)}
        title={`Revoke Certificate — ${revokeTarget?.studentRecord?.user?.fullName ?? ''}`}
        subtitle="Digital Certificates" width="max-w-md">
        {revokeTarget && (
          <div className="space-y-4 font-sans">
            {actionError && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{actionError}</div>}
            <div className="p-4 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger) flex items-center gap-2">
              <ShieldX className="w-4 h-4 shrink-0" />
              This action will permanently revoke certificate #{revokeTarget.certificateNumber}. It cannot be undone.
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Revocation Reason <span className="text-(--status-danger)">*</span></label>
              <input required value={revokeReason} onChange={e => setRR(e.target.value)}
                placeholder="Enter detailed reason for revocation..."
                className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none focus:border-(--status-danger)" />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setRT(null)}>Cancel</Button>
              <Button variant="rose" size="sm" className="flex-1" disabled={!revokeReason.trim() || actionLoading === revokeTarget?.id} onClick={handleRevoke}>
                {actionLoading === revokeTarget?.id ? 'Revoking…' : 'Confirm Revocation'}
              </Button>
            </div>
          </div>
        )}
      </SlidePanel>
    </motion.div>
  );
};
