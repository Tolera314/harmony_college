'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User, Shield, Key, Clock, Save,
  Monitor, Smartphone, LogOut, CheckCircle2, Palette,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AppearanceSection } from '../ui/AppearanceSection';

type SettingsTab = 'profile' | 'password' | 'appearance' | 'security' | 'sessions';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',    label: 'Personal Profile',   icon: <User className="w-4 h-4" /> },
  { id: 'password',   label: 'Password',           icon: <Key className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance & Theme', icon: <Palette className="w-4 h-4" /> },
  { id: 'security',   label: 'Security',           icon: <Shield className="w-4 h-4" /> },
  { id: 'sessions',   label: 'Active Sessions',    icon: <Clock className="w-4 h-4" /> },
];

export const RegistrarSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Robel Bekele',
    title: 'University Registrar Officer',
    email: 'registrar@harmony.edu',
    phone: '+251911500330',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  });

  const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });

  const [toggles, setToggles] = useState({ twoFa: false, emailAlerts: true });

  const [sessions, setSessions] = useState([
    { id: 's1', device: 'HP Laptop · Firefox',    ip: '196.188.100.44', location: 'Addis Ababa, ET', status: 'Active Now',   current: true  },
    { id: 's2', device: 'iPhone 15 Pro · Safari', ip: '196.188.100.45', location: 'Addis Ababa, ET', status: 'Active 2h ago', current: false },
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.newPass !== password.confirm) {
      alert('Password Error: New password fields do not match.');
      return;
    }
    handleSave();
    setPassword({ current: '', newPass: '', confirm: '' });
  };

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRevokeSession = (id: string) => {
    if (confirm('Are you sure you want to terminate this authenticated device session?')) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors";
  const labelCls = "text-xs font-semibold text-white/80";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold text-white tracking-wide">Account & Settings</h2>
          <p className="text-xs text-white/50 mt-0.5">Manage personal profile, credentials, theme, and active sessions.</p>
        </div>
      </div>

      {/* Save success toast */}
      {saved && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl font-sans text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Changes saved successfully!
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar tabs */}
        <aside className="lg:w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-sans text-sm transition-all ${
                  activeTab === t.id
                    ? 'bg-[#D4AF37]/12 text-[#D4AF37] border border-[#D4AF37]/20'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content panel */}
        <div className="flex-1 min-w-0">

          {/* ── Personal Profile ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <User className="w-5 h-5 text-[#D4AF37]" /> Personal Profile Information
              </h3>
              <form onSubmit={handleProfileSave} className="space-y-5 font-sans">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  {profile.avatar
                    ? <img src={profile.avatar || undefined} alt={profile.name} className="w-14 h-14 rounded-xl border border-white/10 object-cover" />
                    : <div className="w-14 h-14 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center font-serif text-2xl text-[#D4AF37]">{profile.name.charAt(0)}</div>
                  }
                  <div className="space-y-1">
                    <p className="text-xs text-white/40">Profile Photo</p>
                    <Button variant="secondary" size="xs" type="button" className="text-[10px] py-1.5">Change Photo</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Full Name</label>
                    <input type="text" required value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Designation / Role Title</label>
                    <input type="text" disabled value={profile.title}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white/40 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Email Address</label>
                    <input type="email" required value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Phone Number</label>
                    <input type="text" required value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button variant="gold" size="sm" type="submit" icon={<Save className="w-3.5 h-3.5" />}>
                    Save Profile
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Password ─────────────────────────────────────────────────── */}
          {activeTab === 'password' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Key className="w-5 h-5 text-[#D4AF37]" /> Change Account Password
              </h3>
              <form onSubmit={handlePasswordSave} className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className={labelCls}>Current Password</label>
                  <input type="password" required placeholder="••••••••••••"
                    value={password.current}
                    onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))}
                    className={inputCls} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={labelCls}>New Password</label>
                    <input type="password" required placeholder="••••••••••••"
                      value={password.newPass}
                      onChange={(e) => setPassword((p) => ({ ...p, newPass: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Confirm New Password</label>
                    <input type="password" required placeholder="••••••••••••"
                      value={password.confirm}
                      onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">Requirements</p>
                  {['At least 8 characters', 'One uppercase letter', 'One number', 'One special character'].map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="font-sans text-xs text-white/50">{r}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-1">
                  <Button variant="gold" size="sm" type="submit" icon={<Save className="w-3.5 h-3.5" />}>
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Appearance ───────────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <AppearanceSection variant="inline" title="Appearance & Theme" />
            </div>
          )}

          {/* ── Security ─────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Shield className="w-5 h-5 text-[#D4AF37]" /> Security Preferences
              </h3>
              <div className="space-y-3 font-sans">
                {([
                  { key: 'twoFa',       label: 'Two-Factor Authentication (2FA)', desc: 'Secures login with a verification code on each sign-in.' },
                  { key: 'emailAlerts', label: 'Login Email Alerts',              desc: 'Receive an email whenever a new session is started.' },
                ] as { key: keyof typeof toggles; label: string; desc: string }[]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-xs font-semibold text-white">{item.label}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(item.key)}
                      className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${
                        toggles[item.key] ? 'bg-[#D4AF37]' : 'bg-white/10'
                      }`}
                    >
                      <span className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform duration-200 ${
                        toggles[item.key] ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Active Sessions ───────────────────────────────────────────── */}
          {activeTab === 'sessions' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Clock className="w-5 h-5 text-[#D4AF37]" /> Active Login Sessions
              </h3>
              <div className="space-y-3 font-sans">
                {sessions.map((s) => (
                  <div key={s.id} className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                    s.current ? 'border-[#D4AF37]/30 bg-[#D4AF37]/5' : 'border-white/8 bg-black/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white/50 shrink-0">
                        {s.device.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{s.device}</p>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">{s.ip} · {s.location}</p>
                        <span className={`text-[10px] font-mono font-bold mt-1 block ${s.current ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                    {s.current
                      ? <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-mono text-[10px] font-bold border border-[#D4AF37]/30 shrink-0">Current</span>
                      : (
                        <button
                          onClick={() => handleRevokeSession(s.id)}
                          className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/40 rounded-lg text-white/40 hover:text-red-400 transition-all shrink-0"
                          title="Revoke Session"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
};
