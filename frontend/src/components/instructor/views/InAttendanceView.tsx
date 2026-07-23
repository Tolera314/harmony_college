'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarCheck, QrCode, RefreshCw, Clock, Users, CheckCircle2,
  XCircle, AlertCircle, FileDown, Pencil, ChevronDown,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { attendanceSessions } from '../../../data/instructorData';
import { courses, students } from '../../../data/departmentData';
import { AttendanceStatus, AttendanceRecord } from '../../../types/instructor';

// ── helpers ───────────────────────────────────────────────────────────────────
const statusCfg: Record<AttendanceStatus, { variant: 'emerald'|'amber'|'rose'|'glass'; icon: React.ReactNode; bg: string }> = {
  Present: { variant: 'emerald', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: 'bg-emerald-950/30 border-emerald-800/40' },
  Late:    { variant: 'amber',   icon: <Clock className="w-3.5 h-3.5" />,         bg: 'bg-amber-950/30 border-amber-800/40' },
  Absent:  { variant: 'rose',    icon: <XCircle className="w-3.5 h-3.5" />,       bg: 'bg-rose-950/30 border-rose-800/40' },
  Excused: { variant: 'glass',   icon: <AlertCircle className="w-3.5 h-3.5" />,   bg: 'bg-white/5 border-white/10' },
};

