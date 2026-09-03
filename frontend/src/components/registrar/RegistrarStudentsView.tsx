'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Users, Search, Download, Eye, UserX, Edit, Plus,
  Phone, Mail, X, BookOpen, GraduationCap, TrendingUp,
  Building2, ChevronDown, ChevronRight, Filter, RefreshCw
} from 'lucide-react';
import { DHPageHeader } from '../dh/DHPageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SlidePanel } from '../ui/SlidePanel';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import {
  studentsApi, coursesApi, departmentsApi,
  type StudentListItem, type StudentListResponse, type CourseMeta,
  type DepartmentItem,
} from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = {
  ACTIVE: 'emerald', ON_LEAVE: 'amber', SUSPENDED: 'rose', GRADUATED: 'glass', WITHDRAWN: 'rose',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', ON_LEAVE: 'On Leave', SUSPENDED: 'Suspended',
  GRADUATED: 'Graduated', WITHDRAWN: 'Withdrawn',
};

export const RegistrarStudentsView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType = 'TVET' }) => {
  const [data, setData] = useState<StudentListResponse | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL'); // 'ALL' or departmentId
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const [selected, setSelected] = useState<StudentListItem & Record<string, any> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<CourseMeta | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setSF] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<StudentListItem | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Load students & departments filtered strictly by programType
  const load = useCallback(async (q = search, st = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, deptsRes] = await Promise.all([
        studentsApi.list({ page: 1, limit: 200, search: q, status: st || undefined, programType }),
        departmentsApi.list(programType),
      ]);
      setData(studentsRes);
      setDepartments(deptsRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load student records');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, programType]);

  useEffect(() => {
    load();
    coursesApi.getMeta().then(setMeta).catch(() => {});
  }, [programType]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val, statusFilter), 350);
  };

  const openDetail = async (student: StudentListItem) => {
    setDetailLoading(true);
    try {
      const full = await studentsApi.getById(student.id);
      setSelected(full);
    } catch {
      setSelected(student as any);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      await studentsApi.updateStatus(suspendTarget.id, 'SUSPENDED');
      await load(search, statusFilter);
      if (selected?.id === suspendTarget.id) {
        const fresh = await studentsApi.getById(suspendTarget.id);
        setSelected(fresh);
      }
    } catch { /* silently fail */ }
    finally {
      setSuspendLoading(false);
      setSuspendTarget(null);
    }
  };

  const handleReactivate = async (student: StudentListItem) => {
    try {
      await studentsApi.updateStatus(student.id, 'ACTIVE');
      await load(search, statusFilter);
      if (selected?.id === student.id) {
        const fresh = await studentsApi.getById(student.id);
        setSelected(fresh);
      }
    } catch { /* silently fail */ }
  };

  const toggleDeptCollapse = (deptId: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Group students by Department
  const groupedByDept = useMemo(() => {
    const students = data?.students ?? [];
    const map = new Map<string, { dept: DepartmentItem | { id: string; name: string; code: string }; students: StudentListItem[] }>();

    // Initialize map with all active real departments
    for (const d of departments) {
      if (d.isActive) {
        map.set(d.id, { dept: d, students: [] });
      }
    }

    // Place each student in their department
    for (const s of students) {
      const deptId = s.department?.id;
      if (deptId && map.has(deptId)) {
        map.get(deptId)!.students.push(s);
      } else if (deptId) {
        // Fallback for department not in active list
        map.set(deptId, { dept: s.department, students: [s] });
      } else {
        // Unassigned department
        const unassignedKey = 'UNASSIGNED';
        if (!map.has(unassignedKey)) {
          map.set(unassignedKey, { dept: { id: 'UNASSIGNED', name: 'General Admissions (Department Pending)', code: 'GEN' }, students: [] });
        }
        map.get(unassignedKey)!.students.push(s);
      }
    }

    return Array.from(map.values());
  }, [data, departments]);

  // Display groups based on selected department filter
  const displayedGroups = useMemo(() => {
    if (selectedDeptFilter === 'ALL') return groupedByDept;
    return groupedByDept.filter(g => g.dept.id === selectedDeptFilter);
  }, [groupedByDept, selectedDeptFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16 font-sans text-white"
    >
      <DHPageHeader
        title="Student Records"
        subtitle={`${data?.total ?? 0} students organized by official Harmony College departments`}
        icon={<Users className="w-5 h-5 text-[#E9C349]" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                if (!data) return;
                const csv = ['Student ID,Name,Email,Department,Program,Year,Status,GPA']
                  .concat(data.students.map(s =>
                    `${s.studentId},"${s.user.fullName}",${s.user.email},"${s.department?.name ?? ''}","${s.program?.name ?? ''}",${s.yearLevel},${s.status},${s.gpa}`
                  ))
                  .join('\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = 'students_by_department.csv';
                a.click();
              }}
            >
              Export All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => load(search, statusFilter)}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Top Department Cards: Summary & Interactive Switcher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#E9C349]" /> Filter by Department Card
          </span>
          {selectedDeptFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedDeptFilter('ALL')}
              className="text-xs text-[#E9C349] hover:underline font-semibold"
            >
              Show All Departments
            </button>
          )}
        </div>

        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
          <div className="flex gap-3 min-w-max">
            {/* "All Departments" Card */}
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedDeptFilter('ALL')}
              className={`cursor-pointer w-48 p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                selectedDeptFilter === 'ALL'
                  ? 'bg-gradient-to-br from-[#1E1C15] to-[#121214] border-[#E9C349] shadow-lg shadow-[#E9C349]/10'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  selectedDeptFilter === 'ALL' ? 'bg-[#E9C349] text-black' : 'bg-white/10 text-zinc-400'
                }`}>
                  ALL
                </span>
                <Users className="w-4 h-4 text-[#E9C349]" />
              </div>
              <div className="my-2">
                <p className="font-serif font-bold text-sm text-white">All Departments</p>
                <p className="text-[11px] text-zinc-400">Total Enrolled</p>
              </div>
              <span className="text-lg font-mono font-bold text-[#E9C349]">
                {data?.total ?? 0} students
              </span>
            </motion.div>

            {/* Real Department Cards */}
            {groupedByDept.map(({ dept, students }) => {
              const isSelected = selectedDeptFilter === dept.id;
              return (
                <motion.div
                  key={dept.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDeptFilter(dept.id)}
                  className={`cursor-pointer w-56 p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#1E1C15] to-[#121214] border-[#E9C349] shadow-lg shadow-[#E9C349]/10'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-[#E9C349] text-black' : 'bg-white/10 text-zinc-400'
                    }`}>
                      {dept.code}
                    </span>
                    <Building2 className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="my-2">
                    <p className="font-serif font-bold text-sm text-white line-clamp-1" title={dept.name}>
                      {dept.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">Department</p>
                  </div>
                  <span className={`text-base font-mono font-bold ${students.length > 0 ? 'text-[#E9C349]' : 'text-zinc-500'}`}>
                    {students.length} student{students.length === 1 ? '' : 's'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search students by name, student ID, or email..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => {
              setSF(e.target.value);
              load(search, e.target.value);
            }}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-[#E9C349]"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Department Cards → Students List */}
      {loading ? (
        <SkeletonTable />
      ) : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : displayedGroups.length === 0 ? (
        <EmptyState variant="students" compact />
      ) : (
        <div className="space-y-6">
          {displayedGroups.map(({ dept, students }) => {
            const isCollapsed = collapsedDepts[dept.id] ?? false;

            return (
              <div
                key={dept.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden transition-all shadow-md"
              >
                {/* Department Header Card Bar */}
                <div
                  onClick={() => toggleDeptCollapse(dept.id)}
                  className="px-5 py-4 bg-gradient-to-r from-white/10 to-transparent border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center text-[#E9C349] font-mono font-bold text-sm shrink-0">
                      {dept.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-base font-bold text-white">
                          {dept.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#E9C349]/20 border border-[#E9C349]/30 text-[#E9C349] font-mono text-[11px] font-bold">
                          {students.length} student{students.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Students officially aligned to {dept.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-xs font-mono hidden sm:inline">
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </span>
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Department Students Table */}
                {!isCollapsed && (
                  <div>
                    {students.length === 0 ? (
                      <div className="py-8 px-4 text-center text-xs text-zinc-400">
                        <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-medium text-zinc-300">No students currently registered in {dept.name}.</p>
                        <p className="text-[11px] text-zinc-500 mt-1">When students choose this department, they will immediately appear here.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[800px]">
                          <thead className="bg-black/30 border-b border-white/5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            <tr>
                              <th className="px-4 py-3">Student</th>
                              <th className="px-4 py-3">Student ID</th>
                              <th className="px-4 py-3">Program / Major</th>
                              <th className="px-4 py-3">Year</th>
                              <th className="px-4 py-3">GPA</th>
                              <th className="px-4 py-3">Credits</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {students.map(student => (
                              <tr key={student.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#E9C349]/20 border border-[#E9C349]/40 flex items-center justify-center font-serif font-bold text-xs text-[#E9C349] shrink-0">
                                      {student.user.fullName[0]}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-white text-xs truncate">{student.user.fullName}</p>
                                      <p className="text-[10px] text-zinc-400 font-mono truncate">{student.user.email}</p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 font-mono text-xs text-zinc-300">
                                  {student.studentId}
                                </td>

                                <td className="px-4 py-3.5 text-xs text-zinc-300 truncate max-w-[180px]">
                                  <div className="flex flex-col">
                                    <span className="truncate">{student.program?.name || 'Academic Program'}</span>
                                    {((student as any).shortProgramDuration || student.user.studentProfile?.shortProgramDuration) && (
                                      <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 w-fit">
                                        ⏱ {(student as any).shortProgramDuration || student.user.studentProfile?.shortProgramDuration}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-xs text-zinc-400 font-mono">
                                  Year {student.yearLevel}
                                </td>

                                <td className="px-4 py-3.5 font-mono text-xs font-semibold text-white">
                                  {student.gpa.toFixed(2)}
                                </td>

                                <td className="px-4 py-3.5 font-mono text-xs text-zinc-400">
                                  {student.totalCredits} cr
                                </td>

                                <td className="px-4 py-3.5">
                                  <Badge variant={STATUS_BADGE[student.status] ?? 'glass'}>
                                    {STATUS_LABEL[student.status] ?? student.status}
                                  </Badge>
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openDetail(student)}
                                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                      title="View Student Record"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    {student.status === 'ACTIVE' && (
                                      <button
                                        onClick={() => setSuspendTarget(student)}
                                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                                        title="Suspend Student"
                                      >
                                        <UserX className="w-4 h-4" />
                                      </button>
                                    )}
                                    {student.status === 'SUSPENDED' && (
                                      <button
                                        onClick={() => handleReactivate(student)}
                                        className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors"
                                        title="Reactivate Student"
                                      >
                                        <Users className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Detail SlidePanel */}
      <SlidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.user?.fullName ?? 'Student Profile'}
        subtitle="Institutional Student Record"
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5 text-sm font-sans">
            {/* Student Header */}
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E9C349]/20 border-2 border-[#E9C349]/40 flex items-center justify-center font-serif font-bold text-2xl text-[#E9C349]">
                {selected.user.fullName[0]}
              </div>
              <div>
                <p className="font-sans text-base font-bold text-white">{selected.user.fullName}</p>
                <p className="font-mono text-xs text-zinc-400">{selected.studentId}</p>
                <div className="mt-1.5 flex gap-2">
                  <Badge variant={STATUS_BADGE[selected.status] ?? 'glass'}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </Badge>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-mono text-zinc-300">
                    {selected.department?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#E9C349] font-bold">Academic Alignment</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block">Department</span>
                  <span className="font-semibold text-white">{selected.department?.name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Program</span>
                  <span className="font-semibold text-white">{selected.program?.name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Current Year</span>
                  <span className="font-semibold text-white">Year {selected.yearLevel}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Cumulative GPA</span>
                  <span className="font-mono font-bold text-[#E9C349]">{selected.gpa?.toFixed(2) ?? '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">Contact Information</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block">Official Email</span>
                  <span className="font-mono text-white">{selected.user.email}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Phone</span>
                  <span className="font-mono text-white">{selected.user.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Suspend Confirmation Modal */}
      <ConfirmModal
        isOpen={!!suspendTarget}
        title="Suspend Student"
        message={`Are you sure you want to suspend student ${suspendTarget?.user?.fullName} (${suspendTarget?.studentId})?`}
        confirmLabel="Suspend Student"
        variant="danger"
        onConfirm={handleSuspend}
        onClose={() => setSuspendTarget(null)}
      />
    </motion.div>
  );
};
