'use client';

'use client';

import React, { useState, useRef } from 'react';
import { StudentProfile } from '../types';
import { User, Bell, Palette, CheckCircle2, Save, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AppearanceSection } from './ui/AppearanceSection';

interface SettingsViewProps {
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

type SettingsTab = 'profile' | 'appearance' | 'notifications';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Personal Student Profile',      icon: <User className="w-4 h-4" /> },
  { id: 'appearance',    label: 'Appearance & Theme',            icon: <Palette className="w-4 h-4" /> },
  { id: 'notifications', label: 'Portal Notifications & Alerts', icon: <Bell className="w-4 h-4" /> },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile, setProfile,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const [formData, setFormData] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    major: profile.major,
    expectedGraduation: profile.expectedGraduation,
  });

  const [notifications, setNotifications] = useState({
    gradeAlerts:        true,
    tuitionReminders:   true,
    registrarNotices:   true,
    advisorMessages:    true,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>(profile.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    setProfile((prev) => ({ ...prev, avatar: url }));
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
    setProfile((prev) => ({ ...prev, avatar: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile((prev) => ({ ...prev, ...formData }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-5xl pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center text-[#E9C349] shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="font-sans text-xs text-white/50 mt-0.5">Manage your student profile, theme, and notifications</p>
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl font-sans text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Profile changes saved successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <aside className="lg:w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-sans text-sm transition-all ${
                  activeTab === t.id
                    ? 'bg-[#E9C349]/12 text-[#E9C349] border border-[#E9C349]/20'
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

          {/* ── Personal Student Profile ──────────────────────────────────── */}
          {activeTab === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <User className="w-5 h-5 text-[#E9C349]" />
                Personal Student Profile
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-5 font-sans">

                {/* ── Photo upload ──────────────────────────────────────── */}
                <div className="flex items-center gap-5 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  {/* Avatar preview */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#E9C349]/40 bg-white/5">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Student photo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    {/* Camera overlay button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#E9C349] rounded-full flex items-center justify-center text-[#0F0F10] shadow-md hover:bg-[#d8b238] transition-colors"
                      aria-label="Upload photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-sans text-sm font-semibold text-white">Profile Photo</p>
                    <p className="font-sans text-xs text-white/50">
                      JPG, PNG or WebP · Max 5MB · Recommended 400×400px
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl font-sans text-xs font-semibold text-white transition-colors"
                      >
                        Choose Photo
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3.5 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 rounded-xl font-sans text-xs font-semibold text-rose-400 transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Student ID (Read Only)"
                    type="text"
                    value={profile.id}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <Input
                    label="Phone Number"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="Academic Major"
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  />
                  <Input
                    label="Expected Graduation"
                    type="text"
                    value={formData.expectedGraduation}
                    onChange={(e) => setFormData({ ...formData, expectedGraduation: e.target.value })}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── Appearance & Theme ────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <Card hoverable={false} className="space-y-0 p-0 overflow-hidden">
              <AppearanceSection variant="inline" title="Appearance & Theme" />
            </Card>
          )}

          {/* ── Portal Notifications & Alerts ────────────────────────────── */}
          {activeTab === 'notifications' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Bell className="w-5 h-5 text-[#E9C349]" />
                Portal Notifications & Alerts
              </h3>

              <div className="space-y-3 font-sans">
                {([
                  { key: 'gradeAlerts',      label: 'Grade Posting Alerts',        desc: 'Instant notification when professors release midterm or final marks.' },
                  { key: 'tuitionReminders', label: 'Tuition & Billing Reminders', desc: 'Notices regarding scholarship renewal and tuition due dates.' },
                  { key: 'registrarNotices', label: 'Registrar Notices',           desc: 'Official communications from the Office of the Registrar.' },
                  { key: 'advisorMessages',  label: 'Advisor Direct Messages',     desc: 'Notifications when your academic advisor responds to inquiries.' },
                ] as { key: keyof typeof notifications; label: string; desc: string }[]).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-sans text-sm font-semibold text-white">{item.label}</p>
                      <p className="font-sans text-xs text-white/50 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications((p) => ({ ...p, [item.key]: !p[item.key] }))}
                      role="switch"
                      aria-checked={notifications[item.key]}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        notifications[item.key] ? 'bg-[#E9C349]' : 'bg-white/10'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        notifications[item.key] ? 'left-6' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </motion.div>
  );
};
