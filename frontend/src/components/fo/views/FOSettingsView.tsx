'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Settings, User, Lock, Bell, Palette, Globe,
  Shield, Monitor, Save, Eye, EyeOff, CheckCircle2,
  DollarSign, CreditCard, Landmark, AlertCircle, Check, RefreshCw, X
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { getSettings, updateSettings as apiUpdateSettings } from '../../../lib/foApi';

type SettingsTab = 'financial_policy' | 'profile' | 'password' | 'notifications' | 'appearance' | 'language' | 'security' | 'sessions';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'financial_policy', label: 'Financial Policy & Rates', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'profile',          label: 'Finance Profile',         icon: <User className="w-4 h-4" /> },
  { id: 'password',         label: 'Password & Security',      icon: <Lock className="w-4 h-4" /> },
  { id: 'notifications',    label: 'Notifications',           icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance',       label: 'Appearance & Theme',       icon: <Palette className="w-4 h-4" /> },
  { id: 'language',         label: 'Language & Region',        icon: <Globe className="w-4 h-4" /> },
  { id: 'security',         label: 'Access Control',           icon: <Shield className="w-4 h-4" /> },
  { id: 'sessions',         label: 'Active Sessions',          icon: <Monitor className="w-4 h-4" /> },
];

const themes = [
  { id: 'dark',   name: 'Dark Obsidian (Default)', bg: '#0F0F10', desc: 'Deep obsidian dark mode' },
  { id: 'navy',   name: 'Deep Navy',             bg: '#060c1a', desc: 'Midnight royal blue' },
  { id: 'forest', name: 'Dark Forest',           bg: '#070f0a', desc: 'Deep emerald forest' },
] as const;

type ThemeId = typeof themes[number]['id'];

