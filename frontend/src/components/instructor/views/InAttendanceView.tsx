'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CalendarCheck, QrCode, RefreshCw, Clock, Users, CheckCircle2,
  XCircle, AlertCircle, FileDown, ChevronDown, Lock,
  PlayCircle, StopCircle, Copy, Check,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card }         from '../../ui/Card';
import { Badge }        from '../../ui/Badge';
import { Button }       from '../../ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import { AttendanceStatus } from '../../../types/instructor';
import { useSocket } from '@/src/context/SocketContext';
import { toEthiopianTimeRange, dateToEthiopianTime } from '@/src/lib/utils';

// ── Typed API helper ──────────────────────────────────────────────────────────
const API = '/api/attendance';
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Response shapes ───────────────────────────────────────────────────────────
interface TodayClassSession {
  id:          string;           // ClassSession.id
  date:        string;
  startTime:   string;
  endTime:     string;
  courseOffering: {
    id:      string;
    course:  { code: string; name: string };
    _count:  { enrollments: number };
  };
  room: { name: string; building: string } | null;
  attendanceSession: {
    id:        string;           // AttendanceSession.id ← used for open/close/roster
    lifecycle: string;           // NOT_STARTED | OPEN | CLOSED | FINALIZED
    openedAt:  string | null;
    closedAt:  string | null;
    _count:    { records: number };
  } | null;
}

interface RosterStudent {
  studentRecordId: string;
  studentId:       string;
  fullName:        string;
  status:          string;   // PRESENT | ABSENT | LATE | EXCUSED
  method:          string;
  markedAt:        string | null;
  recordId:        string | null;
}

interface RosterResponse {
  session: {
    id:        string;
    lifecycle: string;
    openedAt:  string | null;
    closedAt:  string | null;
    classDate: string;
    startTime: string;
    endTime:   string;
  };
  students: RosterStudent[];
}

// ── Status display map ────────────────────────────────────────────────────────
const STATUS_CFG: Record<AttendanceStatus, { label: string; bg: string; border: string; text: string; icon: React.ReactNode }> = {
  Present: { label: 'Present', bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success)', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Late:    { label: 'Late',    bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning)', icon: <Clock className="w-3.5 h-3.5" />         },
  Absent:  { label: 'Absent',  bg: 'var(--status-danger-bg)',  border: 'var(--status-danger-border)',  text: 'var(--status-danger)',  icon: <XCircle className="w-3.5 h-3.5" />        },
  Excused: { label: 'Excused', bg: 'var(--hover-overlay)',     border: 'var(--border-default)',         text: 'var(--text-secondary)', icon: <AlertCircle className="w-3.5 h-3.5" />   },
};

