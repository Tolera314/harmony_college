'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { GraduationCap, Search, RefreshCw, ChevronDown, Sparkles } from 'lucide-react';
import { hodStudentsApi, type StudentSummary, type StudentDetail } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SlidePanel } from '../../ui/SlidePanel';
import { ErrorState, EmptyState, SkeletonTable } from '../../ui/States';
import { getAcademicFilters, getFilterParamName, transformFilterValue, type ProgramType } from '@/src/lib/academicFilters';

const standingConfig = (gpa: number): { variant: 'emerald' | 'gold' | 'amber' | 'rose'; label: string; color: string } => {
  if (gpa >= 3.5) return { variant: 'emerald', label: 'Excellent', color: 'text-(--status-success)' };
  if (gpa >= 3.0) return { variant: 'gold',    label: 'Good',      color: 'text-(--brand-gold)' };
  if (gpa >= 2.0) return { variant: 'amber',   label: 'Warning',   color: 'text-(--status-warning)' };
  return          { variant: 'rose',    label: 'Probation', color: 'text-(--status-danger)' };
};

const isNew = (admittedAt: string | null | undefined, daysThreshold = 30): boolean => {
  if (!admittedAt) return false;
  const diff = Date.now() - new Date(admittedAt).getTime();
  return diff < daysThreshold * 24 * 60 * 60 * 1000;
};

const attColor = (rate: number | null) =>
  rate === null ? 'text-(--text-faint)' :
  rate >= 90 ? 'text-(--status-success)' :
  rate >= 80 ? 'text-(--brand-gold)' : 'text-(--status-danger)';

