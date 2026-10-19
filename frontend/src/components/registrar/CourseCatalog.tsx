'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, BookOpen, ChevronRight, ChevronDown,
  FileDown, RefreshCw
} from 'lucide-react';
import { EmptyState, SkeletonTable, ErrorState } from '../ui/States';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  coursesApi, type CourseItem, type CoursesListResponse, type CourseMeta,
} from '@/src/lib/registrarApi';

// ═══════════════════════════════════════════════════════════════════════════
// Registrar Course Catalog — READ-ONLY VIEW
// ═══════════════════════════════════════════════════════════════════════════
// Per updated role permissions, Registrar has READ-ONLY access to the course
// catalog for oversight and reporting purposes. Course creation, editing, and
// status changes are managed by Head of Department (HOD) within their
// authorized departments.
// ═══════════════════════════════════════════════════════════════════════════

export const CourseCatalog: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [data, setData]           = useState<CoursesListResponse | null>(null);
  const [meta, setMeta]           = useState<CourseMeta | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});

  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptF]    = useState('');
  const [page, setPage]           = useState(1);
  const searchTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pg = page, q = search, dept = deptFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await coursesApi.list({ page: pg, limit: 15, search: q, departmentId: dept || undefined, programType });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally { setLoading(false); }
  }, [page, search, deptFilter, programType]);

  useEffect(() => {
    load();
    coursesApi.getMeta({ programType }).then(setMeta).catch(() => {});
  }, [page, load, programType]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, deptFilter), 350);
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Course Catalog</h2>
          <p className="text-xs text-(--text-muted)">
            View course information, prerequisites, and departmental structures.
            <span className="block mt-1 text-(--text-faint)">
              Course management is handled by Department Heads within their authorized departments.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1 text-xs">
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => load(page, search, deptFilter)} className="flex items-center gap-1 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
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
                    </tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-(--hover-overlay)">
                          <td />
                          <td colSpan={5} className="px-5 py-4 border-l-2 border-(--brand-gold)">
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
                <tr><td colSpan={6} className="p-0"><EmptyState variant="courses" compact /></td></tr>
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
    </motion.div>
  );
};