export const FOSettingsView: React.FC = () => {
  const [activeTab, setActiveTab]     = useState<SettingsTab>('financial_policy');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [savedMsg, setSavedMsg]       = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [activeTheme, setActiveTheme] = useState<ThemeId>('dark');
  const [showPass, setShowPass]       = useState(false);

  // Form states
  const [profile, setProfile] = useState({
    name: 'Dawit Alemu',
    email: 'fo@harmony.edu.et',
    phone: '+251 911 234 567',
    officeRoom: 'Block B — Room 204',
    department: 'Finance & Accounting',
    employeeId: 'EMP-FO-2026-01',
  });

  const [financialPolicy, setFinancialPolicy] = useState({
    academicYear: '2026/2027',
    currentSemester: 'Fall 2026',
    tuitionFeePerCredit: 1250,
    registrationFee: 1500,
    lateFeePercentage: 5,
    gracePeriodDays: 15,
    currency: 'ETB',
    telebirrMerchantId: 'MERCHANT-HC-9021',
    chapaPublicKey: 'CHAPUBK_TEST-xxxxxx',
    bankAccountDetails: 'CBE Account: 1000188992001 (Harmony College Main Operating)',
    autoReconciliationEnabled: true,
    overdueAlertThresholdDays: 30,
  });

  const [passState, setPassState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    paymentReceived: true,
    paymentOverdue: true,
    installmentDue: true,
    reconciliationFailed: true,
    largePayment: true,
    systemAlerts: false,
    reminders: true,
  });

  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome on Windows 11', ip: '192.168.1.45', location: 'Addis Ababa, ET', time: 'Now — Active Session', current: true },
    { id: '2', device: 'Firefox on macOS Sonoma', ip: '192.168.1.88', location: 'Addis Ababa, ET', time: 'Yesterday at 16:40', current: false },
    { id: '3', device: 'Safari on iPhone 15 Pro', ip: '10.0.0.12', location: 'Addis Ababa, ET', time: '3 days ago', current: false },
  ]);

  // Apply Theme Function
  const applyTheme = (themeId: ThemeId) => {
    setActiveTheme(themeId);
    const theme = themes.find((t) => t.id === themeId)!;
    document.documentElement.style.setProperty('--bg-base', theme.bg);
    document.body.style.backgroundColor = theme.bg;
    document.body.style.transition = 'background-color 0.4s ease';
    try { localStorage.setItem('fo-theme', themeId); } catch (_) {}
  };

  // Load Settings on Mount
  const fetchSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      let authUser: any = null;
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData && meData.authenticated && meData.user) {
            authUser = meData.user;
          }
        }
      } catch (_) {}

      const res = await getSettings();
      if (res && res.settings) {
        const s = res.settings;
        setProfile((prev) => ({
          ...prev,
          name: authUser?.fullName || s.name || prev.name,
          email: authUser?.email || s.email || prev.email,
          phone: authUser?.phone || s.phone || prev.phone,
          officeRoom: s.officeRoom || prev.officeRoom,
          department: s.department || prev.department,
          employeeId: authUser?.id ? `EMP-FO-${authUser.id.slice(-4).toUpperCase()}` : (s.employeeId || prev.employeeId),
        }));

        setFinancialPolicy({
          academicYear: s.academicYear || financialPolicy.academicYear,
          currentSemester: s.currentSemester || financialPolicy.currentSemester,
          tuitionFeePerCredit: s.tuitionFeePerCredit ?? financialPolicy.tuitionFeePerCredit,
          registrationFee: s.registrationFee ?? financialPolicy.registrationFee,
          lateFeePercentage: s.lateFeePercentage ?? financialPolicy.lateFeePercentage,
          gracePeriodDays: s.gracePeriodDays ?? financialPeriodDaysFallback(s.gracePeriodDays),
          currency: s.currency || financialPolicy.currency,
          telebirrMerchantId: s.telebirrMerchantId || financialPolicy.telebirrMerchantId,
          chapaPublicKey: s.chapaPublicKey || financialPolicy.chapaPublicKey,
          bankAccountDetails: s.bankAccountDetails || financialPolicy.bankAccountDetails,
          autoReconciliationEnabled: s.autoReconciliationEnabled ?? financialPolicy.autoReconciliationEnabled,
          overdueAlertThresholdDays: s.overdueAlertThresholdDays ?? financialPolicy.overdueAlertThresholdDays,
        });

        if (s.activeTheme && themes.some((t) => t.id === s.activeTheme)) {
          applyTheme(s.activeTheme as ThemeId);
        }
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  function financialPeriodDaysFallback(val: any) {
    return val != null ? Number(val) : 15;
  }

  useEffect(() => {
    fetchSettingsData();

    // Check localStorage theme
    try {
      const saved = localStorage.getItem('fo-theme') as ThemeId | null;
      if (saved && themes.some((t) => t.id === saved)) {
        applyTheme(saved);
      }
    } catch (_) {}
  }, [fetchSettingsData]);

  // Generic Save Handler
  const handleSave = async (payload?: Record<string, unknown>, successText = 'Settings saved successfully!') => {
    setSaving(true);
    setErrorMsg('');
    try {
      const body = payload || {
        ...profile,
        ...financialPolicy,
        activeTheme,
      };
      await apiUpdateSettings(body);
      setSavedMsg(successText);
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Password Submit Handler
  const handlePasswordSubmit = async () => {
    if (!passState.currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (passState.newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (passState.newPassword !== passState.confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await apiUpdateSettings({ newPassword: passState.newPassword });
      setPassState({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSavedMsg('Password updated successfully!');
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  // Session Revocation
  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSavedMsg('Session revoked successfully.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Portal Settings"
        subtitle="Manage financial policies, account security, notification alerts, and portal theme preferences"
        icon={<Settings className="w-5 h-5" />}
      />

      {/* Global Alerts */}
      {savedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedMsg}</span>
          </div>
          <button onClick={() => setSavedMsg('')} className="text-emerald-400/60 hover:text-emerald-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400/60 hover:text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <aside className="lg:w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setErrorMsg(''); setSavedMsg(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-sans text-xs sm:text-sm transition-all ${
                  activeTab === t.id
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border) font-bold shadow-xs'
                    : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Tab Content Panel */}
        <div className="flex-1 min-w-0">
          {/* ── Tab 1: Financial Policy & Rates ──────────────────────────────── */}
          {activeTab === 'financial_policy' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">College Financial Policy & Rates</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Configure tuition fee rates, registration fees, late payment penalties, and payment gateway configurations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Tuition Fee per Credit (ETB)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialPolicy.tuitionFeePerCredit}
                      onChange={(e) => setFinancialPolicy({ ...financialPolicy, tuitionFeePerCredit: Number(e.target.value) })}
                      className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-4 pr-12 py-2.5 font-mono text-sm text-(--brand-gold) font-bold outline-none focus:border-(--brand-gold)/50 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-(--text-faint)">ETB</span>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Registration Fee (ETB)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialPolicy.registrationFee}
                      onChange={(e) => setFinancialPolicy({ ...financialPolicy, registrationFee: Number(e.target.value) })}
                      className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-4 pr-12 py-2.5 font-mono text-sm text-(--brand-gold) font-bold outline-none focus:border-(--brand-gold)/50 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-(--text-faint)">ETB</span>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={financialPolicy.academicYear}
                    onChange={(e) => setFinancialPolicy({ ...financialPolicy, academicYear: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Current Term / Semester
                  </label>
                  <input
                    type="text"
                    value={financialPolicy.currentSemester}
                    onChange={(e) => setFinancialPolicy({ ...financialPolicy, currentSemester: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Late Payment Fee (%)
                  </label>
                  <input
                    type="number"
                    value={financialPolicy.lateFeePercentage}
                    onChange={(e) => setFinancialPolicy({ ...financialPolicy, lateFeePercentage: Number(e.target.value) })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={financialPolicy.gracePeriodDays}
                    onChange={(e) => setFinancialPolicy({ ...financialPolicy, gracePeriodDays: Number(e.target.value) })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>
              </div>

              {/* Gateway Configuration Sub-section */}
              <div className="pt-4 border-t border-(--border-default) space-y-4">
                <h4 className="font-sans text-sm font-bold text-(--text-primary) flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-(--brand-gold)" />
                  Payment Gateway Credentials
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                      Telebirr Merchant ID
                    </label>
                    <input
                      type="text"
                      value={financialPolicy.telebirrMerchantId}
                      onChange={(e) => setFinancialPolicy({ ...financialPolicy, telebirrMerchantId: e.target.value })}
                      className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-xs text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                      Chapa API Public Key
                    </label>
                    <input
                      type="text"
                      value={financialPolicy.chapaPublicKey}
                      onChange={(e) => setFinancialPolicy({ ...financialPolicy, chapaPublicKey: e.target.value })}
                      className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-xs text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    CBE Bank Account & Payment Instructions
                  </label>
                  <input
                    type="text"
                    value={financialPolicy.bankAccountDetails}
                    onChange={(e) => setFinancialPolicy({ ...financialPolicy, bankAccountDetails: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                {/* Auto reconciliation toggle */}
                <div className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div>
                    <p className="font-sans text-sm font-medium text-(--text-primary)">Automated Gateway Matching</p>
                    <p className="font-sans text-xs text-(--text-faint) mt-0.5">
                      Automatically reconcile incoming Telebirr & Chapa transactions matching student reference IDs
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setFinancialPolicy({
                        ...financialPolicy,
                        autoReconciliationEnabled: !financialPolicy.autoReconciliationEnabled,
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      financialPolicy.autoReconciliationEnabled ? 'bg-[#E9C349]' : 'bg-(--hover-overlay)'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        financialPolicy.autoReconciliationEnabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => handleSave(financialPolicy, 'Financial Policy updated successfully!')}
                  disabled={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? 'Saving Changes...' : 'Save Financial Policy'}
                </Button>
              </div>
            </Card>
          )}

          {/* ── Tab 2: Finance Profile ───────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Finance Officer Profile</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Manage your personal finance officer contact information and staff portal identity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Office Room Location
                  </label>
                  <input
                    type="text"
                    value={profile.officeRoom}
                    onChange={(e) => setProfile({ ...profile, officeRoom: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Staff ID
                  </label>
                  <input
                    type="text"
                    value={profile.employeeId}
                    disabled
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-xs text-(--text-muted) opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => handleSave(profile, 'Profile updated successfully!')}
                  disabled={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? 'Saving Profile...' : 'Save Profile Changes'}
                </Button>
              </div>
            </Card>
          )}

          {/* ── Tab 3: Password & Security ───────────────────────────────────── */}
          {activeTab === 'password' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Change Password</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Update your authentication credentials for the Harmony College staff portal.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={passState.currentPassword}
                      onChange={(e) => setPassState({ ...passState, currentPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 pr-10 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
                    />
                    <button
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={passState.newPassword}
                    onChange={(e) => setPassState({ ...passState, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={passState.confirmPassword}
                    onChange={(e) => setPassState({ ...passState, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
                  />
                </div>

                <div className="p-3.5 bg-(--hover-overlay) rounded-xl border border-(--border-default) space-y-1.5">
                  <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider font-semibold">Password Guidelines</p>
                  {[
                    'At least 8 characters long',
                    'Contains combination of letters and numbers',
                    'Do not reuse previous portal passwords',
                  ].map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E9C349]" />
                      <span className="font-sans text-xs text-(--text-muted)">{r}</span>
                    </div>
                  ))}
                </div>

                <Button variant="primary" onClick={handlePasswordSubmit} disabled={saving} icon={<Lock className="w-4 h-4" />}>
                  {saving ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </Card>
          )}

          {/* ── Tab 4: Notifications ─────────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Notification Preferences</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Choose which alerts and financial events notify you directly in the portal.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'paymentReceived',     label: 'Student Payment Recorded',  desc: 'Alert when a cash or gateway payment is posted' },
                  { key: 'paymentOverdue',      label: 'Account Overdue Alerts',    desc: 'Alert when a student balance passes due date threshold' },
                  { key: 'installmentDue',      label: 'Installment Deadlines',     desc: 'Reminders for upcoming fee payment installments' },
                  { key: 'reconciliationFailed', label: 'Reconciliation Discrepancies', desc: 'Alert when a gateway transaction requires manual review' },
                  { key: 'largePayment',         label: 'Large Payments (> ETB 10,000)', desc: 'High-value transaction security notifications' },
                  { key: 'systemAlerts',         label: 'System Maintenance',       desc: 'Portal updates and scheduled maintenance' },
                  { key: 'reminders',            label: 'Task Reminders',            desc: 'Pending registration fee verification reminders' },
                ].map((item) => {
                  const val = notifPrefs[item.key as keyof typeof notifPrefs];
                  return (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                      <div>
                        <p className="font-sans text-sm font-medium text-(--text-primary)">{item.label}</p>
                        <p className="font-sans text-xs text-(--text-faint) mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifPrefs((prev) => ({ ...prev, [item.key]: !val }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${val ? 'bg-[#E9C349]' : 'bg-(--hover-overlay)'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${val ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <Button variant="primary" onClick={() => handleSave(notifPrefs, 'Notification preferences updated!')} disabled={saving} icon={<Save className="w-4 h-4" />}>
                {saving ? 'Saving Preferences...' : 'Save Notification Preferences'}
              </Button>
            </Card>
          )}

          {/* ── Tab 5: Appearance & Theme ────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <Card hoverable={false} className="space-y-8">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Appearance & Theme Engine</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Customize theme colors, background moods, and table display density.
                </p>
              </div>

              {/* Theme Options */}
              <div className="space-y-3">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Portal Theme Mode</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themes.map((t) => {
                    const isActive = activeTheme === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        onClick={() => applyTheme(t.id)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative p-4 rounded-2xl border text-left transition-all duration-200 focus:outline-none ${
                          isActive
                            ? 'border-[#E9C349] ring-2 ring-[#E9C349]/30 bg-[#E9C349]/5'
                            : 'border-(--border-default) hover:border-white/25 bg-(--hover-overlay)'
                        }`}
                        style={{ backgroundColor: t.bg }}
                      >
                        <div className="flex gap-1.5 mb-3">
                          <div className="h-6 w-6 rounded-lg bg-[#E9C349]/30" />
                          <div className="flex-1 space-y-1.5 pt-0.5">
                            <div className="h-1.5 rounded-full bg-white/20 w-3/4" />
                            <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
                          </div>
                        </div>

                        <p className="font-sans text-sm font-semibold text-white">{t.name}</p>
                        <p className="font-mono text-[10px] text-white/50 mt-0.5">{t.desc}</p>

                        {isActive && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="gold">Active</Badge>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Table Density */}
              <div className="space-y-3">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Table Row Density</p>
                <div className="flex gap-3 flex-wrap">
                  {['Comfortable', 'Compact', 'Spacious'].map((d) => (
                    <button
                      key={d}
                      className={`px-4 py-2 rounded-xl border font-sans text-xs sm:text-sm transition-all ${
                        d === 'Comfortable'
                          ? 'border-(--accent-gold-border) bg-(--accent-gold-subtle) text-(--brand-gold) font-bold'
                          : 'border-(--border-default) text-(--text-muted) hover:bg-(--hover-overlay)'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="primary" onClick={() => handleSave({ activeTheme }, 'Theme preference saved!')} disabled={saving} icon={<Save className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Save Theme Preference'}
              </Button>
            </Card>
          )}

          {/* ── Tab 6: Language & Region ─────────────────────────────────────── */}
          {activeTab === 'language' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Language & Regional Formats</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Adjust date formats, numbers, and default currency display.
                </p>
              </div>

              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">Display Language</label>
                  <select className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors">
                    <option value="English">English (US)</option>
                    <option value="Amharic">Amharic (አማርኛ)</option>
                    <option value="AfaanOromo">Afaan Oromo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">Currency Symbol</label>
                  <input type="text" value="ETB (Ethiopian Birr)" disabled className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-muted) opacity-70" />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">Date Format</label>
                  <select className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-mono text-xs text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors">
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-12)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (12/09/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (09/12/2026)</option>
                  </select>
                </div>

                <Button variant="primary" onClick={() => handleSave({}, 'Regional formats updated!')} disabled={saving} icon={<Save className="w-4 h-4" />}>
                  {saving ? 'Saving...' : 'Apply Regional Formats'}
                </Button>
              </div>
            </Card>
          )}

          {/* ── Tab 7: Security & Access ────────────────────────────────────── */}
          {activeTab === 'security' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Security & Access Controls</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Enforce additional verification policies and multi-factor authentication.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Two-Factor Authentication (2FA)', desc: 'Require SMS or authenticator app code on login', enabled: false },
                  { label: 'Login Attempt Notifications', desc: 'Send email notification on new device sign in', enabled: true },
                  { label: 'Require Password on Receipt Export', desc: 'Prompt for password when generating bulk financial receipts', enabled: true },
                  { label: 'Auto-Logout on Inactivity (30 mins)', desc: 'Automatically terminate session after 30 minutes of idle time', enabled: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                    <div>
                      <p className="font-sans text-sm font-medium text-(--text-primary)">{item.label}</p>
                      <p className="font-sans text-xs text-(--text-faint) mt-0.5">{item.desc}</p>
                    </div>
                    <Badge variant={item.enabled ? 'emerald' : 'glass'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Tab 8: Active Sessions ───────────────────────────────────────── */}
          {activeTab === 'sessions' && (
            <Card hoverable={false} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Active Portal Sessions</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-1">
                  Manage devices and browsers currently signed into your Finance Officer account.
                </p>
              </div>

              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      s.current
                        ? 'border-(--accent-gold-border) bg-[#E9C349]/5'
                        : 'border-(--border-subtle) bg-(--hover-overlay)'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className={`w-5 h-5 shrink-0 ${s.current ? 'text-(--brand-gold)' : 'text-(--text-faint)'}`} />
                      <div>
                        <p className="font-sans text-sm font-medium text-(--text-primary)">{s.device}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">
                          {s.ip} · {s.location}
                        </p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{s.time}</p>
                      </div>
                    </div>
                    {s.current ? (
                      <Badge variant="emerald">Active Now</Badge>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => handleRevokeSession(s.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setSessions(sessions.filter((s) => s.current));
                    setSavedMsg('All other sessions revoked successfully.');
                  }}
                >
                  Revoke All Other Sessions
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
