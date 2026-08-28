'use client';

/**
 * HROnboardingView — proper dashboard with server-side search, filters, pagination
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { UserPlus, CheckCircle2, Circle, Search, RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  hrOnboardingApi, hrEmployeesApi, hrDepartmentsApi,
  type HROnboardingRecordApi, type HREmployeeApi, type HRDepartmentApi,
} from '../../../lib/hrApi';
import { DHPageHeader }  from '../../dh/DHPageHeader';
import { Card }          from '../../ui/Card';
import { Badge }         from '../../ui/Badge';
import { Button }        from '../../ui/Button';
import { Input }         from '../../ui/Input';
import { Modal }         from '../../ui/Modal';
import { SlidePanel }    from '../../ui/SlidePanel';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_LABEL:   Record<string, string>                              = { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', ON_HOLD: 'On Hold' };
const STATUS_VARIANT: Record<string, 'glass'|'gold'|'emerald'|'amber'>   = { NOT_STARTED: 'glass', IN_PROGRESS: 'gold', COMPLETED: 'emerald', ON_HOLD: 'amber' };
const PER_PAGE = 12;

// ─────────────────────────────────────────────────────────────────────────────

export const HROnboardingView: React.FC = () => {
  // ── List state ───────────────────────────────────────────────────────────
  const [records,   setRecords]   = useState<HROnboardingRecordApi[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // ── Filter / search / pagination state ───────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page,         setPage]         = useState(1);
  const [depts,        setDepts]        = useState<HRDepartmentApi[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Panel / modal state ───────────────────────────────────────────────────
  const [selected,      setSelected]      = useState<HROnboardingRecordApi | null>(null);
  const [stepSaving,    setStepSaving]    = useState(false);
  const [startModal,    setStartModal]    = useState(false);
  const [startEmpId,    setStartEmpId]    = useState('');
  const [startSaving,   setStartSaving]   = useState(false);
  const [startError,    setStartError]    = useState('');
  const [eligibleEmps,  setEligibleEmps]  = useState<HREmployeeApi[]>([]);

  // ── Load departments once ─────────────────────────────────────────────────
  useEffect(() => {
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
  }, []);

  // ── Main load ─────────────────────────────────────────────────────────────
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

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1), 350);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  // ── Refresh selected record ───────────────────────────────────────────────
  const refreshSelected = async (employeeId: string) => {
    try {
      const updated = await hrOnboardingApi.getByEmployee(employeeId);
      setSelected(updated);
      setRecords(prev => prev.map(r => r.employeeId === employeeId ? updated : r));
    } catch { /* keep stale */ }
  };

  // ── Step toggle ───────────────────────────────────────────────────────────
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
    setStepSaving(true);
    try {
      await hrOnboardingApi.complete(selected.employeeId);
      await refreshSelected(selected.employeeId);
      load();
    } catch { /* fail silently */ }
    finally { setStepSaving(false); }
  };

  // ── Start onboarding ──────────────────────────────────────────────────────
  const openStartModal = async () => {
    setStartError(''); setStartEmpId('');
    try {
      // Load employees without onboarding records
      const onboardedIds = new Set(records.map(r => r.employeeId));
      const all = await hrOnboardingApi.list({ page: 1, limit: 200 });
      const allIds = new Set(all.records.map(r => r.employeeId));
      const emps = await hrEmployeesApi.list({ limit: 200, status: 'ACTIVE' });
      setEligibleEmps(emps.employees.filter(e => !allIds.has(e.id)));
    } catch { setEligibleEmps([]); }
    setStartModal(true);
  };

  const handleStart = async () => {
    if (!startEmpId) { setStartError('Please select an employee'); return; }
    setStartSaving(true); setStartError('');
    try {
      await hrOnboardingApi.start(startEmpId);
      setStartModal(false);
      setPage(1);
      load(1);
    } catch (e) { setStartError(e instanceof Error ? e.message : 'Failed'); }
    finally { setStartSaving(false); }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';

  return (
    <div className="space-y-6 pb-16">
      <DHPageHeader
        title="Onboarding"
        subtitle={`${records.filter(r => r.status === 'IN_PROGRESS').length} in progress · ${total} total`}
        icon={<UserPlus className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={openStartModal}>
              Start Onboarding
            </Button>
          </div>
        }
      />

      {/* ── Search + Filters ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by name, employee ID, email, or position…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
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

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <SkeletonPage />
      ) : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : records.length === 0 ? (
        <EmptyState variant="employees" description="No onboarding records match your filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map(rec => {
            const completed = rec.steps.filter(s => s.completed).length;
            const total     = rec.steps.length;
            const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <Card key={rec.id} hoverable className="space-y-4 cursor-pointer"
                onClick={() => setSelected(rec)}>
                {/* Employee */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={rec.employee?.avatarUrl ?? '/tigist.png'} alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">
                        {rec.employee?.fullName}
                      </p>
                      <p className="font-sans text-xs text-(--text-muted) truncate">
                        {rec.employee?.position}
                      </p>
                      {rec.employee?.department && (
                        <p className="font-mono text-[10px] text-(--text-faint) truncate">
                          {rec.employee.department.name.split(' ')[0]}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[rec.status] ?? 'glass'} className="shrink-0">
                    {STATUS_LABEL[rec.status] ?? rec.status}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-(--text-faint)">{completed}/{total} steps</span>
                    <span className="text-(--brand-gold)">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div className="h-full bg-[#E9C349] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Step dots */}
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

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">
            {total} records · Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="secondary" size="sm"
              icon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail SlidePanel ────────────────────────────────────────────── */}
      <SlidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Onboarding — ${selected?.employee?.fullName}`}
        subtitle={selected?.employee?.employeeCode}
        width="max-w-lg"
      >
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

            {/* Checklist */}
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
                  <span className="ml-auto font-mono text-[10px] text-(--text-faint)">
                    Step {step.orderIndex + 1}
                  </span>
                </div>
              ))}
            </div>

            {selected.status !== 'COMPLETED' && (
              <Button variant="primary" className="w-full" disabled={stepSaving}
                onClick={handleComplete}>
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

      {/* ── Start Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={startModal} onClose={() => setStartModal(false)}
        title="Start Employee Onboarding" maxWidth="max-w-sm">
        <div className="space-y-4">
          {startError && (
            <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">
              {startError}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Select Employee</label>
            <select value={startEmpId} onChange={e => setStartEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">— Select Employee —</option>
              {eligibleEmps.map(e => (
                <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStartModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1"
              disabled={startSaving || !startEmpId} onClick={handleStart}>
              {startSaving ? 'Starting…' : 'Start Onboarding'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
