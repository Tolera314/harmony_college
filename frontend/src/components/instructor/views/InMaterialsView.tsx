'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';
import {
  FolderOpen, FileText, Upload, Eye, Trash2, Edit,
  Plus, ChevronDown, RefreshCw, Link2, Check, FileCheck
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

export interface InMaterialsViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

// ─────────────────────────────────────────────────────────────────────────────
export const InMaterialsView: React.FC<InMaterialsViewProps> = ({ programType }) => {
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load classes ────────────────────────────────────────────────────────────
  useEffect(() => {
    instructorClassesApi.list(programType)
      .then(data => {
        setClasses(data);
        if (data.length > 0) {
          const current = data.find(o => o.semester.isCurrent);
          setSelectedOffering(prev => (prev && data.some(d => d.id === prev)) ? prev : (current ? current.id : data[0].id));
        } else {
          setSelectedOffering('');
        }
      })
      .finally(() => setLoading(false));
  }, [programType]);

  const selectedClass = classes.find(c => c.id === selectedOffering);

  const handleFileChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      let url = '';
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          url = json.fileUrl;
        }
      } catch {}
      if (!url) url = URL.createObjectURL(file);

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      let fileType = 'PDF';
      if (['ppt', 'pptx', 'key'].includes(ext)) fileType = 'Slides';
      else if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) fileType = 'Video';
      else if (['doc', 'docx', 'txt'].includes(ext)) fileType = 'Assignment';
      else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) fileType = 'Reference';

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const sizeMb = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      setUploadForm(f => ({
        ...f,
        title: f.title.trim() ? f.title : baseName,
        fileUrl: url,
        type: fileType,
        description: f.description.trim() ? f.description : `Course document: ${file.name} (${sizeMb})`,
      }));
    } catch {
      setUploadError('Failed to process file upload.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.fileUrl.trim()) {
      setUploadError('Title and file URL are required.');
      return;
    }
    setUploadSaving(true); setUploadError('');
    try {
      const newItem: MaterialItem = {
        id:               Date.now().toString(),
        courseOfferingId: selectedOffering,
        title:            uploadForm.title.trim(),
        description:      uploadForm.description.trim(),
        type:             uploadForm.type,
        fileUrl:          uploadForm.fileUrl.trim(),
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
            Upload Material
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

          {/* Interactive Drag & Drop File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.webm,.zip,.png,.jpg,.jpeg,.svg"
            onChange={e => handleFileChange(e.target.files)}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files?.length) handleFileChange(e.dataTransfer.files);
            }}
            className="border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer hover:border-(--brand-gold) bg-(--hover-overlay)"
            style={{ borderColor: uploadForm.fileUrl ? 'var(--status-success)' : 'var(--border-default)' }}
          >
            {uploadingFile ? (
              <div className="space-y-2">
                <RefreshCw className="w-7 h-7 mx-auto animate-spin text-(--brand-gold)" />
                <p className="text-xs text-(--text-muted)">Uploading file...</p>
              </div>
            ) : uploadForm.fileUrl ? (
              <div className="space-y-2">
                <FileCheck className="w-8 h-8 mx-auto text-(--status-success)" />
                <p className="text-xs font-semibold text-(--text-primary)">File Uploaded &amp; Linked</p>
                <p className="font-mono text-[10px] text-(--text-faint) truncate px-4">{uploadForm.fileUrl}</p>
                <p className="text-[11px] text-(--brand-gold) underline pt-1">Click to change file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-(--brand-gold)" />
                <p className="font-sans text-xs font-semibold text-(--text-primary)">
                  Click or drag file here to upload
                </p>
                <p className="font-mono text-[10px] text-(--text-faint)">
                  PDF, PowerPoint, Word, Video, Images or ZIP files
                </p>
              </div>
            )}
          </div>

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
                type="text"
                placeholder="https://… or uploaded file path"
                value={uploadForm.fileUrl}
                onChange={e => setUploadForm(f => ({ ...f, fileUrl: e.target.value }))}
                required
                className="flex-1 bg-(--hover-overlay) border border-(--border-default) rounded-xl px-3.5 py-2.5 font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold) placeholder:text-(--text-faint)"
              />
            </div>
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
              disabled={uploadSaving || uploadingFile}
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
