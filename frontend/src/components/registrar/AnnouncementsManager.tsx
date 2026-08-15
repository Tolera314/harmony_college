'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, RefreshCw, Send, Archive, Edit } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { SlidePanel } from '../ui/SlidePanel';
import { ConfirmModal } from '../ui/ConfirmModal';
import { announcementsApi } from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = { DRAFT: 'glass', PUBLISHED: 'emerald', ARCHIVED: 'amber' };
const PRIORITY_BADGE: Record<string, any> = { HIGH: 'rose', NORMAL: 'glass', LOW: 'amber' };

export const AnnouncementsManager: React.FC = () => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [statusFilter, setSF]   = useState('');

  const [panelOpen, setPanelOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);

  const [form, setForm] = useState({
    title: '', content: '', priority: 'NORMAL', targetAudience: 'ALL',
    publishDate: '', expirationDate: '',
  });

  const load = useCallback(async (pg = page, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await announcementsApi.list({ page: pg, limit: 10, ...(st && { status: st }) });
      setData(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [page]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: '', content: '', priority: 'NORMAL', targetAudience: 'ALL', publishDate: '', expirationDate: '' });
    setSaveError(null); setPanelOpen(true);
  };
  const openEdit = (ann: any) => {
    setEditTarget(ann);
    setForm({ title: ann.title, content: ann.content, priority: ann.priority, targetAudience: ann.targetAudience, publishDate: '', expirationDate: '' });
    setSaveError(null); setPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault(); setSaving(true); setSaveError(null);
    try {
      if (editTarget) {
        await announcementsApi.update(editTarget.id, { title: form.title, content: form.content, priority: form.priority, targetAudience: form.targetAudience, ...(publish && { publish: true }) });
      } else {
        await announcementsApi.create({ ...form, ...(form.publishDate ? {} : {}), publish });
      }
      setPanelOpen(false); await load(page, statusFilter);
    } catch (e: unknown) { setSaveError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try { await announcementsApi.update(archiveTarget.id, { archive: true }); await load(page, statusFilter); }
    finally { setArchiveTarget(null); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Announcements</h2>
          <p className="text-xs text-(--text-muted)">Create and publish announcements stored in PostgreSQL.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => load(page, statusFilter)}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button variant="gold" size="sm" onClick={openCreate} className="flex items-center gap-1.5 text-xs"><Plus className="w-4 h-4" /> New Announcement</Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => { setSF(e.target.value); setPage(1); load(1, e.target.value); }}
          className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="space-y-3">
          {(data?.announcements ?? []).length === 0 ? (
            <EmptyState variant="default" />
          ) : (data?.announcements ?? []).map((ann: any) => (
            <div key={ann.id} className="ds-card p-5 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={STATUS_BADGE[ann.status] ?? 'glass'}>{ann.status}</Badge>
                    <Badge variant={PRIORITY_BADGE[ann.priority] ?? 'glass'} className="text-[10px]">{ann.priority}</Badge>
                    <span className="text-[10px] font-mono text-(--text-faint)">→ {ann.targetAudience}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-(--text-primary)">{ann.title}</h3>
                  <p className="text-xs text-(--text-secondary) mt-1 line-clamp-2">{ann.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(ann)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {ann.status !== 'ARCHIVED' && (
                    <button onClick={() => setArchiveTarget(ann)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--status-warning) transition-colors">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[10px] font-mono text-(--text-faint)">
                Created {new Date(ann.createdAt).toLocaleDateString()}
                {ann.publishedAt && ` · Published ${new Date(ann.publishedAt).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} announcements · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Panel */}
      <SlidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)}
        title={editTarget ? 'Edit Announcement' : 'New Announcement'} subtitle="Announcements" width="max-w-xl">
        <form className="space-y-4 font-sans">
          {saveError && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{saveError}</div>}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Title</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Content</label>
            <textarea rows={5} required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none">
                <option value="HIGH">High</option><option value="NORMAL">Normal</option><option value="LOW">Low</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Target Audience</label>
              <select value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none">
                <option value="ALL">All Students & Faculty</option>
                <option value="STUDENTS">Students Only</option>
                <option value="FACULTY">Faculty Only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" type="button" className="flex-1" onClick={() => setPanelOpen(false)}>Cancel</Button>
            <Button variant="secondary" size="sm" type="button" className="flex-1" disabled={saving} onClick={e => handleSubmit(e as any, false)}>Save Draft</Button>
            <Button variant="gold" size="sm" type="button" className="flex-1 flex items-center justify-center gap-1" disabled={saving} onClick={e => handleSubmit(e as any, true)}>
              <Send className="w-3.5 h-3.5" /> {saving ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </form>
      </SlidePanel>

      <ConfirmModal isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={handleArchive}
        title="Archive Announcement"
        message={`Archive "${archiveTarget?.title}"? It will no longer be visible to students.`}
        icon={<Archive className="w-6 h-6" />} variant="warning" confirmLabel="Archive" />
    </motion.div>
  );
};
