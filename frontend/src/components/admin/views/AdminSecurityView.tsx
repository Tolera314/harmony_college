'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';
import { securityEvents } from '../../../data/adminData2';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

const eventColor: Record<string, string> = {
  Critical: 'text-rose-400', Warning: 'text-amber-400', Info: 'text-sky-400',
};
const eventBg: Record<string, string> = {
  Critical: 'bg-rose-950/20 border-rose-800/30', Warning: 'bg-amber-950/20 border-amber-800/30', Info: 'bg-white/5 border-white/8',
};

export const AdminSecurityView: React.FC = () => {
  const [policyView, setPolicyView] = useState(false);
  const critical = securityEvents.filter(e => e.status === 'Critical');
  const warnings = securityEvents.filter(e => e.status === 'Warning');

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Security Center"
        subtitle={`${critical.length} critical · ${warnings.length} warnings`}
        icon={<Shield className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Lock className="w-4 h-4" />} onClick={() => setPolicyView(!policyView)}>Password Policies</Button>}
      />

      {/* Alert summary */}
      {critical.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-rose-950/30 border border-rose-800/40 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-semibold text-rose-300">{critical.length} critical security event{critical.length > 1 ? 's' : ''} require attention</p>
            <p className="font-sans text-xs text-rose-400/70 mt-0.5">{critical.map(e => e.details ?? e.type).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Event log */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Security Event Log</h3>
        <div className="space-y-2">
          {securityEvents.map(event => (
            <div key={event.id} className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border ${eventBg[event.status]}`}>
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${event.status === 'Critical' ? 'bg-rose-400' : event.status === 'Warning' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-sans text-xs font-semibold text-white">{event.type}</p>
                    <Badge variant={event.status === 'Critical' ? 'rose' : event.status === 'Warning' ? 'amber' : 'glass'} className="text-[10px]">{event.status}</Badge>
                  </div>
                  <p className="font-sans text-xs text-white/55 mt-0.5">{event.userName} · {event.role}</p>
                  {event.details && <p className="font-sans text-xs text-white/40 mt-0.5 italic">{event.details}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-white/30">
                    <span>{event.ip}</span><span>·</span><span>{event.device}</span><span>·</span><span>{event.location}</span>
                  </div>
                </div>
              </div>
              <p className="font-mono text-[10px] text-white/30 shrink-0">{event.timestamp.split(' ').slice(0, 2).join(' ')}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Password policies panel */}
      {policyView && (
        <Card hoverable={false} className="space-y-5">
          <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-[#E9C349]" /> Password & Session Policies</h3>
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
              <div key={item.label} className="p-3 bg-white/5 rounded-xl border border-white/8">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
                <p className="text-white/80 text-xs mt-1 font-semibold">{item.value}</p>
                {item.note && <p className="text-white/40 text-[11px] mt-0.5">{item.note}</p>}
              </div>
            ))}
          </div>
          <div className="flex justify-end"><Button variant="primary" size="sm">Save Policy Changes</Button></div>
        </Card>
      )}
    </motion.div>
  );
};
