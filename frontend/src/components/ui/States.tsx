'use client';

/**
 * Harmony College — Enterprise UX State System
 * ─────────────────────────────────────────────
 * A single, reusable set of state components covering every
 * application state: loading, empty, error, offline, success.
 * All components consume the centralized design system tokens.
 * Import from '@/src/components/ui/States'.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import {
  AlertTriangle, RefreshCw, WifiOff, Inbox, Search,
  FileX, Users, BookOpen, GraduationCap, ClipboardList,
  FileText, Bell, BarChart3, DollarSign, Calendar,
  ShieldOff, Clock, CheckCircle2, XCircle, Info, Wifi,
  UploadCloud, Download, AlertCircle, FolderOpen,
} from 'lucide-react';
import { Button } from './Button';
import { fadeUp, scaleIn, slideDown, toastEntrance, DURATION, EASE, SPRING } from '@/src/lib/motion';

/* ─────────────────────────────────────────────────────────
   SHIMMER ANIMATION
   ───────────────────────────────────────────────────────── */

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl ds-skeleton ${className}`}
      style={style}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--hover-overlay) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SKELETON PRIMITIVES
   ───────────────────────────────────────────────────────── */

/** Single skeleton line */
export function SkeletonLine({ w = 'w-full', h = 'h-3', className = '' }: { w?: string; h?: string; className?: string }) {
  return <Shimmer className={`${h} ${w} ${className}`} />;
}

/** KPI / Stats card skeleton — matches KPICard layout */
export function SkeletonKPICard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 border ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <Shimmer className="h-2.5 w-24" />
          <Shimmer className="h-8 w-20" />
          <Shimmer className="h-2.5 w-32" />
        </div>
        <Shimmer className="w-10 h-10 rounded-xl" />
      </div>
      <Shimmer className="h-6 w-16 mt-3" />
    </div>
  );
}

/** Generic card content skeleton */
export function SkeletonCard({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 border space-y-4 ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className={`h-3 ${i === 0 ? 'w-full' : i === 1 ? 'w-4/5' : 'w-3/5'}`} />
      ))}
    </div>
  );
}

/** Table skeleton — full table with configurable row count */
export function SkeletonTable({ rows = 5, cols = 5, className = '' }: { rows?: number; cols?: number; className?: string }) {
  const widths = ['w-32', 'w-24', 'w-20', 'w-28', 'w-16'];
  return (
    <div
      className={`overflow-x-auto rounded-2xl border ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      aria-hidden="true"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className={`h-2.5 ${widths[i % widths.length]}`} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Shimmer className="w-8 h-8 rounded-full shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, i) => (
            <Shimmer key={i} className={`h-3 ${widths[(i + 1) % widths.length]}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chart area skeleton */
export function SkeletonChart({ height = 160, className = '' }: { height?: number; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} aria-hidden="true">
      {/* Bars rising from bottom */}
      <div className="flex items-end gap-2 px-4" style={{ height }}>
        {[60, 80, 45, 95, 70, 85, 55, 90, 65, 75].map((pct, i) => (
          <Shimmer
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${pct}%` }}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-2 px-4 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-2 flex-1" />
        ))}
      </div>
    </div>
  );
}

