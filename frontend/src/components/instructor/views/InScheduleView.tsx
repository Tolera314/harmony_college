'use client';

/**
 * InScheduleView — Instructor weekly schedule from real DB data (spec §13)
 *
 * Features:
 * ✓ Week / Day / List views
 * ✓ Room + student-count per slot
 * ✓ "Take Attendance" shortcut for today's sessions
 * ✓ Real-time Socket.IO — personal schedule-changed notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Calendar, MapPin, Users, Clock, RefreshCw,
  PlayCircle, Wifi, WifiOff, Bell, BookOpen,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import { InstructorNavTab } from '../../../types/instructor';
import { useSocket } from '@/src/context/SocketContext';
import { toEthiopianTimeRange, toEthiopianTime } from '@/src/lib/utils';

const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const ETH_TIME_LABELS: Record<string, string> = Object.fromEntries(
  TIME_SLOTS.map(t => [t, toEthiopianTime(t)])
);

const SLOT_COLORS = [
  { border: 'border-blue-500',    bg: 'bg-blue-500/10',    text: 'text-blue-300'    },
  { border: 'border-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-300'   },
  { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  { border: 'border-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-300'  },
  { border: 'border-rose-500',    bg: 'bg-rose-500/10',    text: 'text-rose-300'    },
];
const offeringColorMap = new Map<string, typeof SLOT_COLORS[0]>();
let colorIdx = 0;
function colorForOffering(id: string) {
  if (!offeringColorMap.has(id)) offeringColorMap.set(id, SLOT_COLORS[colorIdx++ % SLOT_COLORS.length]);
  return offeringColorMap.get(id)!;
}

interface TodaySession {
  id: string;
  startTime: string;
  endTime: string;
  courseOffering: {
    id: string;
    course: { code: string; name: string };
    room: { name: string; building: string } | null;
    _count: { enrollments: number };
  };
  room: { name: string; building: string } | null;
  attendanceSession: {
    id: string; lifecycle: string; openedAt: string | null;
    _count: { records: number };
  } | null;
}

interface WeekSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseOffering: {
    id: string;
    course: { code: string; name: string; creditHours: number };
    semester: { name: string; academicYear: { name: string } };
    room: { name: string; building: string; roomType: string } | null;
    _count: { enrollments: number };
  };
  room: { name: string; building: string; roomType: string; capacity: number } | null;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `HTTP ${res.status}`);
  return data as T;
}

type View = 'week' | 'day' | 'list';

interface InScheduleViewProps {
  setActiveTab: (tab: InstructorNavTab) => void;
}

export const InScheduleView: React.FC<InScheduleViewProps> = ({ setActiveTab }) => {
  const { connected, onMyScheduleChanged } = useSocket();

  const [weekSlots,     setWeekSlots]     = useState<WeekSlot[]>([]);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [view,          setView]          = useState<View>('week');
  const [selDay,        setSelDay]        = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [changeAlert,   setChangeAlert]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ws, ts] = await Promise.all([
        apiFetch<WeekSlot[]>('/api/instructor/schedule'),
        apiFetch<TodaySession[]>('/api/instructor/schedule/today'),
      ]);
      setWeekSlots(ws);
      setTodaySessions(ts);
      offeringColorMap.clear(); colorIdx = 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedule');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => onMyScheduleChanged(e => {
    setChangeAlert(e.summary);
    load();
  }), [onMyScheduleChanged, load]);

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  function slotsForDay(dow: number) {
    return weekSlots.filter(s => s.dayOfWeek === dow).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  function slotsForHour(dow: number, hour: string) {
    return weekSlots.filter(s => s.dayOfWeek === dow && s.startTime.startsWith(hour.slice(0, 2)));
  }

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-(--text-primary)">My Schedule</h1>
            <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              connected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
            }`}>
              {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-sm text-(--text-muted) mt-0.5">
            {weekSlots.length} scheduled class{weekSlots.length !== 1 ? 'es' : ''} this week
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <div className="flex bg-(--hover-overlay) border border-(--border-default) p-1 rounded-xl">
            {(['week','day','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${view === v ? 'bg-(--brand-gold) text-(--text-inverse) shadow' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Change alert */}
      {changeAlert && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border bg-(--status-warning-bg) border-(--status-warning-border)">
          <Bell className="w-4 h-4 text-(--status-warning) shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-(--status-warning)">Your schedule has been updated</p>
            <p className="text-xs text-(--text-secondary) mt-0.5">{changeAlert}</p>
          </div>
          <button onClick={() => setChangeAlert(null)} className="text-(--text-faint) hover:text-(--text-primary)">✕</button>
        </div>
      )}

      {/* Today's sessions — always shown at top */}
      {todaySessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-(--brand-gold)">Today's Classes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {todaySessions.map(session => {
              const c = colorForOffering(session.courseOffering.id);
              const room = session.room ?? session.courseOffering.room;
              const enrolled = session.courseOffering._count.enrollments;
              const attOpen = session.attendanceSession?.lifecycle === 'OPEN';
              const attClosed = session.attendanceSession?.lifecycle === 'CLOSED' || session.attendanceSession?.lifecycle === 'FINALIZED';
              return (
                <Card key={session.id} className={`p-4 space-y-3 border-l-4 ${c.border} ${c.bg}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="gold">{session.courseOffering.course.code}</Badge>
                      <h3 className={`text-sm font-semibold mt-1 ${c.text}`}>{session.courseOffering.course.name}</h3>
                    </div>
                    {attOpen && <Badge variant="emerald">● Live</Badge>}
                    {attClosed && <Badge variant="glass">Done</Badge>}
                  </div>
                  <div className="space-y-1 text-xs text-(--text-secondary)">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-(--text-faint)" />{toEthiopianTimeRange(session.startTime, session.endTime)}</div>
                    {room && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-(--text-faint)" />{room.building} · {room.name}</div>}
                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-(--text-faint)" />{enrolled} enrolled{attOpen ? ` · ${session.attendanceSession?._count.records} marked` : ''}</div>
                  </div>
                  <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-2"
                    onClick={() => setActiveTab('attendance')}>
                    <PlayCircle className="w-4 h-4" />
                    {attOpen ? 'View Attendance' : attClosed ? 'View Results' : 'Take Attendance'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {weekSlots.length === 0 ? (
        <EmptyState variant="timetable" description="No classes scheduled yet. Contact the Registrar if you expect classes this semester." />
      ) : view === 'week' ? (
        <div className="ds-card rounded-2xl p-5">
          <div className="overflow-x-auto">
            <div className="grid min-w-[580px]" style={{ gridTemplateColumns: '48px repeat(5, 1fr)', gap: '3px' }}>
              <div />
              {DAY_NAMES.slice(0,5).map((d, i) => (
                <div key={d} className={`text-center py-2 rounded-lg border text-[10px] font-mono font-semibold ${i === todayDow ? 'bg-(--brand-gold)/20 border-(--brand-gold)/40 text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-subtle) text-(--text-secondary)'}`}>{d}</div>
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
                            <div key={slot.id} className={`p-1.5 border-l-2 rounded text-[9px] leading-tight cursor-pointer hover:opacity-80 ${c.border} ${c.bg} ${c.text}`}
                              onClick={() => setActiveTab('attendance')}>
                              <p className="font-mono font-bold">{slot.courseOffering.course.code}</p>
                              <p className="text-[8px] opacity-75 truncate">{slot.courseOffering.course.name}</p>
                              <p className="text-[8px] opacity-60">{toEthiopianTimeRange(slot.startTime, slot.endTime)}</p>
                              <p className="text-[8px] opacity-60"><Users className="inline w-2 h-2" /> {slot.courseOffering._count.enrollments}</p>
                              {slot.room && <p className="text-[8px] opacity-60"><MapPin className="inline w-2 h-2" /> {slot.room.name}</p>}
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
          <div className="flex gap-2 flex-wrap">
            {DAY_NAMES.slice(0,5).map((d, i) => (
              <button key={i} onClick={() => setSelDay(i)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selDay === i ? 'bg-(--brand-gold) text-(--text-inverse) border-(--brand-gold)'
                    : i === todayDow ? 'border-(--brand-gold)/40 text-(--brand-gold) bg-(--brand-gold)/10'
                    : 'border-(--border-default) text-(--text-secondary) bg-(--hover-overlay)'
                }`}>
                {d} {i === todayDow && <span className="text-[9px] opacity-70">Today</span>}
              </button>
            ))}
          </div>
          {slotsForDay(selDay).length === 0
            ? <div className="py-12 text-center text-sm text-(--text-faint) border border-dashed border-(--border-default) rounded-2xl">No classes on {DAY_NAMES[selDay]}</div>
            : (
              <div className="space-y-3">
                {slotsForDay(selDay).map(slot => {
                  const c = colorForOffering(slot.courseOffering.id);
                  const room = slot.room ?? slot.courseOffering.room;
                  return (
                    <div key={slot.id} className={`p-4 rounded-2xl border-l-4 ${c.border} ${c.bg} flex items-center justify-between gap-4`}>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="gold">{slot.courseOffering.course.code}</Badge>
                        </div>
                        <h3 className={`text-sm font-semibold ${c.text}`}>{slot.courseOffering.course.name}</h3>
                        <div className="flex items-center gap-4 text-xs text-(--text-secondary) flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{toEthiopianTimeRange(slot.startTime, slot.endTime)}</span>
                          {room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{room.building} {room.name}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{slot.courseOffering._count.enrollments} students</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{slot.courseOffering.course.creditHours} cr</span>
                        </div>
                      </div>
                      {selDay === todayDow && (
                        <Button variant="primary" size="sm" onClick={() => setActiveTab('attendance')}>
                          <PlayCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      ) : (
        /* List view — grouped by course offering */
        <div className="space-y-3">
          {[...new Set(weekSlots.map(s => s.courseOffering.id))].map(offeringId => {
            const offeringSlots = weekSlots.filter(s => s.courseOffering.id === offeringId).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
            const offering = offeringSlots[0].courseOffering;
            const c = colorForOffering(offeringId);
            return (
              <Card key={offeringId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="gold">{offering.course.code}</Badge>
                      <span className="text-xs text-(--text-faint)">{offering.course.creditHours} cr</span>
                    </div>
                    <h3 className="font-sans text-sm font-semibold text-(--text-primary)">{offering.course.name}</h3>
                    <p className="text-xs text-(--text-muted) mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />{offering._count.enrollments} enrolled
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('attendance')}>Attendance</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {offeringSlots.map(slot => {
                    const room = slot.room ?? offering.room;
                    return (
                      <div key={slot.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${c.border} ${c.bg}`}>
                        <Calendar className={`w-3 h-3 ${c.text}`} />
                        <span className={`font-mono font-semibold ${c.text}`}>{DAY_SHORT[slot.dayOfWeek]}</span>
                        <span className="text-(--text-secondary)">{toEthiopianTimeRange(slot.startTime, slot.endTime)}</span>
                        {room && <span className="text-(--text-faint)"><MapPin className="inline w-2.5 h-2.5" /> {room.name}</span>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
