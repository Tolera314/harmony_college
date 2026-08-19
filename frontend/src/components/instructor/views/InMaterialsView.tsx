'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';
import {
  FolderOpen, FileText, Upload, Eye, Trash2, Edit,
  Plus, ChevronDown, RefreshCw, Link2,
} from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { SlidePanel }     from '../../ui/SlidePanel';
import { Input }          from '../../ui/Input';
import { EmptyState, SkeletonPage } from '../../ui/States';
import { instructorClassesApi, type ClassOffering } from '../../../lib/instructorApi';

// ── Helpers ───────────────────────────────────────────────────────────────────
function typeColor(t: string): string {
  const map: Record<string, string> = {
    PDF:        'text-red-400',
    SLIDES:     'text-blue-400',
    VIDEO:      'text-purple-400',
    REFERENCE:  'var(--status-success)',
    SYLLABUS:   'var(--status-warning)',
    ASSIGNMENT: 'var(--brand-gold)',
    LINK:       'var(--status-info)',
  };
  return map[t.toUpperCase()] ?? 'var(--text-faint)';
}

function visibilityBadge(v: string): 'emerald' | 'glass' | 'amber' {
  if (v === 'PUBLISHED' || v === 'Published') return 'emerald';
  if (v === 'DRAFT'     || v === 'Draft')     return 'glass';
  return 'amber';
}

// ── Shape for a material item ─────────────────────────────────────────────────
interface MaterialItem {
  id:          string;
  courseOfferingId: string;
  title:       string;
  description: string;
  type:        string;
  fileUrl:     string;
  fileSize?:   string;
  visibility:  string;
  uploadedAt:  string;
  downloads?:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
export const InMaterialsView: React.FC = () => {
  const [classes,          setClasses]         = useState<ClassOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [materials,        setMaterials]       = useState<MaterialItem[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [uploadOpen,       setUploadOpen]      = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', type: 'PDF', fileUrl: '',
  });
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError,  setUploadError]  = useState('');

  // ── Load classes ────────────────────────────────────────────────────────────
  useEffect(() => {
    instructorClassesApi.list()
      .then(data => {
        const current = data.filter(o => o.semester.isCurrent);
        const list = current.length ? current : data;
        setClasses(list);
        if (list.length > 0) setSelectedOffering(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Note: Course materials backend is ready for extension.
  //    The Prisma schema does not yet have a CourseMaterial model.
  //    This view renders an empty state with upload UI scaffolded.
  // ─────────────────────────────────────────────────────────────────────────

  const selectedClass = classes.find(c => c.id === selectedOffering);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.fileUrl) {
      setUploadError('Title and file URL are required.');
      return;
    }
    setUploadSaving(true); setUploadError('');
    try {
      // Scaffold: when CourseMaterial model is added, call the API here.
      const newItem: MaterialItem = {
        id:               Date.now().toString(),
        courseOfferingId: selectedOffering,
        title:            uploadForm.title,
        description:      uploadForm.description,
        type:             uploadForm.type,
        fileUrl:          uploadForm.fileUrl,
        visibility:       'PUBLISHED',
        uploadedAt:       new Date().toLocaleDateString(),
        downloads:        0,
      };
      setMaterials(prev => [newItem, ...prev]);
      setUploadOpen(false);
      setUploadForm({ title: '', description: '', type: 'PDF', fileUrl: '' });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadSaving(false);
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Course Materials"
        subtitle={
          selectedClass
            ? `${selectedClass.course.code} · ${materials.length} files`
            : `${materials.length} files`
        }
        icon={<FolderOpen className="w-5 h-5" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setUploadOpen(true)}
          >
            Upload
          </Button>
        }
      />

      {/* Class selector */}
      {classes.length > 1 && (
        <div className="relative inline-block">
          <select
            value={selectedOffering}
            onChange={e => setSelectedOffering(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--hover-overlay)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.course.code} — Section {c.section}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
            style={{ color: 'var(--text-faint)' }}
          />
        </div>
      )}

      {/* Materials grid */}
      {materials.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No materials uploaded"
          description="Upload PDFs, presentations, videos, and reference links for your students."
          action={{ label: 'Upload Material', onClick: () => setUploadOpen(true), icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {materials
            .filter(m => !selectedOffering || m.courseOfferingId === selectedOffering)
            .map(m => (
              <motion.div
                key={m.id}
                whileHover={GESTURE.cardHover}
                className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-5 space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="w-10 h-10 rounded-xl bg-(--hover-overlay) flex items-center justify-center shrink-0"
                    style={{ border: '1px solid var(--border-default)' }}
                  >
                    <FileText className="w-5 h-5" style={{ color: typeColor(m.type) }} />
                  </div>
                  <Badge variant={visibilityBadge(m.visibility)} className="text-[10px]">
                    {m.visibility}
                  </Badge>
                </div>

                <div>
                  <p className="font-sans text-sm font-semibold text-(--text-primary) leading-snug">{m.title}</p>
                  {m.description && (
                    <p className="font-sans text-xs text-(--text-muted) mt-1 line-clamp-2">{m.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                  <span className="uppercase">{m.type}{m.fileSize ? ` · ${m.fileSize}` : ''}</span>
                  {m.downloads !== undefined && <span>{m.downloads} downloads</span>}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-(--text-faint)">{m.uploadedAt}</span>
                  <div className="flex gap-1">
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                      aria-label={`Preview ${m.title}`}
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors"
                      aria-label={`Delete ${m.title}`}
                      onClick={() => setMaterials(prev => prev.filter(x => x.id !== m.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {/* Upload panel */}
      <SlidePanel
        isOpen={uploadOpen}
        onClose={() => { setUploadOpen(false); setUploadError(''); }}
        title="Upload Course Material"
        subtitle={selectedClass?.course.code ?? 'Course Materials'}
        width="max-w-lg"
      >
        <form onSubmit={handleUpload} className="space-y-4 font-sans text-sm">
          {uploadError && (
            <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">
              {uploadError}
            </div>
          )}

          <Input
            label="Title *"
            placeholder="e.g. Week 9 — Advanced Lighting Techniques"
            value={uploadForm.title}
            onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">Description</label>
            <textarea
              rows={2}
              placeholder="Brief description for students"
              value={uploadForm.description}
              onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none placeholder:text-(--text-faint)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">Type</label>
            <select
              value={uploadForm.type}
              onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            >
              {['PDF', 'Slides', 'Video', 'Assignment', 'Reference', 'Syllabus', 'Link'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">
              File URL *
            </label>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 shrink-0 text-(--text-faint)" />
              <input
                type="url"
                placeholder="https://…"
                value={uploadForm.fileUrl}
                onChange={e => setUploadForm(f => ({ ...f, fileUrl: e.target.value }))}
                required
                className="flex-1 bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) placeholder:text-(--text-faint)"
              />
            </div>
            <p className="text-[11px] text-(--text-faint)">
              Paste a direct link to the file (Google Drive, Dropbox, OneDrive, etc.)
            </p>
          </div>

          <div
            className="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            <Upload className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="font-sans text-xs text-(--text-muted)">
              Direct file upload coming soon
            </p>
            <p className="font-mono text-[10px] mt-1 text-(--text-faint)">
              Use a URL link for now
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              className="flex-1"
              onClick={() => { setUploadOpen(false); setUploadError(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="flex-1"
              disabled={uploadSaving}
              icon={<Upload className="w-4 h-4" />}
            >
              {uploadSaving ? 'Saving…' : 'Save Material'}
            </Button>
          </div>
        </form>
      </SlidePanel>
    </motion.div>
  );
};
