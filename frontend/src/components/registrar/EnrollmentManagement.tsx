'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, ShieldAlert, Plus, Trash2, BookOpen, RefreshCw
} from 'lucide-react';
import { EmptyState, SkeletonTable, ErrorState } from '../ui/States';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  enrollmentsApi, studentsApi, offeringsApi,
  type EnrollmentItem, type EnrollmentsListResponse,
} from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = {
  ACTIVE: 'emerald', DROPPED: 'rose', COMPLETED: 'glass',
  WAITLISTED: 'amber', FORCE_ADDED: 'gold', FORCE_DROPPED: 'rose',
};

export const EnrollmentManagement: React.FC = () => {
  const [data, setData]             = useState<EnrollmentsListResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [drawerLoading, setDrawerLoading]   = useState(false);

  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [overrideAction, setOverrideAction] = useState<'add' | 'drop' | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [targetOfferingId, setTargetOfferingId] = useState('');
  const [targetEnrollmentId, setTargetEnrollmentId] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError]     = useState<string | null>(null);

  const [offerings, setOfferings]   = useState<Record<string, any>[]>([]);

  const load = useCallback(async (pg = page, q = search) => {
    setLoading(true); setError(null);
    try {
      // List unique students with enrollments by querying enrollments
      const res = await enrollmentsApi.list({ page: pg, limit: 15, search: q });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load enrollments');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => {
    load();
    offeringsApi.list({ page: 1, limit: 100, status: 'SCHEDULED' as any })
      .then(r => setOfferings(r.offerings)).catch(() => {});
  }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val), 350);
  };

  const openDrawer = async (enrollment: EnrollmentItem) => {
    setDrawerLoading(true); setOverrideAction(null); setOverrideError(null);
    try {
      const detail = await enrollmentsApi.getByStudent(enrollment.studentRecord.id);
      setSelectedRecord(detail);
    } catch {
      setSelectedRecord({
        ...enrollment.studentRecord,
        enrollments: [],
      });
    } finally { setDrawerLoading(false); }
  };

  const refreshDrawer = async () => {
    if (!selectedRecord) return;
    try {
      const fresh = await enrollmentsApi.getByStudent(selectedRecord.id);
      setSelectedRecord(fresh);
    } catch { /* silently */ }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    setOverrideLoading(true); setOverrideError(null);
    try {
      if (overrideAction === 'add') {
        await enrollmentsApi.forceAdd({
          studentRecordId: selectedRecord!.id,
          courseOfferingId: targetOfferingId,
          reason: overrideReason,
        });
      } else if (overrideAction === 'drop') {
        await enrollmentsApi.forceDrop(targetEnrollmentId, overrideReason);
      }
      setOverrideAction(null); setOverrideReason(''); setTargetOfferingId(''); setTargetEnrollmentId('');
      await refreshDrawer();
      await load(page, search);
    } catch (e: unknown) {
      setOverrideError(e instanceof Error ? e.message : 'Override failed');
    } finally { setOverrideLoading(false); }
  };

  // Deduplicate: show one row per student
  const studentRows = React.useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    return data.enrollments.filter(e => {
      if (seen.has(e.studentRecord.id)) return false;
      seen.add(e.studentRecord.id); return true;
    });
  }, [data]);

  const activeEnrollments = selectedRecord?.enrollments?.filter(
    (e: any) => e.status === 'ACTIVE' || e.status === 'FORCE_ADDED'
  ) ?? [];
  const overrideHistory = selectedRecord?.enrollments?.filter(
    (e: any) => e.isOverride
  ) ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Enrollments & Overrides</h2>
          <p className="text-xs text-(--text-muted)">Manage course registrations and execute force-add/drop overrides.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load(page, search)} className="flex items-center gap-1.5 text-xs self-start">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ds-card p-4 rounded-2xl">
        <div className="relative col-span-full md:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by student name, ID, or course code..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-x-auto border ds-card rounded-2xl backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Student ID</th>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Course</th>
                <th className="px-5 py-4">Semester</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.enrollments ?? []).map(enroll => (
                <tr key={enroll.id} className="ds-table-row transition-colors cursor-pointer group"
                  onClick={() => openDrawer(enroll)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-(--brand-gold)/20 border border-(--brand-gold)/30 flex items-center justify-center font-serif font-bold text-xs text-(--brand-gold)">
                        {enroll.studentRecord.user.fullName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary) group-hover:text-(--brand-gold) transition-colors">{enroll.studentRecord.user.fullName}</p>
                        <p className="text-[10px] text-(--text-faint)">{enroll.studentRecord.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-(--text-secondary)">{enroll.studentRecord.studentId}</td>
                  <td className="px-5 py-4 text-(--text-secondary) max-w-[140px] truncate">{enroll.studentRecord.program.name}</td>
                  <td className="px-5 py-4 font-mono text-(--text-primary) font-semibold">{enroll.courseOffering.course.code}</td>
                  <td className="px-5 py-4 text-(--text-muted)">{enroll.courseOffering.semester.name}</td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_BADGE[enroll.status] ?? 'glass'}>{enroll.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openDrawer(enroll)}
                      className="px-3 py-1.5 rounded-xl border border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) hover:text-(--brand-gold) hover:border-(--brand-gold)/30 text-[10px] font-semibold transition-all">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.enrollments ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="filters" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} enrollments · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Override Drawer */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[650px] bg-(--bg-base) border-l border-(--border-default) z-50 overflow-y-auto flex flex-col shadow-2xl font-sans">

              <div className="p-6 border-b border-(--border-default) flex items-center justify-between sticky top-0 bg-(--bg-base) z-10">
                <div>
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase tracking-widest">Enrollment Registry</span>
                  <h3 className="text-lg font-serif font-bold text-(--text-primary)">
                    {selectedRecord.user?.fullName} ({selectedRecord.studentId})
                  </h3>
                </div>
                <button onClick={() => setSelectedRecord(null)}
                  className="p-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl text-(--text-muted) hover:text-(--text-primary) transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-6">
                {/* Active Courses */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Active Enrollments</h4>
                  {activeEnrollments.length === 0 ? (
                    <p className="text-xs text-(--text-faint) text-center py-4 border border-dashed border-(--border-default) rounded-xl">No active enrollments</p>
                  ) : (
                    <div className="space-y-2">
                      {activeEnrollments.map((e: any) => (
                        <div key={e.id} className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-(--brand-gold)" />
                            <div>
                              <p className="text-xs font-semibold text-(--text-primary)">
                                {e.courseOffering?.course?.code} · {e.courseOffering?.course?.name}
                              </p>
                              <p className="text-[10px] text-(--text-faint)">{e.courseOffering?.semester?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_BADGE[e.status] ?? 'glass'} className="text-[10px]">{e.status.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Override Actions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Manual Registration Overrides</h4>
                  <div className="flex gap-3">
                    <button onClick={() => { setOverrideAction('add'); setOverrideReason(''); setOverrideError(null); }}
                      className={`flex-1 p-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${overrideAction === 'add' ? 'bg-(--accent-gold-subtle) border-(--brand-gold) text-(--text-primary)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
                      <Plus className="w-4 h-4" /> Force Add
                    </button>
                    <button onClick={() => { setOverrideAction('drop'); setOverrideReason(''); setOverrideError(null); }}
                      disabled={activeEnrollments.length === 0}
                      className={`flex-1 p-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${overrideAction === 'drop' ? 'bg-(--status-danger-bg) border-(--status-danger-border) text-(--text-primary)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
                      <Trash2 className="w-4 h-4" /> Force Drop
                    </button>
                  </div>

                  <AnimatePresence>
                    {overrideAction && (
                      <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} onSubmit={handleOverrideSubmit}
                        className="p-4 bg-(--bg-input) border border-(--border-default) rounded-2xl space-y-4 overflow-hidden">

                        {overrideError && (
                          <div className="p-2 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-lg text-[11px] text-(--status-danger)">{overrideError}</div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-(--text-secondary)">
                            {overrideAction === 'add' ? 'Select Course Offering to Add' : 'Select Enrollment to Drop'}
                          </label>
                          {overrideAction === 'add' ? (
                            <select value={targetOfferingId} onChange={e => setTargetOfferingId(e.target.value)} required
                              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                              <option value="">— Select offering —</option>
                              {offerings.map((o: any) => (
                                <option key={o.id} value={o.id}>
                                  {o.course.code} — {o.course.name} ({o.semester.name})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select value={targetEnrollmentId} onChange={e => setTargetEnrollmentId(e.target.value)} required
                              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                              <option value="">— Select enrollment to drop —</option>
                              {activeEnrollments.map((e: any) => (
                                <option key={e.id} value={e.id}>
                                  {e.courseOffering?.course?.code} — {e.courseOffering?.course?.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-(--text-secondary) flex items-center gap-1">
                            Override Reason <span className="text-(--status-danger) text-[10px]">* Required</span>
                          </label>
                          <input type="text" required placeholder="Administrative justification..."
                            value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="secondary" size="sm" type="button" onClick={() => setOverrideAction(null)}>Cancel</Button>
                          <Button variant={overrideAction === 'add' ? 'gold' : 'rose'} size="sm" type="submit" disabled={overrideLoading}>
                            {overrideLoading ? 'Processing…' : 'Execute Override'}
                          </Button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {/* Override Audit Trail */}
                <div className="space-y-3 border-t border-(--border-subtle) pt-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint) flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-(--brand-gold)" /> Override Audit Trail
                  </h4>
                  {overrideHistory.length === 0 ? (
                    <span className="block text-center text-[10px] font-mono text-(--status-success) bg-(--status-success-bg) px-2.5 py-1.5 rounded border border-(--status-success-border)">
                      Zero Manual Overrides — Clean Registry Record
                    </span>
                  ) : (
                    <div className="space-y-4 pl-3 border-l border-(--border-default)">
                      {overrideHistory.map((e: any) => (
                        <div key={e.id} className="relative text-xs">
                          <span className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-(--bg-base)" />
                          <div className="space-y-0.5">
                            <p className="text-(--text-faint) font-mono text-[9px]">
                              {new Date(e.overrideAt ?? e.enrolledAt).toLocaleString()} · {e.overrideBy ? 'Registrar' : 'System'}
                            </p>
                            <p className="text-(--text-primary) font-bold">
                              {e.status === 'FORCE_ADDED' ? 'Force Added' : 'Force Dropped'}: {e.courseOffering?.course?.code}
                            </p>
                            <p className="text-(--text-secondary) italic">"{e.overrideReason}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

