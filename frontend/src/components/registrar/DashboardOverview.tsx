'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  ClipboardList, BookOpen, GraduationCap, FileText,
  AlertTriangle, Users, RefreshCw, Zap,
  PlusCircle, FileCheck, Send, CheckCircle2,
  Calendar, Clock, Server, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonPage, ErrorState } from '../ui/States';
import { dashboardApi, type DashboardStats } from '@/src/lib/registrarApi';

interface OverviewProps {
  setActiveTab: (tab: any) => void;
  onOpenCreateCourse: () => void;
  programType?: 'TVET' | 'SHORT_PROGRAM';
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export const DashboardOverview: React.FC<OverviewProps> = ({ setActiveTab, onOpenCreateCourse, programType = 'TVET' }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counters, setCounters] = useState<Record<string, number>>({});

  const loadStats = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await dashboardApi.getStats(programType);
      setStats(data);
      // Animate counters
      const targets: Record<string, number> = {
        admissions: data.pendingAdmissions, programs: data.activePrograms,
        courses: data.activeCourses, students: data.activeStudents,
        offerings: data.activeOfferings, enrollments: data.totalEnrollments,
        conflicts: data.scheduleConflicts, transcripts: data.pendingTranscripts,
      };
      const steps = 30; const stepTime = 1000 / steps; let step = 0;
      const timer = setInterval(() => {
        step++;
        const c: Record<string, number> = {};
        for (const [k, v] of Object.entries(targets)) c[k] = Math.round((v / steps) * step);
        setCounters(c);
        if (step >= steps) { clearInterval(timer); setCounters(targets); }
      }, stepTime);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return <SkeletonPage />;
  if (error || !stats) return (
    <ErrorState variant="network" onRetry={loadStats}
      description={error ?? 'Could not load dashboard statistics'} />
  );

