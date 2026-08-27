'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  GraduationCap, Search, Plus, Eye, Edit, ChevronLeft, ChevronRight,
  UserX, RotateCcw, X,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import {
  SkeletonTable, EmptyState, ErrorState, InlineError,
  useToast, ToastContainer,
} from '../../ui/States';
import {
  adminStudentsApi, adminDepartmentsApi, adminProgramsApi,
  AdminStudentRecord, ApiDepartment, ApiProgram,
} from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

const STUDENT_STATUS_BADGE: Record<string, 'emerald' | 'amber' | 'rose' | 'glass' | 'gold'> = {
  ACTIVE:    'emerald',
  ON_LEAVE:  'gold',
  SUSPENDED: 'amber',
  GRADUATED: 'glass',
  WITHDRAWN: 'rose',
};
const STUDENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', ON_LEAVE: 'On Leave', SUSPENDED: 'Suspended',
  GRADUATED: 'Graduated', WITHDRAWN: 'Withdrawn',
};

function GpaBadge({ gpa }: { gpa: number }) {
  const variant = gpa >= 3.5 ? 'emerald' : gpa >= 3.0 ? 'gold' : gpa >= 2.0 ? 'amber' : 'rose';
  return <Badge variant={variant} className="text-[10px]">{gpa.toFixed(2)}</Badge>;
}

const STUDENT_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN'] as const;

// ── component ─────────────────────────────────────────────────────────────────

