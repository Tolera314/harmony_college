'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Calendar, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { studentDashApi, type SemesterInfo } from '@/src/lib/studentApi';
import { SkeletonTable, ErrorState } from '../ui/States';
import { Badge } from '../ui/Badge';

export const StudentSemestersView: React.FC = () => {
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[StudentSemestersView] Fetching semesters...');
      const data = await studentDashApi.getSemesters();
      console.log('[StudentSemestersView] Received semesters:', data);
      setSemesters(data);
    } catch (e) {
      console.error('[StudentSemestersView] Error loading semesters:', e);
      setError(e instanceof Error ? e.message : 'Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <SkeletonTable rows={3} />;
  if (error) return <ErrorState variant="generic" description={error} onRetry={loadSemesters} />;
  if (semesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Calendar className="w-12 h-12 text-(--text-faint) mb-4" />
        <p className="text-(--text-secondary) text-sm">No semester information available</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans text-lg font-semibold text-(--text-primary)">
          Current & Upcoming Terms
        </h3>
        <Badge variant={semesters[0]?.programType === 'TVET' ? 'glass' : 'amber'}>
          {semesters[0]?.programType === 'TVET' ? 'TVET' : 'Short Program'}
        </Badge>
      </div>

      <div className="space-y-3">
        {semesters.map((semester, index) => (
          <motion.div
            key={semester.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05, ease: 'easeOut' }}
            className="border border-(--border-default) rounded-xl overflow-hidden bg-(--hover-overlay) backdrop-blur-xl hover:border-(--brand-gold) transition-colors"
          >
            {/* Header */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-(--brand-gold)" />
                  <div>
                    <h4 className="font-sans text-base font-semibold text-(--text-primary)">
                      {semester.name}
                    </h4>
                    <p className="text-xs text-(--text-faint)">{semester.academicYear.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {semester.isCurrent && <Badge variant="emerald">Current</Badge>}
                  <Badge variant={semester.programType === 'TVET' ? 'glass' : 'amber'}>
                    {semester.programType === 'TVET' ? 'TVET' : 'Short Program'}
                  </Badge>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-(--text-muted)" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Duration</p>
                    <p className="text-xs text-(--text-secondary) font-medium">
                      {formatDate(semester.startDate)} — {formatDate(semester.endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-(--text-muted)" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Courses</p>
                    <p className="text-xs text-(--text-secondary) font-medium">
                      {semester._count.offerings} {semester._count.offerings === 1 ? 'course' : 'courses'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-(--text-muted)" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Registration</p>
                    <p className="text-xs text-(--text-secondary) font-medium">
                      {formatDate(semester.registrationStart)} — {formatDate(semester.registrationEnd)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add/Drop Deadline (only for current semester) */}
            {semester.isCurrent && (
              <div className="px-4 pb-4 pt-0">
                <div className="p-3 bg-(--brand-gold)/10 border border-(--brand-gold)/20 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-(--brand-gold) animate-pulse" />
                  <p className="text-xs text-(--text-secondary)">
                    <span className="font-semibold text-(--brand-gold)">Add/Drop Deadline:</span>{' '}
                    {formatDate(semester.addDropDeadline)}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
