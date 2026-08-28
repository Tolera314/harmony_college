'use client';

/**
 * HROnboardingView
 *
 * Has two screens rendered in-place (no modal):
 *   screen="list"  — the paginated dashboard (default)
 *   screen="start" — the "Start Onboarding" sub-view with employee search,
 *                    employee info card, and a ConfirmModal before submission
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  UserPlus, CheckCircle2, Circle, Search, RefreshCw,
  ChevronLeft, ChevronRight, ArrowLeft, User, MapPin,
  Briefcase, Building2, AlertCircle,
} from 'lucide-react';
import {
  hrOnboardingApi, hrEmployeesApi, hrDepartmentsApi,
  type HROnboardingRecordApi, type HREmployeeApi, type HRDepartmentApi,
  EMPLOYMENT_TYPE_LABEL, EMPLOYEE_STATUS_LABEL,
} from '../../../lib/hrApi';
import { DHPageHeader }  from '../../dh/DHPageHeader';
import { Card }          from '../../ui/Card';
import { Badge }         from '../../ui/Badge';
import { Button }        from '../../ui/Button';
import { Input }         from '../../ui/Input';
import { SlidePanel }    from '../../ui/SlidePanel';
import { ConfirmModal }  from '../../ui/ConfirmModal';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_LABEL:   Record<string, string>                            = { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', ON_HOLD: 'On Hold' };
const STATUS_VARIANT: Record<string, 'glass'|'gold'|'emerald'|'amber'> = { NOT_STARTED: 'glass', IN_PROGRESS: 'gold', COMPLETED: 'emerald', ON_HOLD: 'amber' };
const ONBOARDING_STEPS = [
  'Personal Information',
  'Employment Details',
  'Contract & Documents',
  'Salary & Benefits',
  'System Access Setup',
  'Department Orientation',
  'Review & Complete',
];
const PER_PAGE     = 12;
const EMP_PER_PAGE = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-view: Start Onboarding
// ─────────────────────────────────────────────────────────────────────────────

interface StartOnboardingViewProps {
  onBack:    () => void;
  onSuccess: () => void;
}

const StartOnboardingView: React.FC<StartOnboardingViewProps> = ({ onBack, onSuccess }) => {
  const [empSearch,    setEmpSearch]    = useState('');
  const [empPage,      setEmpPage]      = useState(1);
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [depts,        setDepts]        = useState<HRDepartmentApi[]>([]);
  const [empList,      setEmpList]      = useState<HREmployeeApi[]>([]);
  const [empTotal,     setEmpTotal]     = useState(0);
  const [empLoading,   setEmpLoading]   = useState(false);
  const [selectedEmp,  setSelectedEmp]  = useState<HREmployeeApi | null>(null);

  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load departments once
  useEffect(() => {
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
  }, []);

  // Load eligible employees (not yet onboarded, active only)
  const loadEmps = useCallback(async (p = empPage) => {
    setEmpLoading(true);
    try {
      // Fetch already-onboarded IDs to exclude
      const onboarded = await hrOnboardingApi.list({ page: 1, limit: 500 });
      const onboardedIds = new Set(onboarded.records.map(r => r.employeeId));

      const res = await hrEmployeesApi.list({
        page:  p,
        limit: EMP_PER_PAGE,
        search:       empSearch   || undefined,
        departmentId: deptFilter  !== 'All' ? deptFilter : undefined,
        status:       'ACTIVE',
      });
      // Filter out already-onboarded employees client-side (small overhead)
      const filtered = res.employees.filter(e => !onboardedIds.has(e.id));
      setEmpList(filtered);
      setEmpTotal(res.total);
    } catch { setEmpList([]); }
    finally { setEmpLoading(false); }
  }, [empPage, empSearch, deptFilter]);

  useEffect(() => { loadEmps(); }, [loadEmps]);

  const handleEmpSearch = (val: string) => {
    setEmpSearch(val); setEmpPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadEmps(1), 300);
  };

  const empTotalPages = Math.ceil(empTotal / EMP_PER_PAGE);

  // Confirm and submit
  const handleConfirm = async () => {
    if (!selectedEmp) return;
    setSaving(true); setSaveError('');
    try {
      await hrOnboardingApi.start(selectedEmp.id);
      setConfirmOpen(false);
      onSuccess();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to start onboarding');
    } finally {
      setSaving(false);
    }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';

  return (
    <motion.div
      key="start-onboarding"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      {/* ── Breadcrumb header ─────────────────────────────────────────────── */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-(--text-faint) hover:text-(--text-secondary) transition-colors mb-3 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Onboarding
        </button>

        <DHPageHeader
          title="Start Onboarding"
          subtitle="Search for an active employee and begin their onboarding process"
          icon={<UserPlus className="w-5 h-5" />}
        />
      </div>

      {/* ── Two-column layout: employee picker + info panel ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Employee search column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search by name, employee ID, or email…"
                value={empSearch}
                onChange={e => handleEmpSearch(e.target.value)}
              />
            </div>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setEmpPage(1); }} className={filterSel}>
              <option value="All">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>)}
            </select>
          </div>

          {/* Employee list */}
          {empLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-(--hover-overlay) rounded-xl animate-pulse border border-(--border-subtle)" />
              ))}
            </div>
          ) : empList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-(--border-default) rounded-2xl text-(--text-faint) text-sm">
              {empSearch || deptFilter !== 'All'
                ? 'No eligible employees match your search.'
                : 'All active employees already have onboarding records.'}
            </div>
          ) : (
            <div className="space-y-2">
              {empList.map(emp => {
                const isSelected = selectedEmp?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmp(isSelected ? null : emp)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-(--accent-gold-subtle) border-(--brand-gold)'
                        : 'bg-(--hover-overlay) border-(--border-default) hover:border-(--border-strong)'
                    }`}
                  >
                    <img
                      src={emp.avatarUrl ?? '/tigist.png'}
                      alt={emp.fullName}
                      className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-sans text-sm font-semibold truncate ${isSelected ? 'text-(--brand-gold)' : 'text-(--text-primary)'}`}>
                        {emp.fullName}
                      </p>
                      <p className="font-sans text-xs text-(--text-muted) truncate">{emp.position}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{emp.employeeCode}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="glass" className="text-[9px]">
                        {(EMPLOYMENT_TYPE_LABEL as Record<string,string>)[emp.employmentType] ?? emp.employmentType}
                      </Badge>
                      {emp.department && (
                        <span className="text-[10px] font-mono text-(--text-faint)">
                          {emp.department.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {empTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-(--text-faint)">{empTotal} employees</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
                  onClick={() => setEmpPage(p => Math.max(1, p - 1))} disabled={empPage === 1}>Prev</Button>
                <Button variant="secondary" size="sm" icon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setEmpPage(p => Math.min(empTotalPages, p + 1))} disabled={empPage === empTotalPages}>Next</Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: selected employee info + action */}
        <div className="lg:col-span-5 space-y-4">
          {selectedEmp ? (
            <motion.div
              key={selectedEmp.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...DURATION.medium, ...EASE.out }}
              className="space-y-4"
            >
              {/* Employee card */}
              <div className="p-5 ds-card rounded-2xl border border-(--border-default) space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedEmp.avatarUrl ?? '/tigist.png'}
                    alt={selectedEmp.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-(--brand-gold)/30"
                  />
                  <div>
                    <p className="font-serif text-base font-bold text-(--text-primary)">{selectedEmp.fullName}</p>
                    <p className="text-xs text-(--text-muted)">{selectedEmp.position}</p>
                    <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{selectedEmp.employeeCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    { icon: <Building2 className="w-3 h-3" />, label: 'Department', val: selectedEmp.department?.name ?? '—' },
                    { icon: <Briefcase className="w-3 h-3" />, label: 'Type',       val: (EMPLOYMENT_TYPE_LABEL as Record<string,string>)[selectedEmp.employmentType] ?? selectedEmp.employmentType },
                    { icon: <User className="w-3 h-3" />,      label: 'Status',     val: (EMPLOYEE_STATUS_LABEL  as Record<string,string>)[selectedEmp.status]         ?? selectedEmp.status },
                    { icon: <MapPin className="w-3 h-3" />,    label: 'Hired',      val: new Date(selectedEmp.hireDate).toLocaleDateString() },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-(--text-faint) mb-0.5">
                        {icon} {label}
                      </p>
                      <p className="font-semibold text-(--text-primary) truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Onboarding steps preview */}
              <div className="p-4 ds-card rounded-2xl border border-(--border-default) space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold) mb-3">
                  Onboarding checklist ({ONBOARDING_STEPS.length} steps)
                </p>
                {ONBOARDING_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center font-mono text-[10px] text-(--text-faint) shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-(--text-secondary)">{step}</span>
                  </div>
                ))}
              </div>

              {/* Error */}
              {saveError && (
                <div className="flex items-start gap-2 p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}

              {/* Action */}
              <Button
                variant="primary"
                className="w-full"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => { setSaveError(''); setConfirmOpen(true); }}
              >
                Start Onboarding for {selectedEmp.fullName.split(' ')[0]}
              </Button>
            </motion.div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-(--border-default) rounded-2xl text-center px-6 space-y-2">
              <UserPlus className="w-10 h-10 text-(--text-faint)" />
              <p className="font-sans text-sm text-(--text-secondary) font-medium">Select an employee</p>
              <p className="font-sans text-xs text-(--text-faint)">
                Choose an active employee from the list to begin their onboarding journey.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation before starting ─────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { if (!saving) setConfirmOpen(false); }}
        onConfirm={handleConfirm}
        title="Start Onboarding"
        message={
          selectedEmp
            ? `Begin the ${ONBOARDING_STEPS.length}-step onboarding process for ${selectedEmp.fullName} (${selectedEmp.employeeCode})? The employee's progress will be tracked until all steps are completed.`
            : ''
        }
        confirmLabel={saving ? 'Starting…' : 'Yes, Start Onboarding'}
        variant="warning"
        icon={<UserPlus className="w-6 h-6" />}
      />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────────

export const HROnboardingView: React.FC = () => {
  // ── Screens ───────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<'list' | 'start'>('list');

  // ── List state ────────────────────────────────────────────────────────────
  const [records,   setRecords]   = useState<HROnboardingRecordApi[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page,         setPage]         = useState(1);
  const [depts,        setDepts]        = useState<HRDepartmentApi[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detail panel state ────────────────────────────────────────────────────
  const [selected,    setSelected]    = useState<HROnboardingRecordApi | null>(null);
  const [stepSaving,  setStepSaving]  = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [completing, setCompleting]   = useState(false);

  // Load departments once
  useEffect(() => {
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
  }, []);

  const load = useCallback(async (p = page) => {
    setLoading(true); setError(null);
    try {
      const res = await hrOnboardingApi.list({
        page: p, limit: PER_PAGE,
        search:       search       || undefined,
        departmentId: deptFilter   !== 'All' ? deptFilter   : undefined,
        status:       statusFilter !== 'All' ? statusFilter : undefined,
      });
      setRecords(res.records);
      setTotal(res.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [page, search, deptFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1), 350);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  const refreshSelected = async (employeeId: string) => {
    try {
      const updated = await hrOnboardingApi.getByEmployee(employeeId);
      setSelected(updated);
      setRecords(prev => prev.map(r => r.employeeId === employeeId ? updated : r));
    } catch { /* keep stale */ }
  };

  const toggleStep = async (stepKey: string, current: boolean) => {
    if (!selected || stepSaving) return;
    setStepSaving(true);
    try {
      await hrOnboardingApi.advanceStep(selected.employeeId, stepKey, !current);
      await refreshSelected(selected.employeeId);
    } catch { /* fail silently */ }
    finally { setStepSaving(false); }
  };

  const handleComplete = async () => {
    if (!selected) return;
    setCompleting(true);
    try {
      await hrOnboardingApi.complete(selected.employeeId);
      setCompleteConfirmOpen(false);
      await refreshSelected(selected.employeeId);
      load();
    } catch { /* fail silently */ }
    finally { setCompleting(false); }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';

  // ── Render start screen ───────────────────────────────────────────────────
  if (screen === 'start') {
    return (
      <StartOnboardingView
        onBack={() => setScreen('list')}
        onSuccess={() => {
          setScreen('list');
          setPage(1);
          load(1);
        }}
      />
    );
  }

  // ── Render list screen ────────────────────────────────────────────────────
  return (
    <motion.div
      key="onboarding-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Onboarding"
        subtitle={`${records.filter(r => r.status === 'IN_PROGRESS').length} in progress · ${total} total`}
        icon={<UserPlus className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setScreen('start')}>
              Start Onboarding
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />}
            placeholder="Search by name, employee ID, email, or position…"
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className={filterSel}>
            <option value="All">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={filterSel}>
            {['All','IN_PROGRESS','COMPLETED','NOT_STARTED','ON_HOLD'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Status' : STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonPage />
      ) : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : records.length === 0 ? (
        <EmptyState variant="employees"
          description="No onboarding records match your filters."
          action={{ label: 'Start Onboarding', onClick: () => setScreen('start') }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map(rec => {
            const completed = rec.steps.filter(s => s.completed).length;
            const total     = rec.steps.length;
            const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <Card key={rec.id} hoverable className="space-y-4 cursor-pointer" onClick={() => setSelected(rec)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={rec.employee?.avatarUrl ?? '/tigist.png'} alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">{rec.employee?.fullName}</p>
                      <p className="font-sans text-xs text-(--text-muted) truncate">{rec.employee?.position}</p>
                      {rec.employee?.department && (
                        <p className="font-mono text-[10px] text-(--text-faint) truncate">{rec.employee.department.name.split(' ')[0]}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[rec.status] ?? 'glass'} className="shrink-0">
                    {STATUS_LABEL[rec.status] ?? rec.status}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-(--text-faint)">{completed}/{total} steps</span>
                    <span className="text-(--brand-gold)">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div className="h-full bg-[#E9C349] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {rec.steps.map(s => (
                    <div key={s.id} title={s.label}
                      className={`w-2 h-2 rounded-full ${s.completed ? 'bg-(--status-success)' : 'bg-(--hover-overlay) border border-(--border-default)'}`} />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                  <span>Started {new Date(rec.startedAt).toLocaleDateString()}</span>
                  {rec.completedAt && <span>Done {new Date(rec.completedAt).toLocaleDateString()}</span>}
                </div>

                <Button variant="secondary" size="sm" className="w-full"
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                  onClick={e => { e.stopPropagation(); setSelected(rec); }}>
                  View Progress
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} records · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" icon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail SlidePanel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)}
        title={`Onboarding — ${selected?.employee?.fullName}`}
        subtitle={selected?.employee?.employeeCode} width="max-w-lg">
        {selected && (
          <div className="space-y-5 px-6 py-5">
            <div className="flex items-center gap-3">
              <img src={selected.employee?.avatarUrl ?? '/tigist.png'} alt=""
                className="w-12 h-12 rounded-xl border border-(--border-default) object-cover" />
              <div>
                <p className="font-semibold text-(--text-primary)">{selected.employee?.fullName}</p>
                <p className="text-xs text-(--text-muted)">{selected.employee?.position}</p>
                {selected.employee?.department && (
                  <p className="text-[10px] font-mono text-(--text-faint)">{selected.employee.department.name}</p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[selected.status] ?? 'glass'} className="ml-auto">
                {STATUS_LABEL[selected.status] ?? selected.status}
              </Badge>
            </div>

            <div className="space-y-2">
              {selected.steps.sort((a, b) => a.orderIndex - b.orderIndex).map(step => (
                <div key={step.id}
                  onClick={() => !stepSaving && selected.status !== 'COMPLETED' && toggleStep(step.stepKey, step.completed)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    step.completed
                      ? 'bg-(--status-success-bg) border-(--status-success-border) hover:opacity-90'
                      : 'bg-(--hover-overlay) border-(--border-default) hover:bg-(--hover-overlay)'
                  } ${selected.status === 'COMPLETED' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {step.completed
                    ? <CheckCircle2 className="w-4 h-4 text-(--status-success) shrink-0" />
                    : <Circle className="w-4 h-4 text-(--text-faint) shrink-0" />}
                  <span className={`font-sans text-sm ${step.completed ? 'line-through text-(--text-faint)' : 'text-(--text-primary)'}`}>
                    {step.label}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-(--text-faint)">Step {step.orderIndex + 1}</span>
                </div>
              ))}
            </div>

            {selected.status !== 'COMPLETED' && (
              <Button variant="primary" className="w-full" disabled={stepSaving}
                onClick={() => setCompleteConfirmOpen(true)}>
                {stepSaving ? 'Saving…' : 'Mark Onboarding Complete'}
              </Button>
            )}
            {selected.status === 'COMPLETED' && (
              <div className="p-3 bg-(--status-success-bg) border border-(--status-success-border) rounded-xl text-xs text-(--status-success) flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Onboarding completed{selected.completedAt ? ` on ${new Date(selected.completedAt).toLocaleDateString()}` : ''}.
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Complete confirmation */}
      <ConfirmModal
        isOpen={completeConfirmOpen}
        onClose={() => { if (!completing) setCompleteConfirmOpen(false); }}
        onConfirm={handleComplete}
        title="Complete Onboarding"
        message={`Mark ${selected?.employee?.fullName}'s onboarding as fully completed? All remaining steps will be checked off and this cannot be undone.`}
        confirmLabel={completing ? 'Completing…' : 'Yes, Complete Onboarding'}
        variant="warning"
        icon={<CheckCircle2 className="w-6 h-6" />}
      />
    </motion.div>
  );
};
