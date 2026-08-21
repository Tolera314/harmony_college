'use client';

/**
 * ClassTimetable — Registrar view (spec §4, §5, §6, §7, §8)
 *
 * Features:
 * ✓ Week / Day / Month / List views  (spec §4)
 * ✓ Add slot form with "Check Availability" pre-flight  (spec §5, §7)
 * ✓ Room capacity check  (spec §6)
 * ✓ PATCH slot (reschedule, status change)  (spec §30)
 * ✓ Soft-delete (CANCELLED, not hard-delete)  (spec §26)
 * ✓ Conflict panel shows ALL conflict types (room + instructor)  (spec §6)
 * ✓ Real-time Socket.IO updates  (spec §8, §9)
 * ✓ Status badge on each slot  (spec §30)
 * ✓ roomType shown in room picker  (spec §18)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, Clock, AlertTriangle, MapPin, User,
  RefreshCw, CheckCheck, Plus, Trash2, X, Pencil,
  List, Wifi, WifiOff, ShieldAlert,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from '../ui/States';
import { timetableApi, offeringsApi, type TimetableSlot, type TimetableConflict } from '@/src/lib/registrarApi';
import { useSocket } from '@/src/context/SocketContext';
import { toEthiopianTimeRange, toEthiopianTime } from '@/src/lib/utils';

const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const ETH_TIME_LABELS: Record<string, string> = Object.fromEntries(
  TIME_SLOTS.map(t => [t, toEthiopianTime(t)])
);
const ROOM_TYPE_LABELS: Record<string, string> = {
  CLASSROOM: 'Classroom', LAB: 'Lab', LECTURE_HALL: 'Lecture Hall',
  EXAM_HALL: 'Exam Hall', SEMINAR_ROOM: 'Seminar Room',
};

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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PUBLISHED:  { label: 'Published',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  DRAFT:      { label: 'Draft',      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  COMPLETED:  { label: 'Completed',  cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

type View = 'week' | 'day' | 'month' | 'list';

const emptyForm = {
  courseOfferingId: '', dayOfWeek: 0,
  startTime: '09:00', endTime: '10:30',
  roomId: '', instructorId: '',
  status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT',
};

export const ClassTimetable: React.FC = () => {
  const { joinTimetableRoom, leaveTimetableRoom, connected,
          onTimetableCreated, onTimetableUpdated, onTimetableDeleted, onTimetableConflict } = useSocket();

  const [slots,       setSlots]       = useState<TimetableSlot[]>([]);
  const [conflicts,   setConflicts]   = useState<TimetableConflict[]>([]);
  const [offerings,   setOfferings]   = useState<any[]>([]);
  const [rooms,       setRooms]       = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [semesterId,  setSemesterId]  = useState('');
  const [semesters,   setSemesters]   = useState<any[]>([]);

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; type?: 'ok' | 'warn' } | null>(null);
  const [view,     setView]     = useState<View>('week');
  const [selDay,   setSelDay]   = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editSlot, setEditSlot] = useState<TimetableSlot | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const [checking, setChecking] = useState(false);
  const [preflightResult, setPreflightResult] = useState<string[] | null>(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState('');

  const [form, setForm] = useState(emptyForm);

  const semRef = useRef(semesterId);
  semRef.current = semesterId;

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (semId = semRef.current) => {
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

      const resolvedSemId = semId || (meta.semesters.find((s: any) => s.isCurrent)?.id ?? '');
      if (!semId && resolvedSemId) setSemesterId(resolvedSemId);

      const offs = await offeringsApi.list({ limit: 200, ...(resolvedSemId ? { semesterId: resolvedSemId } : {}) });
      setOfferings(offs.offerings);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Real-time socket ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!semesterId) return;
    joinTimetableRoom(semesterId);
    return () => { leaveTimetableRoom(semesterId); };
  }, [semesterId, joinTimetableRoom, leaveTimetableRoom]);

  // On timetable:created — add slot optimistically
  useEffect(() => onTimetableCreated(slot => {
    setSlots(prev => {
      if (prev.some(s => s.id === slot.id)) return prev;
      // Slot from socket lacks full relations — trigger a reload for complete data
      load(semRef.current);
      return prev;
    });
  }), [onTimetableCreated, load]);

  // On timetable:updated — mark slot and reload
  useEffect(() => onTimetableUpdated(() => { load(semRef.current); }), [onTimetableUpdated, load]);

  // On timetable:deleted — remove from local state
  useEffect(() => onTimetableDeleted(({ slotId }) => {
    setSlots(prev => prev.filter(s => s.id !== slotId));
  }), [onTimetableDeleted]);

  // On timetable:conflict — show toast warning
  useEffect(() => onTimetableConflict(({ conflicts: c }) => {
    showToast(`⚠ Conflict detected by another user: ${c[0]}`, 'warn');
    load(semRef.current);
  }), [onTimetableConflict, load]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleSemesterChange = (id: string) => {
    setSemesterId(id); load(id);
  };

  function showToast(msg: string, type: 'ok' | 'warn' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  }

  // ── Check availability (pre-flight) ──────────────────────────────────────
  const handleCheckAvailability = async () => {
    if (!form.courseOfferingId) { setSaveErr('Select a course offering first'); return; }
    const offering = offerings.find((o: any) => o.id === form.courseOfferingId);
    if (!offering) return;

    setChecking(true); setPreflightResult(null); setSaveErr('');
    try {
      const result = await timetableApi.checkConflicts({
        semesterId: offering.semester?.id ?? semesterId,
        roomId: form.roomId || null,
        instructorId: form.instructorId || null,
        excludeOfferingId: editSlot ? editSlot.courseOfferingId : undefined,
        timetables: [{ dayOfWeek: Number(form.dayOfWeek), startTime: form.startTime, endTime: form.endTime }],
      });

      // Also check room capacity
      const room = rooms.find((r: any) => r.id === form.roomId);
      const enrolled = offering._count?.enrollments ?? 0;
      const capWarnings: string[] = [];
      if (room && enrolled > room.capacity) {
        capWarnings.push(`Room capacity exceeded: ${enrolled} students, room holds ${room.capacity}`);
      }

      const all = [...result.conflicts, ...capWarnings];
      setPreflightResult(all);
    } catch (e: unknown) {
      setPreflightResult([e instanceof Error ? e.message : 'Check failed']);
    } finally { setChecking(false); }
  };

  // ── Create / Edit slot ────────────────────────────────────────────────────
  const handleSubmitSlot = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveErr('');
    try {
      const payload = {
        courseOfferingId: form.courseOfferingId,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
        ...(form.roomId && { roomId: form.roomId }),
        ...(form.instructorId && { instructorId: form.instructorId }),
      };

      if (editSlot) {
        await timetableApi.patchSlot(editSlot.id, payload);
        showToast('Timetable slot updated.');
      } else {
        await timetableApi.createSlot(payload);
        showToast('Timetable slot created.');
      }
      closeForm();
      await load(semesterId);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed — check for conflicts');
    } finally { setSaving(false); }
  };

  const openEditForm = (slot: TimetableSlot) => {
    setEditSlot(slot);
    setForm({
      courseOfferingId: slot.courseOfferingId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomId: slot.roomId ?? '',
      instructorId: slot.instructorId ?? '',
      status: (slot.status === 'PUBLISHED' || slot.status === 'DRAFT') ? slot.status : 'PUBLISHED',
    });
    setPreflightResult(null);
    setSaveErr('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false); setEditSlot(null);
    setForm(emptyForm); setPreflightResult(null); setSaveErr('');
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Cancel this timetable slot? This is a soft-cancel and preserves attendance history.')) return;
    try {
      await timetableApi.deleteSlot(slotId);
      showToast('Slot cancelled.');
      await load(semesterId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  // ── Slot rendering helpers ────────────────────────────────────────────────
  const visibleSlots = slots.filter(s =>
    s.status !== 'CANCELLED' &&
    (!roomTypeFilter || s.room?.roomType === roomTypeFilter),
  );

  function slotsForDay(day: number) {
    return visibleSlots.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function slotsForHour(day: number, hour: string) {
    return visibleSlots.filter(s => s.dayOfWeek === day && s.startTime.startsWith(hour.slice(0, 2)));
  }

  function SlotCard({ slot, compact = false }: { slot: TimetableSlot; compact?: boolean }) {
    const code = slot.courseOffering?.course?.code ?? '?';
    const st = STATUS_BADGE[slot.status] ?? STATUS_BADGE.PUBLISHED;
    return (
      <div className={`relative group p-1.5 border-l-2 rounded text-[9px] leading-tight ${colorFor(code)} ${compact ? '' : 'p-2 text-xs'}`}>
        <div className="flex items-start justify-between gap-1">
          <p className="font-mono font-bold truncate">{code}</p>
          <span className={`shrink-0 text-[8px] px-1 rounded border ${st.cls}`}>{st.label}</span>
        </div>
        {!compact && <p className="text-[9px] opacity-75 truncate max-w-[90px]">{slot.courseOffering?.course?.name}</p>}
        <p className="text-[8px] opacity-60">{toEthiopianTimeRange(slot.startTime, slot.endTime)}</p>
        {slot.room && <p className="text-[8px] opacity-60"><MapPin className="inline w-2 h-2" /> {slot.room.building} {slot.room.name}</p>}
        {slot.courseOffering?.instructor && (
          <p className="text-[8px] opacity-60"><User className="inline w-2 h-2" /> {slot.courseOffering.instructor.user.fullName}</p>
        )}
        {/* Actions on hover */}
        <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
          <button onClick={() => openEditForm(slot)} className="p-0.5 bg-(--bg-base) rounded text-(--brand-gold)">
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button onClick={() => handleDeleteSlot(slot.id)} className="p-0.5 bg-(--bg-base) rounded text-(--status-danger)">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={() => load(semesterId)} description={error} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
              toast.type === 'warn'
                ? 'bg-(--status-warning-bg) border-(--status-warning-border) text-(--status-warning)'
                : 'bg-(--status-success-bg) border-(--status-success-border) text-(--status-success)'
            }`}>
            {toast.type === 'warn' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCheck className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Class Timetable</h2>
            <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              connected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
            }`}>
              {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-(--text-muted) mt-0.5">
            {visibleSlots.length} slot{visibleSlots.length !== 1 ? 's' : ''} · {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
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

          {/* Room type filter */}
          <select value={roomTypeFilter} onChange={e => setRoomTypeFilter(e.target.value)}
            className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option value="">All Room Types</option>
            {Object.entries(ROOM_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <Button variant="secondary" size="sm" onClick={() => load(semesterId)}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          <Button variant="gold" size="sm" onClick={() => { if (showForm && !editSlot) closeForm(); else { setEditSlot(null); setForm(emptyForm); setShowForm(true); } }}
            className="flex items-center gap-1.5 text-xs">
            <Plus className="w-4 h-4" /> Add Slot
          </Button>

          {/* View toggle */}
          <div className="flex bg-(--hover-overlay) border border-(--border-default) p-1 rounded-xl">
            {(['week', 'day', 'month', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${view === v ? 'bg-(--brand-gold) text-(--text-inverse) shadow' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {v === 'list' ? <List className="w-3 h-3" /> : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Edit slot form */}
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmitSlot}
            className="ds-card p-5 rounded-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-(--text-primary)">{editSlot ? 'Edit Slot' : 'New Timetable Slot'}</h3>
              <button type="button" onClick={closeForm} className="text-(--text-faint) hover:text-(--text-primary)"><X className="w-4 h-4" /></button>
            </div>

            {saveErr && (
              <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">
                <ShieldAlert className="inline w-3.5 h-3.5 mr-1" />{saveErr}
              </div>
            )}

            {/* Pre-flight result */}
            {preflightResult !== null && (
              <div className={`p-3 rounded-xl text-xs border ${preflightResult.length
                ? 'bg-(--status-danger-bg) border-(--status-danger-border) text-(--status-danger)'
                : 'bg-(--status-success-bg) border-(--status-success-border) text-(--status-success)'}`}>
                {preflightResult.length
                  ? preflightResult.map((c, i) => <p key={i}><AlertTriangle className="inline w-3 h-3 mr-1" />{c}</p>)
                  : <p><CheckCheck className="inline w-3 h-3 mr-1" />No conflicts — slot is available</p>
                }
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-(--text-secondary)">Course Offering</label>
                <select required value={form.courseOfferingId} onChange={e => setForm(f => ({ ...f, courseOfferingId: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                  <option value="">— Select offering —</option>
                  {offerings.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.course.code} — {o.course.name} ({o.semester?.name}) · {o._count?.enrollments ?? 0} enrolled
                    </option>
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
                <label className="text-xs font-semibold text-(--text-secondary)">Room</label>
                <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                  <option value="">No room</option>
                  {rooms.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.building}·{r.name} ({ROOM_TYPE_LABELS[r.roomType] ?? r.roomType}, cap {r.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Instructor</label>
                <select value={form.instructorId} onChange={e => setForm(f => ({ ...f, instructorId: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                  <option value="">No instructor</option>
                  {instructors.map((i: any) => <option key={i.id} value={i.id}>{i.user.fullName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-between items-center">
              <Button variant="secondary" size="sm" type="button" onClick={handleCheckAvailability} disabled={checking || !form.courseOfferingId}>
                {checking ? 'Checking…' : '🔍 Check Availability'}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={closeForm}>Cancel</Button>
                <Button variant="gold" size="sm" type="submit" disabled={saving || !form.courseOfferingId}>
                  {saving ? 'Saving…' : editSlot ? 'Update Slot' : 'Create Slot'}
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Main grid ───────────────────────────────────────────────── */}
        <div className="lg:col-span-8 ds-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">
              {view === 'week' ? 'Weekly Grid' : view === 'day' ? DAY_NAMES[selDay] : view === 'month' ? 'Month View' : 'All Slots'}
            </h3>
            {view === 'day' && (
              <div className="flex gap-1">
                {DAY_NAMES.map((d, i) => (
                  <button key={i} onClick={() => setSelDay(i)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${selDay === i ? 'bg-(--brand-gold) text-(--text-inverse)' : 'bg-(--hover-overlay) text-(--text-secondary)'}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {visibleSlots.length === 0 ? (
            <EmptyState variant="timetable" compact />
          ) : view === 'week' ? (
            <div className="overflow-x-auto">
              <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '52px repeat(5, 1fr)', gap: '3px' }}>
                <div />
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-mono font-semibold text-(--text-secondary) py-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">{d}</div>
                ))}
                {TIME_SLOTS.map(hour => (
                  <React.Fragment key={hour}>
                    <div className="flex items-start justify-center pt-2 font-mono text-[9px] text-(--text-faint)">{ETH_TIME_LABELS[hour]}</div>
                    {DAY_NAMES.map((_, di) => {
                      const cellSlots = slotsForHour(di, hour);
                      return (
                        <div key={di} className="min-h-[64px] border border-(--border-subtle) rounded-lg p-1 bg-(--hover-overlay) flex flex-col gap-0.5">
                          {cellSlots.map(s => <SlotCard key={s.id} slot={s} compact />)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : view === 'day' ? (
            <div className="space-y-2">
              {slotsForDay(selDay).length === 0
                ? <div className="py-12 text-center text-xs text-(--text-faint) font-mono border border-dashed border-(--border-default) rounded-xl">No classes on {DAY_NAMES[selDay]}</div>
                : slotsForDay(selDay).map(slot => <SlotCard key={slot.id} slot={slot} />)
              }
            </div>
          ) : view === 'month' ? (
            <div className="grid grid-cols-7 gap-1.5">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center font-mono text-[9px] text-(--text-faint) uppercase py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const wd = day % 7;
                const dow = wd === 0 ? 6 : wd - 1;
                const daySlots = visibleSlots.filter(s => s.dayOfWeek === dow);
                return (
                  <div key={i} className="h-14 border border-(--border-subtle) rounded-lg p-1.5 flex flex-col justify-between hover:bg-(--hover-overlay)">
                    <span className="font-mono text-[10px] text-(--text-secondary)">{day}</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {daySlots.slice(0, 4).map(s => (
                        <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${colorFor(s.courseOffering?.course?.code ?? '')}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {visibleSlots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)).map(slot => {
                const code = slot.courseOffering?.course?.code ?? '?';
                const st = STATUS_BADGE[slot.status] ?? STATUS_BADGE.PUBLISHED;
                return (
                  <div key={slot.id} className={`p-3 border rounded-xl flex items-center justify-between group ${colorFor(code)}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="font-mono text-[10px] font-bold w-8 text-center shrink-0">{DAY_NAMES[slot.dayOfWeek]?.slice(0,3)}</div>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-sm">{code} · {slot.courseOffering?.course?.name}</p>
                        <p className="text-xs text-(--text-secondary) flex items-center gap-2 mt-0.5 flex-wrap">
                          <Clock className="w-3 h-3 shrink-0" />{toEthiopianTimeRange(slot.startTime, slot.endTime)}
                          {slot.room && <><MapPin className="w-3 h-3 shrink-0" />{slot.room.building} {slot.room.name} <span className="text-[9px] opacity-60">({ROOM_TYPE_LABELS[slot.room.roomType] ?? slot.room.roomType})</span></>}
                          {slot.courseOffering?.instructor && <><User className="w-3 h-3 shrink-0" />{slot.courseOffering.instructor.user.fullName}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold ${st.cls}`}>{st.label}</span>
                      <button onClick={() => openEditForm(slot)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-(--brand-gold) bg-(--hover-overlay)"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteSlot(slot.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-(--status-danger) bg-(--hover-overlay)"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Conflicts */}
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
              <div className="py-8 text-center text-xs text-(--status-success) font-mono bg-(--status-success-bg) border border-(--status-success-border) rounded-xl">
                ✓ No conflicts detected
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {conflicts.map((conf, i) => (
                  <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-(--status-danger) bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        {conf.type === 'ROOM' ? 'Room Conflict' : 'Instructor Conflict'}
                      </span>
                      <Badge variant="rose" className="text-[8px]">Critical</Badge>
                    </div>
                    <p className="text-xs text-(--text-secondary)">
                      <strong className="text-(--text-primary)">{conf.slotA.courseCode}</strong> vs{' '}
                      <strong className="text-(--text-primary)">{conf.slotB.courseCode}</strong>
                    </p>
                    <p className="text-[10px] text-(--text-faint) font-mono">
                      {DAY_NAMES[conf.dayOfWeek]}: {toEthiopianTimeRange(conf.slotA.startTime, conf.slotA.endTime)}
                    </p>
                    <p className="text-[10px] text-(--text-faint)">Resource: {conf.resource}</p>
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
                { label: 'Total Slots',      value: slots.length },
                { label: 'Published',        value: slots.filter(s => s.status === 'PUBLISHED').length },
                { label: 'Draft',            value: slots.filter(s => s.status === 'DRAFT').length },
                { label: 'Cancelled',        value: slots.filter(s => s.status === 'CANCELLED').length },
                { label: 'Active Conflicts', value: conflicts.length, danger: conflicts.length > 0 },
                { label: 'Rooms Used',       value: new Set(visibleSlots.map(s => s.roomId).filter(Boolean)).size },
                { label: 'Instructors',      value: new Set(visibleSlots.map(s => s.instructorId).filter(Boolean)).size },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-(--text-secondary)">{item.label}</span>
                  <span className={`font-mono font-bold text-sm ${(item as any).danger ? 'text-(--status-danger)' : 'text-(--text-primary)'}`}>
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