export const AdminStudentsView: React.FC = () => {
  // ── list state
  const [students, setStudents]     = useState<AdminStudentRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // ── filters
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [deptFilter, setDeptFilter]       = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── detail panel
  const [selected, setSelected]         = useState<AdminStudentRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── modals
  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<AdminStudentRecord | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<AdminStudentRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError]       = useState('');

  // ── reference data
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [programs, setPrograms]       = useState<ApiProgram[]>([]);

  // ── create form
  const [cf, setCf] = useState({
    fullName: '', email: '', phone: '', password: '',
    programId: '', departmentId: '', studentId: '', yearLevel: '1',
  });
  // ── edit form
  const [ef, setEf] = useState({
    fullName: '', email: '', phone: '', status: '',
    programId: '', departmentId: '', yearLevel: '',
  });

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── load reference data once
  useEffect(() => {
    adminDepartmentsApi.list().then(setDepartments).catch(() => {});
    adminProgramsApi.list().then(setPrograms).catch(() => {});
  }, []);

  // ── fetch list
  const fetchStudents = useCallback(async (
    p: number, s: string, st: string, d: string, pr: string
  ) => {
    setLoading(true); setError('');
    try {
      const res = await adminStudentsApi.list({
        page: p, limit: 10, search: s, status: st,
        departmentId: d, programId: pr,
      });
      setStudents(res.students); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchStudents(page, search, statusFilter, deptFilter, programFilter);
    }, 280);
  }, [page, search, statusFilter, deptFilter, programFilter, fetchStudents]);

  // ── open detail
  const openDetail = async (s: AdminStudentRecord) => {
    setDetailLoading(true); setSelected(null);
    try {
      const detail = await adminStudentsApi.getById(s.id);
      setSelected(detail as AdminStudentRecord);
    } catch {
      showToast('Failed to load student details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setActionLoading(true);
    try {
      await adminStudentsApi.create({
        fullName:     cf.fullName,
        email:        cf.email || undefined,
        phone:        cf.phone || undefined,
        password:     cf.password,
        programId:    cf.programId,
        departmentId: cf.departmentId,
        studentId:    cf.studentId || undefined,
        yearLevel:    parseInt(cf.yearLevel, 10) || 1,
      });
      showToast('Student account created', 'success');
      setCreateOpen(false);
      setCf({ fullName: '', email: '', phone: '', password: '', programId: '', departmentId: '', studentId: '', yearLevel: '1' });
      fetchStudents(1, search, statusFilter, deptFilter, programFilter);
      setPage(1);
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create student');
    } finally {
      setActionLoading(false);
    }
  };

  // ── edit
  const openEdit = (s: AdminStudentRecord) => {
    setEf({
      fullName:     s.user.fullName,
      email:        s.user.email ?? '',
      phone:        s.user.phone ?? '',
      status:       s.status,
      programId:    s.program?.id ?? '',
      departmentId: s.department?.id ?? '',
      yearLevel:    String(s.yearLevel),
    });
    setEditTarget(s); setFormError('');
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setFormError(''); setActionLoading(true);
    try {
      await adminStudentsApi.update(editTarget.id, {
        fullName:     ef.fullName   || undefined,
        email:        ef.email      || undefined,
        phone:        ef.phone      || undefined,
        status:       ef.status     || undefined,
        programId:    ef.programId  || undefined,
        departmentId: ef.departmentId || undefined,
        yearLevel:    ef.yearLevel ? parseInt(ef.yearLevel, 10) : undefined,
      });
      showToast('Student updated', 'success');
      setEditTarget(null);
      fetchStudents(page, search, statusFilter, deptFilter, programFilter);
    } catch (e: any) {
      setFormError(e.message ?? 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── suspend
  const handleSuspend = async () => {
    if (!confirmSuspend) return;
    setActionLoading(true);
    try {
      await adminStudentsApi.suspend(confirmSuspend.id);
      showToast('Student suspended', 'success');
      setConfirmSuspend(null);
      fetchStudents(page, search, statusFilter, deptFilter, programFilter);
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── filter programs based on selected dept
  const filteredPrograms = deptFilter
    ? programs.filter(p => p.departmentId === deptFilter)
    : programs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Students"
        subtitle={`${total} total students`}
        icon={<GraduationCap className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
            onClick={() => { setCreateOpen(true); setFormError(''); }}>
            Add Student
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Statuses</option>
          {STUDENT_STATUSES.map(s => (
            <option key={s} className="bg-(--bg-card-solid)" value={s}>{STUDENT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setProgramFilter(''); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} className="bg-(--bg-card-solid)" value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={programFilter}
          onChange={e => { setProgramFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Programs</option>
          {filteredPrograms.map(p => (
            <option key={p.id} className="bg-(--bg-card-solid)" value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={8} cols={7} /> : error ? (
        <ErrorState compact description={error}
          onRetry={() => fetchStudents(page, search, statusFilter, deptFilter, programFilter)} />
      ) : students.length === 0 ? (
        <EmptyState variant="students" compact />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Student', 'Program', 'Dept', 'Year', 'GPA', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {students.map(s => (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-xs shrink-0">
                        {s.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary) text-xs">{s.user.fullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--brand-gold)">{s.program?.code ?? '—'}</td>
                  <td className="px-4 py-3.5 text-(--text-secondary) text-xs max-w-[120px] truncate">{s.department?.code ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary) text-center">{s.yearLevel}</td>
                  <td className="px-4 py-3.5"><GpaBadge gpa={s.gpa} /></td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STUDENT_STATUS_BADGE[s.status] ?? 'glass'}>
                      {STUDENT_STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDetail(s)}
                        className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                        aria-label="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                        aria-label="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {s.status === 'ACTIVE' && (
                        <button
                          onClick={() => setConfirmSuspend(s)}
                          className="p-1.5 rounded-lg hover:bg-(--status-warning-bg) text-(--text-muted) hover:text-(--status-warning) transition-colors"
                          aria-label="Suspend">
                          <UserX className="w-3.5 h-3.5" />
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
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} students · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      <SlidePanel
        isOpen={!!selected || detailLoading}
        onClose={() => setSelected(null)}
        title={selected?.user.fullName ?? 'Loading...'}
        subtitle={selected ? `${selected.studentId} · Year ${selected.yearLevel}` : ''}
        width="max-w-xl"
      >
        {detailLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-(--hover-overlay) rounded-xl" />)}
          </div>
        ) : selected && (
          <div className="space-y-5 font-sans text-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-2xl font-serif">
                {selected.user.fullName.charAt(0)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={STUDENT_STATUS_BADGE[selected.status] ?? 'glass'}>
                  {STUDENT_STATUS_LABELS[selected.status] ?? selected.status}
                </Badge>
                <GpaBadge gpa={selected.gpa} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',        selected.user.email ?? '—'],
                ['Phone',        selected.user.phone ?? '—'],
                ['Student ID',   selected.studentId],
                ['Year Level',   `Year ${selected.yearLevel}`],
                ['GPA',          selected.gpa.toFixed(2)],
                ['Credits',      selected.totalCredits],
                ['Program',      selected.program?.name ?? '—'],
                ['Department',   selected.department?.name ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Student" maxWidth="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label="Full Name" required value={cf.fullName} onChange={e => setCf({ ...cf, fullName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={cf.email} onChange={e => setCf({ ...cf, email: e.target.value })} />
            <Input label="Phone" value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} />
          </div>
          <Input label="Password" type="password" required value={cf.password} onChange={e => setCf({ ...cf, password: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Student ID (optional)" value={cf.studentId} onChange={e => setCf({ ...cf, studentId: e.target.value })} />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Year Level</label>
              <select value={cf.yearLevel} onChange={e => setCf({ ...cf, yearLevel: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department *</label>
            <select required value={cf.departmentId} onChange={e => setCf({ ...cf, departmentId: e.target.value, programId: '' })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">Select department</option>
              {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Program *</label>
            <select required value={cf.programId} onChange={e => setCf({ ...cf, programId: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">Select program</option>
              {programs.filter(p => p.isActive && (!cf.departmentId || p.departmentId === cf.departmentId))
                .map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.user.fullName}`} maxWidth="max-w-lg">
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label="Full Name" value={ef.fullName} onChange={e => setEf({ ...ef, fullName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={ef.email} onChange={e => setEf({ ...ef, email: e.target.value })} />
            <Input label="Phone" value={ef.phone} onChange={e => setEf({ ...ef, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Status</label>
              <select value={ef.status} onChange={e => setEf({ ...ef, status: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {STUDENT_STATUSES.map(s => <option key={s} value={s}>{STUDENT_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Year Level</label>
              <select value={ef.yearLevel} onChange={e => setEf({ ...ef, yearLevel: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department</label>
            <select value={ef.departmentId} onChange={e => setEf({ ...ef, departmentId: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">Keep current</option>
              {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Program</label>
            <select value={ef.programId} onChange={e => setEf({ ...ef, programId: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">Keep current</option>
              {programs.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Suspend Modal */}
      <Modal isOpen={!!confirmSuspend} onClose={() => setConfirmSuspend(null)} title="Confirm Suspension" maxWidth="max-w-sm">
        {confirmSuspend && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">
              Suspend <span className="font-semibold text-(--text-primary)">{confirmSuspend.user.fullName}</span>?
              Their account will be deactivated and sessions revoked.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmSuspend(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" disabled={actionLoading} onClick={handleSuspend}>
                {actionLoading ? 'Working...' : 'Suspend'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
