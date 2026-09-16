'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Users, Search, Download, Eye, UserX, Edit, Plus,
  Phone, Mail, X, BookOpen, GraduationCap, TrendingUp
} from 'lucide-react';
import { DHPageHeader } from '../dh/DHPageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SlidePanel } from '../ui/SlidePanel';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import {
  studentsApi, coursesApi,
  type StudentListItem, type StudentListResponse, type CourseMeta,
} from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = {
  ACTIVE: 'emerald', ON_LEAVE: 'amber', SUSPENDED: 'rose', GRADUATED: 'glass', WITHDRAWN: 'rose',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', ON_LEAVE: 'On Leave', SUSPENDED: 'Suspended',
  GRADUATED: 'Graduated', WITHDRAWN: 'Withdrawn',
};

export const RegistrarStudentsView: React.FC = () => {
  const [data, setData]           = useState<StudentListResponse | null>(null);
  const [selected, setSelected]   = useState<StudentListItem & Record<string, any> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [meta, setMeta]           = useState<CourseMeta | null>(null);

  const [search, setSearch]       = useState('');
  const [programFilter, setPF]    = useState('');
  const [statusFilter, setSF]     = useState('');
  const [page, setPage]           = useState(1);
  const searchTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<StudentListItem | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  const load = useCallback(async (pg = page, q = search, prog = programFilter, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await studentsApi.list({ page: pg, limit: 10, search: q, programId: prog || undefined, status: st || undefined });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally { setLoading(false); }
  }, [page, search, programFilter, statusFilter]);

  useEffect(() => {
    load();
    coursesApi.getMeta().then(setMeta).catch(() => {});
  }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, programFilter, statusFilter), 350);
  };

  const openDetail = async (student: StudentListItem) => {
    setDetailLoading(true);
    try {
      const full = await studentsApi.getById(student.id);
      setSelected(full);
    } catch { setSelected(student as any); }
    finally { setDetailLoading(false); }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      await studentsApi.updateStatus(suspendTarget.id, 'SUSPENDED');
      await load(page, search, programFilter, statusFilter);
      if (selected?.id === suspendTarget.id) {
        const fresh = await studentsApi.getById(suspendTarget.id);
        setSelected(fresh);
      }
    } catch { /* silently fail */ }
    finally { setSuspendLoading(false); setSuspendTarget(null); }
  };

  const handleReactivate = async (student: StudentListItem) => {
    try {
      await studentsApi.updateStatus(student.id, 'ACTIVE');
      await load(page, search, programFilter, statusFilter);
      if (selected?.id === student.id) {
        const fresh = await studentsApi.getById(student.id);
        setSelected(fresh);
      }
    } catch { /* silently fail */ }
  };

  const activeCount = data?.students.filter(s => s.status === 'ACTIVE').length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      <DHPageHeader
        title="Student Records"
        subtitle={`${data?.total ?? '…'} students in database`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
              onClick={() => {
                if (!data) return;
                const csv = ['Student ID,Name,Email,Program,Year,Status,GPA']
                  .concat(data.students.map(s => `${s.studentId},"${s.user.fullName}",${s.user.email},"${s.program.name}",${s.yearLevel},${s.status},${s.gpa}`))
                  .join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = 'students.csv'; a.click();
              }}>
              Export
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => load(page, search, programFilter, statusFilter)}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search by name or ID..."
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={programFilter}
            onChange={e => { setPF(e.target.value); setPage(1); load(1, search, e.target.value, statusFilter); }}
            className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option value="">All Programs</option>
            {(meta?.programs ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter}
            onChange={e => { setSF(e.target.value); setPage(1); load(1, search, programFilter, e.target.value); }}
            className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans min-w-[900px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Student', 'Program', 'Year', 'GPA', 'Credits', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {(data?.students ?? []).length === 0 ? (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="students" compact /></td></tr>
              ) : (data?.students ?? []).map(student => (
                <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-(--brand-gold)/20 border border-(--brand-gold)/30 flex items-center justify-center font-serif font-bold text-sm text-(--brand-gold)">
                        {student.user.fullName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary) text-xs">{student.user.fullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{student.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-(--text-secondary) truncate max-w-[180px]">{student.program.name}</td>
                  <td className="px-4 py-3.5 text-xs text-(--text-secondary)">Year {student.yearLevel}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-primary) font-semibold">{student.gpa.toFixed(2)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">{student.totalCredits} cr</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_BADGE[student.status] ?? 'glass'}>
                      {STATUS_LABEL[student.status] ?? student.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDetail(student)}
                        className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {student.status === 'ACTIVE' && (
                        <button onClick={() => setSuspendTarget(student)}
                          className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors" aria-label="Suspend">
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                      {student.status === 'SUSPENDED' && (
                        <button onClick={() => handleReactivate(student)}
                          className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-(--text-muted) hover:text-(--status-success) transition-colors" aria-label="Reactivate">
                          <Users className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{data.total} students · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Student Detail — SlidePanel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)}
        title={selected?.user?.fullName ?? 'Student Profile'} subtitle="Student Record" width="max-w-2xl">
        {selected && (
          <div className="space-y-5 text-sm font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-(--border-subtle) pb-4">
              <div className="w-16 h-16 rounded-2xl bg-(--brand-gold)/20 border-2 border-(--brand-gold)/30 flex items-center justify-center font-serif font-bold text-2xl text-(--brand-gold)">
                {selected.user.fullName[0]}
              </div>
              <div>
                <p className="font-sans text-base font-bold text-(--text-primary)">{selected.user.fullName}</p>
                <p className="font-mono text-xs text-(--text-muted)">{selected.studentId}</p>
                <div className="mt-1.5">
                  <Badge variant={STATUS_BADGE[selected.status] ?? 'glass'}>{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Selected Program',  val: selected.user?.studentProfile?.program || selected.program?.name || '—' },
                { label: 'Program Type',      val: selected.user?.studentProfile?.programType ? `${selected.user.studentProfile.programType}${selected.user.studentProfile.shortProgramDuration ? ` (${selected.user.studentProfile.shortProgramDuration})` : ''}` : '—' },
                { label: 'Department',        val: selected.department?.name ?? '—' },
                { label: 'Year Level',        val: `Year ${selected.yearLevel}` },
                { label: 'Total Credits',     val: `${selected.totalCredits} cr` },
                { label: 'GPA',               val: selected.gpa?.toFixed(2) ?? '—' },
                { label: 'Matric Result',     val: selected.user?.studentProfile?.matricResult || '—' },
                { label: 'Ministry Result',   val: selected.user?.studentProfile?.ministryResult || '—' },
                { label: 'National ID',       val: selected.user?.studentProfile?.nationalId || '—' },
                { label: 'Admitted',          val: selected.admittedAt ? new Date(selected.admittedAt).toLocaleDateString() : '—' },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{item.label}</p>
                  <p className="text-(--text-primary) text-xs mt-1 font-semibold truncate">{item.val}</p>
                </div>
              ))}
            </div>

            {/* Academic Transcript Document */}
            {selected.user?.studentProfile?.transcriptUrl && (
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Academic Transcript</p>
                  <p className="text-xs text-(--text-primary) font-semibold mt-0.5">Official Transcript Document</p>
                </div>
                <a
                  href={selected.user.studentProfile.transcriptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)' }}
                >
                  View Document
                </a>
              </div>
            )}

            {/* Contact */}
            <div className="flex flex-col gap-2 bg-(--hover-overlay) p-3 rounded-xl border border-(--border-subtle)">
              <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
                <Mail className="w-3.5 h-3.5 text-(--brand-gold)" />
                <span>{selected.user.email}</span>
              </div>
              {selected.user.phone && (
                <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
                  <Phone className="w-3.5 h-3.5 text-(--brand-gold)" />
                  <span className="font-mono">{selected.user.phone}</span>
                </div>
              )}
            </div>

            {/* Current Enrollments */}
            {selected.enrollments?.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Current Enrollments</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selected.enrollments.filter((e: any) => e.status === 'ACTIVE' || e.status === 'FORCE_ADDED').map((enroll: any) => (
                    <div key={enroll.id} className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-(--brand-gold)" />
                        <div>
                          <p className="text-xs font-semibold text-(--text-primary)">
                            {enroll.courseOffering?.course?.code} · {enroll.courseOffering?.course?.name}
                          </p>
                          <p className="text-[10px] text-(--text-faint)">
                            {enroll.courseOffering?.semester?.name} · {enroll.courseOffering?.instructor?.user?.fullName ?? 'TBD'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="emerald" className="text-[10px]">{enroll.status.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Suspend Confirmation */}
      <ConfirmModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title="Suspend Student Account"
        message={`This will suspend ${suspendTarget?.user.fullName}. They will lose system access. Continue?`}
        icon={<UserX className="w-6 h-6" />}
        variant="danger"
        confirmLabel={suspendLoading ? 'Processing…' : 'Confirm Suspend'}
      />
    </motion.div>
  );
};

