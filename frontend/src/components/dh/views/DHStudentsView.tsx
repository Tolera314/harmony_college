'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { GraduationCap, Search, RefreshCw, ChevronDown } from 'lucide-react';
import { hodStudentsApi, type StudentSummary, type StudentDetail } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SlidePanel } from '../../ui/SlidePanel';
import { ErrorState, EmptyState, SkeletonTable } from '../../ui/States';

const standingConfig = (gpa: number): { variant: 'emerald' | 'gold' | 'amber' | 'rose'; label: string; color: string } => {
  if (gpa >= 3.5) return { variant: 'emerald', label: 'Excellent', color: 'text-(--status-success)' };
  if (gpa >= 3.0) return { variant: 'gold',    label: 'Good',      color: 'text-(--brand-gold)' };
  if (gpa >= 2.0) return { variant: 'amber',   label: 'Warning',   color: 'text-(--status-warning)' };
  return          { variant: 'rose',    label: 'Probation', color: 'text-(--status-danger)' };
};

const attColor = (rate: number | null) =>
  rate === null ? 'text-(--text-faint)' :
  rate >= 90 ? 'text-(--status-success)' :
  rate >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)';

export const DHStudentsView: React.FC = () => {
  const [students,  setStudents]  = useState<StudentSummary[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected,  setSelected]  = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodStudentsApi.list({
        page:      p,
        limit:     LIMIT,
        search:    search || undefined,
        yearLevel: yearFilter ? parseInt(yearFilter) : undefined,
        status:    statusFilter || undefined,
      });
      setStudents(res.students);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, yearFilter, statusFilter]);

  useEffect(() => { load(page); }, [page, load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await hodStudentsApi.get(id);
      setSelected(d);
    } catch { /* silently fail */ }
    finally { setDetailLoading(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Student Directory"
        subtitle={loading ? 'Loading…' : `${total} students in department`}
        icon={<GraduationCap className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { setPage(1); load(1); }}>Refresh</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by name, student ID, or program…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['', '1', '2', '3', '4'] as const).map(y => (
            <button key={y} onClick={() => { setYearFilter(y); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${yearFilter === y ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
              {y === '' ? 'All Years' : `Year ${y}`}
            </button>
          ))}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="GRADUATED">Graduated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={8} cols={7} /> : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Student', 'Program', 'Year', 'GPA', 'Credits', 'Attendance', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-(--text-faint) font-sans text-sm">No students match your filters.</td></tr>
              ) : students.map(s => {
                const sc = standingConfig(s.gpa);
                return (
                  <tr key={s.id} className="hover:bg-(--hover-overlay) transition-colors cursor-pointer" onClick={() => openDetail(s.id)}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) flex items-center justify-center border border-(--accent-gold-border) shrink-0">
                          <span className="font-serif font-bold text-xs text-(--brand-gold)">{s.fullName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-(--text-primary) text-xs">{s.fullName}</p>
                          <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-(--text-secondary) max-w-[150px]">
                      <span className="truncate block text-xs">{s.program?.name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-(--text-secondary)">{s.yearLevel}</td>
                    <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">{s.gpa.toFixed(2)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">
                      {s.totalCredits}{s.program ? `/${s.program.totalCredits}` : ''}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`font-mono text-xs font-semibold ${attColor(s.attendanceRate)}`}>
                        {s.attendanceRate !== null ? `${s.attendanceRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={s.status === 'ACTIVE' ? 'emerald' : s.status === 'SUSPENDED' ? 'rose' : 'amber'}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} students · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Student detail panel — READ ONLY */}
      <SlidePanel isOpen={!!selected || detailLoading} onClose={() => setSelected(null)} title="Student Academic Record" subtitle="Read-only department view" width="max-w-2xl">
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 rounded-full border-2 border-(--brand-gold) border-t-transparent" />
          </div>
        ) : selected ? (
          <div className="space-y-5 text-sm font-sans">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center shrink-0">
                <span className="font-serif font-bold text-2xl text-(--brand-gold)">{selected.user.fullName.charAt(0)}</span>
              </div>
              <div>
                <p className="font-serif text-lg font-bold text-(--text-primary)">{selected.user.fullName}</p>
                <p className="font-mono text-xs text-(--text-faint)">{selected.studentId}</p>
                <p className="text-xs text-(--text-muted) mt-0.5">{selected.program?.name}</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'GPA',        value: selected.gpa.toFixed(2) },
                { label: 'Year Level', value: `Year ${selected.yearLevel}` },
                { label: 'Attendance', value: selected.attendance.rate !== null ? `${selected.attendance.rate}%` : '—' },
              ].map(item => (
                <div key={item.label} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{item.label}</p>
                  <p className="font-mono text-xl font-bold text-(--brand-gold) mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Attendance summary */}
            <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-3">Attendance Summary</p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { label: 'Present', value: selected.attendance.present, color: 'text-(--status-success)' },
                  { label: 'Absent',  value: selected.attendance.absent,  color: 'text-(--status-danger)' },
                  { label: 'Late',    value: selected.attendance.late,    color: 'text-(--status-warning)' },
                  { label: 'Excused', value: selected.attendance.excused, color: 'text-(--text-secondary)' },
                ].map(item => (
                  <div key={item.label}>
                    <p className={`font-mono font-bold text-lg ${item.color}`}>{item.value}</p>
                    <p className="text-(--text-faint) text-[10px]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Enrollment history */}
            {selected.enrollments.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-3">Course Enrollments</p>
                <div className="space-y-2">
                  {selected.enrollments.slice(0, 8).map(en => (
                    <div key={en.id} className="flex items-center justify-between p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-xs">
                      <div>
                        <p className="font-mono text-xs text-(--brand-gold)">{en.courseOffering.course.code}</p>
                        <p className="text-(--text-secondary) text-xs">{en.courseOffering.course.name}</p>
                        <p className="text-(--text-faint) text-[10px] font-mono">
                          {en.courseOffering.semester.name} {en.courseOffering.semester.academicYear.name}
                        </p>
                      </div>
                      <div className="text-right">
                        {en.grade?.letterGrade ? (
                          <span className="font-mono font-bold text-base text-(--brand-gold)">{en.grade.letterGrade}</span>
                        ) : (
                          <Badge variant="glass">In Progress</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-(--status-info-bg) border border-(--status-info-border) rounded-xl text-xs text-(--text-secondary)">
              ℹ️ This view is read-only. Grades, attendance, and enrollment can only be modified by authorized instructors and registrars.
            </div>
          </div>
        ) : null}
      </SlidePanel>
    </motion.div>
  );
};
