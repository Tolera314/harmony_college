'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Calendar, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import { ConfirmModal } from '../ui/ConfirmModal';
import { calendarApi, offeringsApi } from '@/src/lib/registrarApi';

const EVENT_BADGE: Record<string, any> = {
  REGISTRATION_OPEN: 'emerald', REGISTRATION_CLOSE: 'rose', ADD_DROP_DEADLINE: 'rose',
  EXAM_PERIOD: 'amber', HOLIDAY: 'glass', GRADUATION: 'gold',
  ADMISSION_DEADLINE: 'amber', SEMESTER_START: 'emerald', SEMESTER_END: 'rose', ACADEMIC_EVENT: 'glass',
};
const EVENT_LABELS: Record<string, string> = {
  REGISTRATION_OPEN: 'Registration Open', REGISTRATION_CLOSE: 'Registration Close',
  ADD_DROP_DEADLINE: 'Add/Drop Deadline', EXAM_PERIOD: 'Exam Period', HOLIDAY: 'Holiday',
  GRADUATION: 'Graduation', ADMISSION_DEADLINE: 'Admission Deadline',
  SEMESTER_START: 'Semester Start', SEMESTER_END: 'Semester End', ACADEMIC_EVENT: 'Academic Event',
};

export const AcademicCalendarView: React.FC = () => {
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [academicYears, setAYs] = useState<any[]>([]);
  const [ayFilter, setAY]       = useState('');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    title: '', description: '', eventType: 'ACADEMIC_EVENT',
    startDate: '', endDate: '', isPublished: true, academicYearId: '',
  });

  const load = useCallback(async (ay = ayFilter) => {
    setLoading(true); setError(null);
    try {
      const [evts, meta] = await Promise.all([
        calendarApi.list({ ...(ay && { academicYearId: ay }) }),
        offeringsApi.getMeta(),
      ]);
      setEvents(evts);
      // Extract academic years from semesters
      const ays = meta.semesters.map(s => ({ id: s.academicYear?.name, name: s.academicYear?.name }));
      // Unique
      const seen = new Set<string>();
      setAYs(ays.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [ayFilter]);

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveError(null);
    try {
      await calendarApi.create({ ...form, ...(form.academicYearId ? {} : { academicYearId: undefined }) });
      setShowForm(false); setForm({ title: '', description: '', eventType: 'ACADEMIC_EVENT', startDate: '', endDate: '', isPublished: true, academicYearId: '' });
      await load();
    } catch (e: unknown) { setSaveError(e instanceof Error ? e.message : 'Create failed'); }
    finally { setSaving(false); }
  };

  const grouped = events.reduce<Record<string, any[]>>((acc, ev) => {
    const month = new Date(ev.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(ev);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Academic Calendar</h2>
          <p className="text-xs text-(--text-muted)">Real calendar events from PostgreSQL.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button variant="gold" size="sm" onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-xs">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="ds-card p-5 rounded-2xl space-y-4">
          {saveError && <div className="p-2 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{saveError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Event Type</label>
              <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none">
                {Object.entries(EVENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Start Date</label>
              <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none focus:border-(--brand-gold)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">End Date</label>
              <input type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs focus:outline-none focus:border-(--brand-gold)" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-(--text-secondary)">Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="gold" size="sm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Event'}</Button>
          </div>
        </form>
      )}

      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : events.length === 0 ? (
        <EmptyState variant="default" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, evts]) => (
            <div key={month}>
              <h3 className="text-xs font-mono uppercase tracking-wider text-(--text-faint) mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-(--brand-gold)" /> {month}
              </h3>
              <div className="space-y-2">
                {evts.map(ev => (
                  <div key={ev.id} className="flex items-start gap-4 p-4 ds-card rounded-xl">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-2xl font-mono font-bold text-(--brand-gold)">
                        {new Date(ev.startDate).getDate()}
                      </p>
                      <p className="text-[10px] font-mono text-(--text-faint)">
                        {new Date(ev.startDate).toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-(--text-primary)">{ev.title}</p>
                        <Badge variant={EVENT_BADGE[ev.eventType] ?? 'glass'} className="text-[10px]">
                          {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                        </Badge>
                        {ev.isPublished && <Badge variant="emerald" className="text-[10px]">Published</Badge>}
                      </div>
                      {ev.description && <p className="text-xs text-(--text-muted) mt-1">{ev.description}</p>}
                      {ev.endDate !== ev.startDate && (
                        <p className="text-[10px] font-mono text-(--text-faint) mt-1">
                          Ends {new Date(ev.endDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setDeleteTarget(ev)} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-faint) hover:text-(--status-danger) transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try { await calendarApi.update(deleteTarget.id, { isPublished: false }); await load(); }
          finally { setDeleteTarget(null); }
        }}
        title="Remove Calendar Event"
        message={`Remove "${deleteTarget?.title}" from the calendar?`}
        icon={<Calendar className="w-6 h-6" />} variant="danger" confirmLabel="Remove" />
    </motion.div>
  );
};
