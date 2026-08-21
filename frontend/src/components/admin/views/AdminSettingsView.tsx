'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings, User, Lock, Shield, Save, Trash2, LogOut, Monitor } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { InlineError, SkeletonForm, SkeletonCard, useToast, ToastContainer } from '../../ui/States';
import { adminSettingsApi, AdminProfile, AdminOwnSession } from '../../../lib/adminApi';

export const AdminSettingsView: React.FC = () => {
  const [section, setSection] = useState('profile');
  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── profile ──────────────────────────────────────────────────────────────
  const [profile, setProfile]       = useState<AdminProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [pf, setPf] = useState({ fullName: '', email: '', phone: '' });

  useEffect(() => {
    adminSettingsApi.getProfile()
      .then(p => { setProfile(p); setPf({ fullName: p.fullName, email: p.email ?? '', phone: p.phone ?? '' }); })
      .catch(e => setProfileError(e.message ?? 'Failed to load profile'))
      .finally(() => setProfileLoading(false));
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault(); setProfileError(''); setSaving(true);
    try {
      const updated = await adminSettingsApi.updateProfile({
        fullName: pf.fullName || undefined,
        email:    pf.email    || undefined,
        phone:    pf.phone    || undefined,
      });
      setProfile(updated); showToast('Profile updated', 'success');
    } catch (e: any) { setProfileError(e.message ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  // ── password ─────────────────────────────────────────────────────────────
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError(''); setPwSaving(true);
    try {
      const res = await adminSettingsApi.changePassword(pw);
      showToast(res.message ?? 'Password updated', 'success');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) { setPwError(e.message ?? 'Password change failed'); }
    finally { setPwSaving(false); }
  };

  // ── sessions ─────────────────────────────────────────────────────────────
  const [sessions, setSessions]         = useState<AdminOwnSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError]     = useState('');
  const [revokingId, setRevokingId]     = useState<string | null>(null);

  const fetchSessions = async () => {
    setSessionsLoading(true); setSessionsError('');
    try { setSessions(await adminSettingsApi.getSessions()); }
    catch (e: any) { setSessionsError(e.message ?? 'Failed to load sessions'); }
    finally { setSessionsLoading(false); }
  };

  useEffect(() => { if (section === 'sessions') fetchSessions(); }, [section]);

  const revokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await adminSettingsApi.revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      showToast('Session revoked', 'success');
    } catch (e: any) { showToast(e.message ?? 'Revoke failed', 'error'); }
    finally { setRevokingId(null); }
  };

  const revokeAllOthers = async () => {
    try {
      const res = await adminSettingsApi.revokeAllOtherSessions();
      showToast(`Revoked ${res.revokedCount} other session(s)`, 'success');
      fetchSessions();
    } catch (e: any) { showToast(e.message ?? 'Revoke failed', 'error'); }
  };

  // ── nav sections ──────────────────────────────────────────────────────────
  const sections = [
    { id: 'profile',  label: 'Admin Profile',    icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Password',          icon: <Lock className="w-4 h-4" /> },
    { id: 'sessions', label: 'Active Sessions',   icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <DHPageHeader title="Settings" subtitle="Account settings" icon={<Settings className="w-5 h-5" />} />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${section === s.id ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {/* Profile */}
          {section === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <User className="w-5 h-5 text-(--brand-gold)" /> Profile
              </h3>
              {profileLoading ? <SkeletonForm fields={4} /> : (
                <form onSubmit={handleProfileSave} className="space-y-4">
                  {profileError && <InlineError message={profileError} />}
                  {profile && (
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) font-bold text-2xl font-serif">
                        {profile.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-serif text-base font-bold text-(--text-primary)">{profile.fullName}</p>
                        <Badge variant="gold" className="mt-1">{profile.role}</Badge>
                        {profile.lastLoginAt && (
                          <p className="font-mono text-[10px] text-(--text-faint) mt-1">Last login: {new Date(profile.lastLoginAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Full Name" value={pf.fullName} onChange={e => setPf({ ...pf, fullName: e.target.value })} />
                    <Input label="Email" type="email" value={pf.email} onChange={e => setPf({ ...pf, email: e.target.value })} />
                    <Input label="Phone" value={pf.phone} onChange={e => setPf({ ...pf, phone: e.target.value })} />
                    <Input label="Role" value={profile?.role ?? ''} disabled className="opacity-50 cursor-not-allowed" />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {/* Password */}
          {section === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2 border-b border-(--border-default) pb-4">
                <Lock className="w-5 h-5 text-(--brand-gold)" /> Change Password
              </h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {pwError && <InlineError message={pwError} />}
                <Input label="Current Password" type="password" required value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} />
                <Input label="New Password" type="password" required value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} />
                <Input label="Confirm New Password" type="password" required value={pw.confirmPassword} onChange={e => setPw({ ...pw, confirmPassword: e.target.value })} />
                <p className="text-[11px] text-(--text-faint)">Must be 8+ characters using only letters and numbers. All other sessions will be revoked.</p>
                <div className="flex justify-end">
                  <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />} disabled={pwSaving}>
                    {pwSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Sessions */}
          {section === 'sessions' && (
            <Card hoverable={false} className="space-y-5">
              <div className="flex items-center justify-between border-b border-(--border-default) pb-4">
                <h3 className="font-serif text-xl font-bold text-(--text-primary) flex items-center gap-2">
                  <Shield className="w-5 h-5 text-(--brand-gold)" /> Active Sessions
                </h3>
                {sessions.filter(s => !s.isCurrent).length > 0 && (
                  <Button variant="danger" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={revokeAllOthers}>
                    Revoke all others
                  </Button>
                )}
              </div>
              {sessionsLoading ? <SkeletonCard rows={3} /> : sessionsError ? (
                <InlineError message={sessionsError} onRetry={fetchSessions} />
              ) : sessions.length === 0 ? (
                <p className="text-sm text-(--text-faint) text-center py-8">No other active sessions.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-2xl">
                      <div className="flex items-start gap-3 min-w-0">
                        <Monitor className="w-4 h-4 text-(--text-faint) mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">{s.deviceInfo ?? 'Unknown device'}</p>
                          <p className="font-sans text-xs text-(--text-muted) mt-0.5">{s.ipAddress ?? '—'} · Last used {new Date(s.lastUsedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {s.isCurrent ? (
                        <Badge variant="emerald" className="shrink-0">Current</Badge>
                      ) : (
                        <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}
                          disabled={revokingId === s.id}
                          onClick={() => revokeSession(s.id)}>
                          {revokingId === s.id ? '...' : 'Revoke'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
