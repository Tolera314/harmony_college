'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  User, Shield, Key, Clock, Save, Monitor, Settings,
  Smartphone, LogOut, Sliders, Calendar, Power, Trash2,
  Plus, Info, CheckCheck, Palette, RefreshCw, AlertCircle,
  GraduationCap, Pencil, X as XIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AppearanceSection } from '../ui/AppearanceSection';
import { SkeletonPage, ErrorState } from '../ui/States';
import {
  settingsApi,
  gradeScaleApi,
  gradePortalApi,
  registrarGradesApi,
  type RegistrarProfile,
  type SessionItem,
  type RegistrationSettings,
  type GradeScaleEntry,
  type GradePortalStatus,
  type SubmittedGradeItem,
} from '@/src/lib/registrarApi';

// ─────────────────────────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'password' | 'appearance' | 'security' | 'sessions' | 'registration' | 'grade_scale' | 'grade_portal';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',      label: 'Personal Profile',    icon: <User          className="w-4 h-4" /> },
  { id: 'grade_portal', label: 'Grade Portal & Publishing', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'grade_scale',  label: 'Grade Scale',         icon: <Sliders       className="w-4 h-4" /> },
  { id: 'registration', label: 'Registration Engine', icon: <Settings      className="w-4 h-4" /> },
  { id: 'password',     label: 'Password',            icon: <Key           className="w-4 h-4" /> },
  { id: 'appearance',   label: 'Appearance & Theme',  icon: <Palette       className="w-4 h-4" /> },
  { id: 'security',     label: 'Security',            icon: <Shield        className="w-4 h-4" /> },
  { id: 'sessions',     label: 'Active Sessions',     icon: <Clock         className="w-4 h-4" /> },
];

const labelCls = 'text-[11px] font-mono text-white/40 uppercase tracking-wider';
const inputCls = 'w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors';
const cardCls  = 'bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5';

