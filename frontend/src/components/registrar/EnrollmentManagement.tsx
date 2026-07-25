'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, X, Eye, ShieldAlert, 
  HelpCircle, MoreVertical, Plus, Trash2, 
  BookOpen, Clock, AlertTriangle, ArrowRight, UserCheck
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock student enrollment data
const initialStudents = [
  {
    id: 's01',
    studentId: 'HC-2024-0012',
    name: 'Selam Alemayehu',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    email: 'selam.a@harmony.edu',
    program: 'Computer Science (B.Sc.)',
    year: 3,
    credits: 14,
    standing: 'Excellent',
    status: 'Active',
    courses: [
      { code: 'CS201', name: 'Data Structures & Algorithms', credits: 4, status: 'Active' },
      { code: 'CS302', name: 'Database Management Systems', credits: 3, status: 'Active' },
      { code: 'MATH302', name: 'Calculus III', credits: 3, status: 'Active' },
      { code: 'CS101', name: 'Introduction to Computer Science', credits: 4, status: 'Completed' }
    ],
    overrides: [
      { time: 'Jul 20, 2026 02:22 PM', action: 'Force Add MATH302', reason: 'Prerequisite bypass approved by Department Head.', actor: 'Dr. Bekele Ayalew' }
    ]
  },
  {
    id: 's02',
    studentId: 'HC-2024-0015',
    name: 'Yonas Kebede',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    email: 'yonas.k@harmony.edu',
    program: 'Mechanical Engineering (B.Sc.)',
    year: 2,
    credits: 16,
    standing: 'Good',
    status: 'Active',
    courses: [
      { code: 'MATH101', name: 'Calculus I', credits: 4, status: 'Active' },
      { code: 'MECH201', name: 'Engineering Statics', credits: 3, status: 'Active' }
    ],
    overrides: []
  },
  {
    id: 's03',
    studentId: 'HC-2025-0912',
    name: 'Marta Hailu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    email: 'marta.h@harmony.edu',
    program: 'Business Administration (B.A.)',
    year: 1,
    credits: 12,
    standing: 'Good',
    status: 'Active',
    courses: [
      { code: 'BUS101', name: 'Principles of Management', credits: 3, status: 'Active' }
    ],
    overrides: []
  },
  {
    id: 's04',
    studentId: 'HC-2023-0182',
    name: 'Kidus Tilahun',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    email: 'kidus.t@harmony.edu',
    program: 'Computer Science (B.Sc.)',
    year: 4,
    credits: 8,
    standing: 'Warning',
    status: 'On Leave',
    courses: [],
    overrides: [
      { time: 'Jul 15, 2026 10:00 AM', action: 'Approved Academic Leave', reason: 'Medical leaves approved by Dean.', actor: 'Registrar Office' }
    ]
  }
];

const availableCoursesToForceAdd = [
  { code: 'CS440', name: 'Artificial Intelligence', credits: 4 },
  { code: 'CS101', name: 'Introduction to Computer Science', credits: 4 },
  { code: 'MATH101', name: 'Calculus I', credits: 4 },
  { code: 'MECH201', name: 'Engineering Statics', credits: 3 },
  { code: 'CS302', name: 'Database Management Systems', credits: 3 }
];

