'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';
import { securityEvents } from '../../../data/adminData2';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

const eventColor: Record<string, string> = {
  Critical: 'text-(--status-danger)', Warning: 'text-(--status-warning)', Info: 'text-(--status-info)',
};
const eventBg: Record<string, string> = {
  Critical: 'bg-(--status-danger-bg) border-(--status-danger-border)', Warning: 'bg-(--status-warning-bg) border-(--status-warning-border)', Info: 'bg-(--hover-overlay) border-(--border-subtle)',
};

export const AdminSecurityView: React.FC = () => {
  const [policyView, setPolicyView] = useState(false);
  const critical = securityEvents.filter(e => e.status === 'Critical');
  const warnings = securityEvents.filter(e => e.status === 'Warning');

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Security Center"
        subtitle={`${critical.length} critical · ${warnings.length} warnings`}
        icon={<Shield className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Lock className="w-4 h-4" />} onClick={() => setPolicyView(!policyView)}>Password Policies</Button>}
      />

      {/* Alert summary */}
      {critical.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-(--status-danger) shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-(--status-danger)">{critical.length} critical security event{critical.length > 1 ? 's' : ''} require attention</p>
            <p className="font-sans text-xs text-(--status-danger)/70 mt-0.5">{critical.map(e => e.details ?? e.type).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Event log */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-(--text-primary)">Security Event Log</h3>
        <div className="space-y-2">
          {securityEvents.map(event => (
            <div key={event.id} className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border ${eventBg[event.status]}`}>
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${event.status === 'Critical' ? 'bg-(--status-danger)' : event.status === 'Warning' ? 'bg-(--status-warning)' : 'bg-(--status-info)'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-sans text-xs font-semibold text-(--text-primary)">{event.type}</p>
                    <Badge variant={event.status === 'Critical' ? 'rose' : event.status === 'Warning' ? 'amber' : 'glass'} className="text-[10px]">{event.status}</Badge>
                  </div>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5">{event.userName} · {event.role}</p>
                  {event.details && <p className="font-sans text-xs text-(--text-faint) mt-0.5 italic">{event.details}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-(--text-faint)">
                    <span>{event.ip}</span><span>·</span><span>{event.device}</span><span>·</span><span>{event.location}</span>
                  </div>
                </div>
              </div>
              <p className="font-mono text-[10px] text-(--text-faint) shrink-0">{event.timestamp.split(' ').slice(0, 2).join(' ')}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Password policies panel */}
      {policyView && (
        <Card hoverable={false} className="space-y-5">
          <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2"><Lock className="w-5 h-5 text-(--brand-gold)" /> Password & Session Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
            {[
              { label: 'Minimum Length', value: '12 characters', note: 'Required for all roles' },
              { label: 'Complexity', value: 'Upper + Lower + Number + Symbol', note: '' },
              { label: 'Expiration', value: '90 days', note: 'Super Admin: 60 days' },
              { label: 'Password History', value: 'Last 10 passwords', note: 'Cannot reuse' },
              { label: '2FA', value: 'Required for Admins & Super Admins', note: 'Recommended for all' },
              { label: 'Session Timeout', value: '30 min (Super Admin: 15 min)', note: 'Inactivity' },
              { label: 'Failed Attempts', value: 'Lock after 3 attempts', note: 'Auto-unlock after 30 min' },
              { label: 'Concurrent Sessions', value: '3 max (Super Admin: 1)', note: '' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{item.label}</p>
                <p className="text-(--text-secondary) text-xs mt-1 font-semibold">{item.value}</p>
                {item.note && <p className="text-(--text-faint) text-[11px] mt-0.5">{item.note}</p>}
              </div>
            ))}
          </div>
          <div className="flex justify-end"><Button variant="primary" size="sm">Save Policy Changes</Button></div>
        </Card>
      )}
    </motion.div>
  );
};
