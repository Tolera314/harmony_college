'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, Clock, AlertTriangle, MapPin, User,
  RefreshCw, CheckCheck, Plus, Trash2, X,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from '../ui/States';
import { timetableApi, offeringsApi } from '@/src/lib/registrarApi';

const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// Deterministic colour per course code
const SLOT_COLORS = [
  'border-blue-500 bg-blue-500/10 text-blue-400',
  'border-amber-500 bg-amber-500/10 text-amber-400',
  'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  'border-purple-500 bg-purple-500/10 text-purple-400',
  'border-rose-500 bg-rose-500/10 text-rose-400',
  'border-cyan-500 bg-cyan-500/10 text-cyan-400',
  'border-indigo-500 bg-indigo-500/10 text-indigo-400',
];
function colorFor(code: string) {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return SLOT_COLORS[h % SLOT_COLORS.length];
}

export const ClassTimetable: React.FC = () => {
  const [slots,     setSlots]     = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [rooms,     setRooms]     = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [semesterId,  setSemesterId]  = useState('');
  const [semesters,   setSemesters]   = useState<any[]>([]);

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [toast,    setToast]    = useState('');
  const [view,     setView]     = useState<'week' | 'day' | 'month'>('week');
  const [selDay,   setSelDay]   = useState(0); // 0=Mon
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');

  const [form, setForm] = useState({
    courseOfferingId: '', dayOfWeek: 0,
    startTime: '09:00', endTime: '10:30',
    roomId: '', instructorId: '',
  });

  const load = useCallback(async (semId = semesterId) => {
    setLoading(true); setError(null);
    try {
      const [s, c, meta] = await Promise.all([
        timetableApi.list(semId ? { semesterId: semId } : {}),
        timetableApi.getConflicts(semId || undefined),
        offeringsApi.getMeta(),
      ]);
      setSlots(s); setConflicts(c);
      setSemesters(meta.semesters);
      setRooms(meta.rooms);
      setInstructors(meta.instructors);

      // Resolve the active semester on first load
      const resolvedSemId = semId || (meta.semesters.find((s: any) => s.isCurrent)?.id ?? '');
      if (!semId && resolvedSemId) setSemesterId(resolvedSemId);

      // Always load offerings with a resolved semesterId so the form is never empty
      const offs = await offeringsApi.list({
        limit: 100,
        ...(resolvedSemId ? { semesterId: resolvedSemId } : {}),
      });
      setOfferings(offs.offerings);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable');
    } finally { setLoading(false); }
  }, [semesterId]);

  useEffect(() => { load(); }, []);

  const handleSemesterChange = (id: string) => {
    setSemesterId(id); load(id);
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await timetableApi.deleteSlot(slotId);
      showToast('Timetable slot deleted.');
      await load(semesterId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveErr('');
    try {
      await timetableApi.createSlot({
        courseOfferingId: form.courseOfferingId,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        ...(form.roomId && { roomId: form.roomId }),
        ...(form.instructorId && { instructorId: form.instructorId }),
      });
      showToast('Timetable slot created.');
      setShowForm(false);
      setForm({ courseOfferingId: '', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', roomId: '', instructorId: '' });
      await load(semesterId);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : 'Create failed — check for conflicts');
    } finally { setSaving(false); }
  };

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  }

  // Map slots for grid: dayOfWeek (0-4) → hour → slot
  function slotsForDay(day: number) {
    return slots.filter(s => s.dayOfWeek === day);
  }

  function slotsForDayHour(day: number, hour: string) {
    return slots.filter(s => s.dayOfWeek === day && s.startTime.startsWith(hour.slice(0, 2)));
  }

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={() => load(semesterId)} description={error} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-(--status-success-bg) border border-(--status-success-border) rounded-xl text-xs text-(--status-success) font-semibold">
            <CheckCheck className="w-4 h-4 shrink-0" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Class Timetable</h2>
          <p className="text-xs text-(--text-muted)">
            Real schedule data from PostgreSQL — {slots.length} slot{slots.length !== 1 ? 's' : ''} loaded.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Semester picker */}
          <select value={semesterId} onChange={e => handleSemesterChange(e.target.value)}
            className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option value="">All Semesters</option>
            {semesters.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} — {s.academicYear?.name}{s.isCurrent ? ' ●' : ''}</option>
            ))}
          </select>

          <Button variant="secondary" size="sm" onClick={() => load(semesterId)}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          <Button variant="gold" size="sm" onClick={() => { setShowForm(!showForm); setSaveErr(''); }}
            className="flex items-center gap-1.5 text-xs">
            <Plus className="w-4 h-4" /> Add Slot
          </Button>

          {/* View toggle */}
          <div className="flex bg-(--hover-overlay) border border-(--border-default) p-1 rounded-xl">
            {(['week', 'day', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${view === v ? 'bg-(--brand-gold) text-(--text-inverse) shadow' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add slot form */}
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddSlot}
            className="ds-card p-5 rounded-2xl space-y-4 overflow-hidden font-sans">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-(--text-primary)">New Timetable Slot</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-(--text-faint) hover:text-(--text-primary)">
                <X className="w-4 h-4" />
              </button>
            </div>
            {saveErr && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{saveErr}</div>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-(--text-secondary)">Course Offering</label>
                <select required value={form.courseOfferingId} onChange={e => setForm(f => ({ ...f, courseOfferingId: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                  <option value="">— Select offering —</option>
                  {offerings.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.course.code} — {o.course.name} ({o.semester?.name})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Day</label>
                <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Start Time</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">End Time</label>
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Room (optional)</label>
                <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                  <option value="">No room</option>
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.building} · {r.name} ({r.capacity})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Instructor (optional)</label>
                <select value={form.instructorId} onChange={e => setForm(f => ({ ...f, instructorId: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                  <option value="">No instructor</option>
                  {instructors.map((i: any) => <option key={i.id} value={i.id}>{i.user.fullName}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="gold" size="sm" type="submit" disabled={saving || !form.courseOfferingId}>
                {saving ? 'Creating…' : 'Create Slot'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Main Grid (8 cols) ─────────────────────────────────────────────── */}
        <div className="lg:col-span-8 ds-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">
              {view === 'day' ? DAY_NAMES[selDay] : view === 'week' ? 'Weekly Grid' : 'Month Calendar'}
            </h3>
            {view === 'day' && (
              <div className="flex gap-1">
                {DAY_NAMES.map((d, i) => (
                  <button key={i} onClick={() => setSelDay(i)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${selDay === i ? 'bg-(--brand-gold) text-(--text-inverse)' : 'bg-(--hover-overlay) text-(--text-secondary) hover:text-(--text-primary)'}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {slots.length === 0 ? (
            <EmptyState variant="timetable" compact />
          ) : view === 'week' ? (
            /* Week grid */
            <div className="overflow-x-auto">
              <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '56px repeat(5, 1fr)', gap: '4px' }}>
                {/* Header row */}
                <div />
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-mono font-semibold text-(--text-secondary) py-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                    {d}
                  </div>
                ))}
                {/* Time rows */}
                {TIME_SLOTS.map(hour => (
                  <React.Fragment key={hour}>
                    <div className="flex items-start justify-center pt-2 font-mono text-[9px] text-(--text-faint)">{hour}</div>
                    {DAY_NAMES.map((_, di) => {
                      const cellSlots = slotsForDayHour(di, hour);
                      return (
                        <div key={di} className="min-h-[70px] border border-(--border-subtle) rounded-lg p-1 bg-(--hover-overlay) flex flex-col gap-1">
                          {cellSlots.map(slot => {
                            const code = slot.courseOffering?.course?.code ?? '?';
                            return (
                              <div key={slot.id} className={`relative group p-1.5 border-l-2 rounded text-[9px] leading-tight ${colorFor(code)}`}>
                                <p className="font-mono font-bold">{code}</p>
                                <p className="text-(--text-primary) text-[9px] truncate max-w-[80px]">
                                  {slot.courseOffering?.course?.name}
                                </p>
                                <p className="text-[8px] opacity-60">{slot.startTime}–{slot.endTime}</p>
                                {slot.room && <p className="text-[8px] opacity-60">{slot.room.building} {slot.room.name}</p>}
                                <button onClick={() => handleDeleteSlot(slot.id)}
                                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 bg-(--bg-base) rounded text-(--status-danger) transition-opacity">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : view === 'day' ? (
            /* Day view */
            <div className="space-y-2">
              {slotsForDay(selDay).length === 0 ? (
                <div className="py-12 text-center text-xs text-(--text-faint) font-mono border border-dashed border-(--border-default) rounded-xl">
                  No classes scheduled for {DAY_NAMES[selDay]}
                </div>
              ) : (
                slotsForDay(selDay).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => {
                  const code = slot.courseOffering?.course?.code ?? '?';
                  return (
                    <div key={slot.id} className={`p-4 border rounded-xl flex items-center justify-between group ${colorFor(code)}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center">
                          <Clock className="w-4 h-4 text-(--text-secondary)" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-sm">{code} · {slot.courseOffering?.course?.name}</p>
                          <p className="text-xs text-(--text-secondary) flex items-center gap-2 mt-0.5">
                            {slot.instructor && <><User className="w-3 h-3 text-(--text-faint)" /> {slot.instructor.user.fullName} ·</>}
                            {slot.room && <><MapPin className="w-3 h-3 text-(--text-faint)" /> {slot.room.building} ({slot.room.name})</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{slot.startTime}–{slot.endTime}</span>
                        <button onClick={() => handleDeleteSlot(slot.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 bg-(--hover-overlay) rounded-lg text-(--status-danger) transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Month view — calendar with dot indicators */
            <div className="grid grid-cols-7 gap-1.5">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center font-mono text-[9px] text-(--text-faint) uppercase py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const daySlots = slots.filter(s => {
                  // rough: Monday=0 maps to day 1,8,15,22,29 etc. (Mon=1,Tue=2,...)
                  const wd = (day % 7); // simplified
                  return s.dayOfWeek === (wd === 0 ? 6 : wd - 1);
                });
                const hasConflict = conflicts.length > 0 && day === 15;
                return (
                  <div key={i} className="h-14 border border-(--border-subtle) rounded-lg p-1.5 flex flex-col justify-between hover:bg-(--hover-overlay) transition-colors">
                    <span className="font-mono text-[10px] text-(--text-secondary)">{day}</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {daySlots.slice(0, 3).map(s => (
                        <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${colorFor(s.courseOffering?.course?.code ?? '')}`} />
                      ))}
                      {hasConflict && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Conflicts Panel (4 cols) ───────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="ds-card p-5 rounded-2xl">
            <div className="flex items-center gap-2 border-b border-(--border-subtle) pb-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-(--status-danger)" />
              <h3 className="font-serif text-base font-bold text-(--text-primary)">
                Conflicts
                {conflicts.length > 0 && (
                  <Badge variant="rose" className="ml-2 text-[9px]">{conflicts.length}</Badge>
                )}
              </h3>
            </div>

            {conflicts.length === 0 ? (
              <div className="py-10 text-center text-xs text-(--status-success) font-mono bg-(--status-success-bg) border border-(--status-success-border) rounded-xl">
                ✓ No schedule conflicts detected
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conf: any, i) => (
                  <div key={i} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-(--status-danger) uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Room Conflict
                      </span>
                      <Badge variant="rose" className="text-[8px]">Critical</Badge>
                    </div>
                    <p className="text-xs text-(--text-secondary) font-sans">
                      <strong className="text-(--text-primary)">{conf.courses}</strong> — both in{' '}
                      <span className="font-mono text-(--brand-gold)">{conf.room}</span>{' '}
                      on day {conf.dayOfWeek} at {conf.startTime}
                    </p>
                    <p className="text-[10px] text-(--text-faint) font-mono">
                      Fix: move one offering to a different room via Course Offerings.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="ds-card p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Schedule Summary</h4>
            <div className="space-y-2">
              {[
                { label: 'Total Slots',     value: slots.length },
                { label: 'Active Conflicts', value: conflicts.length,  danger: conflicts.length > 0 },
                { label: 'Rooms Used',      value: new Set(slots.map((s: any) => s.roomId).filter(Boolean)).size },
                { label: 'Instructors',     value: new Set(slots.map((s: any) => s.instructorId).filter(Boolean)).size },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-(--text-secondary)">{item.label}</span>
                  <span className={`font-mono font-bold text-sm ${item.danger ? 'text-(--status-danger)' : 'text-(--text-primary)'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
