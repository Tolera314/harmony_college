'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Megaphone, Pin, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge }        from '../../ui/Badge';
import { Button }       from '../../ui/Button';
import { SlidePanel }   from '../../ui/SlidePanel';
import { Input }        from '../../ui/Input';
import { EmptyState }   from '../../ui/States';
import { instructorClassesApi, type ClassOffering } from '../../../lib/instructorApi';

// ── Local announcement shape (UI-only until backend model is added) ───────────
interface LocalAnnouncement {
  id:          string;
  title:       string;
  body:        string;
  audience:    string; // course code or "All Classes"
  status:      'Published' | 'Draft';
  publishedAt: string;
  views:       number;
  isPinned:    boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
export const InAnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState<LocalAnnouncement[]>([]);
  const [classes,       setClasses]       = useState<ClassOffering[]>([]);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'All Classes', status: 'Published' as 'Published' | 'Draft' });

  // Load classes for the audience selector
  useEffect(() => {
    instructorClassesApi.list()
      .then(data => {
        const current = data.filter(o => o.semester.isCurrent);
        setClasses(current.length ? current : data);
      })
      .catch(() => {/* non-critical */});
  }, []);

  const audienceOptions = [
    'All Classes',
    ...classes.map(c => `${c.course.code} — Section ${c.section}`),
  ];

  const handleCreate = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const newAnn: LocalAnnouncement = {
      id:          `ann-${Date.now()}`,
      title:       form.title.trim(),
      body:        form.body.trim(),
      audience:    form.audience,
      status:      form.status,
      publishedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      views:       0,
      isPinned:    false,
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setCreateOpen(false);
    setForm({ title: '', body: '', audience: 'All Classes', status: 'Published' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const togglePin = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
  };

  const publishedCount = announcements.filter(a => a.status === 'Published').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Announcements"
        subtitle={`${publishedCount} published · ${announcements.length} total`}
        icon={<Megaphone className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New Announcement
          </Button>
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          variant="notifications"
          title="No announcements yet"
          description="Create your first class announcement. Students in the targeted course will be notified."
          action={{ label: 'New Announcement', onClick: () => setCreateOpen(true), icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <div className="space-y-4">
          {[...announcements].sort((a, b) => +b.isPinned - +a.isPinned).map(a => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-(--hover-overlay) border rounded-2xl p-5 transition-all ${
                a.isPinned ? 'border-(--accent-gold-border)' : 'border-(--border-default)'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {a.isPinned && <Pin className="w-3.5 h-3.5 text-(--brand-gold)" />}
                    <Badge variant={a.status === 'Published' ? 'emerald' : 'glass'} className="text-[10px]">
                      {a.status}
                    </Badge>
                    <Badge variant="glass" className="text-[10px]">{a.audience}</Badge>
                  </div>
                  <h3 className="font-serif text-base font-bold text-(--text-primary)">{a.title}</h3>
                  <p className="font-sans text-xs text-(--text-muted) mt-2 leading-relaxed line-clamp-2">{a.body}</p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-(--text-faint)">
                    <span>{a.publishedAt}</span>
                    {a.views > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />{a.views} views
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(a.id)}
                    className="p-1.5 rounded-lg hover:bg-(--hover-overlay) transition-colors"
                    style={{ color: a.isPinned ? 'var(--brand-gold)' : 'var(--text-muted)' }}
                    aria-label={a.isPinned ? 'Unpin' : 'Pin'}
                    title={a.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors"
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create panel */}
      <SlidePanel
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Announcement"
        subtitle="Post to your enrolled students"
        width="max-w-lg"
      >
        <div className="space-y-4 font-sans text-sm">
          <Input
            label="Title *"
            placeholder="Announcement title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />

          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">Audience</label>
            <select
              value={form.audience}
              onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
              className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            >
              {audienceOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as 'Published' | 'Draft' }))}
              className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
            >
              <option value="Published">Publish immediately</option>
              <option value="Draft">Save as draft</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-xs font-semibold text-(--text-secondary)">Message *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={5}
              placeholder="Write your announcement..."
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={!form.title.trim() || !form.body.trim()}
              onClick={handleCreate}
            >
              {form.status === 'Published' ? 'Publish' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </SlidePanel>
    </motion.div>
  );
};
