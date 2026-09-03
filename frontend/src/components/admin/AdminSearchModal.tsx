'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Users, GraduationCap, BookOpen, Building2,
  UserCheck, DollarSign, Shield, BarChart3, Loader2,
} from 'lucide-react';
import { AdminNavTab } from '../../types/admin';
import {
  adminUsersApi, adminStudentsApi, adminDepartmentsApi,
  adminProgramsApi, adminCoursesApi, ROLE_DISPLAY,
} from '../../lib/adminApi';

// ─────────────────────────────────────────────────────────────────────────────

interface AdminSearchModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onNavigate: (tab: AdminNavTab) => void;
}

interface Result {
  id:    string;
  label: string;
  sub:   string;
  tab:   AdminNavTab;
  icon:  React.ReactNode;
}

type ResultGroup = { heading: string; items: Result[] };

// ─────────────────────────────────────────────────────────────────────────────

const quickLinks: { tab: AdminNavTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'users',       label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
  { tab: 'students',    label: 'Students',      icon: <GraduationCap className="w-4 h-4" /> },
  { tab: 'faculty',     label: 'Faculty',       icon: <UserCheck className="w-4 h-4" /> },
  { tab: 'departments', label: 'Departments',   icon: <Building2 className="w-4 h-4" /> },
  { tab: 'programs',    label: 'Programs',      icon: <BookOpen className="w-4 h-4" /> },
  { tab: 'security',    label: 'Security',      icon: <Shield className="w-4 h-4" /> },
  { tab: 'finance',     label: 'Finance',       icon: <DollarSign className="w-4 h-4" /> },
  { tab: 'reports',     label: 'Reports',       icon: <BarChart3 className="w-4 h-4" /> },
];

// ─────────────────────────────────────────────────────────────────────────────

