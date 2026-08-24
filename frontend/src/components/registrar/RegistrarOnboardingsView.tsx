'use client';

/**
 * Registrar → Onboardings
 * Read-only list of all students who have started the onboarding process.
 * Shows payment status, department selection, and Finance Officer verification.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Users, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch, qs } from '@/src/lib/registrarApi';

// ── types ─────────────────────────────────────────────────────────────────────
interface OnboardingRecord {
  userId:                   string;
  registrationFeePaid:      boolean;
  registrationFeePaidAt:    string | null;
  departmentSelected:       boolean;
  paymentVerifiedByFinance:  boolean;
  paymentVerifiedAt:        string | null;
  selectedDepartmentId:     string | null;
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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  return (
    <div className="p-6 space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Student Onboardings
          </h1>
          <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
            {total} student{total !== 1 ? 's' : ''} in the onboarding pipeline · Read-only view
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
          <p className="text-sm font-sans" style={{ color: 'var(--text-faint)' }}>
            {search ? 'No students match your search.' : 'No onboarding records yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--hover-overlay)' }}>
          <table className="w-full text-left text-xs font-sans min-w-[750px]">
            <thead style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--hover-overlay)' }}>
              <tr>
                {['Student', 'Department', 'Fee Paid', 'Dept. Selected', 'Finance Verified', 'Registered'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
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
                    {r.selectedDepartment ? (
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.selectedDepartment.name}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--brand-gold)' }}>{r.selectedDepartment.code}</p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill ok={r.registrationFeePaid} label={r.registrationFeePaid ? 'Paid' : 'Pending'} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill ok={r.departmentSelected} label={r.departmentSelected ? 'Selected' : 'Pending'} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill ok={r.paymentVerifiedByFinance} label={r.paymentVerifiedByFinance ? 'Verified' : 'Pending'} />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </motion.tr>
              ))}
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