// DB → frontend
const toFront  = (s: string): AttendanceStatus => ({ PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent', EXCUSED: 'Excused' }[s] ?? 'Absent') as AttendanceStatus;
const toBack   = (s: AttendanceStatus): string  => s.toUpperCase();

// ── Fake QR visual (decorative — real token shown as text) ────────────────────
function QRPattern({ seed }: { seed: number }) {
  const size = 11;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const x = i % size; const y = Math.floor(i / size);
    if ((x < 3 && y < 3) || (x >= size - 3 && y < 3) || (x < 3 && y >= size - 3)) return true;
    return (((i * 2971 + seed * 1301) % 17) < 8);
  });
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 220, height: 220 }}>
      {cells.map((on, i) => (
        <div key={i} className="rounded-[1px]" style={{ backgroundColor: on ? 'var(--bg-base)' : 'transparent' }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export const InAttendanceView: React.FC = () => {
  const { onAttendanceRecord, onAttendanceClosed, joinAttendanceRoom, leaveAttendanceRoom } = useSocket();

  const [view,             setView]            = useState<'qr' | 'manual' | 'history'>('qr');
  const [classSessions,    setClassSessions]   = useState<TodayClassSession[]>([]);
  const [selectedIdx,      setSelectedIdx]     = useState(0);        // index into classSessions
  const [sessionsLoading,  setSessionsLoading] = useState(true);
  const [sessionsError,    setSessionsError]   = useState<string | null>(null);

  // Attendance session state
  const [attSession,       setAttSession]      = useState<RosterResponse['session'] | null>(null);
  const [roster,           setRoster]          = useState<RosterStudent[]>([]);
  const [rosterLoading,    setRosterLoading]   = useState(false);

  // QR state
  const [qrToken,          setQrToken]         = useState<string | null>(null);
  const [qrSeed,           setQrSeed]          = useState(Date.now());
  const [countdown,        setCountdown]       = useState(30);
  const [tokenLoading,     setTokenLoading]    = useState(false);
  const [copied,           setCopied]          = useState(false);

  // Manual entry
  const [statuses,         setStatuses]        = useState<Record<string, AttendanceStatus>>({});
  const [notes,            setNotes]           = useState<Record<string, string>>({});
  const [saving,           setSaving]          = useState(false);
  const [saved,            setSaved]           = useState(false);

  // History
  const [history,          setHistory]         = useState<any[]>([]);
  const [historyLoading,   setHistoryLoading]  = useState(false);

  // Lifecycle button states
  const [opening,          setOpening]         = useState(false);
  const [closing,          setClosing]         = useState(false);
  const [finalizing,       setFinalizing]      = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedClassSession = classSessions[selectedIdx] ?? null;
  // The AttendanceSession.id (used for mark/qr endpoints)
  const attSessionId  = selectedClassSession?.attendanceSession?.id ?? attSession?.id ?? null;
  const attLifecycle  = attSession?.lifecycle ?? selectedClassSession?.attendanceSession?.lifecycle ?? 'NOT_STARTED';
  const sessionOpen   = attLifecycle === 'OPEN';
  const sessionClosed = attLifecycle === 'CLOSED';
  const sessionFinal  = attLifecycle === 'FINALIZED';

  // ── 1. Load today's class sessions ───────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true); setSessionsError(null);
    try {
      const data = await apiFetch<TodayClassSession[]>(`${API}/sessions/today`);
      setClassSessions(data);
      setSelectedIdx(0);
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, []);

  // ── 2. Load roster whenever we have an AttendanceSession ─────────────────
  const loadRoster = useCallback(async (sessionId: string) => {
    setRosterLoading(true);
    try {
      const data = await apiFetch<RosterResponse>(`${API}/sessions/${sessionId}/roster`);
      setAttSession(data.session);
      setRoster(data.students);

      const s: Record<string, AttendanceStatus> = {};
      const n: Record<string, string> = {};
      for (const r of data.students) {
        s[r.studentRecordId] = toFront(r.status);
        n[r.studentRecordId] = '';
      }
      setStatuses(s); setNotes(n);
    } catch { /* keep empty */ }
    finally { setRosterLoading(false); }
  }, []);

  useEffect(() => {
    if (attSessionId) { loadRoster(attSessionId); }
    else              { setRoster([]); setAttSession(null); setStatuses({}); }
  }, [attSessionId, loadRoster]);

  // ── 3. History for the selected offering ─────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!selectedClassSession) return;
    setHistoryLoading(true);
    try {
      const data = await apiFetch<any>(`${API}/sessions/offering/${selectedClassSession.courseOffering.id}`);
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, [selectedClassSession]);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view, loadHistory]);

  // ── 4. QR countdown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionOpen || !qrToken) { clearInterval(timerRef.current!); return; }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (attSessionId) generateQrToken(attSessionId);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [sessionOpen, qrToken, attSessionId]);

  // ── 5. Realtime: student QR check-in ────────────────────────────────────
  useEffect(() => {
    const unsub = onAttendanceRecord(ev => {
      if (ev.sessionId !== attSessionId) return;
      setRoster(prev => prev.map(r =>
        r.studentRecordId === ev.studentRecordId
          ? { ...r, status: ev.status, markedAt: ev.markedAt, method: ev.method }
          : r,
      ));
      setStatuses(prev => ({ ...prev, [ev.studentRecordId]: toFront(ev.status) }));
    });
    return unsub;
  }, [attSessionId, onAttendanceRecord]);

  // ── 6. Realtime: session closed/finalized ────────────────────────────────
  useEffect(() => {
    const unsub = onAttendanceClosed(ev => {
      if (ev.sessionId !== attSessionId) return;
      setAttSession(prev => prev ? {
        ...prev,
        lifecycle: ev.status === 'FINALIZED' ? 'FINALIZED' : 'CLOSED',
      } : prev);
      setQrToken(null);
    });
    return unsub;
  }, [attSessionId, onAttendanceClosed]);

  // ── 7. Join/leave Socket.IO attendance room ──────────────────────────────
  useEffect(() => {
    if (!selectedClassSession) return;
    joinAttendanceRoom(selectedClassSession.courseOffering.id);
    return () => leaveAttendanceRoom(selectedClassSession.courseOffering.id);
  }, [selectedClassSession, joinAttendanceRoom, leaveAttendanceRoom]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const generateQrToken = async (sessionId: string) => {
    setTokenLoading(true);
    try {
      const res = await apiFetch<{ rawToken: string }>(`${API}/sessions/${sessionId}/qr-token`, { method: 'POST' });
      setQrToken(res.rawToken);
      setQrSeed(Date.now());
      setCountdown(30);
    } catch { /* keep old */ }
    finally { setTokenLoading(false); }
  };

  const handleOpenSession = async () => {
    // ClassSession.id is used to open (creates AttendanceSession)
    if (!selectedClassSession) return;
    setOpening(true);
    try {
      const sess = await apiFetch<{ id: string }>(`${API}/sessions/${selectedClassSession.id}/open`, { method: 'POST' });
      // Update local state immediately — roster will be loaded via attSessionId effect
      setAttSession({ id: sess.id, lifecycle: 'OPEN', openedAt: new Date().toISOString(), closedAt: null, classDate: selectedClassSession.date, startTime: selectedClassSession.startTime, endTime: selectedClassSession.endTime });
      await generateQrToken(sess.id);
    } catch (e) { alert(e instanceof Error ? e.message : 'Open failed'); }
    finally { setOpening(false); }
  };

  const handleCloseSession = async () => {
    if (!attSessionId) return;
    setClosing(true);
    try {
      await apiFetch(`${API}/sessions/${attSessionId}/close`, { method: 'POST' });
      setAttSession(prev => prev ? { ...prev, lifecycle: 'CLOSED' } : prev);
      setQrToken(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Close failed'); }
    finally { setClosing(false); }
  };

  const handleFinalize = async () => {
    if (!attSessionId || !confirm('Finalize? This permanently locks all attendance records.')) return;
    setFinalizing(true);
    try {
      await apiFetch(`${API}/sessions/${attSessionId}/finalize`, { method: 'POST' });
      setAttSession(prev => prev ? { ...prev, lifecycle: 'FINALIZED' } : prev);
    } catch (e) { alert(e instanceof Error ? e.message : 'Finalize failed'); }
    finally { setFinalizing(false); }
  };

  const handleMarkOne = async (studentRecordId: string, status: AttendanceStatus) => {
    if (!attSessionId || sessionFinal) return;
    setStatuses(prev => ({ ...prev, [studentRecordId]: status }));
    try {
      await apiFetch(`${API}/sessions/${attSessionId}/mark`, {
        method: 'PATCH',
        body: JSON.stringify({ studentRecordId, status: toBack(status), note: notes[studentRecordId] }),
      });
    } catch {
      // revert optimistic update
      const orig = roster.find(r => r.studentRecordId === studentRecordId);
      if (orig) setStatuses(prev => ({ ...prev, [studentRecordId]: toFront(orig.status) }));
    }
  };

  const handleBulkSave = async () => {
    if (!attSessionId) return;
    setSaving(true);
    try {
      const marks = roster.map(r => ({
        studentRecordId: r.studentRecordId,
        status: toBack(statuses[r.studentRecordId] ?? 'Absent'),
      }));
      await apiFetch(`${API}/sessions/${attSessionId}/bulk-mark`, {
        method: 'POST', body: JSON.stringify({ marks }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      if (attSessionId) loadRoster(attSessionId);
    } catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    roster.forEach(r => { next[r.studentRecordId] = status; });
    setStatuses(next);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Student ID', 'Status', 'Method', 'Time'];
    const rows = roster.map(r => [
      r.fullName,
      r.studentId,
      statuses[r.studentRecordId] ?? 'Absent',
      r.method ?? 'Manual',
      r.markedAt ? dateToEthiopianTime(new Date(r.markedAt)) : '—',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `attendance-${selectedClassSession?.courseOffering.course.code ?? 'report'}.csv`;
    a.click();
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    Present: Object.values(statuses).filter(s => s === 'Present').length,
    Late:    Object.values(statuses).filter(s => s === 'Late').length,
    Absent:  Object.values(statuses).filter(s => s === 'Absent').length,
    Excused: Object.values(statuses).filter(s => s === 'Excused').length,
  };
  const rate = roster.length
    ? Math.round(((counts.Present + counts.Late) / roster.length) * 100)
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (sessionsLoading) return <SkeletonPage />;
  if (sessionsError)   return <ErrorState variant="network" onRetry={loadSessions} description={sessionsError} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      <DHPageHeader
        title="Attendance"
        subtitle={
          sessionOpen
            ? `● Live — ${selectedClassSession?.courseOffering.course.code ?? ''}`
            : selectedClassSession
              ? `${selectedClassSession.courseOffering.course.code} · ${new Date(selectedClassSession.date).toLocaleDateString()}`
              : 'Select a class'
        }
        icon={<CalendarCheck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            {/* Class picker */}
            {classSessions.length > 1 && (
              <div className="relative">
                <select
                  value={selectedIdx}
                  onChange={e => setSelectedIdx(Number(e.target.value))}
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl font-sans text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {classSessions.map((s, i) => (
                    <option key={s.id} value={i}>
                      {s.courseOffering.course.code} · {s.startTime}–{s.endTime}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
              </div>
            )}

            {/* Lifecycle buttons */}
            {!sessionFinal && !sessionOpen && !sessionClosed && (
              <Button variant="primary" size="sm" disabled={opening || !selectedClassSession}
                icon={<PlayCircle className="w-4 h-4" />} onClick={handleOpenSession}>
                {opening ? 'Opening…' : 'Open Session'}
              </Button>
            )}
            {sessionOpen && (
              <>
                <Button variant="secondary" size="sm" disabled={closing}
                  icon={<StopCircle className="w-4 h-4" />} onClick={handleCloseSession}>
                  {closing ? 'Closing…' : 'Close'}
                </Button>
                <Button variant="danger" size="sm" disabled={finalizing} onClick={handleFinalize}>
                  Finalize
                </Button>
              </>
            )}
            {sessionClosed && (
              <Button variant="danger" size="sm" disabled={finalizing} onClick={handleFinalize}>
                {finalizing ? 'Finalizing…' : 'Finalize'}
              </Button>
            )}
          </div>
        }
      />

      {/* No classes today */}
      {classSessions.length === 0 && (
        <EmptyState variant="timetable" title="No sessions today"
          description="You have no scheduled classes for today. Sessions are auto-generated from your timetable." />
      )}

      {classSessions.length > 0 && (
        <>
          {/* View toggle */}
          <div className="flex gap-2 flex-wrap">
            {([['qr', 'QR Attendance'], ['manual', 'Manual Entry'], ['history', 'Session History']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className="px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all"
                style={view === id
                  ? { backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)' }
                  : { backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── QR Tab ──────────────────────────────────────────────────── */}
          {view === 'qr' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card hoverable={false} className="lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {sessionOpen ? 'Live QR Code' : sessionFinal ? 'Session Finalized' : sessionClosed ? 'Session Closed' : 'Session Not Started'}
                    </h3>
                    <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selectedClassSession?.courseOffering.course.code} · {selectedClassSession?.courseOffering.course.name} · {selectedClassSession?.date ? new Date(selectedClassSession.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  {sessionFinal
                    ? <Badge variant="glass"><Lock className="w-3 h-3 mr-1 inline" />Finalized</Badge>
                    : sessionOpen
                      ? <Badge variant="emerald" className="animate-pulse">● Live</Badge>
                      : sessionClosed
                        ? <Badge variant="amber">Closed</Badge>
                        : <Badge variant="glass">Not Started</Badge>}
                </div>

                <div className="flex flex-col items-center gap-5">
                  <div className={`relative p-4 bg-white rounded-2xl shadow-2xl transition-opacity ${sessionOpen ? 'opacity-100' : 'opacity-30'}`}>
                    <motion.div key={qrSeed} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...DURATION.medium, ...EASE.out }}>
                      <QRPattern seed={qrSeed} />
                    </motion.div>
                    {sessionOpen && qrToken && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg"
                        style={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-strong)' }}>
                        <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--brand-gold)' }}
                          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                        <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--brand-gold)' }}>
                          Refreshes in {countdown}s
                        </span>
                      </div>
                    )}
                  </div>

                  {qrToken && sessionOpen && (
                    <div className="w-full max-w-sm flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)' }}>
                      <p className="font-mono text-[11px] flex-1 truncate" style={{ color: 'var(--text-faint)' }}>{qrToken}</p>
                      <button onClick={() => { navigator.clipboard.writeText(qrToken); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        style={{ color: copied ? 'var(--status-success)' : 'var(--text-muted)' }}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap justify-center">
                    <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />}
                      onClick={() => attSessionId && generateQrToken(attSessionId)}
                      disabled={!sessionOpen || tokenLoading}>
                      {tokenLoading ? 'Generating…' : 'New QR Token'}
                    </Button>
                    <Button variant="secondary" size="sm" icon={<FileDown className="w-4 h-4" />}
                      onClick={exportCSV} disabled={!roster.length}>
                      Export CSV
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Stats + live feed */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map(s => {
                    const cfg = STATUS_CFG[s];
                    return (
                      <div key={s} className="p-3.5 border rounded-xl" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{s}</p>
                        <p className="font-mono text-2xl font-bold mt-0.5" style={{ color: cfg.text }}>{counts[s]}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Session Rate</p>
                    <p className="font-mono text-xl font-bold" style={{ color: rate >= 80 ? 'var(--status-success)' : 'var(--status-danger)' }}>{rate}%</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: rate >= 80 ? 'var(--status-success)' : 'var(--status-danger)' }}
                      initial={{ width: 0 }} animate={{ width: `${rate}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }} />
                  </div>
                  <p className="font-sans text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>
                    {roster.length} enrolled · {selectedClassSession?.startTime ? toEthiopianTimeRange(selectedClassSession.startTime, selectedClassSession.endTime ?? selectedClassSession.startTime) : ''}
                  </p>
                </div>

                {/* Live check-ins */}
                <Card hoverable={false} className="p-4 space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    Live Check-ins
                    {sessionOpen && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />}
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {rosterLoading ? (
                      <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>Loading…</p>
                    ) : roster.filter(r => r.markedAt && r.status !== 'ABSENT').length === 0 ? (
                      <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>No check-ins yet.</p>
                    ) : (
                      roster
                        .filter(r => r.markedAt && r.status !== 'ABSENT')
                        .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime())
                        .map((rec, i) => {
                          const cfg = STATUS_CFG[toFront(rec.status)];
                          return (
                            <motion.div key={rec.studentRecordId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{rec.fullName}</p>
                                <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                                  {rec.markedAt ? dateToEthiopianTime(new Date(rec.markedAt)) : '—'}
                                  {rec.method === 'QR' && ' · QR'}
                                </p>
                              </div>
                              <span className="flex items-center gap-1 font-mono text-[10px] font-semibold shrink-0" style={{ color: cfg.text }}>
                                {cfg.icon} {cfg.label}
                              </span>
                            </motion.div>
                          );
                        })
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ── Manual Entry Tab ─────────────────────────────────────────── */}
          {view === 'manual' && (
            <Card hoverable={false} className="space-y-5">
              {sessionFinal && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                  <Lock className="w-4 h-4" /> This session is finalized. Records are locked.
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Manual Attendance</h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {selectedClassSession?.courseOffering.course.code} · {roster.length} students
                  </p>
                </div>
                {!sessionFinal && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" size="sm" onClick={() => handleMarkAll('Present')}>All Present</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleMarkAll('Absent')}>Reset All</Button>
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--status-success)' }}>
                        <CheckCircle2 className="w-4 h-4" /> Saved
                      </span>
                    )}
                    <Button variant="primary" size="sm" disabled={saving || !attSessionId} onClick={handleBulkSave}>
                      {saving ? 'Saving…' : 'Save All'}
                    </Button>
                  </div>
                )}
              </div>

              {rosterLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-(--hover-overlay) rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : roster.length === 0 ? (
                <EmptyState variant="students" compact
                  description={attSessionId ? 'No enrolled students found.' : 'Open a session first to take attendance.'} />
              ) : (
                <div className="space-y-2">
                  {roster.map(student => {
                    const status = statuses[student.studentRecordId] ?? 'Absent';
                    return (
                      <div key={student.studentRecordId}
                        className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                        style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}>

                        {/* Avatar initial */}
                        <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center font-serif font-bold text-sm text-(--brand-gold) shrink-0">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>

                        {/* Name + ID */}
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{student.fullName}</p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{student.studentId}</p>
                        </div>

                        {/* Status buttons */}
                        <div className="flex gap-1 shrink-0">
                          {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map(s => {
                            const cfg = STATUS_CFG[s];
                            const isActive = status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => !sessionFinal && handleMarkOne(student.studentRecordId, s)}
                                disabled={sessionFinal}
                                className="px-2 py-1 rounded-lg font-mono text-[10px] font-semibold transition-all focus:outline-none"
                                style={{
                                  backgroundColor: isActive ? cfg.bg : 'transparent',
                                  border: `1px solid ${isActive ? cfg.border : 'var(--border-subtle)'}`,
                                  color: isActive ? cfg.text : 'var(--text-faint)',
                                  opacity: sessionFinal ? 0.5 : 1,
                                  cursor: sessionFinal ? 'not-allowed' : 'pointer',
                                }}
                                aria-label={`Mark ${student.fullName} as ${s}`}
                                aria-pressed={isActive}
                              >
                                {s.slice(0, 1)}
                              </button>
                            );
                          })}
                        </div>

                        {/* Method indicator */}
                        {student.method === 'QR' && student.markedAt && (
                          <span className="font-mono text-[10px] text-(--status-success) shrink-0">QR</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* ── History Tab ─────────────────────────────────────────────── */}
          {view === 'history' && (
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Session History</h3>
              {historyLoading ? (
                <SkeletonPage />
              ) : history.length === 0 ? (
                <EmptyState variant="attendance" compact description="No past sessions found for this course." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans min-w-[500px]">
                    <thead className="border-b border-(--border-default)">
                      <tr>
                        {['Date', 'Time', 'Status', 'Records'].map(h => (
                          <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-(--text-muted) text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border-subtle)">
                      {history.map((sess: any, i) => (
                        <tr key={i} className="hover:bg-(--hover-overlay) transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">
                            {new Date(sess.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-(--text-secondary)">
                            {sess.startTime}–{sess.endTime}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              !sess.attendanceSession                             ? 'glass'   :
                              sess.attendanceSession.lifecycle === 'FINALIZED'   ? 'emerald' :
                              sess.attendanceSession.lifecycle === 'CLOSED'      ? 'amber'   :
                              sess.attendanceSession.lifecycle === 'OPEN'        ? 'rose'    :
                              'glass'
                            } className="text-[10px]">
                              {sess.attendanceSession?.lifecycle ?? 'No Session'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-(--brand-gold)">
                            {sess.attendanceSession?._count?.records ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ── Session History ──────────────────────────────────────────── */}
          {view === 'history' && (
            <div className="space-y-4">
              {historyLoading ? <SkeletonPage /> : history.length === 0 ? (
                <EmptyState variant="timetable" title="No session history" description="No previous sessions found for this course." />
              ) : (
                history.map(s => {
                  const pres = (s.records ?? []).filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length;
                  const total = (s.records ?? []).length || s._count?.records || 0;
                  const pct = total ? Math.round((pres / total) * 100) : 0;
                  const isFinalized = s.status === 'FINALIZED';
                  return (
                    <Card key={s.id} hoverable className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold" style={{ color: 'var(--brand-gold)' }}>
                            {s.courseCode ?? s.course?.code ?? '—'}
                          </span>
                          <p className="font-sans text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                            {s.date ? new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                            {s.startTime ? ` · ${toEthiopianTimeRange(s.startTime, s.endTime ?? s.startTime)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={pct >= 80 ? 'emerald' : 'rose'}>{pct}%</Badge>
                          {isFinalized
                            ? <Badge variant="glass"><Lock className="w-3 h-3 mr-1 inline" />Finalized</Badge>
                            : s.status === 'OPEN'
                              ? <Badge variant="emerald" className="animate-pulse">● Open</Badge>
                              : <Badge variant="glass">Closed</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs font-mono flex-wrap">
                        <span style={{ color: 'var(--status-success)' }}>
                          {(s.records ?? []).filter((r: any) => r.status === 'PRESENT').length} Present
                        </span>
                        <span style={{ color: 'var(--status-warning)' }}>
                          {(s.records ?? []).filter((r: any) => r.status === 'LATE').length} Late
                        </span>
                        <span style={{ color: 'var(--status-danger)' }}>
                          {(s.records ?? []).filter((r: any) => r.status === 'ABSENT').length} Absent
                        </span>
                        <span style={{ color: 'var(--text-faint)' }}>
                          {(s.records ?? []).filter((r: any) => r.status === 'EXCUSED').length} Excused
                        </span>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
