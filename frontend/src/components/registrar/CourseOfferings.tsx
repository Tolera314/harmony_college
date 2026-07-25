'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KanbanSquare, Table as TableIcon, Users, MapPin, 
  Clock, Plus, CheckCircle2, ChevronRight, 
  HelpCircle, MoreVertical, ShieldAlert, Sparkles, X, Check
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock initial course offerings
const initialOfferings = [
  { id: 'o01', code: 'CS101', name: 'Intro to CS', instructor: 'Dr. Bekele Ayalew', building: 'Block A', room: '101', capacity: 60, enrolled: 54, time: 'Mon/Wed 09:00 AM - 10:30 AM', status: 'Scheduled', year: '2026-2027', sem: 'Semester I' },
  { id: 'o02', code: 'CS201', name: 'Data Structures', instructor: 'Dr. Bekele Ayalew', building: 'Block C', room: '204', capacity: 45, enrolled: 45, time: 'Tue/Thu 10:00 AM - 11:30 AM', status: 'Scheduled', year: '2026-2027', sem: 'Semester I' },
  { id: 'o03', code: 'CS302', name: 'Database Systems', instructor: 'TBD', building: 'TBD', room: 'TBD', capacity: 40, enrolled: 0, time: 'TBD', status: 'Draft', year: '2026-2027', sem: 'Semester I' },
  { id: 'o04', code: 'CS440', name: 'Artificial Intelligence', instructor: 'Dr. Elias Lemma', building: 'Block B', room: '302', capacity: 30, enrolled: 12, time: 'Wed/Fri 02:00 PM - 03:30 PM', status: 'Scheduled', year: '2026-2027', sem: 'Semester I' },
  { id: 'o05', code: 'MATH101', name: 'Calculus I', instructor: 'Prof. Martha Wondimu', building: 'Block A', room: '104', capacity: 50, enrolled: 48, time: 'Mon/Wed 11:00 AM - 12:30 PM', status: 'Instructor Assigned', year: '2026-2027', sem: 'Semester I' },
  { id: 'o06', code: 'MATH302', name: 'Calculus III', instructor: 'Prof. Martha Wondimu', building: 'Block C', room: '204', capacity: 40, enrolled: 32, time: 'Tue/Thu 10:00 AM - 11:30 AM', status: 'Scheduled', year: '2026-2027', sem: 'Semester I' },
  { id: 'o07', code: 'MECH201', name: 'Engineering Statics', instructor: 'Dr. Abel Tesfaye', building: 'Block B', room: '201', capacity: 35, enrolled: 35, time: 'Mon/Fri 04:00 PM - 05:30 PM', status: 'Closed', year: '2026-2027', sem: 'Semester I' }
];

const mockInstructors = ['Dr. Bekele Ayalew', 'Dr. Elias Lemma', 'Prof. Martha Wondimu', 'Dr. Abel Tesfaye', 'Ato Kebede Belay'];
const mockRooms = [
  { building: 'Block A', room: '101', cap: 60 },
  { building: 'Block A', room: '104', cap: 50 },
  { building: 'Block B', room: '201', cap: 35 },
  { building: 'Block B', room: '302', cap: 30 },
  { building: 'Block C', room: '204', cap: 45 }
];

