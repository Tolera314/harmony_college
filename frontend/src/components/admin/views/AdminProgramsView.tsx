'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Search, Plus, Edit } from 'lucide-react';
import { adminProgramsApi, adminDepartmentsApi, ApiProgram, ApiDepartment } from '../../../lib/adminApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';

export const AdminProgramsView: React.FC = () => {
  const [programs, setPrograms]   = useState<ApiProgram[]>([]);
  const [depts, setDepts]         = useState<ApiDepartment[]>([]);
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // create modal
  const [createOpen, setCreateOpen]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating]       = useState(false);
  const [cf, setCf] = useState({ name: '', code: '', description: '', durationYears: 4, totalCredits: 120, departmentId: '' });

  // edit modal
  const [editTarget, setEditTarget]   = useState<ApiProgram | null>(null);
  const [editError, setEditError]     = useState('');
  const [editing, setEditing]         = useState(false);
  const [ef, setEf] = useState({ name: '', description: '', durationYears: 4, totalCredits: 120, isActive: true });

  const { toast, show: showToast, hide: hideToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, d] = await Promise.all([adminProgramsApi.list(deptFilter || undefined), adminDepartmentsApi.list()]);
      setPrograms(p); setDepts(d);
    } catch (e: any) { setError(e.message ?? 'Failed to load'); }
    finally { setLoading(false); }
  }, [deptFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = search
    ? programs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
    : programs;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError(''); setCreating(true);
    try {
      await adminProgramsApi.create({ ...cf, description: cf.description || undefined });
      showToast('Program created', 'success');
      setCreateOpen(false); setCf({ name: '', code: '', description: '', durationYears: 4, totalCredits: 120, departmentId: depts[0]?.id ?? '' });
      fetchData();
    } catch (e: any) { setCreateError(e.message ?? 'Create failed'); }
    finally { setCreating(false); }
  };

  const openEdit = (p: ApiProgram) => {
    setEf({ name: p.name, description: p.description ?? '', durationYears: p.durationYears, totalCredits: p.totalCredits, isActive: p.isActive });
    setEditTarget(p); setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editTarget) return;
    setEditError(''); setEditing(true);
    try {
      await adminProgramsApi.update(editTarget.id, {
        name: ef.name || undefined,
        description: ef.description || undefined,
        durationYears: ef.durationYears,
        totalCredits: ef.totalCredits,
        isActive: ef.isActive,
      });
      showToast('Program updated', 'success');
      setEditTarget(null); fetchData();
    } catch (e: any) { setEditError(e.message ?? 'Update failed'); }
    finally { setEditing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Programs"
        subtitle={`${programs.filter(p => p.isActive).length} active · ${programs.filter(p => !p.isActive).length} inactive`}
        icon={<BookOpen className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setCreateOpen(true); setCreateError(''); setCf({ ...cf, departmentId: depts[0]?.id ?? '' }); }}>Add Program</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search programs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading ? <SkeletonTable rows={6} cols={7} /> : error ? (
        <ErrorState compact description={error} onRetry={fetchData} />
      ) : filtered.length === 0 ? (
        <EmptyState variant="search" compact />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans min-w-[800px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Program', 'Code', 'Department', 'Duration', 'Credits', 'Students', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-(--text-primary) max-w-[180px] truncate">{p.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--brand-gold)">{p.code}</td>
                  <td className="px-4 py-3.5 text-(--text-secondary) max-w-[130px] truncate">{p.department?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{p.durationYears}yr</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{p.totalCredits}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">{p._count.studentRecords}</td>
                  <td className="px-4 py-3.5"><Badge variant={p.isActive ? 'emerald' : 'glass'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Program" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <InlineError message={createError} />}
          <Input label="Program Name" required value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} />
          <Input label="Code" required value={cf.code} onChange={e => setCf({ ...cf, code: e.target.value.toUpperCase() })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department <span className="text-(--status-danger)">*</span></label>
            <select required value={cf.departmentId} onChange={e => setCf({ ...cf, departmentId: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">Select department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Duration (years)</label>
              <input type="number" min={1} max={6} value={cf.durationYears} onChange={e => setCf({ ...cf, durationYears: +e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Total Credits</label>
              <input type="number" min={10} max={300} value={cf.totalCredits} onChange={e => setCf({ ...cf, totalCredits: +e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Description</label>
            <textarea rows={2} value={cf.description} onChange={e => setCf({ ...cf, description: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.name}`} maxWidth="max-w-md">
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && <InlineError message={editError} />}
          <Input label="Name" value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Duration (years)</label>
              <input type="number" min={1} max={6} value={ef.durationYears} onChange={e => setEf({ ...ef, durationYears: +e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Total Credits</label>
              <input type="number" min={10} max={300} value={ef.totalCredits} onChange={e => setEf({ ...ef, totalCredits: +e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Description</label>
            <textarea rows={2} value={ef.description} onChange={e => setEf({ ...ef, description: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="prog-active" checked={ef.isActive} onChange={e => setEf({ ...ef, isActive: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="prog-active" className="text-xs text-(--text-secondary)">Active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={editing}>{editing ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
