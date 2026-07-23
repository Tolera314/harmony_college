'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, User, Bell, Lock, Save, CheckCircle2 } from 'lucide-react';
import { InstructorProfile } from '../../../types/instructor';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

interface InSettingsViewProps { profile: InstructorProfile }

export const InSettingsView: React.FC<InSettingsViewProps> = ({ profile }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({ name: profile.name, email: profile.email, phone: profile.phone, officeRoom: profile.officeRoom });
  const [notifications, setNotifications] = useState({ gradeAlerts: true, attendanceAlerts: true, scheduleAlerts: true, enrollmentAlerts: true });

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Settings" subtitle="Manage your account and preferences" icon={<Settings className="w-5 h-5" />} />

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl font-sans text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Changes saved successfully.
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${activeSection === s.id ? 'bg-[#E9C349]/12 text-[#E9C349] border border-[#E9C349]/20' : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <Card hoverable={false} className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <User className="w-5 h-5 text-[#E9C349]" /> Instructor Profile
              </h3>
              <div className="flex items-center gap-4">
                <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E9C349]/40" />
                <div>
                  <p className="font-serif text-base font-bold text-white">{profile.name}</p>
                  <p className="font-sans text-xs text-white/50">{profile.title}</p>
                  <Badge variant="gold" className="mt-1">{profile.employeeId}</Badge>
                </div>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <Input label="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  <Input label="Office Room" value={formData.officeRoom} onChange={e => setFormData({...formData, officeRoom: e.target.value})} />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />}>Save Changes</Button>
                </div>
              </form>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Bell className="w-5 h-5 text-[#E9C349]" /> Notification Preferences
              </h3>
              <div className="space-y-3">
                {Object.entries(notifications).map(([key, val]) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    gradeAlerts: { title: 'Grade Submission Deadlines', desc: 'Notify me when grade deadlines are approaching.' },
                    attendanceAlerts: { title: 'Attendance Warnings', desc: 'Alert when student attendance drops below threshold.' },
                    scheduleAlerts: { title: 'Schedule Changes', desc: 'Notify me of room or time changes.' },
                    enrollmentAlerts: { title: 'Student Enrollment', desc: 'Alert when students enroll or drop from my courses.' },
                  };
                  const item = labels[key];
                  return (
                    <label key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl cursor-pointer border border-white/10 hover:bg-white/[0.08] transition-colors">
                      <div>
                        <p className="font-sans text-sm font-semibold text-white">{item.title}</p>
                        <p className="font-sans text-xs text-white/50 mt-0.5">{item.desc}</p>
                      </div>
                      <input type="checkbox" checked={val} onChange={e => setNotifications({...notifications, [key]: e.target.checked})}
                        className="w-5 h-5 accent-[#E9C349] cursor-pointer" />
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }} icon={<Save className="w-4 h-4" />}>Save Preferences</Button>
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Lock className="w-5 h-5 text-[#E9C349]" /> Password & Security
              </h3>
              <div className="space-y-4">
                <Input label="Current Password" type="password" placeholder="Enter current password" />
                <Input label="New Password" type="password" placeholder="At least 12 characters" />
                <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />}>Update Password</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
