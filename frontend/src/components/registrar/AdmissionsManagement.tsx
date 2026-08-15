'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, CheckCircle2, XCircle, AlertCircle, FileText,
  Download, ZoomIn, ZoomOut, RotateCw, Maximize2, Send,
  Image as ImageIcon, Calendar, User, Phone, MapPin, FileCheck2, ChevronDown
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { admissionsApi, type Application, type AdmissionsListResponse } from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = {
  DRAFT: 'glass', SUBMITTED: 'glass', UNDER_REVIEW: 'amber',
  ACCEPTED: 'emerald', REJECTED: 'rose', WAITLISTED: 'amber',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Applied', UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Approved', REJECTED: 'Rejected', WAITLISTED: 'Waitlisted',
};

export const AdmissionsManagement: React.FC = () => {
  const [data, setData] = useState<AdmissionsListResponse | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeDoc, setActiveDoc] = useState<Application['documents'][0] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const load = useCallback(async (pg = page, q = search, s = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await admissionsApi.list({ page: pg, limit: 15, search: q, status: s || undefined });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, statusFilter), 350);
  };

  const handleFilter = (val: string) => {
    setStatusFilter(val); setPage(1);
    load(1, search, val);
  };

  const doAction = async (action: () => Promise<unknown>, successMsg?: string) => {
    setActionLoading(true); setActionError(null);
    try {
      await action();
      // Refresh list and drawer
      await load(page, search, statusFilter);
      if (selected) {
        const fresh = await admissionsApi.getById(selected.id);
        setSelected(fresh);
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleApprove = () => doAction(() => admissionsApi.approve(selected!.id));
  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    doAction(async () => { await admissionsApi.reject(selected!.id, rejectReason); setShowRejectForm(false); setRejectReason(''); });
  };
  const handleRequestCorrection = () => doAction(() => admissionsApi.requestCorrection(selected!.id, 'Please review and correct the submitted documents.'));
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    doAction(async () => { await admissionsApi.addComment(selected!.id, commentText); setCommentText(''); });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Admissions Management</h2>
          <p className="text-xs text-(--text-muted)">Review and process admission applications from the database.</p>
        </div>
        {data && <Badge variant="glass" className="font-mono text-xs self-start">{data.total} Total</Badge>}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-(--hover-overlay) border border-(--border-default) p-4 rounded-2xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or application ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={statusFilter} onChange={e => handleFilter(e.target.value)}
          className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-x-auto border ds-card rounded-2xl backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Applicant</th>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Academic Year</th>
                <th className="px-5 py-4">Submitted</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.applications ?? []).map(app => (
                <tr key={app.id} onClick={() => { setSelected(app); setActiveDoc(null); setActionError(null); setShowRejectForm(false); }}
                  className="ds-table-row transition-colors cursor-pointer group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-(--hover-overlay) border border-(--border-strong) flex items-center justify-center font-serif font-bold text-xs text-(--brand-gold)">
                        {app.fullName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary) group-hover:text-(--brand-gold) transition-colors">{app.fullName}</p>
                        <p className="text-[10px] text-(--text-faint)">{app.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-(--text-secondary) max-w-[160px] truncate">{app.program}</td>
                  <td className="px-5 py-4 font-mono text-(--text-muted)">{app.academicYear}</td>
                  <td className="px-5 py-4 font-mono text-(--text-muted)">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-4"><Badge variant={STATUS_BADGE[app.status] ?? 'glass'}>{STATUS_LABEL[app.status] ?? app.status}</Badge></td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setSelected(app); setActiveDoc(null); setActionError(null); setShowRejectForm(false); }}
                      className="px-3 py-1.5 rounded-xl border border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) hover:text-(--brand-gold) hover:border-(--brand-gold)/30 text-[10px] font-semibold transition-all">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.applications ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-0"><EmptyState variant="search" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} applications · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[750px] bg-(--bg-base) border-l border-(--border-default) z-50 overflow-y-auto flex flex-col shadow-2xl font-sans">

              {/* Header */}
              <div className="p-6 border-b border-(--border-default) flex items-center justify-between sticky top-0 bg-(--bg-base) z-10">
                <div>
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase tracking-widest">Application Review</span>
                  <h3 className="text-lg font-serif font-bold text-(--text-primary) flex items-center gap-2">
                    {selected.fullName}
                    <Badge variant={STATUS_BADGE[selected.status] ?? 'glass'}>{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                  </h3>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl text-(--text-muted) hover:text-(--text-primary) transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-6">
                {actionError && (
                  <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{actionError}</div>
                )}

                {/* Personal Info */}
                <div className="p-5 bg-(--hover-overlay) border border-(--border-default) rounded-2xl space-y-4">
                  <div className="flex items-center gap-4 border-b border-(--border-subtle) pb-4">
                    <div className="w-12 h-12 rounded-xl bg-(--brand-gold)/20 border border-(--brand-gold)/30 flex items-center justify-center font-serif font-bold text-xl text-(--brand-gold)">
                      {selected.fullName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--text-primary)">{selected.fullName}</p>
                      <p className="text-xs text-(--text-faint)">{selected.user?.email} · {selected.user?.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { icon: User,      label: 'Gender / Age', val: `${selected.gender} · ${selected.age} yrs` },
                      { icon: Calendar,  label: 'DOB',          val: selected.dob ? new Date(selected.dob).toLocaleDateString() : '—' },
                      { icon: FileCheck2,label: 'Study Mode',   val: selected.studyMode },
                      { icon: Phone,     label: 'Emergency',    val: selected.emergencyContact },
                      { icon: MapPin,    label: 'Location',     val: `${selected.city}, ${selected.nationality}` },
                      { icon: FileText,  label: 'Program',      val: selected.program },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1 p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                        <span className="text-[10px] font-mono text-(--text-faint) flex items-center gap-1">
                          <item.icon className="w-3 h-3 text-(--brand-gold)" /> {item.label}
                        </span>
                        <p className="text-xs text-(--text-primary) font-medium truncate">{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents */}
                {selected.documents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Uploaded Documents</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selected.documents.map(doc => (
                        <button key={doc.id} onClick={() => { setActiveDoc(doc); setZoom(1); setRotation(0); }}
                          className={`p-3 border rounded-xl flex flex-col items-center gap-2 text-center text-[10px] font-semibold transition-all ${activeDoc?.id === doc.id ? 'bg-(--accent-gold-subtle) border-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) hover:border-(--border-strong)'}`}>
                          {doc.type === 'MATRIC' || doc.type?.includes('TRANSCRIPT') ? <FileText className="w-5 h-5 text-(--status-danger)" /> : <ImageIcon className="w-5 h-5 text-blue-400" />}
                          <span className="truncate w-full">{doc.type.replace(/_/g, ' ')}</span>
                        </button>
                      ))}
                    </div>
                    {activeDoc && (
                      <div className="p-4 bg-black/60 border border-(--border-default) rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-(--border-subtle) pb-2">
                          <span className="text-[10px] font-mono text-(--brand-gold)">{activeDoc.fileUrl}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setZoom(p => Math.max(0.5, p - 0.2))} className="p-1 hover:bg-(--hover-overlay) rounded text-(--text-muted)"><ZoomOut className="w-3.5 h-3.5" /></button>
                            <span className="text-[10px] font-mono text-(--text-secondary)">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(p => Math.min(2.5, p + 0.2))} className="p-1 hover:bg-(--hover-overlay) rounded text-(--text-muted)"><ZoomIn className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setRotation(p => (p + 90) % 360)} className="p-1 hover:bg-(--hover-overlay) rounded text-(--text-muted)"><RotateCw className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setFullscreen(!fullscreen)} className="p-1 hover:bg-(--hover-overlay) rounded text-(--text-muted)"><Maximize2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className={`relative overflow-hidden flex items-center justify-center bg-(--bg-base) border border-(--border-subtle) rounded-xl ${fullscreen ? 'fixed inset-4 z-50' : 'h-[200px]'}`}>
                          {fullscreen && <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 p-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl z-50"><X className="w-4 h-4" /></button>}
                          <p className="text-xs text-(--text-faint) text-center p-4">
                            Document: <span className="text-(--brand-gold) font-mono">{activeDoc.fileUrl}</span>
                            <br /><span className="text-[10px]">(Preview requires authenticated file access)</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Review Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="gold" size="sm"
                      disabled={actionLoading || selected.status === 'ACCEPTED'}
                      onClick={handleApprove}
                      className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {actionLoading ? 'Processing…' : 'Approve Admission'}
                    </Button>
                    <Button variant="rose" size="sm"
                      disabled={actionLoading || selected.status === 'REJECTED'}
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Reject Application
                    </Button>
                    <Button variant="secondary" size="sm"
                      disabled={actionLoading}
                      onClick={handleRequestCorrection}
                      className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-(--status-warning)" /> Request Correction
                    </Button>
                  </div>

                  {showRejectForm && (
                    <form onSubmit={handleReject} className="flex gap-2 mt-2">
                      <input type="text" required value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (required)..."
                        className="flex-1 px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--status-danger)" />
                      <Button variant="rose" size="sm" type="submit" disabled={actionLoading}>Confirm Reject</Button>
                    </form>
                  )}
                </div>

                {/* Review comment */}
                {selected.reviewComment && (
                  <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary)">
                    <span className="font-mono text-[10px] text-(--text-faint) block mb-1">Last Review Comment</span>
                    {selected.reviewComment}
                  </div>
                )}

                {/* Comments */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Add Comment</h4>
                  <form onSubmit={handleAddComment} className="flex gap-3">
                    <input type="text" required value={commentText} onChange={e => setCommentText(e.target.value)}
                      placeholder="Internal review notes..."
                      className="flex-1 px-4 py-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
                    <Button variant="gold" size="sm" type="submit" disabled={actionLoading} className="shrink-0 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Post
                    </Button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

