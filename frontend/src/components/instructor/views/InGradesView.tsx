'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, CheckCircle2, Clock, TrendingUp, Save, AlertTriangle, BarChart3 } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { BarChart } from '../../dh/DHCharts';
import { assessments, gradeEntries, film402StudentIds, film301StudentIds } from '../../../data/instructorData';
import { courses, students } from '../../../data/departmentData';
import { Assessment } from '../../../types/instructor';

const typeColor: Record<string, string> = {
  Assignment:   'text-sky-400',
  Quiz:         'text-purple-400',
  Midterm:      'text-amber-400',
  Final:        'text-rose-400',
  Participation:'text-emerald-400',
  Project:      'text-[#E9C349]',
};

function letterGrade(pct: number): string {
  if (pct >= 90) return 'A';
  if (pct >= 85) return 'A−';
  if (pct >= 80) return 'B+';
  if (pct >= 75) return 'B';
  if (pct >= 70) return 'B−';
  if (pct >= 65) return 'C+';
  if (pct >= 60) return 'C';
  return 'F';
}

export const InGradesView: React.FC = () => {
  const [selected, setSelected] = useState<Assessment>(assessments[0]);
  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});
  const [localRemarks, setLocalRemarks] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmModal, setConfirmModal] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const courseStudentIds = selected.courseId === 'c01' ? film402StudentIds : film301StudentIds;
  const courseStudents   = students.filter(s => courseStudentIds.includes(s.id));

  // Get current grade value for a student
  const getScore = useCallback((studentId: string): string => {
    if (localGrades[studentId] !== undefined) return localGrades[studentId];
    const entry = gradeEntries.find(g => g.assessmentId === selected.id && g.studentId === studentId);
    return entry?.score != null ? String(entry.score) : '';
  }, [localGrades, selected.id]);

  const getRemark = useCallback((studentId: string): string => {
    if (localRemarks[studentId] !== undefined) return localRemarks[studentId];
    return gradeEntries.find(g => g.assessmentId === selected.id && g.studentId === studentId)?.remarks ?? '';
  }, [localRemarks, selected.id]);

  // Autosave: fire 1.5s after last keystroke
  const triggerAutosave = useCallback(() => {
    setSaveState('saving');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); }, 1500);
  }, []);

  const handleScoreChange = (studentId: string, value: string) => {
    setLocalGrades(prev => ({ ...prev, [studentId]: value }));
    triggerAutosave();
  };

  const handleRemarkChange = (studentId: string, value: string) => {
    setLocalRemarks(prev => ({ ...prev, [studentId]: value }));
    triggerAutosave();
  };

  // Reset local overrides when switching assessments
  const handleSelectAssessment = (a: Assessment) => {
    setSelected(a);
    setLocalGrades({});
    setLocalRemarks({});
    setSaveState('idle');
  };

  const handleSubmit = () => { setConfirmModal(false); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2500); };

  // Grade distribution for chart
  const gradeDistribution = courseStudents.map(s => {
    const scoreStr = getScore(s.id);
    const score = scoreStr !== '' ? Number(scoreStr) : null;
    const pct = score != null ? Math.round((score / selected.maxScore) * 100) : 0;
    return { label: s.name.split(' ')[0], value: pct, color: pct >= 80 ? '#34d399' : pct >= 60 ? '#E9C349' : '#f87171' };
  }).filter(d => d.value > 0);

  const pendingCount = gradeEntries.filter(g => g.status === 'Pending').length;
  const totalScore = courseStudents.reduce((sum, s) => {
    const v = getScore(s.id);
    return v !== '' ? sum + Number(v) : sum;
  }, 0);
  const gradedCount = courseStudents.filter(s => getScore(s.id) !== '').length;
  const classAvg = gradedCount ? Math.round(totalScore / gradedCount) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Grades"
        subtitle={`${pendingCount} pending · autosave enabled`}
        icon={<ClipboardList className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            {/* Autosave indicator */}
            <AnimatePresence mode="wait">
              {saveState === 'saving' && (
                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 font-sans text-xs text-white/40">
                  <motion.div className="w-3 h-3 border-2 border-white/30 border-t-[#E9C349] rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  Saving…
                </motion.span>
              )}
              {saveState === 'saved' && (
                <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 font-sans text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </motion.span>
              )}
            </AnimatePresence>
            <Button variant="secondary" size="sm" icon={<BarChart3 className="w-4 h-4" />} onClick={() => setShowChart(p => !p)}>
              {showChart ? 'Hide' : 'Chart'}
            </Button>
            <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setConfirmModal(true)}>
              Submit Grades
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Assessment sidebar */}
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/40 px-1 mb-3">Assessments</p>
          {assessments.map(a => {
            const isActive = selected.id === a.id;
            const c = courses.find(x => x.id === a.courseId);
            const entries = gradeEntries.filter(g => g.assessmentId === a.id);
            const hasPending = entries.some(g => g.status === 'Pending');
            return (
              <button key={a.id} onClick={() => handleSelectAssessment(a)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-[#E9C349]/12 border-[#E9C349]/30' : 'bg-white/5 border-white/8 hover:bg-white/8 hover:border-white/15'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-white/40">{c?.code}</span>
                  {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] shrink-0" />}
                </div>
                <p className={`font-sans text-xs font-semibold truncate leading-snug ${isActive ? 'text-[#E9C349]' : 'text-white/80'}`}>{a.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`font-mono text-[10px] font-medium ${typeColor[a.type]}`}>{a.type}</span>
                  <span className="font-mono text-[10px] text-white/30">{a.weight}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main grade editor */}
        <div className="lg:col-span-3 space-y-4">

          {/* Assessment header card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">{selected.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50 font-sans flex-wrap">
                <span className={typeColor[selected.type]}>{selected.type}</span>
                <span>Max: <span className="text-white font-mono">{selected.maxScore}</span> pts</span>
                <span>Weight: <span className="text-white font-mono">{selected.weight}%</span></span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selected.dueDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {gradedCount > 0 && (
                <div className="text-right">
                  <p className="font-mono text-xs text-white/40">Class avg</p>
                  <p className={`font-mono text-lg font-bold ${classAvg >= 80 ? 'text-emerald-400' : classAvg >= 60 ? 'text-[#E9C349]' : 'text-rose-400'}`}>{classAvg}</p>
                </div>
              )}
              <Badge variant={selected.status === 'Published' ? 'emerald' : selected.status === 'Pending' ? 'amber' : 'glass'}>
                {selected.status}
              </Badge>
            </div>
          </div>

          {/* Grade distribution chart (toggle) */}
          <AnimatePresence>
            {showChart && gradeDistribution.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card hoverable={false} className="space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">Score Distribution</p>
                  <BarChart data={gradeDistribution} height={130} showValues />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grade table */}
          <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
            <table className="w-full text-xs font-sans min-w-[640px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {['Student', 'Score / Max', 'Percentage', 'Grade', 'Remarks', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-white/50 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {courseStudents.map(student => {
                  const scoreStr = getScore(student.id);
                  const score    = scoreStr !== '' ? Number(scoreStr) : null;
                  const pct      = score != null ? Math.round((score / selected.maxScore) * 100) : null;
                  const letter   = pct != null ? letterGrade(pct) : '—';
                  const entry    = gradeEntries.find(g => g.assessmentId === selected.id && g.studentId === student.id);
                  const pctColor = pct == null ? '' : pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-[#E9C349]' : 'text-rose-400';
                  return (
                    <tr key={student.id} className="hover:bg-white/4 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={student.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                          <div>
                            <p className="font-semibold text-white">{student.name}</p>
                            <p className="font-mono text-[10px] text-white/40">{student.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min={0} max={selected.maxScore}
                            value={scoreStr}
                            onChange={e => handleScoreChange(student.id, e.target.value)}
                            placeholder="—"
                            aria-label={`Score for ${student.name}`}
                            className="w-16 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-sm text-white text-center focus:outline-none focus:border-[#E9C349] transition-colors"
                          />
                          <span className="font-mono text-xs text-white/30">/ {selected.maxScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {pct != null ? <span className={pctColor}>{pct}%</span> : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold">
                        {pct != null ? <span className={pctColor}>{letter}</span> : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={getRemark(student.id)}
                          onChange={e => handleRemarkChange(student.id, e.target.value)}
                          placeholder="Add remark…"
                          aria-label={`Remark for ${student.name}`}
                          className="w-full bg-transparent border-b border-white/10 focus:border-[#E9C349] outline-none font-sans text-xs text-white/60 py-0.5 transition-colors placeholder:text-white/20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={entry?.status === 'Published' ? 'emerald' : entry?.status === 'Pending' ? 'amber' : 'glass'} className="text-[10px]">
                          {entry?.status ?? 'New'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          {gradedCount > 0 && (
            <div className="flex items-center gap-4 px-1 text-xs font-mono text-white/40">
              <span>{gradedCount}/{courseStudents.length} graded</span>
              <span>·</span>
              <span className={classAvg >= 80 ? 'text-emerald-400' : classAvg >= 60 ? 'text-[#E9C349]' : 'text-rose-400'}>
                Class avg: {classAvg}/{selected.maxScore} ({Math.round((classAvg / selected.maxScore) * 100)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Submit confirmation modal */}
      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Submit Grades to Registrar" maxWidth="max-w-md">
        <div className="space-y-5 font-sans text-sm">
          <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200/80 text-xs leading-relaxed">
              Once submitted, grades are recorded in the registrar system and students will be notified. You can still edit and resubmit if needed.
            </p>
          </div>
          <p className="text-white/70">
            Submit <span className="font-semibold text-white">{selected.title}</span> grades for{' '}
            <span className="text-[#E9C349] font-mono">{courses.find(c => c.id === selected.courseId)?.code}</span>?
            ({gradedCount} of {courseStudents.length} graded)
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSubmit} icon={<CheckCircle2 className="w-4 h-4" />}>
              Confirm Submit
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
