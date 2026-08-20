'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CalendarCheck, QrCode, RefreshCw, Clock, Users, CheckCircle2,
  XCircle, AlertCircle, FileDown, ChevronDown, Lock, Unlock,
  PlayCircle, StopCircle, Copy, Check,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import { AttendanceStatus } from '../../../types/instructor';
import { useSocket } from '@/src/context/SocketContext';
import { toEthiopianTimeRange, dateToEthiopianTime } from '@/src/lib/utils';

// ── API helper ────────────────────────────────────────────────────────────────
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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AttendanceStatus, {
  label: string; bg: string; border: string; text: string;
  icon: React.ReactNode;
}> = {
  Present: {
    label: 'Present', bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success)',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Late: {
    label: 'Late', bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning)',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  Absent: {
    label: 'Absent', bg: 'var(--status-danger-bg)', border: 'var(--status-danger-border)', text: 'var(--status-danger)',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  Excused: {
    label: 'Excused', bg: 'var(--hover-overlay)', border: 'var(--border-default)', text: 'var(--text-secondary)',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

// DB status → frontend AttendanceStatus
function toFrontend(s: string): AttendanceStatus {
  const map: Record<string, AttendanceStatus> = {
    PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent', EXCUSED: 'Excused',
  };
  return map[s] ?? 'Absent';
}
function toBackend(s: AttendanceStatus): string {
  return s.toUpperCase();
}

// ── QR visual pattern ─────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export const InAttendanceView: React.FC = () => {
  const { onAttendanceRecord, onAttendanceClosed, joinAttendanceRoom, leaveAttendanceRoom } = useSocket();

  // ── State ─────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'qr' | 'manual' | 'history'>('qr');

  // Courses / session selection
  const [sessions, setSessions]             = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError]   = useState<string | null>(null);

  // Current session details
  const [roster, setRoster]                 = useState<any[]>([]);
  const [rosterLoading, setRosterLoading]   = useState(false);
  const [sessionOpen, setSessionOpen]       = useState(false);
  const [sessionFinalized, setSessionFinalized] = useState(false);

  // QR token
  const [qrToken, setQrToken]               = useState<string | null>(null);
  const [qrSeed, setQrSeed]                 = useState(Date.now());
  const [countdown, setCountdown]           = useState(30);
  const [tokenLoading, setTokenLoading]     = useState(false);
  const [copied, setCopied]                 = useState(false);

  // Manual entry
  const [statuses, setStatuses]             = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes]                   = useState<Record<string, string>>({});
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);

  // History
  const [history, setHistory]               = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Operation in-progress flags
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load today's sessions ─────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true); setSessionsError(null);
    try {
      const data = await apiFetch<any[]>(`${API}/sessions/today`);
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
    } catch (e: unknown) {
      setSessionsError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally { setSessionsLoading(false); }
  }, [selectedSessionId]);

  useEffect(() => { loadSessions(); }, []);

  // ── Load roster when session changes ─────────────────────────────────────
  const loadRoster = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setRosterLoading(true);
    try {
      const data = await apiFetch<any>(`${API}/sessions/${sessionId}/roster`);
      setRoster(data.records ?? []);
      setSessionOpen(data.session?.status === 'OPEN');
      setSessionFinalized(data.session?.status === 'FINALIZED');

      // Initialise statuses from DB
      const s: Record<string, AttendanceStatus> = {};
      const n: Record<string, string> = {};
      for (const r of (data.records ?? [])) {
        s[r.studentRecordId] = toFrontend(r.status);
        n[r.studentRecordId] = r.note ?? '';
      }
      setStatuses(s); setNotes(n);
    } catch { /* keep empty roster */ }
    finally { setRosterLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedSessionId) loadRoster(selectedSessionId);
  }, [selectedSessionId, loadRoster]);

  // ── Load history for a specific offering ─────────────────────────────────
  const loadHistory = useCallback(async () => {
    const session = sessions.find(s => s.id === selectedSessionId);
    if (!session?.courseOfferingId) return;
    setHistoryLoading(true);
    try {
      const data = await apiFetch<any>(`${API}/sessions/offering/${session.courseOfferingId}`);
      setHistory(Array.isArray(data) ? data : (data.sessions ?? []));
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    if (view === 'history' && selectedSessionId) loadHistory();
  }, [view, selectedSessionId, loadHistory]);

  // ── QR countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionOpen || !qrToken) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-refresh token
          if (selectedSessionId) generateQrToken(selectedSessionId);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionOpen, qrToken, selectedSessionId]);

  // ── Realtime: new check-in via QR ─────────────────────────────────────────
  useEffect(() => {
    const unsub = onAttendanceRecord((ev) => {
      if (ev.sessionId !== selectedSessionId) return;
      setRoster(prev => prev.map(r =>
        r.studentRecordId === ev.studentRecordId
          ? { ...r, status: ev.status, markedAt: ev.markedAt, method: ev.method }
          : r,
      ));
      setStatuses(prev => ({ ...prev, [ev.studentRecordId]: toFrontend(ev.status) }));
    });
    return unsub;
  }, [selectedSessionId, onAttendanceRecord]);

  // ── Realtime: session closed/finalized by server ───────────────────────────
  useEffect(() => {
    const unsub = onAttendanceClosed((ev) => {
      if (ev.sessionId !== selectedSessionId) return;
      if (ev.status === 'FINALIZED') { setSessionFinalized(true); setSessionOpen(false); }
      else { setSessionOpen(false); }
      setQrToken(null);
    });
    return unsub;
  }, [selectedSessionId, onAttendanceClosed]);

  // ── Join / leave the course attendance room for realtime events ────────────
  useEffect(() => {
    const session = sessions.find(s => s.id === selectedSessionId);
    if (!session?.courseOfferingId) return;
    joinAttendanceRoom(session.courseOfferingId);
    return () => { leaveAttendanceRoom(session.courseOfferingId); };
  }, [selectedSessionId, sessions, joinAttendanceRoom, leaveAttendanceRoom]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const generateQrToken = async (sessionId: string) => {
    setTokenLoading(true);
    try {
      const res = await apiFetch<{ rawToken: string }>(`${API}/sessions/${sessionId}/qr-token`, { method: 'POST' });
      setQrToken(res.rawToken);
      setQrSeed(Date.now());
      setCountdown(30);
    } catch { /* keep old token */ }
    finally { setTokenLoading(false); }
  };

  const handleOpenSession = async () => {
    if (!selectedSessionId) return;
    setOpening(true);
    try {
      await apiFetch(`${API}/sessions/${selectedSessionId}/open`, { method: 'POST' });
      setSessionOpen(true);
      await generateQrToken(selectedSessionId);
      await loadRoster(selectedSessionId);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Open failed'); }
    finally { setOpening(false); }
  };

  const handleCloseSession = async () => {
    if (!selectedSessionId) return;
    setClosing(true);
    try {
      await apiFetch(`${API}/sessions/${selectedSessionId}/close`, { method: 'POST' });
      setSessionOpen(false);
      setQrToken(null);
      await loadRoster(selectedSessionId);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Close failed'); }
    finally { setClosing(false); }
  };

  const handleFinalize = async () => {
    if (!selectedSessionId || !confirm('Finalize this session? This permanently locks attendance records.')) return;
    setFinalizing(true);
    try {
      await apiFetch(`${API}/sessions/${selectedSessionId}/finalize`, { method: 'POST' });
      setSessionFinalized(true); setSessionOpen(false);
      await loadRoster(selectedSessionId);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Finalize failed'); }
    finally { setFinalizing(false); }
  };

  const handleMarkOne = async (studentRecordId: string, status: AttendanceStatus) => {
    if (!selectedSessionId) return;
    const record = roster.find(r => r.studentRecordId === studentRecordId);
    if (!record) return;
    setStatuses(prev => ({ ...prev, [studentRecordId]: status }));
    try {
      await apiFetch(`${API}/sessions/${selectedSessionId}/mark`, {
        method: 'PATCH',
        body: JSON.stringify({ studentRecordId: record.attendanceRecordId ?? record.id, status: toBackend(status), note: notes[studentRecordId] }),
      });
    } catch { /* revert optimistic */
      setStatuses(prev => ({ ...prev, [studentRecordId]: toFrontend(record.status) }));
    }
  };

  const handleBulkSave = async () => {
    if (!selectedSessionId) return;
    setSaving(true);
    try {
      const marks = roster.map(r => ({
        studentRecordId: r.attendanceRecordId ?? r.id,
        status: toBackend(statuses[r.studentRecordId] ?? 'Absent'),
      }));
      await apiFetch(`${API}/sessions/${selectedSessionId}/bulk-mark`, {
        method: 'POST', body: JSON.stringify({ marks }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      await loadRoster(selectedSessionId);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    roster.forEach(r => { next[r.studentRecordId] = status; });
    setStatuses(next);
  };

  const exportCSV = () => {
    if (!roster.length) return;
    const headers = ['Name', 'Student ID', 'Status', 'Method', 'Time'];
    const rows = roster.map(r => [
      r.student?.fullName ?? 'Unknown',
      r.student?.studentId ?? '',
      statuses[r.studentRecordId] ?? 'Absent',
      r.method ?? 'Manual',
      r.markedAt ? dateToEthiopianTime(new Date(r.markedAt)) : '—',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `attendance-${selectedSessionId}.csv`; a.click();
  };

  const copyToken = () => {
    if (!qrToken) return;
    navigator.clipboard.writeText(qrToken).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const counts = {
    Present: Object.values(statuses).filter(s => s === 'Present').length,
    Late:    Object.values(statuses).filter(s => s === 'Late').length,
    Absent:  Object.values(statuses).filter(s => s === 'Absent').length,
    Excused: Object.values(statuses).filter(s => s === 'Excused').length,
  };
  const rate = roster.length
    ? Math.round(((counts.Present + counts.Late) / roster.length) * 100)
    : 0;

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // ── Render ────────────────────────────────────────────────────────────────
  if (sessionsLoading) return <SkeletonPage />;
  if (sessionsError)   return <ErrorState variant="network" onRetry={loadSessions} description={sessionsError} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      <DHPageHeader
        title="Attendance"
        subtitle={sessionOpen ? '● Live session active' : selectedSession ? `${selectedSession.courseCode ?? ''} — ${new Date(selectedSession.date ?? Date.now()).toLocaleDateString()}` : 'Select a session'}
        icon={<CalendarCheck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            {/* Session picker */}
            {sessions.length > 0 && (
              <div className="relative">
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl font-sans text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--hover-overlay)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.courseCode ?? s.course?.code ?? 'Session'} · {new Date(s.date ?? Date.now()).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                  style={{ color: 'var(--text-faint)' }} />
              </div>
            )}
            {/* Session lifecycle buttons */}
            {!sessionFinalized && !sessionOpen && (
              <Button variant="primary" size="sm" disabled={opening || !selectedSessionId}
                icon={<PlayCircle className="w-4 h-4" />} onClick={handleOpenSession}>
                {opening ? 'Opening…' : 'Open Session'}
              </Button>
            )}
            {sessionOpen && (
              <>
                <Button variant="secondary" size="sm" disabled={closing}
                  icon={<StopCircle className="w-4 h-4" />} onClick={handleCloseSession}>
                  {closing ? 'Closing…' : 'Close Session'}
                </Button>
                <Button variant="danger" size="sm" disabled={finalizing} onClick={handleFinalize}>
                  {finalizing ? 'Finalizing…' : 'Finalize'}
                </Button>
              </>
            )}
            {!sessionOpen && !sessionFinalized && selectedSessionId && (
              <Button variant="danger" size="sm" disabled={finalizing} onClick={handleFinalize}>
                {finalizing ? 'Finalizing…' : 'Finalize'}
              </Button>
            )}
          </div>
        }
      />

      {/* Empty state — no sessions today */}
      {sessions.length === 0 && (
        <EmptyState variant="timetable"
          title="No sessions today"
          description="You have no scheduled classes for today. Sessions are auto-generated from your timetable." />
      )}

      {sessions.length > 0 && (
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

          {/* ── QR View ─────────────────────────────────────────────────── */}
          {view === 'qr' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* QR Panel */}
              <Card hoverable={false} className="lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {sessionOpen ? 'Live QR Code' : sessionFinalized ? 'Session Finalized' : 'Session Closed'}
                    </h3>
                    <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selectedSession?.courseCode ?? '—'} · {selectedSession?.courseName ?? ''} · {selectedSession?.date ? new Date(selectedSession.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  {sessionFinalized
                    ? <Badge variant="glass"><Lock className="w-3 h-3 mr-1 inline" />Finalized</Badge>
                    : sessionOpen
                      ? <Badge variant="emerald" className="animate-pulse">● Live</Badge>
                      : <Badge variant="rose">Closed</Badge>}
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
                        <motion.div className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--brand-gold)' }}
                          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                        <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--brand-gold)' }}>
                          Refreshes in {countdown}s
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Token display */}
                  {qrToken && sessionOpen && (
                    <div className="w-full max-w-sm flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)' }}>
                      <p className="font-mono text-[11px] flex-1 truncate" style={{ color: 'var(--text-faint)' }}>
                        {qrToken}
                      </p>
                      <button onClick={copyToken} className="shrink-0 transition-colors"
                        style={{ color: copied ? 'var(--status-success)' : 'var(--text-muted)' }}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap justify-center">
                    <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />}
                      onClick={() => selectedSessionId && generateQrToken(selectedSessionId)}
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

              {/* Stats + Live feed */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map(s => {
                    const cfg = STATUS_CFG[s];
                    return (
                      <div key={s} className="p-3.5 border rounded-xl"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
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
                    {roster.length} enrolled · {selectedSession?.startTime ? toEthiopianTimeRange(selectedSession.startTime, selectedSession.endTime ?? selectedSession.startTime) : ''}
                  </p>
                </div>

                {/* Live check-in feed */}
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
                        .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime())
                        .map((rec, i) => {
                          const cfg = STATUS_CFG[toFrontend(rec.status)];
                          return (
                            <motion.div key={rec.id ?? i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                  {rec.student?.fullName ?? 'Unknown'}
                                </p>
                                <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                                  {dateToEthiopianTime(new Date(rec.markedAt))}
                                  {rec.method === 'QR' && ' · QR'}
                                </p>
                              </div>
                              <span className="flex items-center gap-1 font-mono text-[10px] font-semibold shrink-0"
                                style={{ color: cfg.text }}>
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

          {/* ── Manual Entry View ────────────────────────────────────────── */}
          {view === 'manual' && (
            <Card hoverable={false} className="space-y-5">
              {sessionFinalized && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                  <Lock className="w-4 h-4" /> This session is finalized. Records are locked.
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Manual Attendance</h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {selectedSession?.courseCode ?? ''} · {roster.length} students enrolled
                  </p>
                </div>
                {!sessionFinalized && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" size="sm" onClick={() => handleMarkAll('Present')}>All Present</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleMarkAll('Absent')}>Reset All</Button>
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: 'var(--status-success)' }}>
                        <CheckCircle2 className="w-4 h-4" /> Saved
                      </span>
                    )}
                    <Button variant="primary" size="sm" disabled={saving}
                      icon={<CheckCircle2 className="w-4 h-4" />} onClick={handleBulkSave}>
                      {saving ? 'Saving…' : 'Save All'}
                    </Button>
                  </div>
                )}
              </div>

              {rosterLoading ? <SkeletonPage /> : roster.length === 0 ? (
                <EmptyState variant="default" title="No students enrolled" description="No enrollment records found for this session." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans min-w-[600px]">
                    <thead style={{ backgroundColor: 'var(--hover-overlay)', borderBottom: '1px solid var(--border-default)' }}>
                      <tr>
                        {['Student', 'Student ID', 'Status', 'Note'].map(h => (
                          <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-left"
                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((r, i) => (
                        <tr key={r.studentRecordId} className="transition-colors"
                          style={{ borderBottom: i < roster.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                          <td className="px-4 py-3">
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {r.student?.fullName ?? 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            {r.student?.studentId ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map(s => {
                                const cfg = STATUS_CFG[s];
                                const active = statuses[r.studentRecordId] === s;
                                return (
                                  <button key={s} disabled={sessionFinalized}
                                    onClick={() => handleMarkOne(r.studentRecordId, s)}
                                    className="px-2 py-1 rounded-lg font-sans text-[10px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={active
                                      ? { backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }
                                      : { backgroundColor: 'transparent', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}>
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" disabled={sessionFinalized}
                              value={notes[r.studentRecordId] ?? ''}
                              onChange={e => setNotes(prev => ({ ...prev, [r.studentRecordId]: e.target.value }))}
                              placeholder="Optional note…"
                              className="w-full bg-transparent border-b outline-none font-sans text-xs py-0.5 transition-colors placeholder:opacity-30 disabled:cursor-not-allowed"
                              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                              onFocus={e => (e.target.style.borderColor = 'var(--brand-gold)')}
                              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                            />
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
