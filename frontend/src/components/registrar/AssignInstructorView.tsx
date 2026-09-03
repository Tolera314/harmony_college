'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck, Building2, BookOpen, Users, Plus, Eye, EyeOff,
  CheckCircle2, AlertCircle, RefreshCw, ChevronRight, Calendar,
  Search, ShieldAlert, Sparkles, X, Filter, Pencil, Trash2
} from 'lucide-react';
import { DHPageHeader } from '../dh/DHPageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SlidePanel } from '../ui/SlidePanel';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import {
  departmentsApi,
  type DepartmentItem,
  type DepartmentStructureResponse,
} from '@/src/lib/registrarApi';

export const AssignInstructorView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType: propProgramType = 'TVET' }) => {
  const [activeProgramType, setActiveProgramType] = useState<'TVET' | 'SHORT_PROGRAM'>(propProgramType);
  const [selectedDuration, setSelectedDuration] = useState<'ALL' | '2 Months' | '4 Months'>('ALL');

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [structure, setStructure] = useState<DepartmentStructureResponse | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('current');

  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync prop change
  useEffect(() => {
    setActiveProgramType(propProgramType);
  }, [propProgramType]);

  // Search & filter
  const [deptSearch, setDeptSearch] = useState('');
  const [showHiddenDepts, setShowHiddenDepts] = useState(false);

  // Add Department panel state
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addDeptName, setAddDeptName] = useState('');
  const [addDeptCode, setAddDeptCode] = useState('');
  const [addDeptDesc, setAddDeptDesc] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);

  // Add Course panel state
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseDuration, setNewCourseDuration] = useState<'2 Months' | '4 Months'>('2 Months');
  const [newCourseInstructorId, setNewCourseInstructorId] = useState<string>('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Assigning instructor loading state per course
  const [assigningMap, setAssigningMap] = useState<Record<string, boolean>>({});

  // Edit Course panel state
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCredits, setEditCourseCredits] = useState(3);
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [savingCourseEdit, setSavingCourseEdit] = useState(false);

  // Delete Course modal state
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<{ id: string; code: string; name: string } | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Load departments filtered strictly by activeProgramType
  const loadDepartments = useCallback(async () => {
    setLoadingDepts(true);
    setError(null);
    try {
      const list = await departmentsApi.list(activeProgramType);
      setDepartments(list);
      // Select first active department if none selected
      if (list.length > 0) {
        const firstActive = list.find(d => d.isActive) ?? list[0];
        if (firstActive) setSelectedDeptId(firstActive.id);
        else setSelectedDeptId(null);
      } else {
        setSelectedDeptId(null);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load departments');
    } finally {
      setLoadingDepts(false);
    }
  }, [activeProgramType]);

  useEffect(() => {
    setSelectedDeptId(null);
    setStructure(null);
    loadDepartments();
  }, [activeProgramType, loadDepartments]);

  // 2. Load structure for selected department & semester
  const loadStructure = useCallback(async (deptId: string, semId?: string) => {
    setLoadingStructure(true);
    try {
      const data = await departmentsApi.getStructure(deptId, semId === 'current' ? undefined : semId);
      setStructure(data);
      if (data.selectedSemesterId) {
        setSelectedSemesterId(data.selectedSemesterId);
      }
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load department structure', 'error');
    } finally {
      setLoadingStructure(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      loadStructure(selectedDeptId, selectedSemesterId);
    }
  }, [selectedDeptId, selectedSemesterId]);

  // 3. Toggle department active/hidden
  const handleToggleStatus = async (dept: DepartmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await departmentsApi.toggleStatus(dept.id);
      setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, isActive: updated.isActive } : d));
      showToast(`${dept.name} is now ${updated.isActive ? 'Visible' : 'Hidden'}`);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update department status', 'error');
    }
  };

  // 4. Create new department (inherits active programType)
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDeptName.trim() || !addDeptCode.trim()) return;
    setCreatingDept(true);
    try {
      const created = await departmentsApi.create({
        name: addDeptName.trim(),
        code: addDeptCode.trim().toUpperCase(),
        description: addDeptDesc.trim() || undefined,
        programType: activeProgramType,
      });
      setDepartments(prev => [...prev, created]);
      setSelectedDeptId(created.id);
      setAddDeptOpen(false);
      setAddDeptName('');
      setAddDeptCode('');
      setAddDeptDesc('');
      showToast(`${activeProgramType === 'SHORT_PROGRAM' ? 'Short Program' : 'TVET'} department "${created.name}" created successfully`);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to create department', 'error');
    } finally {
      setCreatingDept(false);
    }
  };

  // 5. Add course to department
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !newCourseCode.trim() || !newCourseName.trim()) return;
    setCreatingCourse(true);
    try {
      await departmentsApi.addCourse(selectedDeptId, {
        code: newCourseCode.trim().toUpperCase(),
        name: newCourseName.trim(),
        creditHours: Number(newCourseCredits) || 3,
        description: newCourseDesc.trim() || undefined,
        semesterId: selectedSemesterId !== 'current' ? selectedSemesterId : undefined,
        instructorId: newCourseInstructorId || null,
      });
      setAddCourseOpen(false);
      setNewCourseCode('');
      setNewCourseName('');
      setNewCourseCredits(3);
      setNewCourseDesc('');
      setNewCourseInstructorId('');
      showToast('Course added successfully to department');
      loadStructure(selectedDeptId, selectedSemesterId);
      loadDepartments(); // refresh course counts
    } catch (e: any) {
      showToast(e.message ?? 'Failed to create course', 'error');
    } finally {
      setCreatingCourse(false);
    }
  };

  // 5b. Edit course details
  const handleOpenEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setEditCourseCode(course.code);
    setEditCourseName(course.name);
    setEditCourseCredits(course.creditHours || 3);
    setEditCourseDesc(course.description || '');
    setEditCourseOpen(true);
  };

  const handleSaveEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourseId || !editCourseCode.trim() || !editCourseName.trim()) return;
    setSavingCourseEdit(true);
    try {
      await departmentsApi.updateCourse(editingCourseId, {
        code: editCourseCode.trim().toUpperCase(),
        name: editCourseName.trim(),
        creditHours: Number(editCourseCredits) || 3,
        description: editCourseDesc.trim() || undefined,
      });
      setEditCourseOpen(false);
      showToast('Course updated successfully');
      if (selectedDeptId) await loadStructure(selectedDeptId, selectedSemesterId);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update course', 'error');
    } finally {
      setSavingCourseEdit(false);
    }
  };

  // 5c. Delete course (allows deleting test courses)
  const handleConfirmDeleteCourse = async () => {
    if (!deleteCourseTarget) return;
    setDeletingCourse(true);
    try {
      await departmentsApi.deleteCourse(deleteCourseTarget.id);
      showToast(`Course "${deleteCourseTarget.name}" (${deleteCourseTarget.code}) deleted successfully`);
      setDeleteCourseTarget(null);
      if (selectedDeptId) await loadStructure(selectedDeptId, selectedSemesterId);
      loadDepartments(); // refresh course counts in department cards
    } catch (e: any) {
      showToast(e.message ?? 'Failed to delete course', 'error');
    } finally {
      setDeletingCourse(false);
    }
  };

  // 6. Assign or change instructor for a course
  const handleAssignInstructor = async (courseId: string, instructorId: string | null, shortProgramDuration?: string | null) => {
    if (!selectedSemesterId || selectedSemesterId === 'current') {
      showToast('Please select a specific semester to assign an instructor.', 'error');
      return;
    }
    setAssigningMap(prev => ({ ...prev, [courseId]: true }));
    try {
      await departmentsApi.assignInstructor({
        courseId,
        semesterId: selectedSemesterId,
        instructorId,
        shortProgramDuration: shortProgramDuration ?? (activeProgramType === 'SHORT_PROGRAM' ? '2 Months' : null),
      });
      showToast(instructorId ? 'Instructor assigned successfully' : 'Instructor unassigned');
      if (selectedDeptId) {
        await loadStructure(selectedDeptId, selectedSemesterId);
      }
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update instructor assignment', 'error');
    } finally {
      setAssigningMap(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // 6b. Set / update course duration for Short Program
  const handleSetCourseDuration = async (course: DepartmentStructureResponse['courses'][0], duration: string) => {
    if (!selectedSemesterId || selectedSemesterId === 'current') {
      showToast('Please select a specific semester to update duration.', 'error');
      return;
    }
    setAssigningMap(prev => ({ ...prev, [course.id]: true }));
    try {
      await departmentsApi.assignInstructor({
        courseId: course.id,
        semesterId: selectedSemesterId,
        instructorId: course.instructorId,
        shortProgramDuration: duration,
      });
      showToast(`Course duration set to ${duration}`);
      if (selectedDeptId) {
        await loadStructure(selectedDeptId, selectedSemesterId);
      }
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update duration', 'error');
    } finally {
      setAssigningMap(prev => ({ ...prev, [course.id]: false }));
    }
  };

  // Filtered department list
  const filteredDepts = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
                          d.code.toLowerCase().includes(deptSearch.toLowerCase());
    const matchesVisibility = showHiddenDepts ? true : d.isActive;
    return matchesSearch && matchesVisibility;
  });

  const selectedDepartment = departments.find(d => d.id === selectedDeptId);

  return (
    <div className="space-y-6 pb-16 font-sans text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
            }`}
          >
            {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <DHPageHeader
        title="Assign Instructor"
        subtitle="Academic Department Structure & Instructor Allocation"
        icon={<UserCheck className="w-5 h-5 text-[#E9C349]" />}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => {
                loadDepartments();
                if (selectedDeptId) loadStructure(selectedDeptId, selectedSemesterId);
              }}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setAddDeptOpen(true)}
            >
              Add Department
            </Button>
          </div>
        }
      />

      {/* TVET vs Short Program Academic Level Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 text-[#E9C349]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Academic Level Selection</h3>
              <Badge variant="amber">{activeProgramType === 'TVET' ? 'TVET Academic Structure' : 'Short Program Academic Structure'}</Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Separate academic departments with unified, non-duplicated faculty assignments</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (activeProgramType !== 'TVET') {
                setActiveProgramType('TVET');
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeProgramType === 'TVET'
                ? 'bg-[#E9C349] text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ TVET ]
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeProgramType !== 'SHORT_PROGRAM') {
                setActiveProgramType('SHORT_PROGRAM');
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeProgramType === 'SHORT_PROGRAM'
                ? 'bg-[#E9C349] text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ Short Program ]
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">Active Departments</span>
            <span className="text-2xl font-bold font-serif text-[#E9C349] mt-1 block">
              {departments.filter(d => d.isActive).length} / {departments.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E9C349]/10 border border-[#E9C349]/20 flex items-center justify-center text-[#E9C349]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">Department Courses</span>
            <span className="text-2xl font-bold font-serif text-white mt-1 block">
              {structure?.courses.length ?? 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">Registered Instructors</span>
            <span className="text-2xl font-bold font-serif text-emerald-400 mt-1 block">
              {structure?.instructors.length ?? 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Department Cards Switcher Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-white tracking-wide">
              Official Academic Departments
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono text-zinc-300">
              {filteredDepts.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-48">
              <Input
                placeholder="Filter departments..."
                value={deptSearch}
                onChange={e => setDeptSearch(e.target.value)}
                icon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
            <button
              onClick={() => setShowHiddenDepts(p => !p)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                showHiddenDepts
                  ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showHiddenDepts ? 'Showing All' : 'Show Hidden'}
            </button>
          </div>
        </div>

        {/* Horizontal Row-Switch Cards Layout */}
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
          <div className="flex gap-3 min-w-max">
            {filteredDepts.map(dept => {
              const isSelected = selectedDeptId === dept.id;
              return (
                <motion.div
                  key={dept.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`cursor-pointer w-64 p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#1C1B17] to-[#121214] border-[#E9C349] shadow-lg shadow-[#E9C349]/10'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {/* Top Bar: Code + Hide/Show Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider ${
                      isSelected ? 'bg-[#E9C349] text-black' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {dept.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        title={dept.isActive ? 'Hide department' : 'Show department'}
                        onClick={(e) => handleToggleStatus(dept, e)}
                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      >
                        {dept.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Department Name */}
                  <div className="my-3">
                    <h4 className={`text-sm font-bold leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                      {dept.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1">
                      {dept.description || 'Harmony College Academic Division'}
                    </p>
                  </div>

                  {/* Footer Counts */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-zinc-500" />
                      {dept._count?.courses ?? 0} courses
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-zinc-500" />
                      {dept._count?.instructors ?? 0} staff
                    </span>
                  </div>

                  {/* Active Selection Glow bar */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#E9C349]" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Department Academic Structure: Department → Semester → Courses → Instructor */}
      {selectedDepartment && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6">
          {/* Header of Active Department */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-[#E9C349]/20 border border-[#E9C349]/30 text-[#E9C349] font-mono text-xs font-bold">
                  {selectedDepartment.code}
                </span>
                <h3 className="font-serif text-xl font-bold text-white">
                  {selectedDepartment.name}
                </h3>
                <Badge variant={selectedDepartment.isActive ? 'emerald' : 'glass'}>
                  {selectedDepartment.isActive ? 'Active' : 'Hidden'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {selectedDepartment.description || 'Academic courses, semester organization, and instructor allocation.'}
              </p>
            </div>

            {/* Actions for this department */}
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setAddCourseOpen(true)}
              >
                Add Course to Department
              </Button>
            </div>
          </div>

          {/* Semester Selector Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E9C349]" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">Select Semester:</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {(structure?.semesters ?? []).map(sem => {
                const isCurrent = sem.isCurrent;
                const isSelected = selectedSemesterId === sem.id;
                return (
                  <button
                    key={sem.id}
                    onClick={() => setSelectedSemesterId(sem.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#E9C349] text-black border-[#E9C349] shadow-md'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{sem.name}</span>
                    {sem.academicYear && (
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                        ({sem.academicYear.name})
                      </span>
                    )}
                    {isCurrent && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                        isSelected ? 'bg-black text-[#E9C349]' : 'bg-[#E9C349]/20 text-[#E9C349]'
                      }`}>
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Selector Tabs for Short Program */}
          {activeProgramType === 'SHORT_PROGRAM' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#E9C349] font-bold">Short Program Duration:</span>
                <span className="text-xs text-zinc-400">Filter courses by duration period</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['ALL', '2 Months', '4 Months'] as const).map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSelectedDuration(dur)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      selectedDuration === dur
                        ? 'bg-[#E9C349] text-black border-[#E9C349] shadow'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {dur === 'ALL' ? 'All Durations' : dur}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Courses & Assigned Instructors Table */}
          {loadingStructure ? (
            <SkeletonTable />
          ) : structure?.courses.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl space-y-3">
              <BookOpen className="w-10 h-10 text-zinc-500 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No courses in this department yet</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Add courses to {selectedDepartment.name} to start assigning instructors.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setAddCourseOpen(true)}
              >
                Add First Course
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/10 rounded-2xl bg-black/30 backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3.5">Course</th>
                    <th className="px-4 py-3.5">Credits</th>
                    {activeProgramType === 'SHORT_PROGRAM' && (
                      <th className="px-4 py-3.5">Duration</th>
                    )}
                    <th className="px-4 py-3.5">Section</th>
                    <th className="px-4 py-3.5">Assigned Instructor</th>
                    <th className="px-4 py-3.5">Allocation Action</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {structure?.courses
                    .filter(course => {
                      if (activeProgramType !== 'SHORT_PROGRAM' || selectedDuration === 'ALL') return true;
                      return (course.shortProgramDuration || '2 Months') === selectedDuration;
                    })
                    .map(course => {
                    const isAssigning = assigningMap[course.id] ?? false;
                    const assignedInstructor = course.instructor;

                    return (
                      <tr key={course.id} className="hover:bg-white/5 transition-colors">
                        {/* Course Info */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center font-mono font-bold text-xs text-[#E9C349]">
                              {course.code.slice(0, 3)}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-xs">{course.name}</p>
                              <p className="font-mono text-[10px] text-zinc-400">{course.code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Credits */}
                        <td className="px-4 py-3.5 font-mono text-zinc-300">
                          {course.creditHours} cr
                        </td>

                        {/* Duration for Short Program */}
                        {activeProgramType === 'SHORT_PROGRAM' && (
                          <td className="px-4 py-3.5 font-mono">
                            <select
                              value={course.shortProgramDuration || '2 Months'}
                              onChange={(e) => handleSetCourseDuration(course, e.target.value)}
                              className="px-2.5 py-1 bg-black/60 border border-white/10 rounded-lg text-xs font-mono text-[#E9C349] focus:outline-none focus:border-[#E9C349]"
                            >
                              <option value="2 Months">2 Months</option>
                              <option value="4 Months">4 Months</option>
                            </select>
                          </td>
                        )}

                        {/* Section */}
                        <td className="px-4 py-3.5 font-mono text-zinc-400">
                          {course.section}
                        </td>

                        {/* Current Instructor */}
                        <td className="px-4 py-3.5">
                          {assignedInstructor ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E9C349]/50 bg-zinc-800 flex items-center justify-center text-xs font-bold font-serif text-[#E9C349] shrink-0">
                                {assignedInstructor.user.avatarUrl ? (
                                  <img src={assignedInstructor.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  assignedInstructor.user.fullName.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white text-xs truncate">
                                  {assignedInstructor.user.fullName}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  {assignedInstructor.title || 'Instructor'} &bull; {assignedInstructor.user.email}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="amber">Unassigned</Badge>
                          )}
                        </td>

                        {/* Instructor Assignment Dropdown */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              disabled={isAssigning}
                              value={course.instructorId ?? ''}
                              onChange={(e) => handleAssignInstructor(course.id, e.target.value || null)}
                              className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-[#E9C349] transition-colors disabled:opacity-50"
                            >
                              <option value="">— Select Instructor —</option>
                              {(structure?.instructors ?? []).map(inst => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.user.fullName} ({inst.department?.code ?? 'Staff'})
                                </option>
                              ))}
                            </select>

                            {isAssigning && (
                              <div className="w-4 h-4 border-2 border-[#E9C349] border-t-transparent rounded-full animate-spin shrink-0" />
                            )}
                          </div>
                        </td>

                        {/* Course Actions: Edit & Delete */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCourse(course)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#E9C349]/20 text-zinc-300 hover:text-[#E9C349] border border-white/10 hover:border-[#E9C349]/40 transition-colors"
                              title="Edit Course"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCourseTarget({ id: course.id, code: course.code, name: course.name })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/40 transition-colors"
                              title="Delete Course (Test Cleanup)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SlidePanel: Add Department */}
      <SlidePanel
        isOpen={addDeptOpen}
        onClose={() => setAddDeptOpen(false)}
        title="Add Academic Department"
        subtitle="Create a new official department in Harmony College"
        width="max-w-md"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Department Name *</label>
            <Input
              required
              placeholder="e.g. Photography & Videography"
              value={addDeptName}
              onChange={e => setAddDeptName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Department Code *</label>
            <Input
              required
              placeholder="e.g. PHOTO"
              value={addDeptCode}
              onChange={e => setAddDeptCode(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of the department's academic focus..."
              value={addDeptDesc}
              onChange={e => setAddDeptDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E9C349]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setAddDeptOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creatingDept}>
              {creatingDept ? 'Creating...' : 'Create Department'}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* SlidePanel: Add Course to Department */}
      <SlidePanel
        isOpen={addCourseOpen}
        onClose={() => setAddCourseOpen(false)}
        title={`Add Course to ${selectedDepartment?.name ?? 'Department'}`}
        subtitle="Register a new course and optionally allocate an instructor"
        width="max-w-lg"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Course Code *</label>
              <Input
                required
                placeholder="e.g. PVID-101"
                value={newCourseCode}
                onChange={e => setNewCourseCode(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Credit Hours *</label>
              <Input
                type="number"
                min={1}
                max={10}
                required
                value={newCourseCredits}
                onChange={e => setNewCourseCredits(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Course Title *</label>
            <Input
              required
              placeholder="e.g. Fundamentals of Digital Lighting"
              value={newCourseName}
              onChange={e => setNewCourseName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Assign Initial Instructor (Optional)</label>
            <select
              value={newCourseInstructorId}
              onChange={e => setNewCourseInstructorId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#E9C349]"
            >
              <option value="">— Unassigned —</option>
              {(structure?.instructors ?? []).map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.user.fullName} ({inst.department?.code ?? 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Course Syllabus &amp; Description</label>
            <textarea
              rows={3}
              placeholder="Outline course objectives, prerequisites, and learning outcomes..."
              value={newCourseDesc}
              onChange={e => setNewCourseDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E9C349]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setAddCourseOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creatingCourse}>
              {creatingCourse ? 'Adding Course...' : 'Add Course'}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* SlidePanel: Edit Course */}
      <SlidePanel
        isOpen={editCourseOpen}
        onClose={() => setEditCourseOpen(false)}
        title="Edit Course Details"
        subtitle="Update course code, title, credit hours, or syllabus overview"
        width="max-w-lg"
      >
        <form onSubmit={handleSaveEditCourse} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Course Code *</label>
              <Input
                required
                placeholder="e.g. CUB-101"
                value={editCourseCode}
                onChange={e => setEditCourseCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Credit Hours *</label>
              <Input
                required
                type="number"
                min={1}
                max={10}
                value={editCourseCredits}
                onChange={e => setEditCourseCredits(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Course Title *</label>
            <Input
              required
              placeholder="e.g. Advanced Cubase Mixing & DAW Sequencing"
              value={editCourseName}
              onChange={e => setEditCourseName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Description</label>
            <textarea
              rows={3}
              placeholder="Course syllabus description..."
              value={editCourseDesc}
              onChange={e => setEditCourseDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E9C349]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setEditCourseOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={savingCourseEdit}>
              {savingCourseEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* Delete Course Confirmation Dialog */}
      <AnimatePresence>
        {deleteCourseTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#18181B] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-white">Delete Course?</h3>
                  <p className="text-xs text-zinc-400 font-mono">{deleteCourseTarget.code}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to delete course <strong className="text-white">{deleteCourseTarget.name}</strong> ({deleteCourseTarget.code})?
                This will permanently remove the course and any test offerings. This cannot be undone.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={deletingCourse}
                  onClick={() => setDeleteCourseTarget(null)}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={deletingCourse}
                  onClick={handleConfirmDeleteCourse}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                >
                  {deletingCourse ? 'Deleting...' : 'Delete Course'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
