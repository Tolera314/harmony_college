'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  User, Shield, Key, Clock,
  Save, Monitor,
  Smartphone, LogOut, Sliders, Calendar, Power, Trash2, Plus, Info, Settings, CheckCheck
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AppearanceSection } from '../ui/AppearanceSection';
import { ConfirmModal } from '../ui/ConfirmModal';

interface RegistrarSettingsProps {
  initialTab?: 'account' | 'registration';
}

export const RegistrarSettings: React.FC<RegistrarSettingsProps> = ({ initialTab = 'account' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'account' | 'registration'>(initialTab);

  // ── Account & Security State ────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: 'Robel Bekele',
    title: 'University Registrar Officer',
    email: 'registrar@harmony.edu',
    phone: '+251911500330',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
  });

  const [password, setPassword] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const [toggles, setToggles] = useState({
    twoFa: false,
    darkMode: true,
    emailAlerts: true
  });

  const [sessions, setSessions] = useState([
    { id: 's1', device: 'HP Laptop · Firefox', ip: '196.188.100.44', location: 'Addis Ababa, ET', status: 'Active Now', current: true },
    { id: 's2', device: 'iPhone 15 Pro · Safari', ip: '196.188.100.45', location: 'Addis Ababa, ET', status: 'Active 2h ago', current: false }
  ]);

  // ── Registration Settings State ─────────────────────────────────────────────
  const [regDates, setRegDates] = useState({
    openDate: '2026-08-01',
    closeDate: '2026-08-20',
    addDeadline: '2026-08-05',
    dropDeadline: '2026-08-12',
    lateFeeDate: '2026-08-25'
  });

  const [regToggles, setRegToggles] = useState({
    lateRegistration: true,
    waitlistEnable: true,
    autoPromotion: true,
    seatAvailability: true,
    advisorApproval: false,
    gpaCapCheck: true
  });

  const [rules, setRules] = useState([
    { id: 'r1', name: 'Credit Hour Cap', desc: 'Maximum allowed credits for regular semester is 18.', enabled: true },
    { id: 'r2', name: 'GPA Honor Overload', desc: 'Students with CGPA >= 3.50 can register for up to 21 credits.', enabled: true },
    { id: 'r3', name: 'Prerequisite Verification', desc: 'Verify all course prerequisite trees before final course checkout.', enabled: true },
    { id: 'r4', name: 'Financial Clearance Block', desc: 'Block course registration if outstanding student tuition balance is > 0.', enabled: true },
    { id: 'r5', name: 'Probation Credit Limiter', desc: 'Limit probation students to a maximum of 12 credit hours.', enabled: false }
  ]);

  const [newRule, setNewRule] = useState({ name: '', desc: '' });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [regSaved, setRegSaved] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

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

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRegToggle = (key: keyof typeof regToggles) => {
    setRegToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRuleToggle = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;

    setRules(prev => [
      ...prev,
      { id: 'r' + (prev.length + 1), name: newRule.name, desc: newRule.desc || 'No description provided.', enabled: true }
    ]);
    setNewRule({ name: '', desc: '' });
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleRevokeSession = (id: string) => setRevokeTarget(id);
  const handleRevokeConfirm = () => {
    if (revokeTarget) setSessions(prev => prev.filter(s => s.id !== revokeTarget));
    setRevokeTarget(null);
  };

  const handleSaveRegSettings = () => {
    setRegSaved(true);
    setTimeout(() => setRegSaved(false), 3000);
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Settings Board</h2>
          <p className="text-xs text-white/50">Manage personal profile details, account security, and academic registration rules.</p>
        </div>

        {/* Sub-Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setActiveSubTab('account')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'account'
                ? 'bg-[#D4AF37] text-[#0F0F10] shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            <User className="w-3.5 h-3.5" /> Account & Profile
          </button>
          <button
            onClick={() => setActiveSubTab('registration')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'registration'
                ? 'bg-[#D4AF37] text-[#0F0F10] shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Registration Engine
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* SUB-SECTION 1: ACCOUNT & PROFILE SETTINGS                                     */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Side: Profile & Password (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Profile Edit Form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#D4AF37]" /> Personal Profile Information
              </h3>

              <form onSubmit={handleProfileSave} className="space-y-4 font-sans">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <img src={profile.avatar} alt={profile.name} className="w-14 h-14 rounded-xl border border-white/10 object-cover" />
                  <div className="space-y-1">
                    <p className="text-xs text-white/40">Profile Photo</p>
                    <Button variant="secondary" size="xs" type="button" className="font-semibold text-[10px] py-1.5">Change Photo</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Designation / Role Title</label>
                    <input
                      type="text"
                      disabled
                      value={profile.title}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white/40 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-2">
                  {profileSaved && (
                    <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                      <CheckCheck className="w-4 h-4" /> Saved
                    </span>
                  )}
                  <Button variant="gold" size="sm" type="submit" className="font-semibold text-xs py-2 flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> Save Profile Info
                  </Button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#D4AF37]" /> Change Account Password
              </h3>

              <form onSubmit={handlePasswordSave} className="space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/80">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password.current}
                    onChange={(e) => setPassword(prev => ({ ...prev, current: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password.newPass}
                      onChange={(e) => setPassword(prev => ({ ...prev, newPass: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password.confirm}
                      onChange={(e) => setPassword(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-2">
                  {passwordError && (
                    <span className="text-xs text-red-400 font-semibold">{passwordError}</span>
                  )}
                  {passwordSaved && (
                    <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                      <CheckCheck className="w-4 h-4" /> Credentials updated
                    </span>
                  )}
                  <Button variant="gold" size="sm" type="submit" className="font-semibold text-xs py-2 flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> Save Credentials
                  </Button>
                </div>
              </form>
            </div>

          </div>

          {/* Right Side: Security & Sessions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Security Preferences Toggles */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D4AF37]" /> Security Toggles
              </h3>

              <div className="space-y-4 font-sans">
                {[
                  { key: 'twoFa', label: 'Two-Factor Auth (2FA)', desc: 'Secures login with verification code dispatches.' },
                ].map(sw => (
                  <div key={sw.key} className="flex justify-between items-start gap-4 p-3 bg-black/20 border border-white/5 rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">{sw.label}</p>
                      <p className="text-[10px] text-white/40">{sw.desc}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(sw.key as any)}
                      className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${toggles[sw.key as keyof typeof toggles] ? 'bg-[#D4AF37]' : 'bg-white/10'
                        }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform duration-200 ${toggles[sw.key as keyof typeof toggles] ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Appearance */}
            <AppearanceSection variant="inline" />

            {/* Session Manager list */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4 font-sans">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#D4AF37]" /> Active Login Sessions
              </h3>

              <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="p-3.5 bg-black/20 border border-white/5 rounded-xl flex items-start gap-3 justify-between">
                    <div className="flex gap-2.5">
                      <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white/55 shrink-0 flex items-center justify-center">
                        {s.device.includes('iPhone') ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{s.device}</p>
                        <p className="text-[9px] font-mono text-white/45">{s.ip} · {s.location}</p>
                        <span className="text-[9px] text-[#D4AF37] font-mono font-bold block mt-1">{s.status}</span>
                      </div>
                    </div>

                    {!s.current && (
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/35 rounded-lg text-white/40 hover:text-red-400 transition-all shrink-0"
                        title="Revoke Session"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* SUB-SECTION 2: REGISTRATION ENGINE SETTINGS                                   */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'registration' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Side: Windows & Switches (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Registration Period Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#D4AF37]" /> Registration Windows
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-white/40 uppercase">Open Date</label>
                    <input
                      type="date"
                      value={regDates.openDate}
                      onChange={(e) => setRegDates(prev => ({ ...prev, openDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-white/40 uppercase">Close Date</label>
                    <input
                      type="date"
                      value={regDates.closeDate}
                      onChange={(e) => setRegDates(prev => ({ ...prev, closeDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-white/40 uppercase">Add Course Deadline</label>
                    <input
                      type="date"
                      value={regDates.addDeadline}
                      onChange={(e) => setRegDates(prev => ({ ...prev, addDeadline: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-white/40 uppercase">Drop Course Deadline</label>
                    <input
                      type="date"
                      value={regDates.dropDeadline}
                      onChange={(e) => setRegDates(prev => ({ ...prev, dropDeadline: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Switches */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#D4AF37]" /> Enrollment Feature Switches
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'lateRegistration', label: 'Late Registration Period', desc: 'Allows students to register after the Close date.' },
                    { key: 'waitlistEnable', label: 'Waitlist Functionality', desc: 'Enables waitlists when sections hit capacity.' },
                    { key: 'autoPromotion', label: 'Automatic Waitlist Promotion', desc: 'Automatically fills dropped seats from waitlists.' },
                    { key: 'seatAvailability', label: 'Live Seat Availability Info', desc: 'Displays live capacity statistics to students.' },
                    { key: 'advisorApproval', label: 'Advisor Sign-off Required', desc: 'Blocks checks until academic advisors sign off.' },
                    { key: 'gpaCapCheck', label: 'GPA Overload Rule Engine', desc: 'Applies dynamic credit cap overrides based on GPA.' }
                  ].map((sw) => (
                    <div
                      key={sw.key}
                      className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-white">{sw.label}</p>
                        <p className="text-[10px] text-white/40 leading-relaxed">{sw.desc}</p>
                      </div>

                      <button
                        onClick={() => handleRegToggle(sw.key as any)}
                        className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${regToggles[sw.key as keyof typeof regToggles] ? 'bg-[#D4AF37]' : 'bg-white/10'
                          }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform duration-200 ${regToggles[sw.key as keyof typeof regToggles] ? 'translate-x-4.5' : 'translate-x-0.5'
                            }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Side: Verification Rules (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h3 className="font-serif text-lg font-bold text-white">Curriculum Verification Rules</h3>
                <p className="text-[11px] text-white/40">Enable or disable compliance checks inside the registration portal.</p>

                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3.5 border rounded-xl flex items-start gap-3 transition-colors ${rule.enabled
                          ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20'
                          : 'bg-white/[0.02] border-white/5 opacity-55'
                        }`}
                    >
                      <button
                        onClick={() => handleRuleToggle(rule.id)}
                        className={`p-1 rounded-lg border transition-colors ${rule.enabled
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'
                            : 'bg-white/5 border-white/10 text-white/40'
                          }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white">{rule.name}</p>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-white/30 hover:text-red-400 transition-colors"
                            title="Remove Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddRule} className="border-t border-white/5 pt-4 space-y-3">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-white/40">Add Registration Rule</h4>

                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Rule Identifier (e.g. Min Credit Cap)"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <input
                      type="text"
                      placeholder="Rule Description / constraints details..."
                      value={newRule.desc}
                      onChange={(e) => setNewRule(prev => ({ ...prev, desc: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    type="submit"
                    className="w-full py-2.5 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Rule
                  </Button>
                </form>
              </div>

              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-3 text-xs leading-relaxed text-yellow-300">
                <Info className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                <div>
                  <strong>Rule Modification Alert:</strong> Disabling standard verification rules (e.g. prerequisite trees) takes effect immediately and affects ongoing checkouts.
                </div>
              </div>
            </div>

          </div>
          <div className="flex justify-end items-center gap-3">
            {regSaved && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                <CheckCheck className="w-4 h-4" /> Configuration saved
              </span>
            )}
            <Button
              variant="gold"
              size="sm"
              onClick={handleSaveRegSettings}
              className="flex items-center gap-1.5 py-2 font-semibold text-xs"
            >
              <Save className="w-4 h-4" /> Save Configuration
            </Button>
          </div>
        </div>
      )}
    </motion.div>

    <ConfirmModal
      isOpen={!!revokeTarget}
      onClose={() => setRevokeTarget(null)}
      onConfirm={handleRevokeConfirm}
      title="Revoke Session"
      message="Are you sure you want to terminate this authenticated device session?"
      icon={<LogOut className="w-6 h-6" />}
      variant="danger"
      confirmLabel="Revoke Session"
    />
    </>
  );
};
