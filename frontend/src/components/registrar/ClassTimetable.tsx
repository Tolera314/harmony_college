'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { 
  Calendar as CalendarIcon, Clock, AlertTriangle, 
  MapPin, User, Sparkles, RefreshCw, Check, Info, X
} from 'lucide-react';
import { EmptyState } from '../ui/States';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Initial Schedule and conflicts
const initialScheduleEvents = [
  { id: 'ev1', code: 'CS101', name: 'Intro to CS', instructor: 'Dr. Bekele Ayalew', building: 'Block A', room: '101', day: 'Monday', timeSlot: '09:00 AM - 10:30 AM', color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  { id: 'ev2', code: 'CS201', name: 'Data Structures', instructor: 'Dr. Bekele Ayalew', building: 'Block C', room: '204', day: 'Tuesday', timeSlot: '10:00 AM - 11:30 AM', color: 'border-amber-500 bg-amber-500/10 text-(--status-warning)' },
  { id: 'ev3', code: 'CS440', name: 'Artificial Intelligence', instructor: 'Dr. Elias Lemma', building: 'Block B', room: '302', day: 'Wednesday', timeSlot: '02:00 PM - 03:30 PM', color: 'border-emerald-500 bg-(--status-success-bg) text-(--status-success)' },
  { id: 'ev4', code: 'MATH101', name: 'Calculus I', instructor: 'Prof. Martha Wondimu', building: 'Block A', room: '104', day: 'Monday', timeSlot: '11:00 AM - 12:30 PM', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
  { id: 'ev5', code: 'MATH302', name: 'Calculus III', instructor: 'Prof. Martha Wondimu', building: 'Block C', room: '204', day: 'Tuesday', timeSlot: '10:00 AM - 11:30 AM', color: 'border-(--brand-gold) bg-(--accent-gold-subtle) text-(--brand-gold)' }, // Clashes with ev2 room and instructor
  { id: 'ev6', code: 'MECH201', name: 'Engineering Statics', instructor: 'Dr. Abel Tesfaye', building: 'Block B', room: '201', day: 'Friday', timeSlot: '04:00 PM - 05:30 PM', color: 'border-rose-500 bg-(--status-danger-bg) text-(--status-danger)' }
];

const initialConflicts = [
  {
    id: 'conf1',
    type: 'Room Conflict',
    description: 'Room Overlap: Both CS201 and MATH302 are scheduled in Block C, Room 204.',
    severity: 'Critical',
    events: ['ev2', 'ev5'],
    suggestions: [
      { type: 'Room Swap', label: 'Move MATH302 to Block A, Room 101 (Available)', action: { eventId: 'ev5', key: 'room', val: '101', building: 'Block A' } },
      { type: 'Time Shift', label: 'Reschedule MATH302 to Tuesday 02:00 PM - 03:30 PM', action: { eventId: 'ev5', key: 'timeSlot', val: '02:00 PM - 03:30 PM', day: 'Tuesday' } }
    ]
  },
  {
    id: 'conf2',
    type: 'Instructor Conflict',
    description: 'Instructor Overlap: Dr. Bekele Ayalew is scheduled to lecture two classes simultaneously.',
    severity: 'Critical',
    events: ['ev1', 'ev2'], // simplified example
    suggestions: [
      { type: 'Substitute', label: 'Assign Ato Kebede Belay for CS101 section', action: { eventId: 'ev1', key: 'instructor', val: 'Ato Kebede Belay' } }
    ]
  }
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeLabels = ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'];

export const ClassTimetable: React.FC = () => {
  const [events, setEvents] = useState(initialScheduleEvents);
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [viewTab, setViewTab] = useState<'week' | 'day' | 'month'>('week');
  const [selectedDay, setSelectedDay] = useState('Monday');

  const handleResolveConflict = (conflictId: string, suggestionAction: any) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === suggestionAction.eventId) {
        const updated = { ...ev };
        if (suggestionAction.key === 'room') {
          updated.room = suggestionAction.val;
          updated.building = suggestionAction.building;
        } else if (suggestionAction.key === 'timeSlot') {
          updated.timeSlot = suggestionAction.val;
          if (suggestionAction.day) updated.day = suggestionAction.day;
        } else if (suggestionAction.key === 'instructor') {
          updated.instructor = suggestionAction.val;
        }
        return updated;
      }
      return ev;
    }));

    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    alert('Conflict resolved successfully! Calendar schedule updated.');
  };

  const getDayEvents = (day: string) => {
    return events.filter(ev => ev.day === day);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary) tracking-wide">Class Timetable</h2>
          <p className="text-xs text-(--text-muted)">Manage university weekly schedules, verify reservations, and resolve booking overlaps.</p>
        </div>

        {/* View Calendar Tabs */}
        <div className="flex bg-(--hover-overlay) border border-(--border-default) p-1.5 rounded-xl self-start md:self-center">
          {(['week', 'day', 'month'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                viewTab === tab 
                  ? 'bg-(--brand-gold) text-(--text-inverse) shadow' 
                  : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              {tab} View
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Weekly schedule Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 ds-card rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Academic Weekly Grid</h3>
            {viewTab === 'day' && (
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-1.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-xs text-(--text-secondary) focus:outline-none"
              >
                {daysOfWeek.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {viewTab === 'week' ? (
            /* Weekly View Grid */
            <div className="grid grid-cols-6 gap-2 border border-(--border-subtle) rounded-xl p-3 bg-(--bg-input) overflow-x-auto min-w-[600px]">
              {/* Header column */}
              <div className="text-center font-mono text-[9px] text-(--text-faint) uppercase py-2">Time</div>
              {daysOfWeek.map(day => (
                <div key={day} className="text-center font-mono text-[10px] text-(--text-secondary) font-semibold py-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                  {day}
                </div>
              ))}

              {/* Grid rows */}
              {timeLabels.map((time) => (
                <React.Fragment key={time}>
                  <div className="flex items-center justify-center font-mono text-[9px] text-(--text-faint) py-4 border-r border-(--border-subtle)">
                    {time}
                  </div>
                  
                  {daysOfWeek.map(day => {
                    const dayEvents = getDayEvents(day);
                    const hour = parseInt(time.split(':')[0], 10);
                    const isPm = time.includes('PM');
                    const matchHour = hour + (isPm && hour !== 12 ? 12 : 0);

                    const matchedEvs = dayEvents.filter(ev => {
                      const evHourStr = ev.timeSlot.split(' ')[0].split(':')[0];
                      const evPm = ev.timeSlot.includes('PM');
                      const evHour = parseInt(evHourStr, 10) + (evPm && parseInt(evHourStr, 10) !== 12 ? 12 : 0);
                      return evHour >= matchHour && evHour < matchHour + 2;
                    });

                    return (
                      <div key={day} className="p-2 border border-(--border-subtle) rounded-lg min-h-[90px] relative bg-(--hover-overlay) hover:bg-(--hover-overlay) transition-colors flex flex-col gap-1">
                        {matchedEvs.map(ev => (
                          <div
                            key={ev.id}
                            className={`p-2 border-l-2 rounded text-[10px] space-y-1 select-none hover:shadow-lg transition-all ${ev.color}`}
                          >
                            <p className="font-mono font-bold leading-none">{ev.code}</p>
                            <p className="truncate font-sans font-medium text-(--text-primary) max-w-[85px]">{ev.name}</p>
                            <p className="text-[9px] text-(--text-muted) truncate">{ev.room}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : viewTab === 'day' ? (
            /* Day View Grid */
            <div className="space-y-4">
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center text-xs font-mono font-bold text-(--brand-gold)">
                Schedules for {selectedDay}
              </div>
              <div className="space-y-2">
                {getDayEvents(selectedDay).map(ev => (
                  <div key={ev.id} className={`p-4 border rounded-xl flex items-center justify-between ${ev.color}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center text-(--text-secondary)">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm">{ev.code} · {ev.name}</p>
                        <p className="text-xs text-(--text-secondary) flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-(--text-faint)" /> {ev.instructor} · 
                          <MapPin className="w-3.5 h-3.5 text-(--text-faint)" /> {ev.building} ({ev.room})
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold">{ev.timeSlot}</span>
                  </div>
                ))}
                {getDayEvents(selectedDay).length === 0 && (
                  <div className="text-center py-16 border border-dashed border-(--border-default) rounded-xl text-(--text-faint) text-xs font-mono">
                    No classes scheduled for {selectedDay}.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Month View Calendar */
            <div className="grid grid-cols-7 gap-2 p-3 border border-(--border-subtle) rounded-xl bg-(--bg-input)">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center font-mono text-[9px] text-(--text-faint) uppercase py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const dayNum = i + 1;
                const hasClass = dayNum % 3 === 0;
                const hasConflict = dayNum === 15;
                return (
                  <div key={i} className="h-14 border border-(--border-subtle) rounded-lg p-1.5 relative flex flex-col justify-between hover:bg-(--hover-overlay) transition-colors">
                    <span className="font-mono text-[10px] text-(--text-secondary)">{dayNum}</span>
                    <div className="flex justify-center gap-1">
                      {hasClass && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      {hasConflict && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conflict Warning Alerts sidepanel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 ds-card rounded-2xl">
            <div className="flex items-center gap-2 border-b border-(--border-subtle) pb-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-(--status-danger)" />
              <h3 className="font-serif text-base font-bold text-(--text-primary)">Conflicts Panel</h3>
            </div>

            <div className="space-y-4">
              {conflicts.map(conf => (
                <div 
                  key={conf.id} 
                  className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-(--status-danger) uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      {conf.type}
                    </span>
                    <Badge variant="rose" className="text-[8px] font-bold">
                      {conf.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-(--text-secondary) leading-relaxed font-sans">{conf.description}</p>
                  
                  <div className="space-y-2 border-t border-(--border-subtle) pt-3">
                    <p className="text-[10px] font-mono text-(--text-faint) uppercase">Auto Suggestions</p>
                    {conf.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleResolveConflict(conf.id, sug.action)}
                        className="w-full text-left p-2.5 bg-(--hover-overlay) hover:bg-(--accent-gold-subtle) border border-(--border-subtle) hover:border-(--accent-gold-border) rounded-lg text-[10px] text-(--text-secondary) hover:text-(--text-primary) flex items-center justify-between transition-all group"
                      >
                        <span className="truncate pr-2 font-sans font-medium">{sug.label}</span>
                        <RefreshCw className="w-3.5 h-3.5 text-(--brand-gold) group-hover:rotate-180 transition-transform duration-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {conflicts.length === 0 && (
                <div className="py-12 text-center text-xs text-(--text-muted) font-mono">
                  No active schedule conflicts detected.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
