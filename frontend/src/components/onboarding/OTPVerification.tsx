'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Phone, Mail, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface OTPVerificationProps {
  contactType: 'phone' | 'email';
  contactValue: string;
  onVerified: () => void;
  onChangeContact: () => void;
  onBack: () => void;
}

const MOCK_OTP = '123456'; // Demo OTP — replace with real API integration
const RESEND_COOLDOWN = 30; // seconds

export function OTPVerification({
  contactType,
  contactValue,
  onVerified,
  onChangeContact,
  onBack,
}: OTPVerificationProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleDigitChange = useCallback((idx: number, val: string) => {
    setError('');
    // Handle paste of full code
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      const newDigits = val.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      return;
    }
    // Only allow single digit
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = digit;
    setDigits(newDigits);
    // Auto-advance
    if (digit && idx < 5) {
      setTimeout(() => inputRefs.current[idx + 1]?.focus(), 0);
    }
  }, [digits]);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        const newDigits = [...digits];
        newDigits[idx - 1] = '';
        setDigits(newDigits);
        inputRefs.current[idx - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputRefs.current[idx + 1]?.focus();
  }, [digits]);

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setIsVerifying(true);
    setError('');

    // Simulate verification delay
    await new Promise((r) => setTimeout(r, 1200));

    if (code === MOCK_OTP) {
      setIsVerified(true);
      setTimeout(() => onVerified(), 1500);
    } else {
      setError('Incorrect code. Try 123456 for this demo.');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }
    setIsVerifying(false);
  };

  const handleResend = () => {
    if (!canResend) return;
    setResendCount((c) => c + 1);
    setCanResend(false);
    setCountdown(RESEND_COOLDOWN);
    setDigits(Array(6).fill(''));
    setError('');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (digits.every((d) => d !== '') && !isVerifying && !isVerified) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const ContactIcon = contactType === 'phone' ? Phone : Mail;
  const maskedContact =
    contactType === 'phone'
      ? contactValue.replace(/(\+?\d{3})\d+(\d{3})$/, '$1•••$2')
      : contactValue.replace(/(.{2})(.+)(@.+)/, '$1•••$3');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--accent-gold-subtle), rgba(233,195,73,0.05))',
            border: '1px solid var(--accent-gold-border)',
          }}
        >
          <ContactIcon className="w-7 h-7" style={{ color: 'var(--brand-gold)' }} />
        </motion.div>

        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Verify Your {contactType === 'phone' ? 'Phone' : 'Email'}
          </h2>
          <p className="font-sans text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
            We sent a 6-digit code to{' '}
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {maskedContact}
            </span>
          </p>
        </div>
      </div>

      {/* OTP Input */}
      <AnimatePresence mode="wait">
        {!isVerified ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* 6-digit grid */}
            <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Verification code">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={(e) => e.target.select()}
                  aria-label={`Digit ${idx + 1}`}
                  className="w-11 h-14 sm:w-13 sm:h-16 text-center text-xl font-bold font-mono rounded-xl border-2 transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: error
                      ? 'var(--status-danger)'
                      : digit
                      ? 'var(--brand-gold)'
                      : 'var(--border-default)',
                    color: digit ? 'var(--brand-gold)' : 'var(--text-primary)',
                    boxShadow: digit ? '0 0 0 3px var(--accent-gold-glow)' : undefined,
                  }}
                />
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs font-sans"
                  style={{ color: 'var(--status-danger)' }}
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Verify button */}
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleVerify}
              disabled={isVerifying || digits.some((d) => !d)}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                'Verify Code'
              )}
            </Button>

            {/* Resend & change */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className="flex items-center gap-1.5 text-xs font-sans transition-colors disabled:opacity-40"
                style={{ color: canResend ? 'var(--brand-gold)' : 'var(--text-faint)' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {canResend ? 'Resend code' : `Resend in ${countdown}s`}
              </button>

              <button
                type="button"
                onClick={onChangeContact}
                className="text-xs font-sans transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Change {contactType === 'phone' ? 'phone number' : 'email'}
              </button>
            </div>

            {/* Demo hint */}
            <div
              className="text-center py-3 rounded-xl border text-[11px] font-mono"
              style={{
                backgroundColor: 'var(--accent-gold-subtle)',
                borderColor: 'var(--accent-gold-border)',
                color: 'var(--brand-gold)',
              }}
            >
              Demo: enter <strong>123456</strong> to verify
            </div>
          </motion.div>
        ) : (
          /* Success state */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--status-success-bg)',
                border: '2px solid var(--status-success-border)',
              }}
            >
              <ShieldCheck className="w-10 h-10" style={{ color: 'var(--status-success)' }} />
            </motion.div>
            <div className="text-center">
              <h3
                className="font-serif text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Verified!
              </h3>
              <p className="font-sans text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Your {contactType} has been confirmed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button */}
      {!isVerified && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-sans transition-colors"
          style={{ color: 'var(--text-faint)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to account creation
        </button>
      )}
    </div>
  );
}
