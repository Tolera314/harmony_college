'use client';

/**
 * MyTimetableView — Student read-only weekly timetable (spec §12)
 *
 * Shows only enrolled courses. Updates in real-time via Socket.IO
 * when the Registrar changes the schedule.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Calendar, MapPin, User, Clock, RefreshCw, Wifi, WifiOff, Bell } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from './ui/States';
import { studentDashApi } from '@/src/lib/studentApi';
import { useSocket } from '@/src/context/SocketContext';
import { toEthiopianTimeRange, toEthiopianTime } from '@/src/lib/utils';

const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
// Ethiopian labels for the time slot column (display-only; keys remain standard)
const ETH_TIME_LABELS: Record<string, string> = Object.fromEntries(
  ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => [t, toEthiopianTime(t)])
);

const SLOT_COLORS = [
  { border: 'border-blue-500',    bg: 'bg-blue-500/10',    text: 'text-blue-300'    },
  { border: 'border-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-300'   },
  { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  { border: 'border-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-300'  },
  { border: 'border-rose-500',    bg: 'bg-rose-500/10',    text: 'text-rose-300'    },
  { border: 'border-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-300'    },
  { border: 'border-indigo-500',  bg: 'bg-indigo-500/10',  text: 'text-indigo-300'  },
];

const offeringColorMap = new Map<string, typeof SLOT_COLORS[0]>();
let colorIdx = 0;
function colorForOffering(offeringId: string) {
  if (!offeringColorMap.has(offeringId)) {
    offeringColorMap.set(offeringId, SLOT_COLORS[colorIdx++ % SLOT_COLORS.length]);
  }
  return offeringColorMap.get(offeringId)!;
}

type TimetableSlot = Awaited<ReturnType<typeof studentDashApi.getTimetable>>['slots'][0];
type View = 'week' | 'day' | 'list';

export const MyTimetableView: React.FC = () => {
  const { connected, joinTimetableRoom, leaveTimetableRoom,
          onTimetableCreated, onTimetableUpdated, onTimetableDeleted, onMyScheduleChanged } = useSocket();

  const [slots,      setSlots]      = useState<TimetableSlot[]>([]);
  const [offeringIds, setOfferingIds] = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [view,       setView]       = useState<View>('week');
  const [selDay,     setSelDay]     = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [scheduleChangedAlert, setScheduleChangedAlert] = useState<string | null>(null);

  // Semester for timetable room (derived from first slot)
  const [semesterId, setSemesterId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await studentDashApi.getTimetable();
      setSlots(data.slots);
      setOfferingIds(data.offeringIds);
      // Reset color map on reload
      offeringColorMap.clear();
      colorIdx = 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Extract semesterId from first slot to join socket room
  useEffect(() => {
    if (slots.length && !semesterId) {
      const s = (slots[0].courseOffering as any)?.semester?.id;
      if (s) setSemesterId(s);
    }
  }, [slots, semesterId]);

  // Join timetable socket room for this semester
  useEffect(() => {
    if (!semesterId) return;
    joinTimetableRoom(semesterId);
    return () => { leaveTimetableRoom(semesterId); };
  }, [semesterId, joinTimetableRoom, leaveTimetableRoom]);

  // On any timetable change, reload
  useEffect(() => onTimetableCreated(() => load()), [onTimetableCreated, load]);
  useEffect(() => onTimetableUpdated(() => load()), [onTimetableUpdated, load]);
  useEffect(() => onTimetableDeleted(() => load()), [onTimetableDeleted, load]);

  // Personal notification when MY schedule changes
  useEffect(() => onMyScheduleChanged(e => {
    setScheduleChangedAlert(e.summary);
    load();
  }), [onMyScheduleChanged, load]);

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  function slotsForDay(dow: number) {
    return slots.filter(s => s.dayOfWeek === dow).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function slotsForHour(dow: number, hour: string) {
    return slots.filter(s => s.dayOfWeek === dow && s.startTime.startsWith(hour.slice(0, 2)));
  }

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-8">

      {/* Schedule change alert */}
      <AnimatePresence>
        {scheduleChangedAlert && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl border bg-(--status-warning-bg) border-(--status-warning-border)">
            <Bell className="w-4 h-4 text-(--status-warning) shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-(--status-warning)">Your schedule has been updated</p>
              <p className="text-xs text-(--text-secondary) mt-0.5">{scheduleChangedAlert}</p>
            </div>
            <button onClick={() => setScheduleChangedAlert(null)} className="text-(--text-faint) hover:text-(--text-primary)">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-(--text-primary)">My Timetable</h1>
            <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              connected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
            }`}>
              {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-sm text-(--text-muted) mt-0.5">
            {slots.length} class{slots.length !== 1 ? 'es' : ''} this week · {offeringIds.length} enrolled course{offeringIds.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <div className="flex bg-(--hover-overlay) border border-(--border-default) p-1 rounded-xl">
            {(['week', 'day', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${view === v ? 'bg-(--brand-gold) text-(--text-inverse) shadow' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {slots.length === 0 ? (
        <EmptyState variant="timetable" description="No classes scheduled yet. Your Registrar will publish your timetable soon." />
      ) : view === 'week' ? (
        <div className="ds-card rounded-2xl p-5">
          <div className="overflow-x-auto">
            <div className="grid min-w-[580px]" style={{ gridTemplateColumns: '48px repeat(5, 1fr)', gap: '3px' }}>
              <div />
              {DAY_NAMES.slice(0, 5).map((d, i) => (
                <div key={d} className={`text-center py-2 rounded-lg border text-[10px] font-mono font-semibold ${i === todayDow ? 'bg-(--brand-gold)/20 border-(--brand-gold)/40 text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-subtle) text-(--text-secondary)'}`}>
                  {d}
                </div>
              ))}
              {TIME_SLOTS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="flex items-start justify-center pt-1.5 font-mono text-[9px] text-(--text-faint)">{ETH_TIME_LABELS[hour]}</div>
                  {[0,1,2,3,4].map(di => {
                    const cell = slotsForHour(di, hour);
                    return (
                      <div key={di} className={`min-h-[60px] border rounded-lg p-1 flex flex-col gap-0.5 ${di === todayDow ? 'border-(--brand-gold)/20 bg-(--brand-gold)/5' : 'border-(--border-subtle) bg-(--hover-overlay)'}`}>
                        {cell.map(slot => {
                          const c = colorForOffering(slot.courseOffering.id);
                          return (
                            <div key={slot.id} className={`p-1.5 border-l-2 rounded text-[9px] leading-tight ${c.border} ${c.bg} ${c.text}`}>
                              <p className="font-mono font-bold">{slot.courseOffering.course.code}</p>
                              <p className="text-[8px] opacity-75 truncate">{slot.courseOffering.course.name}</p>
                              <p className="text-[8px] opacity-60">{toEthiopianTimeRange(slot.startTime, slot.endTime)}</p>
                              {slot.courseOffering.room && (
                                <p className="text-[8px] opacity-60"><MapPin className="inline w-2 h-2" /> {slot.courseOffering.room.building} {slot.courseOffering.room.name}</p>
                              )}
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
        </div>
      ) : view === 'day' ? (
        <div className="space-y-4">
          {/* Day picker */}
          <div className="flex gap-2 flex-wrap">
            {DAY_NAMES.slice(0, 5).map((d, i) => (
              <button key={i} onClick={() => setSelDay(i)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selDay === i
                    ? 'bg-(--brand-gold) text-(--text-inverse) border-(--brand-gold)'
                    : i === todayDow
                      ? 'border-(--brand-gold)/40 text-(--brand-gold) bg-(--brand-gold)/10'
                      : 'border-(--border-default) text-(--text-secondary) bg-(--hover-overlay)'
                }`}>
                {d} {i === todayDow && <span className="text-[9px] ml-1 opacity-70">Today</span>}
              </button>
            ))}
          </div>

          {slotsForDay(selDay).length === 0 ? (
            <div className="py-12 text-center text-sm text-(--text-faint) border border-dashed border-(--border-default) rounded-2xl">
              No classes on {DAY_NAMES[selDay]}
            </div>
          ) : (
            <div className="space-y-3">
              {slotsForDay(selDay).map(slot => {
                const c = colorForOffering(slot.courseOffering.id);
                const now = new Date();
                const [sh, sm] = slot.startTime.split(':').map(Number);
                const [eh, em] = slot.endTime.split(':').map(Number);
                const startMin = sh * 60 + sm;
                const endMin   = eh * 60 + em;
                const nowMin   = now.getHours() * 60 + now.getMinutes();
                const isNow = selDay === todayDow && nowMin >= startMin && nowMin < endMin;

                return (
                  <motion.div key={slot.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`p-4 rounded-2xl border-l-4 ${c.border} ${c.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="gold">{slot.courseOffering.course.code}</Badge>
                          {isNow && <Badge variant="emerald">● Now</Badge>}
                        </div>
                        <h3 className={`font-sans text-base font-semibold ${c.text}`}>
                          {slot.courseOffering.course.name}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono text-sm font-bold ${c.text}`}>{toEthiopianTime(slot.startTime)}</p>
                        <p className="font-mono text-xs text-(--text-faint)">–{toEthiopianTime(slot.endTime)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-(--text-secondary)">
                      {slot.courseOffering.instructor && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-(--text-faint)" />
                          <span>{slot.courseOffering.instructor.user.fullName}</span>
                        </div>
                      )}
                      {slot.courseOffering.room && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-(--text-faint)" />
                          <span>{slot.courseOffering.room.building} · {slot.courseOffering.room.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-(--text-faint)" />
                        <span>{slot.courseOffering.course.creditHours} credit hrs</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {[...new Set(slots.map(s => s.courseOffering.id))].map(offeringId => {
            const offeringSlots = slots.filter(s => s.courseOffering.id === offeringId).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
            const offering = offeringSlots[0].courseOffering;
            const c = colorForOffering(offeringId);
            return (
              <Card key={offeringId} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="gold">{offering.course.code}</Badge>
                      <span className="text-xs text-(--text-faint)">{offering.course.creditHours} cr</span>
                    </div>
                    <h3 className="font-sans text-sm font-semibold text-(--text-primary)">{offering.course.name}</h3>
                    {offering.instructor && (
                      <p className="text-xs text-(--text-muted) flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />{offering.instructor.user.fullName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {offeringSlots.map(slot => (
                    <div key={slot.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${c.border} ${c.bg} text-xs`}>
                      <Calendar className={`w-3 h-3 ${c.text}`} />
                      <span className={`font-mono font-semibold ${c.text}`}>{DAY_SHORT[slot.dayOfWeek]}</span>
                      <span className="text-(--text-secondary)">{toEthiopianTimeRange(slot.startTime, slot.endTime)}</span>
                      {slot.courseOffering.room && (
                        <span className="text-(--text-faint)"><MapPin className="inline w-2.5 h-2.5" /> {slot.courseOffering.room.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