/** Profile header skeleton */
export function SkeletonProfile({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden="true">
      <Shimmer className="w-16 h-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Form skeleton */
export function SkeletonForm({ fields = 4, className = '' }: { fields?: number; className?: string }) {
  return (
    <div className={`space-y-5 ${className}`} aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Shimmer className="h-2.5 w-24" />
          <Shimmer className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <Shimmer className="h-10 w-32 rounded-xl mt-2" />
    </div>
  );
}

/** Page-level loading — fills the content area with skeleton layout */
export function SkeletonPage({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-6 pb-8 ${className}`}
      aria-label="Loading content"
      aria-busy="true"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-8 w-56" />
          <Shimmer className="h-3.5 w-40" />
        </div>
        <Shimmer className="h-9 w-28 rounded-xl" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonKPICard key={i} />)}
      </div>
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><SkeletonTable rows={5} /></div>
        <SkeletonCard rows={5} />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   EMPTY STATE COMPONENT
   ───────────────────────────────────────────────────────── */

type EmptyVariant =
  | 'default' | 'search' | 'courses' | 'students' | 'faculty'
  | 'employees' | 'notifications' | 'documents' | 'payments'
  | 'grades' | 'attendance' | 'reports' | 'certificates'
  | 'timetable' | 'leaves' | 'payroll' | 'audit' | 'filters';

const EMPTY_CONFIG: Record<EmptyVariant, { icon: React.ElementType; title: string; description: string }> = {
  default:       { icon: Inbox,          title: 'Nothing here yet',              description: 'This section is empty. Content will appear here once available.' },
  search:        { icon: Search,         title: 'No results found',              description: 'No items match your search. Try different keywords or clear the filters.' },
  courses:       { icon: BookOpen,       title: 'No courses found',              description: 'There are no courses matching your criteria.' },
  students:      { icon: GraduationCap,  title: 'No students found',             description: 'No student records match the selected filters.' },
  faculty:       { icon: Users,          title: 'No faculty assigned',           description: 'No faculty members have been assigned to this department yet.' },
  employees:     { icon: Users,          title: 'No employees found',            description: 'No employee records match the selected filters.' },
  notifications: { icon: Bell,           title: 'All caught up',                 description: 'You have no notifications right now. Check back later.' },
  documents:     { icon: FolderOpen,     title: 'No documents uploaded',         description: 'No documents have been uploaded to this section yet.' },
  payments:      { icon: DollarSign,     title: 'No payment records',            description: 'No payment transactions have been recorded yet.' },
  grades:        { icon: ClipboardList,  title: 'No grades recorded',            description: 'No grades have been entered for this course yet.' },
  attendance:    { icon: Calendar,       title: 'No attendance records',         description: 'No attendance sessions have been recorded for this period.' },
  reports:       { icon: BarChart3,      title: 'No reports available',          description: 'There are no reports generated for the selected period.' },
  certificates:  { icon: FileText,       title: 'No certificates issued',        description: 'No digital certificates have been generated yet.' },
  timetable:     { icon: Calendar,       title: 'No timetable scheduled',        description: 'No classes are scheduled for the selected period.' },
  leaves:        { icon: Calendar,       title: 'No leave requests',             description: 'There are no leave requests pending for this period.' },
  payroll:       { icon: DollarSign,     title: 'No payroll runs',               description: 'No payroll has been processed for the selected period.' },
  audit:         { icon: ClipboardList,  title: 'No audit log entries',          description: 'No activity has been logged for the selected filters.' },
  filters:       { icon: Search,         title: 'No results match your filters', description: 'Try adjusting or clearing your filters to see more results.' },
};

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  variant = 'default', title, description, icon, action, secondaryAction, className = '', compact = false,
}: EmptyStateProps) {
  const cfg = EMPTY_CONFIG[variant];
  const Icon = icon ?? cfg.icon;
  const heading = title ?? cfg.title;
  const body = description ?? cfg.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-4' : 'py-16 px-6'} ${className}`}
      role="status"
      aria-label={heading}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-inner"
        style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--text-faint)' }} strokeWidth={1.5} />
      </div>
      <h3 className="font-serif text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{heading}</h3>
      <p className="font-sans text-sm max-w-xs leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>{body}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {action && <Button variant="primary" size="sm" icon={action.icon} onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && <Button variant="secondary" size="sm" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
        </div>
      )}
    </motion.div>
  );
}

/** Inline empty state for use inside table <td> cells */
export function EmptyTableRow({ colSpan = 6, message = 'No records found.' }: { colSpan?: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState compact description={message} className="py-14" />
      </td>
    </tr>
  );
}

