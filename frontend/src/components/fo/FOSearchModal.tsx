'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Users, CreditCard, Receipt, BarChart3, RefreshCw } from 'lucide-react';
import { FONavTab } from '../../types/finance';
import { financeStudents, receipts, transactions } from '../../data/financeData';

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
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else setQuery('');
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const allResults: Result[] = [
    ...financeStudents.map((s) => ({
      id: s.id,
      label: `${s.name} — ${s.studentId}`,
      sub: `${s.programName} · ${s.paymentStatus} · ETB ${s.outstanding.toLocaleString()} outstanding`,
      tab: 'student_accounts' as FONavTab,
      icon: <Users className="w-4 h-4" />,
    })),
    ...receipts.slice(0, 30).map((r) => ({
      id: r.id,
      label: `${r.receiptNumber}`,
      sub: `${r.studentName} · ETB ${r.amount.toLocaleString()} · ${r.date}`,
      tab: 'receipts' as FONavTab,
      icon: <Receipt className="w-4 h-4" />,
    })),
    ...transactions.slice(0, 30).map((t) => ({
      id: t.id,
      label: `${t.referenceNumber}`,
      sub: `${t.studentName} · ${t.paymentMethod} · ETB ${t.amount.toLocaleString()}`,
      tab: 'payments' as FONavTab,
      icon: <CreditCard className="w-4 h-4" />,
    })),
  ];

  const q = query.toLowerCase().trim();
  const results = q.length >= 2
    ? allResults.filter((r) => r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)).slice(0, 10)
    : [];

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
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#141617] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Global search"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students, receipts, transactions..."
                className="flex-1 bg-transparent font-sans text-sm text-white placeholder:text-white/30 outline-none"
                aria-label="Search"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full hover:bg-white/10 text-white/40 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px] font-mono text-white/40">
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-[#E9C349] shrink-0">{r.icon}</span>
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-white truncate">{r.label}</p>
                        <p className="font-mono text-[11px] text-white/40 truncate">{r.sub}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : q.length >= 2 ? (
              <div className="py-12 text-center">
                <p className="font-sans text-sm text-white/40">No results for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="py-8 px-4">
                <p className="font-mono text-[11px] text-white/30 uppercase tracking-wider mb-3">Quick navigate</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickLinks.map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => { onNavigate(item.tab); onClose(); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-left transition-colors"
                    >
                      <span className="text-[#E9C349]">{item.icon}</span>
                      <span className="font-sans text-xs text-white/70">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
