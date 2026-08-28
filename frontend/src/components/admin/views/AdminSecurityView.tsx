'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Shield, AlertTriangle, Lock, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SkeletonTable, SkeletonCard, ErrorState } from '../../ui/States';
import {
  adminAuditApi, adminSystemApi, AdminAuditLog, AdminSystemHealth,
  ROLE_DISPLAY,
} from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

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

const healthColor: Record<string, string> = {
  Healthy:  'bg-(--status-success)',
  Degraded: 'bg-(--status-warning)',
  Down:     'bg-(--status-danger)',
};
const healthTextColor: Record<string, string> = {
  Healthy:  'text-(--status-success)',
  Degraded: 'text-(--status-warning)',
  Down:     'text-(--status-danger)',
};

// ── component ─────────────────────────────────────────────────────────────────

export const AdminSecurityView: React.FC = () => {
  // ── audit logs
  const [logs, setLogs]           = useState<AdminAuditLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // ── system health
  const [health, setHealth]         = useState<AdminSystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError]   = useState('');
  const [policyView, setPolicyView] = useState(false);

  // ── fetch security events (audit logs filtered to security actions)
  const fetchSecurityLogs = useCallback(async (p: number, action: string) => {
    setLogsLoading(true); setLogsError('');
    try {
      // If a specific action is selected, filter by it; otherwise fetch recent login-related events
      const res = await adminAuditApi.list({
        page: p,
        limit: 15,
        action: action || undefined,
      });
      setLogs(res.logs); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setLogsError(e.message ?? 'Failed to load security events');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // ── fetch system health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true); setHealthError('');
    try {
      const data = await adminSystemApi.health();
      setHealth(data);
    } catch (e: any) {
      setHealthError(e.message ?? 'Health check failed');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { fetchSecurityLogs(page, actionFilter); }, [page, actionFilter, fetchSecurityLogs]);
  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // ── derived counts for the header
  const criticalCount = logs.filter(l => actionSeverity(l.action) === 'Critical').length;
  const warningCount  = logs.filter(l => actionSeverity(l.action) === 'Warning').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Security Center"
        subtitle={`${criticalCount} critical · ${warningCount} warnings this page`}
        icon={<Shield className="w-5 h-5" />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<Lock className="w-4 h-4" />}
            onClick={() => setPolicyView(!policyView)}
          >
            Password Policies
          </Button>
        }
      />

      {/* Critical alert banner */}
      {!logsLoading && criticalCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-danger) shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-(--status-danger)">
              {criticalCount} critical security event{criticalCount > 1 ? 's' : ''} detected this page
            </p>
            <p className="font-sans text-xs text-(--status-danger)/70 mt-0.5">
              Review failed logins, locked accounts, and suspended users below.
            </p>
          </div>
        </div>
      )}

      {/* System health */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">System Health</h3>
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchHealth}>
            Refresh
          </Button>
        </div>
        {healthLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={1} className="p-3" />)}
          </div>
        ) : healthError ? (
          <p className="font-sans text-xs text-(--status-danger)">{healthError}</p>
        ) : health ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {health.services.map(s => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthColor[s.status] ?? 'bg-(--active-overlay)'}`} />
                    <div className="min-w-0">
                      <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{s.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{s.detail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`font-mono text-xs font-bold ${healthTextColor[s.status] ?? 'text-(--text-muted)'}`}>{s.status}</p>
                    <p className="font-mono text-[10px] text-(--text-faint)">{s.responseTime}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                ['Active Sessions', health.stats.activeSessions,   'text-(--status-success)'],
                ['Total Users',     health.stats.totalUsers,        'text-(--brand-gold)'],
                ['Active Students', health.stats.activeStudents,    'text-(--status-info)'],
                ['Active Offerings',health.stats.activeOfferings,   'text-(--status-warning)'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl text-center">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{label}</p>
                  <p className={`font-mono text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      {/* Security Event Log (real audit data) */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Security Event Log</h3>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
          >
            <option className="bg-(--bg-card-solid)" value="">All Events</option>
            {SECURITY_ACTIONS.map(a => (
              <option key={a} className="bg-(--bg-card-solid)" value={a}>{a}</option>
            ))}
          </select>
        </div>

        {logsLoading ? <SkeletonTable rows={8} cols={5} /> : logsError ? (
          <ErrorState compact description={logsError}
            onRetry={() => fetchSecurityLogs(page, actionFilter)} />
        ) : logs.length === 0 ? (
          <p className="font-sans text-sm text-(--text-faint) text-center py-8">No security events recorded.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const sev = actionSeverity(log.action);
              const bgCls =
                sev === 'Critical' ? 'bg-(--status-danger-bg) border-(--status-danger-border)' :
                sev === 'Warning'  ? 'bg-(--status-warning-bg) border-(--status-warning-border)' :
                                     'bg-(--hover-overlay) border-(--border-subtle)';
              const dotCls =
                sev === 'Critical' ? 'bg-(--status-danger)' :
                sev === 'Warning'  ? 'bg-(--status-warning)' : 'bg-(--status-info)';
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
                        <Badge variant={actionBadge(log.action)} className="text-[10px] whitespace-nowrap">
                          {log.action}
                        </Badge>
                        <Badge variant={sev === 'Critical' ? 'rose' : sev === 'Warning' ? 'amber' : 'glass'} className="text-[10px]">
                          {sev}
                        </Badge>
                      </div>
                      <p className="font-sans text-xs text-(--text-muted) mt-0.5">
                        {log.user?.fullName ?? 'System'} · {log.user?.role ? (ROLE_DISPLAY[log.user.role] ?? log.user.role) : '—'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-(--text-faint)">
                        {log.ipAddress && <span>{log.ipAddress}</span>}
                        {log.user?.email && <span>·</span>}
                        {log.user?.email && <span>{log.user.email}</span>}
                      </div>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-(--text-faint) shrink-0 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!logsLoading && !logsError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="font-sans text-xs text-(--text-faint)">{total} events · Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="secondary" size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Password Policy panel */}
      {policyView && (
        <Card hoverable={false} className="space-y-5">
          <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <Lock className="w-5 h-5 text-(--brand-gold)" />
            Password &amp; Session Policies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
            {[
              { label: 'Minimum Length',      value: '8 characters',                        note: 'Enforced by backend' },
              { label: 'Complexity',           value: 'Letters + Numbers required',           note: 'No special chars enforced yet' },
              { label: 'Failed Attempts Lock', value: 'Lock after 5 attempts',                note: 'Auto-unlockable by Admin' },
              { label: 'Password History',     value: 'No history enforcement yet',           note: 'Configurable in future release' },
              { label: 'Session Inactivity',   value: '30 min (configurable via env)',        note: 'SESSION_INACTIVITY_TIMEOUT' },
              { label: 'Access Token TTL',     value: '15 minutes',                           note: 'ACCESS_TOKEN_EXPIRES_IN' },
              { label: 'Refresh Token TTL',    value: '30 days',                              note: 'REFRESH_TOKEN_EXPIRES_IN' },
              { label: 'Multi-Device',         value: 'Multiple sessions supported',          note: 'Each device gets own token' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{item.label}</p>
                <p className="text-(--text-secondary) text-xs mt-1 font-semibold">{item.value}</p>
                {item.note && <p className="text-(--text-faint) text-[11px] mt-0.5">{item.note}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};
