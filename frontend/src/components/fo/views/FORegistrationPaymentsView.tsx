'use client';

/**
 * Finance Officer → Reg. Fee Verification
 *
 * FLOW:
 *  1. Student registers and uploads payment receipt → appears in "Awaiting Verification" list
 *  2. Finance Officer clicks "View" → modal opens showing student info + payment screenshot
 *  3. Finance Officer reviews screenshot, then clicks "Verify Payment" inside the modal
 *  4. Status updates → student moves to Registrar Admissions queue
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, CreditCard, CheckCircle2, Eye, X,
  ChevronLeft, ChevronRight, User, Building2,
  Calendar, ExternalLink, AlertTriangle,
} from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────
interface PaymentRecord {
  userId:                   string;
  registrationFeePaid:      boolean;
  registrationFeePaidAt:    string | null;
  departmentSelected:       boolean;
  paymentVerifiedByFinance:  boolean;
  paymentVerifiedAt:        string | null;
  selectedDepartmentId:     string | null;
  createdAt:                string;
  user: {
    id:       string;
    fullName: string;
    email:    string | null;
    phone:    string | null;
    createdAt: string;
    application: {
      registrationScreenshotUrl: string | null;
      screenshotUploadedAt:      string | null;
      onboardingStatus:          string | null;
      program:                   string | null;
    } | null;
  };
  selectedDepartment: { id: string; name: string; code: string } | null;
}

interface PaymentsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  payments:   PaymentRecord[];
}

// ── API with 401 auto-refresh ─────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () => fetch(path, {
    ...init, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  let res = await doFetch();
  if (res.status === 401) {
    const ok = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).then(r => r.ok).catch(() => false);
    if (!ok) throw new Error('Session expired. Please sign in again.');
    res = await doFetch();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({
  record,
  onClose,
  onVerified,
}: {
  record:     PaymentRecord;
  onClose:    () => void;
  onVerified: () => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState('');
  const [enlarged,  setEnlarged]  = useState(false);

  const screenshotUrl = record.user.application?.registrationScreenshotUrl ?? null;
  const uploadedAt    = record.user.application?.screenshotUploadedAt ?? null;

  const handleVerify = async () => {
    setVerifying(true); setError('');
    try {
      await apiFetch(`/api/finance-officer/payments/${record.userId}/verify`, { method: 'POST' });
      onVerified();
    } catch (e: any) {
      setError(e.message ?? 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.94, y: 20  }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
          style={{
            backgroundColor: 'rgba(15,15,16,0.97)',
            border: '1px solid var(--accent-gold-border)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Gold accent bar */}
          <div className="h-1 w-full rounded-t-3xl"
            style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }} />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Payment Review
              </h2>
              <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Review the payment receipt before verifying
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-faint)' }} aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Student info */}
            <div className="p-4 rounded-2xl space-y-3"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                style={{ color: 'var(--text-faint)' }}>Student Information</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: User,       label: 'Name',       value: record.user.fullName },
                  { icon: CreditCard, label: 'Contact',    value: record.user.email ?? record.user.phone ?? '—' },
                  { icon: Building2,  label: 'Department', value: record.selectedDepartment?.name ?? 'Not selected' },
                  { icon: Calendar,   label: 'Submitted',  value: record.registrationFeePaidAt
                      ? new Date(record.registrationFeePaidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</p>
                      <p className="text-xs font-semibold font-sans mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment screenshot */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--text-faint)' }}>Payment Receipt / Screenshot</p>
                {uploadedAt && (
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    Uploaded {new Date(uploadedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {screenshotUrl ? (
                <div className="space-y-2">
                  {/* Screenshot preview */}
                  <div
                    className="relative rounded-2xl overflow-hidden cursor-zoom-in border transition-all"
                    style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--hover-overlay)', minHeight: 200 }}
                    onClick={() => setEnlarged(true)}
                    title="Click to enlarge"
                  >
                    {screenshotUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={screenshotUrl}
                        alt="Payment receipt"
                        className="w-full object-contain max-h-72"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      /* PDF or other file type */
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
                          <CreditCard className="w-6 h-6" style={{ color: 'var(--brand-gold)' }} />
                        </div>
                        <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>Payment Receipt File</p>
                        <p className="text-xs font-sans" style={{ color: 'var(--text-faint)' }}>PDF document</p>
                      </div>
                    )}
                    {/* Zoom hint overlay */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>
                      <Eye className="w-3 h-3" /> Click to enlarge
                    </div>
                  </div>

                  {/* Open in new tab link */}
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{ color: 'var(--brand-gold)' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open full image / PDF in new tab
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)' }}>
                  <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: 'var(--status-warning)' }} />
                  <p className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>
                    No payment screenshot uploaded yet. The student has marked their payment as paid but has not uploaded a receipt.
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs font-sans px-1" style={{ color: 'var(--status-danger)' }}>{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold font-sans border transition-all hover:bg-white/5"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex-1 py-3 rounded-2xl text-sm font-bold font-sans flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))', color: 'var(--bg-base)' }}
              >
                {verifying ? (
                  <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {verifying ? 'Verifying…' : 'Verify Payment'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enlarged image overlay */}
      <AnimatePresence>
        {enlarged && screenshotUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
            onClick={() => setEnlarged(false)}
          >
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={screenshotUrl}
              alt="Payment receipt enlarged"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button onClick={() => setEnlarged(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/60 text-white"
              aria-label="Close enlarged view">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────
export function FORegistrationPaymentsView() {
  const [tab,        setTab]        = useState<'pending' | 'verified'>('pending');
  const [records,    setRecords]    = useState<PaymentRecord[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [reviewing,  setReviewing]  = useState<PaymentRecord | null>(null);
  const [toast,      setToast]      = useState('');
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleVerified = () => {
    setReviewing(null);
    showToast(`✓ Payment verified for ${reviewing?.user.fullName ?? 'student'}`);
    fetchData(page, search, tab);
  };

  return (
    <div className="p-6 space-y-6 pb-16">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-semibold font-sans shadow-2xl"
            style={{
              backgroundColor: toast.startsWith('✓') ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              border: `1px solid ${toast.startsWith('✓') ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
              color: toast.startsWith('✓') ? 'var(--status-success)' : 'var(--status-danger)',
            }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review modal */}
      <AnimatePresence>
        {reviewing && (
          <ReviewModal
            record={reviewing}
            onClose={() => setReviewing(null)}
            onVerified={handleVerified}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Reg. Fee Verification
        </h1>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          Click <strong>View</strong> to review a student's payment screenshot before verifying.
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
            {t === 'pending' ? `Awaiting Review (${tab === 'pending' ? total : '…'})` : `Verified (${tab === 'verified' ? total : '…'})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
        <input
          type="text" value={search}
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
            {tab === 'pending' ? 'No payments awaiting review.' : 'No verified payments yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r, idx) => {
            const hasScreenshot = !!r.user.application?.registrationScreenshotUrl;
            return (
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
                <div className="hidden sm:block min-w-[130px]">
                  {r.selectedDepartment ? (
                    <div>
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.selectedDepartment.name}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--brand-gold)' }}>{r.selectedDepartment.code}</p>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>No dept.</span>
                  )}
                </div>

                {/* Screenshot indicator */}
                <div className="hidden md:flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${hasScreenshot ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    {hasScreenshot ? 'Receipt uploaded' : 'No receipt'}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden md:block text-right min-w-[90px]">
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    {r.registrationFeePaidAt
                      ? new Date(r.registrationFeePaidAt).toLocaleDateString()
                      : new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {tab === 'verified' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold font-mono"
                        style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid var(--status-success-border)' }}>
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                      <button onClick={() => setReviewing(r)}
                        className="p-2 rounded-xl border transition-all hover:bg-white/10"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}
                        title="View details">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* VIEW button — the only action visible before opening the modal */
                    <button
                      onClick={() => setReviewing(r)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sans border transition-all hover:bg-white/5 active:scale-[0.97]"
                      style={{ borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)', backgroundColor: 'var(--accent-gold-subtle)' }}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
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