/** Compact no-results card — for filtered lists */
export function NoResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      variant="search"
      compact
      secondaryAction={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   ERROR STATE COMPONENT
   ───────────────────────────────────────────────────────── */

type ErrorVariant = 'generic' | 'network' | 'unauthorized' | 'forbidden' | 'not_found' | 'timeout' | 'server';

const ERROR_CONFIG: Record<ErrorVariant, { icon: React.ElementType; title: string; description: string; retryable: boolean }> = {
  generic:      { icon: AlertTriangle, title: 'Something went wrong',        description: 'An unexpected error occurred. Please try again or contact support if the issue persists.', retryable: true },
  network:      { icon: WifiOff,       title: 'Network error',               description: 'Unable to reach the server. Please check your connection and try again.',                   retryable: true },
  unauthorized: { icon: ShieldOff,     title: 'Session expired',             description: 'Your session has expired. Please sign in again to continue.',                               retryable: false },
  forbidden:    { icon: ShieldOff,     title: 'Access denied',               description: 'You do not have permission to view this content.',                                          retryable: false },
  not_found:    { icon: FileX,         title: 'Not found',                   description: 'The requested resource could not be found.',                                                retryable: false },
  timeout:      { icon: Clock,         title: 'Request timed out',           description: 'The server took too long to respond. Please try again.',                                    retryable: true },
  server:       { icon: AlertCircle,   title: 'Server unavailable',          description: 'The server is temporarily unavailable. We are working to resolve this.',                    retryable: true },
};

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onSignIn?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  variant = 'generic', title, description, onRetry, onSignIn, compact = false, className = '',
}: ErrorStateProps) {
  const cfg = ERROR_CONFIG[variant];
  const Icon = cfg.icon;
  const heading = title ?? cfg.title;
  const body = description ?? cfg.description;
  const showRetry = cfg.retryable && !!onRetry;
  const showSignIn = variant === 'unauthorized' && !!onSignIn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-4' : 'py-16 px-6'} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--status-danger)' }} strokeWidth={1.5} />
      </div>
      <h3 className="font-serif text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{heading}</h3>
      <p className="font-sans text-sm max-w-sm leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>{body}</p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {showRetry && (
          <Button variant="primary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
            Try again
          </Button>
        )}
        {showSignIn && (
          <Button variant="primary" size="sm" onClick={onSignIn}>Sign in again</Button>
        )}
        {!showRetry && !showSignIn && (
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Reload page</Button>
        )}
      </div>
    </motion.div>
  );
}

