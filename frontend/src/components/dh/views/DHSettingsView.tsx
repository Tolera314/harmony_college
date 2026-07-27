'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings, User, Bell, Lock, Monitor, Globe, Shield, CheckCircle2, Save } from 'lucide-react';
import { DHProfile } from '../../../types/department';
import { DHPageHeader } from '../DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

interface DHSettingsViewProps {
  profile: DHProfile;
}

export const DHSettingsView: React.FC<DHSettingsViewProps> = ({ profile }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name, email: profile.email, phone: profile.phone,
    officeRoom: profile.officeRoom, title: profile.title,
  });
  const [notifications, setNotifications] = useState({
    approvalAlerts: true, leaveAlerts: true, gpaAlerts: true,
    attendanceAlerts: true, capacityAlerts: false, auditAlerts: false,
  });

  const sections = [
    { id: 'profile',       label: 'Department Profile', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',      icon: <Bell className="w-4 h-4" /> },
    { id: 'security',      label: 'Password & Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'appearance',    label: 'Appearance',          icon: <Monitor className="w-4 h-4" /> },
    { id: 'language',      label: 'Language & Region',   icon: <Globe className="w-4 h-4" /> },
    { id: 'sessions',      label: 'Active Sessions',     icon: <Shield className="w-4 h-4" /> },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Settings" subtitle="Manage your account, preferences and security" icon={<Settings className="w-5 h-5" />} />

      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-(--status-success-bg) border border-emerald-800 text-(--status-success) rounded-2xl font-sans text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-(--status-success)" />
            Changes saved successfully.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-52 shrink-0 space-y-1" aria-label="Settings sections">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${
                activeSection === s.id ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'
              }`}>
              <span className={activeSection === s.id ? 'text-(--brand-gold)' : 'text-(--text-faint)'}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {activeSection === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <User className="w-5 h-5 text-(--brand-gold)" /> Department Head Profile
              </h3>
              <div className="flex items-center gap-4">
                <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-(--accent-gold-border)" />
                <div>
                  <p className="font-serif text-base font-bold text-(--text-primary)">{profile.name}</p>
                  <p className="font-sans text-xs text-(--text-muted)">{profile.title}</p>
                  <Badge variant="gold" className="mt-1">{profile.employeeId}</Badge>
                </div>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <Input label="Employee ID" value={profile.employeeId} disabled className="opacity-50 cursor-not-allowed" />
                  <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  <Input label="Office Room" value={formData.officeRoom} onChange={(e) => setFormData({ ...formData, officeRoom: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Department" value={profile.department} disabled className="opacity-50 cursor-not-allowed" />
                  <Input label="Academic Year" value={profile.academicYear} disabled className="opacity-50 cursor-not-allowed" />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />}>Save Changes</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Bell className="w-5 h-5 text-(--brand-gold)" /> Notification Preferences
              </h3>
              <div className="space-y-3">
                {Object.entries(notifications).map(([key, val]) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    approvalAlerts:    { title: 'Course Approval Alerts',       desc: 'Notified when a course is submitted for approval.' },
                    leaveAlerts:       { title: 'Faculty Leave Requests',        desc: 'Notified when faculty submit leave requests.' },
                    gpaAlerts:         { title: 'Department GPA Alerts',         desc: 'Alert when department GPA drops below threshold.' },
                    attendanceAlerts:  { title: 'Attendance Threshold Alerts',   desc: 'Alert when course/student attendance falls below 80%.' },
                    capacityAlerts:    { title: 'Course Capacity Warnings',      desc: 'Notify when a course exceeds 90% capacity.' },
                    auditAlerts:       { title: 'Audit Log Events',              desc: 'Receive digest of all audit log changes.' },
                  };
                  const item = labels[key];
                  return (
                    <label key={key} className="flex items-center justify-between p-4 bg-(--hover-overlay) rounded-2xl cursor-pointer border border-(--border-default) hover:bg-(--hover-overlay) transition-colors">
                      <div>
                        <p className="font-sans text-sm font-semibold text-(--text-primary)">{item.title}</p>
                        <p className="font-sans text-xs text-(--text-muted) mt-0.5">{item.desc}</p>
                      </div>
                      <input type="checkbox" checked={val} onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
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

          {/* Security */}
          {activeSection === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Lock className="w-5 h-5 text-(--brand-gold)" /> Password & Security
              </h3>
              <div className="space-y-4">
                <Input label="Current Password" type="password" placeholder="Enter current password" />
                <Input label="New Password" type="password" placeholder="At least 12 characters" />
                <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
              </div>
              <div className="p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl">
                <p className="font-sans text-xs text-(--status-warning) leading-relaxed">Passwords must be at least 12 characters, include uppercase, lowercase, numbers, and a symbol. Your session will remain active after a password change.</p>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />}>Update Password</Button>
              </div>
            </Card>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Monitor className="w-5 h-5 text-(--brand-gold)" /> Appearance
              </h3>
              <div className="p-5 bg-(--hover-overlay) border border-(--border-default) rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm font-bold text-(--text-primary)">Dark — Deep Obsidian</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-1">Official Harmony College dark theme. Recommended for reduced eye strain.</p>
                </div>
                <Badge variant="gold">Active</Badge>
              </div>
              <p className="font-sans text-xs text-(--text-faint)">Additional themes coming in a future release.</p>
            </Card>
          )}

          {/* Language */}
          {activeSection === 'language' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Globe className="w-5 h-5 text-(--brand-gold)" /> Language & Region
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Display Language</label>
                  <select className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                    <option className="bg-(--bg-card-solid)" value="en">English (US)</option>
                    <option className="bg-(--bg-card-solid)" value="am">Amharic (አማርኛ)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Timezone</label>
                  <select className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                    <option className="bg-(--bg-card-solid)">Africa/Addis_Ababa (EAT, UTC+3)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />}>Save</Button>
              </div>
            </Card>
          )}

          {/* Active Sessions */}
          {activeSection === 'sessions' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Shield className="w-5 h-5 text-(--brand-gold)" /> Active Sessions
              </h3>
              {[
                { device: 'MacBook Pro 16" — Chrome 126', location: 'Addis Ababa, ET', time: 'Current session', current: true },
                { device: 'iPhone 15 Pro — Safari', location: 'Addis Ababa, ET', time: '2 hours ago', current: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
                  <div>
                    <p className="font-sans text-sm font-semibold text-(--text-primary)">{s.device}</p>
                    <p className="font-sans text-xs text-(--text-muted) mt-0.5">{s.location} · {s.time}</p>
                  </div>
                  {s.current ? <Badge variant="emerald">Current</Badge> : (
                    <Button variant="danger" size="sm">Revoke</Button>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