function QRPattern({ seed }: { seed: number }) {
  // Deterministic pseudo-random grid for visual QR-like display
  const size = 11;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const x = i % size; const y = Math.floor(i / size);
    // Finder patterns (corners)
    if ((x < 3 && y < 3) || (x >= size - 3 && y < 3) || (x < 3 && y >= size - 3)) return true;
    // Data modules — seeded pseudo-random
    return (((i * 2971 + seed * 1301) % 17) < 8);
  });
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 220, height: 220 }}>
      {cells.map((on, i) => (
        <div key={i} className={`rounded-[1px] ${on ? 'bg-[#0F0F10]' : 'bg-transparent'}`} />
      ))}
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────
export const InAttendanceView: React.FC = () => {
  const [view, setView] = useState<'qr' | 'manual' | 'history'>('qr');
  const [sessionActive, setSessionActive] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<'c01' | 'c02'>('c01');
  const [qrSeed, setQrSeed] = useState(Date.now());
  const [countdown, setCountdown] = useState(25);
  const [manualModal, setManualModal] = useState(false);

  // Pull the initial session
  const session = attendanceSessions.find(s => s.courseId === selectedCourse) ?? attendanceSessions[0];
  const course = courses.find(c => c.id === selectedCourse);

  // Live student list with editable statuses
  const allStudents = students.filter(s => s.enrolledCourseIds.includes(selectedCourse));
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    allStudents.forEach(s => {
      const rec = session?.records.find(r => r.studentId === s.id);
      init[s.id] = rec?.status ?? 'Absent';
    });
    return init;
  });
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // QR auto-rotate countdown
  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setQrSeed(Date.now()); return 25; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  const handleRefreshQr = () => { setQrSeed(Date.now()); setCountdown(25); };
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    allStudents.forEach(s => { updated[s.id] = status; });
    setStatuses(updated);
  };
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const presentCount = Object.values(statuses).filter(s => s === 'Present').length;
  const lateCount    = Object.values(statuses).filter(s => s === 'Late').length;
  const absentCount  = Object.values(statuses).filter(s => s === 'Absent').length;
  const excusedCount = Object.values(statuses).filter(s => s === 'Excused').length;
  const attendancePct = allStudents.length
    ? Math.round(((presentCount + lateCount) / allStudents.length) * 100)
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Attendance"
        subtitle={sessionActive ? 'QR session active' : 'No active session'}
        icon={<CalendarCheck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2 items-center">
            {/* Course picker */}
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value as 'c01' | 'c02')}
                className="appearance-none pl-3 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-[#E9C349]"
              >
                <option className="bg-[#1a1a1b]" value="c01">FILM402</option>
                <option className="bg-[#1a1a1b]" value="c02">FILM301</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
            </div>
            {!sessionActive
              ? <Button variant="primary" size="sm" icon={<QrCode className="w-4 h-4" />} onClick={() => setSessionActive(true)}>Start Session</Button>
              : <Button variant="danger" size="sm" onClick={() => setSessionActive(false)}>End Session</Button>
            }
          </div>
        }
      />

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {([['qr', 'QR Attendance'], ['manual', 'Manual Entry'], ['history', 'Session History']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${view === id ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── QR View ── */}
      {view === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR panel */}
          <Card hoverable={false} className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-white">
                  {sessionActive ? 'Live QR Code' : 'Session Ended'}
                </h3>
                <p className="font-sans text-xs text-white/50 mt-0.5">
                  {course?.code} · {course?.title} · {session?.date}
                </p>
              </div>
              {sessionActive
                ? <Badge variant="emerald" className="animate-pulse">● Live</Badge>
                : <Badge variant="rose">Ended</Badge>
              }
            </div>

            {/* QR Code display */}
            <div className="flex flex-col items-center gap-5">
              <div className={`relative p-4 bg-white rounded-2xl shadow-2xl transition-opacity ${sessionActive ? 'opacity-100' : 'opacity-40'}`}>
                <motion.div
                  key={qrSeed}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <QRPattern seed={qrSeed} />
                </motion.div>
                {/* Countdown ring overlay */}
                {sessionActive && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#141617] border border-white/15 px-3 py-1 rounded-full shadow-lg">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-[#E9C349]"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="font-mono text-[11px] text-[#E9C349] font-bold">Refreshes in {countdown}s</span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="font-mono text-[10px] text-white/30 tracking-wider">{session?.qrCode}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={handleRefreshQr} disabled={!sessionActive}>
                  Refresh QR
                </Button>
                <Button variant="secondary" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => setManualModal(true)}>
                  Manual Entry
                </Button>
                <Button variant="secondary" size="sm" icon={<FileDown className="w-4 h-4" />}>Export</Button>
              </div>
            </div>
          </Card>

          {/* Stats panel */}
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Present', value: presentCount, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-800/40' },
                { label: 'Late',    value: lateCount,    color: 'text-amber-400',   bg: 'bg-amber-950/30 border-amber-800/40' },
                { label: 'Absent',  value: absentCount,  color: 'text-rose-400',    bg: 'bg-rose-950/30 border-rose-800/40' },
                { label: 'Excused', value: excusedCount, color: 'text-white/60',    bg: 'bg-white/5 border-white/10' },
              ].map(item => (
                <div key={item.label} className={`p-3.5 border rounded-xl ${item.bg}`}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
                  <p className={`font-mono text-2xl font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Attendance rate */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Session Rate</p>
                <p className={`font-mono text-xl font-bold ${attendancePct >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>{attendancePct}%</p>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: attendancePct >= 80 ? '#34d399' : '#f87171' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${attendancePct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="font-sans text-[10px] text-white/30 mt-2">{allStudents.length} enrolled · {session?.startTime}–{session?.endTime}</p>
            </div>

            {/* Live check-in feed */}
            <Card hoverable={false} className="space-y-3 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">Check-in Feed</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {session?.records.map((rec, i) => {
                  const student = students.find(s => s.id === rec.studentId);
                  const cfg = statusCfg[rec.status];
                  return (
                    <motion.div key={rec.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={student?.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />
                        <p className="font-sans text-xs text-white/80 truncate">{student?.name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {rec.markedAt && <span className="font-mono text-[10px] text-white/30">{rec.markedAt}</span>}
                        <Badge variant={cfg.variant} className="text-[10px] py-0">{rec.status}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Manual Entry View ── */}
      {view === 'manual' && (
        <Card hoverable={false} className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Manual Attendance</h3>
              <p className="font-sans text-xs text-white/50 mt-0.5">{course?.code} · {allStudents.length} students</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => handleMarkAll('Present')}>Mark All Present</Button>
              <Button variant="secondary" size="sm" onClick={() => handleMarkAll('Absent')}>Reset All</Button>
              {saved && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-emerald-400 font-sans text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </motion.span>
              )}
              <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={handleSave}>Save & Submit</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans min-w-[600px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {['Student', 'ID', 'Status', 'Note'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-white/50 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allStudents.map(student => (
                  <tr key={student.id} className="hover:bg-white/4 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={student.avatar} alt={student.name} className="w-7 h-7 rounded-full border border-white/10 shrink-0" />
                        <span className="font-semibold text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/40">{student.studentId}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => setStatuses(prev => ({ ...prev, [student.id]: s }))}
                            className={`px-2 py-1 rounded-lg font-sans text-[10px] font-semibold border transition-all ${
                              statuses[student.id] === s
                                ? s === 'Present' ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                                  : s === 'Late'    ? 'bg-amber-950/50 border-amber-700 text-amber-300'
                                  : s === 'Absent'  ? 'bg-rose-950/50 border-rose-700 text-rose-300'
                                  : 'bg-white/10 border-white/20 text-white/70'
                                : 'bg-transparent border-white/10 text-white/30 hover:border-white/30 hover:text-white/60'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={remarks[student.id] ?? ''}
                        onChange={e => setRemarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                        placeholder="Optional note..."
                        className="w-full bg-transparent border-b border-white/10 focus:border-[#E9C349] outline-none font-sans text-xs text-white/60 py-0.5 transition-colors placeholder:text-white/20"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Session History ── */}
      {view === 'history' && (
        <div className="space-y-4">
          {attendanceSessions.map(s => {
            const c = courses.find(x => x.id === s.courseId);
            const pres = s.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
            const pct  = s.records.length ? Math.round((pres / s.records.length) * 100) : 0;
            return (
              <Card key={s.id} hoverable className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#E9C349]">{c?.code}</span>
                    <p className="font-sans text-sm font-semibold text-white mt-0.5">{s.date} · {s.startTime}–{s.endTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pct >= 80 ? 'emerald' : 'rose'}>{pct}%</Badge>
                    {s.isActive && <Badge variant="emerald" className="animate-pulse">Active</Badge>}
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-mono text-white/50">
                  <span className="text-emerald-400">{s.records.filter(r => r.status === 'Present').length} Present</span>
                  <span className="text-amber-400">{s.records.filter(r => r.status === 'Late').length} Late</span>
                  <span className="text-rose-400">{s.records.filter(r => r.status === 'Absent').length} Absent</span>
                  <span className="text-white/40">{s.records.filter(r => r.status === 'Excused').length} Excused</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manual Quick-Add Modal */}
      <Modal isOpen={manualModal} onClose={() => setManualModal(false)} title="Quick Mark — Manual Attendance" maxWidth="max-w-md">
        <div className="space-y-3 font-sans text-sm">
          <p className="text-white/60 text-xs">Select a student to quickly mark their attendance status.</p>
          {allStudents.map(student => (
            <div key={student.id} className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2">
                <img src={student.avatar} alt="" className="w-7 h-7 rounded-full border border-white/10" />
                <span className="font-sans text-xs font-semibold text-white">{student.name}</span>
              </div>
              <select
                value={statuses[student.id]}
                onChange={e => setStatuses(prev => ({ ...prev, [student.id]: e.target.value as AttendanceStatus }))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 font-sans text-xs text-white focus:outline-none focus:border-[#E9C349]"
              >
                {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map(s => (
                  <option key={s} className="bg-[#1a1a1b]" value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setManualModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => { handleSave(); setManualModal(false); }}>Save</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
