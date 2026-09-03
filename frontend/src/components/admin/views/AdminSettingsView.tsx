'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Settings, User, Lock, Shield, Save, RefreshCw, Download, Printer,
  Building, BookOpen, DollarSign, Bell, CheckCircle2, RotateCcw, AlertTriangle
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { SkeletonForm, SkeletonCard, useToast, ToastContainer } from '../../ui/States';
import {
  adminSettingsApi, adminSystemConfigApi,
  AdminProfile, AdminOwnSession, SystemConfigData
} from '../../../lib/adminApi';

function MiniKPI({ label, value, color = 'text-(--brand-gold)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans">
      <p className="text-[11px] font-mono uppercase tracking-wider text-(--text-muted) truncate">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const AdminSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'identity' | 'academics' | 'financials' | 'security' | 'notifications' | 'profile'>('identity');

  // System Configuration State
  const [config, setConfig]               = useState<SystemConfigData | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig]   = useState(false);

  // Admin Personal Profile
  const [profile, setProfile]             = useState<AdminProfile | null>(null);
  const [pf, setPf]                       = useState({ fullName: '', email: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Admin Password
  const [pw, setPw]                       = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw]           = useState(false);

  // Personal Sessions
  const [ownSessions, setOwnSessions]     = useState<AdminOwnSession[]>([]);

  // Modals & Tools
  const [printOpen, setPrintOpen]         = useState(false);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Fetch Config
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const cfg = await adminSystemConfigApi.get();
      setConfig(cfg);
    } catch {
      // Graceful fallback
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // ── Fetch Admin Profile
  const fetchProfile = useCallback(async () => {
    try {
      const p = await adminSettingsApi.getProfile();
      setProfile(p);
      setPf({ fullName: p.fullName, email: p.email ?? '', phone: p.phone ?? '' });
    } catch {
      // Graceful fallback
    }
  }, []);

  // ── Fetch Own Sessions
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const s = await adminSettingsApi.getSessions();
      setOwnSessions(s);
    } catch {
      // Graceful fallback
    }
  }, []);

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await adminSettingsApi.revokeSession(id);
      setOwnSessions(prev => prev.filter(s => s.id !== id));
      showToast('Session revoked successfully', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to revoke session', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const res = await adminSettingsApi.revokeAllOtherSessions();
      showToast(`Revoked ${res.revokedCount} other active session(s)`, 'success');
      fetchSessions();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to revoke other sessions', 'error');
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchProfile();
  }, [fetchConfig, fetchProfile]);

  useEffect(() => {
    if (activeTab === 'profile') fetchSessions();
  }, [activeTab, fetchSessions]);

  // ── Save System Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSavingConfig(true);
    try {
      const updated = await adminSystemConfigApi.update(config);
      setConfig(updated);
      showToast('System configuration parameters saved successfully!', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to save configuration', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Reset System Defaults
  const handleResetDefaults = async () => {
    setSavingConfig(true);
    try {
      const res = await adminSystemConfigApi.resetDefaults();
      setConfig(res);
      showToast('Restored system configuration defaults baseline', 'info');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to reset configuration', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Save Personal Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await adminSettingsApi.updateProfile({
        fullName: pf.fullName || undefined,
        email: pf.email || undefined,
        phone: pf.phone || undefined,
      });
      setProfile(updated);
      showToast('Admin profile updated', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) {
      showToast('New password and confirmation do not match', 'error');
      return;
    }
    setSavingPw(true);
    try {
      const res = await adminSettingsApi.changePassword(pw);
      showToast(res.message ?? 'Password updated successfully', 'success');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      showToast(e.message ?? 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  // ── Export Config JSON
  const handleExportJSON = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Harmony_College_System_Config_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Exported system configuration JSON', 'success');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16 font-sans">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="System Configuration &amp; Governance"
        subtitle="Global institutional parameters, academic policies, financial rules, and security controls"
        icon={<Settings className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportJSON}>
              Export Config JSON
            </Button>
            <Button variant="ghost" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setPrintOpen(true)}>
              Print IT Governance Report
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-(--border-subtle) pb-3">
        {[
          { id: 'identity' as const,      label: 'College Identity',      icon: <Building className="w-4 h-4" /> },
          { id: 'academics' as const,     label: 'Academic Rules',        icon: <BookOpen className="w-4 h-4" /> },
          { id: 'financials' as const,    label: 'Financial Governance',  icon: <DollarSign className="w-4 h-4" /> },
          { id: 'security' as const,      label: 'Security Controls',     icon: <Shield className="w-4 h-4" /> },
          { id: 'notifications' as const, label: 'Notifications & Email', icon: <Bell className="w-4 h-4" /> },
          { id: 'profile' as const,       label: 'Admin Profile & Security', icon: <User className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-sans text-xs font-semibold transition-all border ${
              activeTab === t.id
                ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                : 'text-(--text-secondary) hover:bg-(--hover-overlay) border-(--border-default)'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {configLoading ? (
        <SkeletonForm fields={6} />
      ) : config && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* ── TAB 1: COLLEGE IDENTITY ── */}
          {activeTab === 'identity' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
                <Building className="w-5 h-5 text-(--brand-gold)" />
                College Identity &amp; Branding Parameters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Institution Full Name</label>
                  <Input
                    value={config.identity.institutionName}
                    onChange={e => setConfig({ ...config, identity: { ...config.identity, institutionName: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Short Code / Acronym</label>
                  <Input
                    value={config.identity.shortName}
                    onChange={e => setConfig({ ...config, identity: { ...config.identity, shortName: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Official Contact Email</label>
                  <Input
                    type="email"
                    value={config.identity.contactEmail}
                    onChange={e => setConfig({ ...config, identity: { ...config.identity, contactEmail: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Support Phone Number</label>
                  <Input
                    value={config.identity.supportPhone}
                    onChange={e => setConfig({ ...config, identity: { ...config.identity, supportPhone: e.target.value } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Physical Campus Address</label>
                  <Input
                    value={config.identity.campusAddress}
                    onChange={e => setConfig({ ...config, identity: { ...config.identity, campusAddress: e.target.value } })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB 2: ACADEMIC RULES ── */}
          {activeTab === 'academics' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-(--brand-gold)" />
                Academic Regulations &amp; Registration Parameters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Active Academic Year</label>
                  <Input
                    value={config.academics.academicYear}
                    onChange={e => setConfig({ ...config, academics: { ...config.academics, academicYear: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Current Active Semester</label>
                  <Input
                    value={config.academics.currentSemester}
                    onChange={e => setConfig({ ...config, academics: { ...config.academics, currentSemester: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Max Credit Hours Per Semester</label>
                  <Input
                    type="number"
                    value={config.academics.maxCreditHours}
                    onChange={e => setConfig({ ...config, academics: { ...config.academics, maxCreditHours: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Add / Drop Grace Period (Days)</label>
                  <Input
                    type="number"
                    value={config.academics.addDropGraceDays}
                    onChange={e => setConfig({ ...config, academics: { ...config.academics, addDropGraceDays: Number(e.target.value) } })}
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-(--text-primary)">Allow Student Self-Service Late Registration</span>
                    <p className="text-[11px] text-(--text-muted)">Enables students to enroll after standard deadline window</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.academics.allowLateRegistration}
                    onChange={e => setConfig({ ...config, academics: { ...config.academics, allowLateRegistration: e.target.checked } })}
                    className="w-4 h-4 accent-(--brand-gold)"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB 3: FINANCIAL GOVERNANCE ── */}
          {activeTab === 'financials' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-(--brand-gold)" />
                Financial Governance &amp; Fee Rules
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Default Credit Hour Fee (ETB)</label>
                  <Input
                    type="number"
                    value={config.financials.defaultCreditHourFee}
                    onChange={e => setConfig({ ...config, financials: { ...config.financials, defaultCreditHourFee: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Admission Application Fee (ETB)</label>
                  <Input
                    type="number"
                    value={config.financials.admissionApplicationFee}
                    onChange={e => setConfig({ ...config, financials: { ...config.financials, admissionApplicationFee: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Payment Grace Period (Days)</label>
                  <Input
                    type="number"
                    value={config.financials.paymentGraceDays}
                    onChange={e => setConfig({ ...config, financials: { ...config.financials, paymentGraceDays: Number(e.target.value) } })}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-(--text-primary)">Auto-Lock Unpaid Registration</span>
                    <p className="text-[11px] text-(--text-muted)">Locks course enrollment if balance exceeds grace period</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.financials.autoLockUnpaidAccounts}
                    onChange={e => setConfig({ ...config, financials: { ...config.financials, autoLockUnpaidAccounts: e.target.checked } })}
                    className="w-4 h-4 accent-(--brand-gold)"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB 4: SECURITY CONTROLS ── */}
          {activeTab === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
                <Shield className="w-5 h-5 text-(--brand-gold)" />
                Security &amp; Authentication Controls
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Max Failed Login Attempts</label>
                  <Input
                    type="number"
                    value={config.security.maxLoginAttempts}
                    onChange={e => setConfig({ ...config, security: { ...config.security, maxLoginAttempts: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Session Inactivity Timeout (Minutes)</label>
                  <Input
                    type="number"
                    value={config.security.sessionTimeoutMinutes}
                    onChange={e => setConfig({ ...config, security: { ...config.security, sessionTimeoutMinutes: Number(e.target.value) } })}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-(--text-primary)">Require Multi-Factor Authentication (MFA)</span>
                    <p className="text-[11px] text-(--text-muted)">Mandates MFA setup for administrative roles</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.security.requireMFA}
                    onChange={e => setConfig({ ...config, security: { ...config.security, requireMFA: e.target.checked } })}
                    className="w-4 h-4 accent-(--brand-gold)"
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-(--text-primary)">Allow Staff Self-Registration</span>
                    <p className="text-[11px] text-(--text-muted)">If disabled, staff must register via Invitation Token</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.security.allowStaffSelfRegistration}
                    onChange={e => setConfig({ ...config, security: { ...config.security, allowStaffSelfRegistration: e.target.checked } })}
                    className="w-4 h-4 accent-(--brand-gold)"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB 5: NOTIFICATIONS & EMAIL ── */}
          {activeTab === 'notifications' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
                <Bell className="w-5 h-5 text-(--brand-gold)" />
                Notification &amp; Email Dispatch Parameters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Email Sender Name</label>
                  <Input
                    value={config.notifications.senderName}
                    onChange={e => setConfig({ ...config, notifications: { ...config.notifications, senderName: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Email Sender Address</label>
                  <Input
                    type="email"
                    value={config.notifications.senderEmail}
                    onChange={e => setConfig({ ...config, notifications: { ...config.notifications, senderEmail: e.target.value } })}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-(--text-primary)">Enable Email Dispatch Notifications</span>
                    <p className="text-[11px] text-(--text-muted)">Dispatches emails for invitations, reset tokens, &amp; alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.notifications.enableEmailNotifs}
                    onChange={e => setConfig({ ...config, notifications: { ...config.notifications, enableEmailNotifs: e.target.checked } })}
                    className="w-4 h-4 accent-(--brand-gold)"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab !== 'profile' && (
            <div className="flex items-center justify-between pt-2 border-t border-(--border-subtle)">
              <Button variant="secondary" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={handleResetDefaults} disabled={savingConfig}>
                Reset to Defaults
              </Button>
              <Button variant="primary" size="sm" icon={savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} type="submit" disabled={savingConfig}>
                {savingConfig ? 'Saving Changes...' : 'Save Configuration'}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* ── TAB 6: ADMIN PERSONAL PROFILE & PASSWORD ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card hoverable={false} className="space-y-5">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
              <User className="w-5 h-5 text-(--brand-gold)" />
              Personal Admin Profile Settings
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Full Name</label>
                  <Input value={pf.fullName} onChange={e => setPf({ ...pf, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Email Address</label>
                  <Input type="email" value={pf.email} onChange={e => setPf({ ...pf, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Phone Number</label>
                  <Input value={pf.phone} onChange={e => setPf({ ...pf, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="primary" size="sm" icon={<Save className="w-4 h-4" />} type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Updating Profile...' : 'Update Admin Profile'}
                </Button>
              </div>
            </form>
          </Card>

          <Card hoverable={false} className="space-y-5">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
              <Lock className="w-5 h-5 text-(--brand-gold)" />
              Change Admin Password
            </h3>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Current Password</label>
                  <Input type="password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">New Password</label>
                  <Input type="password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-mono text-(--text-muted) uppercase mb-1">Confirm New Password</label>
                  <Input type="password" value={pw.confirmPassword} onChange={e => setPw({ ...pw, confirmPassword: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="primary" size="sm" icon={<Lock className="w-4 h-4" />} type="submit" disabled={savingPw}>
                  {savingPw ? 'Updating Password...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </Card>

          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) flex items-center gap-2">
                <Shield className="w-5 h-5 text-(--brand-gold)" />
                My Active Sessions
              </h3>
              {ownSessions.length > 1 && (
                <Button variant="secondary" size="sm" onClick={handleRevokeAllOthers}>
                  Revoke All Other Sessions
                </Button>
              )}
            </div>

            {ownSessions.length === 0 ? (
              <p className="font-sans text-xs text-(--text-muted)">No active sessions found.</p>
            ) : (
              <div className="space-y-2">
                {ownSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl font-sans text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-(--text-primary)">{s.deviceInfo || 'Browser Session'}</span>
                        {s.isCurrent && <Badge variant="emerald" className="text-[9px]">Current Session</Badge>}
                      </div>
                      <p className="font-mono text-[10px] text-(--text-muted) mt-0.5">IP: {s.ipAddress} · Last Used: {new Date(s.lastUsedAt).toLocaleString()}</p>
                    </div>
                    {!s.isCurrent && (
                      <Button variant="ghost" size="sm" onClick={() => handleRevokeSession(s.id)} disabled={revokingId === s.id}>
                        {revokingId === s.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* PRINT IT GOVERNANCE REPORT MODAL */}
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} title="Harmony College — IT Governance & System Configuration Report">
        <div className="space-y-4 font-sans text-xs">
          <div className="p-6 rounded-2xl bg-(--hover-overlay) border border-(--border-default) space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--brand-gold)">HARMONY COLLEGE</h3>
                <p className="text-[11px] text-(--text-muted)">IT Infrastructure & System Parameter Governance Report</p>
              </div>
              <div className="text-right font-mono text-[10px] text-(--text-muted)">
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {config && (
              <div className="space-y-3 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                    <span className="text-(--text-muted)">INSTITUTION NAME</span>
                    <p className="font-bold text-(--text-primary)">{config.identity.institutionName}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-(--hover-overlay) border border-(--border-subtle)">
                    <span className="text-(--text-muted)">ACADEMIC YEAR</span>
                    <p className="font-bold text-(--brand-gold)">{config.academics.academicYear} ({config.academics.currentSemester})</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) space-y-1">
                  <span className="text-(--text-muted) uppercase">Financial & Credit Parameters</span>
                  <div className="flex justify-between">
                    <span>Credit Hour Fee:</span>
                    <span className="font-bold text-(--status-success)">ETB {config.financials.defaultCreditHourFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Credit Hours Cap:</span>
                    <span className="font-bold text-(--text-primary)">{config.academics.maxCreditHours} Credits</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-(--text-muted) italic">
              Official Institutional IT Parameter & Governance Document. Confidential.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrintOpen(false)}>Close</Button>
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Governance Report</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
