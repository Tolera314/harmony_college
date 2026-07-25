'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Users, CalendarCheck, Banknote, TrendingUp, FolderOpen } from 'lucide-react';
import { HRNavTab } from '../../types/hr';
import { employees, departments } from '../../data/hrData';

interface HRSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: HRNavTab) => void;
}

interface Result { id: string; label: string; sub: string; tab: HRNavTab; icon: React.ReactNode }

export const HRSearchModal: React.FC<HRSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else setQuery('');
  }, [isOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (isOpen) onClose(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const allResults: Result[] = [
    ...employees.map(e => ({ id: e.id, label: e.name, sub: `${e.employeeId} · ${e.position}`, tab: 'employees' as HRNavTab, icon: <Users className="w-4 h-4" /> })),
    ...departments.map(d => ({ id: d.id, label: d.name, sub: `Head: ${d.head} · ${d.employeeCount} staff`, tab: 'employees' as HRNavTab, icon: <Users className="w-4 h-4" /> })),
  ];

  const q = query.toLowerCase().trim();
  const results = q.length >= 2 ? allResults.filter(r => r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)).slice(0, 10) : [];

  const quickLinks: { tab: HRNavTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'employees',   label: 'Employees',   icon: <Users className="w-4 h-4" /> },
    { tab: 'leave',       label: 'Leave',       icon: <CalendarCheck className="w-4 h-4" /> },
    { tab: 'payroll',     label: 'Payroll',     icon: <Banknote className="w-4 h-4" /> },
    { tab: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
    { tab: 'documents',   label: 'Documents',   icon: <FolderOpen className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-[#141617] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40 shrink-0" />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search employees, departments, payroll..."
                className="flex-1 bg-transparent font-sans text-sm text-white placeholder:text-white/30 outline-none"
                aria-label="Global HR search"
              />
              {query && <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-white/10 text-white/40 transition-colors"><X className="w-4 h-4" /></button>}
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px] font-mono text-white/40">Esc</kbd>
            </div>
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
                {results.map(r => (
                  <li key={r.id} role="option">
                    <button onClick={() => { onNavigate(r.tab); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
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
              <div className="py-12 text-center"><p className="font-sans text-sm text-white/40">No results for &quot;{query}&quot;</p></div>
            ) : (
              <div className="py-6 px-4">
                <p className="font-mono text-[11px] text-white/30 uppercase tracking-wider mb-3">Quick navigate</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickLinks.map(item => (
                    <button key={item.tab} onClick={() => { onNavigate(item.tab); onClose(); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-left transition-colors">
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
