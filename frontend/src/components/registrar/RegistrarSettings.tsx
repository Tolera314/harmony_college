'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User, Shield, Key, Clock, Save, Monitor, Palette,
  Smartphone, LogOut, Sliders, Calendar, Power, Trash2,
  Plus, Info, Settings, CheckCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AppearanceSection } from '../ui/AppearanceSection';

type SettingsTab = 'profile' | 'account' | 'password' | 'appearance' | 'security' | 'sessions' | 'registration';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',      label: 'Personal Profile',    icon: <User className="w-4 h-4" /> },
  { id: 'password',     label: 'Password',            icon: <Key className="w-4 h-4" /> },
  { id: 'appearance',   label: 'Appearance & Theme',  icon: <Palette className="w-4 h-4" /> },
  { id: 'security',     label: 'Security',            icon: <Shield className="w-4 h-4" /> },
  { id: 'sessions',     label: 'Active Sessions',     icon: <Clock className="w-4 h-4" /> },
  { id: 'registration', label: 'Registration Engine', icon: <Sliders className="w-4 h-4" /> },
];

const inputCls = 'w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors';
const labelCls = 'text-xs font-semibold text-white/80';

export const RegistrarSettings: React.FC<{ initialTab?: SettingsTab }> = ({ initialTab }) => {
  const [activeTab,   setActiveTab]   = useState<SettingsTab>(initialTab ?? 'profile');
  const resolvedTab = activeTab === 'account' ? 'profile' : activeTab;

  const [profile, setProfile] = useState({
    name:   'Robel Bekele',
    title:  'University Registrar Officer',
    email:  'registrar@harmony.edu',
    phone:  '+251911500330',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  });

  const [password,      setPassword]      = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [regSaved,      setRegSaved]      = useState(false);

  const [toggles, setToggles] = useState({ twoFa: false, emailAlerts: true });

  const [sessions, setSessions] = useState([
    { id: 's1', device: 'HP Laptop · Firefox',    ip: '196.188.100.44', location: 'Addis Ababa, ET', status: 'Active Now',    current: true  },
    { id: 's2', device: 'iPhone 15 Pro · Safari', ip: '196.188.100.45', location: 'Addis Ababa, ET', status: 'Active 2h ago', current: false },
  ]);

  const [regDates, setRegDates] = useState({
    openDate: '2026-08-01', closeDate: '2026-08-20',
    addDeadline: '2026-08-05', dropDeadline: '2026-08-12',
  });

  const [regToggles, setRegToggles] = useState({
    lateRegistration: true, waitlistEnable: true,
    autoPromotion: true, advisorApproval: false, gpaCapCheck: true,
  });

  const [rules, setRules] = useState([
    { id: 'r1', name: 'Credit Hour Cap',          desc: 'Maximum allowed credits for regular semester is 18.',                     enabled: true  },
    { id: 'r2', name: 'GPA Honor Overload',        desc: 'Students with CGPA >= 3.50 can register for up to 21 credits.',           enabled: true  },
    { id: 'r3', name: 'Prerequisite Verification', desc: 'Verify all course prerequisite trees before final course checkout.',       enabled: true  },
    { id: 'r4', name: 'Financial Clearance Block', desc: 'Block course registration if outstanding student tuition balance is > 0.', enabled: true  },
    { id: 'r5', name: 'Probation Credit Limiter',  desc: 'Limit probation students to a maximum of 12 credit hours.',               enabled: false },
  ]);
  const [newRule, setNewRule] = useState({ name: '', desc: '' });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.newPass !== password.confirm) {
      setPasswordError('New password fields do not match.');
      return;
    }
    setPasswordError('');
    setPasswordSaved(true);
    setPassword({ current: '', newPass: '', confirm: '' });
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const handleToggle    = (key: keyof typeof toggles)    => setToggles((p)    => ({ ...p, [key]: !p[key] }));
  const handleRegToggle = (key: keyof typeof regToggles) => setRegToggles((p) => ({ ...p, [key]: !p[key] }));
  const handleRuleToggle = (id: string) => setRules((p) => p.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const handleDeleteRule = (id: string) => setRules((p) => p.filter((r) => r.id !== id));

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;
    setRules((p) => [...p, { id: `r${p.length + 1}`, name: newRule.name, desc: newRule.desc || 'No description.', enabled: true }]);
    setNewRule({ name: '', desc: '' });
  };

  const handleRevokeSession = (id: string) => {
    if (confirm('Terminate this authenticated device session?')) {
      setSessions((p) => p.filter((s) => s.id !== id));
    }
  };

  const handleSaveRegSettings = () => {
    setRegSaved(true);
    setTimeout(() => setRegSaved(false), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold text-white tracking-wide">Account & Settings</h2>
          <p className="text-xs text-white/50 mt-0.5">Profile, credentials, theme, sessions, and registration engine.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-sans text-sm transition-all ${
                  resolvedTab === (t.id === 'account' ? 'profile' : t.id)
                    ? 'bg-[#D4AF37]/12 text-[#D4AF37] border border-[#D4AF37]/20'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Profile ──────────────────────────────────────────────────── */}
          {resolvedTab === 'profile' && (
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
                  <div className="space-y-1.5"><label className={labelCls}>Full Name</label>
                    <input type="text" required value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className={inputCls} /></div>
                  <div className="space-y-1.5"><label className={labelCls}>Designation</label>
                    <input type="text" disabled value={profile.title} className="w-full px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white/40 cursor-not-allowed" /></div>
                  <div className="space-y-1.5"><label className={labelCls}>Email Address</label>
                    <input type="email" required value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className={inputCls} /></div>
                  <div className="space-y-1.5"><label className={labelCls}>Phone Number</label>
                    <input type="text" required value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className={inputCls} /></div>
                </div>
                <div className="flex justify-end items-center gap-3 pt-1">
                  {profileSaved && <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold"><CheckCheck className="w-4 h-4" /> Saved</span>}
                  <Button variant="gold" size="sm" type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Profile</Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Password ─────────────────────────────────────────────────── */}
          {resolvedTab === 'password' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Key className="w-5 h-5 text-[#D4AF37]" /> Change Account Password
              </h3>
              <form onSubmit={handlePasswordSave} className="space-y-4 font-sans">
                <div className="space-y-1.5"><label className={labelCls}>Current Password</label>
                  <input type="password" required placeholder="••••••••••••" value={password.current}
                    onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))} className={inputCls} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className={labelCls}>New Password</label>
                    <input type="password" required placeholder="••••••••••••" value={password.newPass}
                      onChange={(e) => setPassword((p) => ({ ...p, newPass: e.target.value }))} className={inputCls} /></div>
                  <div className="space-y-1.5"><label className={labelCls}>Confirm Password</label>
                    <input type="password" required placeholder="••••••••••••" value={password.confirm}
                      onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} className={inputCls} /></div>
                </div>
                <div className="flex justify-end items-center gap-3 pt-1">
                  {passwordError && <span className="text-xs text-red-400 font-semibold">{passwordError}</span>}
                  {passwordSaved && <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold"><CheckCheck className="w-4 h-4" /> Updated</span>}
                  <Button variant="gold" size="sm" type="submit" icon={<Save className="w-3.5 h-3.5" />}>Update Password</Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Appearance ───────────────────────────────────────────────── */}
          {resolvedTab === 'appearance' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <AppearanceSection variant="inline" title="Appearance & Theme" />
            </div>
          )}

          {/* ── Security ─────────────────────────────────────────────────── */}
          {resolvedTab === 'security' && (
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
                    <button onClick={() => handleToggle(item.key)}
                      className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${toggles[item.key] ? 'bg-[#D4AF37]' : 'bg-white/10'}`}>
                      <span className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform duration-200 ${toggles[item.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Sessions ─────────────────────────────────────────────────── */}
          {resolvedTab === 'sessions' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Clock className="w-5 h-5 text-[#D4AF37]" /> Active Login Sessions
              </h3>
              <div className="space-y-3 font-sans">
                {sessions.map((s) => (
                  <div key={s.id} className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${s.current ? 'border-[#D4AF37]/30 bg-[#D4AF37]/5' : 'border-white/8 bg-black/20'}`}>
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white/50 shrink-0">
                        {s.device.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{s.device}</p>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">{s.ip} · {s.location}</p>
                        <span className={`text-[10px] font-mono font-bold mt-1 block ${s.current ? 'text-[#D4AF37]' : 'text-white/40'}`}>{s.status}</span>
                      </div>
                    </div>
                    {s.current
                      ? <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-mono text-[10px] font-bold border border-[#D4AF37]/30 shrink-0">Current</span>
                      : <button onClick={() => handleRevokeSession(s.id)}
                          className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/40 rounded-lg text-white/40 hover:text-red-400 transition-all shrink-0" title="Revoke">
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Registration Engine ───────────────────────────────────────── */}
          {resolvedTab === 'registration' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Registration Dates */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#D4AF37]" /> Registration Windows
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                    {[
                      { key: 'openDate',    label: 'Open Date' },
                      { key: 'closeDate',   label: 'Close Date' },
                      { key: 'addDeadline', label: 'Add Deadline' },
                      { key: 'dropDeadline',label: 'Drop Deadline' },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-[11px] font-mono text-white/40 uppercase">{f.label}</label>
                        <input type="date" value={regDates[f.key as keyof typeof regDates]}
                          onChange={(e) => setRegDates((p) => ({ ...p, [f.key]: e.target.value }))}
                          className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature toggles */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#D4AF37]" /> Feature Switches
                  </h3>
                  <div className="space-y-3 font-sans">
                    {([
                      { key: 'lateRegistration', label: 'Late Registration Period', desc: 'Allow registration after close date.' },
                      { key: 'waitlistEnable',   label: 'Waitlist Functionality',   desc: 'Enable waitlists at capacity.' },
                      { key: 'autoPromotion',    label: 'Auto Waitlist Promotion',  desc: 'Fill dropped seats automatically.' },
                      { key: 'advisorApproval',  label: 'Advisor Sign-off',         desc: 'Require advisor approval to register.' },
                      { key: 'gpaCapCheck',      label: 'GPA Overload Rule',        desc: 'Apply dynamic credit cap based on GPA.' },
                    ] as { key: keyof typeof regToggles; label: string; desc: string }[]).map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-xs font-semibold text-white">{item.label}</p>
                          <p className="text-[10px] text-white/40">{item.desc}</p>
                        </div>
                        <button onClick={() => handleRegToggle(item.key)}
                          className={`w-9 h-5 rounded-full shrink-0 relative transition-colors focus:outline-none ${regToggles[item.key] ? 'bg-[#D4AF37]' : 'bg-white/10'}`}>
                          <span className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform ${regToggles[item.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h3 className="font-serif text-lg font-bold text-white">Curriculum Verification Rules</h3>
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className={`p-3.5 border rounded-xl flex items-start gap-3 transition-colors ${rule.enabled ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' : 'bg-white/[0.02] border-white/5 opacity-55'}`}>
                      <button onClick={() => handleRuleToggle(rule.id)}
                        className={`p-1 rounded-lg border transition-colors ${rule.enabled ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-white/5 border-white/10 text-white/40'}`}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white">{rule.name}</p>
                          <button onClick={() => handleDeleteRule(rule.id)} className="text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddRule} className="border-t border-white/5 pt-4 space-y-3">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-white/40">Add Rule</p>
                  <input type="text" required placeholder="Rule name…" value={newRule.name}
                    onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]" />
                  <input type="text" placeholder="Description…" value={newRule.desc}
                    onChange={(e) => setNewRule((p) => ({ ...p, desc: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]" />
                  <Button variant="secondary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />} className="w-full">Add Rule</Button>
                </form>
              </div>

              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-3 text-xs text-yellow-300">
                <Info className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                <span><strong>Alert:</strong> Disabling verification rules takes effect immediately and affects active student checkouts.</span>
              </div>

              <div className="flex justify-end items-center gap-3">
                {regSaved && <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold"><CheckCheck className="w-4 h-4" /> Saved</span>}
                <Button variant="gold" size="sm" onClick={handleSaveRegSettings} icon={<Save className="w-4 h-4" />}>Save Configuration</Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
};
