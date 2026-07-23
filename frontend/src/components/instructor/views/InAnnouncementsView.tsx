'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone, Pin, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { announcements as initialAnn } from '../../../data/instructorData';
import { Announcement } from '../../../types/instructor';

const statusBadge = (s: Announcement['status']) =>
  s === 'Published' || s === 'Pinned' ? 'emerald' : s === 'Draft' ? 'glass' : 'amber';

export const InAnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState(initialAnn);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'All Courses' as Announcement['audience'] });

  const handleCreate = () => {
    const newAnn: Announcement = {
      id: `an${Date.now()}`, title: form.title, body: form.body,
      audience: form.audience, status: 'Published',
      publishedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      views: 0, isPinned: false,
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setCreateOpen(false);
    setForm({ title: '', body: '', audience: 'All Courses' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Announcements"
        subtitle={`${announcements.filter(a => a.status === 'Published' || a.status === 'Pinned').length} published`}
        icon={<Megaphone className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New Announcement</Button>}
      />

      <div className="space-y-4">
        {announcements.map(a => (
          <motion.div key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`bg-white/5 border rounded-2xl p-5 transition-all ${a.isPinned ? 'border-[#E9C349]/20' : 'border-white/10'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {a.isPinned && <Pin className="w-3.5 h-3.5 text-[#E9C349]" />}
                  <Badge variant={statusBadge(a.status) as 'emerald'|'glass'|'amber'}>{a.status}</Badge>
                  <Badge variant="glass">{a.audience}</Badge>
                </div>
                <h3 className="font-serif text-base font-bold text-white">{a.title}</h3>
                <p className="font-sans text-xs text-white/55 mt-2 leading-relaxed line-clamp-2">{a.body}</p>
                <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-white/35">
                  {a.publishedAt && <span>{a.publishedAt}</span>}
                  {a.views > 0 && <><span>·</span><span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views} views</span></>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-rose-950/30 text-white/50 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Announcement" maxWidth="max-w-lg">
        <div className="space-y-4 font-sans text-sm">
          <Input label="Title" placeholder="Announcement title..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-white/70">Audience</label>
            <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value as Announcement['audience']})}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
              {['All Courses', 'FILM402', 'FILM301'].map(a => <option key={a} className="bg-[#1a1a1b]">{a}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-white/70">Message</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={5} placeholder="Write your announcement..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E9C349] resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)}>Save Draft</Button>
            <Button variant="primary" className="flex-1" onClick={handleCreate}>Publish</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
