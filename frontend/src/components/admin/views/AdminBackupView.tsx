'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  HardDrive, Play, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Clock,
  Download, Printer, FileText, Database, ShieldAlert
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, SkeletonTable, EmptyState, ErrorState, useToast, ToastContainer } from '../../ui/States';
import {
  adminBackupApi, adminSystemApi, adminAuditApi,
  AdminBackupStats, AdminBackupSnapshot, AdminSystemHealth, AdminAuditLog
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-xl font-mono font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const healthColor: Record<string, string> = {
  Healthy:  'bg-(--status-success)',
  Degraded: 'bg-(--status-warning)',
  Down:     'bg-(--status-danger)',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminBackupView: React.FC = () => {
  const [stats, setStats]               = useState<AdminBackupStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [snapshots, setSnapshots]       = useState<AdminBackupSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState('');

  const [health, setHealth]             = useState<AdminSystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Modals & Action states
  const [backupModal, setBackupModal]   = useState(false);
  const [backupType, setBackupType]     = useState<'FULL' | 'DATABASE' | 'DOCUMENTS'>('FULL');
  const [backupRunning, setBackupRunning] = useState(false);

  const [maintModal, setMaintModal]     = useState(false);
  const [maintReason, setMaintReason]   = useState('');
  const [maintWorking, setMaintWorking] = useState(false);

  const [printOpen, setPrintOpen]       = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Backup Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const st = await adminBackupApi.getStats();
      setStats(st);
    } catch {
      // Graceful fallback
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch Snapshots
  const fetchSnapshots = useCallback(async () => {
    setSnapshotsLoading(true); setSnapshotsError('');
    try {
      const list = await adminBackupApi.listSnapshots();
      setSnapshots(list);
    } catch (e: any) {
      setSnapshotsError(e.message ?? 'Failed to load backup snapshots');
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  // ── Fetch Health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const h = await adminSystemApi.health();
      setHealth(h);
    } catch {
      // Graceful fallback
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchSnapshots();
    fetchHealth();
  }, [fetchStats, fetchSnapshots, fetchHealth]);

  // ── Trigger Manual Backup
  const handleTriggerBackup = async () => {
    setBackupRunning(true);
    try {
      const snap = await adminBackupApi.triggerBackup(backupType);
      showToast(`Snapshot created successfully: ${snap.filename} (${formatBytes(snap.sizeBytes)})`, 'success');
      setBackupModal(false);
      fetchStats();
      fetchSnapshots();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to trigger backup', 'error');
    } finally {
      setBackupRunning(false);
    }
  };

  // ── Toggle Maintenance Mode
  const handleToggleMaintenance = async () => {
    if (!stats) return;
    setMaintWorking(true);
    const targetState = !stats.maintenanceActive;
    try {
      await adminBackupApi.setMaintenance(targetState, maintReason || undefined);
      showToast(`Maintenance mode ${targetState ? 'ENABLED' : 'DISABLED'}`, targetState ? 'warning' : 'success');
      setMaintModal(false);
      fetchStats();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update maintenance mode', 'error');
    } finally {
      setMaintWorking(false);
    }
  };

  // ── Export CSV Handler
  const handleExportCSV = () => {
    if (snapshots.length === 0) return;
    const csvRows = ['Snapshot ID,Filename,Type,Size (Bytes),Status,Created At'];
    snapshots.forEach(s => {
      csvRows.push(`"${s.id}","${s.filename}","${s.type}",${s.sizeBytes},"${s.status}","${formatDate(s.createdAt)}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Harmony_College_Backup_Snapshots_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Exported backup history to CSV', 'success');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Disaster Recovery & Backup Center"
        subtitle="PostgreSQL database snapshot generation, asset archival, and maintenance governance"
        icon={<HardDrive className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMaintModal(true)}>
              Maintenance Mode
            </Button>
            <Button variant="primary" size="sm" icon={<Play className="w-4 h-4" />} onClick={() => setBackupModal(true)}>
              Run Manual Backup
            </Button>
            <Button variant="ghost" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setPrintOpen(true)}>
              Print DR Report
            </Button>
          </div>
        }
      />

      {/* Maintenance Mode Banner */}
      {stats?.maintenanceActive && (
        <div className="flex items-center gap-3 p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0" />
          <div className="flex-1">
            <p className="font-sans text-sm font-bold text-(--status-warning)">System Maintenance Mode Active</p>
            <p className="font-sans text-xs text-(--status-warning)/70">
              Only Admin and Super Admin users can access the system right now. Reason: {stats.maintenanceReason || 'Scheduled Maintenance'}.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setMaintModal(true)}>Configure</Button>
        </div>
      )}

      {/* Infrastructure KPI Ribbon */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPI label="Total Backup Snapshots" value={stats.totalSnapshots}     color="text-(--brand-gold)" />
          <MiniKPI label="Total Storage Used"      value={`${stats.totalSizeMB} MB`} color="text-(--text-primary)" />
          <MiniKPI label="Last Backup Date"        value={formatDate(stats.lastBackupAt)} color="text-(--status-success)" />
          <MiniKPI label="System Access Mode"     value={stats.maintenanceActive ? 'MAINTENANCE' : 'ONLINE'} color={stats.maintenanceActive ? 'text-(--status-warning)' : 'text-(--status-success)'} />
        </div>
      )}

      {/* System Health Monitor */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">Database &amp; Storage Connectivity Health</h3>
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => { fetchHealth(); fetchStats(); }}>
            Refresh Health
          </Button>
        </div>

        {healthLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
        ) : health && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {health.services.map(s => (
              <div key={s.name} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthColor[s.status] ?? 'bg-(--active-overlay)'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-(--text-primary) truncate">{s.name}</p>
                    <p className="font-mono text-[10px] text-(--text-muted)">{s.detail}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2 font-mono">
                  <p className="text-xs font-bold text-(--status-success)">{s.status}</p>
                  <p className="text-[10px] text-(--text-muted)">{s.responseTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Backup Snapshots History Table */}
      <Card hoverable={false} className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Backup Snapshots History</h3>
            <p className="font-sans text-xs text-(--text-muted)">
              Encrypted database export files stored in `uploads/backups/` directory
            </p>
          </div>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
            Export History CSV
          </Button>
        </div>

        {snapshotsLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : snapshotsError ? (
          <ErrorState compact description={snapshotsError} onRetry={fetchSnapshots} />
        ) : snapshots.length === 0 ? (
          <EmptyState compact description="No manual or scheduled backup snapshots generated yet. Click 'Run Manual Backup' above." />
        ) : (
          <div className="overflow-x-auto border border-(--border-default) rounded-xl">
            <table className="w-full text-left text-xs font-sans min-w-[700px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Snapshot Filename', 'Type', 'Size', 'Status', 'Generated Date', 'Download'].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase text-(--text-muted)">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {snapshots.map(s => (
                  <tr key={s.id} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-(--brand-gold)">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-(--brand-gold) shrink-0" />
                        <span>{s.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.type === 'FULL' ? 'emerald' : s.type === 'DATABASE' ? 'gold' : 'glass'}>{s.type}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatBytes(s.sizeBytes)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'COMPLETED' ? 'emerald' : 'rose'}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-muted)">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`http://localhost:4000/api/admin/backup/download/${s.id}`}
                        download={s.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hover-overlay) border border-(--border-default) text-xs font-sans font-semibold text-(--brand-gold) hover:bg-(--active-overlay) transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* RUN MANUAL BACKUP MODAL */}
      <Modal isOpen={backupModal} onClose={() => setBackupModal(false)} title="Trigger Manual Database Backup">
        <div className="space-y-4 font-sans text-xs">
          <p className="text-(--text-muted)">
            Select snapshot scope. A new JSON database dump containing all active college tables will be exported into `uploads/backups/`.
          </p>

          <div className="space-y-2">
            {[
              { id: 'FULL' as const, label: 'Full System Snapshot', desc: 'Exports Users, Students, Financial Accounts, HR Employees, & Offerings' },
              { id: 'DATABASE' as const, label: 'Database Ledger Only', desc: 'Exports Financial Accounts & Transaction Records' },
              { id: 'DOCUMENTS' as const, label: 'Asset Metadata Only', desc: 'Exports Student & HR Document URL records' },
            ].map(t => (
              <div
                key={t.id}
                onClick={() => setBackupType(t.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  backupType === t.id
                    ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border)'
                    : 'bg-(--hover-overlay) border-(--border-subtle) hover:border-(--border-default)'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-(--text-primary)">{t.label}</span>
                  <Badge variant={backupType === t.id ? 'gold' : 'glass'}>{t.id}</Badge>
                </div>
                <p className="text-[11px] text-(--text-muted) mt-1">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setBackupModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" icon={backupRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} onClick={handleTriggerBackup} disabled={backupRunning}>
              {backupRunning ? 'Exporting...' : 'Generate Backup Snapshot'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MAINTENANCE MODE CONFIGURE MODAL */}
      <Modal isOpen={maintModal} onClose={() => setMaintModal(false)} title="Configure System Maintenance Mode">
        <div className="space-y-4 font-sans text-xs">
          <div className={`p-4 rounded-xl border ${stats?.maintenanceActive ? 'bg-(--status-warning-bg) border-(--status-warning-border)' : 'bg-(--hover-overlay) border-(--border-default)'}`}>
            <p className={`font-bold ${stats?.maintenanceActive ? 'text-(--status-warning)' : 'text-(--text-primary)'}`}>
              System Access Status: {stats?.maintenanceActive ? 'MAINTENANCE MODE ACTIVE' : 'SYSTEM ONLINE & PUBLIC'}
            </p>
            <p className="text-(--text-muted) text-[11px] mt-1">
              When Maintenance Mode is active, student, instructor, and registrar logins are suspended.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-mono text-(--text-muted) uppercase">Maintenance Notification Reason</label>
            <input
              type="text"
              placeholder="e.g. Scheduled Infrastructure Maintenance (12:00 PM - 02:00 PM)"
              value={maintReason}
              onChange={e => setMaintReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-(--hover-overlay) border border-(--border-default) text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setMaintModal(false)}>Cancel</Button>
            <Button
              variant={stats?.maintenanceActive ? 'danger' : 'primary'}
              size="sm"
              icon={maintWorking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              onClick={handleToggleMaintenance}
              disabled={maintWorking}
            >
              {stats?.maintenanceActive ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* PRINT DR COMPLIANCE REPORT MODAL */}
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} title="Harmony College — Disaster Recovery Governance Report">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                <p className="text-[11px] text-(--text-muted)">Disaster Recovery & Infrastructure Backup Report</p>
              </div>
              <div className="text-right font-mono text-[10px] text-(--text-muted)">
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">TOTAL SNAPSHOTS</span>
                  <p className="font-bold text-(--text-primary)">{stats.totalSnapshots}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">STORAGE USED</span>
                  <p className="font-bold text-(--brand-gold)">{stats.totalSizeMB} MB</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">LAST BACKUP</span>
                  <p className="font-bold text-(--status-success)">{formatDate(stats.lastBackupAt)}</p>
                </div>
                <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                  <span className="text-(--text-muted)">ACCESS MODE</span>
                  <p className="font-bold text-(--status-info)">{stats.maintenanceActive ? 'MAINTENANCE' : 'ONLINE'}</p>
                </div>
              </div>
            )}

            <div className="border-t border-b border-(--border-subtle) py-3 space-y-2 font-mono text-[11px]">
              <span className="text-(--text-muted) uppercase">Snapshot Manifest Head</span>
              {snapshots.slice(0, 3).map(s => (
                <div key={s.id} className="flex justify-between">
                  <span>{s.filename} ({formatBytes(s.sizeBytes)})</span>
                  <span className="text-(--text-muted)">{formatDate(s.createdAt)}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-(--text-muted) italic">
              Official IT Infrastructure & Disaster Recovery Compliance Audit Report. Confidential.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrintOpen(false)}>Close</Button>
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print DR Report</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
