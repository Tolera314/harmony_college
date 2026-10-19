/**
 * useRealtimeNotifications Hook
 * 
 * Provides real-time notification functionality with Socket.io integration,
 * sound alerts, unread count tracking, and notification management.
 * 
 * Features:
 * - Socket.io connection for real-time notification delivery
 * - Automatic unread count updates
 * - Sound notification alerts (with enable/disable toggle)
 * - Notification list management
 * - Mark as read functionality
 * - Persistent notification preferences
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  actionTab: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface UseRealtimeNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
}

interface UseRealtimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  soundEnabled: boolean;
  isConnected: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleSound: () => void;
  playNotificationSound: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const NOTIFICATION_SOUND_KEY = 'harmony_notification_sound_enabled';

// Notification sound (simple beep using Web Audio API)
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (err) {
    console.warn('[Notifications] Could not play sound:', err);
  }
};

// Unified notification API (works for all roles)
const fetchNotifications = async (): Promise<{ notifications: Notification[]; unreadCount: number; total: number }> => {
  try {
    const res = await fetch('/api/notifications', { credentials: 'include' });
    if (!res.ok) {
      // If unauthorized (401), return empty state instead of throwing
      if (res.status === 401) {
        return { notifications: [], unreadCount: 0, total: 0 };
      }
      throw new Error('Failed to fetch notifications');
    }
    return res.json();
  } catch (err) {
    // Return empty state if network error or fetch fails
    console.warn('[Notifications] Fetch failed:', err);
    return { notifications: [], unreadCount: 0, total: 0 };
  }
};

const markNotificationRead = async (id: string): Promise<void> => {
  const res = await fetch(`/api/notifications/${id}/read`, { 
    method: 'POST',
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
};

const markAllNotificationsRead = async (): Promise<void> => {
  const res = await fetch('/api/notifications/read-all', { 
    method: 'POST',
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
};

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    enabled = true,
    soundEnabled: initialSoundEnabled = true,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return initialSoundEnabled;
    const saved = localStorage.getItem(NOTIFICATION_SOUND_KEY);
    return saved !== null ? saved === 'true' : initialSoundEnabled;
  });

  const socketRef = useRef<Socket | null>(null);
  const existingNotificationIds = useRef<Set<string>>(new Set());

  // Fetch notifications from API
  const refresh = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      
      // Track existing notification IDs to prevent duplicate sounds
      existingNotificationIds.current = new Set(data.notifications.map(n => n.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
      console.error('[Notifications] Fetch error:', err);
      // Set empty state on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[Notifications] Mark read error:', err);
      // Silently fail - don't refresh to avoid cascading errors
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      
      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err);
      // Silently fail - don't refresh to avoid cascading errors
    }
  }, []);

  // Toggle sound preference
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(NOTIFICATION_SOUND_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Socket.io connection and real-time notification handling
  useEffect(() => {
    if (!enabled) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Notifications] Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Notifications] Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Notifications] Socket connection error:', err);
      setIsConnected(false);
    });

    // Listen for new notifications
    socket.on('notification:new', (notification: Notification) => {
      console.log('[Notifications] New notification received:', notification);
      
      // Check if this is truly a new notification (not already in our list)
      const isNew = !existingNotificationIds.current.has(notification.id);
      
      if (isNew) {
        // Add to existing notifications list
        existingNotificationIds.current.add(notification.id);
        
        setNotifications(prev => {
          // Prevent duplicates
          const exists = prev.some(n => n.id === notification.id);
          if (exists) return prev;
          return [notification, ...prev];
        });
        
        // Increment unread count if notification is unread
        if (!notification.isRead) {
          setUnreadCount(prev => prev + 1);
        }
        
        // Play sound for new notifications only
        if (soundEnabled && isNew) {
          playNotificationSound();
        }
      }
    });

    // Initial fetch
    refresh();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, soundEnabled, refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    soundEnabled,
    isConnected,
    refresh,
    markAsRead,
    markAllAsRead,
    toggleSound,
    playNotificationSound,
  };
}
