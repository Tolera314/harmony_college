'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { FolderOpen, Search, Plus, Trash2, Download, Upload, Eye, X, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import {
  hrDocumentsApi, hrEmployeesApi, type HRDocumentApi, type HREmployeeApi,
  DOC_CATEGORY_LABEL, type HRDocumentCategory,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { SkeletonPage, ErrorState } from '../../ui/States';

// ── Document Viewer Modal ─────────────────────────────────────────────────────

/** Detect file type from URL extension */
function getFileType(url: string): 'pdf' | 'image' | 'other' {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.pdf')) return 'pdf';
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return 'image';
  return 'other';
}

interface DocumentViewerProps {
  doc:     HRDocumentApi | null;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ doc, onClose }) => {
  if (!doc) return null;
  const url      = doc.fileUrl ?? '';
  const fileType = url ? getFileType(url) : 'other';

  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {fileType === 'pdf'   ? <FileText className="w-5 h-5 text-white/70 shrink-0" /> : null}
              {fileType === 'image' ? <ImageIcon className="w-5 h-5 text-white/70 shrink-0" /> : null}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                <p className="text-[11px] text-white/50 font-mono">
                  {(DOC_CATEGORY_LABEL as Record<string, string>)[doc.category] ?? doc.category}
                  {doc.fileSize ? ` · ${doc.fileSize}` : ''}
                  {` · Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {url && (
                <a href={url} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              )}
              <button onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {!url ? (
              <div className="text-center text-white/50 space-y-3">
                <FileText className="w-16 h-16 mx-auto opacity-40" />
                <p className="text-sm">No file URL available for this document.</p>
                <p className="text-xs">The document may have been uploaded without a file.</p>
              </div>
            ) : fileType === 'image' ? (
              /* Image preview */
              <motion.img
                key={url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={url}
                alt={doc.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              />
            ) : fileType === 'pdf' ? (
              /* PDF inline viewer */
              <motion.div
                key={url}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full"
                style={{ height: 'calc(100vh - 120px)' }}
              >
                <iframe
                  src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full rounded-lg border border-white/10"
                  title={doc.title}
                />
              </motion.div>
            ) : (
              /* Unsupported format — fallback UI */
              <div className="text-center text-white/70 space-y-4 max-w-sm">
                <FileText className="w-20 h-20 mx-auto opacity-40" />
                <div>
                  <p className="text-base font-semibold text-white">{doc.title}</p>
                  <p className="text-sm text-white/50 mt-1">
                    This file type cannot be previewed inline.
                  </p>
                </div>
                <a href={url} download target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E9C349] text-black font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
                  <Download className="w-4 h-4" /> Download File
                </a>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-white/40 hover:text-white/70 transition-colors mt-2">
                  or open in new tab
                </a>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const catVariant: Record<string, 'gold' | 'emerald' | 'glass' | 'amber' | 'rose'> = {
  CONTRACT: 'gold', CV: 'emerald', NATIONAL_ID: 'glass',
  CERTIFICATE: 'amber', PERFORMANCE_REPORT: 'glass', PAYSLIP: 'rose', LEAVE_DOCUMENT: 'glass',
};

export const HRDocumentsView: React.FC = () => {
  const [docs,      setDocs]      = useState<HRDocumentApi[]>([]);
  const [employees, setEmployees] = useState<HREmployeeApi[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [addModal,  setAddModal]  = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<HRDocumentApi | null>(null);
  const [viewDoc,   setViewDoc]   = useState<HRDocumentApi | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadPct, setUploadPct] = useState(0);

  // File input ref for actual file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    employeeId:  '',
    category:    'CV' as HRDocumentCategory,
    title:       '',
    // populated after upload
    fileUrl:     '',
    fileSize:    '',
    version:     1,
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [d, em] = await Promise.all([
        hrDocumentsApi.list({ search: search || undefined, category: catFilter !== 'All' ? catFilter : undefined }),
        hrEmployeesApi.list({ limit: 200 }),
      ]);
      setDocs(d);
      setEmployees(em.employees);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load documents'); }
    finally { setLoading(false); }
  }, [search, catFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Upload file to /api/upload, then record document in HR DB ──────────────
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.title) { setSaveError('Employee and title are required.'); return; }
    setSaving(true); setSaveError(''); setUploadPct(0);

    try {
      let fileUrl  = form.fileUrl;
      let fileSize = form.fileSize;

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        // Upload via the existing /api/upload endpoint
        setUploadPct(20);
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method:      'POST',
          credentials: 'include',
          body:        fd,
        });
        setUploadPct(70);
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}));
          throw new Error((body as any).error ?? `Upload failed: ${uploadRes.status}`);
        }
        const uploadData = await uploadRes.json() as { fileUrl: string };
        fileUrl  = uploadData.fileUrl;
        fileSize = `${(file.size / 1024).toFixed(0)} KB`;
        setUploadPct(90);
      }

      await hrDocumentsApi.create({ ...form, fileUrl: fileUrl || undefined, fileSize: fileSize || undefined });
      setUploadPct(100);
      setAddModal(false);
      setForm({ employeeId: '', category: 'CV', title: '', fileUrl: '', fileSize: '', version: 1 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setSaving(false); setUploadPct(0); }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try { await hrDocumentsApi.delete(deleteDoc.id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
    finally { setDeleteDoc(null); }
  };

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  const CATEGORIES = ['All', ...Object.keys(DOC_CATEGORY_LABEL)];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Documents"
        subtitle={`${docs.length} document${docs.length !== 1 ? 's' : ''} on file`}
        icon={<FolderOpen className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setAddModal(true); setSaveError(''); }}>
            Upload Document
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search by title or employee name…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${catFilter === c ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              {c === 'All' ? 'All' : (DOC_CATEGORY_LABEL as Record<string, string>)[c] ?? c}
            </button>
          ))}
        </div>
      </div>

      {/* Documents grid */}
      {docs.length === 0 ? (
        <div className="py-16 text-center text-(--text-faint) text-sm border border-dashed border-(--border-default) rounded-2xl">
          No documents match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map(doc => (
            <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl space-y-3 group hover:border-(--brand-gold)/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant={catVariant[doc.category] ?? 'glass'} className="text-[10px] mb-2">
                    {(DOC_CATEGORY_LABEL as Record<string, string>)[doc.category] ?? doc.category}
                  </Badge>
                  <p className="font-sans text-xs font-semibold text-(--text-primary) leading-snug truncate">{doc.title}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {doc.fileUrl && (
                    <button
                      title="View document"
                      onClick={() => setViewDoc(doc)}
                      className="p-1.5 rounded-lg bg-(--hover-overlay) text-(--text-muted) hover:text-(--brand-gold) transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                      title="Download" download>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => setDeleteDoc(doc)}
                    className="p-1.5 rounded-lg bg-(--hover-overlay) text-(--text-muted) hover:text-(--status-danger) transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-(--text-secondary)">
                <img src={doc.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-6 h-6 rounded-full border border-(--border-default) shrink-0" />
                <span className="truncate">{doc.employee?.fullName}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                <span>{doc.fileSize ?? 'Unknown size'}</span>
                <span>v{doc.version} · {new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
              <p className="text-[10px] text-(--text-faint)">By {doc.uploadedByName ?? 'HR Office'}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Upload Document" maxWidth="max-w-md">
        <form onSubmit={handleAddDocument} className="space-y-4">
          {saveError && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">{saveError}</p>}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Employee *</label>
            <select required value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">— Select Employee —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Category *</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as HRDocumentCategory }))}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {Object.entries(DOC_CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Document Title *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Employment Contract — Dr. Ahmed"
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
          </div>

          {/* Real file input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">File <span className="text-(--text-faint)">(PDF, Word, Image — up to 50 MB)</span></label>
            <label className="flex items-center gap-3 px-4 py-3 bg-(--hover-overlay) border border-dashed border-(--border-default) rounded-xl cursor-pointer hover:border-(--brand-gold)/60 transition-colors">
              <Upload className="w-4 h-4 text-(--text-faint) shrink-0" />
              <span className="text-xs text-(--text-secondary)">
                {fileInputRef.current?.files?.[0]?.name ?? 'Click to select file'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.mp4"
                className="hidden"
                onChange={() => {
                  const f = fileInputRef.current?.files?.[0];
                  if (f && !form.title) {
                    // Auto-fill title from filename if not already set
                    setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
                  }
                }}
              />
            </label>
          </div>

          {/* Upload progress bar */}
          {saving && uploadPct > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                <div className="h-full bg-(--brand-gold) rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
              </div>
              <p className="text-[10px] text-(--text-faint) text-center">{uploadPct < 90 ? 'Uploading…' : 'Saving record…'}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Uploading…' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal isOpen={!!deleteDoc} onClose={() => setDeleteDoc(null)} onConfirm={handleDelete}
        title="Delete Document"
        message={`Permanently delete "${deleteDoc?.title}"? This action cannot be undone.`}
        icon={<Trash2 className="w-6 h-6" />} variant="danger" confirmLabel="Delete Document" />

      {/* Document viewer — full-screen overlay */}
      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />
    </motion.div>
  );
};
