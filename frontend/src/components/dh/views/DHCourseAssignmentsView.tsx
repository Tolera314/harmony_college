'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { GitBranch, Loader2, Users, BookOpen, UserCheck, X, ChevronDown, Link, Unlink } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState } from '../../ui/States';
import {
  hodCourseAssignmentsApi,
  hodSemestersApi,
  type DHCourseAssignment,
  type DHCourseAssignmentsResponse,
  type Semester,
} from '../../../lib/hodApi';

// ─────────────────────────────────────────────────────────────────────────────
// Assign Instructor Panel
// ─────────────────────────────────────────────────────────────────────────────

interface AssignPanelProps {
  assignment: DHCourseAssignment;
  instructors: DHCourseAssignmentsResponse['instructors'];
  onAssign: (instructorId: string) => Promise<void>;
  onUnassign: () => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const AssignPanel: React.FC<AssignPanelProps> = ({ assignment, instructors, onAssign, onUnassign, onClose, saving }) => {
  const [instructorId, setInstructorId] = useState(assignment.instructor?.id ?? '');

  const sel = 'w-full px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-(--border-default)">
        <div>
          <h2 className="font-serif text-xl font-bold text-(--text-primary)">Assign Instructor</h2>
          <p className="font-sans text-sm text-(--text-secondary) mt-0.5">{assignment.course.code} · Section {assignment.section}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-muted) transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Course Info */}
        <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--hover-overlay) space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-(--brand-gold)" />
            <span className="font-sans text-sm font-semibold text-(--text-primary)">{assignment.course.name}</span>
          </div>
          <div className="flex gap-4 text-xs font-sans text-(--text-secondary)">
            <span>Section: <strong>{assignment.section}</strong></span>
            <span>Capacity: <strong>{assignment.capacity}</strong></span>
            <span>Enrolled: <strong>{assignment.enrolledCount}</strong></span>
            <span>Credits: <strong>{assignment.course.creditHours}</strong></span>
          </div>
          <p className="text-xs text-(--text-faint)">{assignment.semester.name}</p>
        </div>

        {/* Current Assignment */}
        {assignment.instructor && (
          <div className="p-4 rounded-xl border border-(--status-success)/20 bg-(--status-success-bg) flex items-center justify-between">
            <div>
              <p className="font-sans text-xs font-semibold text-(--status-success)">Currently Assigned</p>
              <p className="font-sans text-sm font-bold text-(--text-primary) mt-0.5">{assignment.instructor.user.fullName}</p>
              <p className="font-mono text-xs text-(--text-faint)">{assignment.instructor.employeeId}</p>
            </div>
            <Button variant="ghost" size="sm" icon={<Unlink className="w-3.5 h-3.5" />} disabled={saving} onClick={onUnassign}>Unassign</Button>
          </div>
        )}

        {/* Instructor Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Select Instructor</label>
          <select className={sel} value={instructorId} onChange={e => setInstructorId(e.target.value)}>
            <option value="">— Choose instructor —</option>
            {instructors.map(i => (
              <option key={i.id} value={i.id}>
                {i.user.fullName} ({i.employeeId}) · {i.assignedOfferings} offering{i.assignedOfferings !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 border-t border-(--border-default) flex gap-3">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="primary" disabled={!instructorId || saving} className="flex-1" onClick={() => onAssign(instructorId)}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export const DHCourseAssignmentsView: React.FC = () => {
  const [data,        setData]        = useState<DHCourseAssignmentsResponse | null>(null);
  const [semesters,   setSemesters]   = useState<Semester[]>([]);
  const [semFilter,   setSemFilter]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<DHCourseAssignment | null>(null);
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [res, semList] = await Promise.all([
        hodCourseAssignmentsApi.list(semFilter || undefined),
        hodSemestersApi.list(),
      ]);
      setData(res);
      setSemesters(semList);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load assignments'); }
    finally { setLoading(false); }
  }, [semFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (instructorId: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await hodCourseAssignmentsApi.assign(selected.offeringId, instructorId);
      const instructor = data?.instructors.find(i => i.id === instructorId);
      setData(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(a => a.offeringId === selected.offeringId
          ? { ...a, instructor: instructor ? { id: instructor.id, employeeId: instructor.employeeId, user: instructor.user } : null }
          : a),
      } : prev);
      setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Assign failed'); }
    finally { setSaving(false); }
  };

  const handleUnassign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await hodCourseAssignmentsApi.unassign(selected.offeringId);
      setData(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(a => a.offeringId === selected.offeringId ? { ...a, instructor: null } : a),
      } : prev);
      setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Unassign failed'); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState variant="generic" title="Course Assignments unavailable" description={error} onRetry={load} />;

  const assignments = data?.assignments ?? [];
  const instructors = data?.instructors ?? [];
  const assigned   = assignments.filter(a => a.instructor).length;
  const unassigned = assignments.filter(a => !a.instructor).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Course Assignments</h1>
          <p className="font-sans text-sm text-(--text-secondary) mt-1">Assign instructors to course sections in your department</p>
        </div>
        <select
          className="px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold)"
          value={semFilter} onChange={e => setSemFilter(e.target.value)}
        >
          <option value="">All Semesters</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.academicYear.name} — {s.name}{s.isCurrent ? ' ★' : ''}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sections', value: assignments.length, color: 'text-(--text-primary)' },
          { label: 'Assigned',       value: assigned,           color: 'text-(--status-success)' },
          { label: 'Unassigned',     value: unassigned,         color: 'text-(--status-danger)' },
        ].map(s => (
          <Card key={s.label} hoverable={false} className="p-4 text-center">
            <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Assignment table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : assignments.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center">
          <GitBranch className="w-10 h-10 text-(--text-faint) mx-auto mb-3" />
          <p className="font-sans text-sm text-(--text-secondary)">No course sections found for this semester.</p>
        </Card>
      ) : (
        <Card hoverable={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--border-subtle)">
                  {['Course', 'Section', 'Semester', 'Students', 'Instructor', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-sans text-xs font-semibold text-(--text-faint) uppercase tracking-wide whitespace-nowrap">{h}</th>
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
                      <span className="font-mono text-sm font-bold text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">Sec {a.section}</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-xs text-(--text-secondary) whitespace-nowrap">{a.semester.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-(--text-faint)" />
                        <span className="font-mono text-sm text-(--text-primary)">{a.enrolledCount}/{a.capacity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.instructor ? (
                        <div>
                          <p className="font-sans text-sm text-(--text-primary)">{a.instructor.user.fullName}</p>
                          <p className="font-mono text-[10px] text-(--text-faint)">{a.instructor.employeeId}</p>
                        </div>
                      ) : (
                        <span className="italic text-xs text-(--status-danger)">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={a.instructor ? 'emerald' : 'rose'}>{a.instructor ? 'Assigned' : 'Open'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => setSelected(a)}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-(--bg-modal) border-l border-(--border-default) shadow-2xl flex flex-col"
            >
              <AssignPanel
                assignment={selected} instructors={instructors}
                onAssign={handleAssign} onUnassign={handleUnassign}
                onClose={() => setSelected(null)} saving={saving}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
