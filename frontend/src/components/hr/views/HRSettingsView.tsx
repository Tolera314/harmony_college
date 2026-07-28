'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings, User, Bell, Lock, Globe, Shield, Save, CheckCircle2 } from 'lucide-react';
import { HROfficerProfile } from '../../../types/hr';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

interface HRSettingsViewProps {
  profile: HROfficerProfile;
}

export const HRSettingsView: React.FC<HRSettingsViewProps> = ({ profile }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name, email: profile.email, phone: profile.phone, officeRoom: profile.officeRoom,
  });
  const [notifications, setNotifications] = useState({
    leaveAlerts: true, payrollAlerts: true, performanceAlerts: true,
    contractAlerts: true, onboardingAlerts: true, systemAlerts: false,
  });

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const sections = [
    { id: 'profile',       label: 'HR Profile',      icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',   icon: <Bell className="w-4 h-4" /> },
    { id: 'security',      label: 'Password',        icon: <Lock className="w-4 h-4" /> },
    { id: 'language',      label: 'Language',        icon: <Globe className="w-4 h-4" /> },
    { id: 'sessions',      label: 'Active Sessions', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Settings" subtitle="Manage your account and HR portal preferences" icon={<Settings className="w-5 h-5" />} />

      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl font-sans text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Changes saved successfully.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nav */}
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${activeSection === s.id ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'}`}>
              <span className={activeSection === s.id ? 'text-(--brand-gold)' : 'text-(--text-faint)'}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                <User className="w-5 h-5" style={{ color: "var(--brand-gold)" }} /> HR Officer Profile
              </h3>
              <div className="flex items-center gap-4">
                <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E9C349]/40" />
                <div>
                  <p className="font-serif text-base font-bold" style={{ color: "var(--text-primary)" }}>{profile.title}</p>
                  <p className="font-sans text-xs" style={{ color: "var(--text-muted)" }}>{profile.department}</p>
                  <Badge variant="gold" className="mt-1">{profile.employeeId}</Badge>
                </div>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  <Input label="Employee ID" value={profile.employeeId} disabled className="opacity-50 cursor-not-allowed" />
                  <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  <Input label="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  <Input label="Office Room" value={formData.officeRoom} onChange={e => setFormData({ ...formData, officeRoom: e.target.value })} />
                  <Input label="Department" value={profile.department} disabled className="opacity-50 cursor-not-allowed" />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />}>Save Changes</Button>
                </div>
              </form>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                <Bell className="w-5 h-5" style={{ color: "var(--brand-gold)" }} /> Notification Preferences
              </h3>
              <div className="space-y-3">
                {Object.entries(notifications).map(([key, val]) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    leaveAlerts:       { title: 'Leave Request Alerts',       desc: 'Notified when employees submit or update leave requests.' },
                    payrollAlerts:     { title: 'Payroll Status Updates',     desc: 'Alerts when payroll moves between approval stages.' },
                    performanceAlerts: { title: 'Performance Review Alerts',  desc: 'Notified when reviews are due, overdue, or completed.' },
                    contractAlerts:    { title: 'Contract Expiry Alerts',     desc: 'Alert 60 days before any employee contract expires.' },
                    onboardingAlerts:  { title: 'Onboarding Updates',         desc: 'Progress updates on active onboarding workflows.' },
                    systemAlerts:      { title: 'System Maintenance Alerts',  desc: 'Scheduled downtime and system update notifications.' },
                  };
                  const item = labels[key];
                  return (
                    <label key={key} className="flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-colors" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
                      <div>
                        <p className="font-sans text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                        <p className="font-sans text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                      </div>
                      <input type="checkbox" checked={val} onChange={e => setNotifications({ ...notifications, [key]: e.target.checked })}
                        className="w-5 h-5 accent-[#E9C349] cursor-pointer" />
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }} icon={<Save className="w-4 h-4" />}>
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                <Lock className="w-5 h-5" style={{ color: "var(--brand-gold)" }} /> Password & Security
              </h3>
              <div className="space-y-4">
                <Input label="Current Password" type="password" placeholder="Enter current password" />
                <Input label="New Password" type="password" placeholder="At least 12 characters" />
                <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
              </div>
              <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                <p className="font-sans text-xs text-amber-300 leading-relaxed">Passwords must be at least 12 characters with uppercase, lowercase, numbers, and symbols.</p>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />}>Update Password</Button>
              </div>
            </Card>
          )}

          {activeSection === 'language' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                <Globe className="w-5 h-5" style={{ color: "var(--brand-gold)" }} /> Language & Region
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Display Language</label>
                  <select className="ds-input w-full px-4 py-3 rounded-xl font-sans text-sm focus:outline-none">
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>English (US)</option>
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>Amharic (አማርኛ)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Timezone</label>
                  <select className="ds-input w-full px-4 py-3 rounded-xl font-sans text-sm focus:outline-none">
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>Africa/Addis_Ababa (EAT, UTC+3)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />}>Save</Button>
              </div>
            </Card>
          )}

          {activeSection === 'sessions' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                <Shield className="w-5 h-5" style={{ color: "var(--brand-gold)" }} /> Active Sessions
              </h3>
              {[
                { device: 'MacBook Pro — Chrome 126', location: 'Addis Ababa, ET', time: 'Current session', current: true },
                { device: 'iPhone 15 — Safari',       location: 'Addis Ababa, ET', time: '3 hours ago',    current: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-2xl" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-subtle)" }}>
                  <div>
                    <p className="font-sans text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{s.device}</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.location} · {s.time}</p>
                  </div>
                  {s.current ? <Badge variant="emerald">Current</Badge> : <Button variant="danger" size="sm">Revoke</Button>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
