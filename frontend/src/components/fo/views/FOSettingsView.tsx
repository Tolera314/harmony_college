'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Settings, User, Lock, Bell, Palette, Globe,
  Shield, Monitor, Save, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { foProfile } from '../../../data/financeData';

type SettingsTab = 'profile' | 'password' | 'notifications' | 'appearance' | 'language' | 'security' | 'sessions';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Finance Profile',  icon: <User className="w-4 h-4" /> },
  { id: 'password',      label: 'Password',         icon: <Lock className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications',    icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance',    label: 'Appearance',       icon: <Palette className="w-4 h-4" /> },
  { id: 'language',      label: 'Language',         icon: <Globe className="w-4 h-4" /> },
  { id: 'security',      label: 'Security',         icon: <Shield className="w-4 h-4" /> },
  { id: 'sessions',      label: 'Sessions',         icon: <Monitor className="w-4 h-4" /> },
];

// ── Theme definitions ──────────────────────────────────────────────────────────
const themes = [
  { id: 'dark',   name: 'Dark (Default)', bg: '#0F0F10', surface: 'rgba(255,255,255,0.05)', desc: 'Deep obsidian' },
  { id: 'navy',   name: 'Deep Navy',      bg: '#060c1a', surface: 'rgba(255,255,255,0.05)', desc: 'Midnight blue' },
  { id: 'forest', name: 'Dark Forest',    bg: '#070f0a', surface: 'rgba(255,255,255,0.05)', desc: 'Deep green' },
] as const;

type ThemeId = typeof themes[number]['id'];

