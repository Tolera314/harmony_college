'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  FolderOpen, Search, Upload, FileText, Download, Eye,
  ChevronLeft, ChevronRight, RefreshCw, FileCheck, Shield, Plus,
  BookOpen, Users2, DollarSign, ExternalLink
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import {
  adminDocumentsApi, AdminDocumentStats, AdminDocumentItem
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CATEGORY_LABEL: Record<string, string> = {
  STUDENT_ADMISSION: 'Student Admission & Verification',
  HR_STAFF:          'HR Staff & Personnel',
  FINANCIAL_RECEIPT: 'Financial Receipt & Deposit',
  INSTITUTIONAL:     'Institutional Guidelines',
};

const CATEGORY_BADGE: Record<string, 'gold' | 'emerald' | 'amber' | 'info' | 'glass'> = {
  STUDENT_ADMISSION: 'gold',
  HR_STAFF:          'emerald',
  FINANCIAL_RECEIPT: 'amber',
  INSTITUTIONAL:     'info',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminDocumentsView: React.FC = () => {
  const [stats, setStats]               = useState<AdminDocumentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [documents, setDocuments]       = useState<AdminDocumentItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Filters
  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Modals / Drawers
  const [selectedDoc, setSelectedDoc]   = useState<AdminDocumentItem | null>(null);
  const [uploadOpen, setUploadOpen]     = useState(false);

  // Upload state
  const [uploadTitle, setUploadTitle]       = useState('');
  const [uploadCategory, setUploadCategory] = useState('INSTITUTIONAL');
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState('');

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const st = await adminDocumentsApi.getStats();
      setStats(st);
    } catch {
      // Graceful fallback
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch Documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminDocumentsApi.list({
        page,
        limit: 15,
        search,
        category: categoryFilter || undefined,
      });
      setDocuments(res.documents);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load documents repository');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchDocuments(), 280);
  }, [page, search, categoryFilter, fetchDocuments]);

  // ── Handle Upload Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) { setUploadError('Document title is required'); return; }
    if (!uploadFile) { setUploadError('Please select a file to upload'); return; }

    setUploadError(''); setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const uploadRes = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(errJson.error ?? 'Upload failed');
      }

      showToast('Document uploaded successfully into repository!', 'success');
      setUploadOpen(false); setUploadTitle(''); setUploadFile(null);
      fetchStats();
      fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message ?? 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Document Repository & Management"
        subtitle={`${total} system documents tracked across onboarding, HR, finance, and guidelines`}
        icon={<FolderOpen className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>
              Upload Institutional Document
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchStats(); fetchDocuments(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Storage KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPI label="Total Document Records"     value={stats.totalDocuments}    color="text-(--text-primary)" />
          <MiniKPI label="Student Admission Files"    value={stats.studentDocs}       color="text-(--brand-gold)" />
          <MiniKPI label="HR & Personnel Contracts"   value={stats.hrDocs}            color="text-(--status-success)" />
          <MiniKPI label="Payment Slips & Receipts"   value={stats.financialReceipts} color="text-(--status-info)" />
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search documents by title, student/employee name, or ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: '', label: 'All Documents' },
            { id: 'STUDENT_ADMISSION', label: 'Student Admissions' },
            { id: 'HR_STAFF', label: 'HR Personnel' },
            { id: 'FINANCIAL_RECEIPT', label: 'Financial Receipts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setCategoryFilter(tab.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-sans text-xs font-semibold transition-all border ${
                categoryFilter === tab.id
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                  : 'text-(--text-secondary) hover:bg-(--hover-overlay) border-(--border-default)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} cols={6} />
      ) : error ? (
        <ErrorState compact description={error} onRetry={fetchDocuments} />
      ) : documents.length === 0 ? (
        <EmptyState variant="documents" compact description="No documents match your search or filter criteria." />
      ) : (
        <>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs font-sans min-w-[850px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Document Title', 'Category', 'Entity / Owner', 'File Format', 'Date Added', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3 font-semibold text-(--text-primary)">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-(--brand-gold) shrink-0" />
                        <div>
                          <span>{doc.title}</span>
                          <span className="block text-[11px] text-(--text-muted) truncate max-w-[280px]">{doc.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_BADGE[doc.category] ?? 'glass'}>
                        {CATEGORY_LABEL[doc.category] ?? doc.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-(--text-primary)">
                      {doc.entityName}
                      <span className="block font-mono text-[10px] text-(--text-muted)">ID: {doc.entityId}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">{doc.fileType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelectedDoc(doc)}>
                          Details
                        </Button>
                        {doc.fileUrl && (
                          <a
                            href={`http://localhost:4000${doc.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-(--brand-gold) hover:underline font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View File
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-sans text-(--text-muted)">
              Showing {documents.length} of {total} documents (Page {page} of {totalPages})
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} icon={<ChevronRight className="w-4 h-4" />} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </>
      )}

      {/* UPLOAD INSTITUTIONAL DOCUMENT MODAL */}
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Institutional Document">
        <form onSubmit={handleUploadSubmit} className="space-y-4 font-sans text-xs">
          {uploadError && <InlineError message={uploadError} />}

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Document Title *</label>
            <Input
              placeholder="e.g. Student Handbook 2026 / Campus Safety Guidelines..."
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Category</label>
            <select
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 bg-(--bg-card-solid) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary)"
            >
              <option value="INSTITUTIONAL">Institutional Guidelines & Policies</option>
              <option value="STUDENT_ADMISSION">Academic Syllabi & Forms</option>
              <option value="HR_STAFF">Staff Policies & HR Forms</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-sans text-(--text-muted) mb-1">Select File (PDF, DOCX, JPG, PNG) *</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              className="w-full px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-primary) file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-(--brand-gold) file:text-black hover:file:opacity-90"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-(--border-subtle)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={uploading}>Upload to Repository</Button>
          </div>
        </form>
      </Modal>

      {/* DOCUMENT DETAILS SLIDE PANEL */}
      {selectedDoc && (
        <SlidePanel isOpen onClose={() => setSelectedDoc(null)} title="Document Overview & Metadata" subtitle="System Repository" width="max-w-md">
          <div className="space-y-4 font-sans text-xs">
            <div className="p-4 rounded-xl bg-(--hover-overlay) border border-(--border-default) space-y-2">
              <h4 className="font-serif text-sm font-bold text-(--brand-gold)">{selectedDoc.title}</h4>
              <p className="text-(--text-secondary)">{selectedDoc.description}</p>
            </div>

            <div className="space-y-2 border-t border-b border-(--border-subtle) py-3">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Category:</span>
                <Badge variant={CATEGORY_BADGE[selectedDoc.category] ?? 'glass'}>{CATEGORY_LABEL[selectedDoc.category]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Entity / Owner:</span>
                <span className="font-semibold text-(--text-primary)">{selectedDoc.entityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">File Format:</span>
                <span className="font-mono text-(--text-secondary)">{selectedDoc.fileType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Date Added:</span>
                <span className="font-mono text-(--text-secondary)">{formatDate(selectedDoc.uploadedAt)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>Close</Button>
              {selectedDoc.fileUrl && (
                <a
                  href={`http://localhost:4000${selectedDoc.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-(--brand-gold) text-black rounded-xl font-sans text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" /> Open File
                </a>
              )}
            </div>
          </div>
        </SlidePanel>
      )}
    </motion.div>
  );
};
