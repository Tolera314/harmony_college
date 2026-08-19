'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { ClipboardList, CheckCircle2, AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { DHPageHeader }   from '../../dh/DHPageHeader';
import { Card }           from '../../ui/Card';
import { Badge }          from '../../ui/Badge';
import { Button }         from '../../ui/Button';
import { Modal }          from '../../ui/Modal';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import {
  instructorClassesApi,
  type ClassOffering,
  type CourseGradeEntry,
} from '../../../lib/instructorApi';

// Grade scale (matches the seeded GradeScale table)
const GRADE_SCALE = [
  { letter: 'A',  points: 4.0 },
  { letter: 'A-', points: 3.7 },
  { letter: 'B+', points: 3.5 },
  { letter: 'B',  points: 3.0 },
  { letter: 'B-', points: 2.7 },
  { letter: 'C+', points: 2.5 },
  { letter: 'C',  points: 2.0 },
  { letter: 'C-', points: 1.7 },
  { letter: 'D',  points: 1.0 },
  { letter: 'F',  points: 0.0 },
];

const gradeColor = (letter: string | undefined) => {
  if (!letter) return 'text-(--text-faint)';
  if (letter.startsWith('A')) return 'text-(--status-success)';
  if (letter.startsWith('B')) return 'text-(--brand-gold)';
  if (letter.startsWith('C')) return 'text-(--status-warning)';
  return 'text-(--status-danger)';
};