export const AdminSearchModal: React.FC<AdminSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery]     = useState('');
  const [groups, setGroups]   = useState<ResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else { setQuery(''); setGroups([]); setLoading(false); }
  }, [isOpen]);

  // Keyboard: Esc to close, Ctrl+K to toggle
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (isOpen) onClose(); }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Debounced real search
  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [usersRes, studentsRes, deptsRes, progsRes, coursesRes] = await Promise.allSettled([
        adminUsersApi.list({ search: q, limit: 5 }),
        adminStudentsApi.list({ search: q, limit: 5 }),
        adminDepartmentsApi.list(),
        adminProgramsApi.list(),
        adminCoursesApi.list({ search: q, limit: 5 }),
      ]);

      const newGroups: ResultGroup[] = [];

      if (usersRes.status === 'fulfilled') {
        const items: Result[] = usersRes.value.users
          .filter(u => u.fullName.toLowerCase().includes(q.toLowerCase()) || (u.email ?? '').toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5)
          .map(u => ({
            id:    u.id,
            label: u.fullName,
            sub:   `${ROLE_DISPLAY[u.role] ?? u.role} · ${u.email ?? u.phone ?? '—'}`,
            tab:   'users' as AdminNavTab,
            icon:  <Users className="w-3.5 h-3.5" />,
          }));
        if (items.length > 0) newGroups.push({ heading: 'Users', items });
      }

      if (studentsRes.status === 'fulfilled') {
        const items: Result[] = studentsRes.value.students.slice(0, 5).map(s => ({
          id:    s.id,
          label: s.user.fullName,
          sub:   `${s.studentId} · ${s.program?.code ?? '—'}`,
          tab:   'students' as AdminNavTab,
          icon:  <GraduationCap className="w-3.5 h-3.5" />,
        }));
        if (items.length > 0) newGroups.push({ heading: 'Students', items });
      }

      if (deptsRes.status === 'fulfilled') {
        const qLow = q.toLowerCase();
        const items: Result[] = deptsRes.value
          .filter(d => d.name.toLowerCase().includes(qLow) || d.code.toLowerCase().includes(qLow))
          .slice(0, 4)
          .map(d => ({
            id:    d.id,
            label: d.name,
            sub:   `${d.code} · ${d._count.programs} programs · ${d._count.instructors} faculty`,
            tab:   'departments' as AdminNavTab,
            icon:  <Building2 className="w-3.5 h-3.5" />,
          }));
        if (items.length > 0) newGroups.push({ heading: 'Departments', items });
      }

      if (progsRes.status === 'fulfilled') {
        const qLow = q.toLowerCase();
        const items: Result[] = progsRes.value
          .filter(p => p.name.toLowerCase().includes(qLow) || p.code.toLowerCase().includes(qLow))
          .slice(0, 4)
          .map(p => ({
            id:    p.id,
            label: p.name,
            sub:   `${p.code} · ${p.department.name}`,
            tab:   'programs' as AdminNavTab,
            icon:  <BookOpen className="w-3.5 h-3.5" />,
          }));
        if (items.length > 0) newGroups.push({ heading: 'Programs', items });
      }

      if (coursesRes.status === 'fulfilled') {
        const items: Result[] = coursesRes.value.courses.slice(0, 4).map(c => ({
          id:    c.id,
          label: c.name,
          sub:   `${c.code} · ${c.department.name}`,
          tab:   'programs' as AdminNavTab,
          icon:  <BookOpen className="w-3.5 h-3.5" />,
        }));
        if (items.length > 0) newGroups.push({ heading: 'Courses', items });
      }

      setGroups(newGroups);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length >= 2) {
      setLoading(true);
      timerRef.current = setTimeout(() => runSearch(query), 350);
    } else {
      setGroups([]);
      setLoading(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [query, runSearch]);

  const totalResults = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-md z-50 flex items-start justify-center pt-[12vh] px-4"
          style={{ backgroundColor: 'var(--overlay-modal-bg)' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Global admin search"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl ds-search-modal border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search input bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b ds-search-modal-bar">
              {loading
                ? <Loader2 className="w-5 h-5 shrink-0 animate-spin" style={{ color: 'var(--brand-gold)' }} />
                : <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--text-faint)' }} />
              }
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search users, students, departments, programs, courses..."
                className="flex-1 ds-search-modal-input font-sans text-sm outline-none"
                aria-label="Search"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd
                className="hidden sm:flex items-center px-1.5 py-0.5 border rounded text-[10px] font-mono"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            {query.length >= 2 ? (
              groups.length > 0 ? (
                <div className="max-h-96 overflow-y-auto py-2">
                  {groups.map(group => (
                    <div key={group.heading}>
                      <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                        {group.heading}
                      </p>
                      {group.items.map(r => (
                        <button
                          key={r.id}
                          onClick={() => { onNavigate(r.tab); onClose(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left hover:bg-(--hover-overlay)"
                        >
                          <span className="shrink-0" style={{ color: 'var(--brand-gold)' }}>{r.icon}</span>
                          <div className="min-w-0">
                            <p className="font-sans text-sm truncate" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                            <p className="font-mono text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>{r.sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : !loading ? (
                <div className="py-12 text-center">
                  <p className="font-sans text-sm" style={{ color: 'var(--text-muted)' }}>
                    No results for &quot;{query}&quot;
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="font-sans text-sm" style={{ color: 'var(--text-muted)' }}>Searching...</p>
                </div>
              )
            ) : (
              /* Quick links */
              <div className="py-5 px-4">
                <p className="font-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>
                  Quick navigate
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickLinks.map(item => (
                    <button
                      key={item.tab}
                      onClick={() => { onNavigate(item.tab); onClose(); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 ds-search-quick-btn border rounded-xl text-left transition-colors"
                    >
                      <span style={{ color: 'var(--brand-gold)' }}>{item.icon}</span>
                      <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-center mt-4" style={{ color: 'var(--text-faint)' }}>
                  Type at least 2 characters to search
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
