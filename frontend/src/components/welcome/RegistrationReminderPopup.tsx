'use client';

/**
 * Registration Reminder Popup
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays a modal popup on /welcome when a student has an unread registration
 * reminder notification from the Registrar. Shows incomplete registration steps
 * dynamically based on the student's actual profile status.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, ArrowRight, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RegistrationNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

interface StudentStatus {
  profileCompleted: boolean;
  registrationFeePaid: boolean;
  registrationFeeVerified: boolean;
  departmentSelected: boolean;
  programSelected: boolean;
}

interface RegistrationReminderPopupProps {
  userId: string;
  fullName: string;
}

export function RegistrationReminderPopup({ userId, fullName }: RegistrationReminderPopupProps) {
  const router = useRouter();
  const [notification, setNotification] = useState<RegistrationNotification | null>(null);
  const [studentStatus, setStudentStatus] = useState<StudentStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if popup was dismissed recently (within current session)
  const dismissalKey = `registration_reminder_dismissed_${userId}`;
  
  useEffect(() => {
    const sessionDismissal = sessionStorage.getItem(dismissalKey);
    if (sessionDismissal) {
      const dismissedAt = parseInt(sessionDismissal, 10);
      const hoursSinceDismissal = (Date.now() - dismissedAt) / (1000 * 60 * 60);
      // Keep dismissed for 12 hours or until session ends
      if (hoursSinceDismissal < 12) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }

    loadNotificationAndStatus();
  }, [userId]);

  const loadNotificationAndStatus = async () => {
    try {
      // Fetch unread notifications
      const notifRes = await fetch('/api/student/notifications?unreadOnly=true&limit=50', {
        credentials: 'include',
      });
      
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        // Find registration reminder (type could be REGISTRATION_REMINDER or ONBOARDING)
        const reminder = notifData.notifications?.find(
          (n: RegistrationNotification) => 
            !n.isRead && 
            (n.type === 'REGISTRATION_REMINDER' || n.type === 'ONBOARDING')
        );
        
        if (reminder) {
          setNotification(reminder);
          
          // Fetch student profile to determine what's incomplete
          const profileRes = await fetch('/api/student/profile', { credentials: 'include' });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const profile = profileData.profile;
            
            setStudentStatus({
              profileCompleted: Boolean(profile?.userId), // Has profile data
              registrationFeePaid: Boolean(profile?.registrationFeePaid),
              registrationFeeVerified: Boolean(profile?.paymentVerifiedByFinance),
              departmentSelected: Boolean(profile?.selectedDepartmentId),
              programSelected: Boolean(profile?.program && profile?.programType),
            });
          }
        }
      }
    } catch (error) {
      console.error('[RegistrationReminderPopup] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = () => {
    // Navigate to onboarding page
    router.push('/onboarding/about');
  };

  const handleRemindLater = () => {
    // Dismiss popup but don't mark notification as read
    sessionStorage.setItem(dismissalKey, Date.now().toString());
    setDismissed(true);
  };

  // Don't show if loading, no notification, or dismissed
  if (loading || !notification || dismissed || !studentStatus) {
    return null;
  }

  // Determine incomplete steps
  const incompleteSteps: string[] = [];
  if (!studentStatus.profileCompleted) {
    incompleteSteps.push('Complete your profile information');
  }
  if (!studentStatus.programSelected) {
    incompleteSteps.push('Select your program and department');
  }
  if (!studentStatus.registrationFeePaid) {
    incompleteSteps.push('Submit registration fee payment receipt');
  } else if (!studentStatus.registrationFeeVerified) {
    incompleteSteps.push('Wait for Finance Officer to verify your payment');
  }

  const firstName = fullName.split(' ')[0] || 'Student';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Gold accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
          />

          {/* Close button */}
          <button
            onClick={handleRemindLater}
            className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-faint)' }} />
          </button>

          <div className="p-8 space-y-6">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-gold-subtle)',
                border: '1px solid var(--accent-gold-border)',
              }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: 'var(--brand-gold)' }} />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h2
                className="font-serif text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Complete Your Registration
              </h2>
              <p
                className="text-sm font-sans"
                style={{ color: 'var(--text-muted)' }}
              >
                Hi {firstName}, you have pending registration steps to complete.
              </p>
            </div>

            {/* Notification message */}
            <div
              className="rounded-2xl p-4 text-sm font-sans leading-relaxed"
              style={{
                backgroundColor: 'var(--hover-overlay)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {notification.message}
            </div>

            {/* Incomplete steps */}
            {incompleteSteps.length > 0 && (
              <div className="space-y-3">
                <p
                  className="text-xs font-mono uppercase tracking-widest"
                  style={{ color: 'var(--text-faint)' }}
                >
                  Steps to Complete
                </p>
                <ul className="space-y-2">
                  {incompleteSteps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm font-sans"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span
                        className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--brand-gold)' }}
                      />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <div
              className="flex items-center gap-2 text-xs font-mono"
              style={{ color: 'var(--text-faint)' }}
            >
              <Clock className="w-3.5 h-3.5" />
              Reminder sent {new Date(notification.createdAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRemindLater}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--hover-overlay)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                Remind Me Later
              </button>
              <button
                onClick={handleCompleteRegistration}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))',
                  color: 'var(--bg-base)',
                }}
              >
                Complete Registration
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
