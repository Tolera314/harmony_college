'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings, User, Bell, Lock, Monitor, Globe, Shield, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { type HoDProfile, hodProfileApi } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

interface DHSettingsViewProps {
  profile: HoDProfile | null;
}

export const DHSettingsView: React.FC<DHSettingsViewProps> = ({ profile }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved,         setSaved]         = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');

  // Password fields
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const dhr = profile?.departmentHeadRecord;

  const sections = [
    { id: 'profile',       label: 'Department Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security',      label: 'Password & Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'appearance',    label: 'Appearance',          icon: <Monitor className="w-4 h-4" /> },
    { id: 'language',      label: 'Language & Region',   icon: <Globe className="w-4 h-4" /> },
  ];

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwData.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setPwSaving(true);
    try {
      await hodProfileApi.changePassword(pwData);
      setPwSaved(true);
      setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSaved(false), 4000);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Settings" subtitle="Manage your account, preferences and security" icon={<Settings className="w-5 h-5" />} />

      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-(--status-success-bg) border border-emerald-800 text-(--status-success) rounded-2xl font-sans text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Changes saved successfully.
          </motion.div>
        )}
        {pwSaved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-(--status-success-bg) border border-emerald-800 text-(--status-success) rounded-2xl font-sans text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Password updated successfully.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-52 shrink-0 space-y-1" aria-label="Settings sections">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${activeSection === s.id ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'}`}>
              <span className={activeSection === s.id ? 'text-(--brand-gold)' : 'text-(--text-faint)'}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeSection === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <User className="w-5 h-5 text-(--brand-gold)" /> Department Head Profile
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-3xl text-(--brand-gold)">
                    {profile?.fullName?.charAt(0) ?? 'H'}
                  </span>
                </div>
                <div>
                  <p className="font-serif text-base font-bold text-(--text-primary)">{profile?.fullName ?? '…'}</p>
                  <p className="font-sans text-xs text-(--text-muted)">{dhr?.title}</p>
                  <Badge variant="gold" className="mt-1">{dhr?.employeeId ?? '…'}</Badge>
                </div>
              </div>

              {/* Read-only info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Full Name</label>
                  <p className="px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary)">{profile?.fullName ?? '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Employee ID</label>
                  <p className="px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-faint) opacity-70">{dhr?.employeeId ?? '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Email</label>
                  <p className="px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary)">{profile?.email ?? '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Phone</label>
                  <p className="px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary)">{profile?.phone ?? '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Department</label>
                  <p className="px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-faint) opacity-70">{dhr?.department.name ?? '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-xs font-semibold text-(--text-secondary)">Department Code</label>
                  <p className="px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-faint) opacity-70">{dhr?.department.code ?? '—'}</p>
                </div>
              </div>

              <div className="p-3 bg-(--status-info-bg) border border-(--status-info-border) rounded-xl">
                <p className="font-sans text-xs text-(--text-secondary)">
                  Profile details are managed by the system administrator. Contact your admin to update your name, email, or phone number.
                </p>
              </div>
            </Card>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Lock className="w-5 h-5 text-(--brand-gold)" /> Password & Security
              </h3>
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <Input label="Current Password" type="password" placeholder="Enter current password"
                  value={pwData.currentPassword}
                  onChange={e => setPwData({ ...pwData, currentPassword: e.target.value })} />
                <Input label="New Password" type="password" placeholder="At least 8 characters"
                  value={pwData.newPassword}
                  onChange={e => setPwData({ ...pwData, newPassword: e.target.value })} />
                <Input label="Confirm New Password" type="password" placeholder="Repeat new password"
                  value={pwData.confirmPassword}
                  onChange={e => setPwData({ ...pwData, confirmPassword: e.target.value })} />
                {pwError && <p className="text-xs text-(--status-danger)">{pwError}</p>}
                <div className="p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl">
                  <p className="font-sans text-xs text-(--status-warning) leading-relaxed">
                    Passwords must be at least 8 characters. Your session will remain active after a password change.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" type="submit" disabled={pwSaving}
                    icon={pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </Button>
                </div>
              </form>
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
                <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Save</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
