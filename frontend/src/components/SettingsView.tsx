import React, { useState } from 'react';
import { StudentProfile } from '../types';
import {
  User,
  Bell,
  CheckCircle2,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AppearanceSection } from './ui/AppearanceSection';

interface SettingsViewProps {
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  setProfile,
}) => {
  const [formData, setFormData] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    major: profile.major,
    expectedGraduation: profile.expectedGraduation
  });

  const [notifications, setNotifications] = useState({
    gradeAlerts: true,
    tuitionReminders: true,
    registrarNotices: true,
    advisorMessages: true
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile((prev) => ({
      ...prev,
      ...formData
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 max-w-4xl pb-8"
    >
      {/* Header Banner */}
      <Card hoverable={false} className="space-y-2">
        <h2 className="font-serif text-3xl font-bold" style={{ color: "var(--text-primary)" }}>  Account Settings & Preferences
        </h2>
        <p className="font-sans text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>  Manage your student profile information, security, theme mode, and portal notification channels.
        </p>
      </Card>

      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 ds-badge-success border rounded-2xl font-sans text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--status-success)" }} />
            <span>Profile changes saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Information Form */}
      <Card hoverable={false} className="space-y-6">
        <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
          <User className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />  Personal Student Profile
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-5 text-xs sm:text-sm font-sans">
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

          <div className="flex justify-end pt-3">
            <Button
              variant="primary"
              type="submit"
              icon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Theme & Contrast Preferences */}
      <AppearanceSection title="Appearance & Contrast Mode" />

      {/* Notifications Switch Panel */}
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-4" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />  Portal Notifications & Alerts
        </h3>

        <div className="space-y-3 text-xs sm:text-sm font-sans">
          <label className="flex items-center justify-between p-4 rounded-2xl cursor-pointer border" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Grade Posting Alerts</p>
              <p className="" style={{ color: "var(--text-muted)" }}>Instant push notification when professors release midterm or final marks.</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.gradeAlerts}
              onChange={(e) => setNotifications({ ...notifications, gradeAlerts: e.target.checked })}
              className="w-5 h-5 accent-[#E9C349] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl cursor-pointer border" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Tuition & Billing Reminders</p>
              <p className="" style={{ color: "var(--text-muted)" }}>Notices regarding scholarship renewal and tuition due dates.</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.tuitionReminders}
              onChange={(e) => setNotifications({ ...notifications, tuitionReminders: e.target.checked })}
              className="w-5 h-5 accent-[#E9C349] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl cursor-pointer border" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Advisor Direct Messages</p>
              <p className="" style={{ color: "var(--text-muted)" }}>Notifications when Dr. Marcus Vance responds to advising inquiries.</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.advisorMessages}
              onChange={(e) => setNotifications({ ...notifications, advisorMessages: e.target.checked })}
              className="w-5 h-5 accent-[#E9C349] cursor-pointer"
            />
          </label>
        </div>
      </Card>
    </motion.div>
  );
};
