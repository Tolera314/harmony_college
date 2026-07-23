'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, Plus, Tag, 
  MapPin, AlertTriangle, Bookmark, Trash2, ArrowRight
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const initialEvents = [
  { id: 'ev1', title: 'Fall Course Registration Opens', date: '2026-08-01', time: '08:30 AM', category: 'Registration', desc: 'Fall semester course selection portal goes live for all undergraduate students.' },
  { id: 'ev2', title: 'Add/Drop Course Deadline', date: '2026-08-12', time: '11:59 PM', category: 'Deadline', desc: 'Final date to add or drop courses without academic penalties.' },
  { id: 'ev3', title: 'Midterm Examination Week', date: '2026-10-12', time: '09:00 AM', category: 'Examination', desc: 'Midterm evaluations scheduled across all blocks.' },
  { id: 'ev4', title: 'Ethiopian National Holiday (Meskel)', date: '2026-09-27', time: 'All Day', category: 'Holiday', desc: 'University closed. Public religious observation.' },
  { id: 'ev5', title: 'Fall Graduation Ceremony', date: '2026-11-28', time: '10:00 AM', category: 'Graduation', desc: 'Candidacy graduation ceremony at Main Campus Hall.' }
];

export const AcademicCalendarView: React.FC = () => {
  const [events, setEvents] = useState(initialEvents);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '09:00 AM',
    category: 'Registration',
    desc: ''
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;

    setEvents(prev => [
      ...prev,
      {
        id: 'ev' + (prev.length + 1),
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time,
        category: newEvent.category,
        desc: newEvent.desc || 'No description provided.'
      }
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    setNewEvent({ title: '', date: '', time: '09:00 AM', category: 'Registration', desc: '' });
    alert('Academic Calendar event registered successfully.');
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Are you sure you want to remove this event from the academic schedule?')) {
      setEvents(prev => prev.filter(ev => ev.id !== id));
    }
  };

  const getBadgeVariant = (cat: string) => {
    switch (cat) {
      case 'Registration': return 'emerald';
      case 'Deadline': return 'rose';
      case 'Examination': return 'gold';
      case 'Holiday': return 'glass';
      case 'Graduation': return 'emerald';
      default: return 'glass';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Academic Calendar & Events</h2>
        <p className="text-xs text-white/50">Configure university terms, national holidays, exam schedules, and graduation dates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Calendar Events Listing (7 cols) */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-serif text-lg font-bold text-white">Scheduled Calendar Milestones</h3>
            <Badge variant="gold" className="font-mono text-[10px]">
              Fall Semester 2026
            </Badge>
          </div>

          <div className="space-y-4">
            {events.map(ev => (
              <div 
                key={ev.id} 
                className="p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/12 transition-all flex items-start gap-4 justify-between"
              >
                <div className="flex items-start gap-4">
                  {/* Date square */}
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] font-mono text-white/40 uppercase">
                      {new Date(ev.date).toLocaleString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-mono font-bold text-[#D4AF37] leading-none mt-0.5">
                      {new Date(ev.date).getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-white font-sans">{ev.title}</h4>
                      <Badge variant={getBadgeVariant(ev.category) as any} className="text-[9px]">
                        {ev.category}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed font-sans">{ev.desc}</p>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#D4AF37]/80 pt-1">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]/50" /> {ev.time}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-colors"
                  title="Delete Event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Create Event Form (5 cols) */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h3 className="font-serif text-base font-bold text-white">Publish Schedule Milestone</h3>
          
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Late Registration Window Closes"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80">Date</label>
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80">Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11:59 PM"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Event Category</label>
              <select
                value={newEvent.category}
                onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none"
              >
                <option value="Registration">Registration Window</option>
                <option value="Deadline">Deadline Limit</option>
                <option value="Examination">Examination Block</option>
                <option value="Holiday">National Holiday</option>
                <option value="Graduation">Graduation Milestone</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Event Details Description</label>
              <textarea
                rows={3}
                placeholder="Enter details visible to students and faculty..."
                value={newEvent.desc}
                onChange={(e) => setNewEvent(prev => ({ ...prev, desc: e.target.value }))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] resize-none"
              />
            </div>

            <Button 
              variant="gold" 
              size="sm" 
              type="submit"
              className="w-full py-2.5 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Register Milestone Event
            </Button>
          </form>
        </div>

      </div>
    </motion.div>
  );
};
