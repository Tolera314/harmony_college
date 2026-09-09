'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  GitBranch, Loader2, Users, BookOpen, UserCheck,
  X, Unlink, Building2, AlertTriangle, CheckCircle2, ArrowRightLeft,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState } from '../../ui/States';
import { useToast, ToastContainer } from '../../ui/States';
import {
  hodCourseAssignmentsApi,
  hodSemestersApi,
  type DHCourseAssignment,
  type DHCourseAssignmentInstructor,
  type DHCourseAssignmentsResponse,
  type Semester,
} from '../../../lib/hodApi';

// ─────────────────────────────────────────────────────────────────────────────
// Instructor option row — used inside the grouped dropdown list
// ─────────────────────────────────────────────────────────────────────────────

const InstructorOption: React.FC<{
  instructor: DHCourseAssignmentInstructor;
  selected: boolean;
  onClick: () => void;
}> = ({ instructor, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
      selected
        ? 'border-(--brand-gold) bg-(--accent-gold-subtle)'
        : 'border-(--border-subtle) bg-(--bg-modal) hover:bg-(--hover-overlay) hover:border-(--border-default)'
    }`}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-sans text-sm font-semibold text-(--text-primary)">{instructor.user.fullName}</span>
        {!instructor.isOwnDept && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-(--status-warning-bg) border border-(--status-warning)/20 text-[10px] font-semibold text-(--status-warning) uppercase tracking-wide">
            <ArrowRightLeft className="w-2.5 h-2.5" />
            Cross-dept
          </span>
        )}
        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-(--brand-gold) shrink-0" />}
      </div>
      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
        <span className="font-mono text-xs text-(--text-faint)">{instructor.employeeId}</span>
        {instructor.specialization && (
          <span className="font-sans text-xs text-(--text-secondary) truncate max-w-[160px]">{instructor.specialization}</span>
        )}
        {!instructor.isOwnDept && (
          <span className="font-sans text-xs text-(--text-faint) flex items-center gap-1">
            <Building2 className="w-3 h-3" />{instructor.departmentName}
          </span>
        )}
      </div>
    </div>
    <div className="shrink-0 text-right">
      <p className="font-mono text-xs font-semibold text-(--text-secondary)">{instructor.assignedOfferings}</p>
      <p className="font-sans text-[10px] text-(--text-faint)">section{instructor.assignedOfferings !== 1 ? 's' : ''}</p>
    </div>
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Assign Instructor Slide Panel
// ─────────────────────────────────────────────────────────────────────────────

interface AssignPanelProps {
  assignment:   DHCourseAssignment;
  instructors:  DHCourseAssignmentInstructor[];
  onAssign:     (instructorId: string) => Promise<void>;
  onUnassign:   () => Promise<void>;
  onClose:      () => void;
  saving:       boolean;
}

const AssignPanel: React.FC<AssignPanelProps> = ({
  assignment, instructors, onAssign, onUnassign, onClose, saving,
}) => {
  const [selectedId, setSelectedId] = useState(assignment.instructor?.id ?? '');

  // Split into own-dept first, then cross-dept
  const ownDept   = instructors.filter(i => i.isOwnDept);
  const crossDept = instructors.filter(i => !i.isOwnDept);

  const selectedInstructor = instructors.find(i => i.id === selectedId);
  const isCrossDeptPick    = selectedInstructor ? !selectedInstructor.isOwnDept : false;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-(--border-default)">
        <div>
          <h2 className="font-serif text-xl font-bold text-(--text-primary)">Assign Instructor</h2>
          <p className="font-sans text-sm text-(--text-secondary) mt-0.5">
            {assignment.course.code} · {assignment.course.name} · Section {assignment.section}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-muted) transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Course info */}
        <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--hover-overlay) space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-(--brand-gold)" />
            <span className="font-sans text-sm font-semibold text-(--text-primary)">{assignment.course.name}</span>
          </div>
          <div className="flex gap-4 flex-wrap text-xs font-sans text-(--text-secondary)">
            <span>Section: <strong>{assignment.section}</strong></span>
            <span>Capacity: <strong>{assignment.capacity}</strong></span>
            <span>Enrolled: <strong>{assignment.enrolledCount}</strong></span>
            <span>Credits: <strong>{assignment.course.creditHours}</strong></span>
          </div>
          <p className="text-xs text-(--text-faint)">{assignment.semester.name}</p>
        </div>

        {/* Current assignment */}
        {assignment.instructor && (
          <div className="p-4 rounded-xl border border-(--status-success)/20 bg-(--status-success-bg) flex items-start justify-between gap-3">
            <div>
              <p className="font-sans text-xs font-semibold text-(--status-success)">Currently Assigned</p>
              <p className="font-sans text-sm font-bold text-(--text-primary) mt-0.5">
                {assignment.instructor.user.fullName}
              </p>
              <p className="font-mono text-xs text-(--text-faint)">{assignment.instructor.employeeId}</p>
              {!assignment.instructor.isOwnDept && (
                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-(--status-warning-bg) border border-(--status-warning)/20 text-[10px] font-semibold text-(--status-warning) uppercase tracking-wide">
                  <ArrowRightLeft className="w-2.5 h-2.5" />Cross-department
                </span>
              )}
            </div>
            <Button
              variant="ghost" size="sm"
              icon={<Unlink className="w-3.5 h-3.5" />}
              disabled={saving}
              onClick={onUnassign}
            >
              Unassign
            </Button>
          </div>
        )}

        {/* Cross-dept warning when a cross-dept instructor is selected */}
        {isCrossDeptPick && (
          <div className="flex gap-3 p-3.5 rounded-xl border border-(--status-warning)/30 bg-(--status-warning-bg)">
            <AlertTriangle className="w-4 h-4 text-(--status-warning) shrink-0 mt-0.5" />
            <p className="font-sans text-xs text-(--status-warning) leading-relaxed">
              <strong>{selectedInstructor!.user.fullName}</strong> is from{' '}
              <strong>{selectedInstructor!.departmentName}</strong>. Their home department,
              employee record, and account will remain unchanged — only this course section
              will be cross-department assigned.
            </p>
          </div>
        )}

        {/* Own-dept instructors */}
        {ownDept.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-(--text-faint) uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Your Department
            </p>
            <div className="space-y-1.5">
              {ownDept.map(i => (
                <InstructorOption
                  key={i.id}
                  instructor={i}
                  selected={selectedId === i.id}
                  onClick={() => setSelectedId(i.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Cross-dept instructors */}
        {crossDept.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-(--text-faint) uppercase tracking-wide flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3" /> Other Departments
            </p>
            {ownDept.length === 0 && (
              <p className="text-xs text-(--text-secondary) font-sans px-1">
                No instructors in your department. Select from another department below.
              </p>
            )}
            <div className="space-y-1.5">
              {crossDept.map(i => (
                <InstructorOption
                  key={i.id}
                  instructor={i}
                  selected={selectedId === i.id}
                  onClick={() => setSelectedId(i.id)}
                />
              ))}
            </div>
          </div>
        )}

        {instructors.length === 0 && (
          <div className="py-8 text-center">
            <Users className="w-8 h-8 text-(--text-faint) mx-auto mb-2" />
            <p className="font-sans text-sm text-(--text-secondary)">No active instructors found.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-(--border-default) flex gap-3">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!selectedId || saving}
          className="flex-1"
          onClick={() => onAssign(selectedId)}
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isCrossDeptPick ? 'Assign (Cross-Dept)' : 'Assign'
          }
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export const DHCourseAssignmentsView: React.FC = () => {
  const [data,      setData]      = useState<DHCourseAssignmentsResponse | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semFilter, setSemFilter] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<DHCourseAssignment | null>(null);
  const [saving,    setSaving]    = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [res, semList] = await Promise.all([
        hodCourseAssignmentsApi.list(semFilter || undefined),
        hodSemestersApi.list(),
      ]);
      setData(res);
      setSemesters(semList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [semFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (instructorId: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await hodCourseAssignmentsApi.assign(selected.offeringId, instructorId);

      // Find the full instructor record so we can update local state with all fields
      const instructor = data?.instructors.find(i => i.id === instructorId);
      setData(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(a =>
          a.offeringId === selected.offeringId
            ? {
                ...a,
                instructor: instructor ? {
                  id:           instructor.id,
                  employeeId:   instructor.employeeId,
                  departmentId: instructor.departmentId,
                  isOwnDept:    instructor.isOwnDept,
                  user:         { fullName: instructor.user.fullName },
                } : null,
              }
            : a
        ),
        // Increment assignedOfferings for the newly assigned instructor
        instructors: prev.instructors.map(i =>
          i.id === instructorId ? { ...i, assignedOfferings: i.assignedOfferings + 1 } : i
        ),
      } : prev);

      setSelected(null);
      showToast(result.message, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to assign instructor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await hodCourseAssignmentsApi.unassign(selected.offeringId);
      setData(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(a =>
          a.offeringId === selected.offeringId ? { ...a, instructor: null } : a
        ),
      } : prev);
      setSelected(null);
      showToast('Instructor unassigned successfully', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to unassign instructor', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <ErrorState variant="generic" title="Course Assignments unavailable" description={error} onRetry={load} />
  );

  const assignments = data?.assignments ?? [];
  const instructors = data?.instructors ?? [];
  const assigned    = assignments.filter(a => a.instructor).length;
  const unassigned  = assignments.filter(a => !a.instructor).length;
  const crossDeptAssigned = assignments.filter(a => a.instructor && !a.instructor.isOwnDept).length;

  return (
    <>
      <ToastContainer
        variant={toast.variant}
        message={toast.message}
        visible={toast.visible}
        onDismiss={hideToast}
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...DURATION.medium, ...EASE.out }}
        className="space-y-6 pb-16"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Course Assignments</h1>
            <p className="font-sans text-sm text-(--text-secondary) mt-1">
              Assign instructors to your department's course sections. Own-department instructors
              are listed first; qualified instructors from other departments are available below.
            </p>
          </div>
          <select
            className="px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) shrink-0"
            value={semFilter}
            onChange={e => setSemFilter(e.target.value)}
          >
            <option value="">All Semesters</option>
            {semesters.map(s => (
              <option key={s.id} value={s.id}>
                {s.academicYear.name} — {s.name}{s.isCurrent ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Sections',  value: assignments.length, color: 'text-(--text-primary)' },
            { label: 'Assigned',        value: assigned,           color: 'text-(--status-success)' },
            { label: 'Unassigned',      value: unassigned,         color: 'text-(--status-danger)' },
            { label: 'Cross-Dept',      value: crossDeptAssigned,  color: 'text-(--status-warning)' },
          ].map(s => (
            <Card key={s.label} hoverable={false} className="p-4 text-center">
              <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" />
          </div>
        ) : assignments.length === 0 ? (
          <Card hoverable={false} className="py-16 text-center">
            <GitBranch className="w-10 h-10 text-(--text-faint) mx-auto mb-3" />
            <p className="font-sans text-sm text-(--text-secondary)">
              No course sections found for this semester.
            </p>
          </Card>
        ) : (
          <Card hoverable={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-(--border-subtle)">
                    {['Course', 'Section', 'Semester', 'Students', 'Instructor', 'Status', 'Action'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-sans text-xs font-semibold text-(--text-faint) uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {assignments.map(a => (
                    <tr key={a.offeringId} className="hover:bg-(--hover-overlay) transition-colors">

                      <td className="px-4 py-3">
                        <p className="font-sans text-sm font-semibold text-(--text-primary)">{a.course.code}</p>
                        <p className="font-sans text-xs text-(--text-faint) max-w-[160px] truncate">{a.course.name}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">
                          Sec {a.section}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-sans text-xs text-(--text-secondary) whitespace-nowrap">
                        {a.semester.name}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-(--text-faint)" />
                          <span className="font-mono text-sm text-(--text-primary)">
                            {a.enrolledCount}/{a.capacity}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {a.instructor ? (
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-sans text-sm text-(--text-primary)">{a.instructor.user.fullName}</p>
                              {!a.instructor.isOwnDept && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-(--status-warning-bg) border border-(--status-warning)/20 text-[10px] font-semibold text-(--status-warning)">
                                  <ArrowRightLeft className="w-2.5 h-2.5" />Cross
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[10px] text-(--text-faint)">{a.instructor.employeeId}</p>
                          </div>
                        ) : (
                          <span className="italic text-xs text-(--status-danger)">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={a.instructor ? 'emerald' : 'rose'}>
                          {a.instructor ? 'Assigned' : 'Open'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<UserCheck className="w-3.5 h-3.5" />}
                          onClick={() => setSelected(a)}
                        >
                          {a.instructor ? 'Change' : 'Assign'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Slide Panel */}
        <AnimatePresence>
          {selected && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
                onClick={() => !saving && setSelected(null)}
              />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-(--bg-modal) border-l border-(--border-default) shadow-2xl flex flex-col"
              >
                <AssignPanel
                  assignment={selected}
                  instructors={instructors}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                  onClose={() => !saving && setSelected(null)}
                  saving={saving}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};