  const kpiCards = [
    { id: 'admissions', title: 'Pending Admissions',  value: counters.admissions ?? 0,  trendUp: true,  icon: ClipboardList, color: 'var(--status-info)',    tab: 'admissions' },
    { id: 'programs',   title: 'Active Programs',     value: counters.programs ?? 0,    trendUp: true,  icon: BookOpen,      color: 'var(--brand-gold)',    tab: null },
    { id: 'courses',    title: 'Active Courses',      value: counters.courses ?? 0,     trendUp: true,  icon: Zap,           color: 'var(--status-success)', tab: 'catalog' },
    { id: 'students',   title: 'Active Students',     value: counters.students ?? 0,    trendUp: true,  icon: Users,         color: 'var(--brand-gold)',    tab: 'students' },
    { id: 'offerings',  title: 'Active Offerings',    value: counters.offerings ?? 0,   trendUp: true,  icon: BookOpen,      color: 'var(--status-info)',    tab: 'offerings' },
    { id: 'enrollments',title: 'Total Enrollments',   value: counters.enrollments ?? 0, trendUp: true,  icon: FileText,      color: 'var(--brand-gold)',    tab: 'enrollments' },
    { id: 'conflicts',  title: 'Schedule Conflicts',  value: counters.conflicts ?? 0,   trendUp: false, icon: AlertTriangle, color: 'var(--status-danger)',  tab: 'timetable' },
    { id: 'transcripts',title: 'Pending Transcripts', value: counters.transcripts ?? 0, trendUp: true,  icon: GraduationCap, color: 'var(--status-warning)', tab: 'transcripts' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-(--border-default) rounded-2xl p-6 backdrop-blur-md relative overflow-hidden bg-(--bg-card)">
        <div className="absolute top-0 right-0 w-64 h-64 bg-(--accent-gold-subtle) rounded-full blur-[80px] pointer-events-none" />
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-(--status-success) animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--status-success) font-semibold bg-(--status-success-bg) px-2 py-0.5 rounded-full border border-(--status-success-border)">
              Active Session
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-(--text-primary) tracking-wide">Good Morning, Registrar</h1>
          <p className="text-xs text-(--text-muted) font-sans">Live data from PostgreSQL — all statistics reflect the current database state.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadStats}>
            Refresh
          </Button>
          <Badge variant="gold" className="px-3 py-1 font-mono text-[11px] font-bold border border-(--brand-gold)/30 bg-(--accent-gold-subtle) text-(--brand-gold) rounded-xl">
            Live Data
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Approve Admissions', icon: FileCheck, tab: 'admissions' },
          { label: 'Create Course',      icon: PlusCircle, action: onOpenCreateCourse },
          { label: 'Transcripts',        icon: FileText,   tab: 'transcripts' },
          { label: 'Post Announcement',  icon: Send,       tab: 'announcements' },
        ].map((act, i) => (
          <button
            key={i}
            onClick={() => act.tab ? setActiveTab(act.tab) : act.action?.()}
            className="p-4 bg-(--bg-card) border border-(--border-default) rounded-2xl flex items-center gap-3.5 text-left text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent-gold-border) hover:bg-(--hover-overlay) transition-all duration-300 group ds-focus-ring"
          >
            <div className="w-8 h-8 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center text-(--text-secondary) group-hover:text-(--brand-gold) group-hover:border-(--accent-gold-border) transition-colors">
              <act.icon className="w-4 h-4" />
            </div>
            <span className="font-sans font-medium tracking-wide">{act.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.id}
            onClick={() => kpi.tab && setActiveTab(kpi.tab)}
            className={`p-5 ds-card rounded-2xl hover:border-(--accent-gold-border) hover:shadow-[0_0_20px_var(--accent-gold-glow)] transition-all duration-300 group relative overflow-hidden backdrop-blur-xl ${kpi.tab ? 'cursor-pointer' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) flex items-center justify-center">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div className="flex items-center gap-1">
                {kpi.trendUp
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-(--status-success)" />
                  : <ArrowDownRight className={`w-3.5 h-3.5 ${kpi.id === 'conflicts' ? 'text-(--status-success)' : 'text-(--status-danger)'}`} />
                }
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-(--text-faint) uppercase tracking-wider">{kpi.title}</p>
              <h3 className="text-2xl font-mono font-bold text-(--text-primary) tracking-tight">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* Schedule Conflicts Alert */}
          {stats.scheduleConflicts > 0 && (
            <div className="bg-(--status-danger-bg) border border-(--status-danger-border) rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-(--status-danger) shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-(--text-primary)">Active Schedule Conflicts</h4>
                    <Badge variant="danger" className="text-[9px] py-0">Action Required</Badge>
                  </div>
                  <p className="text-xs text-(--text-secondary) leading-relaxed">
                    <strong>{stats.scheduleConflicts}</strong> room/instructor conflict{stats.scheduleConflicts > 1 ? 's' : ''} detected in the timetable.
                  </p>
                  <button onClick={() => setActiveTab('timetable')} className="text-xs text-(--brand-gold) hover:underline font-semibold flex items-center gap-1">
                    Resolve Conflicts <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="ds-card rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-5">Recent Activity</h3>
            {stats.recentActivity.length === 0 ? (
              <p className="text-xs text-(--text-faint) text-center py-6">No recent activity</p>
            ) : (
              <div className="relative border-l border-(--border-default) pl-5 ml-2.5 space-y-6">
                {stats.recentActivity.map((act) => (
                  <div key={act.id} className="relative group">
                    <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-(--brand-gold) border-2 border-(--bg-base) group-hover:scale-125 transition-transform" />
                    <div className="space-y-1">
                      <p className="text-xs text-(--text-secondary) leading-relaxed font-sans">
                        <strong className="text-(--text-primary)">{act.actor}</strong>
                        {' — '}
                        <span className="text-(--brand-gold) font-mono text-[11px] bg-(--accent-gold-subtle) border border-(--accent-gold-border) px-1.5 py-0.5 rounded-lg">{act.description}</span>
                      </p>
                      <span className="text-[10px] font-mono text-(--text-faint)">{formatRelative(act.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Events */}
          <div className="ds-card rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-(--brand-gold)" /> Upcoming Events
            </h3>
            {stats.upcomingEvents.length === 0 ? (
              <p className="text-xs text-(--text-faint) text-center py-4">No upcoming events</p>
            ) : (
              <div className="space-y-4">
                {stats.upcomingEvents.map((ev) => {
                  const days = daysUntil(ev.startDate);
                  return (
                    <div key={ev.id} className="flex justify-between items-center p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-(--text-primary)">{ev.title}</p>
                        <p className="text-[10px] font-mono text-(--text-muted)">{new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <Badge variant={days <= 7 ? 'rose' : 'glass'} className="font-mono text-[10px] font-semibold">
                        {days <= 0 ? 'Today' : `${days}d`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="ds-card rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-5 flex items-center gap-2">
              <Server className="w-5 h-5 text-(--brand-gold)" /> System Summary
            </h3>
            <div className="space-y-3.5">
              {[
                { label: 'Available Seats',     value: String(stats.availableSeats),    ok: true },
                { label: 'Pending Graduation',  value: String(stats.pendingGraduation), ok: true },
                { label: 'Schedule Conflicts',  value: String(stats.scheduleConflicts), ok: stats.scheduleConflicts === 0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <p className="font-semibold text-(--text-primary)">{item.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-(--status-success)' : 'bg-(--status-danger)'} animate-pulse`} />
                    <span className={`font-mono text-[10px] font-bold ${item.ok ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

