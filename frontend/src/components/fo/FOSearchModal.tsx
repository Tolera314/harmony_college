'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Search, X, Users, CreditCard, Receipt, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { FONavTab } from '../../types/finance';
import { getStudentAccounts, getReceipts, getTransactions } from '../../lib/foApi';

interface Result {
  id: string;
  label: string;
  sub: string;
  tab: FONavTab;
  icon: React.ReactNode;
}

interface FOSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: FONavTab) => void;
}

export const FOSearchModal: React.FC<FOSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else { setQuery(''); setResults([]); }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Debounced live search against real API
  const doSearch = useCallback((q: string) => {
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [studentsData, receiptsData, txnsData] = await Promise.allSettled([
          getStudentAccounts({ search: q, limit: 5 }),
          getReceipts({ search: q, limit: 5 }),
          getTransactions({ search: q, limit: 5 }),
        ]);

        const combined: Result[] = [];

        if (studentsData.status === 'fulfilled') {
          const accounts: any[] = (studentsData.value as any)?.accounts ?? [];
          accounts.forEach((s: any) => combined.push({
            id:    `stu-${s.id}`,
            label: `${s.name} — ${s.studentId ?? ''}`,
            sub:   `${s.programName ?? ''} · ${s.paymentStatus ?? ''} · ETB ${(s.outstanding ?? 0).toLocaleString()} outstanding`,
            tab:   'student_accounts',
            icon:  <Users className="w-4 h-4" />,
          }));
        }

        if (receiptsData.status === 'fulfilled') {
          const rcpts: any[] = (receiptsData.value as any)?.receipts ?? [];
          rcpts.forEach((r: any) => combined.push({
            id:    `rec-${r.id}`,
            label: `${r.receiptNumber}`,
            sub:   `${r.studentName} · ETB ${(r.amount ?? 0).toLocaleString()} · ${r.date ?? ''}`,
            tab:   'receipts',
            icon:  <Receipt className="w-4 h-4" />,
          }));
        }

        if (txnsData.status === 'fulfilled') {
          const txns: any[] = (txnsData.value as any)?.transactions ?? [];
          txns.forEach((t: any) => combined.push({
            id:    `txn-${t.id}`,
            label: `${t.referenceId ?? t.receiptId ?? t.id.slice(0, 8)}`,
            sub:   `${t.financialAccount?.studentRecord?.user?.fullName ?? 'Unknown'} · ETB ${Math.abs(t.amount ?? 0).toLocaleString()}`,
            tab:   'payments',
            icon:  <CreditCard className="w-4 h-4" />,
          }));
        }

        setResults(combined.slice(0, 10));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => { doSearch(query.toLowerCase().trim()); }, [query, doSearch]);

  const handleSelect = (r: Result) => { onNavigate(r.tab); onClose(); };

  const quickLinks: { tab: FONavTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'student_accounts', label: 'Student Accounts', icon: <Users className="w-4 h-4" /> },
    { tab: 'payments',         label: 'Payments',         icon: <CreditCard className="w-4 h-4" /> },
    { tab: 'receipts',         label: 'Receipts',         icon: <Receipt className="w-4 h-4" /> },
    { tab: 'reports',          label: 'Reports',          icon: <BarChart3 className="w-4 h-4" /> },
    { tab: 'reconciliation',   label: 'Reconciliation',   icon: <RefreshCw className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-md" style={{ backgroundColor: "var(--overlay-modal-bg)" }} data-x=" z-50 flex items-start justify-center pt-[15vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-(--bg-card-solid) border border-(--border-default) rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Global search"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--border-default)">
              {loading
                ? <Loader2 className="w-5 h-5 text-(--brand-gold) shrink-0 animate-spin" />
                : <Search className="w-5 h-5 text-(--text-faint) shrink-0" />
              }
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students, receipts, transactions..."
                className="flex-1 bg-transparent font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none"
                aria-label="Search"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full hover:bg-(--hover-overlay) text-(--text-faint) transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-(--hover-overlay) border border-(--border-default) rounded text-[10px] font-mono text-(--text-faint)">
                Esc
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
                {results.map((r) => (
                  <li key={r.id} role="option">
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-(--hover-overlay) transition-colors text-left"
                    >
                      <span className="text-(--brand-gold) shrink-0">{r.icon}</span>
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-(--text-primary) truncate">{r.label}</p>
                        <p className="font-mono text-[11px] text-(--text-faint) truncate">{r.sub}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 && !loading ? (
              <div className="py-12 text-center">
                <p className="font-sans text-sm text-(--text-faint)">No results for &quot;{query}&quot;</p>
              </div>
            ) : query.trim().length === 0 ? (
              <div className="py-8 px-4">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider mb-3">Quick navigate</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickLinks.map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => { onNavigate(item.tab); onClose(); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 bg-(--hover-overlay) hover:bg-(--hover-overlay) border border-(--border-subtle) rounded-xl text-left transition-colors"
                    >
                      <span className="text-(--brand-gold)">{item.icon}</span>
                      <span className="font-sans text-xs text-(--text-secondary)">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-(--brand-gold) mx-auto" />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