export const CourseOfferings: React.FC = () => {
  const [offerings, setOfferings] = useState(initialOfferings);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [editingOffering, setEditingOffering] = useState<typeof initialOfferings[0] | null>(null);

  // Edit fields state
  const [editFields, setEditFields] = useState({
    instructor: '',
    building: '',
    room: '',
    capacity: 40,
    time: ''
  });

  const columns = ['Draft', 'Instructor Assigned', 'Scheduled', 'Closed'];

  // Change Offering status (simulating dragging)
  const handleMoveStatus = (id: string, nextStatus: string) => {
    setOfferings(prev => prev.map(off => {
      if (off.id === id) {
        return { ...off, status: nextStatus };
      }
      return off;
    }));
  };

  const handleEditClick = (off: typeof initialOfferings[0]) => {
    setEditingOffering(off);
    setEditFields({
      instructor: off.instructor,
      building: off.building,
      room: off.room,
      capacity: off.capacity,
      time: off.time
    });
  };

  const handleSaveOffering = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffering) return;

    setOfferings(prev => prev.map(off => {
      if (off.id === editingOffering.id) {
        // Automatically determine status based on assignments
        let newStatus = off.status;
        if (editFields.instructor !== 'TBD' && editFields.building === 'TBD') {
          newStatus = 'Instructor Assigned';
        } else if (editFields.instructor !== 'TBD' && editFields.building !== 'TBD' && editFields.time !== 'TBD') {
          newStatus = 'Scheduled';
        } else if (editFields.instructor === 'TBD') {
          newStatus = 'Draft';
        }

        return {
          ...off,
          instructor: editFields.instructor,
          building: editFields.building,
          room: editFields.room,
          capacity: Number(editFields.capacity),
          time: editFields.time,
          status: newStatus
        };
      }
      return off;
    }));

    setEditingOffering(null);
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
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Course Offerings</h2>
          <p className="text-xs text-white/50">Schedule courses, assign academic staff, and audit room seating capacities.</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-xl self-start md:self-center">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'kanban' 
                ? 'bg-[#D4AF37] text-[#0F0F10] shadow' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5" /> Kanban Board
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' 
                ? 'bg-[#D4AF37] text-[#0F0F10] shadow' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" /> Data Table
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map(col => {
            const list = offerings.filter(o => o.status === col);
            return (
              <div key={col} className="bg-white/5 border border-white/8 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-mono font-bold text-white/70">{col}</span>
                  <Badge variant="glass" className="font-mono text-[10px] text-white/40">
                    {list.length} Sections
                  </Badge>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {list.map(off => {
                    const utilization = Math.round((off.enrolled / off.capacity) * 100);
                    return (
                      <div
                        key={off.id}
                        onClick={() => handleEditClick(off)}
                        className="p-4 bg-black/40 border border-white/10 rounded-xl hover:border-[#D4AF37]/50 hover:bg-black/60 transition-all cursor-pointer space-y-3 group"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-bold text-[#D4AF37] text-xs">{off.code}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {col !== 'Closed' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus = col === 'Draft' ? 'Instructor Assigned' : col === 'Instructor Assigned' ? 'Scheduled' : 'Closed';
                                  handleMoveStatus(off.id, nextStatus);
                                }}
                                className="text-[10px] text-emerald-400 hover:underline flex items-center font-mono"
                                title="Promote Stage"
                              >
                                Next <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-white truncate">{off.name}</p>
                          <p className="text-[10px] text-white/40 font-mono truncate">{off.instructor}</p>
                        </div>

                        {/* Schedule Meta */}
                        <div className="space-y-1.5 border-t border-white/5 pt-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                            <MapPin className="w-3 h-3 text-white/30 shrink-0" />
                            <span className="truncate">{off.building === 'TBD' ? 'No Room Allocated' : `${off.building} · Rm ${off.room}`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                            <Clock className="w-3 h-3 text-white/30 shrink-0" />
                            <span className="truncate">{off.time === 'TBD' ? 'Unscheduled Time' : off.time}</span>
                          </div>
                        </div>

                        {/* Seating Utilization */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-white/40">
                            <span>Capacity</span>
                            <span>{off.enrolled} / {off.capacity} Seats ({utilization}%)</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${utilization >= 100 ? 'bg-red-500' : utilization > 80 ? 'bg-[#D4AF37]' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, utilization)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-xl text-white/20 text-[10px] font-mono">
                      No courses in stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Section Code</th>
                <th className="px-5 py-4">Course Name</th>
                <th className="px-5 py-4">Instructor</th>
                <th className="px-5 py-4">Classroom</th>
                <th className="px-5 py-4">Timetable Schedule</th>
                <th className="px-5 py-4">Seat Capacity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {offerings.map(off => {
                const utilization = Math.round((off.enrolled / off.capacity) * 100);
                return (
                  <tr key={off.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-white tracking-wider">{off.code}</td>
                    <td className="px-5 py-4 text-white/90 font-medium">{off.name}</td>
                    <td className="px-5 py-4 text-white/70">{off.instructor}</td>
                    <td className="px-5 py-4 font-mono text-white/60">
                      {off.building === 'TBD' ? (
                        <span className="text-red-400">Unallocated</span>
                      ) : (
                        `${off.building} · Rm ${off.room}`
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/60 truncate max-w-[200px]" title={off.time}>{off.time}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5 w-32">
                        <div className="flex justify-between text-[9px] font-mono text-white/40">
                          <span>{off.enrolled}/{off.capacity} seats</span>
                          <span>{utilization}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${utilization >= 100 ? 'bg-red-500' : utilization > 80 ? 'bg-[#D4AF37]' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={off.status === 'Scheduled' ? 'emerald' : off.status === 'Closed' ? 'rose' : 'amber'}>
                        {off.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleEditClick(off)}
                        className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-semibold hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Configuration modal */}
      <AnimatePresence>
        {editingOffering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingOffering(null)}
              className="absolute inset-0 bg-black"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0F0F10] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 font-sans"
            >
              <button 
                onClick={() => setEditingOffering(null)}
                className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-serif font-bold text-white mb-2">Configure Course Section</h3>
              <p className="text-xs text-white/40 mb-4">Update scheduler details for section {editingOffering.code}.</p>

              <form onSubmit={handleSaveOffering} className="space-y-4">
                
                {/* Instructor assignment */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/80">Assign Lecturer / Instructor</label>
                  <select
                    value={editFields.instructor}
                    onChange={(e) => setEditFields(prev => ({ ...prev, instructor: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="TBD">TBD (To Be Decided)</option>
                    {mockInstructors.map(ins => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>

                {/* Building / Classroom */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Building</label>
                    <select
                      value={editFields.building}
                      onChange={(e) => setEditFields(prev => ({ ...prev, building: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="TBD">TBD</option>
                      <option value="Block A">Block A</option>
                      <option value="Block B">Block B</option>
                      <option value="Block C">Block C</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Room Number</label>
                    <select
                      value={editFields.room}
                      onChange={(e) => setEditFields(prev => ({ ...prev, room: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="TBD">TBD</option>
                      <option value="101">101 (60 cap)</option>
                      <option value="104">104 (50 cap)</option>
                      <option value="201">201 (35 cap)</option>
                      <option value="204">204 (45 cap)</option>
                      <option value="302">302 (30 cap)</option>
                    </select>
                  </div>
                </div>

                {/* Seating capacity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Seating Capacity</label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={editFields.capacity}
                      onChange={(e) => setEditFields(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Meeting Time Slot</label>
                    <input
                      type="text"
                      placeholder="e.g. Mon/Wed 09:00 AM - 10:30 AM"
                      value={editFields.time}
                      onChange={(e) => setEditFields(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setEditingOffering(null)}>
                    Cancel
                  </Button>
                  <Button variant="gold" size="sm" type="submit">
                    Save Changes
                  </Button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
