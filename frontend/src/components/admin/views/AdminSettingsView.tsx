'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings, User, Lock, Shield, Save, CheckCircle2 } from 'lucide-react';
import { AdminProfile } from '../../../types/admin';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

interface AdminSettingsViewProps { profile: AdminProfile; }

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ profile }) => {
  const [section, setSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: profile.name, email: profile.email });

  const sections = [
    { id: 'profile', label: 'Admin Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Password & 2FA', icon: <Lock className="w-4 h-4" /> },
    { id: 'sessions', label: 'Active Sessions', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Settings" subtitle="Super Admin account settings" icon={<Settings className="w-5 h-5" />} />
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-(--status-success-bg) border border-emerald-800 text-(--status-success) rounded-2xl font-sans text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Saved.
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${section === s.id ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          {section === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4"><User className="w-5 h-5 text-(--brand-gold)" /> Super Admin Profile</h3>
              <div className="flex items-center gap-4">
                <img src={profile.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-(--accent-gold-border)" />
                <div>
                  <p className="font-serif text-base font-bold text-(--text-primary)">{profile.title}</p>
                  <Badge variant="gold" className="mt-1">{profile.adminId}</Badge>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-(--status-success)" />
                    <span className="font-mono text-[10px] text-(--text-faint)">2FA Active · Last login {profile.lastLogin}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input label="Admin ID" value={profile.adminId} disabled className="opacity-50 cursor-not-allowed" />
                <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input label="Role" value={profile.role} disabled className="opacity-50 cursor-not-allowed" />
              </div>
              <div className="flex justify-end"><Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Save Changes</Button></div>
            </Card>
          )}
          {section === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4"><Lock className="w-5 h-5 text-(--brand-gold)" /> Password & 2FA</h3>
              <div className="p-4 bg-(--status-success-bg) border border-(--status-success-border) rounded-xl flex items-center gap-3">
                <Shield className="w-5 h-5 text-(--status-success) shrink-0" />
                <div>
                  <p className="font-sans text-sm font-semibold text-(--status-success)">Two-Factor Authentication is ENABLED</p>
                  <p className="font-sans text-xs text-(--status-success)/70 mt-0.5">Mandatory for Super Admin accounts. Cannot be disabled.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input label="Current Password" type="password" placeholder="Enter current password" />
                <Input label="New Password" type="password" placeholder="At least 12 characters" />
                <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
              </div>
              <div className="flex justify-end"><Button variant="primary" icon={<Save className="w-4 h-4" />}>Update Password</Button></div>
            </Card>
          )}
          {section === 'sessions' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4"><Shield className="w-5 h-5 text-(--brand-gold)" /> Active Sessions</h3>
              <div className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
                <div>
                  <p className="font-sans text-sm font-semibold text-(--text-primary)">MacBook Pro 16" — Chrome 126</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5">{profile.lastLoginIp} · {profile.lastLoginDevice}</p>
                </div>
                <Badge variant="emerald">Current</Badge>
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
