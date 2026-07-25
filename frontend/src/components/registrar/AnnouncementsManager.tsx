'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Send, Users, Eye, FileText, Plus, 
  Paperclip, Bold, Italic, Link2, List, 
  Clock, Trash2, ShieldAlert
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const initialAnnouncements = [
  { id: 'an1', title: 'Fall Course Registration Guidelines', date: 'Jul 20, 2026', audience: 'All Students', author: 'Robel Bekele', status: 'Published', content: 'Please review the registration prerequisites before checking out courses. Late registration fees will apply after August 20.' },
  { id: 'an2', title: 'Grade Submission Portal Opens', date: 'Jul 22, 2026', audience: 'All Faculty', author: 'Robel Bekele', status: 'Scheduled', content: 'Instructors are requested to upload and verify all quizzes and assignment grades before the deadline.' }
];

export const AnnouncementsManager: React.FC = () => {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [form, setForm] = useState({
    title: '',
    audience: 'All Students',
    content: '',
    scheduleDate: '',
    scheduleTime: '08:00 AM'
  });

  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState('');

  const handleAddAttachment = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newAttachment.trim()) return;
    setAttachments(prev => [...prev, newAttachment]);
    setNewAttachment('');
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    const newRecord = {
      id: 'an' + (announcements.length + 1),
      title: form.title,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      audience: form.audience,
      author: 'Robel Bekele',
      status: form.scheduleDate ? 'Scheduled' : 'Published',
      content: form.content
    };

    setAnnouncements(prev => [newRecord, ...prev]);
    setForm({ title: '', audience: 'All Students', content: '', scheduleDate: '', scheduleTime: '08:00 AM' });
    setAttachments([]);
    alert(`Announcement published! Dispatched via email alert notification channels.`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to retract this announcement?')) {
      setAnnouncements(prev => prev.filter(an => an.id !== id));
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
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Announcements Manager</h2>
        <p className="text-xs text-white/50">Draft news bulletins, target academic audiences, and schedule emails dispatches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editor Form Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h3 className="font-serif text-base font-bold text-white">Draft Announcement</h3>

          <form onSubmit={handlePublish} className="space-y-4 font-sans">
            
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Announcement Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Important Changes to Curriculum Prerequisites..."
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Target & Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80">Target Audience</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm(prev => ({ ...prev, audience: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none"
                >
                  <option value="All Students">All Enrolled Students</option>
                  <option value="All Faculty">All Faculty Lecturers</option>
                  <option value="Computer Science Dept">Computer Science Department</option>
                  <option value="Engineering Dept">Engineering Department</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80">Schedule Date (Optional)</label>
                <input
                  type="date"
                  value={form.scheduleDate}
                  onChange={(e) => setForm(prev => ({ ...prev, scheduleDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Text Editor Toolbar & Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">Announcement Content</label>
              
              {/* Rich text editor controls toolbar mockup */}
              <div className="flex gap-2 p-2 bg-black/50 border border-white/10 border-b-transparent rounded-t-xl text-white/50">
                <button type="button" className="p-1 hover:bg-white/10 rounded text-xs font-semibold hover:text-white" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:bg-white/10 rounded text-xs font-semibold hover:text-white" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:bg-white/10 rounded text-xs font-semibold hover:text-white" title="Insert Link"><Link2 className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:bg-white/10 rounded text-xs font-semibold hover:text-white" title="List"><List className="w-3.5 h-3.5" /></button>
              </div>

              <textarea
                required
                rows={5}
                placeholder="Compose the announcement details body text..."
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-3.5 py-3 bg-black/40 border border-white/10 rounded-b-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] resize-none"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 block">Attachments</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter attachment filename (e.g. guidelines_v2.pdf)"
                  value={newAttachment}
                  onChange={(e) => setNewAttachment(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  onClick={handleAddAttachment}
                  className="px-3 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-[#D4AF37] hover:border-[#D4AF37]/35 text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <Paperclip className="w-3.5 h-3.5" /> Attach
                </button>
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="px-2.5 py-1 bg-white/5 border border-white/8 rounded-lg flex items-center gap-1.5 text-[10px] text-white/70">
                      <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{file}</span>
                      <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-white/30 hover:text-red-400 font-bold ml-1">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <Button 
              variant="gold" 
              size="sm" 
              type="submit"
              className="w-full py-2.5 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Publish Announcement Broadcast
            </Button>

          </form>
        </div>

        {/* Right Side: Preview & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Announcement Preview */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4.5 h-4.5 text-[#D4AF37]" /> Live Preview
            </h3>
            
            <div className="p-4 bg-black/40 border border-white/8 rounded-xl space-y-3 min-h-[160px]">
              {form.title || form.content ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold text-white font-sans">{form.title || 'Untitled Bulletin'}</h4>
                    <Badge variant="glass" className="text-[8px]">
                      {form.audience}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed font-sans whitespace-pre-wrap">
                    {form.content || 'Draft content will display here in real-time...'}
                  </p>
                  {attachments.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[9px] font-mono text-white/40 uppercase block">Attachments ({attachments.length})</span>
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[9px] text-white/50">
                          <Paperclip className="w-3 h-3 text-white/30" /> <span>{file}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-white/20 h-full py-10">
                  <Eye className="w-8 h-8 opacity-40 animate-pulse" />
                  <p className="text-[10px] font-mono mt-1">Live preview updates automatically as you type.</p>
                </div>
              )}
            </div>
          </div>

          {/* Retract history list */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-white">Bulletin Board History</h3>
            <div className="space-y-3">
              {announcements.map(an => (
                <div key={an.id} className="p-3 bg-black/20 border border-white/5 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-semibold text-white truncate max-w-[170px]">{an.title}</h4>
                      <Badge variant={an.status === 'Published' ? 'emerald' : 'amber'} className="text-[8px]">
                        {an.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-white/45 truncate font-sans">{an.content}</p>
                    <p className="text-[9px] font-mono text-white/40">Target: {an.audience} · {an.date}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(an.id)}
                    className="p-1 hover:bg-red-500/10 rounded text-white/30 hover:text-red-400 transition-all shrink-0"
                    title="Retract Announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
};
