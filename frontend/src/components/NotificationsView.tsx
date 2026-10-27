'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Check, CheckCheck, Trash2, X, AlertCircle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EmptyState, SkeletonTable } from './ui/States';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'REGISTRATION_REMINDER' | 'PAYMENT_DUE' | 'COURSE_UPDATE' | 'GRADE_POSTED' | 'ANNOUNCEMENT' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  actionTab?: string;
  module?: string;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  REGISTRATION_REMINDER: <AlertCircle className="w-5 h-5 text-amber-400" />,
  PAYMENT_DUE: <AlertCircle className="w-5 h-5 text-rose-400" />,
  COURSE_UPDATE: <Info className="w-5 h-5 text-blue-400" />,
  GRADE_POSTED: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  ANNOUNCEMENT: <Bell className="w-5 h-5 text-purple-400" />,
  SYSTEM: <Info className="w-5 h-5 text-zinc-400" />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  REGISTRATION_REMINDER: 'bg-amber-500/10 border-amber-500/30',
  PAYMENT_DUE: 'bg-rose-500/10 border-rose-500/30',
  COURSE_UPDATE: 'bg-blue-500/10 border-blue-500/30',
  GRADE_POSTED: 'bg-emerald-500/10 border-emerald-500/30',
  ANNOUNCEMENT: 'bg-purple-500/10 border-purple-500/30',
  SYSTEM: 'bg-zinc-500/10 border-zinc-500/30',
};

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <SkeletonTable />;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
            Stay updated with important messages and reminders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadNotifications}
          >
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck className="w-4 h-4" />}
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
            filter === 'all'
              ? 'text-[#E9C349]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          All Notifications
          {filter === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E9C349]" />
          )}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
            filter === 'unread'
              ? 'text-[#E9C349]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#E9C349] text-black text-xs font-bold">
              {unreadCount}
            </span>
          )}
          {filter === 'unread' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E9C349]" />
          )}
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          variant="notifications"
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? "You're all caught up! All notifications have been read."
              : "You'll see important updates and messages here when they arrive."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`rounded-2xl border p-4 transition-all ${
                notification.isRead
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/10 border-white/20'
              } hover:bg-white/10`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.SYSTEM
                  }`}
                >
                  {NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.SYSTEM}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-semibold text-sm ${
                            notification.isRead ? 'text-zinc-300' : 'text-white'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#E9C349]" />
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          notification.isRead ? 'text-zinc-400' : 'text-zinc-300'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-zinc-500 mt-2 font-mono">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
