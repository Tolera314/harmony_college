'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, BookOpen, GraduationCap, ClipboardList,
  ClipboardCheck, FolderOpen, Megaphone, CalendarCheck,
  BarChart3, Bell, FileText,
} from 'lucide-react';
import { InstructorNavTab } from '../../types/instructor';
import {
  instructorClassesApi,
  instructorAssignmentsApi,
  instructorQuizzesApi,
  type ClassOffering,
  type AssignmentSummary,
  type QuizSummary,
  type RosterStudent,
} from '../../lib/instructorApi';

interface InSearchModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onNavigate: (tab: InstructorNavTab) => void;
}

interface Result {
  id:    string;
  label: string;
  sub:   string;
  tab:   InstructorNavTab;
  icon:  React.ReactNode;
}

// ── Quick-navigate links (navigation only, no data needed) ────────────────────
const QUICK_LINKS: { tab: InstructorNavTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'my_classes',    label: 'My Classes',     icon: <BookOpen className="w-4 h-4" />       },
  { tab: 'attendance',    label: 'Attendance',     icon: <CalendarCheck className="w-4 h-4" />   },
  { tab: 'grades',        label: 'Grades',         icon: <ClipboardList className="w-4 h-4" />   },
  { tab: 'assignments',   label: 'Assignments',    icon: <ClipboardCheck className="w-4 h-4" />  },
  { tab: 'students',      label: 'Students',       icon: <GraduationCap className="w-4 h-4" />   },
  { tab: 'materials',     label: 'Materials',      icon: <FolderOpen className="w-4 h-4" />      },
  { tab: 'announcements', label: 'Announcements',  icon: <Megaphone className="w-4 h-4" />       },
  { tab: 'reports',       label: 'Reports',        icon: <BarChart3 className="w-4 h-4" />       },
  { tab: 'notifications', label: 'Notifications',  icon: <Bell className="w-4 h-4" />            },
  { tab: 'audit_log',     label: 'Audit Log',      icon: <FileText className="w-4 h-4" />        },
];

// ─────────────────────────────────────────────────────────────────────────────
export const InSearchModal: React.FC<InSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<Result[]>([]);
  const [searching,  setSearching]  = useState(false);

  // Cached data (loaded once when modal first opens)
  const [classes,     setClasses]     = useState<ClassOffering[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [quizzes,     setQuizzes]     = useState<QuizSummary[]>([]);
  const [students,    setStudents]    = useState<RosterStudent[]>([]);
  const dataLoaded = useRef(false);

  const inputRef  = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Focus input when modal opens ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      if (!dataLoaded.current) loadSearchData();
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // ── Keyboard: Escape to close ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (isOpen) onClose(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // ── Load real data once ───────────────────────────────────────────────────
  const loadSearchData = async () => {
    dataLoaded.current = true;
    try {
      const [cls, asgn, qz] = await Promise.all([
        instructorClassesApi.list(),
        instructorAssignmentsApi.list(),
        instructorQuizzesApi.list(),
      ]);
      setClasses(cls);
      setAssignments(asgn);
      setQuizzes(qz);

      // Load students from assigned offerings
      const targetOfferings = cls.filter(c => c.semester.isCurrent).length > 0
        ? cls.filter(c => c.semester.isCurrent)
        : cls;
      const stuMap = new Map<string, RosterStudent>();
      for (const off of targetOfferings.slice(0, 5)) {
        try {
          const roster = await instructorClassesApi.getRoster(off.id, { limit: 50 });
          roster.students.forEach(s => stuMap.set(s.studentRecordId, s));
        } catch { /* skip */ }
      }
      setStudents(Array.from(stuMap.values()));
    } catch { /* search works with whatever loaded */ }
  };

  // ── Build search index from loaded data ───────────────────────────────────
  const buildResults = useCallback((q: string): Result[] => {
    const needle = q.toLowerCase().trim();
    if (needle.length < 2) return [];

    const all: Result[] = [
      // Classes
      ...classes.map(c => ({
        id:    c.id,
        label: `${c.course.code} — ${c.course.name}`,
        sub:   `Section ${c.section} · ${c.semester.name} · ${c.enrolled} enrolled`,
        tab:   'my_classes' as InstructorNavTab,
        icon:  <BookOpen className="w-4 h-4" />,
      })),
      // Students
      ...students.map(s => ({
        id:    s.studentRecordId,
        label: s.fullName,
        sub:   `${s.studentId} · ${s.program?.code ?? ''}`,
        tab:   'students' as InstructorNavTab,
        icon:  <GraduationCap className="w-4 h-4" />,
      })),
      // Assignments
      ...assignments.map(a => ({
        id:    a.id,
        label: a.title,
        sub:   `Assignment · ${a.courseCode} · ${a.status}`,
        tab:   'assignments' as InstructorNavTab,
        icon:  <ClipboardCheck className="w-4 h-4" />,
      })),
      // Quizzes
      ...quizzes.map(q => ({
        id:    q.id,
        label: q.title,
        sub:   `Quiz · ${q.courseOffering.course.code} · ${q.status}`,
        tab:   'quizzes' as InstructorNavTab,
        icon:  <ClipboardList className="w-4 h-4" />,
      })),
    ];

    return all
      .filter(r => r.label.toLowerCase().includes(needle) || r.sub.toLowerCase().includes(needle))
      .slice(0, 10);
  }, [classes, students, assignments, quizzes]);

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      setResults(buildResults(query));
      setSearching(false);
    }, 150);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, buildResults]);

  const q = query.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ backgroundColor: 'var(--overlay-modal-bg)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl ds-search-modal border rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Search dashboard"
            aria-modal="true"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b ds-search-modal-bar">
              <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search classes, students, assignments, quizzes…"
                className="flex-1 ds-search-modal-input font-sans text-sm outline-none"
                aria-label="Search"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-autocomplete="list"
              />
              {searching && (
                <div className="w-4 h-4 border-2 border-(--border-strong) border-t-(--brand-gold) rounded-full animate-spin shrink-0" />
              )}
              {query && !searching && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full transition-colors shrink-0"
                  style={{ color: 'var(--text-faint)' }}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd
                className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[10px] font-mono shrink-0"
                style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-2" role="listbox" aria-label="Search results">
                {results.map(r => (
                  <li key={`${r.tab}-${r.id}`} role="option">
                    <button
                      onClick={() => { onNavigate(r.tab); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left focus:outline-none"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <span className="shrink-0" style={{ color: 'var(--brand-gold)' }}>{r.icon}</span>
                      <div className="min-w-0">
                        <p className="font-sans text-sm truncate">{r.label}</p>
                        <p className="font-mono text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>{r.sub}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : q.length >= 2 ? (
              <div className="py-12 text-center">
                <p className="font-sans text-sm" style={{ color: 'var(--text-muted)' }}>
                  No results for &quot;{query}&quot;
                </p>
              </div>
            ) : (
              /* Quick navigate — no query entered */
              <div className="py-6 px-4">
                <p className="font-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>
                  Quick navigate
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_LINKS.map(item => (
                    <button
                      key={item.tab}
                      onClick={() => { onNavigate(item.tab); onClose(); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 ds-search-quick-btn border rounded-xl text-left transition-colors focus:outline-none focus-visible:ring-2"
                      style={{ focusRingColor: 'var(--brand-gold)' } as React.CSSProperties}
                    >
                      <span style={{ color: 'var(--brand-gold)' }}>{item.icon}</span>
                      <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
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
