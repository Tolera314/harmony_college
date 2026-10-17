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
      const data = await studentDashApi.getSemesters();
      setSemesters(data);
    } catch (e) {
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
            className="border border-(--border-default) rounded-xl p-4 bg-(--hover-overlay) backdrop-blur-xl hover:border-(--brand-gold) transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-(--brand-gold)" />
                <div>
                  <h4 className="font-sans text-sm font-semibold text-(--text-primary)">
                    {semester.name}
                  </h4>
                  <p className="text-xs text-(--text-faint)">{semester.academicYear.name}</p>
                </div>
              </div>
              {semester.isCurrent && (
                <Badge variant="emerald">Current</Badge>
              )}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-(--text-muted) mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">
                    Semester Period
                  </p>
                  <p className="text-xs text-(--text-secondary) font-medium">
                    {formatDate(semester.startDate)} — {formatDate(semester.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-(--text-muted) mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">
                    Registration
                  </p>
                  <p className="text-xs text-(--text-secondary) font-medium">
                    {formatDate(semester.registrationStart)} — {formatDate(semester.registrationEnd)}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-center gap-4 pt-3 border-t border-(--border-subtle)">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-(--text-muted)" />
                <span className="text-xs text-(--text-secondary)">
                  {semester._count.offerings} {semester._count.offerings === 1 ? 'Course' : 'Courses'} Available
                </span>
              </div>
              {semester.durationWeeks && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-(--text-muted)" />
                  <span className="text-xs text-(--text-secondary)">
                    {semester.durationWeeks} weeks
                  </span>
                </div>
              )}
            </div>

            {/* Add/Drop Deadline */}
            {semester.isCurrent && (
              <div className="mt-3 pt-3 border-t border-(--border-subtle)">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-(--status-warning) animate-pulse" />
                  <p className="text-xs text-(--text-secondary)">
                    <span className="font-semibold">Add/Drop Deadline:</span> {formatDate(semester.addDropDeadline)}
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
