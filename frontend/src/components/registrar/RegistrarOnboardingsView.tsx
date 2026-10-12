'use client';

/**
 * Registrar → Onboardings
 * Students awaiting payment verification - NOT yet moved to Admissions.
 * Shows payment status, allows Registrar to notify students to complete payment.
 * Automatically moves to Admissions when Finance Officer verifies payment.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, CheckCircle2, Clock, ChevronLeft, ChevronRight, Bell, Loader2, CheckCheck } from 'lucide-react';
import { apiFetch, qs } from '@/src/lib/registrarApi';

// ── types ─────────────────────────────────────────────────────────────────────
interface OnboardingRecord {
  userId:                   string;
  registrationFeePaid:      boolean;
  registrationFeePaidAt:    string | null;
  departmentSelected:       boolean;
  paymentVerifiedByFinance:  boolean;
  paymentVerifiedAt:        string | null;
  notifiedByRegistrar:      boolean;
  notifiedAt:               string | null;
  notifiedBy:               string | null;
  selectedDepartmentId:     string | null;
  program:                  string | null;
  programType:              string | null;
  shortProgramDuration:     string | null;
  matricResult:             string | null;
  ministryResult:           string | null;
  transcriptUrl:            string | null;
  profilePictureUrl:        string | null;
  nationalId:               string | null;
  createdAt:                string;
  user: { id: string; fullName: string; email: string | null; phone: string | null; createdAt: string };
  selectedDepartment: { id: string; name: string; code: string } | null;
}

interface OnboardingsResponse {
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  onboardings: OnboardingRecord[];
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono"
      style={{
        backgroundColor: ok ? 'var(--status-success-bg)' : 'var(--hover-overlay)',
        color:           ok ? 'var(--status-success)'    : 'var(--text-faint)',
        border:          `1px solid ${ok ? 'var(--status-success-border)' : 'var(--border-subtle)'}`,
      }}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RegistrarOnboardingsView() {
  const [records, setRecords]       = useState<OnboardingRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [notifying, setNotifying]   = useState<string | null>(null);
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async (p: number, s: string) => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch<OnboardingsResponse>(
        `/api/registrar/onboardings${qs({ page: p, limit: 20, search: s })}`
      );
      setRecords(data.onboardings);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load onboarding records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchData(page, search), 280);
  }, [page, search, fetchData]);

  const handleNotify = async (userId: string, studentName: string) => {
    setNotifying(userId);
    try {
      const res = await fetch(`/api/registrar/onboardings/${userId}/notify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to notify student');
      }

      showToast(`✓ ${studentName} notified successfully`, 'success');
      // Refresh the list to show updated notification status
      fetchData(page, search);
    } catch (e: any) {
      showToast(e.message || 'Failed to send notification', 'error');
    } finally {
      setNotifying(null);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-16">
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
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Student Onboardings
          </h1>
          <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
            {total} student{total !== 1 ? 's' : ''} awaiting payment verification · Will move to Admissions when Finance Officer approves
          </p>
        </div>
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
          style={{
            backgroundColor: 'var(--hover-overlay)',
            borderColor:     'var(--border-default)',
            color:           'var(--text-primary)',
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--hover-overlay)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm font-sans" style={{ color: 'var(--status-danger)' }}>{error}</p>
          <button onClick={() => fetchData(page, search)} className="mt-3 text-xs font-semibold" style={{ color: 'var(--brand-gold)' }}>
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-sans font-semibold" style={{ color: 'var(--text-primary)' }}>
            {search ? 'No students match your search.' : 'All students have been payment-verified!'}
          </p>
          <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-faint)' }}>
            {search ? 'Try a different search term.' : 'Payment-verified students appear in the Admissions tab.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--hover-overlay)' }}>
          <table className="w-full text-left text-xs font-sans min-w-[1200px]">
            <thead style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--hover-overlay)' }}>
              <tr>
                {['Student', 'Program', 'Type', 'Fee Paid', 'Notified', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const isNotifying = notifying === r.userId;
                const canNotify = !r.notifiedByRegistrar || (r.notifiedAt && 
                  (Date.now() - new Date(r.notifiedAt).getTime()) / (1000 * 60 * 60) >= 24
                );

                return (
                  <motion.tr key={r.userId}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{r.user.fullName}</p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        {r.user.email ?? r.user.phone ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.program || '—'}</p>
                      {r.selectedDepartment && (
                        <p className="font-mono text-[10px]" style={{ color: 'var(--brand-gold)' }}>{r.selectedDepartment.code}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.programType ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono"
                          style={{
                            backgroundColor: r.programType === 'TVET' ? 'rgba(96,165,250,0.12)' : 'rgba(233,195,73,0.12)',
                            color: r.programType === 'TVET' ? '#60a5fa' : 'var(--brand-gold)',
                            border: `1px solid ${r.programType === 'TVET' ? 'rgba(96,165,250,0.3)' : 'var(--accent-gold-border)'}`,
                          }}>
                          {r.programType}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill ok={r.registrationFeePaid} label={r.registrationFeePaid ? 'Paid' : 'Pending'} />
                    </td>
                    <td className="px-4 py-3.5">
                      {r.notifiedByRegistrar ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono"
                            style={{
                              backgroundColor: 'var(--accent-gold-subtle)',
                              color: 'var(--brand-gold)',
                              border: '1px solid var(--accent-gold-border)',
                            }}>
                            <CheckCheck className="w-2.5 h-2.5" />
                            Notified
                          </span>
                          {r.notifiedAt && (
                            <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                              {new Date(r.notifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Not yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleNotify(r.userId, r.user.fullName)}
                        disabled={isNotifying || !canNotify}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: canNotify ? 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))' : 'var(--hover-overlay)',
                          color: canNotify ? 'var(--bg-base)' : 'var(--text-faint)',
                          border: canNotify ? 'none' : '1px solid var(--border-subtle)',
                        }}
                        title={!canNotify ? 'Student was recently notified. Wait 24 hours.' : 'Send payment reminder notification'}
                      >
                        {isNotifying ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Bell className="w-3 h-3" />
                            Notify
                          </>
                        )}
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
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