export const EnrollmentManagement: React.FC = () => {
  const [students, setStudents] = useState(initialStudents);
  const [selectedStudent, setSelectedStudent] = useState<typeof initialStudents[0] | null>(null);
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  
  // Override form states
  const [overrideAction, setOverrideAction] = useState<'add' | 'drop' | null>(null);
  const [targetCourseCode, setTargetCourseCode] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Filtering
  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(search.toLowerCase()) || 
                          st.studentId.toLowerCase().includes(search.toLowerCase());
    const matchesProgram = programFilter === 'All' || st.program.includes(programFilter);
    return matchesSearch && matchesProgram;
  });

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !overrideReason.trim()) return;

    if (overrideAction === 'add') {
      const courseToAdd = availableCoursesToForceAdd.find(c => c.code === targetCourseCode);
      if (!courseToAdd) return;

      // Check if already registered
      if (selectedStudent.courses.some(c => c.code === courseToAdd.code)) {
        alert('Student is already registered for this course.');
        return;
      }

      setStudents(prev => prev.map(st => {
        if (st.id === selectedStudent.id) {
          const updatedCourses = [...st.courses, { ...courseToAdd, status: 'Active' }];
          const updatedOverrides = [
            ...st.overrides,
            {
              time: new Date().toLocaleString(),
              action: `Force Add ${courseToAdd.code}`,
              reason: overrideReason,
              actor: 'Registrar Office'
            }
          ];
          const updated = {
            ...st,
            courses: updatedCourses,
            credits: st.credits + courseToAdd.credits,
            overrides: updatedOverrides
          };
          setSelectedStudent(updated);
          return updated;
        }
        return st;
      }));

    } else if (overrideAction === 'drop') {
      const courseToDrop = selectedStudent.courses.find(c => c.code === targetCourseCode);
      if (!courseToDrop) return;

      setStudents(prev => prev.map(st => {
        if (st.id === selectedStudent.id) {
          const updatedCourses = st.courses.filter(c => c.code !== targetCourseCode);
          const updatedOverrides = [
            ...st.overrides,
            {
              time: new Date().toLocaleString(),
              action: `Force Drop ${targetCourseCode}`,
              reason: overrideReason,
              actor: 'Registrar Office'
            }
          ];
          const updated = {
            ...st,
            courses: updatedCourses,
            credits: Math.max(0, st.credits - courseToDrop.credits),
            overrides: updatedOverrides
          };
          setSelectedStudent(updated);
          return updated;
        }
        return st;
      }));
    }

    // Reset override fields
    setOverrideAction(null);
    setTargetCourseCode('');
    setOverrideReason('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Enrollments & Overrides</h2>
        <p className="text-xs text-white/50">Audit class registration status and execute manual enrollment overrides.</p>
      </div>

      {/* Roster Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Student Name or Student ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white"
          />
        </div>

        <div>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white/70"
          >
            <option value="All">All Programs</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Engineering">Mechanical Engineering</option>
            <option value="Business">Business Administration</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-white/5 border-b border-white/10 text-white/50 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4">Student</th>
              <th className="px-5 py-4">Student ID</th>
              <th className="px-5 py-4">Program Curriculum</th>
              <th className="px-5 py-4">Registered Credits</th>
              <th className="px-5 py-4">Academic Standing</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {filteredStudents.map((st) => (
              <tr 
                key={st.id} 
                onClick={() => { setSelectedStudent(st); setOverrideAction(null); }}
                className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full border border-white/15 object-cover" />
                    <div>
                      <p className="font-semibold text-white group-hover:text-[#D4AF37] transition-colors">{st.name}</p>
                      <p className="text-[10px] text-white/40">{st.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-[11px] text-white/60">{st.studentId}</td>
                <td className="px-5 py-4 text-white/70">{st.program}</td>
                <td className="px-5 py-4 font-mono text-white/70">{st.credits} Cr (Yr {st.year})</td>
                <td className="px-5 py-4">
                  <Badge variant={st.standing === 'Excellent' ? 'emerald' : st.standing === 'Good' ? 'glass' : 'rose'}>
                    {st.standing}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={st.status === 'Active' ? 'emerald' : 'amber'}>
                    {st.status}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => { setSelectedStudent(st); setOverrideAction(null); }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 text-[10px] font-semibold transition-all"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sliding Overrides Drawer */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="fixed inset-0 bg-black z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[650px] bg-[#0F0F10] border-l border-white/10 z-50 overflow-y-auto flex flex-col shadow-2xl font-sans"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0F0F10] sticky top-0 z-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Enrollment Registry Drawer</span>
                  <h3 className="text-lg font-serif font-bold text-white">{selectedStudent.name} ({selectedStudent.studentId})</h3>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 space-y-6">
                
                {/* Course List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Registered Semesters Courses</h4>
                  <div className="space-y-2">
                    {selectedStudent.courses.map((c) => (
                      <div key={c.code} className="p-3 bg-white/5 border border-white/8 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                          <div>
                            <p className="text-xs font-semibold text-white">{c.code} · {c.name}</p>
                            <p className="text-[10px] text-white/40 font-mono">{c.credits} Credits</p>
                          </div>
                        </div>
                        <Badge variant={c.status === 'Completed' ? 'glass' : 'emerald'}>
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                    {selectedStudent.courses.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
                        No courses registered for this term.
                      </div>
                    )}
                  </div>
                </div>

                {/* Overrides Selection Panel */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Manual Registration Overrides</h4>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setOverrideAction('add'); setTargetCourseCode(availableCoursesToForceAdd[0].code); }}
                      className={`flex-1 p-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        overrideAction === 'add'
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> Force Add Course
                    </button>
                    <button
                      onClick={() => { 
                        setOverrideAction('drop'); 
                        setTargetCourseCode(selectedStudent.courses[0]?.code || ''); 
                      }}
                      disabled={selectedStudent.courses.length === 0}
                      className={`flex-1 p-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        overrideAction === 'drop'
                          ? 'bg-rose-500/10 border-rose-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" /> Force Drop Course
                    </button>
                  </div>

                  {/* Override Form Panel */}
                  <AnimatePresence>
                    {overrideAction && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleOverrideSubmit}
                        className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-4 overflow-hidden"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-white/80">
                            {overrideAction === 'add' ? 'Select Course to Force Add' : 'Select Course to Force Drop'}
                          </label>
                          <select
                            value={targetCourseCode}
                            onChange={(e) => setTargetCourseCode(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0F0F10] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                          >
                            {overrideAction === 'add' ? (
                              availableCoursesToForceAdd.map(c => (
                                <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.credits} Cr)</option>
                              ))
                            ) : (
                              selectedStudent.courses.map(c => (
                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* Mandatory Reason */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-white/80 flex items-center gap-1">
                            Override Reason <span className="text-red-400 font-mono text-[10px]">*Mandatory</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter administrative justification..."
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#0F0F10] border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="secondary" size="sm" type="button" onClick={() => setOverrideAction(null)}>
                            Cancel
                          </Button>
                          <Button 
                            variant={overrideAction === 'add' ? 'gold' : 'rose'} 
                            size="sm" 
                            type="submit"
                            className={overrideAction === 'drop' ? 'bg-rose-500 text-white font-semibold' : 'font-semibold'}
                          >
                            Execute Override
                          </Button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {/* Audit Trail Timeline */}
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-[#D4AF37]" /> Override Audit Trail & Authorization Log
                  </h4>
                  <div className="space-y-4 pl-3 border-l border-white/10">
                    {selectedStudent.overrides.map((ov, idx) => (
                      <div key={idx} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-[#0F0F10]" />
                        <div className="space-y-0.5">
                          <p className="text-white/40 font-mono text-[9px]">{ov.time} · Authorizer: {ov.actor}</p>
                          <p className="text-white/90 font-bold">{ov.action}</p>
                          <p className="text-white/60 italic">&quot;{ov.reason}&quot;</p>
                        </div>
                      </div>
                    ))}
                    {selectedStudent.overrides.length === 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 block text-center w-full">
                        Zero Manual Overrides Logged (Clean Registry Record)
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
