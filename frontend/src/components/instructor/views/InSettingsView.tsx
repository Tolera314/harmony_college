'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings, User, Bell, Lock, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { InstructorProfile } from '../../../types/instructor';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card }         from '../../ui/Card';
import { Button }       from '../../ui/Button';
import { Input }        from '../../ui/Input';
import { Badge }        from '../../ui/Badge';
import { instructorProfileApi, instructorNotificationsApi } from '../../../lib/instructorApi';

interface InSettingsViewProps { profile: InstructorProfile }

export const InSettingsView: React.FC<InSettingsViewProps> = ({ profile }) => {
  const [activeSection, setActiveSection] = useState('profile');

  // Profile form
  const [form,      setForm]      = useState({ name: profile.name, email: profile.email, phone: profile.phone });
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [formError, setFormError] = useState('');

  // Sync form when profile prop changes (loaded from API)
  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, phone: profile.phone });
  }, [profile.name, profile.email, profile.phone]);

  // Password form
  const [pwForm,      setPwForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving,    setPwSaving]  = useState(false);
  const [pwSaved,     setPwSaved]   = useState(false);
  const [pwError,     setPwError]   = useState('');

  // Notification prefs (local only — can be extended to persist via API)
  const [notifPrefs, setNotifPrefs] = useState({
    gradeAlerts:       true,
    attendanceAlerts:  true,
    scheduleAlerts:    true,
    enrollmentAlerts:  true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await instructorProfileApi.update({
        title:          profile.title || undefined,
        specialization: profile.specialization || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setPwSaving(true); setPwError('');
    try {
      await instructorProfileApi.changePassword(pwForm);
      setPwSaved(true);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  const sections = [
    { id: 'profile',       label: 'Profile',       icon: <User className="w-4 h-4" />  },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />  },
    { id: 'security',      label: 'Security',      icon: <Lock className="w-4 h-4" />  },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader title="Settings" subtitle="Manage your account and preferences" icon={<Settings className="w-5 h-5" />} />

      {/* Success toast */}
      {(saved || pwSaved || notifSaved) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-(--status-success-bg) border border-emerald-800 text-(--status-success) rounded-2xl font-sans text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          {saved ? 'Profile saved.' : pwSaved ? 'Password updated.' : 'Preferences saved.'}
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${
                activeSection === s.id
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)'
                  : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">

          {/* ── Profile Section ──────────────────────────────────────────── */}
          {activeSection === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <User className="w-5 h-5 text-(--brand-gold)" /> Instructor Profile
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-(--accent-gold-subtle) border-2 border-(--accent-gold-border) flex items-center justify-center font-serif font-bold text-2xl text-(--brand-gold)">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-serif text-base font-bold text-(--text-primary)">{profile.name}</p>
                  <p className="font-sans text-xs text-(--text-muted)">{profile.title}</p>
                  <Badge variant="gold" className="mt-1">{profile.employeeId}</Badge>
                </div>
              </div>

              {formError && (
                <div className="p-3 flex items-center gap-2 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Input label="Full Name" value={form.name} disabled />
                    <p className="text-[11px] text-(--text-faint) font-sans">Name is managed by HR.</p>
                  </div>
                  <div className="space-y-1">
                    <Input label="Email" type="email" value={form.email} disabled />
                    <p className="text-[11px] text-(--text-faint) font-sans">Email is managed by admin.</p>
                  </div>
                  <div className="space-y-1">
                    <Input label="Phone" value={form.phone} disabled />
                    <p className="text-[11px] text-(--text-faint) font-sans">Phone is managed by admin.</p>
                  </div>
                  <Input label="Department" value={profile.department} disabled />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Input label="Title" value={profile.title} disabled />
                    <p className="text-[11px] text-(--text-faint) font-sans">Managed by HR.</p>
                  </div>
                  <div className="space-y-1">
                    <Input label="Specialization" value={profile.specialization} disabled />
                    <p className="text-[11px] text-(--text-faint) font-sans">Managed by HR.</p>
                  </div>
                </div>
                <p className="text-xs text-(--text-faint)">
                  Contact your administrator to update personal information.
                </p>
              </form>
            </Card>
          )}

          {/* ── Notifications Section ────────────────────────────────────── */}
          {activeSection === 'notifications' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Bell className="w-5 h-5 text-(--brand-gold)" /> Notification Preferences
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'gradeAlerts',      title: 'Grade Submission Deadlines', desc: 'Notify me when grade deadlines are approaching.'          },
                  { key: 'attendanceAlerts', title: 'Attendance Warnings',        desc: 'Alert when student attendance drops below threshold.'     },
                  { key: 'scheduleAlerts',   title: 'Schedule Changes',           desc: 'Notify me of room or time changes.'                       },
                  { key: 'enrollmentAlerts', title: 'Student Enrollment',         desc: 'Alert when students enroll or drop from my courses.'      },
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-(--hover-overlay) rounded-2xl cursor-pointer border border-(--border-default) hover:bg-(--hover-overlay) transition-colors"
                  >
                    <div>
                      <p className="font-sans text-sm font-semibold text-(--text-primary)">{item.title}</p>
                      <p className="font-sans text-xs text-(--text-muted) mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(notifPrefs as any)[item.key]}
                      onChange={e => setNotifPrefs(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="w-5 h-5 accent-[#E9C349] cursor-pointer"
                      aria-label={item.title}
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon={<Save className="w-4 h-4" />}
                  onClick={() => { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 3000); }}
                >
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}

          {/* ── Security Section ─────────────────────────────────────────── */}
          {activeSection === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Lock className="w-5 h-5 text-(--brand-gold)" /> Password & Security
              </h3>

              {pwError && (
                <div className="p-3 flex items-center gap-2 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {pwError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="Enter current password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat new password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={pwSaving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
