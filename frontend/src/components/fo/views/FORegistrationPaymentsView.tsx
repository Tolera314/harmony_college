'use client';

/**
 * Finance Officer → Registration Fee Verification View
 * 
 * Manages applicant registration fee verifications.
 * Verified applicants are promoted to the Registrar's admissions queue.
 * Connected to live Prisma PostgreSQL records (`StudentProfile`, `User`, `Department`).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, CreditCard, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Filter, UserCheck, AlertCircle, RefreshCw, X, Eye, ArrowUpRight, Building2,
  ShieldCheck, FileText, UserX, Sparkles
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PaymentRecord {
  userId:                  string;
  registrationFeePaid:     boolean;
  registrationFeePaidAt:   string | null;
  departmentSelected:      boolean;
  paymentVerifiedByFinance: boolean;
  paymentVerifiedAt:       string | null;
  paymentVerifiedByUserId: string | null;
  selectedDepartmentId:    string | null;
  createdAt:               string;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  };
  selectedDepartment: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface PaymentsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  payments:   PaymentRecord[];
}

// ── API Fetch Helper ──────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (res.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(r => r.ok)
      .catch(() => false);
    if (!refreshed) throw new Error('Session expired. Please sign in again.');
    const retry = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    });
    const retryData = await retry.json().catch(() => ({}));
    if (!retry.ok) throw new Error((retryData as any).error ?? `Request failed: ${retry.status}`);
    return retryData as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

export function FORegistrationPaymentsView() {
  const [tab, setTab]               = useState<'pending' | 'verified'>('pending');
  const [records, setRecords]       = useState<PaymentRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [unverifyingId, setUnverifyingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Summary counter stats
  const [pendingCount, setPendingCount]   = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);

  const showToastNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch summary counters for badges
  const fetchCounters = useCallback(async () => {
    try {
      const [pendingRes, verifiedRes] = await Promise.all([
        apiFetch<PaymentsResponse>('/api/finance-officer/payments/pending?limit=1'),
        apiFetch<PaymentsResponse>('/api/finance-officer/payments/verified?limit=1'),
      ]);
      setPendingCount(pendingRes.total);
      setVerifiedCount(verifiedRes.total);
    } catch {
      // Non-blocking counter fetch fallback
    }
  }, []);

  const fetchData = useCallback(async (p: number, s: string, t: 'pending' | 'verified') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (s.trim()) params.set('search', s.trim());
      const data = await apiFetch<PaymentsResponse>(
        `/api/finance-officer/payments/${t}?${params.toString()}`
      );
      setRecords(data.payments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (t === 'pending') setPendingCount(data.total);
      if (t === 'verified') setVerifiedCount(data.total);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load registration payment records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchData(page, search, tab), 300);
  }, [page, search, tab, fetchData]);

  const handleVerify = async (userId: string, studentName: string) => {
    setVerifyingId(userId);
    try {
      await apiFetch(`/api/finance-officer/payments/${userId}/verify`, { method: 'POST' });
      showToastNotification(`Registration fee verified for ${studentName}`, 'success');
      if (selectedRecord?.userId === userId) {
        setSelectedRecord(prev => prev ? { ...prev, paymentVerifiedByFinance: true, paymentVerifiedAt: new Date().toISOString() } : null);
      }
      fetchData(page, search, tab);
      fetchCounters();
    } catch (e: any) {
      showToastNotification(e.message ?? 'Verification failed', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleUnverify = async (userId: string, studentName: string) => {
    setUnverifyingId(userId);
    try {
      await apiFetch(`/api/finance-officer/payments/${userId}/unverify`, { method: 'POST' });
      showToastNotification(`Verification revoked for ${studentName}`, 'success');
      if (selectedRecord?.userId === userId) {
        setSelectedRecord(prev => prev ? { ...prev, paymentVerifiedByFinance: false, paymentVerifiedAt: null } : null);
      }
      fetchData(page, search, tab);
      fetchCounters();
    } catch (e: any) {
      showToastNotification(e.message ?? 'Revocation failed', 'error');
    } finally {
      setUnverifyingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-3 backdrop-blur-md"
            style={{
              backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: toast.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl backdrop-blur-xl border border-(--border-default) bg-gradient-to-r from-(--hover-overlay) via-transparent to-(--accent-gold-subtle)">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-(--brand-gold)">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-(--text-primary)">
                Registration Fee Verification
              </h1>
              <p className="text-xs font-sans text-(--text-muted) mt-0.5">
                Audit and confirm applicant registration payments · Verified applicants move directly to Registrar Admissions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { fetchData(page, search, tab); fetchCounters(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => { setTab('pending'); setPage(1); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            tab === 'pending' ? 'ring-2 ring-(--brand-gold) bg-(--accent-gold-subtle)' : 'bg-(--hover-overlay)'
          } border-(--border-subtle)`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-(--text-muted)">Awaiting Verification</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-(--brand-gold)">{pendingCount}</p>
          <p className="text-[11px] text-(--text-faint) mt-1">Applicants pending FO sign-off</p>
        </div>

        <div
          onClick={() => { setTab('verified'); setPage(1); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            tab === 'verified' ? 'ring-2 ring-(--brand-gold) bg-(--accent-gold-subtle)' : 'bg-(--hover-overlay)'
          } border-(--border-subtle)`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-(--text-muted)">Verified Registration Fees</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-emerald-400">{verifiedCount}</p>
          <p className="text-[11px] text-(--text-faint) mt-1">Confirmed & sent to Registrar</p>
        </div>

        <div className="p-5 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-(--text-muted)">Verification Rate</span>
            <Sparkles className="w-4 h-4 text-(--brand-gold)" />
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-(--text-primary)">
            {pendingCount + verifiedCount > 0
              ? `${Math.round((verifiedCount / (pendingCount + verifiedCount)) * 100)}%`
              : '100%'}
          </p>
          <p className="text-[11px] text-(--text-faint) mt-1">Total processing efficiency</p>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-(--hover-overlay) border border-(--border-subtle)">
        {/* Tab Buttons */}
        <div className="flex gap-2">
          {(['pending', 'verified'] as const).map(t => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all ${
                  isActive
                    ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold) shadow-sm'
                    : 'bg-transparent border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                {t === 'pending' ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Awaiting Verification ({pendingCount})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Fees ({verifiedCount})</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-sans focus:outline-none focus:ring-1 focus:ring-(--brand-gold) bg-(--bg-base) border-(--border-default) text-(--text-primary)"
          />
        </div>
      </div>

      {/* Table / List Section */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse bg-(--hover-overlay) border border-(--border-subtle)" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl text-center border bg-(--hover-overlay) border-(--border-subtle)">
          <AlertCircle className="w-10 h-10 mx-auto text-(--status-danger) mb-2" />
          <p className="text-sm text-(--status-danger) font-medium">{error}</p>
          <button
            onClick={() => fetchData(page, search, tab)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)"
          >
            Retry Loading
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center border rounded-2xl bg-(--hover-overlay) border-(--border-subtle)">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-(--text-faint)" />
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">No records found</h3>
          <p className="text-xs font-sans text-(--text-muted) mt-1 max-w-sm mx-auto">
            {tab === 'pending'
              ? 'There are currently no applicant registration payments awaiting finance verification.'
              : 'No verified registration payments recorded matching your criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((r, idx) => {
            const isVerifying = verifyingId === r.userId;
            const isUnverifying = unverifyingId === r.userId;

            return (
              <motion.div
                key={r.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 rounded-2xl border transition-all hover:border-(--accent-gold-border) bg-(--hover-overlay) border-(--border-subtle)"
              >
                {/* Applicant Profile Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold font-serif text-base border bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)">
                    {r.user.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold font-sans truncate text-(--text-primary)">
                        {r.user.fullName}
                      </h4>
                      {r.paymentVerifiedByFinance ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending Sign-off
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-sans text-(--text-muted)">
                      <span className="font-mono text-(--text-faint)">{r.user.email ?? r.user.phone ?? r.userId}</span>
                      {r.selectedDepartment && (
                        <span className="flex items-center gap-1 text-(--brand-gold) font-medium">
                          <Building2 className="w-3 h-3" />
                          {r.selectedDepartment.code} ({r.selectedDepartment.name})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="hidden lg:flex flex-col text-right px-4 shrink-0 border-l border-(--border-subtle)">
                  <span className="text-[11px] font-mono text-(--text-muted)">Submitted:</span>
                  <span className="text-xs font-mono font-medium text-(--text-primary)">
                    {r.registrationFeePaidAt
                      ? new Date(r.registrationFeePaidAt).toLocaleString()
                      : new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  {r.paymentVerifiedAt && (
                    <span className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      Verified: {new Date(r.paymentVerifiedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-(--border-subtle)">
                  <button
                    onClick={() => setSelectedRecord(r)}
                    className="p-2 rounded-xl border text-xs font-semibold transition-all hover:bg-(--accent-gold-subtle) text-(--text-secondary) border-(--border-default)"
                    title="View Profile Details"
                  >
                    <Eye className="w-4 h-4 text-(--brand-gold)" />
                  </button>

                  {tab === 'pending' ? (
                    <button
                      onClick={() => handleVerify(r.userId, r.user.fullName)}
                      disabled={isVerifying}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 text-(--bg-base)"
                      style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))' }}
                    >
                      {isVerifying ? (
                        <span className="w-3.5 h-3.5 border-2 border-(--bg-base)/30 border-t-(--bg-base) rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isVerifying ? 'Verifying...' : 'Verify Payment'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnverify(r.userId, r.user.fullName)}
                      disabled={isUnverifying}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold font-sans border transition-all text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {isUnverifying ? (
                        <span className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                      <span>{isUnverifying ? 'Revoking...' : 'Unverify'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-(--border-subtle)">
          <p className="text-xs font-sans text-(--text-faint)">
            Showing {records.length} of {total} records · Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-out Applicant Detail Drawer */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-(--bg-modal) border-l border-(--border-default) p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between border-b border-(--border-subtle) pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-(--accent-gold-subtle) text-(--brand-gold)">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-(--text-primary)">
                        Applicant Verification Detail
                      </h3>
                      <p className="text-xs font-mono text-(--text-faint)">
                        ID: {selectedRecord.userId}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--hover-overlay)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle) space-y-3">
                    <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-(--brand-gold)">
                      Personal Identity
                    </h4>
                    <div>
                      <p className="text-base font-serif font-bold text-(--text-primary)">
                        {selectedRecord.user.fullName}
                      </p>
                      <p className="text-xs font-sans text-(--text-muted) mt-0.5">
                        Email: {selectedRecord.user.email ?? 'Not provided'}
                      </p>
                      <p className="text-xs font-sans text-(--text-muted)">
                        Phone: {selectedRecord.user.phone ?? 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {/* Academic Department */}
                  <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle) space-y-3">
                    <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-(--brand-gold)">
                      Target Academic Program
                    </h4>
                    {selectedRecord.selectedDepartment ? (
                      <div>
                        <p className="text-sm font-sans font-semibold text-(--text-primary)">
                          {selectedRecord.selectedDepartment.name}
                        </p>
                        <p className="text-xs font-mono text-(--text-faint) mt-0.5">
                          Department Code: {selectedRecord.selectedDepartment.code}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-(--text-faint)">No department selected yet.</p>
                    )}
                  </div>

                  {/* Verification Status */}
                  <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle) space-y-3">
                    <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-(--brand-gold)">
                      Payment & Audit Timeline
                    </h4>

                    <div className="space-y-2 text-xs font-sans">
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Fee Submission Date:</span>
                        <span className="font-mono text-(--text-primary)">
                          {selectedRecord.registrationFeePaidAt
                            ? new Date(selectedRecord.registrationFeePaidAt).toLocaleString()
                            : 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Finance Status:</span>
                        <span className={`font-semibold ${selectedRecord.paymentVerifiedByFinance ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {selectedRecord.paymentVerifiedByFinance ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>

                      {selectedRecord.paymentVerifiedAt && (
                        <div className="flex justify-between">
                          <span className="text-(--text-muted)">Verified Date:</span>
                          <span className="font-mono text-(--text-primary)">
                            {new Date(selectedRecord.paymentVerifiedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Drawer */}
              <div className="pt-4 border-t border-(--border-subtle) mt-6 flex gap-3">
                {!selectedRecord.paymentVerifiedByFinance ? (
                  <button
                    onClick={() => handleVerify(selectedRecord.userId, selectedRecord.user.fullName)}
                    disabled={verifyingId === selectedRecord.userId}
                    className="flex-1 py-3 rounded-xl text-xs font-bold transition-all text-(--bg-base)"
                    style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))' }}
                  >
                    {verifyingId === selectedRecord.userId ? 'Verifying...' : 'Verify Registration Payment'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnverify(selectedRecord.userId, selectedRecord.user.fullName)}
                    disabled={unverifyingId === selectedRecord.userId}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20"
                  >
                    {unverifyingId === selectedRecord.userId ? 'Revoking...' : 'Revoke Verification'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

