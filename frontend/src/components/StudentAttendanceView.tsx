'use client';

/**
 * StudentAttendanceView
 * Shows real attendance data from /api/attendance/my-summary
 * Features: overall rate, per-course breakdown, session history, QR scan,
 *           live "Attendance Open" badge via socket, grade push notifications
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  CalendarCheck, QrCode, RefreshCw, CheckCircle2,
  XCircle, Clock, AlertCircle, AlertTriangle,
  Camera, X, Radio,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from './ui/States';
import { DHPageHeader } from './dh/DHPageHeader';
import { useSocket } from '@/src/context/SocketContext';
import { dateToEthiopianTime } from '@/src/lib/utils';

const API = '/api/attendance';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT: 'var(--status-success)',
  LATE:    'var(--status-warning)',
  ABSENT:  'var(--status-danger)',
  EXCUSED: 'var(--text-secondary)',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  PRESENT: <CheckCircle2 className="w-3.5 h-3.5" />,
  LATE:    <Clock className="w-3.5 h-3.5" />,
  ABSENT:  <XCircle className="w-3.5 h-3.5" />,
  EXCUSED: <AlertCircle className="w-3.5 h-3.5" />,
};

function RateCircle({ rate, size = 80 }: { rate: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  const color = rate >= 90 ? 'var(--status-success)' : rate >= 75 ? 'var(--brand-gold)' : 'var(--status-danger)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hover-overlay)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size > 70 ? 14 : 11} fontWeight="bold" fontFamily="monospace" fill={color}>
        {rate}%
      </text>
    </svg>
  );
}

export const StudentAttendanceView: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [qrOpen,   setQrOpen]   = useState(false);
  const [qrToken,  setQrToken]  = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMsg,  setScanMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Realtime: track which courseOfferingIds have an open session right now
  const { joinAttendanceRoom, leaveAttendanceRoom, onAttendanceOpened, onAttendanceClosed, onAttendanceRecord } = useSocket();
  const [liveOfferingIds, setLiveOfferingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setSummary(await apiFetch(`${API}/my-summary`));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Join attendance rooms for all enrolled courses ────────────────────────
  useEffect(() => {
    const byCourse = summary?.byCourse ?? [];
    const offeringIds: string[] = byCourse.map((c: any) => c.courseOfferingId).filter(Boolean);
    offeringIds.forEach(id => joinAttendanceRoom(id));
    return () => { offeringIds.forEach(id => leaveAttendanceRoom(id)); };
  }, [summary, joinAttendanceRoom, leaveAttendanceRoom]);

  // ── Listen: session opened → show "● Live" badge on that course ──────────
  useEffect(() => {
    const unsub = onAttendanceOpened(ev => {
      setLiveOfferingIds(prev => new Set([...prev, ev.courseOfferingId]));
    });
    return unsub;
  }, [onAttendanceOpened]);

  // ── Listen: session closed/finalized → remove live badge ─────────────────
  useEffect(() => {
    const unsub = onAttendanceClosed(ev => {
      setLiveOfferingIds(prev => {
        const next = new Set(prev);
        next.delete(ev.courseOfferingId);
        return next;
      });
    });
    return unsub;
  }, [onAttendanceClosed]);

  // ── Listen: student QR-scanned → reload summary to update rates ──────────
  useEffect(() => {
    const unsub = onAttendanceRecord(ev => {
      // Only reload if this record is for ourselves (we can't check studentRecordId from
      // the frontend without a stored value, so we reload on any record in our rooms)
      load();
    });
    return unsub;
  }, [onAttendanceRecord, load]);

  // Focus input when QR modal opens
  useEffect(() => {
    if (qrOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [qrOpen]);

  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim()) return;
    setScanning(true); setScanMsg(null);
    try {
      const res = await apiFetch<any>(`${API}/qr-scan`, {
        method: 'POST',
        body: JSON.stringify({ rawToken: qrToken.trim() }),
      });
      if (res.alreadyMarked) {
        setScanMsg({ ok: true, text: `Already marked as ${res.status}. No duplicate created.` });
      } else {
        setScanMsg({ ok: true, text: `✓ Attendance recorded — ${res.status}` });
        await load(); // refresh summary
      }
      setQrToken('');
    } catch (e: unknown) {
      setScanMsg({ ok: false, text: e instanceof Error ? e.message : 'Scan failed' });
    } finally { setScanning(false); }
  };

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;
  if (!summary) return <EmptyState variant="attendance" />;

  const overall = summary.overall as { rate: number; total: number; present: number; absent: number };
  const byCourse = (summary.byCourse ?? []) as any[];
  const recent   = (summary.recentRecords ?? []) as any[];

  const warningCourses = byCourse.filter((c: any) => c.rate < 75);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-8 pb-8">

      <DHPageHeader
        title="My Attendance"
        subtitle={
          liveOfferingIds.size > 0
            ? `${overall.total} sessions tracked · ${liveOfferingIds.size} session${liveOfferingIds.size > 1 ? 's' : ''} open now`
            : `${overall.total} sessions tracked across all courses`
        }
        icon={<CalendarCheck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2 items-center">
            {liveOfferingIds.size > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono border"
                style={{
                  backgroundColor: 'var(--status-success-bg)',
                  borderColor: 'var(--status-success-border)',
                  color: 'var(--status-success)',
                }}>
                <Radio className="w-3 h-3 animate-pulse" /> Attendance Open
              </span>
            )}
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>
            <Button variant="primary"   size="sm" icon={<QrCode className="w-4 h-4" />} onClick={() => setQrOpen(true)}>
              Scan QR
            </Button>
          </div>
        }
      />

      {/* ── Warning banner ── */}
      {warningCourses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-2xl border"
          style={{ backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--status-danger)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--status-danger)' }}>Attendance Warning</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {warningCourses.map((c: any) => c.courseName).join(', ')} {warningCourses.length === 1 ? 'is' : 'are'} below the 75% minimum threshold.
              Contact your advisor immediately.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Overall KPI ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card hoverable={false} className="flex flex-col items-center justify-center gap-3 py-6">
          <RateCircle rate={overall.rate} size={88} />
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-center"
            style={{ color: 'var(--text-faint)' }}>Overall Rate</p>
        </Card>
        {[
          { label: 'Sessions', value: overall.total,   color: 'var(--text-primary)' },
          { label: 'Present',  value: overall.present, color: 'var(--status-success)' },
          { label: 'Absent',   value: overall.absent,  color: 'var(--status-danger)' },
        ].map(item => (
          <Card key={item.label} hoverable={false} className="flex flex-col items-center justify-center gap-1 py-6">
            <p className="font-mono text-4xl font-bold" style={{ color: item.color }}>{item.value}</p>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-faint)' }}>{item.label}</p>
          </Card>
        ))}
      </section>

      {/* ── Per-course breakdown ── */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Attendance by Course</h2>
        {byCourse.length === 0 ? (
          <Card hoverable={false} className="py-10 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No course attendance data yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {byCourse.map((c: any) => (
              <Card key={c.courseCode} hoverable className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="gold">{c.courseCode}</Badge>
                      {liveOfferingIds.has(c.courseOfferingId) && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border"
                          style={{
                            backgroundColor: 'var(--status-success-bg)',
                            borderColor: 'var(--status-success-border)',
                            color: 'var(--status-success)',
                          }}>
                          <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-sm font-semibold leading-snug"
                      style={{ color: 'var(--text-primary)' }}>{c.courseName}</p>
                  </div>
                  <RateCircle rate={c.rate} size={56} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono"
                    style={{ color: 'var(--text-faint)' }}>
                    <span>Attendance</span>
                    <span>{c.present}/{c.total} sessions</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${c.rate}%`,
                        backgroundColor: c.rate >= 90 ? 'var(--status-success)'
                          : c.rate >= 75 ? 'var(--brand-gold)'
                          : 'var(--status-danger)',
                      }} />
                  </div>
                </div>
                <div className="flex gap-2 text-[10px] font-mono flex-wrap">
                  <span style={{ color: 'var(--status-success)' }}>✓ {c.present} Present</span>
                  {c.late > 0   && <span style={{ color: 'var(--status-warning)' }}>⏱ {c.late} Late</span>}
                  {c.absent > 0 && <span style={{ color: 'var(--status-danger)' }}>✗ {c.absent} Absent</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent sessions ── */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Recent Sessions</h2>
        {recent.length === 0 ? (
          <Card hoverable={false} className="py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent session records.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto border rounded-2xl" style={{ borderColor: 'var(--border-default)' }}>
            <table className="w-full text-xs font-sans min-w-[520px]">
              <thead>
                <tr style={{ backgroundColor: 'var(--hover-overlay)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Date', 'Course', 'Status', 'Method', 'Time'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-left"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((rec: any, i: number) => (
                  <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="transition-colors"
                    style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>
                      {rec.courseCode}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold"
                        style={{ color: STATUS_COLOR[rec.status] ?? 'var(--text-secondary)' }}>
                        {STATUS_ICON[rec.status]}
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-faint)' }}>
                      {rec.method === 'QR' ? '📱 QR' : '✏️ Manual'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                      {dateToEthiopianTime(new Date(rec.markedAt))}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── QR Scan Modal ── */}
      <AnimatePresence>
        {qrOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black" onClick={() => { setQrOpen(false); setScanMsg(null); setQrToken(''); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-sm rounded-2xl shadow-2xl pointer-events-auto"
                style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
                <div className="p-6 border-b flex items-center justify-between"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
                      <QrCode className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Scan QR Attendance</h3>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                        Enter the token shown by your instructor
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setQrOpen(false); setScanMsg(null); setQrToken(''); }}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleQrSubmit} className="p-6 space-y-4">
                  <div className="flex flex-col items-center gap-4 p-5 rounded-xl border-2 border-dashed"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--hover-overlay)' }}>
                    <Camera className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
                    <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                      Ask your instructor for the QR attendance token, then enter it below.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Attendance Token
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={qrToken}
                      onChange={e => setQrToken(e.target.value)}
                      placeholder="Paste or type token here…"
                      required
                      className="w-full px-4 py-3 rounded-xl font-mono text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        caretColor: 'var(--brand-gold)',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'var(--brand-gold)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                    />
                  </div>

                  {scanMsg && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                      style={{
                        backgroundColor: scanMsg.ok ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                        borderColor:     scanMsg.ok ? 'var(--status-success-border)' : 'var(--status-danger-border)',
                        color:           scanMsg.ok ? 'var(--status-success)' : 'var(--status-danger)',
                        border:          '1px solid',
                      }}>
                      {scanMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      {scanMsg.text}
                    </motion.div>
                  )}

                  <Button variant="primary" type="submit" disabled={scanning || !qrToken.trim()}
                    className="w-full justify-center" icon={<QrCode className="w-4 h-4" />}>
                    {scanning ? 'Marking Attendance…' : 'Submit Attendance'}
                  </Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
