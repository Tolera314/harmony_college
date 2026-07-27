'use client';

import React, { useEffect, useState } from 'react';
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

// Mock Sparkline points for each KPI
const sparklineData = {
  admissions: [12, 19, 15, 22, 28, 30, 27, 34],
  programs: [10, 10, 10, 11, 11, 12, 12, 12],
  courses: [45, 52, 58, 62, 60, 68, 72, 75],
  students: [380, 410, 425, 450, 480, 492, 510, 525],
  graduation: [5, 8, 12, 15, 14, 18, 22, 25],
  transcripts: [8, 14, 12, 19, 23, 21, 28, 31],
  conflicts: [12, 10, 8, 5, 3, 2, 4, 1],
  waitlist: [20, 24, 28, 32, 29, 35, 41, 45]
};

interface OverviewProps {
  setActiveTab: (tab: any) => void;
  onOpenCreateCourse: () => void;
}

export const DashboardOverview: React.FC<OverviewProps> = ({ setActiveTab, onOpenCreateCourse }) => {
  const [counters, setCounters] = useState({
    admissions: 0,
    programs: 0,
    courses: 0,
    students: 0,
    graduation: 0,
    transcripts: 0,
    conflicts: 0,
    waitlist: 0,
  });

  // Animated counter effect
  useEffect(() => {
    const targets = {
      admissions: 34,
      programs: 12,
      courses: 75,
      students: 525,
      graduation: 25,
      transcripts: 31,
      conflicts: 1,
      waitlist: 45
    };

    const duration = 1000; // 1s
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounters({
        admissions: Math.round((targets.admissions / steps) * step),
        programs: Math.round((targets.programs / steps) * step),
        courses: Math.round((targets.courses / steps) * step),
        students: Math.round((targets.students / steps) * step),
        graduation: Math.round((targets.graduation / steps) * step),
        transcripts: Math.round((targets.transcripts / steps) * step),
        conflicts: Math.round((targets.conflicts / steps) * step),
        waitlist: Math.round((targets.waitlist / steps) * step)
      });

      if (step >= steps) {
        clearInterval(timer);
        setCounters(targets);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const renderSparkline = (points: number[], color: string, id: string) => {
    const width = 100;
    const height = 30;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-24 h-8" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M 0,${height} L ${coords} L ${width},${height} Z`}
          fill={`url(#grad-${id})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          points={coords}
        />
      </svg>
    );
  };

  const kpiCards = [
    {
      id: 'admissions',
      title: 'Pending Admissions',
      value: counters.admissions,
      trend: '+12.4%',
      trendUp: true,
      icon: ClipboardList,
      color: 'var(--status-info)', // Info
      tab: 'admissions'
    },
    {
      id: 'programs',
      title: 'Active Programs',
      value: counters.programs,
      trend: '0.0%',
      trendUp: true,
      icon: BookOpen,
      color: 'var(--brand-gold)', // Gold
      tab: 'programs'
    },
    {
      id: 'courses',
      title: 'Courses Offered',
      value: counters.courses,
      trend: '+8.3%',
      trendUp: true,
      icon: Zap,
      color: 'var(--status-success)', // Success
      tab: 'catalog'
    },
    {
      id: 'students',
      title: 'Students Enrolled',
      value: counters.students,
      trend: '+4.2%',
      trendUp: true,
      icon: Users,
      color: 'var(--brand-gold)', // Gold
      tab: 'enrollments'
    },
    {
      id: 'graduation',
      title: 'Graduation Requests',
      value: counters.graduation,
      trend: '+18.1%',
      trendUp: true,
      icon: GraduationCap,
      color: 'var(--brand-gold)', // Gold-ish
      tab: 'graduation'
    },
    {
      id: 'transcripts',
      title: 'Transcript Requests',
      value: counters.transcripts,
      trend: '+24.5%',
      trendUp: true,
      icon: FileText,
      color: 'var(--status-info)', // Info
      tab: 'transcripts'
    },
    {
      id: 'conflicts',
      title: 'Schedule Conflicts',
      value: counters.conflicts,
      trend: '-75.0%',
      trendUp: false,
      icon: AlertTriangle,
      color: 'var(--status-danger)', // Danger
      tab: 'timetable'
    },
    {
      id: 'waitlist',
      title: 'Waitlisted Students',
      value: counters.waitlist,
      trend: '+15.2%',
      trendUp: true,
      icon: Clock,
      color: 'var(--status-warning)', // Warning
      tab: 'registration'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} 
      className="space-y-8"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-(--border-default) rounded-2xl p-6 backdrop-blur-md relative overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-(--accent-gold-subtle) rounded-full blur-[80px] pointer-events-none" />
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-(--status-success) animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-(--status-success) font-semibold bg-(--status-success-bg) px-2 py-0.5 rounded-full border border-(--status-success-border)">
              Active Session
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-(--text-primary) tracking-wide">
            Good Morning, Registrar
          </h1>
          <p className="text-xs text-(--text-muted) font-sans">
            Welcome to the Registrar Management dashboard. All services are running optimally.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono text-(--text-faint) uppercase">Current Term</p>
            <p className="text-xs font-semibold text-(--text-primary)">Fall Semester 2026</p>
          </div>
          <Badge variant="gold" className="px-3 py-1 font-mono text-[11px] font-bold border border-(--brand-gold)/30 bg-(--accent-gold-subtle) text-(--brand-gold) rounded-xl">
            2026–2027 AY
          </Badge>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Approve Admissions', icon: FileCheck, tab: 'admissions' },
          { label: 'Create Course', icon: PlusCircle, action: onOpenCreateCourse },
          { label: 'Generate Transcript', icon: FileText, tab: 'transcripts' },
          { label: 'Post Announcement', icon: Send, tab: 'announcements' },
        ].map((act, i) => (
          <button
            key={i}
            onClick={() => act.tab ? setActiveTab(act.tab) : act.action?.()}
            className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl flex items-center gap-3.5 text-left text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent-gold-border) hover:bg-(--active-overlay) transition-all duration-300 group ds-focus-ring"
          >
            <div className="w-8 h-8 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center text-(--text-secondary) group-hover:text-(--brand-gold) group-hover:border-(--accent-gold-border) transition-colors">
              <act.icon className="w-4 h-4" />
            </div>
            <span className="font-sans font-medium tracking-wide">{act.label}</span>
          </button>
        ))}
      </div>

      {/* 12-Column Responsive Grid for KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.id}
            onClick={() => setActiveTab(kpi.tab)}
            className="p-5 bg-(--bg-card) border border-(--border-card) rounded-2xl hover:border-(--accent-gold-border) hover:shadow-[0_0_20px_var(--accent-gold-glow)] cursor-pointer transition-all duration-300 group relative overflow-hidden backdrop-blur-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle) flex items-center justify-center text-(--text-faint) group-hover:text-(--text-primary) group-hover:border-(--border-strong) transition-all">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.value > 0 && kpi.id === 'conflicts' ? 'var(--status-danger)' : undefined }} />
              </div>
              <div className="flex items-center gap-1">
                {kpi.trendUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-(--status-success)" />
                ) : (
                  <ArrowDownRight className={`w-3.5 h-3.5 ${kpi.id === 'conflicts' ? 'text-(--status-success)' : 'text-(--status-danger)'}`} />
                )}
                <span className={`text-[10px] font-mono font-bold ${kpi.trendUp ? 'text-(--status-success)' : kpi.id === 'conflicts' ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                  {kpi.trend}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-mono text-(--text-faint) uppercase tracking-wider">
                {kpi.title}
              </p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-mono font-bold text-(--text-primary) tracking-tight">
                  {kpi.value}
                </h3>
                {renderSparkline(sparklineData[kpi.id as keyof typeof sparklineData], kpi.color, kpi.id)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Widgets Section: 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Widgets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Conflict Alerts Alert Box */}
          <div className="bg-(--status-danger-bg) border border-(--status-danger-border) rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-(--status-danger-bg) rounded-full blur-3xl" />
            <div className="flex items-start gap-4">
              <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-(--status-danger) shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-(--text-primary) font-sans">Active Schedule Conflicts</h4>
                  <Badge variant="danger" className="text-[9px] py-0">Action Required</Badge>
                </div>
                <p className="text-xs text-(--text-secondary) leading-relaxed max-w-lg">
                  A room clash was detected for <strong className="text-(--text-primary)">CS201 Data Structures</strong> and <strong className="text-(--text-primary)">MATH302 Calculus III</strong>. Both classes are currently booked in <strong className="text-(--text-primary)">Block C, Room 204</strong> at Tuesday 10:00 AM.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button 
                    onClick={() => setActiveTab('timetable')}
                    className="text-xs text-(--brand-gold) hover:text-(--brand-gold) hover:underline font-semibold flex items-center gap-1 transition-colors"
                  >
                    Resolve Clash <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="border border-(--border-default) rounded-2xl p-6 backdrop-blur-md" style={{ backgroundColor: "var(--hover-overlay)" }}>
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-5">Recent Activities</h3>
            <div className="relative border-l border-(--border-default) pl-5 ml-2.5 space-y-6">
              {[
                { actor: 'Registrar Office', action: 'Approved admission for applicant', record: 'Selam Alemayehu (HC-2026-0812)', time: '10 mins ago', type: 'admission' },
                { actor: 'System Auto', action: 'Promoted waitlisted student to course', record: 'CS440 Artificial Intelligence', time: '1 hour ago', type: 'registration' },
                { actor: 'Dr. Bekele Ayalew', action: 'Updated course capacity for', record: 'JOUR401 (30 to 45 seats)', time: '3 hours ago', type: 'catalog' },
                { actor: 'Registrar Office', action: 'Issued official digital transcript for', record: 'Yonas Kebede (HC-2024-8832)', time: '5 hours ago', type: 'transcript' },
                { actor: 'System Backup', action: 'Completed scheduled incremental system backup', record: 'Backup ID #1842-INC', time: '12 hours ago', type: 'system' },
              ].map((act, i) => (
                <div key={i} className="relative group">
                  {/* Dot */}
                  <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-(--brand-gold) border-2 border-(--bg-base) group-hover:scale-125 transition-transform" />
                  
                  <div className="space-y-1">
                    <p className="text-xs text-(--text-secondary) leading-relaxed font-sans">
                      <strong className="text-(--text-primary)">{act.actor}</strong> {act.action} <span className="text-(--brand-gold) font-mono text-[11px] bg-(--accent-gold-subtle) border border-(--accent-gold-border) px-1.5 py-0.5 rounded-lg">{act.record}</span>
                    </p>
                    <span className="text-[10px] font-mono text-(--text-faint) block">
                      {act.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Widgets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upcoming Registration Deadlines */}
          <div className="border border-(--border-default) rounded-2xl p-6 backdrop-blur-md" style={{ backgroundColor: "var(--hover-overlay)" }}>
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-(--brand-gold)" /> Registration Schedule
            </h3>
            <div className="space-y-4">
              {[
                { title: 'Add/Drop Period Closes', date: 'Aug 05, 2026', daysLeft: 13, warning: true },
                { title: 'Late Registration Deadline', date: 'Aug 12, 2026', daysLeft: 20, warning: false },
                { title: 'Midterm Exam Scheduling', date: 'Sep 18, 2026', daysLeft: 57, warning: false },
                { title: 'Graduation Audit Filing', date: 'Oct 30, 2026', daysLeft: 99, warning: false },
              ].map((dl, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-(--text-primary) font-sans">{dl.title}</p>
                    <p className="text-[10px] font-mono text-(--text-muted)">{dl.date}</p>
                  </div>
                  <Badge 
                    variant={dl.warning ? 'rose' : 'glass'} 
                    className="font-mono text-[10px] font-semibold"
                  >
                    {dl.daysLeft} days left
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="border border-(--border-default) rounded-2xl p-6 backdrop-blur-md" style={{ backgroundColor: "var(--hover-overlay)" }}>
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-5 flex items-center gap-2">
              <Server className="w-5 h-5 text-(--brand-gold)" /> Core Infrastructure
            </h3>
            <div className="space-y-3.5">
              {[
                { name: 'Database Server (PostgreSQL)', uptime: '99.98%', latency: '4ms', status: 'Healthy' },
                { name: 'Mail Server (Brevo SMTP)', uptime: '100%', latency: '120ms', status: 'Healthy' },
                { name: 'File Storage (Secure S3)', uptime: '99.99%', latency: '18ms', status: 'Healthy' },
                { name: 'Identity Provider (Supabase Auth)', uptime: '99.95%', latency: '8ms', status: 'Healthy' },
              ].map((sh, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-(--text-primary) font-sans">{sh.name}</p>
                    <p className="text-[10px] font-mono text-(--text-faint)">Uptime: {sh.uptime} · Latency: {sh.latency}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-(--status-success) animate-pulse" />
                    <span className="font-mono text-[10px] text-(--status-success) font-bold">{sh.status}</span>
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
