'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StudentProfile } from '../types';
import {
  Search, Filter, CheckCircle2, Plus, Trash2,
  Clock, Building, Info, RefreshCw, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { EmptyState, SkeletonPage } from './ui/States';

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `HTTP ${res.status}`);
  return data as T;
}

// Map an offering from /api/registrar/offerings to a display shape
interface OfferingDisplay {
  id: string;
  offeringId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  instructor: string;
  schedule: string;
  room: string;
  description: string;
  enrolled: number;
  capacity: number;
  semesterName: string;
  isEnrolled: boolean;
}

function mapOffering(o: any): OfferingDisplay {
  const timetables: any[] = o.timetable ?? o.timetables ?? [];
  const schedule = timetables.length
    ? timetables.map((t: any) => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return `${days[t.dayOfWeek] ?? t.dayOfWeek} ${t.startTime}–${t.endTime}`;
      }).join(', ')
    : 'TBA';

  return {
    id: o.id,
    offeringId: o.id,
    code: o.course?.code ?? o.courseCode ?? '—',
    title: o.course?.name ?? o.courseName ?? '—',
    department: o.course?.department?.name ?? o.departmentName ?? '—',
    credits: o.course?.creditHours ?? o.creditHours ?? 3,
    instructor: o.instructor?.user?.fullName ?? o.instructorName ?? 'TBA',
    schedule,
    room: o.room ? `${o.room.building ?? ''} ${o.room.name ?? ''}`.trim() : 'TBA',
    description: o.course?.description ?? '',
    enrolled: o._count?.enrollments ?? o.enrolled ?? 0,
    capacity: o.capacity ?? 0,
    semesterName: o.semester?.name ?? '',
    isEnrolled: o.isEnrolled ?? false,
  };
}

interface Props {
  profile?: StudentProfile;
}

