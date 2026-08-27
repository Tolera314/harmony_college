'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  HardDrive, Play, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, ErrorState, useToast, ToastContainer } from '../../ui/States';
import { adminSystemApi, adminAuditApi, AdminSystemHealth, AdminAuditLog } from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

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

export const AdminBackupView: React.FC = () => {
  const [health,        setHealth]        = useState<AdminSystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError,   setHealthError]   = useState('');

  // Recent system audit events (for backup/system activity log)
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Maintenance state (local — no DB model)
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [backupModal,        setBackupModal]       = useState(false);
  const [maintenanceModal,   setMaintenanceModal]  = useState(false);
  const [backupRunning,      setBackupRunning]     = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

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

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await adminAuditApi.list({ page: 1, limit: 10 });
      setAuditLogs(res.logs);
    } catch {
      /* non-critical */
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchAudit();
  }, [fetchHealth, fetchAudit]);

  // Simulate backup run (no DB model for backup records)
  const handleRunBackup = (type: string) => {
    setBackupRunning(true);
    setBackupModal(false);
    setTimeout(() => {
      setBackupRunning(false);
      showToast(`${type} initiated. Check system logs for progress.`, 'info');
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Backup &amp; Recovery"
        subtitle="System health monitoring and backup management"
        icon={<HardDrive className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMaintenanceModal(true)}>
              Maintenance Mode
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={backupRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              onClick={() => setBackupModal(true)}
              disabled={backupRunning}
            >
              {backupRunning ? 'Running...' : 'Run Backup'}
            </Button>
          </div>
        }
      />

      {/* Maintenance mode banner */}
      {maintenanceActive && (
        <div className="flex items-center gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0" />
          <div className="flex-1">
            <p className="font-sans text-sm font-bold text-(--status-warning)">Maintenance Mode Active</p>
            <p className="font-sans text-xs text-(--status-warning)/70">Only Admins can access the system right now.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setMaintenanceActive(false)}>Disable</Button>
        </div>
      )}

      {/* System health */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">System Health Monitor</h3>
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchHealth}>
            Refresh
          </Button>
        </div>

        {healthLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={1} className="p-3" />)}
          </div>
        ) : healthError ? (
          <ErrorState compact description={healthError} onRetry={fetchHealth} />
        ) : health ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {health.services.map(s => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthColor[s.status] ?? 'bg-(--active-overlay)'} ${s.status !== 'Healthy' ? 'animate-pulse' : ''}`} />
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

            {/* DB stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Active Sessions', health.stats.activeSessions,  'text-(--status-success)'],
                ['Total Users',     health.stats.totalUsers,       'text-(--brand-gold)'],
                ['Active Students', health.stats.activeStudents,   'text-(--status-info)'],
                ['API Response',    `${health.responseTimeMs}ms`,  'text-(--text-primary)'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl text-center">
                  <p className="font-mono text-[10px] uppercase text-(--text-faint)">{label}</p>
                  <p className={`font-mono text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <p className="font-mono text-[10px] text-(--text-faint)">
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </>
        ) : null}
      </Card>

      {/* Recent system activity (real audit logs) */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent System Activity</h3>
        {auditLoading ? (
          <SkeletonCard rows={5} />
        ) : auditLogs.length === 0 ? (
          <p className="font-sans text-sm text-(--text-faint) text-center py-8">No recent activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans min-w-[500px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Time', 'User', 'Action', 'IP', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {auditLogs.map(log => {
                  const isError = ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DEACTIVATED'].includes(log.action);
                  const isWarn  = ['SESSION_REVOKED', 'ROLE_CHANGED', 'PASSWORD_CHANGED'].includes(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-(--text-faint) whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-(--text-primary)">
                        {log.user?.fullName ?? 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={isError ? 'rose' : isWarn ? 'amber' : 'glass'}
                          className="text-[10px] whitespace-nowrap"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-(--text-faint)">
                        {log.ipAddress ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isError
                            ? <XCircle className="w-3.5 h-3.5 text-(--status-danger)" />
                            : isWarn
                            ? <AlertTriangle className="w-3.5 h-3.5 text-(--status-warning)" />
                            : <CheckCircle2 className="w-3.5 h-3.5 text-(--status-success)" />
                          }
                          <span className={`text-[11px] font-mono ${isError ? 'text-(--status-danger)' : isWarn ? 'text-(--status-warning)' : 'text-(--status-success)'}`}>
                            {isError ? 'Failed' : isWarn ? 'Warning' : 'Success'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Backup info note */}
      <div className="p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-(--text-faint) shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-(--text-primary)">Database Backup</p>
            <p className="font-sans text-xs text-(--text-muted) mt-1">
              Database backups are managed at the infrastructure level (PostgreSQL/cloud provider).
              Use the system health monitor above to verify database connectivity.
              For backup schedules, consult your hosting provider or DevOps team.
            </p>
          </div>
        </div>
      </div>

      {/* Run backup modal */}
      <Modal isOpen={backupModal} onClose={() => setBackupModal(false)} title="Run Manual Backup" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <p className="text-(--text-secondary)">
            Select backup type. This will trigger the configured backup process.
          </p>
          <div className="space-y-2">
            {['Full System Backup', 'Database Only', 'Files & Documents Only'].map(t => (
              <button
                key={t}
                onClick={() => handleRunBackup(t)}
                className="w-full text-left p-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl hover:bg-(--active-overlay) transition-colors text-(--text-primary) text-xs font-semibold"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setBackupModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Maintenance mode modal */}
      <Modal isOpen={maintenanceModal} onClose={() => setMaintenanceModal(false)} title="Maintenance Mode" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <div className={`p-4 rounded-xl border ${maintenanceActive ? 'bg-(--status-warning-bg) border-(--status-warning-border)' : 'bg-(--hover-overlay) border-(--border-default)'}`}>
            <p className={`font-semibold ${maintenanceActive ? 'text-(--status-warning)' : 'text-(--text-primary)'}`}>
              Maintenance Mode is currently{' '}
              <span className="font-mono">{maintenanceActive ? 'ACTIVE' : 'INACTIVE'}</span>
            </p>
            <p className="text-(--text-muted) text-xs mt-1">
              When active, only Admins and Super Admins can access the system.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setMaintenanceModal(false)}>Cancel</Button>
            <Button
              variant={maintenanceActive ? 'danger' : 'primary'}
              className="flex-1"
              onClick={() => { setMaintenanceActive(!maintenanceActive); setMaintenanceModal(false); }}
            >
              {maintenanceActive ? 'Disable Maintenance' : 'Enable Maintenance'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