/** Compact inline error — for use inside cards or panels */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border"
      style={{ backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)' }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--status-danger)' }} />
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm" style={{ color: 'var(--status-danger)' }}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 p-1 rounded ds-focus-ring"
          style={{ color: 'var(--status-danger)' }}
          aria-label="Retry"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   OFFLINE BANNER
   ───────────────────────────────────────────────────────── */

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setJustReconnected(false); };
    const goOnline  = () => {
      setOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    if (!navigator.onLine) setOffline(true);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(offline || justReconnected) && (
        <motion.div
          key={offline ? 'offline' : 'online'}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-100 flex items-center justify-center gap-2.5 px-4 py-2.5 text-xs font-sans font-semibold"
          style={offline
            ? { backgroundColor: 'var(--status-danger)', color: '#fff' }
            : { backgroundColor: 'var(--status-success)', color: '#fff' }
          }
          role="status"
          aria-live="polite"
        >
          {offline
            ? <><WifiOff className="w-3.5 h-3.5" /> No internet connection — some features may be unavailable</>
            : <><Wifi className="w-3.5 h-3.5" /> Back online</>
          }
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────
   SESSION EXPIRED OVERLAY
   ───────────────────────────────────────────────────────── */

interface SessionExpiredOverlayProps {
  isVisible: boolean;
  onSignIn: () => void;
}

export function SessionExpiredOverlay({ isVisible, onSignIn }: SessionExpiredOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus dialog on open
  useEffect(() => {
    if (!isVisible) return;
    const frame = requestAnimationFrame(() => {
      const el = dialogRef.current?.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
      el?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isVisible]);

  // Focus trap
  useEffect(() => {
    if (!isVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const el = dialogRef.current;
      if (!el) return;
      const focusable = Array.from(el.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-200 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: 'var(--overlay-modal-bg)' }}
          aria-hidden="false"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-expired-title"
            tabIndex={-1}
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="ds-modal rounded-3xl max-w-sm w-full p-8 border shadow-2xl text-center focus:outline-none"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)' }}
              aria-hidden="true"
            >
              <Clock className="w-6 h-6" style={{ color: 'var(--status-warning)' }} />
            </div>
            <h2 id="session-expired-title" className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Session Expired
            </h2>
            <p className="font-sans text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your session has timed out for security. Please sign in again to continue.
            </p>
            <Button variant="primary" className="w-full" onClick={onSignIn}>Sign In Again</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────
   SUCCESS / INFO TOAST SYSTEM
   ───────────────────────────────────────────────────────── */

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  visible: boolean;
  onDismiss?: () => void;
}

const TOAST_STYLE: Record<ToastVariant, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', icon: CheckCircle2, iconColor: 'var(--status-success)' },
  error:   { bg: 'var(--status-danger-bg)',  border: 'var(--status-danger-border)',  icon: XCircle,      iconColor: 'var(--status-danger)'  },
  warning: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', icon: AlertTriangle,iconColor: 'var(--status-warning)' },
  info:    { bg: 'var(--status-info-bg)',    border: 'var(--status-info-border)',    icon: Info,         iconColor: 'var(--status-info)'    },
};

export function Toast({ variant = 'success', message, visible, onDismiss }: ToastProps) {
  const s = TOAST_STYLE[variant];
  const Icon = s.icon;
  // Errors and warnings demand immediate attention — assertive live region
  const isUrgent = variant === 'error' || variant === 'warning';

  useEffect(() => {
    if (visible && onDismiss) {
      const t = setTimeout(onDismiss, 4000);
      return () => clearTimeout(t);
    }
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-sans"
          style={{ backgroundColor: s.bg, borderColor: s.border }}
          role={isUrgent ? 'alert' : 'status'}
          aria-live={isUrgent ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          <Icon className="w-4 h-4 shrink-0" style={{ color: s.iconColor }} aria-hidden="true" />
          <span style={{ color: 'var(--text-primary)' }}>{message}</span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-1 shrink-0 rounded ds-focus-ring min-w-11 min-h-11 flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Dismiss notification"
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Fixed-position toast container for page-level notifications */
export function ToastContainer({ variant = 'success', message, visible, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-150 pointer-events-none" aria-live="polite">
      <div className="pointer-events-auto">
        <Toast variant={variant} message={message} visible={visible} onDismiss={onDismiss} />
      </div>
    </div>
  );
}

/** Hook for managing toast state */
export function useToast() {
  const [state, setState] = useState<{ visible: boolean; message: string; variant: ToastVariant }>({
    visible: false, message: '', variant: 'success',
  });

  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    setState({ visible: true, message, variant });
  }, []);

  const hide = useCallback(() => setState(s => ({ ...s, visible: false })), []);

  return { toast: state, show, hide };
}

/* ─────────────────────────────────────────────────────────
   FILE UPLOAD STATE
   ───────────────────────────────────────────────────────── */

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadProgressProps {
  status: UploadStatus;
  fileName?: string;
  progress?: number; // 0–100
  errorMessage?: string;
  onRetry?: () => void;
  onRemove?: () => void;
}

export function UploadProgress({ status, fileName, progress = 0, errorMessage, onRetry, onRemove }: UploadProgressProps) {
  if (status === 'idle') return null;
  const reduced    = useReducedMotion();
  const isUploading = status === 'uploading';
  const isSuccess  = status === 'success';
  const isError    = status === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ ...DURATION.standard, ...EASE.out }}
      className="flex items-center gap-3 p-3.5 rounded-xl border"
      style={{
        backgroundColor: isError ? 'var(--status-danger-bg)' : isSuccess ? 'var(--status-success-bg)' : 'var(--hover-overlay)',
        borderColor: isError ? 'var(--status-danger-border)' : isSuccess ? 'var(--status-success-border)' : 'var(--border-default)',
      }}
    >
      {/* Icon */}
      <div className="shrink-0">
        {isUploading && (
          <motion.div
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <UploadCloud className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
          </motion.div>
        )}
        {isSuccess  && <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--status-success)' }} />}
        {isError    && <XCircle      className="w-4 h-4" style={{ color: 'var(--status-danger)'  }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {fileName && (
          <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
        )}
        {isUploading && (
          <div className="mt-1.5 space-y-1">
            {/* Use scaleX instead of width for GPU-composited animation */}
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
              <motion.div
                className="h-full w-full rounded-full origin-left"
                style={{ backgroundColor: 'var(--brand-gold)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={reduced ? { duration: 0 } : { ...DURATION.standard, ...EASE.out }}
              />
            </div>
            <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{progress}% uploaded</p>
          </div>
        )}
        {isSuccess  && <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--status-success)' }}>Upload complete</p>}
        {isError    && <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--status-danger)'  }}>{errorMessage ?? 'Upload failed'}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isError && onRetry && (
          <button onClick={onRetry} className="p-1 rounded ds-focus-ring" style={{ color: 'var(--status-danger)' }} aria-label="Retry upload">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove} className="p-1 rounded ds-focus-ring" style={{ color: 'var(--text-muted)' }} aria-label="Remove">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/** Drop zone for file uploads */
interface DropZoneProps {
  accept?: string;
  maxSizeMB?: number;
  onSelect: (file: File) => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
}

export function DropZone({ accept = '*', maxSizeMB = 10, onSelect, label = 'Click to upload or drag & drop', sublabel, disabled = false }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) return;
    onSelect(file);
  };

  const dropZoneLabel = [label, sublabel, maxSizeMB ? `Maximum file size: ${maxSizeMB} megabytes` : ''].filter(Boolean).join('. ');

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={dropZoneLabel}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !disabled) handleFile(file);
      }}
      className={`flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ds-focus-ring ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        borderColor: dragging ? 'var(--brand-gold)' : 'var(--border-default)',
        backgroundColor: dragging ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
      }}
    >
      <UploadCloud className="w-8 h-8" style={{ color: dragging ? 'var(--brand-gold)' : 'var(--text-faint)' }} strokeWidth={1.5} aria-hidden="true" />
      <p className="font-sans text-sm font-medium text-center" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sublabel && <p className="font-mono text-[11px]" style={{ color: 'var(--text-faint)' }}>{sublabel}</p>}
      {maxSizeMB && <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>Max {maxSizeMB}MB</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        disabled={disabled}
      />
    </div>
  );
}

/** Download in-progress indicator */
export function DownloadProgress({ fileName, visible }: { fileName: string; visible: boolean }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ ...DURATION.standard, ...EASE.out }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-sans"
          style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}
          role="status"
          aria-live="polite"
        >
          <motion.div animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Download className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} />
          </motion.div>
          <span style={{ color: 'var(--text-secondary)' }}>Downloading <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fileName}</span>…</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────
   CHART STATE WRAPPER
   ───────────────────────────────────────────────────────── */

interface ChartStateProps {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
  height?: number;
  children: React.ReactNode;
}

export function ChartStateWrapper({ loading, error, empty, onRetry, height = 160, children }: ChartStateProps) {
  if (loading) return <SkeletonChart height={height} />;

  if (error) return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border"
      style={{ height, backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)' }}
    >
      <AlertTriangle className="w-5 h-5" style={{ color: 'var(--status-danger)' }} strokeWidth={1.5} />
      <p className="font-sans text-xs" style={{ color: 'var(--status-danger)' }}>Failed to load chart data</p>
      {onRetry && (
        <button onClick={onRetry} className="font-sans text-xs font-semibold underline ds-focus-ring" style={{ color: 'var(--status-danger)' }}>
          Retry
        </button>
      )}
    </div>
  );

  if (empty) return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border"
      style={{ height, backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-subtle)' }}
    >
      <BarChart3 className="w-6 h-6" style={{ color: 'var(--text-faint)' }} strokeWidth={1.5} />
      <p className="font-sans text-xs" style={{ color: 'var(--text-faint)' }}>No data available</p>
    </div>
  );

  return <>{children}</>;
}

/* ─────────────────────────────────────────────────────────
   CONTENT STATE WRAPPER (Loading → Error → Empty → Content)
   ───────────────────────────────────────────────────────── */

interface ContentStateProps {
  loading?: boolean;
  error?: boolean | string;
  empty?: boolean;
  onRetry?: () => void;
  errorVariant?: ErrorVariant;
  emptyVariant?: EmptyVariant;
  emptyAction?: EmptyStateProps['action'];
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps any content block, handling all four application states
 * in the correct priority order: loading → error → empty → content.
 *
 * Usage:
 *   <ContentState loading={isLoading} error={error} empty={data.length === 0}>
 *     <Table ... />
 *   </ContentState>
 */
export function ContentState({
  loading, error, empty, onRetry, errorVariant = 'generic',
  emptyVariant = 'default', emptyAction, skeleton, children, className = '',
}: ContentStateProps) {
  if (loading) {
    return <div className={className}>{skeleton ?? <SkeletonPage />}</div>;
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorState
          variant={errorVariant}
          description={typeof error === 'string' ? error : undefined}
          onRetry={onRetry}
          compact
        />
      </div>
    );
  }

  if (empty) {
    return (
      <div className={className}>
        <EmptyState variant={emptyVariant} action={emptyAction} compact />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

/* ─────────────────────────────────────────────────────────
   FILTER ACTIVE BANNER
   ───────────────────────────────────────────────────────── */

interface FilterBannerProps {
  count: number;
  onClear: () => void;
}

/** Shows how many filters are active and offers a clear button */
export function FilterBanner({ count, onClear }: FilterBannerProps) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ ...DURATION.fast, ...EASE.out }}
      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-sans"
      style={{ backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)' }}
    >
      <span style={{ color: 'var(--brand-gold)' }}>
        <span className="font-bold">{count}</span> filter{count > 1 ? 's' : ''} active
      </span>
      <button
        onClick={onClear}
        className="font-semibold underline ds-focus-ring"
        style={{ color: 'var(--brand-gold)' }}
      >
        Clear all
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   IMAGE FALLBACK
   ───────────────────────────────────────────────────────── */

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  wrapperClassName?: string;
}

/** Renders an img with a skeleton fallback on load error */
export function SafeImage({ src, alt, fallback, wrapperClassName = '', className = '', ...rest }: SafeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex items-center justify-center ${wrapperClassName}`}
        style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}
        aria-label={alt}
      >
        {fallback ?? <Users className="w-5 h-5" style={{ color: 'var(--text-faint)' }} strokeWidth={1.5} />}
      </div>
    );
  }

  return (
    <div className={`relative ${wrapperClassName}`}>
      {!loaded && <Shimmer className="absolute inset-0 rounded-inherit" />}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        {...rest}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   INLINE LOADING SPINNER (for buttons, small areas)
   ───────────────────────────────────────────────────────── */

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className={`rounded-full border-2 shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderColor: 'var(--border-strong)',
        borderTopColor: 'var(--brand-gold)',
      }}
      aria-hidden="true"
    />
  );
}

/** Full-area loading overlay for async operations on existing content */
export function LoadingOverlay({ visible, message }: { visible: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ ...DURATION.fast, ...EASE.inOut }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl z-10 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--bg-base) 85%, transparent)' }}
          aria-busy="true"
          aria-label={message ?? 'Loading'}
        >
          <Spinner size={28} />
          {message && <p className="font-sans text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────
   EXPORTS — convenience re-exports for easy imports
   ───────────────────────────────────────────────────────── */

export {
  // Skeletons
  Shimmer,
};
