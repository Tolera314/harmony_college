'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';
import { UserCheck, Search, Plus, Eye, Edit, ChevronLeft, ChevronRight, UserX, Trash2 } from 'lucide-react';
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
  adminInstructorsApi, adminDepartmentsApi,
  AdminInstructorRecord, ApiDepartment,
} from '../../../lib/adminApi';

// ── component ─────────────────────────────────────────────────────────────────

export const AdminFacultyView: React.FC = () => {
  // ── list state
  const [instructors, setInstructors] = useState<AdminInstructorRecord[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // ── filters
  const [search, setSearch]           = useState('');
  const [deptFilter, setDeptFilter]   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── detail panel
  const [selected, setSelected]         = useState<AdminInstructorRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── modals
  const [createOpen, setCreateOpen]         = useState(false);
  const [editTarget, setEditTarget]         = useState<AdminInstructorRecord | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AdminInstructorRecord | null>(null);
  const [actionLoading, setActionLoading]   = useState(false);
  const [formError, setFormError]           = useState('');

  // ── reference data
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);

  // ── create form
  const [cf, setCf] = useState({
    fullName: '', email: '', phone: '', password: '',
    employeeId: '', title: 'Instructor', specialization: '', departmentId: '',
  });
  // ── edit form
  const [ef, setEf] = useState({
    fullName: '', email: '', phone: '',
    title: '', specialization: '', departmentId: '', isActive: true,
  });

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── load reference data
  useEffect(() => {
    adminDepartmentsApi.list().then(setDepartments).catch(() => {});
  }, []);

  // ── fetch list
  const fetchInstructors = useCallback(async (
    p: number, s: string, d: string, active: string
  ) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, unknown> = { page: p, limit: 12, search: s };
      if (d)       params.departmentId = d;
      if (active)  params.isActive = active === 'active' ? 'true' : 'false';
      const res = await adminInstructorsApi.list(params);
      setInstructors(res.instructors); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load faculty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchInstructors(page, search, deptFilter, activeFilter);
    }, 280);
  }, [page, search, deptFilter, activeFilter, fetchInstructors]);

  // ── open detail
  const openDetail = async (inst: AdminInstructorRecord) => {
    setDetailLoading(true); setSelected(null);
    try {
      const detail = await adminInstructorsApi.getById(inst.id);
      setSelected(detail as AdminInstructorRecord);
    } catch {
      showToast('Failed to load instructor details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setActionLoading(true);
    try {
      await adminInstructorsApi.create({
        fullName:       cf.fullName,
        email:          cf.email || undefined,
        phone:          cf.phone || undefined,
        password:       cf.password,
        employeeId:     cf.employeeId || undefined,
        title:          cf.title || undefined,
        specialization: cf.specialization || undefined,
        departmentId:   cf.departmentId,
      });
      showToast('Instructor created', 'success');
      setCreateOpen(false);
      setCf({ fullName: '', email: '', phone: '', password: '', employeeId: '', title: 'Instructor', specialization: '', departmentId: '' });
      fetchInstructors(1, search, deptFilter, activeFilter);
      setPage(1);
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create instructor');
    } finally {
      setActionLoading(false);
    }
  };

  // ── edit
  const openEdit = (inst: AdminInstructorRecord) => {
    setEf({
      fullName:       inst.user.fullName,
      email:          inst.user.email ?? '',
      phone:          inst.user.phone ?? '',
      title:          inst.title,
      specialization: inst.specialization ?? '',
      departmentId:   inst.department.id,
      isActive:       inst.isActive,
    });
    setEditTarget(inst); setFormError('');
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setFormError(''); setActionLoading(true);
    try {
      await adminInstructorsApi.update(editTarget.id, {
        fullName:       ef.fullName       || undefined,
        email:          ef.email          || undefined,
        phone:          ef.phone          || undefined,
        title:          ef.title          || undefined,
        specialization: ef.specialization || undefined,
        departmentId:   ef.departmentId   || undefined,
        isActive:       ef.isActive,
      });
      showToast('Instructor updated', 'success');
      setEditTarget(null);
      fetchInstructors(page, search, deptFilter, activeFilter);
    } catch (e: any) {
      setFormError(e.message ?? 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── deactivate
  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    setActionLoading(true);
    try {
      await adminInstructorsApi.deactivate(confirmDeactivate.id);
      showToast('Instructor deactivated', 'success');
      setConfirmDeactivate(null);
      fetchInstructors(page, search, deptFilter, activeFilter);
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Faculty"
        subtitle={`${total} total instructors`}
        icon={<UserCheck className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
            onClick={() => { adminDepartmentsApi.list().then(setDepartments).catch(() => {}); setCreateOpen(true); setFormError(''); }}>
            Add Instructor
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by name, employee ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} className="bg-(--bg-card-solid)" value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Status</option>
          <option className="bg-(--bg-card-solid)" value="active">Active</option>
          <option className="bg-(--bg-card-solid)" value="inactive">Inactive</option>
        </select>
      </div>

      {/* Grid or table view */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-(--hover-overlay) shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-(--hover-overlay) rounded w-3/4" />
                  <div className="h-2 bg-(--hover-overlay) rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState compact description={error}
          onRetry={() => fetchInstructors(page, search, deptFilter, activeFilter)} />
      ) : instructors.length === 0 ? (
        <EmptyState variant="faculty" compact />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {instructors.map(inst => (
            <motion.div
              key={inst.id}
              whileHover={GESTURE.cardHover}
              className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4 space-y-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-base font-serif">
                    {inst.user.fullName.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-(--bg-base) ${inst.isActive ? 'bg-(--status-success)' : 'bg-(--active-overlay)'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-(--text-primary) truncate">{inst.user.fullName}</p>
                  <Badge variant={inst.title.toLowerCase().includes('professor') ? 'gold' : 'glass'} className="mt-1 text-[10px]">
                    {inst.title}
                  </Badge>
                </div>
              </div>
              {inst.specialization && (
                <p className="font-sans text-xs text-(--text-muted) truncate">{inst.specialization}</p>
              )}
              <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                <span>{inst.department.code}</span>
                <span>{inst.employeeId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-(--text-faint)">
                  {inst._count.offerings} offering{inst._count.offerings !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openDetail(inst)}
                    className="p-1 rounded hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                    aria-label="View">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(inst)}
                    className="p-1 rounded hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                    aria-label="Edit">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {inst.isActive && (
                    <button
                      onClick={() => setConfirmDeactivate(inst)}
                      className="p-1 rounded hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors"
                      aria-label="Delete"
                      title="Delete Faculty">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} instructors · Page {page} of {totalPages}</p>
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
        subtitle={selected ? `${selected.employeeId} · ${selected.department.name}` : ''}
        width="max-w-lg"
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
                <Badge variant={selected.isActive ? 'emerald' : 'glass'}>{selected.isActive ? 'Active' : 'Inactive'}</Badge>
                <Badge variant="gold" className="text-[10px]">{selected.title}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',          selected.user.email ?? '—'],
                ['Phone',          selected.user.phone ?? '—'],
                ['Employee ID',    selected.employeeId],
                ['Department',     selected.department.name],
                ['Specialization', selected.specialization ?? '—'],
                ['Offerings',      selected._count.offerings],
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
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Instructor" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label="Full Name" required value={cf.fullName} onChange={e => setCf({ ...cf, fullName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={cf.email} onChange={e => setCf({ ...cf, email: e.target.value })} />
            <Input label="Phone" value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} />
          </div>
          <Input label="Password" type="password" required value={cf.password} onChange={e => setCf({ ...cf, password: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID (optional)" value={cf.employeeId} onChange={e => setCf({ ...cf, employeeId: e.target.value })} />
            <Input label="Title" value={cf.title} onChange={e => setCf({ ...cf, title: e.target.value })} />
          </div>
          <Input label="Specialization" value={cf.specialization} onChange={e => setCf({ ...cf, specialization: e.target.value })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department *</label>
            <select required value={cf.departmentId} onChange={e => setCf({ ...cf, departmentId: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">Select department</option>
              {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.user.fullName}`} maxWidth="max-w-md">
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label="Full Name" value={ef.fullName} onChange={e => setEf({ ...ef, fullName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={ef.email} onChange={e => setEf({ ...ef, email: e.target.value })} />
            <Input label="Phone" value={ef.phone} onChange={e => setEf({ ...ef, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title" value={ef.title} onChange={e => setEf({ ...ef, title: e.target.value })} />
            <Input label="Specialization" value={ef.specialization} onChange={e => setEf({ ...ef, specialization: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department</label>
            <select value={ef.departmentId} onChange={e => setEf({ ...ef, departmentId: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-(--text-secondary)">Active</label>
            <input type="checkbox" checked={ef.isActive} onChange={e => setEf({ ...ef, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-(--border-default) accent-(--brand-gold)" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal isOpen={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)} title="Delete Instructor" maxWidth="max-w-sm">
        {confirmDeactivate && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">
              Are you sure you want to delete instructor <span className="font-semibold text-(--text-primary)">{confirmDeactivate.user.fullName}</span>?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDeactivate(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" disabled={actionLoading} onClick={handleDeactivate}>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
