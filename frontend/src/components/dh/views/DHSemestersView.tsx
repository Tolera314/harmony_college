'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Calendar, Clock, BookOpen, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { hodSemestersApi, type DetailedSemester } from '../../../lib/hodApi';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SkeletonTable, ErrorState, ToastContainer, useToast } from '../../ui/States';

export const DHSemestersView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [semesters, setSemesters] = useState<DetailedSemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSemesterId, setExpandedSemesterId] = useState<string | null>(null);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hodSemestersApi.listDetailed({ programType });
      setSemesters(data);
      // Auto-expand current semester
      const current = data.find(s => s.isCurrent);
      if (current && !expandedSemesterId) {
        setExpandedSemesterId(current.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load semesters');
    } finally {
      setLoading(false);
    }
  }, [programType, expandedSemesterId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (semesterId: string) => {
    setExpandedSemesterId(prev => prev === semesterId ? null : semesterId);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'emerald' | 'gold' | 'amber' | 'glass'; label: string }> = {
      ACTIVE: { variant: 'emerald', label: 'Active' },
      SCHEDULED: { variant: 'emerald', label: 'Scheduled' },
      INSTRUCTOR_ASSIGNED: { variant: 'gold', label: 'Assigned' },
      DRAFT: { variant: 'amber', label: 'Draft' },
    };
    const m = map[status] ?? { variant: 'glass', label: status };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  if (loading && semesters.length === 0) return <SkeletonTable rows={3} />;
  if (error) return <ErrorState variant="generic" description={error} onRetry={load} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <div className="flex items-center justify-between">
        <DHPageHeader
          title="Terms & Semesters"
          subtitle={`${programType || 'TVET'} • ${semesters.length} semester${semesters.length === 1 ? '' : 's'}`}
          icon={<Calendar className="w-5 h-5" />}
        />
        <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
          Refresh
        </Button>
      </div>

      {semesters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
          <Calendar className="w-12 h-12 text-(--text-faint) mb-4" />
          <p className="text-(--text-secondary) text-sm">No semesters found for {programType || 'TVET'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {semesters.map((semester, index) => (
            <motion.div
              key={semester.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              className="border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl overflow-hidden"
            >
              {/* Semester Header */}
              <div
                className="p-4 cursor-pointer hover:bg-(--hover-overlay) transition-colors"
                onClick={() => toggleExpand(semester.id)}
              >
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
                    {expandedSemesterId === semester.id ? (
                      <ChevronUp className="w-5 h-5 text-(--text-muted)" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-(--text-muted)" />
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
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
                        {semester.courseCount} {semester.courseCount === 1 ? 'course' : 'courses'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-(--text-muted)" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted)">Enrollment</p>
                      <p className="text-xs text-(--text-secondary) font-medium">
                        {semester.offerings.reduce((sum, o) => sum + o._count.enrollments, 0)} students
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Course Offerings */}
              <AnimatePresence>
                {expandedSemesterId === semester.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-(--border-default)"
                  >
                    <div className="p-4 space-y-3">
                      <h5 className="font-sans text-sm font-semibold text-(--text-primary) mb-3">
                        Course Offerings in this Semester
                      </h5>

                      {semester.offerings.length === 0 ? (
                        <div className="text-center py-6">
                          <BookOpen className="w-8 h-8 text-(--text-faint) mx-auto mb-2" />
                          <p className="text-xs text-(--text-secondary)">No courses assigned to this semester yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-sans">
                            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                              <tr>
                                {['Code', 'Course Name', 'Section', 'Credits', 'ECTS', 'Instructor', 'Enrolled', 'Status'].map(h => (
                                  <th key={h} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-(--text-muted) font-semibold">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border-subtle)">
                              {semester.offerings.map((offering, idx) => (
                                <motion.tr
                                  key={offering.id}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                                  className="hover:bg-(--hover-overlay) transition-colors"
                                >
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs font-bold text-(--brand-gold)">
                                      {offering.course.code}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs text-(--text-secondary)">{offering.course.name}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs text-(--text-secondary)">{offering.section}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs text-(--text-secondary)">
                                      {offering.course.creditHours}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs text-(--text-secondary)">
                                      {offering.course.ects ?? '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs text-(--text-secondary)">
                                      {offering.instructor?.user.fullName ?? (
                                        <span className="italic text-(--text-faint)">Not assigned</span>
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs text-(--text-secondary)">
                                      {offering._count.enrollments}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">{statusBadge(offering.status)}</td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
