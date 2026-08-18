'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Building2, Users, BookOpen, Plus, Edit } from 'lucide-react';
import { adminDepartmentsApi, ApiDepartment } from '../../../lib/adminApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';

export const AdminDepartmentsView: React.FC = () => {
  const [depts, setDepts]     = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // create modal
  const [createOpen, setCreateOpen]     = useState(false);
  const [createError, setCreateError]   = useState('');
  const [creating, setCreating]         = useState(false);
  const [cf, setCf] = useState({ name: '', code: '', description: '' });

  // edit modal
  const [editTarget, setEditTarget]   = useState<ApiDepartment | null>(null);
  const [editError, setEditError]     = useState('');
  const [editing, setEditing]         = useState(false);
  const [ef, setEf] = useState({ name: '', description: '', isActive: true });

  const { toast, show: showToast, hide: hideToast } = useToast();

  const fetchDepts = useCallback(async () => {
    setLoading(true); setError('');
    try { setDepts(await adminDepartmentsApi.list()); }
    catch (e: any) { setError(e.message ?? 'Failed to load departments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError(''); setCreating(true);
    try {
      await adminDepartmentsApi.create({ name: cf.name, code: cf.code, description: cf.description || undefined });
      showToast('Department created', 'success');
      setCreateOpen(false); setCf({ name: '', code: '', description: '' });
      fetchDepts();
    } catch (e: any) { setCreateError(e.message ?? 'Failed to create department'); }
    finally { setCreating(false); }
  };

  const openEdit = (d: ApiDepartment) => {
    setEf({ name: d.name, description: d.description ?? '', isActive: d.isActive });
    setEditTarget(d); setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editTarget) return;
    setEditError(''); setEditing(true);
    try {
      await adminDepartmentsApi.update(editTarget.id, {
        name: ef.name || undefined,
        description: ef.description || undefined,
        isActive: ef.isActive,
      });
      showToast('Department updated', 'success');
      setEditTarget(null); fetchDepts();
    } catch (e: any) { setEditError(e.message ?? 'Update failed'); }
    finally { setEditing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Departments"
        subtitle={`${depts.length} departments · ${depts.filter(d => d.isActive).length} active`}
        icon={<Building2 className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setCreateOpen(true); setCreateError(''); }}>Add Department</Button>}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} rows={3} />)}
        </div>
      ) : error ? (
        <ErrorState compact description={error} onRetry={fetchDepts} />
      ) : depts.length === 0 ? (
        <div className="text-center py-16 text-(--text-faint)">No departments found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {depts.map(dept => (
            <Card key={dept.id} hoverable className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={dept.isActive ? 'emerald' : 'glass'} className="text-[10px]">
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <button onClick={() => openEdit(dept)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit department">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-(--text-primary) leading-snug">{dept.name}</h3>
                <p className="font-mono text-[10px] text-(--brand-gold) mt-0.5">{dept.code}</p>
                {dept.description && <p className="font-sans text-xs text-(--text-muted) mt-1 line-clamp-2">{dept.description}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-sans">
                <div className="p-2 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono font-bold text-(--text-primary)">{dept._count.programs}</p>
                  <p className="font-mono text-[9px] uppercase text-(--text-faint) mt-0.5">Programs</p>
                </div>
                <div className="p-2 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono font-bold text-(--text-primary)">{dept._count.courses}</p>
                  <p className="font-mono text-[9px] uppercase text-(--text-faint) mt-0.5">Courses</p>
                </div>
                <div className="p-2 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono font-bold text-(--text-primary)">{dept._count.instructors}</p>
                  <p className="font-mono text-[9px] uppercase text-(--text-faint) mt-0.5">Staff</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Department" maxWidth="max-w-sm">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <InlineError message={createError} />}
          <Input label="Name" required value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} />
          <Input label="Code" required value={cf.code} onChange={e => setCf({ ...cf, code: e.target.value.toUpperCase() })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Description</label>
            <textarea rows={3} value={cf.description} onChange={e => setCf({ ...cf, description: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.name}`} maxWidth="max-w-sm">
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && <InlineError message={editError} />}
          <Input label="Name" value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Description</label>
            <textarea rows={3} value={ef.description} onChange={e => setEf({ ...ef, description: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="dept-active" checked={ef.isActive} onChange={e => setEf({ ...ef, isActive: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="dept-active" className="text-xs text-(--text-secondary)">Active</label>
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