export const InGradesView: React.FC = () => {
  const [classes,           setClasses]          = useState<ClassOffering[]>([]);
  const [selectedOffering,  setSelectedOffering] = useState<string>('');
  const [grades,            setGrades]           = useState<CourseGradeEntry[]>([]);
  const [localGrades,       setLocalGrades]      = useState<Record<string, string>>({});
  const [classesLoading,    setClassesLoading]   = useState(true);
  const [gradesLoading,     setGradesLoading]    = useState(false);
  const [saving,            setSaving]           = useState<string | null>(null);
  const [saveSuccess,       setSaveSuccess]      = useState<string | null>(null);
  const [error,             setError]            = useState<string | null>(null);
  const [confirmModal,      setConfirmModal]     = useState(false);
  const [bulkEntry,         setBulkEntry]        = useState('');

  // ── Load classes ─────────────────────────────────────────────────────────
  useEffect(() => {
    instructorClassesApi.list()
      .then(data => {
        const current = data.filter(o => o.semester.isCurrent);
        const list    = current.length ? current : data;
        setClasses(list);
        if (list.length > 0) setSelectedOffering(list[0].id);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setClassesLoading(false));
  }, []);

  // ── Load course grades ────────────────────────────────────────────────────
  const loadGrades = useCallback(async () => {
    if (!selectedOffering) return;
    setGradesLoading(true); setError(null);
    try {
      const data = await instructorClassesApi.getCourseGrades(selectedOffering);
      setGrades(data);
      // Pre-fill local grades from existing DB values
      const map: Record<string, string> = {};
      data.forEach(g => {
        if (g.currentGrade?.letterGrade) {
          map[g.enrollmentId] = g.currentGrade.letterGrade;
        }
      });
      setLocalGrades(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load grades');
    } finally {
      setGradesLoading(false);
    }
  }, [selectedOffering]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  // ── Submit single grade ───────────────────────────────────────────────────
  const submitGrade = async (enrollmentId: string, letterGrade: string) => {
    const scale = GRADE_SCALE.find(g => g.letter === letterGrade);
    if (!scale) return;

    setSaving(enrollmentId);
    try {
      await instructorClassesApi.submitCourseGrade(selectedOffering, enrollmentId, {
        letterGrade: scale.letter,
        gradePoints: scale.points,
      });
      setSaveSuccess(enrollmentId);
      setTimeout(() => setSaveSuccess(null), 2000);
      // Refresh grades
      loadGrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save grade');
    } finally {
      setSaving(null);
    }
  };

  // ── Bulk submit all local changes ─────────────────────────────────────────
  const handleBulkSubmit = async () => {
    setConfirmModal(false);
    const entries = Object.entries(localGrades);
    for (const [enrollmentId, letter] of entries) {
      if (!letter) continue;
      await submitGrade(enrollmentId, letter);
    }
  };

  const ungradedCount = grades.filter(g => !g.currentGrade).length;
  const selectedClass = classes.find(c => c.id === selectedOffering);

  if (classesLoading) return <SkeletonPage />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Grades"
        subtitle={selectedClass
          ? `${selectedClass.course.code} · ${ungradedCount} ungraded of ${grades.length}`
          : 'Course grades'}
        icon={<ClipboardList className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadGrades}>
              Refresh
            </Button>
            {grades.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setConfirmModal(true)}
              >
                Submit All Grades
              </Button>
            )}
          </div>
        }
      />

      {/* Class selector */}
      {classes.length > 1 && (
        <div className="relative inline-block">
          <select
            value={selectedOffering}
            onChange={e => { setSelectedOffering(e.target.value); setLocalGrades({}); }}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl font-sans text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--hover-overlay)',
              border:          '1px solid var(--border-default)',
              color:           'var(--text-primary)',
            }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.course.code} — Section {c.section} · {c.semester.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
        </div>
      )}

      {error && <div className="p-3 text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl">{error}</div>}

      {gradesLoading ? (
        <SkeletonPage />
      ) : grades.length === 0 ? (
        <EmptyState
          variant="grades"
          title="No students enrolled"
          description="No active enrollments found for this course offering."
        />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-xs font-sans min-w-[640px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Student', 'Student ID', 'GPA', 'Current Grade', 'Grade Points', 'Enter Grade', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {grades.map(entry => {
                const localGrade   = localGrades[entry.enrollmentId] ?? '';
                const currentGrade = entry.currentGrade?.letterGrade;
                const isSaving     = saving      === entry.enrollmentId;
                const isSaved      = saveSuccess === entry.enrollmentId;

                return (
                  <tr key={entry.enrollmentId} className="hover:bg-(--hover-overlay) transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center font-serif font-bold text-xs text-(--brand-gold) shrink-0">
                          {entry.fullName.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold text-(--text-primary)">{entry.fullName}</p>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-(--text-faint)">
                      {entry.studentId}
                    </td>

                    {/* GPA */}
                    <td className="px-4 py-3.5 font-mono text-sm font-bold text-(--brand-gold)">
                      {entry.gpa.toFixed(2)}
                    </td>

                    {/* Current grade */}
                    <td className="px-4 py-3.5">
                      {currentGrade ? (
                        <span className={`font-mono text-sm font-bold ${gradeColor(currentGrade)}`}>
                          {currentGrade}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-(--text-faint)">Not graded</span>
                      )}
                    </td>

                    {/* Grade points */}
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">
                      {entry.currentGrade?.gradePoints?.toFixed(1) ?? '—'}
                    </td>

                    {/* Grade input */}
                    <td className="px-4 py-3.5">
                      <div className="relative">
                        <select
                          value={localGrade}
                          onChange={e => setLocalGrades(prev => ({ ...prev, [entry.enrollmentId]: e.target.value }))}
                          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg font-mono text-xs focus:outline-none"
                          style={{
                            backgroundColor: 'var(--hover-overlay)',
                            border:          `1px solid ${localGrade ? 'var(--accent-gold-border)' : 'var(--border-default)'}`,
                            color:           localGrade ? 'var(--brand-gold)' : 'var(--text-secondary)',
                          }}
                          aria-label={`Grade for ${entry.fullName}`}
                        >
                          <option value="">Select grade</option>
                          {GRADE_SCALE.map(g => (
                            <option key={g.letter} value={g.letter}>
                              {g.letter} ({g.points.toFixed(1)})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <AnimatePresence mode="wait">
                        {isSaved ? (
                          <motion.span
                            key="saved"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 text-xs font-semibold text-(--status-success)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                          </motion.span>
                        ) : (
                          <Button
                            key="save"
                            variant="secondary"
                            size="sm"
                            disabled={!localGrade || isSaving}
                            onClick={() => submitGrade(entry.enrollmentId, localGrade)}
                          >
                            {isSaving ? 'Saving…' : 'Save'}
                          </Button>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary */}
      {grades.length > 0 && (
        <div className="flex items-center gap-4 px-1 text-xs font-mono text-(--text-faint)">
          <span>{grades.filter(g => g.currentGrade).length}/{grades.length} graded</span>
          {ungradedCount > 0 && (
            <span className="text-(--status-warning) flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {ungradedCount} awaiting grades
            </span>
          )}
        </div>
      )}

      {/* Bulk Submit Modal */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Submit All Grades"
        maxWidth="max-w-md"
      >
        <div className="space-y-5 font-sans text-sm">
          <div className="p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
            <p className="text-amber-200/80 text-xs leading-relaxed">
              This will save all grades you have entered above. Only students with a grade selected will be updated.
            </p>
          </div>
          <p className="text-(--text-secondary)">
            Submit grades for <span className="text-(--brand-gold) font-mono">{selectedClass?.course.code}</span>?
            ({Object.values(localGrades).filter(Boolean).length} students selected)
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleBulkSubmit}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Submit
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
