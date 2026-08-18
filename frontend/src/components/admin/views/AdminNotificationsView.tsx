'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck, Plus, Send } from 'lucide-react';
import { AdminNavTab } from '../../../types/admin';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SkeletonTable, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import {
  adminNotificationsApi, ApiNotification, ROLE_DISPLAY,
} from '../../../lib/adminApi';

// ── type badge helpers ────────────────────────────────────────────────────────
const typeBadge = (t: string): 'rose' | 'amber' | 'glass' | 'emerald' => {
  if (t === 'ERROR')   return 'rose';
  if (t === 'WARNING') return 'amber';
  if (t === 'SUCCESS') return 'emerald';
  return 'glass';
};

const ROLE_OPTIONS = ['', 'STUDENT', 'INSTRUCTOR', 'DEPARTMENT_HEAD', 'HR_OFFICER', 'FINANCE_OFFICER', 'REGISTRAR', 'ADMIN', 'SUPER_ADMIN'];

// ── component ─────────────────────────────────────────────────────────────────
export const AdminNotificationsView: React.FC<{ setActiveTab: (tab: AdminNavTab) => void }> = ({ setActiveTab }) => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState<'all' | 'unread'>('all');

  // broadcast modal
  const [broadcastOpen, setBroadcastOpen]   = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [bf, setBf] = useState({ title: '', message: '', type: 'INFO', role: '' });

  const { toast, show: showToast, hide: hideToast } = useToast();

  const fetchNotifs = useCallback(async (p: number, unreadOnly: boolean) => {
    setLoading(true); setError('');
    try {
      const res = await adminNotificationsApi.list({ page: p, limit: 20, unreadOnly });
      setNotifications(res.notifications); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(page, filter === 'unread'); }, [page, filter, fetchNotifs]);

  const handleMarkRead = async (id: string) => {
    try {
      await adminNotificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.allSettled(unread.map(n => adminNotificationsApi.markRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast('All marked as read', 'success');
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError(''); setBroadcastSending(true);
    try {
      const res = await adminNotificationsApi.broadcast({
        title: bf.title, message: bf.message,
        type: bf.type || undefined,
        role: bf.role || undefined,
      });
      showToast(`Broadcast sent to ${res.sent} users`, 'success');
      setBroadcastOpen(false);
      setBf({ title: '', message: '', type: 'INFO', role: '' });
      fetchNotifs(1, false); setPage(1); setFilter('all');
    } catch (e: any) {
      setBroadcastError(e.message ?? 'Broadcast failed');
    } finally {
      setBroadcastSending(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · ${total} total`}
        icon={<Bell className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={handleMarkAllRead}>Mark all read</Button>
            )}
            <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => { setBroadcastOpen(true); setBroadcastError(''); }}>
              Broadcast
            </Button>
          </div>
        }
      />

      {/* Tab filters */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${filter === f ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {loading ? <SkeletonTable rows={8} cols={4} /> : error ? (
        <ErrorState compact description={error} onRetry={() => fetchNotifs(page, filter === 'unread')} />
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center"><Bell className="w-10 h-10 text-(--text-faint) mx-auto mb-3" /><p className="font-sans text-sm text-(--text-faint)">No notifications.</p></div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <motion.div key={n.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => handleMarkRead(n.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${!n.isRead ? 'bg-(--hover-overlay) border-(--border-strong)' : 'bg-transparent border-(--border-subtle) hover:bg-(--hover-overlay)'}`}>
              <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.isRead ? 'bg-(--active-overlay)' : 'bg-(--brand-gold)'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-sans text-sm font-semibold ${n.isRead ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                  <Badge variant={typeBadge(n.type)} className="text-[10px]">{n.type}</Badge>
                  {!n.isRead && <span className="font-mono text-[10px] text-(--brand-gold)">NEW</span>}
                </div>
                <p className="font-sans text-xs text-(--text-muted) leading-relaxed mt-1">{n.message}</p>
                <p className="font-mono text-[10px] text-(--text-faint) mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Broadcast modal */}
      <Modal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Broadcast Notification" maxWidth="max-w-md">
        <form onSubmit={handleBroadcast} className="space-y-4">
          {broadcastError && <InlineError message={broadcastError} />}
          <Input label="Title" required value={bf.title} onChange={e => setBf({ ...bf, title: e.target.value })} />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Message</label>
            <textarea
              required
              rows={4}
              value={bf.message}
              onChange={e => setBf({ ...bf, message: e.target.value })}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Type</label>
              <select value={bf.type} onChange={e => setBf({ ...bf, type: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                {['INFO', 'SUCCESS', 'WARNING', 'ERROR'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Target Role <span className="text-(--text-faint)">(optional)</span></label>
              <select value={bf.role} onChange={e => setBf({ ...bf, role: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
                <option value="">All active users</option>
                {ROLE_OPTIONS.filter(Boolean).map(r => <option key={r} value={r}>{ROLE_DISPLAY[r] ?? r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={broadcastSending}>
              {broadcastSending ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
