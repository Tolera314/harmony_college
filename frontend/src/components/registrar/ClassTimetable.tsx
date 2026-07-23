'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, AlertTriangle, 
  MapPin, User, Sparkles, RefreshCw, Check, Info, X
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Initial Schedule and conflicts
const initialScheduleEvents = [
  { id: 'ev1', code: 'CS101', name: 'Intro to CS', instructor: 'Dr. Bekele Ayalew', building: 'Block A', room: '101', day: 'Monday', timeSlot: '09:00 AM - 10:30 AM', color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  { id: 'ev2', code: 'CS201', name: 'Data Structures', instructor: 'Dr. Bekele Ayalew', building: 'Block C', room: '204', day: 'Tuesday', timeSlot: '10:00 AM - 11:30 AM', color: 'border-amber-500 bg-amber-500/10 text-amber-400' },
  { id: 'ev3', code: 'CS440', name: 'Artificial Intelligence', instructor: 'Dr. Elias Lemma', building: 'Block B', room: '302', day: 'Wednesday', timeSlot: '02:00 PM - 03:30 PM', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
  { id: 'ev4', code: 'MATH101', name: 'Calculus I', instructor: 'Prof. Martha Wondimu', building: 'Block A', room: '104', day: 'Monday', timeSlot: '11:00 AM - 12:30 PM', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
  { id: 'ev5', code: 'MATH302', name: 'Calculus III', instructor: 'Prof. Martha Wondimu', building: 'Block C', room: '204', day: 'Tuesday', timeSlot: '10:00 AM - 11:30 AM', color: 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' }, // Clashes with ev2 room and instructor
  { id: 'ev6', code: 'MECH201', name: 'Engineering Statics', instructor: 'Dr. Abel Tesfaye', building: 'Block B', room: '201', day: 'Friday', timeSlot: '04:00 PM - 05:30 PM', color: 'border-rose-500 bg-rose-500/10 text-rose-400' }
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
    // Update schedule event
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

    // Remove solved conflict from conflict list
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
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Class Timetable</h2>
          <p className="text-xs text-white/50">Manage university weekly schedules, verify reservations, and resolve booking overlaps.</p>
        </div>

        {/* View Calendar Tabs */}
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-xl self-start md:self-center">
          {(['week', 'day', 'month'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                viewTab === tab 
                  ? 'bg-[#D4AF37] text-[#0F0F10] shadow' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab} View
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Weekly schedule Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Academic Weekly Grid</h3>
            {viewTab === 'day' && (
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none"
              >
                {daysOfWeek.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {viewTab === 'week' ? (
            /* Weekly View Grid */
            <div className="grid grid-cols-6 gap-2 border border-white/8 rounded-xl p-3 bg-black/30 overflow-x-auto min-w-[600px]">
              {/* Header column */}
              <div className="text-center font-mono text-[9px] text-white/40 uppercase py-2">Time</div>
              {daysOfWeek.map(day => (
                <div key={day} className="text-center font-mono text-[10px] text-white/60 font-semibold py-2 bg-white/5 rounded-lg border border-white/5">
                  {day}
                </div>
              ))}

              {/* Grid rows */}
              {timeLabels.map((time, rowIdx) => (
                <React.Fragment key={time}>
                  <div className="flex items-center justify-center font-mono text-[9px] text-white/35 py-4 border-r border-white/5">
                    {time}
                  </div>
                  
                  {daysOfWeek.map(day => {
                    const dayEvents = getDayEvents(day);
                    // Match event based on time hour
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
                      <div key={day} className="p-2 border border-white/5 rounded-lg min-h-[90px] relative bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex flex-col gap-1">
                        {matchedEvs.map(ev => (
                          <div
                            key={ev.id}
                            className={`p-2 border-l-2 rounded text-[10px] space-y-1 select-none hover:shadow-lg transition-all ${ev.color}`}
                          >
                            <p className="font-mono font-bold leading-none">{ev.code}</p>
                            <p className="truncate font-sans font-medium text-white max-w-[85px]">{ev.name}</p>
                            <p className="text-[9px] text-white/55 truncate">{ev.room}</p>
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
              <div className="p-3 bg-white/5 rounded-xl border border-white/8 text-center text-xs font-mono font-bold text-[#D4AF37]">
                Schedules for {selectedDay}
              </div>
              <div className="space-y-2">
                {getDayEvents(selectedDay).map(ev => (
                  <div key={ev.id} className={`p-4 border rounded-xl flex items-center justify-between ${ev.color}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm">{ev.code} · {ev.name}</p>
                        <p className="text-xs text-white/60 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-white/40" /> {ev.instructor} · 
                          <MapPin className="w-3.5 h-3.5 text-white/40" /> {ev.building} ({ev.room})
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold">{ev.timeSlot}</span>
                  </div>
                ))}
                {getDayEvents(selectedDay).length === 0 && (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-white/35 text-xs font-mono">
                    No classes scheduled for {selectedDay}.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Month View Calendar */
            <div className="grid grid-cols-7 gap-2 p-3 border border-white/8 rounded-xl bg-black/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center font-mono text-[9px] text-white/40 uppercase py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const dayNum = i + 1;
                // Add some dots for scheduling visual
                const hasClass = dayNum % 3 === 0;
                const hasConflict = dayNum === 15;
                return (
                  <div key={i} className="h-14 border border-white/5 rounded-lg p-1.5 relative flex flex-col justify-between hover:bg-white/5 transition-colors">
                    <span className="font-mono text-[10px] text-white/60">{dayNum}</span>
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
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-serif text-base font-bold text-white">Conflicts Panel</h3>
            </div>

            <div className="space-y-4">
              {conflicts.map(conf => (
                <div 
                  key={conf.id} 
                  className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-red-400 uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      {conf.type}
                    </span>
                    <Badge variant="rose" className="text-[8px] font-bold">
                      {conf.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-white/70 leading-relaxed font-sans">{conf.description}</p>
                  
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <p className="text-[10px] font-mono text-white/40 uppercase">Auto Suggestions</p>
                    {conf.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleResolveConflict(conf.id, sug.action)}
                        className="w-full text-left p-2.5 bg-white/5 hover:bg-[#D4AF37]/15 border border-white/8 hover:border-[#D4AF37]/40 rounded-lg text-[10px] text-white/80 hover:text-white flex items-center justify-between transition-all group"
                      >
                        <span className="truncate pr-2 font-sans font-medium">{sug.label}</span>
                        <RefreshCw className="w-3 h-3 text-[#D4AF37] group-hover:rotate-180 transition-transform duration-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {conflicts.length === 0 && (
                <div className="p-6 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                  <Check className="w-6 h-6 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-full" />
                  <div>
                    <h4 className="text-xs font-bold text-white font-sans">No Conflicts Detected</h4>
                    <p className="text-[10px] text-white/45 mt-0.5">Schedules are running cleanly with zero overlaps.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2.5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Timetable Auditing Rules</h4>
            <div className="space-y-2 text-[10px] text-white/60">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Double Room reservation prevents schedule locking.</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Lecturers cannot exceed 18 lecture hours/week.</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Seat counts must fit classroom capacity.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