export const FOSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showPass, setShowPass]   = useState(false);
  const [saved, setSaved]         = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('dark');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const applyTheme = (themeId: ThemeId) => {
    setActiveTheme(themeId);
    const theme = themes.find((t) => t.id === themeId)!;
    // Apply to document root for instant effect across the whole app
    document.documentElement.style.setProperty('--bg-base', theme.bg);
    document.body.style.backgroundColor = theme.bg;
    document.body.style.transition = 'background-color 0.4s ease';
    // Store preference
    try { localStorage.setItem('fo-theme', themeId); } catch (_) {}
  };

  // On mount, restore saved theme
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('fo-theme') as ThemeId | null;
      if (saved && themes.find((t) => t.id === saved)) {
        applyTheme(saved);
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [notifPrefs, setNotifPrefs] = useState({
    paymentReceived: true, paymentOverdue: true,
    installmentDue: true, reconciliationFailed: true,
    largePayment: true, systemAlerts: false, reminders: true,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Settings"
        subtitle="Manage your finance portal preferences"
        icon={<Settings className="w-5 h-5" />}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <aside className="lg:w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-sans text-sm transition-all ${
                  activeTab === t.id
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)'
                    : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ── Profile ──────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Finance Profile</h3>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <img src={foProfile.avatar} alt={foProfile.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-(--accent-gold-border)" />
                  <button className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#E9C349] rounded-full flex items-center justify-center text-(--text-inverse)">
                    <User className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <p className="font-serif text-lg font-bold text-(--text-primary)">{foProfile.name}</p>
                  <p className="font-mono text-xs text-(--brand-gold)">{foProfile.employeeId}</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5">{foProfile.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name',    value: foProfile.name,       field: 'name' },
                  { label: 'Email',        value: foProfile.email,      field: 'email' },
                  { label: 'Phone',        value: foProfile.phone,      field: 'phone' },
                  { label: 'Office Room',  value: foProfile.officeRoom, field: 'office' },
                  { label: 'Department',   value: foProfile.department, field: 'dept' },
                  { label: 'Employee ID',  value: foProfile.employeeId, field: 'empid' },
                ].map((f) => (
                  <div key={f.field}>
                    <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">{f.label}</label>
                    <input defaultValue={f.value}
                      disabled={f.field === 'empid'}
                      className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button variant="primary" onClick={handleSave} icon={saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}>
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
                {saved && <p className="font-sans text-xs text-(--status-success)">Profile updated successfully.</p>}
              </div>
            </Card>
          )}

          {/* ── Password ──────────────────────────────────────────────────────── */}
          {activeTab === 'password' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Change Password</h3>
              <div className="space-y-4 max-w-sm">
                {[
                  { label: 'Current Password',  id: 'cur' },
                  { label: 'New Password',       id: 'new' },
                  { label: 'Confirm Password',   id: 'con' },
                ].map((f) => (
                  <div key={f.id}>
                    <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">{f.label}</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                        className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 pr-10 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors" />
                      <button onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-default) space-y-1">
                  <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Requirements</p>
                  {['At least 8 characters','One uppercase letter','One number','One special character'].map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-(--active-overlay)" />
                      <span className="font-sans text-xs text-(--text-muted)">{r}</span>
                    </div>
                  ))}
                </div>
                <Button variant="primary" onClick={handleSave} icon={<Lock className="w-4 h-4" />}>
                  {saved ? 'Password Updated!' : 'Update Password'}
                </Button>
              </div>
            </Card>
          )}

          {/* ── Notifications ─────────────────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Notification Preferences</h3>
              <div className="space-y-3">
                {([
                  { key: 'paymentReceived',      label: 'Payment Received',        desc: 'Alert when a student payment is recorded' },
                  { key: 'paymentOverdue',        label: 'Payment Overdue',         desc: 'Alert when a student account becomes overdue' },
                  { key: 'installmentDue',        label: 'Installment Due',         desc: 'Reminder when an installment is due' },
                  { key: 'reconciliationFailed',  label: 'Reconciliation Failed',   desc: 'Alert when a gateway transaction fails to match' },
                  { key: 'largePayment',          label: 'Large Payment Recorded',  desc: 'Alert for payments above ETB 20,000' },
                  { key: 'systemAlerts',          label: 'System Alerts',           desc: 'System maintenance and portal announcements' },
                  { key: 'reminders',             label: 'Task Reminders',          desc: 'Report deadlines and pending action reminders' },
                ] as { key: keyof typeof notifPrefs; label: string; desc: string }[]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                    <div>
                      <p className="font-sans text-sm font-medium text-(--text-primary)">{item.label}</p>
                      <p className="font-sans text-xs text-(--text-faint) mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${notifPrefs[item.key] ? 'bg-[#E9C349]' : 'bg-(--hover-overlay)'}`}
                      role="switch" aria-checked={notifPrefs[item.key]}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifPrefs[item.key] ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="primary" onClick={handleSave} icon={<Save className="w-4 h-4" />}>
                {saved ? 'Saved!' : 'Save Preferences'}
              </Button>
            </Card>
          )}

          {/* ── Appearance ────────────────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <Card hoverable={false} className="space-y-8">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Appearance</h3>

              {/* Theme */}
              <div className="space-y-3">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Theme</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themes.map((t) => {
                    const isActive = activeTheme === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        onClick={() => applyTheme(t.id)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative p-4 rounded-2xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-gold) ${
                          isActive
                            ? 'border-[#E9C349]/60 ring-2 ring-[#E9C349]/20'
                            : 'border-(--border-default) hover:border-white/25'
                        }`}
                        style={{ backgroundColor: t.bg }}
                      >
                        {/* Mini preview */}
                        <div className="flex gap-1.5 mb-3">
                          <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: 'rgba(233,195,73,0.25)' }} />
                          <div className="flex-1 space-y-1.5 pt-0.5">
                            <div className="h-1.5 rounded-full bg-(--active-overlay) w-3/4" />
                            <div className="h-1.5 rounded-full bg-(--hover-overlay) w-1/2" />
                          </div>
                        </div>

                        <p className="font-sans text-sm font-semibold text-(--text-primary)">{t.name}</p>
                        <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{t.desc}</p>

                        {isActive && (
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-(--brand-gold) font-mono text-[9px] font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Active
                            </span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {/* Live feedback */}
                <p className="font-sans text-xs text-(--text-faint)">
                  Theme applied instantly. Change persists across sessions.
                </p>
              </div>

              {/* Accent Color */}
              <div className="space-y-3">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Accent Color</p>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { color: '#E9C349', label: 'Harmony Gold' },
                    { color: '#60a5fa', label: 'Sky Blue' },
                    { color: '#34d399', label: 'Emerald' },
                    { color: '#f87171', label: 'Rose' },
                    { color: '#a78bfa', label: 'Violet' },
                  ].map((a) => (
                    <button
                      key={a.color}
                      title={a.label}
                      aria-label={`Set accent to ${a.label}`}
                      className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        a.color === '#E9C349' ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: a.color }}
                    />
                  ))}
                </div>
              </div>

              {/* Table Density */}
              <div className="space-y-3">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Table Density</p>
                <div className="flex gap-3 flex-wrap">
                  {['Comfortable', 'Compact', 'Spacious'].map((d) => (
                    <button
                      key={d}
                      className={`px-4 py-2 rounded-xl border font-sans text-sm transition-all ${
                        d === 'Comfortable'
                          ? 'border-(--accent-gold-border) bg-(--accent-gold-subtle) text-(--brand-gold)'
                          : 'border-(--border-default) text-(--text-muted) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ── Language ──────────────────────────────────────────────────────── */}
          {activeTab === 'language' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Language & Region</h3>
              <div className="space-y-4 max-w-sm">
                {[
                  { label: 'Display Language', options: ['English', 'Amharic (አማርኛ)', 'Afaan Oromo'], selected: 'English' },
                  { label: 'Currency Format',  options: ['ETB — Ethiopian Birr', 'USD — US Dollar'], selected: 'ETB — Ethiopian Birr' },
                  { label: 'Date Format',      options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], selected: 'YYYY-MM-DD' },
                  { label: 'Number Format',    options: ['1,234,567.89', '1.234.567,89'], selected: '1,234,567.89' },
                ].map((s) => (
                  <div key={s.label}>
                    <label className="block font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-2">{s.label}</label>
                    <select className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-2.5 font-sans text-sm text-(--text-primary) outline-none focus:border-(--brand-gold)/50 transition-colors">
                      {s.options.map((o) => <option key={o} value={o} className="bg-(--bg-card-solid)">{o}</option>)}
                    </select>
                  </div>
                ))}
                <Button variant="primary" onClick={handleSave} icon={<Save className="w-4 h-4" />}>
                  {saved ? 'Saved!' : 'Apply Settings'}
                </Button>
              </div>
            </Card>
          )}

          {/* ── Security ──────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Security</h3>
              <div className="space-y-3">
                {[
                  { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account', enabled: false },
                  { label: 'Login Notifications',        desc: 'Get notified when your account is accessed', enabled: true },
                  { label: 'Require Password on Receipt Export', desc: 'Prompt for password before bulk PDF export', enabled: true },
                  { label: 'Auto Logout on Inactivity',  desc: 'Automatically sign out after 30 minutes of inactivity', enabled: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                    <div>
                      <p className="font-sans text-sm font-medium text-(--text-primary)">{item.label}</p>
                      <p className="font-sans text-xs text-(--text-faint) mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.enabled ? 'emerald' : 'glass'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Sessions ──────────────────────────────────────────────────────── */}
          {activeTab === 'sessions' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-(--text-primary)">Active Sessions</h3>
              <div className="space-y-3">
                {[
                  { device: 'Chrome on Windows 11', ip: '192.168.1.10', location: 'Addis Ababa, ET', time: 'Now — Current session', current: true },
                  { device: 'Firefox on Windows 10', ip: '192.168.1.11', location: 'Addis Ababa, ET', time: '2024-10-14 14:22', current: false },
                  { device: 'Chrome on Android',     ip: '10.0.0.15',   location: 'Addis Ababa, ET', time: '2024-10-13 09:10', current: false },
                ].map((s, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${s.current ? 'border-(--accent-gold-border) bg-[#E9C349]/5' : 'border-(--border-subtle) bg-(--hover-overlay)'}`}>
                    <div className="flex items-center gap-3">
                      <Monitor className={`w-5 h-5 shrink-0 ${s.current ? 'text-(--brand-gold)' : 'text-(--text-faint)'}`} />
                      <div>
                        <p className="font-sans text-sm font-medium text-(--text-primary)">{s.device}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{s.ip} · {s.location}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{s.time}</p>
                      </div>
                    </div>
                    {s.current
                      ? <Badge variant="emerald">Active</Badge>
                      : <Button variant="danger" size="sm" onClick={() => {}}>Revoke</Button>}
                  </div>
                ))}
              </div>
              <Button variant="danger" size="sm" onClick={() => {}}>
                Revoke All Other Sessions
              </Button>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
