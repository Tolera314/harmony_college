'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Search, Plus, BookOpen, ChevronRight, ChevronDown,
  FileDown, Trash2, Edit, Check, X, RefreshCw
} from 'lucide-react';
import { EmptyState, SkeletonTable, ErrorState } from '../ui/States';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SlidePanel } from '../ui/SlidePanel';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  coursesApi, type CourseItem, type CoursesListResponse, type CourseMeta,
} from '@/src/lib/registrarApi';

export const CourseCatalog: React.FC = () => {
  const [data, setData]           = useState<CoursesListResponse | null>(null);
  const [meta, setMeta]           = useState<CourseMeta | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});

  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptF]    = useState('');
  const [page, setPage]           = useState(1);
  const searchTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CourseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseItem | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '', name: '', description: '', creditHours: 3,
    departmentId: '', prerequisiteIds: [] as string[],
  });

  const load = useCallback(async (pg = page, q = search, dept = deptFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await coursesApi.list({ page: pg, limit: 15, search: q, departmentId: dept || undefined });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally { setLoading(false); }
  }, [page, search, deptFilter]);

  useEffect(() => {
    load();
    coursesApi.getMeta().then(setMeta).catch(() => {});
  }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, deptFilter), 350);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ code: '', name: '', description: '', creditHours: 3, departmentId: meta?.departments[0]?.id ?? '', prerequisiteIds: [] });
    setSaveError(null);
    setPanelOpen(true);
  };

  const openEdit = (c: CourseItem) => {
    setEditTarget(c);
    setForm({
      code: c.code, name: c.name, description: c.description ?? '',
      creditHours: c.creditHours, departmentId: c.department.id,
      prerequisiteIds: c.prerequisites.map(p => p.prerequisite.id),
    });
    setSaveError(null);
    setPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveError(null);
    try {
      if (editTarget) {
        await coursesApi.update(editTarget.id, {
          name: form.name, description: form.description || undefined,
          creditHours: form.creditHours, departmentId: form.departmentId,
          prerequisiteIds: form.prerequisiteIds,
        });
      } else {
        await coursesApi.create({
          code: form.code.trim().toUpperCase(), name: form.name,
          description: form.description || undefined,
          creditHours: form.creditHours, departmentId: form.departmentId,
          prerequisiteIds: form.prerequisiteIds,
        });
      }
      setPanelOpen(false);
      await load(page, search, deptFilter);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (c: CourseItem) => {
    const next = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await coursesApi.setStatus(c.id, next);
      await load(page, search, deptFilter);
    } catch { /* silently fail */ }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const csv = ['Code,Name,Credits,Department,Status,Prerequisites']
      .concat(data.courses.map(c =>
        `${c.code},"${c.name}",${c.creditHours},"${c.department.name}",${c.status},"${c.prerequisites.map(p => p.prerequisite.code).join(';')}"`
      )).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'course_catalog.csv'; a.click();
  };

  const togglePrereq = (id: string) => {
    setForm(prev => ({
      ...prev,
      prerequisiteIds: prev.prerequisiteIds.includes(id)
        ? prev.prerequisiteIds.filter(x => x !== id)
        : [...prev.prerequisiteIds, id],
    }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Course Catalog</h2>
          <p className="text-xs text-(--text-muted)">Manage courses, prerequisites, and departmental structures.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1 text-xs">
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => load(page, search, deptFilter)} className="flex items-center gap-1 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="gold" size="sm" onClick={openAdd} className="flex items-center gap-1 text-xs">
            <Plus className="w-4 h-4" /> Add Course
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ds-card p-4 rounded-2xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={deptFilter}
          onChange={e => { setDeptF(e.target.value); setPage(1); load(1, search, e.target.value); }}
          className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Departments</option>
          {(meta?.departments ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-hidden border ds-card rounded-2xl backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-10" />
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Credits</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.courses ?? []).map(c => {
                const isExpanded = !!expanded[c.id];
                return (
                  <React.Fragment key={c.id}>
                    <tr onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                      className="ds-table-row transition-colors cursor-pointer group">
                      <td className="px-5 py-4 text-center">
                        <div className="w-5 h-5 rounded-lg bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center text-(--text-muted) group-hover:text-(--brand-gold) transition-all">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-(--text-primary) group-hover:text-(--brand-gold) transition-colors">{c.code}</td>
                      <td className="px-5 py-4 text-(--text-primary) font-medium">{c.name}</td>
                      <td className="px-5 py-4 font-mono text-(--text-secondary)">{c.creditHours} Cr</td>
                      <td className="px-5 py-4 text-(--text-secondary)">{c.department.name}</td>
                      <td className="px-5 py-4">
                        <Badge variant={c.status === 'ACTIVE' ? 'emerald' : 'amber'}>{c.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggleStatus(c)}
                            className={`p-1.5 rounded-lg transition-colors ${c.status === 'ACTIVE' ? 'hover:bg-(--status-warning-bg) hover:text-(--status-warning)' : 'hover:bg-(--status-success-bg) hover:text-(--status-success)'} text-(--text-muted)`}
                            title={c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                            {c.status === 'ACTIVE' ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-(--hover-overlay)">
                          <td />
                          <td colSpan={6} className="px-5 py-4 border-l-2 border-(--brand-gold)">
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 overflow-hidden text-xs text-(--text-secondary)">
                              {c.description && (
                                <div>
                                  <span className="text-[10px] font-mono text-(--brand-gold) uppercase tracking-wider">Description</span>
                                  <p className="mt-1 max-w-2xl leading-relaxed">{c.description}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-[10px] font-mono text-(--text-faint) uppercase tracking-wider block mb-2">Prerequisites</span>
                                <div className="flex flex-wrap gap-2">
                                  {c.prerequisites.length > 0 ? c.prerequisites.map(p => (
                                    <div key={p.prerequisite.id} className="px-2.5 py-1 bg-(--hover-overlay) border border-(--border-subtle) rounded-lg flex items-center gap-1.5 text-[11px]">
                                      <BookOpen className="w-3 h-3 text-(--brand-gold)" />
                                      <span className="font-mono font-semibold text-(--text-primary)">{p.prerequisite.code}</span>
                                      <span className="text-(--text-faint)">— {p.prerequisite.name}</span>
                                    </div>
                                  )) : (
                                    <span className="text-[10px] font-mono text-(--status-success) bg-(--status-success-bg) px-2.5 py-0.5 rounded border border-(--status-success-border)">
                                      No Prerequisites
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] font-mono text-(--text-faint)">{c._count.offerings} offering{c._count.offerings !== 1 ? 's' : ''} total</p>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
              {(data?.courses ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="courses" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} courses · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Add / Edit SlidePanel */}
      <SlidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)}
        title={editTarget ? `Edit — ${editTarget.code}` : 'Add Course to Catalog'}
        subtitle="Course Catalog" width="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {saveError && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{saveError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Course Code</label>
              <input type="text" required disabled={!!editTarget}
                placeholder="e.g. CS202" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) disabled:opacity-50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Credit Hours</label>
              <input type="number" min={1} max={10} required value={form.creditHours}
                onChange={e => setForm(f => ({ ...f, creditHours: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) font-mono" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Course Title</label>
            <input type="text" required placeholder="e.g. Advanced Operating Systems" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department</label>
            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
              {(meta?.departments ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-secondary)">Prerequisites</label>
            <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto p-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl">
              {(data?.courses ?? []).filter(c => c.id !== editTarget?.id).map(c => {
                const sel = form.prerequisiteIds.includes(c.id);
                return (
                  <button type="button" key={c.id} onClick={() => togglePrereq(c.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold flex items-center gap-1 transition-all ${sel ? 'bg-(--accent-gold-subtle) border-(--brand-gold) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-subtle) text-(--text-faint) hover:text-(--text-primary)'}`}>
                    {sel && <Check className="w-3 h-3" />}
                    {c.code}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Description</label>
            <textarea rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none"
              placeholder="Course syllabus summary..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" type="button" className="flex-1" onClick={() => setPanelOpen(false)}>Cancel</Button>
            <Button variant="gold" size="sm" type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Course'}
            </Button>
          </div>
        </form>
      </SlidePanel>
    </motion.div>
  );
};

