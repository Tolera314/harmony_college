'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Plus, CalendarDays, Loader2, Search, Users, X, ChevronDown } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState } from '../../ui/States';
import { hodClassesApi, hodCoursesApi, hodSemestersApi, hodInstructorsApi, type DHClass, type DHCourse, type Semester, type DHInstructor } from '../../../lib/hodApi';

// ─────────────────────────────────────────────────────────────────────────────
// Create Class Panel
// ─────────────────────────────────────────────────────────────────────────────

interface CreateClassPanelProps {
  courses: DHCourse[];
  semesters: Semester[];
  instructors: DHInstructor[];
  onSave: (data: { courseId: string; semesterId: string; section: string; capacity: number; instructorId?: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const CreateClassPanel: React.FC<CreateClassPanelProps> = ({ courses, semesters, instructors, onSave, onClose, saving }) => {
  const [courseId,     setCourseId]     = useState('');
  const [semesterId,   setSemesterId]   = useState('');
  const [section,      setSection]      = useState('A');
  const [capacity,     setCapacity]     = useState('40');
  const [instructorId, setInstructorId] = useState('');
  const [error,        setError]        = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!courseId || !semesterId) { setError('Course and Semester are required.'); return; }
    await onSave({
      courseId, semesterId, section: section.trim() || 'A',
      capacity: parseInt(capacity, 10) || 40,
      instructorId: instructorId || undefined,
    });
  };

  const sel = 'w-full px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-(--border-default)">
        <h2 className="font-serif text-xl font-bold text-(--text-primary)">Create Class / Section</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-muted) transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {error && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger)/20 rounded-xl px-3 py-2">{error}</p>}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Course *</label>
          <select className={sel} value={courseId} onChange={e => setCourseId(e.target.value)}>
            <option value="">Select course...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Semester *</label>
          <select className={sel} value={semesterId} onChange={e => setSemesterId(e.target.value)}>
            <option value="">Select semester...</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.academicYear.name} — {s.name}{s.isCurrent ? ' (Current)' : ''}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Section</label>
            <input className={sel} placeholder="A" value={section} onChange={e => setSection(e.target.value)} maxLength={10} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Capacity</label>
            <input type="number" min={1} max={300} className={sel} value={capacity} onChange={e => setCapacity(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Assign Instructor (optional)</label>
          <select className={sel} value={instructorId} onChange={e => setInstructorId(e.target.value)}>
            <option value="">No instructor yet</option>
            {instructors.filter(i => i.isActive).map(i => <option key={i.id} value={i.id}>{i.user.fullName} ({i.employeeId})</option>)}
          </select>
        </div>
      </div>

      <div className="p-6 border-t border-(--border-default) flex gap-3">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Class'}
        </Button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Status badge helper
// ─────────────────────────────────────────────────────────────────────────────
function statusVariant(s: string): 'emerald' | 'rose' | 'amber' | 'glass' {
  if (s === 'ACTIVE') return 'emerald';
  if (s === 'CANCELLED') return 'rose';
  if (s === 'PENDING') return 'amber';
  return 'glass';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export const DHClassesView: React.FC = () => {
  const [classes,      setClasses]     = useState<DHClass[]>([]);
  const [total,        setTotal]       = useState(0);
  const [courses,      setCourses]     = useState<DHCourse[]>([]);
  const [semesters,    setSemesters]   = useState<Semester[]>([]);
  const [instructors,  setInstructors] = useState<DHInstructor[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState<string | null>(null);
  const [panel,        setPanel]       = useState(false);
  const [saving,       setSaving]      = useState(false);
  const [search,       setSearch]      = useState('');
  const [semFilter,    setSemFilter]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [classRes, courseList, semList, instrList] = await Promise.all([
        hodClassesApi.list({ search, semesterId: semFilter }),
        hodCoursesApi.list(),
        hodSemestersApi.list(),
        hodInstructorsApi.list(),
      ]);
      setClasses(classRes.classes ?? []);
      setTotal(classRes.total);
      setCourses(courseList);
      setSemesters(semList);
      setInstructors(instrList);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load classes'); }
    finally { setLoading(false); }
  }, [search, semFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: Parameters<typeof hodClassesApi.create>[0]) => {
    setSaving(true);
    try {
      const created = await hodClassesApi.create(data);
      setClasses(prev => [created, ...prev]);
      setPanel(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Create failed'); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState variant="generic" title="Classes unavailable" description={error} onRetry={load} />;

  const currentSem = semesters.find(s => s.isCurrent);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Classes & Sections</h1>
          <p className="font-sans text-sm text-(--text-secondary) mt-1">Manage course sections for your department</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setPanel(true)}>New Class</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all placeholder:text-(--text-faint)"
            placeholder="Search by course name or code..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold)"
          value={semFilter} onChange={e => setSemFilter(e.target.value)}
        >
          <option value="">All Semesters</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.academicYear.name} — {s.name}{s.isCurrent ? ' ★' : ''}</option>)}
        </select>
      </div>

      {/* Classes Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : classes.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center">
          <CalendarDays className="w-10 h-10 text-(--text-faint) mx-auto mb-3" />
          <p className="font-sans text-sm text-(--text-secondary)">No classes found. Create one to get started.</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setPanel(true)}>Create Class</Button>
        </Card>
      ) : (
        <Card hoverable={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--border-subtle)">
                  {['Course', 'Section', 'Semester', 'Instructor', 'Enrollment', 'Utilization', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-sans text-xs font-semibold text-(--text-faint) uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {classes.map(cls => (
                  <tr key={cls.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-sans text-sm font-semibold text-(--text-primary)">{cls.course.code}</p>
                      <p className="font-sans text-xs text-(--text-faint) truncate max-w-[180px]">{cls.course.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-bold text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">Sec {cls.section}</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-xs text-(--text-secondary) whitespace-nowrap">
                      {cls.semester.academicYear.name} · {cls.semester.name}
                      {cls.semester.isCurrent && <span className="ml-1 text-[10px] text-(--status-success)">● Current</span>}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-(--text-primary)">
                      {cls.instructor ? cls.instructor.user.fullName : <span className="text-(--text-faint) italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-(--text-faint)" />
                        <span className="font-mono text-sm text-(--text-primary)">{cls.enrolledCount}/{cls.capacity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${cls.utilizationPct}%`,
                            backgroundColor: cls.utilizationPct >= 90 ? 'var(--status-danger)' : cls.utilizationPct >= 70 ? 'var(--brand-gold)' : 'var(--status-success)',
                          }} />
                        </div>
                        <span className="font-mono text-xs text-(--text-secondary)">{cls.utilizationPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(cls.status)}>{cls.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-(--border-subtle) flex items-center justify-between">
            <p className="font-sans text-xs text-(--text-faint)">Showing {classes.length} of {total} classes</p>
          </div>
        </Card>
      )}

      {/* Slide Panel */}
      <AnimatePresence>
        {panel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" onClick={() => setPanel(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-(--bg-modal) border-l border-(--border-default) shadow-2xl flex flex-col"
            >
              <CreateClassPanel courses={courses} semesters={semesters} instructors={instructors} onSave={handleCreate} onClose={() => setPanel(false)} saving={saving} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

