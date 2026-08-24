'use client';

/**
 * Finance Officer → Registration Payments
 *
 * Lists students who have submitted their registration fee (registrationFeePaid = true)
 * but whose payment has not yet been verified by a Finance Officer.
 *
 * The Finance Officer clicks "Verify" to confirm the payment.
 * After verification, the student appears in the Registrar's Admissions list.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, CreditCard, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────
interface PaymentRecord {
  userId:                  string;
  registrationFeePaid:     boolean;
  registrationFeePaidAt:   string | null;
  departmentSelected:      boolean;
  paymentVerifiedByFinance: boolean;
  paymentVerifiedAt:       string | null;
  selectedDepartmentId:    string | null;
  createdAt:               string;
  user: { id: string; fullName: string; email: string | null; phone: string | null };
  selectedDepartment: { id: string; name: string; code: string } | null;
}

interface PaymentsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  payments:   PaymentRecord[];
}

// ── API ───────────────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).then(r => r.ok).catch(() => false);
    if (!refreshed) throw new Error('Session expired. Please sign in again.');
    const retry = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } });
    const retryData = await retry.json().catch(() => ({}));
    if (!retry.ok) throw new Error((retryData as any).error ?? `Request failed: ${retry.status}`);
    return retryData as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FORegistrationPaymentsView() {
  const [tab, setTab]               = useState<'pending' | 'verified'>('pending');
  const [records, setRecords]       = useState<PaymentRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [verifying, setVerifying]   = useState<string | null>(null);
  const [toast, setToast]           = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchData = useCallback(async (p: number, s: string, t: 'pending' | 'verified') => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (s) params.set('search', s);
      const data = await apiFetch<PaymentsResponse>(
        `/api/finance-officer/payments/${t}?${params.toString()}`
      );
      setRecords(data.payments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load payment records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchData(page, search, tab), 280);
  }, [page, search, tab, fetchData]);

  const handleVerify = async (userId: string, studentName: string) => {
    setVerifying(userId);
    try {
      await apiFetch(`/api/finance-officer/payments/${userId}/verify`, { method: 'POST' });
      setToast(`✓ Payment verified for ${studentName}`);
      setTimeout(() => setToast(''), 3500);
      fetchData(page, search, tab);
    } catch (e: any) {
      setToast(`✗ ${e.message ?? 'Verification failed'}`);
      setTimeout(() => setToast(''), 3500);
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-16">
      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-semibold font-sans shadow-2xl"
          style={{
            backgroundColor: toast.startsWith('✓') ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            border: `1px solid ${toast.startsWith('✓') ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
            color: toast.startsWith('✓') ? 'var(--status-success)' : 'var(--status-danger)',
          }}>
          {toast}
        </motion.div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Registration Fee Payments
        </h1>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          Verify student registration fee payments · Verified students appear in Registrar Admissions
        </p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2">
        {(['pending', 'verified'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold font-sans border capitalize transition-all"
            style={{
              backgroundColor: tab === t ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
              borderColor:     tab === t ? 'var(--accent-gold-border)' : 'var(--border-default)',
              color:           tab === t ? 'var(--brand-gold)'         : 'var(--text-secondary)',
            }}>
            {t === 'pending' ? `Awaiting Verification (${tab === 'pending' ? total : '...'})` : 'Verified'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, or phone…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none"
          style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--hover-overlay)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--status-danger)' }}>{error}</p>
          <button onClick={() => fetchData(page, search, tab)} className="mt-3 text-xs font-semibold" style={{ color: 'var(--brand-gold)' }}>Retry</button>
        </div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center">
          <CreditCard className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-sans" style={{ color: 'var(--text-faint)' }}>
            {tab === 'pending' ? 'No pending payments to verify.' : 'No verified payments yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r, idx) => (
            <motion.div key={r.userId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold font-serif text-sm"
                style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)', color: 'var(--brand-gold)' }}>
                {r.user.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-sans truncate" style={{ color: 'var(--text-primary)' }}>{r.user.fullName}</p>
                <p className="text-xs font-mono mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>
                  {r.user.email ?? r.user.phone ?? '—'}
                </p>
              </div>

              {/* Department */}
              <div className="hidden sm:block min-w-[120px]">
                {r.selectedDepartment ? (
                  <div>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.selectedDepartment.name}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--brand-gold)' }}>{r.selectedDepartment.code}</p>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>No dept.</span>
                )}
              </div>

              {/* Date */}
              <div className="hidden md:block text-right min-w-[90px]">
                <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                  {r.registrationFeePaidAt
                    ? new Date(r.registrationFeePaidAt).toLocaleDateString()
                    : new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status / Action */}
              <div className="shrink-0">
                {tab === 'verified' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold font-mono"
                    style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid var(--status-success-border)' }}>
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <button
                    onClick={() => handleVerify(r.userId, r.user.fullName)}
                    disabled={verifying === r.userId}
                    className="px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))', color: 'var(--bg-base)' }}>
                    {verifying === r.userId ? (
                      <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin inline-block" />
                    ) : 'Verify Payment'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans" style={{ color: 'var(--text-faint)' }}>
            {total} records · Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
