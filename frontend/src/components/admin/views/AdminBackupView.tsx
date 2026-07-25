'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HardDrive, Play, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { backupRecords, systemHealth, maintenanceConfig } from '../../../data/adminData2';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

const healthColor: Record<string, string> = { Healthy: 'bg-emerald-400', Degraded: 'bg-amber-400', Down: 'bg-rose-500' };
const healthText: Record<string, string>  = { Healthy: 'text-emerald-400', Degraded: 'text-amber-400', Down: 'text-rose-400' };

export const AdminBackupView: React.FC = () => {
  const [backupModal, setBackupModal] = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(maintenanceConfig.enabled);
  const lastSuccess = backupRecords.find(b => b.status === 'Completed');

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Backup & Recovery"
        subtitle={`Last successful: ${lastSuccess?.completedAt ?? 'Unknown'}`}
        icon={<HardDrive className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMaintenanceModal(true)}>Maintenance Mode</Button>
            <Button variant="primary" size="sm" icon={<Play className="w-4 h-4" />} onClick={() => setBackupModal(true)}>Run Backup</Button>
          </div>
        }
      />

      {/* System health */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">System Health Monitor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {systemHealth.map(s => (
            <div key={s.name} className="flex items-center justify-between p-3 bg-white/5 border border-white/8 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthColor[s.status]} ${s.status === 'Healthy' ? 'animate-none' : 'animate-pulse'}`} />
                <div className="min-w-0">
                  <p className="font-sans text-xs font-semibold text-white truncate">{s.name}</p>
                  <p className="font-mono text-[10px] text-white/30">{s.uptime} uptime</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className={`font-mono text-xs font-bold ${healthText[s.status]}`}>{s.status}</p>
                <p className="font-mono text-[10px] text-white/30">{s.responseTime}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Storage warning */}
      <div className="flex items-center gap-3 p-4 bg-amber-950/25 border border-amber-800/35 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="font-sans text-sm font-semibold text-amber-300">Storage Warning: 89% capacity used</p>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-amber-400 rounded-full" initial={{ width: 0 }} animate={{ width: '89%' }} transition={{ duration: 0.8 }} />
          </div>
        </div>
        <Button variant="secondary" size="sm">Manage Storage</Button>
      </div>

      {/* Backup history */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Backup History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>{['Type', 'Status', 'Size', 'Duration', 'Started', 'Completed', 'Triggered By'].map(h => (
                <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-white/50">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {backupRecords.map(b => (
                <tr key={b.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3"><Badge variant="glass" className="text-[10px]">{b.type}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {b.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : b.status === 'Failed' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
                      <span className={b.status === 'Completed' ? 'text-emerald-400' : b.status === 'Failed' ? 'text-rose-400' : 'text-amber-400'}>{b.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/60">{b.size}</td>
                  <td className="px-4 py-3 font-mono text-white/60">{b.duration}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/45">{b.startedAt}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/45">{b.completedAt ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60">{b.triggeredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Run backup modal */}
      <Modal isOpen={backupModal} onClose={() => setBackupModal(false)} title="Run Manual Backup" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <p className="text-white/70">Select backup type to initiate a manual backup.</p>
          <div className="space-y-2">
            {['Full System Backup', 'Database Only', 'Files & Documents Only'].map(t => (
              <button key={t} className="w-full text-left p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white text-xs font-semibold">{t}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setBackupModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<Play className="w-4 h-4" />} onClick={() => setBackupModal(false)}>Start Backup</Button>
          </div>
        </div>
      </Modal>

      {/* Maintenance mode modal */}
      <Modal isOpen={maintenanceModal} onClose={() => setMaintenanceModal(false)} title="Maintenance Mode" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <div className={`p-4 rounded-xl border ${maintenanceActive ? 'bg-amber-950/30 border-amber-800/40' : 'bg-white/5 border-white/10'}`}>
            <p className={`font-semibold ${maintenanceActive ? 'text-amber-300' : 'text-white'}`}>
              Maintenance Mode is currently <span>{maintenanceActive ? 'ACTIVE' : 'INACTIVE'}</span>
            </p>
            <p className="text-white/50 text-xs mt-1">When active, only Super Admins can access the system.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setMaintenanceModal(false)}>Cancel</Button>
            <Button variant={maintenanceActive ? 'danger' : 'primary'} className="flex-1" onClick={() => { setMaintenanceActive(!maintenanceActive); setMaintenanceModal(false); }}>
              {maintenanceActive ? 'Disable Maintenance' : 'Enable Maintenance'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
