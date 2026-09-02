'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Shield, AlertTriangle, Lock, Unlock, LogOut, Search, Filter,
  Printer, Download, RefreshCw, CheckCircle2, XCircle, Users, Smartphone, Key
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { SkeletonTable, SkeletonCard, EmptyState, ErrorState, useToast, ToastContainer } from '../../ui/States';
import {
  adminAuditApi, adminSecurityApi, adminSystemApi,
  AdminAuditLog, AdminSecurityStats, AdminSessionApi, AdminLockedAccountApi, AdminSystemHealth,
  ROLE_DISPLAY
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-xl font-mono font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

const SECURITY_ACTIONS = [
  'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DEACTIVATED',
  'SESSION_REVOKED', 'ROLE_CHANGED', 'LOGIN_SUCCESS', 'PASSWORD_CHANGED',
  'OAUTH_LINKED', 'ACCOUNT_UNLOCKED', 'LOGOUT',
];

function actionBadge(action: string): 'rose' | 'amber' | 'emerald' | 'glass' {
  if (['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DEACTIVATED'].includes(action)) return 'rose';
  if (['SESSION_REVOKED', 'ROLE_CHANGED', 'PASSWORD_CHANGED'].includes(action)) return 'amber';
  if (['LOGIN_SUCCESS', 'ACCOUNT_UNLOCKED', 'OAUTH_LINKED'].includes(action)) return 'emerald';
  return 'glass';
}

function actionSeverity(action: string): 'Critical' | 'Warning' | 'Info' {
  if (['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DEACTIVATED'].includes(action)) return 'Critical';
  if (['SESSION_REVOKED', 'ROLE_CHANGED', 'PASSWORD_CHANGED'].includes(action)) return 'Warning';
  return 'Info';
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminSecurityView: React.FC = () => {
  const [activeTab, setActiveTab]       = useState<'feed' | 'sessions' | 'locked' | 'policies'>('feed');

  // Stats
  const [stats, setStats]               = useState<AdminSecurityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Security Audit Logs
  const [logs, setLogs]                 = useState<AdminAuditLog[]>([]);
  const [logsTotal, setLogsTotal]       = useState(0);
  const [logsLoading, setLogsLoading]   = useState(true);
  const [logsError, setLogsError]       = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Active Sessions
  const [sessions, setSessions]         = useState<AdminSessionApi[]>([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeModalSession, setRevokeModalSession] = useState<AdminSessionApi | null>(null);

  // Locked Accounts
  const [lockedUsers, setLockedUsers]   = useState<AdminLockedAccountApi[]>([]);
  const [lockedLoading, setLockedLoading] = useState(false);
  const [unlockModalUser, setUnlockModalUser] = useState<AdminLockedAccountApi | null>(null);

  // Modals & Actions
  const [actionWorking, setActionWorking] = useState(false);
  const [printOpen, setPrintOpen]       = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Security Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const st = await adminSecurityApi.getStats();
      setStats(st);
    } catch {
      // Graceful fallback
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch Security Logs
  const fetchSecurityLogs = useCallback(async () => {
    setLogsLoading(true); setLogsError('');
    try {
      const res = await adminAuditApi.list({
        page: 1,
        limit: 25,
        action: actionFilter || undefined,
      });
      setLogs(res.logs); setLogsTotal(res.total);
    } catch (e: any) {
      setLogsError(e.message ?? 'Failed to load security logs');
    } finally {
      setLogsLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    if (activeTab === 'feed') fetchSecurityLogs();
  }, [activeTab, actionFilter, fetchSecurityLogs]);

  // ── Fetch Active Sessions
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await adminSecurityApi.listSessions({ search: sessionSearch || undefined, limit: 50 });
      setSessions(res.sessions);
    } catch {
      // Graceful fallback
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionSearch]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, sessionSearch, fetchSessions]);

  // ── Fetch Locked Accounts
  const fetchLockedAccounts = useCallback(async () => {
    setLockedLoading(true);
    try {
      const res = await adminSecurityApi.listLockedAccounts();
      setLockedUsers(res);
    } catch {
      // Graceful fallback
    } finally {
      setLockedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'locked') fetchLockedAccounts();
  }, [activeTab, fetchLockedAccounts]);

  // ── Revoke Session Handler
  const handleRevokeSession = async () => {
    if (!revokeModalSession) return;
    setActionWorking(true);
    try {
      await adminSecurityApi.revokeSession(revokeModalSession.id);
      showToast(`Revoked active session for ${revokeModalSession.userFullName}`, 'success');
      setRevokeModalSession(null);
      fetchSessions();
      fetchStats();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to revoke session', 'error');
    } finally {
      setActionWorking(false);
    }
  };

  // ── Unlock Account Handler
  const handleUnlockUser = async () => {
    if (!unlockModalUser) return;
    setActionWorking(true);
    try {
      await adminSecurityApi.unlockUser(unlockModalUser.id);
      showToast(`Unlocked account for ${unlockModalUser.fullName}`, 'success');
      setUnlockModalUser(null);
      fetchLockedAccounts();
      fetchStats();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to unlock user account', 'error');
    } finally {
      setActionWorking(false);
    }
  };

  // ── CSV Export Handler
  const handleExportCSV = () => {
    if (activeTab === 'sessions') {
      const csvRows = ['User Full Name,User Email,Role,Device Info,IP Address,Last Active'];
      sessions.forEach(s => {
        csvRows.push(`"${s.userFullName}","${s.userEmail || 'N/A'}","${s.userRole}","${s.deviceInfo}","${s.ipAddress}","${formatDate(s.lastUsedAt)}"`);
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `Harmony_College_Active_Sessions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Exported active sessions to CSV', 'success');
    } else {
      const csvRows = ['Timestamp,Action,Actor Name,Email,IP Address'];
      logs.forEach(l => {
        csvRows.push(`"${formatDate(l.createdAt)}","${l.action}","${l.actorName}","${l.actorEmail || 'N/A'}","${l.ipAddress || 'N/A'}"`);
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `Harmony_College_Security_Threat_Log_${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Exported security threat log to CSV', 'success');
    }
  };

  const criticalCount = logs.filter(l => actionSeverity(l.action) === 'Critical').length;
  const warningCount  = logs.filter(l => actionSeverity(l.action) === 'Warning').length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Security Operations Center (SOC)"
        subtitle="Institutional authentication governance, session control, and access protection"
        icon={<Shield className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setPrintOpen(true)}>
              Print Compliance Report
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
              Export Threat CSV
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchStats(); fetchSecurityLogs(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Security KPI Ribbon */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPI label="Active Devices & Sessions" value={stats.activeSessions} color="text-(--status-success)" />
          <MiniKPI label="Locked User Accounts"    value={stats.lockedAccounts}   color={stats.lockedAccounts > 0 ? "text-(--status-danger)" : "text-(--brand-gold)"} />
          <MiniKPI label="24h Failed Logins"        value={stats.failedLogins24h}  color={stats.failedLogins24h > 5 ? "text-(--status-danger)" : "text-(--status-warning)"} />
          <MiniKPI label="MFA Adoption Ratio"       value={`${stats.mfaEnabledCount} / ${stats.totalUsers}`} color="text-(--status-info)" />
        </div>
      )}

      {/* Critical Alert Banner */}
      {!logsLoading && criticalCount > 0 && activeTab === 'feed' && (
        <div className="flex items-start gap-3 p-4 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-danger) shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-(--status-danger)">
              {criticalCount} critical security event{criticalCount > 1 ? 's' : ''} detected on this page
            </p>
            <p className="font-sans text-xs text-(--status-danger)/70 mt-0.5">
              Review failed logins, locked accounts, and session revocations below immediately.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-(--border-subtle) pb-3">
        {[
          { id: 'feed' as const,     label: 'Threat & Event Feed' },
          { id: 'sessions' as const, label: `Active Sessions (${stats?.activeSessions ?? 0})` },
          { id: 'locked' as const,   label: `Locked Accounts (${stats?.lockedAccounts ?? 0})` },
          { id: 'policies' as const, label: 'Password & Session Policies' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-semibold transition-all border ${
              activeTab === t.id
                ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                : 'text-(--text-secondary) hover:bg-(--hover-overlay) border-(--border-default)'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: THREAT & EVENT FEED ── */}
      {activeTab === 'feed' && (
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Security Event Feed</h3>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option className="bg-(--bg-card-solid)" value="">All Security Events</option>
              {SECURITY_ACTIONS.map(a => (
                <option key={a} className="bg-(--bg-card-solid)" value={a}>{a}</option>
              ))}
            </select>
          </div>

          {logsLoading ? (
            <SkeletonTable rows={8} cols={4} />
          ) : logsError ? (
            <ErrorState compact description={logsError} onRetry={fetchSecurityLogs} />
          ) : logs.length === 0 ? (
            <EmptyState compact description="No security events recorded for the selected filter." />
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const sev = actionSeverity(log.action);
                const bgCls =
                  sev === 'Critical' ? 'bg-(--status-danger-bg) border-(--status-danger-border)' :
                  sev === 'Warning'  ? 'bg-(--status-warning-bg) border-(--status-warning-border)' :
                                       'bg-(--hover-overlay) border-(--border-subtle)';
                const Icon =
                  sev === 'Critical' ? XCircle :
                  sev === 'Warning'  ? AlertTriangle : CheckCircle2;
                const iconCls =
                  sev === 'Critical' ? 'text-(--status-danger)' :
                  sev === 'Warning'  ? 'text-(--status-warning)' : 'text-(--status-success)';

                return (
                  <div key={log.id} className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border ${bgCls}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={actionBadge(log.action)} className="text-[10px]">
                            {log.action}
                          </Badge>
                          <Badge variant={sev === 'Critical' ? 'rose' : sev === 'Warning' ? 'amber' : 'glass'} className="text-[10px]">
                            {sev}
                          </Badge>
                        </div>
                        <p className="font-sans text-xs text-(--text-muted) mt-1">
                          {log.actorName} <span className="font-mono text-[11px] text-(--text-faint)">({log.actorEmail || log.actorRole || 'SYSTEM'})</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-(--text-faint)">
                          {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                        </div>
                      </div>
                    </div>
                    <p className="font-mono text-[10px] text-(--text-faint) shrink-0">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 2: ACTIVE SESSIONS (DEVICES) ── */}
      {activeTab === 'sessions' && (
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Active Device Sessions</h3>
            <div className="w-64">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search user, device, or IP..."
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
              />
            </div>
          </div>

          {sessionsLoading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : sessions.length === 0 ? (
            <EmptyState compact description="No active device sessions found." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-xl">
              <table className="w-full text-left text-xs font-sans min-w-[700px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['User', 'Device / Browser', 'IP Address', 'Last Active', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-(--text-primary)">{s.userFullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{s.userEmail || s.userRole}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--brand-gold)">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 shrink-0" />
                          <span>{s.deviceInfo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{s.ipAddress}</td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatDate(s.lastUsedAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" icon={<LogOut className="w-3.5 h-3.5 text-(--status-danger)" />} onClick={() => setRevokeModalSession(s)}>
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 3: LOCKED ACCOUNTS ── */}
      {activeTab === 'locked' && (
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Locked &amp; Suspended Accounts</h3>
          {lockedLoading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : lockedUsers.length === 0 ? (
            <EmptyState compact description="Zero locked accounts. All user accounts are operating normally." />
          ) : (
            <div className="overflow-x-auto border border-(--border-default) rounded-xl">
              <table className="w-full text-left text-xs font-sans min-w-[700px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Account Name', 'Role', 'Failed Attempts', 'Locked Until', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {lockedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-(--text-primary)">{u.fullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{u.email || u.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--brand-gold)">{u.role}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-(--status-danger)">{u.failedLoginCount} attempts</td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{u.lockedUntil ? formatDate(u.lockedUntil) : 'Indefinite'}</td>
                      <td className="px-4 py-3">
                        <Button variant="primary" size="sm" icon={<Unlock className="w-3.5 h-3.5" />} onClick={() => setUnlockModalUser(u)}>
                          Unlock Account
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 4: PASSWORD & SESSION POLICIES ── */}
      {activeTab === 'policies' && (
        <Card hoverable={false} className="space-y-5">
          <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <Lock className="w-5 h-5 text-(--brand-gold)" />
            Password &amp; Session Security Policies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
            {[
              { label: 'Minimum Password Length', value: '8 characters', note: 'Enforced by backend regex' },
              { label: 'Failed Attempts Lock',    value: 'Lock after 5 failed attempts', note: 'Auto-unlockable by Admin' },
              { label: 'Access Token Lifetime',   value: '15 minutes', note: 'JWT short-lived access token' },
              { label: 'Refresh Token Lifetime',  value: '30 days', note: 'Stored in HttpOnly secure cookie' },
              { label: 'Session Inactivity',      value: '30 minutes', note: 'SESSION_INACTIVITY_TIMEOUT' },
              { label: 'Multi-Device Support',    value: 'Enabled', note: 'Separate session token for each device' },
            ].map(item => (
              <div key={item.label} className="p-3.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-muted)">{item.label}</p>
                <p className="text-(--text-primary) text-xs mt-1 font-bold">{item.value}</p>
                <p className="text-(--text-muted) text-[11px] mt-0.5">{item.note}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* REVOKE SESSION CONFIRM MODAL */}
      <ConfirmModal
        isOpen={Boolean(revokeModalSession)}
        onClose={() => setRevokeModalSession(null)}
        onConfirm={handleRevokeSession}
        title="Revoke User Session"
        message={`Are you sure you want to terminate the active session for "${revokeModalSession?.userFullName}" on ${revokeModalSession?.deviceInfo}? The user will be immediately logged out.`}
        confirmLabel="Revoke Session"
        variant="danger"
      />

      {/* UNLOCK USER CONFIRM MODAL */}
      <ConfirmModal
        isOpen={Boolean(unlockModalUser)}
        onClose={() => setUnlockModalUser(null)}
        onConfirm={handleUnlockUser}
        title="Unlock User Account"
        message={`Are you sure you want to unlock the account for "${unlockModalUser?.fullName}"? This will reset failed login attempts to 0 and allow immediate login.`}
        confirmLabel="Unlock Account"
        variant="warning"
      />

      {/* PRINT COMPLIANCE REPORT MODAL */}
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} title="Harmony College — Security Operations Report">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                <p className="text-[11px] text-(--text-muted)">Security Operations Center (SOC) Governance Report</p>
              </div>
              <div className="text-right font-mono text-[10px] text-(--text-muted)">
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">ACTIVE SESSIONS</span>
                  <p className="font-bold text-(--status-success)">{stats.activeSessions}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">LOCKED ACCOUNTS</span>
                  <p className="font-bold text-(--status-danger)">{stats.lockedAccounts}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">24H FAILED LOGINS</span>
                  <p className="font-bold text-(--status-warning)">{stats.failedLogins24h}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">MFA USERS</span>
                  <p className="font-bold text-(--brand-gold)">{stats.mfaEnabledCount}</p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-(--text-muted) italic">
              Official SOC Security Governance & Access Control Audit Report. Confidential.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrintOpen(false)}>Close</Button>
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Security Report</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
