'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { GraduationCap, Search, X, ChevronDown, Eye, AlertTriangle } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge }        from '../../ui/Badge';
import { Input }        from '../../ui/Input';
import { Button }       from '../../ui/Button';
import { Modal }        from '../../ui/Modal';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import {
  instructorClassesApi,
  type ClassOffering,
  type RosterStudent,
  type StudentAcademicView,
} from '../../../lib/instructorApi';

// ── Attendance rate colour ────────────────────────────────────────────────────
const attColor = (r: number | null) => {
  if (r === null) return 'text-(--text-faint)';
  return r >= 90
    ? 'text-(--status-success)'
    : r >= 75
    ? 'text-(--brand-gold)'
    : 'text-(--status-danger)';
};

const standing = (s: RosterStudent) => {
  const att = s.attendanceRate ?? 100;
  if (att < 75) return { label: 'At Risk',  variant: 'rose'    as const };
  if (att < 85) return { label: 'Warning',  variant: 'amber'   as const };
  if (s.gpa >= 3.5) return { label: 'Excellent', variant: 'emerald' as const };
  if (s.gpa >= 2.5) return { label: 'Good',      variant: 'gold'    as const };
  return { label: 'Average', variant: 'glass' as const };
};

export const InStudentsView: React.FC = () => {
  const [classes,           setClasses]           = useState<ClassOffering[]>([]);
  const [selectedOffering,  setSelectedOffering]  = useState<string>('');
  const [students,          setStudents]          = useState<RosterStudent[]>([]);
  const [total,             setTotal]             = useState(0);
  const [page,              setPage]              = useState(1);
  const [search,            setSearch]            = useState('');
  const [statusFilter,      setStatusFilter]      = useState('');
  const [classesLoading,    setClassesLoading]    = useState(true);
  const [rosterLoading,     setRosterLoading]     = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  // Student detail modal
  const [detailStudent,     setDetailStudent]     = useState<StudentAcademicView | null>(null);
  const [detailStudentName, setDetailStudentName] = useState('');
  const [detailLoading,     setDetailLoading]     = useState(false);

  const LIMIT = 20;

  // ── Load classes list ─────────────────────────────────────────────────────
  useEffect(() => {
    setClassesLoading(true);
    instructorClassesApi.list()
      .then(data => {
        const current = data.filter(o => o.semester.isCurrent);
        setClasses(current.length ? current : data);
        if (current.length > 0) setSelectedOffering(current[0].id);
        else if (data.length > 0) setSelectedOffering(data[0].id);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setClassesLoading(false));
  }, []);

  // ── Load roster when selection/filter/page changes ────────────────────────
  const loadRoster = useCallback(async () => {
    if (!selectedOffering) return;
    setRosterLoading(true); setError(null);
    try {
      const res = await instructorClassesApi.getRoster(selectedOffering, {
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: LIMIT,
      });
      setStudents(res.students);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roster');
    } finally {
      setRosterLoading(false);
    }
  }, [selectedOffering, search, statusFilter, page]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, selectedOffering]);

  // ── Open student detail ───────────────────────────────────────────────────
  const openDetail = async (s: RosterStudent) => {
    setDetailStudentName(s.fullName);
    setDetailLoading(true);
    try {
      const view = await instructorClassesApi.getStudentView(selectedOffering, s.studentRecordId);
      setDetailStudent(view);
    } catch {
      setDetailStudent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedOffering);
  const totalPages    = Math.ceil(total / LIMIT);

  if (classesLoading) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Students"
        subtitle={selectedClass
          ? `${selectedClass.course.code} · ${total} enrolled`
          : `${total} students`}
        icon={<GraduationCap className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Class picker */}
        {classes.length > 1 && (
          <div className="relative">
            <select
              value={selectedOffering}
              onChange={e => setSelectedOffering(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--hover-overlay)',
                border:          '1px solid var(--border-default)',
                color:           'var(--text-primary)',
              }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.course.code} — Section {c.section}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
          </div>
        )}

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by name or student ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--hover-overlay)',
              border:          '1px solid var(--border-default)',
              color:           'var(--text-primary)',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="FORCE_ADDED">Force Added</option>
            <option value="DROPPED">Dropped</option>
            <option value="WAITLISTED">Waitlisted</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
        </div>

        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-faint)' }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <ErrorState variant="network" onRetry={loadRoster} description={error} />
      )}

      {!error && students.length === 0 && !rosterLoading ? (
        <EmptyState
          variant="students"
          title="No students found"
          description={
            search
              ? `No students match "${search}".`
              : 'No enrolled students for the selected class.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[700px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Student', 'Program', 'Year', 'GPA', 'Attendance', 'Status', 'Standing', ''].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {rosterLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 bg-(--hover-overlay) rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : students.map(s => {
                      const std = standing(s);
                      const att = s.attendanceRate;
                      return (
                        <tr key={s.studentRecordId} className="hover:bg-(--hover-overlay) transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center shrink-0 font-serif font-bold text-sm text-(--brand-gold)">
                                {s.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-(--text-primary) text-xs">{s.fullName}</p>
                                <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-(--text-secondary) max-w-[160px] truncate text-xs">
                            {s.program?.code ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-xs text-(--text-secondary)">
                            Y{s.yearLevel}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--text-primary)">
                            {s.gpa.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5">
                            {att !== null ? (
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-xs font-semibold ${attColor(att)}`}>{att}%</span>
                                {att < 75 && <AlertTriangle className="w-3.5 h-3.5 text-(--status-danger)" />}
                              </div>
                            ) : (
                              <span className="text-(--text-faint) text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={
                                s.enrollmentStatus === 'ACTIVE'      ? 'emerald' :
                                s.enrollmentStatus === 'FORCE_ADDED' ? 'amber'   :
                                s.enrollmentStatus === 'DROPPED'     ? 'rose'    :
                                'glass'
                              }
                              className="text-[10px]"
                            >
                              {s.enrollmentStatus.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={std.variant} className="text-[10px]">{std.label}</Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => openDetail(s)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-mono text-(--text-faint)">
              <span>{total} students · Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  ← Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Student Detail Modal */}
      <Modal
        isOpen={!!detailStudent || detailLoading}
        onClose={() => { setDetailStudent(null); }}
        title={detailStudentName || 'Student Profile'}
        maxWidth="max-w-2xl"
      >
        {detailLoading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-(--hover-overlay) rounded animate-pulse" />
            ))}
          </div>
        ) : detailStudent ? (
          <div className="space-y-6 font-sans text-sm">
            {/* Identity */}
            <div className="flex items-center gap-4 p-4 bg-(--hover-overlay) rounded-xl border border-(--border-default)">
              <div className="w-12 h-12 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center font-serif font-bold text-xl text-(--brand-gold)">
                {detailStudent.student.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-serif font-bold text-base text-(--text-primary)">{detailStudent.student.fullName}</p>
                <p className="font-mono text-xs text-(--text-faint)">{detailStudent.student.studentId}</p>
                <p className="font-sans text-xs text-(--text-muted)">{detailStudent.student.program?.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-lg font-bold text-(--brand-gold)">{detailStudent.student.gpa.toFixed(2)}</p>
                <p className="font-mono text-[10px] text-(--text-faint)">GPA</p>
              </div>
            </div>

            {/* Attendance */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-3">
                Attendance in This Course
              </p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Present', value: detailStudent.attendance.present,  color: 'var(--status-success)' },
                  { label: 'Absent',  value: detailStudent.attendance.absent,   color: 'var(--status-danger)'  },
                  { label: 'Late',    value: detailStudent.attendance.late,     color: 'var(--status-warning)' },
                  { label: 'Excused', value: detailStudent.attendance.excused,  color: 'var(--text-secondary)' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-(--hover-overlay) rounded-xl text-center border border-(--border-subtle)">
                    <p className="font-mono text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              {detailStudent.attendance.rate !== null && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${detailStudent.attendance.rate}%`,
                        backgroundColor: detailStudent.attendance.rate >= 75
                          ? 'var(--status-success)'
                          : 'var(--status-danger)',
                      }}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold" style={{
                    color: detailStudent.attendance.rate >= 75 ? 'var(--status-success)' : 'var(--status-danger)',
                  }}>
                    {detailStudent.attendance.rate}%
                  </span>
                </div>
              )}
            </div>

            {/* Submissions */}
            {detailStudent.submissions.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-3">Assignment Submissions</p>
                <div className="space-y-2">
                  {detailStudent.submissions.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <div>
                        <p className="font-sans text-xs font-semibold text-(--text-primary)">{sub.assignmentTitle}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {sub.score !== null ? (
                          <p className="font-mono text-sm font-bold text-(--brand-gold)">
                            {sub.score} / {sub.totalPoints}
                          </p>
                        ) : (
                          <Badge variant="amber" className="text-[10px]">Ungraded</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-(--text-muted)">Could not load student details.</p>
        )}
      </Modal>
    </motion.div>
  );
};
