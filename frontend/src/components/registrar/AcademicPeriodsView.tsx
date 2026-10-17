'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Calendar, Plus, Lock, Unlock, Play, Pause, RefreshCw,
  ChevronDown, ChevronRight, Clock, Users, BookOpen,
  AlertTriangle, CheckCircle2, X, Trash2,
} from 'lucide-react';
import { DHPageHeader } from '../dh/DHPageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SlidePanel } from '../ui/SlidePanel';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import {
  academicPeriodsApi, academicYearsApi,
  type AcademicPeriodItem, type AcademicYearItem,
} from '@/src/lib/registrarApi';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(p: AcademicPeriodItem) {
  if (p.isClosed) return <Badge variant="rose"><Lock className="w-3 h-3 mr-1" />Closed</Badge>;
  if (p.isCurrent) return <Badge variant="emerald"><Play className="w-3 h-3 mr-1" />Current / Open</Badge>;
  return <Badge variant="amber"><Pause className="w-3 h-3 mr-1" />Inactive</Badge>;
}

// ── Main Component ──────────────────────────────────────────────────────────

export const AcademicPeriodsView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({
  programType = 'TVET',
}) => {
  const [periods, setPeriods] = useState<AcademicPeriodItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create panel
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    academicYearId: '',
    name: '',
    durationWeeks: programType === 'SHORT_PROGRAM' ? 12 : 16,
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  // Confirmation modals
  const [actionTarget, setActionTarget] = useState<AcademicPeriodItem | null>(null);
  const [actionType, setActionType] = useState<'open' | 'close' | 'reopen' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isSP = programType === 'SHORT_PROGRAM';
  const periodLabel = isSP ? 'Term' : 'Semester';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [periodsRes, yearsRes] = await Promise.all([
        academicPeriodsApi.list(programType),
        academicYearsApi.list(),
      ]);
      setPeriods(periodsRes);
      setAcademicYears(yearsRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load academic periods');
    } finally {
      setLoading(false);
    }
  }, [programType]);

  useEffect(() => { load(); }, [load]);

  // Reset form defaults when programType changes
  useEffect(() => {
    setCreateForm(f => ({
      ...f,
      name: '',
      durationWeeks: isSP ? 12 : 16,
    }));
  }, [programType, isSP]);

  // ── Auto-calculate End Date from Start Date + Duration ────────────────────
  useEffect(() => {
    if (createForm.startDate && createForm.durationWeeks) {
      const start = new Date(createForm.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (createForm.durationWeeks * 7)); // weeks to days
      const endDateStr = end.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      setCreateForm(f => ({ ...f, endDate: endDateStr }));
    }
  }, [createForm.startDate, createForm.durationWeeks]);

  // ── Create period ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.academicYearId || !createForm.name || !createForm.startDate || !createForm.endDate) return;
    setCreating(true);
    try {
      await academicPeriodsApi.create({
        academicYearId: createForm.academicYearId,
        name: createForm.name.trim(),
        programType,
        durationWeeks: createForm.durationWeeks,
        startDate: new Date(createForm.startDate).toISOString(),
        endDate: new Date(createForm.endDate).toISOString(),
        isCurrent: createForm.isCurrent,
      });
      setShowCreate(false);
      setCreateForm({
        academicYearId: '',
        name: '',
        durationWeeks: isSP ? 12 : 16,
        startDate: '',
        endDate: '',
        isCurrent: false,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create period');
    } finally {
      setCreating(false);
    }
  };

  // ── Lifecycle actions ─────────────────────────────────────────────────────
  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === 'open') await academicPeriodsApi.open(actionTarget.id);
      else if (actionType === 'close') await academicPeriodsApi.close(actionTarget.id);
      else if (actionType === 'reopen') await academicPeriodsApi.reopen(actionTarget.id);
      else if (actionType === 'delete') {
        // Delete from database
        const response = await fetch(`/api/registrar/semesters/${actionTarget.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete period');
        }
      }
      setActionTarget(null);
      setActionType(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to ${actionType} period`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Group periods by academic year ────────────────────────────────────────
  const grouped = periods.reduce<Record<string, AcademicPeriodItem[]>>((acc, p) => {
    const key = p.academicYearName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped);

  // ── Collapsed academic year groups ────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCollapse = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1200px]">
      <DHPageHeader
        icon={<Calendar className="w-5 h-5" />}
        title={`Academic Periods — ${isSP ? 'Short Program Terms' : 'TVET Semesters'}`}
        subtitle={`Create, configure, open, close, and manage ${isSP ? 'terms' : 'semesters'} for ${isSP ? 'Short Program' : 'TVET'} courses.`}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[var(--brand-gold)] text-black hover:brightness-110"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create {periodLabel}
        </Button>

        <Button onClick={load} variant="ghost" size="sm">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <div className="ml-auto text-xs text-[var(--text-muted)] font-mono">
          {periods.length} period{periods.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Loading state ────────────────────────────────────────────────── */}
      {loading && <SkeletonTable rows={4} cols={6} />}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && periods.length === 0 && (
        <EmptyState
          icon={Calendar}
          title={`No ${isSP ? 'Terms' : 'Semesters'} Found`}
          description={`Click "Create ${periodLabel}" to set up the first ${isSP ? 'term' : 'semester'} for ${isSP ? 'Short Program' : 'TVET'} courses.`}
        />
      )}

      {/* ── Period Groups by Academic Year ────────────────────────────────── */}
      {!loading && groupKeys.length > 0 && (
        <div className="space-y-4">
          {groupKeys.map(yearName => {
            const items = grouped[yearName];
            const isCollapsed = collapsed[yearName] ?? false;

            return (
              <motion.div
                key={yearName}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...DURATION.fast, ...EASE.out }}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
              >
                {/* ── Academic Year Header ── */}
                <button
                  onClick={() => toggleCollapse(yearName)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--hover-overlay)] transition-colors text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  }
                  <Calendar className="w-4 h-4 text-[var(--brand-gold)]" />
                  <span className="font-bold text-sm text-[var(--text-primary)]">{yearName}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-1">
                    ({items.length} {items.length === 1 ? periodLabel.toLowerCase() : `${periodLabel.toLowerCase()}s`})
                  </span>
                </button>

                {/* ── Period Cards ── */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ ...DURATION.fast, ...EASE.out }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[var(--border-subtle)]">
                        {items.map(period => (
                          <div
                            key={period.id}
                            className="flex items-center gap-4 px-5 py-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--hover-overlay)] transition-colors"
                          >
                            {/* Name & Type */}
                            <div className="min-w-[180px]">
                              <div className="font-semibold text-sm text-[var(--text-primary)]">
                                {period.name}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                {period.programType === 'SHORT_PROGRAM' ? 'Short Program' : 'TVET'}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="min-w-[120px]">
                              {statusBadge(period)}
                            </div>

                            {/* Dates */}
                            <div className="hidden md:flex flex-col text-[11px] text-[var(--text-muted)] min-w-[150px]">
                              <span>{formatDate(period.startDate)} — {formatDate(period.endDate)}</span>
                              <span className="mt-0.5">{period.durationWeeks} weeks</span>
                            </div>

                            {/* Stats */}
                            <div className="hidden lg:flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" /> {period.courseCount} courses
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {period.studentCount} students
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                              {!period.isCurrent && !period.isClosed && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => { setActionTarget(period); setActionType('open'); }}
                                  title="Set as current and open"
                                >
                                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                                </Button>
                              )}
                              {period.isCurrent && !period.isClosed && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => { setActionTarget(period); setActionType('close'); }}
                                  title="Close this period"
                                >
                                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                                </Button>
                              )}
                              {period.isClosed && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => { setActionTarget(period); setActionType('reopen'); }}
                                  title="Reopen this period"
                                >
                                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                                </Button>
                              )}
                              {/* Delete Button - Only show if no courses assigned */}
                              {period.courseCount === 0 && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => { setActionTarget(period); setActionType('delete'); }}
                                  title="Delete this period (no courses assigned)"
                                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         CREATE PERIOD PANEL
         ═══════════════════════════════════════════════════════════════════ */}
      <SlidePanel
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title={`Create New ${periodLabel}`}
        width="md"
      >
        <div className="space-y-4 p-1">
          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Academic Year <span className="text-rose-400">*</span>
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/40"
              value={createForm.academicYearId}
              onChange={e => setCreateForm(f => ({ ...f, academicYearId: e.target.value }))}
            >
              <option value="">Select academic year…</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Period Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {periodLabel} Name <span className="text-rose-400">*</span>
            </label>
            <Input
              value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              placeholder={isSP ? 'e.g., Term I' : 'e.g., Semester I'}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {isSP
                ? 'Short Programs must use "Term" labels (e.g., "Term I", "Term II"). Never use "Semester".'
                : 'TVET programs use "Semester" labels (e.g., "Semester I", "Semester II").'}
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Duration (weeks)
            </label>
            <Input
              type="number"
              min={1}
              value={createForm.durationWeeks}
              onChange={e => setCreateForm(f => ({ ...f, durationWeeks: parseInt(e.target.value) || 12 }))}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              End date will be calculated automatically
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Start Date <span className="text-rose-400">*</span>
              </label>
              <Input
                type="date"
                value={createForm.startDate}
                onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                End Date <span className="text-rose-400">*</span> <span className="text-[10px] font-normal text-[var(--text-muted)]">(auto-calculated)</span>
              </label>
              <Input
                type="date"
                value={createForm.endDate}
                readOnly
                className="bg-[var(--bg-secondary)] cursor-not-allowed opacity-75"
                title="Automatically calculated from Start Date + Duration"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Calculated from start date + duration weeks
              </p>
            </div>
          </div>

          {/* Set as current */}
          <label className="flex items-center gap-2.5 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={createForm.isCurrent}
              onChange={e => setCreateForm(f => ({ ...f, isCurrent: e.target.checked }))}
              className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-input)] accent-[var(--brand-gold)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Set as current active period</span>
          </label>

          {/* Submit */}
          <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              onClick={handleCreate}
              disabled={creating || !createForm.academicYearId || !createForm.name || !createForm.startDate || !createForm.endDate}
              className="bg-[var(--brand-gold)] text-black hover:brightness-110 flex-1"
            >
              {creating ? 'Creating…' : `Create ${periodLabel}`}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </SlidePanel>

      {/* ══════════════════════════════════════════════════════════════════════
         ACTION CONFIRMATION MODALS
         ═══════════════════════════════════════════════════════════════════ */}
      <ConfirmModal
        isOpen={!!actionTarget && actionType === 'open'}
        onClose={() => { setActionTarget(null); setActionType(null); }}
        onConfirm={handleAction}
        title={`Open ${periodLabel}: ${actionTarget?.name ?? ''}`}
        message={`This will set "${actionTarget?.name}" as the current active ${periodLabel.toLowerCase()} and mark other ${isSP ? 'terms' : 'semesters'} as inactive. All existing course offerings, enrollments, and records remain untouched.`}
        confirmLabel="Open Period"
        variant="warning"
      />

      <ConfirmModal
        isOpen={!!actionTarget && actionType === 'close'}
        onClose={() => { setActionTarget(null); setActionType(null); }}
        onConfirm={handleAction}
        title={`Close ${periodLabel}: ${actionTarget?.name ?? ''}`}
        message={`Closing "${actionTarget?.name}" will lock all enrollments, grade modifications, and attendance for this period. Historical records and academic summaries are preserved. Instructors will not be able to submit or edit grades for courses in this period.`}
        confirmLabel="Close Period"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!actionTarget && actionType === 'reopen'}
        onClose={() => { setActionTarget(null); setActionType(null); }}
        onConfirm={handleAction}
        title={`Reopen ${periodLabel}: ${actionTarget?.name ?? ''}`}
        message={`Reopening "${actionTarget?.name}" will allow grade modifications, enrollments, and attendance edits again. No records will be duplicated. Use this only for authorized corrections.`}
        confirmLabel="Reopen Period"
        variant="warning"
      />

      <ConfirmModal
        isOpen={!!actionTarget && actionType === 'delete'}
        onClose={() => { setActionTarget(null); setActionType(null); }}
        onConfirm={handleAction}
        title={`Delete ${periodLabel}: ${actionTarget?.name ?? ''}`}
        message={`This will permanently delete "${actionTarget?.name}" from the database. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </div>
  );
};
