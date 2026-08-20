'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BookOpen, Users, Calendar, MapPin, Clock, RefreshCw } from 'lucide-react';
import { InstructorNavTab } from '../../../types/instructor';
import { DHPageHeader }     from '../../dh/DHPageHeader';
import { Card }             from '../../ui/Card';
import { Badge }            from '../../ui/Badge';
import { Button }           from '../../ui/Button';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';
import { instructorClassesApi, type ClassOffering } from '../../../lib/instructorApi';

interface InMyClassesViewProps {
  setActiveTab: (tab: InstructorNavTab) => void;
}

const statusVariant = (s: string): 'emerald' | 'amber' | 'rose' | 'glass' => {
  if (s === 'SCHEDULED' || s === 'ACTIVE') return 'emerald';
  if (s === 'INSTRUCTOR_ASSIGNED')         return 'amber';
  if (s === 'CLOSED' || s === 'CANCELLED') return 'rose';
  return 'glass';
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    DRAFT:               'Draft',
    INSTRUCTOR_ASSIGNED: 'Assigned',
    SCHEDULED:           'Scheduled',
    ACTIVE:              'Active',
    CLOSED:              'Closed',
    CANCELLED:           'Cancelled',
  };
  return map[s] ?? s;
};

export const InMyClassesView: React.FC<InMyClassesViewProps> = ({ setActiveTab }) => {
  const [offerings, setOfferings] = useState<ClassOffering[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'current' | 'all'>('current');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await instructorClassesApi.list();
      setOfferings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = filter === 'current'
    ? offerings.filter(o => o.semester.isCurrent)
    : offerings;

  const currentCount = offerings.filter(o => o.semester.isCurrent).length;

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="My Classes"
        subtitle={`${currentCount} current · ${offerings.length} total`}
        icon={<BookOpen className="w-5 h-5" />}
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
            Refresh
          </Button>
        }
      />

      {/* Filter toggle */}
      <div className="flex gap-2">
        {(['current', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize"
            style={
              filter === f
                ? { backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)' }
                : { backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            {f === 'current' ? `Current Semester (${currentCount})` : `All Semesters (${offerings.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          variant="courses"
          title="No classes assigned"
          description={filter === 'current'
            ? 'You have no courses assigned for the current semester.'
            : 'No course offerings found.'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayed.map(o => {
            const capPct   = o.capacity > 0 ? Math.round((o.enrolled / o.capacity) * 100) : 0;
            const schedStr = o.schedule
              .map(s => `${s.day} ${s.startTime}–${s.endTime}`)
              .join(', ');

            return (
              <Card key={o.id} hoverable className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-(--brand-gold)">{o.course.code}</span>
                      <Badge variant="glass" className="text-[10px]">Section {o.section}</Badge>
                      <Badge variant={statusVariant(o.status)} className="text-[10px]">
                        {statusLabel(o.status)}
                      </Badge>
                      {o.semester.isCurrent && (
                        <Badge variant="emerald" className="text-[10px]">Current</Badge>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-(--text-primary) truncate">{o.course.name}</h3>
                    {o.course.description && (
                      <p className="font-sans text-xs text-(--text-muted) mt-1 line-clamp-2">{o.course.description}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Credits</p>
                    <p className="font-mono text-lg font-bold text-(--text-primary) mt-0.5">{o.course.creditHours}</p>
                  </div>
                  <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Enrolled</p>
                    <p className="font-mono text-lg font-bold text-(--text-primary) mt-0.5">
                      {o.enrolled}
                      <span className="text-xs text-(--text-faint) ml-1">/ {o.capacity}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Assignments</p>
                    <p className="font-mono text-lg font-bold text-(--text-primary) mt-0.5">{o.stats.assignments}</p>
                  </div>
                  <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Quizzes</p>
                    <p className="font-mono text-lg font-bold text-(--brand-gold) mt-0.5">{o.stats.quizzes}</p>
                  </div>
                </div>

                {/* Capacity bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint) mb-1">
                    <span>Capacity</span>
                    <span className={capPct >= 90 ? 'text-(--status-danger)' : capPct >= 70 ? 'text-(--brand-gold)' : 'text-(--status-success)'}>
                      {capPct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E9C349]"
                      style={{ width: `${Math.min(capPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Schedule & room */}
                <div className="space-y-1.5">
                  {schedStr && (
                    <div className="flex items-start gap-2 text-xs text-(--text-secondary)">
                      <Calendar className="w-3.5 h-3.5 text-(--text-faint) mt-0.5 shrink-0" />
                      <span className="font-sans">{schedStr}</span>
                    </div>
                  )}
                  {o.room && (
                    <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
                      <MapPin className="w-3.5 h-3.5 text-(--text-faint) shrink-0" />
                      <span className="font-sans">{o.room.name} · {o.room.building}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
                    <Clock className="w-3.5 h-3.5 text-(--text-faint) shrink-0" />
                    <span className="font-sans font-mono">{o.semester.name} · {o.semester.academicYear}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
                    <Users className="w-3.5 h-3.5 text-(--text-faint) shrink-0" />
                    <span className="font-sans">{o.enrolled} enrolled students</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  <Button variant="primary"    size="sm" onClick={() => setActiveTab('attendance')}>Attendance</Button>
                  <Button variant="secondary"  size="sm" onClick={() => setActiveTab('grades')}>Grades</Button>
                  <Button variant="secondary"  size="sm" onClick={() => setActiveTab('students')}>Roster</Button>
                  <Button variant="ghost"      size="sm" onClick={() => setActiveTab('assignments')}>Assignments</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