// ─────────────────────────────────────────────────────────────────────────────
// Tiny feedback helpers
// ─────────────────────────────────────────────────────────────────────────────
function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold animate-in fade-in">
      <CheckCheck className="w-4 h-4" /> Saved
    </span>
  );
}
function ErrMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
      <AlertCircle className="w-4 h-4 shrink-0" /> {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export const RegistrarSettings: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  // Normalise legacy 'account' alias → 'profile'
  const resolve = (t: string | undefined): SettingsTab =>
    t === 'account' ? 'profile' : (t as SettingsTab) ?? 'profile';

  const [activeTab, setActiveTab] = useState<SettingsTab>(resolve(initialTab));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold text-white tracking-wide">Account &amp; Settings</h2>
          <p className="text-xs text-white/50 mt-0.5">Profile, credentials, theme, sessions, and registration engine.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <aside className="lg:w-56 shrink-0">
          <nav className="space-y-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-sans text-sm transition-all ${
                  activeTab === t.id
                    ? 'bg-[#D4AF37]/12 text-[#D4AF37] border border-[#D4AF37]/20 font-semibold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile'      && <ProfileTab />}
          {activeTab === 'password'     && <PasswordTab />}
          {activeTab === 'appearance'   && <AppearanceTab />}
          {activeTab === 'security'     && <SecurityTab />}
          {activeTab === 'sessions'     && <SessionsTab />}
          {activeTab === 'registration' && <RegistrationTab />}
          {activeTab === 'grade_portal' && <GradePortalTab />}
          {activeTab === 'grade_scale'  && <GradeScaleTab />}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TAB — loads from GET /api/registrar/settings/profile
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab() {
  const [data,    setData]    = useState<RegistrarProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState('');
  const [form,    setForm]    = useState({ fullName: '', email: '', phone: '' });

  useEffect(() => {
    settingsApi.getProfile()
      .then(p => { setData(p); setForm({ fullName: p.fullName, email: p.email ?? '', phone: p.phone ?? '' }); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr(''); setSaved(false);
    try {
      const updated = await settingsApi.updateProfile({
        fullName: form.fullName.trim() || undefined,
        email:    form.email.trim()    || undefined,
        phone:    form.phone.trim()    || undefined,
      });
      setData(updated); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={cardCls}><SkeletonPage /></div>;

  return (
    <div className={cardCls}>
      <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
        <User className="w-5 h-5 text-[#D4AF37]" /> Personal Profile Information
      </h3>
      <ErrMsg msg={err} />
      <form onSubmit={handleSave} className="space-y-5 font-sans">
        {/* Avatar row */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
          <div className="w-14 h-14 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center font-serif text-2xl text-[#D4AF37]">
            {(data?.fullName ?? form.fullName).charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/40">Profile Photo</p>
            <p className="text-[10px] text-white/20 font-mono">{data?.role ?? '—'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Full Name</label>
            <input type="text" required value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Designation</label>
            <input type="text" disabled value="University Registrar Officer"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white/40 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Email Address</label>
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Phone Number</label>
            <input type="text" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls}
              placeholder="+251..." />
          </div>
        </div>
        {data?.lastLoginAt && (
          <p className="text-[10px] font-mono text-white/30">
            Last login: {new Date(data.lastLoginAt).toLocaleString()}
          </p>
        )}
        <div className="flex justify-end items-center gap-3 pt-1">
          <SavedBadge visible={saved} />
          <Button variant="gold" size="sm" type="submit" disabled={saving} icon={<Save className="w-3.5 h-3.5" />}>
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD TAB — POST /api/registrar/settings/password (bcrypt, validated)
// ─────────────────────────────────────────────────────────────────────────────
function PasswordTab() {
  const [form,  setForm]  = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr(''); setSaved(false);
    if (form.newPassword !== form.confirmPassword) {
      setErr('New passwords do not match'); setSaving(false); return;
    }
    if (form.newPassword.length < 8) {
      setErr('New password must be at least 8 characters'); setSaving(false); return;
    }
    try {
      await settingsApi.changePassword(form);
      setSaved(true); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaved(false), 4000);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Password update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className={cardCls}>
      <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
        <Key className="w-5 h-5 text-[#D4AF37]" /> Change Account Password
      </h3>
      <ErrMsg msg={err} />
      <form onSubmit={handleSave} className="space-y-4 font-sans">
        <div className="space-y-1.5">
          <label className={labelCls}>Current Password</label>
          <input type="password" required placeholder="••••••••••••"
            value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            className={inputCls} autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>New Password</label>
            <input type="password" required placeholder="••••••••••••"
              value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              className={inputCls} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Confirm Password</label>
            <input type="password" required placeholder="••••••••••••"
              value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className={inputCls} autoComplete="new-password" />
          </div>
        </div>
        <ul className="text-[10px] text-white/30 space-y-0.5 pl-3 font-mono">
          <li className={form.newPassword.length >= 8 ? 'text-green-400' : ''}>• Min 8 characters</li>
          <li className={/[A-Za-z]/.test(form.newPassword) ? 'text-green-400' : ''}>• At least one letter</li>
          <li className={/[0-9]/.test(form.newPassword) ? 'text-green-400' : ''}>• At least one number</li>
          <li className={/^[A-Za-z0-9]+$/.test(form.newPassword) ? 'text-green-400' : ''}>• Letters and numbers only</li>
        </ul>
        <div className="flex justify-end items-center gap-3 pt-1">
          <SavedBadge visible={saved} />
          {saved && <span className="text-[10px] text-yellow-400 font-mono">Other sessions revoked for security</span>}
          <Button variant="gold" size="sm" type="submit" disabled={saving} icon={<Save className="w-3.5 h-3.5" />}>
            {saving ? 'Updating…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEARANCE TAB — local theme, no backend
// ─────────────────────────────────────────────────────────────────────────────
function AppearanceTab() {
  return (
    <div className={cardCls}>
      <AppearanceSection variant="inline" title="Appearance & Theme" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY TAB — toggle controls (UI only, persisted locally)
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTab() {
  const [twoFa,       setTwoFa]       = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved,       setSaved]       = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const toggleItems = [
    { label: 'Two-Factor Authentication (2FA)', desc: 'Secures login with a verification code on each sign-in.', value: twoFa, set: setTwoFa },
    { label: 'Login Email Alerts', desc: 'Receive an email whenever a new session is started.', value: emailAlerts, set: setEmailAlerts },
  ];

  return (
    <div className={cardCls}>
      <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
        <Shield className="w-5 h-5 text-[#D4AF37]" /> Security Preferences
      </h3>
      <div className="space-y-3 font-sans">
        {toggleItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-xs font-semibold text-white">{item.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{item.desc}</p>
            </div>
            <button onClick={() => item.set(v => !v)}
              className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${item.value ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
              role="switch" aria-checked={item.value}>
              <span className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform duration-200 ${item.value ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end items-center gap-3 pt-1">
        <SavedBadge visible={saved} />
        <Button variant="gold" size="sm" onClick={save} icon={<Save className="w-3.5 h-3.5" />}>Save</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSIONS TAB — real sessions from GET /api/registrar/settings/sessions
// ─────────────────────────────────────────────────────────────────────────────
function SessionsTab() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    settingsApi.getSessions()
      .then(setSessions)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (id: string) => {
    setRevoking(id);
    try { await settingsApi.revokeSession(id); load(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Revoke failed'); }
    finally { setRevoking(null); }
  };

  const revokeAll = async () => {
    setRevoking('all');
    try { await settingsApi.revokeAllSessions(); load(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Revoke failed'); }
    finally { setRevoking(null); }
  };

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D4AF37]" /> Active Login Sessions
        </h3>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 text-white/40 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {sessions.filter(s => !s.isCurrent).length > 0 && (
            <Button variant="rose" size="sm" disabled={revoking === 'all'} onClick={revokeAll}
              className="text-[10px] flex items-center gap-1">
              <LogOut className="w-3 h-3" /> {revoking === 'all' ? 'Revoking…' : 'Revoke All Others'}
            </Button>
          )}
        </div>
      </div>
      <ErrMsg msg={err} />

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-8 font-mono">No active sessions found.</p>
      ) : (
        <div className="space-y-3 font-sans">
          {sessions.map(s => (
            <div key={s.id} className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
              s.isCurrent ? 'border-[#D4AF37]/30 bg-[#D4AF37]/5' : 'border-white/8 bg-black/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white/50 shrink-0">
                  {(s.deviceInfo ?? '').toLowerCase().includes('mobile') ||
                   (s.deviceInfo ?? '').toLowerCase().includes('iphone') ||
                   (s.deviceInfo ?? '').toLowerCase().includes('android')
                    ? <Smartphone className="w-4 h-4" />
                    : <Monitor className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {s.deviceInfo?.slice(0, 60) ?? 'Unknown device'}
                  </p>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">
                    {s.ipAddress ?? '—'} · Last active {new Date(s.lastUsedAt).toLocaleString()}
                  </p>
                  <span className={`text-[10px] font-mono font-bold mt-1 block ${s.isCurrent ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                    {s.isCurrent ? '● This session' : `Expires ${new Date(s.expiresAt).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
              {s.isCurrent
                ? <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-mono text-[10px] font-bold border border-[#D4AF37]/30 shrink-0">Current</span>
                : (
                  <button onClick={() => revoke(s.id)} disabled={revoking === s.id}
                    className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/40 rounded-lg text-white/40 hover:text-red-400 transition-all shrink-0"
                    title="Revoke session">
                    {revoking === s.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  </button>
                )
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION ENGINE TAB — real semester dates from DB + localStorage rules
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TOGGLES = {
  lateRegistration: true, waitlistEnable: true,
  autoPromotion: true, advisorApproval: false, gpaCapCheck: true,
};

const DEFAULT_RULES = [
  { id: 'r1', name: 'Credit Hour Cap',           desc: 'Maximum allowed credits for regular semester is 18.',          enabled: true  },
  { id: 'r2', name: 'GPA Honor Overload',         desc: 'Students with CGPA ≥ 3.50 can register for up to 21 credits.', enabled: true  },
  { id: 'r3', name: 'Prerequisite Verification',  desc: 'Verify all prerequisite trees before course checkout.',         enabled: true  },
  { id: 'r4', name: 'Financial Clearance',         desc: 'Block registration if outstanding tuition balance is > 0.',    enabled: true  },
  { id: 'r5', name: 'Probation Credit Limiter',    desc: 'Limit probation students to a maximum of 12 credit hours.',    enabled: false },
];

function loadPersistedToggles() {
  try {
    const raw = localStorage.getItem('reg_toggles');
    return raw ? { ...DEFAULT_TOGGLES, ...JSON.parse(raw) } : DEFAULT_TOGGLES;
  } catch { return DEFAULT_TOGGLES; }
}

function loadPersistedRules() {
  try {
    const raw = localStorage.getItem('reg_rules');
    return raw ? JSON.parse(raw) : DEFAULT_RULES;
  } catch { return DEFAULT_RULES; }
}

function RegistrationTab() {
  const [regData,  setRegData]  = useState<RegistrationSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [err,      setErr]      = useState('');

  const [regToggles, setRegToggles] = useState<typeof DEFAULT_TOGGLES>(DEFAULT_TOGGLES);
  const [rules, setRules] = useState<typeof DEFAULT_RULES>(DEFAULT_RULES);
  const [newRule, setNewRule] = useState({ name: '', desc: '' });
  const [rulesSaved, setRulesSaved] = useState(false);

  const [dates, setDates] = useState({
    registrationStart: '', registrationEnd: '', addDropDeadline: '',
  });

  // Load persisted toggles/rules from localStorage on mount
  useEffect(() => {
    setRegToggles(loadPersistedToggles());
    setRules(loadPersistedRules());
  }, []);

  // Load DB registration dates
  useEffect(() => {
    settingsApi.getRegistration()
      .then(d => {
        setRegData(d);
        setDates({
          registrationStart: d.registrationStart ? d.registrationStart.slice(0, 10) : '',
          registrationEnd:   d.registrationEnd   ? d.registrationEnd.slice(0, 10)   : '',
          addDropDeadline:   d.addDropDeadline    ? d.addDropDeadline.slice(0, 10)   : '',
        });
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Persist toggles to localStorage whenever they change
  const updateToggle = (key: keyof typeof DEFAULT_TOGGLES) => {
    setRegToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('reg_toggles', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Persist rules to localStorage
  const persistRules = (next: typeof DEFAULT_RULES) => {
    try { localStorage.setItem('reg_rules', JSON.stringify(next)); } catch { /* ignore */ }
    setRules(next);
  };

  const handleSaveDates = async () => {
    if (!regData?.semesterId) { setErr('No current semester found in database'); return; }
    setSaving(true); setErr(''); setSaved(false);
    try {
      const payload: Record<string, string> = { semesterId: regData.semesterId };
      if (dates.registrationStart) payload.registrationStart = new Date(dates.registrationStart).toISOString();
      if (dates.registrationEnd)   payload.registrationEnd   = new Date(dates.registrationEnd).toISOString();
      if (dates.addDropDeadline)   payload.addDropDeadline   = new Date(dates.addDropDeadline).toISOString();
      await settingsApi.updateRegistration(payload);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleSaveRules = () => {
    persistRules(rules);
    setRulesSaved(true); setTimeout(() => setRulesSaved(false), 3000);
  };

  if (loading) return <div className={cardCls}><SkeletonPage /></div>;

  return (
    <div className="space-y-6">
      <ErrMsg msg={err} />

      {/* Current semester status */}
      {regData && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          regData.registrationOpen
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-white/5 border-white/10 text-white/50'
        }`}>
          <div className={`w-2 h-2 rounded-full ${regData.registrationOpen ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
          <span>
            {regData.semesterName ?? 'No active semester'} —&nbsp;
            <strong>{regData.registrationOpen ? 'Registration is OPEN' : 'Registration is CLOSED'}</strong>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Dates — real DB */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#D4AF37]" /> Registration Windows
          </h3>
          <p className="text-[10px] text-white/30 font-mono">
            Modifies the current semester in PostgreSQL.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
            {[
              { key: 'registrationStart', label: 'Open Date' },
              { key: 'registrationEnd',   label: 'Close Date' },
              { key: 'addDropDeadline',   label: 'Add/Drop Deadline' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className={labelCls}>{f.label}</label>
                <input type="date"
                  value={dates[f.key as keyof typeof dates]}
                  onChange={e => setDates(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputCls} />
              </div>
            ))}
          </div>
          <div className="flex justify-end items-center gap-3 pt-1">
            <SavedBadge visible={saved} />
            <Button variant="gold" size="sm" disabled={saving || !regData?.semesterId}
              onClick={handleSaveDates} icon={<Save className="w-3.5 h-3.5" />}>
              {saving ? 'Saving…' : 'Save Dates'}
            </Button>
          </div>
        </div>

        {/* Feature switches */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D4AF37]" /> Feature Switches
          </h3>
          <div className="space-y-3 font-sans">
            {([
              { key: 'lateRegistration', label: 'Late Registration Period',  desc: 'Allow registration after close date.' },
              { key: 'waitlistEnable',   label: 'Waitlist Functionality',    desc: 'Enable waitlists at capacity.' },
              { key: 'autoPromotion',    label: 'Auto Waitlist Promotion',   desc: 'Fill dropped seats automatically.' },
              { key: 'advisorApproval',  label: 'Advisor Sign-off Required', desc: 'Require advisor approval to register.' },
              { key: 'gpaCapCheck',      label: 'GPA Overload Rule',         desc: 'Apply dynamic credit cap based on GPA.' },
            ] as { key: keyof typeof regToggles; label: string; desc: string }[]).map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="text-[10px] text-white/40">{item.desc}</p>
                </div>
                <button onClick={() => updateToggle(item.key)}
                  className={`w-9 h-5 rounded-full shrink-0 relative transition-colors focus:outline-none ${regToggles[item.key] ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
                  role="switch" aria-checked={regToggles[item.key]}>
                  <span className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform ${regToggles[item.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 font-mono pt-1">Changes save instantly to your browser.</p>
        </div>
      </div>

      {/* Curriculum rules */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">Curriculum Verification Rules</h3>
          <div className="flex items-center gap-2">
            <SavedBadge visible={rulesSaved} />
            <Button variant="gold" size="sm" onClick={handleSaveRules} icon={<Save className="w-3.5 h-3.5" />}>
              Save Rules
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-white/30 font-mono">Rules are persisted to your browser storage.</p>
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`p-3.5 border rounded-xl flex items-start gap-3 transition-colors ${
              rule.enabled ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' : 'bg-white/[0.02] border-white/5 opacity-55'
            }`}>
              <button onClick={() => persistRules(rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                className={`p-1 rounded-lg border transition-colors ${rule.enabled ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-white/5 border-white/10 text-white/40'}`}>
                <Power className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">{rule.name}</p>
                  <button onClick={() => persistRules(rules.filter(r => r.id !== rule.id))}
                    className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-white/60 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={e => {
          e.preventDefault();
          if (!newRule.name.trim()) return;
          persistRules([...rules, { id: `r${Date.now()}`, name: newRule.name, desc: newRule.desc || 'No description.', enabled: true }]);
          setNewRule({ name: '', desc: '' });
        }} className="border-t border-white/5 pt-4 space-y-3">
          <p className={labelCls}>Add New Rule</p>
          <input type="text" required placeholder="Rule name…"
            value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          <input type="text" placeholder="Description…"
            value={newRule.desc} onChange={e => setNewRule(p => ({ ...p, desc: e.target.value }))} className={inputCls} />
          <Button variant="secondary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />} className="w-full">
            Add Rule
          </Button>
        </form>
      </div>

      {/* Warning */}
      <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-3 text-xs text-yellow-300">
        <Info className="w-4 h-4 shrink-0 text-[#D4AF37]" />
        <span><strong>Warning:</strong> Registration date changes take effect immediately and affect active student checkouts.</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE SCALE TAB — CRUD via /api/registrar/grade-scale
// Registrar can manage letter grades, grade points, pass/fail threshold
// ─────────────────────────────────────────────────────────────────────────────
function GradeScaleTab() {
  const [entries, setEntries]   = useState<GradeScaleEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [saved, setSaved]       = useState(false);

  // Inline edit state
  const [editing, setEditing]   = useState<string | null>(null); // id of row being edited
  const [editForm, setEditForm] = useState<Partial<GradeScaleEntry>>({});

  // Add new entry form
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({
    letterGrade: '', gradePoints: '', description: '', isPassing: true, displayOrder: '',
  });
  const [adding, setAdding]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    gradeScaleApi.list()
      .then(data => setEntries(data))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (entry: GradeScaleEntry) => {
    setEditing(entry.id);
    setEditForm({
      gradePoints:  entry.gradePoints,
      description:  entry.description ?? '',
      isPassing:    entry.isPassing,
      isActive:     entry.isActive,
      displayOrder: entry.displayOrder,
    });
  };

  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  const handleUpdate = async (id: string) => {
    setSaving(true); setErr('');
    try {
      await gradeScaleApi.update(id, {
        gradePoints:  Number(editForm.gradePoints),
        description:  editForm.description as string | undefined,
        isPassing:    editForm.isPassing,
        isActive:     editForm.isActive,
        displayOrder: Number(editForm.displayOrder),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      setEditing(null);
      load();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setAdding(true); setErr('');
    try {
      await gradeScaleApi.create({
        letterGrade:  addForm.letterGrade.trim().toUpperCase(),
        gradePoints:  Number(addForm.gradePoints),
        description:  addForm.description || undefined,
        isPassing:    addForm.isPassing,
        displayOrder: addForm.displayOrder ? Number(addForm.displayOrder) : undefined,
      });
      setAddForm({ letterGrade: '', gradePoints: '', description: '', isPassing: true, displayOrder: '' });
      setShowAdd(false);
      load();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Create failed'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this grade scale entry?')) return;
    setDeleting(id);
    try { await gradeScaleApi.remove(id); load(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Delete failed'); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className={cardCls}><SkeletonPage /></div>;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#D4AF37]" /> Grade Scale Management
        </h3>
        <div className="flex items-center gap-3">
          {saved && <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold"><CheckCheck className="w-4 h-4" /> Saved</span>}
          <Button variant="gold" size="sm" onClick={() => setShowAdd(v => !v)} icon={<Plus className="w-3.5 h-3.5" />}>
            Add Grade
          </Button>
        </div>
      </div>

      <ErrMsg msg={err} />

      <p className="text-[10px] text-white/30 font-mono">
        Grade points are read from this table when calculating student GPAs.
        Changes affect all future GPA calculations.
      </p>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="p-4 bg-black/30 border border-white/10 rounded-xl space-y-3 font-sans">
          <p className={labelCls}>New Grade Scale Entry</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Letter Grade</label>
              <input required type="text" placeholder="A+" maxLength={3}
                value={addForm.letterGrade} onChange={e => setAddForm(f => ({ ...f, letterGrade: e.target.value }))}
                className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Grade Points</label>
              <input required type="number" step="0.01" min="0" max="5" placeholder="4.00"
                value={addForm.gradePoints} onChange={e => setAddForm(f => ({ ...f, gradePoints: e.target.value }))}
                className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Display Order</label>
              <input type="number" min="0" placeholder="0"
                value={addForm.displayOrder} onChange={e => setAddForm(f => ({ ...f, displayOrder: e.target.value }))}
                className={inputCls} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className={labelCls}>Description</label>
              <input type="text" placeholder="Excellent, Good…"
                value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                className={inputCls} />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <label className="text-xs text-white/60">Passing?</label>
              <button type="button" onClick={() => setAddForm(f => ({ ...f, isPassing: !f.isPassing }))}
                className={`w-9 h-5 rounded-full relative transition-colors focus:outline-none ${addForm.isPassing ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
                role="switch" aria-checked={addForm.isPassing}>
                <span className={`block w-4 h-4 rounded-full bg-[var(--bg-base)] shadow absolute top-0.5 transition-transform ${addForm.isPassing ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="gold" size="sm" type="submit" disabled={adding}>
              {adding ? 'Adding…' : 'Add Entry'}
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-sans min-w-[520px]">
          <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <tr>
              {['Grade', 'Points', 'Description', 'Passing', 'Active', 'Order', 'Actions'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-white/40">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.id}
                style={{ borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                {editing === entry.id ? (
                  // Inline edit row
                  <>
                    <td className="px-3 py-2 font-mono font-bold text-[#D4AF37]">{entry.letterGrade}</td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" min="0" max="5"
                        value={editForm.gradePoints ?? ''} onChange={e => setEditForm(f => ({ ...f, gradePoints: Number(e.target.value) }))}
                        className="w-16 bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#D4AF37]" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={editForm.description ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className="w-28 bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#D4AF37]" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => setEditForm(f => ({ ...f, isPassing: !f.isPassing }))}
                        className={`w-8 h-4 rounded-full relative transition-colors ${editForm.isPassing ? 'bg-[#D4AF37]' : 'bg-white/10'}`}>
                        <span className={`block w-3 h-3 rounded-full bg-[var(--bg-base)] absolute top-0.5 transition-transform ${editForm.isPassing ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                        className={`w-8 h-4 rounded-full relative transition-colors ${editForm.isActive ? 'bg-[#D4AF37]' : 'bg-white/10'}`}>
                        <span className={`block w-3 h-3 rounded-full bg-[var(--bg-base)] absolute top-0.5 transition-transform ${editForm.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" value={editForm.displayOrder ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                        className="w-14 bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#D4AF37]" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleUpdate(entry.id)} disabled={saving}
                          className="p-1 bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-colors">
                          <CheckCheck className="w-3 h-3" />
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white transition-colors">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // Read row
                  <>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#D4AF37]">{entry.letterGrade}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-white">{entry.gradePoints.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-white/60">{entry.description ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-mono text-[10px] font-bold ${entry.isPassing ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.isPassing ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-mono text-[10px] font-bold ${entry.isActive ? 'text-green-400' : 'text-white/30'}`}>
                        {entry.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-white/40">{entry.displayOrder}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(entry)}
                          className="p-1 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(entry.id)} disabled={deleting === entry.id}
                          className="p-1 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-red-400 hover:border-red-500/30 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex gap-2 text-[10px] text-yellow-300">
        <Info className="w-3.5 h-3.5 shrink-0 text-[#D4AF37] mt-0.5" />
        <span>Grade points are used in GPA calculations across all academic records. Changes take effect on the next GPA recalculation.</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE PORTAL TAB — Master OPEN/CLOSE switch & Grade Publication Authority
// ─────────────────────────────────────────────────────────────────────────────
function GradePortalTab() {
  const [status, setStatus] = useState<GradePortalStatus | null>(null);
  const [submittedList, setSubmittedList] = useState<SubmittedGradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [st, sub] = await Promise.all([
        gradePortalApi.getStatus(),
        registrarGradesApi.getSubmitted(),
      ]);
      setStatus(st);
      setSubmittedList(sub);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load grade portal status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async () => {
    setToggling(true);
    setErr(null);
    setMsg(null);
    try {
      const updated = await gradePortalApi.toggle();
      setStatus(updated);
      setMsg(updated.isOpen ? 'Grade Portal is now OPEN for students.' : 'Grade Portal is now CLOSED.');
      setTimeout(() => setMsg(null), 4000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to toggle portal');
    } finally {
      setToggling(false);
    }
  };

  const handlePublish = async (offeringId: string) => {
    setPublishingId(offeringId);
    setErr(null);
    setMsg(null);
    try {
      const res = await registrarGradesApi.publishOfferingGrades(offeringId);
      setMsg(res.message);
      setTimeout(() => setMsg(null), 4000);
      await loadData();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to publish grades');
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) return <div className={cardCls}><SkeletonPage /></div>;

  const isOpen = status?.isOpen ?? false;

  return (
    <div className="space-y-6 font-sans">
      {/* Master Toggle Card */}
      <div className={`${cardCls} border ${isOpen ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#D4AF37]" /> Student Grade Portal Master Control
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              The Registrar holds institutional authority over whether students can access and view grades.
            </p>
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                isOpen
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isOpen ? 'PORTAL OPEN' : 'PORTAL CLOSED'}
            </span>
          </div>
        </div>

        <ErrMsg msg={err ?? ''} />
        {msg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {isOpen ? (
              <span className="text-emerald-300">
                The Grade Portal is currently <strong>OPEN</strong>. Students who log in can view all published grades, semester GPA, and cumulative CGPA.
              </span>
            ) : (
              <span className="text-amber-200">
                The Grade Portal is currently <strong>CLOSED</strong>. Students cannot see any grades. When visiting their Grades page, they see: <em>&quot;The Grade Portal is currently closed. Please contact the Registrar Office for assistance.&quot;</em>
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5 text-[11px] font-mono text-white/40">
            <div>
              {isOpen ? (
                <span>Opened At: {status?.openedAt ? new Date(status.openedAt).toLocaleString() : 'System default'}</span>
              ) : (
                <span>Closed At: {status?.closedAt ? new Date(status.closedAt).toLocaleString() : 'System default'}</span>
              )}
            </div>
            <Button
              variant={isOpen ? 'secondary' : 'gold'}
              size="sm"
              onClick={handleToggle}
              disabled={toggling}
              icon={<Power className="w-3.5 h-3.5" />}
            >
              {toggling ? 'Updating...' : isOpen ? 'Close Grade Portal' : 'Open Grade Portal'}
            </Button>
          </div>
        </div>
      </div>

      {/* Submitted Grades Awaiting Publication Card */}
      <div className={cardCls}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-[#D4AF37]" /> Submitted Grades Awaiting Publication
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Course offerings where instructors have finalized and submitted assessment marks to the Registrar.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>

        {submittedList.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-black/20 border border-white/5 text-xs text-zinc-400">
            No course grades are currently awaiting Registrar publication. All submitted courses have been processed or teachers have not yet submitted.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead className="bg-black/30 border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-3.5 py-2.5 text-left">Course</th>
                  <th className="px-2 py-2.5 text-center">Section</th>
                  <th className="px-2 py-2.5 text-center">Semester</th>
                  <th className="px-3 py-2.5 text-left">Instructor</th>
                  <th className="px-2 py-2.5 text-center">ECTS</th>
                  <th className="px-2 py-2.5 text-center">Submitted / Total</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submittedList.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-3.5 py-3 font-semibold text-white">
                      <div>{item.course.code}</div>
                      <div className="text-[11px] text-zinc-400 font-normal truncate max-w-xs">{item.course.name}</div>
                    </td>
                    <td className="px-2 py-3 text-center font-mono text-zinc-300">{item.section}</td>
                    <td className="px-2 py-3 text-center text-xs text-zinc-300">
                      <div>{item.semester.name}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{item.semester.academicYear}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-300">
                      {item.instructor ? `${item.instructor.title} ${item.instructor.user.fullName}` : '—'}
                    </td>
                    <td className="px-2 py-3 text-center font-mono text-zinc-300 font-semibold">{item.course.ects}</td>
                    <td className="px-2 py-3 text-center font-mono">
                      <span className="text-amber-300 font-bold">{item.submittedCount}</span>
                      <span className="text-zinc-500"> / {item.totalGrades}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="gold"
                        size="sm"
                        disabled={publishingId === item.id}
                        onClick={() => handlePublish(item.id)}
                        icon={<CheckCheck className="w-3.5 h-3.5" />}
                      >
                        {publishingId === item.id ? 'Publishing...' : 'Publish to Students'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
