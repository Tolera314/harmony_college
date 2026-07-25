'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Shield, Key, Eye, Clock, 
  Check, Save, Globe, ShieldAlert, Monitor, 
  Smartphone, LogOut, CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/Button';

export const RegistrarSettings: React.FC = () => {
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

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Registrar profile information saved successfully.');
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.newPass !== password.confirm) {
      alert('Password Error: New password fields do not match.');
      return;
    }
    alert('Security credentials updated. Re-login from active sessions.');
    setPassword({ current: '', newPass: '', confirm: '' });
  };

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRevokeSession = (id: string) => {
    if (confirm('Are you sure you want to terminate this authenticated device session?')) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Account & Settings</h2>
        <p className="text-xs text-white/50">Manage personal registrar profile details, credentials security, and layout options.</p>
      </div>

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

              <div className="flex justify-end pt-2">
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

              <div className="flex justify-end pt-2">
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
                { key: 'darkMode', label: 'Default Theme preferences', desc: 'Sets visual viewport colors to dark theme.' }
              ].map(sw => (
                <div key={sw.key} className="flex justify-between items-start gap-4 p-3 bg-black/20 border border-white/5 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">{sw.label}</p>
                    <p className="text-[10px] text-white/40">{sw.desc}</p>
                  </div>
                  
                  <button
                    onClick={() => handleToggle(sw.key as any)}
                    className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${
                      toggles[sw.key as keyof typeof toggles] ? 'bg-[#D4AF37]' : 'bg-white/10'
                    }`}
                  >
                    <span 
                      className={`block w-4 h-4 rounded-full bg-[#0F0F10] shadow absolute top-0.5 transition-transform duration-200 ${
                        toggles[sw.key as keyof typeof toggles] ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

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
    </motion.div>
  );
};