export const DHStudentsView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType = 'TVET' }) => {
  const [students,  setStudents]  = useState<StudentSummary[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [academicFilter, setAcademicFilter] = useState(''); // Renamed from yearFilter to be program-type agnostic
  const [statusFilter, setStatusFilter] = useState('');
  const [selected,  setSelected]  = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 15;

  // Get the appropriate filter parameter name based on program type
  const filterParamName = getFilterParamName(programType);
  
  // Reset filter when program type changes
  useEffect(() => {
    setAcademicFilter('');
    setPage(1);
  }, [programType]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const filterValue = transformFilterValue(programType, academicFilter);
      const params: any = {
        page:      p,
        limit:     LIMIT,
        search:    search || undefined,
        status:    statusFilter || undefined,
        programType: programType, // Include programType to ensure correct filtering
      };
      
      // Add the appropriate filter parameter based on program type
      if (filterValue !== undefined) {
        if (programType === 'SHORT_PROGRAM') {
          params.shortProgramDuration = filterValue;
        } else {
          params.yearLevel = filterValue;
        }
      }
      
      const res = await hodStudentsApi.list(params);
      setStudents(res.students);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, academicFilter, statusFilter, programType]);

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
          {/* Dynamic academic filters based on program type */}
          {programType === 'TVET' && getAcademicFilters(programType).map(filter => (
            <button 
              key={filter.value} 
              onClick={() => { setAcademicFilter(filter.value); setPage(1); }}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${
                academicFilter === filter.value 
                  ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' 
                  : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              {filter.displayLabel}
            </button>
          ))}
          
          {/* For Short Program, use a dropdown for durations */}
          {programType === 'SHORT_PROGRAM' && (
            <select
              value={academicFilter}
              onChange={e => { setAcademicFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              {getAcademicFilters(programType).map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          )}
          
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={s.status === 'ACTIVE' ? 'emerald' : s.status === 'SUSPENDED' ? 'rose' : 'amber'}>
                          {s.status}
                        </Badge>
                        {isNew(s.admittedAt) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E9C349]/20 border border-[#E9C349]/40 text-[10px] font-mono font-bold text-(--brand-gold) uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            New
                          </span>
                        )}
                      </div>
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
      <SlidePanel 
        isOpen={!!selected || detailLoading} 
        onClose={() => setSelected(null)} 
        title={selected ? `${selected.user.fullName} - Academic Record` : "Student Academic Record"} 
        subtitle="Department Head View • Read-only" 
        width="max-w-3xl"
      >
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin w-8 h-8 rounded-full border-3 border-(--brand-gold) border-t-transparent" />
            <p className="text-sm text-(--text-secondary) font-sans">Loading student information...</p>
          </div>
        ) : selected ? (
          <div className="space-y-6 text-sm font-sans">
            {/* Header with Status Badge */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center shrink-0 shadow-lg">
                  <span className="font-serif font-bold text-3xl text-(--brand-gold)">{selected.user.fullName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-serif text-xl font-bold text-(--text-primary)">{selected.user.fullName}</p>
                  <p className="font-mono text-sm text-(--text-faint) mt-0.5">Student ID: {selected.studentId}</p>
                  <p className="text-sm text-(--text-muted) mt-1">{selected.program?.name ?? 'No Program'}</p>
                  {selected.user.email && (
                    <p className="text-xs text-(--text-secondary) mt-1">📧 {selected.user.email}</p>
                  )}
                </div>
              </div>
              <Badge 
                variant={
                  selected.status === 'ACTIVE' ? 'emerald' : 
                  selected.status === 'SUSPENDED' ? 'rose' : 
                  selected.status === 'ON_LEAVE' ? 'amber' : 'glass'
                }
              >
                {selected.status}
              </Badge>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Cumulative GPA', value: selected.gpa.toFixed(2), icon: '📊' },
                { label: 'Year Level', value: `Year ${selected.yearLevel}`, icon: '🎓' },
                { label: 'Attendance Rate', value: selected.attendance.rate !== null ? `${selected.attendance.rate}%` : 'N/A', icon: '✓' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center hover:border-(--brand-gold) transition-colors">
                  <p className="text-2xl mb-1">{item.icon}</p>
                  <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint)">{item.label}</p>
                  <p className="font-mono text-2xl font-bold text-(--brand-gold) mt-2">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Contact & Program Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-2">📞 Contact</p>
                <p className="text-sm text-(--text-primary)">{selected.user.phone || 'Not provided'}</p>
              </div>
              <div className="p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-2">📅 Admission Date</p>
                <p className="text-sm text-(--text-primary)">
                  {selected.admittedAt ? new Date(selected.admittedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Attendance summary */}
            <div className="p-5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-4 flex items-center gap-2">
                <span>📊</span> Attendance Summary
              </p>
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                {[
                  { label: 'Present', value: selected.attendance.present, color: 'text-(--status-success)', emoji: '✓' },
                  { label: 'Absent',  value: selected.attendance.absent,  color: 'text-(--status-danger)', emoji: '✗' },
                  { label: 'Late',    value: selected.attendance.late,    color: 'text-(--status-warning)', emoji: '⏰' },
                  { label: 'Excused', value: selected.attendance.excused, color: 'text-(--text-secondary)', emoji: '📋' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-(--bg-base) rounded-lg border border-(--border-subtle)">
                    <p className="text-xl mb-1">{item.emoji}</p>
                    <p className={`font-mono font-bold text-2xl ${item.color}`}>{item.value}</p>
                    <p className="text-(--text-faint) text-xs mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Enrollment history */}
            {selected.enrollments.length > 0 ? (
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-3 flex items-center gap-2">
                  <span>📚</span> Course Enrollments ({selected.enrollments.length})
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {selected.enrollments.map(en => (
                    <div key={en.id} className="flex items-center justify-between p-4 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-xs hover:border-(--brand-gold) transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold text-(--brand-gold)">{en.courseOffering.course.code}</p>
                          {en.grade?.letterGrade && (
                            <Badge variant="gold">{en.grade.letterGrade}</Badge>
                          )}
                        </div>
                        <p className="text-(--text-primary) text-sm mt-0.5">{en.courseOffering.course.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-(--text-faint) text-xs font-mono">
                            {en.courseOffering.semester.name} · {en.courseOffering.semester.academicYear.name}
                          </p>
                          {en.courseOffering.course.creditHours && (
                            <span className="text-(--text-faint) text-xs">
                              {en.courseOffering.course.creditHours} Credits
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {en.grade?.letterGrade ? (
                          <div>
                            <p className="font-mono font-bold text-2xl text-(--brand-gold)">{en.grade.letterGrade}</p>
                            <p className="text-xs text-(--text-faint) mt-1">{en.grade.numericGrade?.toFixed(1) || 'N/A'}</p>
                          </div>
                        ) : (
                          <Badge variant="amber">In Progress</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="text-sm text-(--text-faint)">No course enrollments found</p>
              </div>
            )}

            {/* Info Notice */}
            <div className="p-4 bg-(--status-info-bg) border border-(--status-info-border) rounded-xl text-xs text-(--text-secondary) flex items-start gap-2">
              <span className="shrink-0">ℹ️</span>
              <p>
                <strong>Department Head View:</strong> This information is read-only. 
                Grades, attendance, and enrollment modifications can only be made by authorized instructors and registrars.
              </p>
            </div>
          </div>
        ) : null}
      </SlidePanel>
    </motion.div>
  );
};