export const CourseRegistrationView: React.FC<Props> = ({ profile }) => {
  const [offerings, setOfferings]         = useState<OfferingDisplay[]>([]);
  const [enrolled, setEnrolled]           = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedDept, setSelectedDept]   = useState('All');
  const [notification, setNotification]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [registering, setRegistering]     = useState<string | null>(null);
  const [dropping, setDropping]           = useState<string | null>(null);
  const [semesterName, setSemesterName]   = useState('');

  const showToast = (msg: string, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load current-semester offerings from registrar API (no auth needed for viewing)
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Fetch with a large limit to get all current offerings
      const res = await apiFetch<any>('/api/registrar/offerings?limit=200&currentSemester=true');
      const items: OfferingDisplay[] = (res.offerings ?? []).map(mapOffering);
      setOfferings(items);

      // Mark which ones the student is already enrolled in
      // by checking /api/student/courses
      try {
        const myCoursesRes = await apiFetch<any>('/api/student/courses');
        const myIds = new Set<string>(
          (myCoursesRes.courses ?? myCoursesRes ?? []).map((c: any) => c.offeringId ?? c.id),
        );
        setEnrolled(myIds);
      } catch { /* can't fetch enrolled — treat all as not enrolled */ }

      if (items.length > 0) setSemesterName(items[0].semesterName);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load course offerings');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const departments = ['All', ...Array.from(new Set(offerings.map(o => o.department))).sort()];

  const filtered = offerings.filter(o => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || o.title.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || o.instructor.toLowerCase().includes(q);
    const matchDept = selectedDept === 'All' || o.department === selectedDept;
    return matchSearch && matchDept;
  });

  const enrolledOfferings = offerings.filter(o => enrolled.has(o.offeringId));
  const totalCredits = enrolledOfferings.reduce((s, o) => s + o.credits, 0);

  const handleRegister = async (offering: OfferingDisplay) => {
    setRegistering(offering.id);
    try {
      // Use registrar force-add for now — in a real system this would be a student self-enroll endpoint
      await apiFetch('/api/registrar/enrollments/force-add', {
        method: 'POST',
        body: JSON.stringify({ courseOfferingId: offering.offeringId }),
      });
      setEnrolled(prev => new Set([...prev, offering.offeringId]));
      showToast(`Registered for ${offering.code}: ${offering.title}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Registration failed', false);
    } finally { setRegistering(null); }
  };

  const handleDrop = async (offering: OfferingDisplay) => {
    setDropping(offering.id);
    try {
      // Find enrollment ID to drop
      const myRes = await apiFetch<any>('/api/student/courses');
      const myEnrollment = (myRes.courses ?? myRes ?? []).find(
        (c: any) => (c.offeringId ?? c.id) === offering.offeringId,
      );
      if (myEnrollment?.enrollmentId) {
        await apiFetch(`/api/registrar/enrollments/${myEnrollment.enrollmentId}`, { method: 'DELETE' });
      }
      setEnrolled(prev => { const next = new Set(prev); next.delete(offering.offeringId); return next; });
      showToast(`Dropped ${offering.code}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Drop failed', false);
    } finally { setDropping(null); }
  };

  if (loading) return <SkeletonPage />;
  if (error)   return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <AlertCircle className="w-8 h-8" style={{ color: 'var(--status-danger)' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{error}</p>
      <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Retry</Button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl font-sans text-sm font-bold flex items-center justify-between shadow-xl"
            style={{
              backgroundColor: notification.ok ? 'var(--brand-gold)' : 'var(--status-danger)',
              color: notification.ok ? 'var(--text-inverse)' : '#fff',
            }}
          >
            <div className="flex items-center gap-2">
              {notification.ok
                ? <CheckCircle2 className="w-5 h-5" />
                : <AlertCircle className="w-5 h-5" />}
              <span>{notification.msg}</span>
            </div>
            <button onClick={() => setNotification(null)} className="p-1">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <Card hoverable={false} className="space-y-5">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <Badge variant="gold">Enrollment Portal</Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
              Course Registration
            </h2>
            <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {semesterName ? `${semesterName} — ` : ''}Harmony College · {offerings.length} courses available
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl border text-xs font-mono"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
            <div>
              <p style={{ color: 'var(--text-faint)' }}>Registered Credits</p>
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {totalCredits} <span className="text-xs" style={{ color: 'var(--text-faint)' }}>/ 18 Max</span>
              </p>
            </div>
            <div className="h-8 w-px" style={{ backgroundColor: 'var(--border-strong)' }} />
            <div>
              <p style={{ color: 'var(--text-faint)' }}>Enrolled Courses</p>
              <p className="font-bold text-lg" style={{ color: 'var(--brand-gold)' }}>{enrolledOfferings.length}</p>
            </div>
            <div className="h-8 w-px" style={{ backgroundColor: 'var(--border-strong)' }} />
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={load}>&nbsp;</Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 pt-2">
          <div className="flex-1">
            <Input
              icon={<Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by course title, code (e.g. CS402), or professor…"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
                style={selectedDept === dept
                  ? { backgroundColor: 'var(--brand-gold)', color: 'var(--text-inverse)', fontWeight: 600 }
                  : { backgroundColor: 'var(--hover-overlay)', color: 'var(--text-secondary)' }}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Catalog + Enrolled side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Available Courses ({filtered.length})
          </h3>

          {filtered.length === 0 ? (
            <EmptyState variant="courses" description="No courses match your search or department filter." compact />
          ) : (
            <div className="space-y-4">
              {filtered.map(offering => {
                const isEnrolled = enrolled.has(offering.offeringId);
                const isFull = offering.capacity > 0 && offering.enrolled >= offering.capacity;
                const isRegistering = registering === offering.id;
                const isDropping = dropping === offering.id;
                return (
                  <Card key={offering.id} hoverable={false} className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="gold">{offering.code}</Badge>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                            {offering.credits} Credits · {offering.department}
                          </span>
                          {isFull && !isEnrolled && (
                            <Badge variant="rose">Full</Badge>
                          )}
                          {offering.capacity > 0 && (
                            <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                              {offering.enrolled}/{offering.capacity} seats
                            </span>
                          )}
                        </div>
                        <h4 className="font-sans text-lg font-semibold mt-1.5" style={{ color: 'var(--text-primary)' }}>
                          {offering.title}
                        </h4>
                      </div>

                      {isEnrolled ? (
                        <Button variant="danger" size="sm" disabled={isDropping}
                          onClick={() => handleDrop(offering)} icon={<Trash2 className="w-4 h-4" />}>
                          {isDropping ? 'Dropping…' : 'Drop'}
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" disabled={isRegistering || isFull}
                          onClick={() => handleRegister(offering)} icon={<Plus className="w-4 h-4" />}>
                          {isRegistering ? 'Registering…' : isFull ? 'Full' : 'Register'}
                        </Button>
                      )}
                    </div>

                    {offering.description && (
                      <p className="font-sans text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {offering.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-xs pt-3 border-t font-mono gap-2"
                      style={{ color: 'var(--text-faint)', borderColor: 'var(--border-default)' }}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                        <span>{offering.schedule}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                        <span>{offering.room}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        <span>Prof. {offering.instructor}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Enrolled summary */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {semesterName ? `${semesterName} ` : ''}Schedule
          </h3>

          <Card hoverable={false} className="space-y-4">
            {enrolledOfferings.length === 0 ? (
              <EmptyState variant="courses" description="No courses enrolled yet. Select from the catalog on the left." compact />
            ) : (
              <div className="space-y-3">
                {enrolledOfferings.map(c => (
                  <div key={c.id} className="p-3.5 rounded-xl flex items-center justify-between border-l-4"
                    style={{ backgroundColor: 'var(--hover-overlay)', borderLeftColor: 'var(--brand-gold)' }}>
                    <div>
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--brand-gold)' }}>{c.code}</span>
                      <h5 className="font-sans text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.title}</h5>
                      <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        {c.schedule} · {c.credits} Credits
                      </p>
                    </div>
                    <button onClick={() => handleDrop(c)} disabled={dropping === c.id}
                      className="p-2 transition-colors" style={{ color: 'var(--text-muted)' }} title="Drop course">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t flex justify-between items-center text-xs font-sans"
              style={{ borderColor: 'var(--border-default)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Credits:</span>
              <span className="font-bold" style={{ color: totalCredits > 18 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                {totalCredits} / 18
                {totalCredits > 18 && <span className="ml-1 text-[10px]">(over limit)</span>}
              </span>
            </div>

            {totalCredits > 18 && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)' }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                You have exceeded the 18-credit maximum. Please drop a course or contact your advisor.
              </div>
            )}
          </Card>

          <div className="p-4 rounded-2xl flex gap-3 text-xs"
            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-gold)' }} />
            <span>
              Course enrollment is subject to seat availability, financial clearance, and prerequisite verification.
              Contact the registrar for force-add requests.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
