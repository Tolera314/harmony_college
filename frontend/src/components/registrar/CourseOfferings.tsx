'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  KanbanSquare, Table as TableIcon, MapPin, Clock,
  ChevronRight, Plus, RefreshCw, Search
} from 'lucide-react';
import { SlidePanel } from '../ui/SlidePanel';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import {
  offeringsApi, type OfferingItem, type OfferingsListResponse, type OfferingMeta,
} from '@/src/lib/registrarApi';

const STATUS_BADGE: Record<string, any> = {
  DRAFT: 'glass', INSTRUCTOR_ASSIGNED: 'amber', SCHEDULED: 'emerald',
  ACTIVE: 'emerald', CLOSED: 'rose', CANCELLED: 'rose',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', INSTRUCTOR_ASSIGNED: 'Instructor Assigned',
  SCHEDULED: 'Scheduled', ACTIVE: 'Active', CLOSED: 'Closed', CANCELLED: 'Cancelled',
};
const KANBAN_COLUMNS = ['DRAFT', 'INSTRUCTOR_ASSIGNED', 'SCHEDULED', 'CLOSED'] as const;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CourseOfferings: React.FC = () => {
  const [data, setData]         = useState<OfferingsListResponse | null>(null);
  const [meta, setMeta]         = useState<OfferingMeta | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const [search, setSearch]     = useState('');
  const [semesterFilter, setSF] = useState('');
  const [page, setPage]         = useState(1);
  const searchTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editTarget, setEditTarget] = useState<OfferingItem | null>(null);
  const [panelOpen, setPanelOpen]   = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    instructorId: '' as string | null,
    roomId: '' as string | null,
    capacity: 40,
    status: 'DRAFT' as string,
    timetables: [] as { dayOfWeek: number; startTime: string; endTime: string }[],
  });

  const [addForm, setAddForm] = useState({
    courseId: '', semesterId: '', instructorId: '', roomId: '',
    capacity: 40, section: 'A',
    timetables: [] as { dayOfWeek: number; startTime: string; endTime: string }[],
  });
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 0, startTime: '09:00', endTime: '10:30' });

  const load = useCallback(async (pg: number, q: string, sem: string) => {
    setLoading(true); setError(null);
    try {
      const res = await offeringsApi.list({ page: pg, limit: 20, search: q || undefined, semesterId: sem || undefined });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load offerings');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    offeringsApi.getMeta().then(m => {
      setMeta(m);
      const cur = m.semesters.find(s => s.isCurrent);
      if (cur) { setSF(cur.id); load(1, search, cur.id); }
      else load(1, search, semesterFilter);
    }).catch(() => { load(1, search, semesterFilter); });
  }, []);

  // Reload on page change
  useEffect(() => { load(page, search, semesterFilter); }, [page]);

  // Reload on semester filter change (resets to page 1)
  useEffect(() => {
    if (semesterFilter) { setPage(1); load(1, search, semesterFilter); }
  }, [semesterFilter]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(1, val, semesterFilter); }, 350);
  };

  const openEdit = (off: OfferingItem) => {
    setEditTarget(off);
    setEditForm({
      instructorId: off.instructor?.id ?? null,
      roomId: off.room?.id ?? null,
      capacity: off.capacity,
      status: off.status,
      timetables: off.timetables ?? [],
    });
    setSaveError(null);
    setPanelOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setSaveError(null);
    try {
      await offeringsApi.update(editTarget.id, {
        instructorId: editForm.instructorId || null,
        roomId: editForm.roomId || null,
        capacity: editForm.capacity,
        status: editForm.status,
        ...(editForm.timetables.length > 0 && { timetables: editForm.timetables }),
      });
      setPanelOpen(false);
      await load(page, search, semesterFilter);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveError(null);
    try {
      await offeringsApi.create({
        courseId: addForm.courseId,
        semesterId: addForm.semesterId || semesterFilter,
        instructorId: addForm.instructorId || undefined,
        roomId: addForm.roomId || undefined,
        capacity: addForm.capacity,
        section: addForm.section,
        ...(addForm.timetables.length > 0 && { timetables: addForm.timetables }),
      });
      setAddPanelOpen(false);
      await load(page, search, semesterFilter);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Create failed — check for conflicts or duplicates');
    } finally { setSaving(false); }
  };

  const addSlot = (form: typeof editForm, setForm: (f: any) => void) => {
    setForm({ ...form, timetables: [...form.timetables, { ...newSlot }] });
  };
  const removeSlot = (idx: number, form: typeof editForm, setForm: (f: any) => void) => {
    setForm({ ...form, timetables: form.timetables.filter((_, i) => i !== idx) });
  };

  const allOfferings = data?.offerings ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Course Offerings</h2>
          <p className="text-xs text-(--text-muted)">Schedule courses, assign instructors, and manage room allocations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => load(page, search, semesterFilter)}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="gold" size="sm" onClick={() => { setSaveError(null); setAddPanelOpen(true); }} className="flex items-center gap-1.5 text-xs">
            <Plus className="w-4 h-4" /> New Offering
          </Button>
          <div className="flex bg-(--hover-overlay) border border-(--border-default) p-1.5 rounded-xl">
            {(['kanban', 'table'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode === m ? 'bg-(--brand-gold) text-(--text-inverse) shadow' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {m === 'kanban' ? <><KanbanSquare className="w-3.5 h-3.5" /> Kanban</> : <><TableIcon className="w-3.5 h-3.5" /> Table</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search offerings..."
            className="w-full pl-9 pr-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={semesterFilter} onChange={e => setSF(e.target.value)}
          className="px-3 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Semesters</option>
          {(meta?.semesters ?? []).map(s => (
            <option key={s.id} value={s.id}>{s.name} — {s.academicYear?.name}{s.isCurrent ? ' (Current)' : ''}</option>
          ))}
        </select>
      </div>

      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load(page, search, semesterFilter)} description={error} />
      ) : viewMode === 'kanban' ? (
        /* Kanban */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map(col => {
            const list = allOfferings.filter(o => o.status === col);
            return (
              <div key={col} className="bg-(--hover-overlay) border border-(--border-subtle) p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-(--border-subtle) pb-2">
                  <span className="text-xs font-mono font-bold text-(--text-secondary)">{STATUS_LABEL[col]}</span>
                  <Badge variant="glass" className="font-mono text-[10px]">{list.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {list.map(off => {
                    const enrolled = off._count?.enrollments ?? 0;
                    const util = off.capacity > 0 ? Math.round((enrolled / off.capacity) * 100) : 0;
                    return (
                      <div key={off.id} onClick={() => openEdit(off)}
                        className="p-4 bg-(--bg-input) border border-(--border-default) rounded-xl hover:border-(--brand-gold)/50 transition-all cursor-pointer space-y-3 group">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-bold text-(--brand-gold) text-xs">{off.course.code}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-(--text-faint) opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-(--text-primary) truncate">{off.course.name}</p>
                          <p className="text-[10px] text-(--text-faint) font-mono">{off.instructor?.user?.fullName ?? 'TBD'}</p>
                        </div>
                        <div className="space-y-1.5 border-t border-(--border-subtle) pt-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-(--text-muted)">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{off.room ? `${off.room.building} · Rm ${off.room.name}` : 'No Room'}</span>
                          </div>
                          {off.timetables?.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-(--text-muted)">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{DAY_NAMES[off.timetables[0].dayOfWeek]} {off.timetables[0].startTime}–{off.timetables[0].endTime}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-(--text-faint)">
                            <span>Seats</span>
                            <span>{enrolled}/{off.capacity} ({util}%)</span>
                          </div>
                          <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${util >= 100 ? 'bg-(--status-danger)' : util > 80 ? 'bg-(--brand-gold)' : 'bg-(--status-success)'}`}
                              style={{ width: `${Math.min(100, util)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-(--border-subtle) rounded-xl text-(--text-faint) text-[10px]">
                      No courses in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b border-(--border-default) font-mono text-[10px] uppercase tracking-wider text-(--text-muted)">
              <tr>
                <th className="px-5 py-4">Course</th>
                <th className="px-5 py-4">Instructor</th>
                <th className="px-5 py-4">Room</th>
                <th className="px-5 py-4">Schedule</th>
                <th className="px-5 py-4">Capacity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
              {allOfferings.map(off => {
                const enrolled = off._count?.enrollments ?? 0;
                const util = off.capacity > 0 ? Math.round((enrolled / off.capacity) * 100) : 0;
                return (
                  <tr key={off.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-(--text-primary)">{off.course.code}</p>
                      <p className="text-[10px] text-(--text-faint) truncate max-w-[140px]">{off.course.name}</p>
                    </td>
                    <td className="px-5 py-4">{off.instructor?.user?.fullName ?? <span className="text-(--status-warning)">TBD</span>}</td>
                    <td className="px-5 py-4 font-mono">
                      {off.room ? `${off.room.building} · ${off.room.name}` : <span className="text-(--status-danger)">Unallocated</span>}
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px]">
                      {off.timetables?.length > 0 ? off.timetables.map(t => `${DAY_NAMES[t.dayOfWeek]} ${t.startTime}`).join(', ') : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between text-[9px] font-mono text-(--text-faint)">
                          <span>{enrolled}/{off.capacity}</span><span>{util}%</span>
                        </div>
                        <div className="h-1 bg-(--hover-overlay) rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${util >= 100 ? 'bg-(--status-danger)' : util > 80 ? 'bg-(--brand-gold)' : 'bg-(--status-success)'}`}
                            style={{ width: `${Math.min(100, util)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={STATUS_BADGE[off.status] ?? 'glass'}>{STATUS_LABEL[off.status] ?? off.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(off)} className="px-2.5 py-1.5 bg-(--hover-overlay) border border-(--border-default) rounded-lg text-[10px] font-semibold hover:text-(--brand-gold) transition-all">
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })}
              {allOfferings.length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="courses" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination — shown for both views */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} offerings · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Edit Offering — SlidePanel */}
      <SlidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)}
        title={editTarget ? `Configure — ${editTarget.course.code} (${editTarget.section})` : ''}
        subtitle="Course Offering" width="max-w-md">
        {editTarget && (
          <form onSubmit={handleSaveEdit} className="space-y-4 font-sans">
            {saveError && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{saveError}</div>}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Instructor</label>
              <select value={editForm.instructorId ?? ''} onChange={e => setEditForm(f => ({ ...f, instructorId: e.target.value || null }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                <option value="">TBD — Not Assigned</option>
                {(meta?.instructors ?? []).map(i => <option key={i.id} value={i.id}>{i.user.fullName}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Room</label>
                <select value={editForm.roomId ?? ''} onChange={e => setEditForm(f => ({ ...f, roomId: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                  <option value="">No Room</option>
                  {(meta?.rooms ?? []).map(r => <option key={r.id} value={r.id}>{r.building} · {r.name} ({r.capacity})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Capacity</label>
                <input type="number" min={1} max={500} value={editForm.capacity}
                  onChange={e => setEditForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) font-mono" />
              </div>
            </div>

            {/* Timetable slots */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary)">Schedule Slots</label>
              {editForm.timetables.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] bg-(--bg-input) p-2 rounded-xl border border-(--border-subtle)">
                  <span className="font-mono text-(--brand-gold)">{DAY_NAMES[t.dayOfWeek]}</span>
                  <span className="text-(--text-secondary)">{t.startTime} – {t.endTime}</span>
                  <button type="button" onClick={() => removeSlot(i, editForm, setEditForm)} className="ml-auto text-(--text-faint) hover:text-(--status-danger)">×</button>
                </div>
              ))}
              <div className="flex gap-2 items-end">
                <select value={newSlot.dayOfWeek} onChange={e => setNewSlot(s => ({ ...s, dayOfWeek: Number(e.target.value) }))}
                  className="px-2 py-1.5 bg-(--bg-input) border border-(--border-subtle) rounded-lg text-xs focus:outline-none">
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={newSlot.startTime} onChange={e => setNewSlot(s => ({ ...s, startTime: e.target.value }))}
                  className="px-2 py-1.5 bg-(--bg-input) border border-(--border-subtle) rounded-lg text-xs focus:outline-none font-mono" />
                <input type="time" value={newSlot.endTime} onChange={e => setNewSlot(s => ({ ...s, endTime: e.target.value }))}
                  className="px-2 py-1.5 bg-(--bg-input) border border-(--border-subtle) rounded-lg text-xs focus:outline-none font-mono" />
                <button type="button" onClick={() => addSlot(editForm, setEditForm)}
                  className="px-2.5 py-1.5 bg-(--accent-gold-subtle) border border-(--brand-gold)/30 rounded-lg text-xs font-semibold text-(--brand-gold)">
                  + Add
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" size="sm" type="button" className="flex-1" onClick={() => setPanelOpen(false)}>Cancel</Button>
              <Button variant="gold" size="sm" type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </SlidePanel>

      {/* Create New Offering — SlidePanel */}
      <SlidePanel isOpen={addPanelOpen} onClose={() => setAddPanelOpen(false)}
        title="Create Course Offering" subtitle="Course Offerings" width="max-w-md">
        <form onSubmit={handleCreateOffering} className="space-y-4 font-sans">
          {saveError && <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{saveError}</div>}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Semester</label>
            <select value={addForm.semesterId || semesterFilter} onChange={e => setAddForm(f => ({ ...f, semesterId: e.target.value }))}
              className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
              {(meta?.semesters ?? []).map(s => <option key={s.id} value={s.id}>{s.name} — {s.academicYear?.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Instructor</label>
              <select value={addForm.instructorId} onChange={e => setAddForm(f => ({ ...f, instructorId: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                <option value="">TBD</option>
                {(meta?.instructors ?? []).map(i => <option key={i.id} value={i.id}>{i.user.fullName}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Room</label>
              <select value={addForm.roomId} onChange={e => setAddForm(f => ({ ...f, roomId: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none">
                <option value="">No Room</option>
                {(meta?.rooms ?? []).map(r => <option key={r.id} value={r.id}>{r.building} · {r.name} ({r.capacity})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Section</label>
              <input type="text" maxLength={5} value={addForm.section} onChange={e => setAddForm(f => ({ ...f, section: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) font-mono focus:outline-none focus:border-(--brand-gold)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Capacity</label>
              <input type="number" min={1} max={500} value={addForm.capacity} onChange={e => setAddForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) font-mono focus:outline-none focus:border-(--brand-gold)" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" type="button" className="flex-1" onClick={() => setAddPanelOpen(false)}>Cancel</Button>
            <Button variant="gold" size="sm" type="submit" className="flex-1" disabled={saving || !addForm.courseId}>{saving ? 'Creating…' : 'Create Offering'}</Button>
          </div>
        </form>
      </SlidePanel>
    </motion.div>
  );
};


