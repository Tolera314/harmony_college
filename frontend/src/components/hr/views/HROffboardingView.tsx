'use client';

/**
 * HROffboardingView — proper dashboard with server-side search, filters, pagination
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  LogOut, CheckCircle2, Circle, AlertTriangle, Plus,
  Lock, Search, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  hrOffboardingApi, hrEmployeesApi, hrDepartmentsApi,
  type HROffboardingRecordApi, type HREmployeeApi, type HRDepartmentApi,
  EXIT_REASON_LABEL, type HRExitReason,
} from '../../../lib/hrApi';
import { DHPageHeader }  from '../../dh/DHPageHeader';
import { Card }          from '../../ui/Card';
import { Badge }         from '../../ui/Badge';
import { Button }        from '../../ui/Button';
import { Input }         from '../../ui/Input';
import { Modal }         from '../../ui/Modal';
import { SlidePanel }    from '../../ui/SlidePanel';
import { ConfirmModal }  from '../../ui/ConfirmModal';
import { SkeletonPage, ErrorState, EmptyState } from '../../ui/States';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_LABEL:   Record<string, string>                            = { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' };
const STATUS_VARIANT: Record<string, 'glass'|'gold'|'emerald'>         = { NOT_STARTED: 'glass', IN_PROGRESS: 'gold', COMPLETED: 'emerald' };
const PER_PAGE = 12;

// ─────────────────────────────────────────────────────────────────────────────

export const HROffboardingView: React.FC = () => {
  // ── List state ────────────────────────────────────────────────────────────
  const [records,   setRecords]   = useState<HROffboardingRecordApi[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // ── Filter / search / pagination ──────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page,         setPage]         = useState(1);
  const [depts,        setDepts]        = useState<HRDepartmentApi[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Panel / modal state ───────────────────────────────────────────────────
  const [selected,        setSelected]        = useState<HROffboardingRecordApi | null>(null);
  const [finalizeTarget,  setFinalizeTarget]  = useState<HROffboardingRecordApi | null>(null);
  const [startModal,      setStartModal]      = useState(false);
  const [startSaving,     setStartSaving]     = useState(false);
  const [startError,      setStartError]      = useState('');
  const [eligibleEmps,    setEligibleEmps]    = useState<HREmployeeApi[]>([]);
  const [startForm,       setStartForm]       = useState({
    employeeId: '', lastWorkingDay: new Date().toISOString().slice(0, 10),
    exitReason: 'RESIGNATION' as HRExitReason, customAssets: '',
  });

  // ── Load departments once ─────────────────────────────────────────────────
  useEffect(() => {
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
  }, []);

  // ── Main load ─────────────────────────────────────────────────────────────
  const load = useCallback(async (p = page) => {
    setLoading(true); setError(null);
    try {
      const res = await hrOffboardingApi.list({
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

  // ── Refresh selected ──────────────────────────────────────────────────────
  const refreshSelected = async (recordId: string) => {
    try {
      const all = await hrOffboardingApi.list({ page: 1, limit: 200 });
      const updated = all.records.find(r => r.id === recordId);
      if (updated) { setSelected(updated); setRecords(prev => prev.map(r => r.id === recordId ? updated : r)); }
    } catch { /* keep stale */ }
  };

  // ── Toggle asset ──────────────────────────────────────────────────────────
  const toggleAsset = async (asset: HROffboardingRecordApi['assetChecklist'][0]) => {
    if (!selected || selected.status === 'COMPLETED') return;
    try {
      const updated = await hrOffboardingApi.updateAsset(selected.id, asset.id, { returned: !asset.returned });
      if (updated) { setSelected(updated); setRecords(prev => prev.map(r => r.id === selected.id ? updated : r)); }
    } catch { /* fail silently */ }
  };

  // ── Finalize ──────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    if (!finalizeTarget) return;
    try {
      await hrOffboardingApi.finalize(finalizeTarget.id);
      setFinalizeTarget(null);
      setSelected(null);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Finalization failed'); }
  };

  // ── Start offboarding ─────────────────────────────────────────────────────
  const openStart = async () => {
    setStartError('');
    setStartForm({ employeeId: '', lastWorkingDay: new Date().toISOString().slice(0, 10), exitReason: 'RESIGNATION', customAssets: '' });
    try {
      const allIds = new Set(records.map(r => r.employeeId));
      const emps = await hrEmployeesApi.list({ limit: 200, status: 'ACTIVE' });
      setEligibleEmps(emps.employees.filter(e => !allIds.has(e.id)));
    } catch { setEligibleEmps([]); }
    setStartModal(true);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault(); setStartSaving(true); setStartError('');
    try {
      const extras = startForm.customAssets.split(',').map(s => s.trim()).filter(Boolean);
      await hrOffboardingApi.start({
        employeeId:    startForm.employeeId,
        lastWorkingDay: startForm.lastWorkingDay,
        exitReason:    startForm.exitReason,
        ...(extras.length && { customAssets: extras }),
      });
      setStartModal(false);
      setPage(1);
      load(1);
    } catch (err) { setStartError(err instanceof Error ? err.message : 'Failed'); }
    finally { setStartSaving(false); }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';
  const inputSel  = 'w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)';

  return (
    <div className="space-y-6 pb-16">
      <DHPageHeader
        title="Offboarding"
        subtitle={`${records.filter(r => r.status === 'IN_PROGRESS').length} in progress · ${total} total`}
        icon={<LogOut className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openStart}>
              Initiate Offboarding
            </Button>
          </div>
        }
      />

      {/* ── Search + Filters ────────────────────────────────────────────── */}
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
            {['All','IN_PROGRESS','COMPLETED','NOT_STARTED'].map(s => (
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
        <EmptyState variant="employees" description="No offboarding records match your filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map(rec => {
            const returned = rec.assetChecklist.filter(a => a.returned).length;
            const total    = rec.assetChecklist.length;
            const pct      = total > 0 ? Math.round((returned / total) * 100) : 0;
            const isComplete = rec.status === 'COMPLETED';
            return (
              <Card key={rec.id} hoverable className="space-y-4 cursor-pointer"
                onClick={() => setSelected(rec)}>
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
                        <p className="font-mono text-[10px] text-(--text-faint)">
                          {rec.employee.department.name.split(' ')[0]}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[rec.status] ?? 'glass'} className="shrink-0">
                    {STATUS_LABEL[rec.status] ?? rec.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase text-(--text-faint)">Exit Reason</p>
                    <p className="font-semibold text-(--text-secondary) mt-0.5">
                      {EXIT_REASON_LABEL[rec.exitReason] ?? rec.exitReason}
                    </p>
                  </div>
                  <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase text-(--text-faint)">Last Day</p>
                    <p className="font-semibold text-(--text-secondary) mt-0.5">
                      {new Date(rec.lastWorkingDay).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Asset progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-(--text-faint)">Assets returned: {returned}/{total}</span>
                    <span className={isComplete ? 'text-(--status-success)' : 'text-(--brand-gold)'}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-(--status-success)' : 'bg-[#E9C349]'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <Button variant="secondary" size="sm" className="w-full"
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                  onClick={e => { e.stopPropagation(); setSelected(rec); }}>
                  Manage
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
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

      {/* ── Detail SlidePanel ────────────────────────────────────────────── */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)}
        title={`Offboarding — ${selected?.employee?.fullName}`}
        subtitle={selected?.employee?.employeeCode} width="max-w-lg">
        {selected && (
          <div className="space-y-5 px-6 py-5">
            <div className="flex items-center gap-3">
              <img src={selected.employee?.avatarUrl ?? '/tigist.png'} alt=""
                className="w-12 h-12 rounded-xl border border-(--border-default) object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-(--text-primary)">{selected.employee?.fullName}</p>
                <p className="text-xs text-(--text-muted)">{selected.employee?.position}</p>
              </div>
              <Badge variant={STATUS_VARIANT[selected.status] ?? 'glass'}>
                {STATUS_LABEL[selected.status] ?? selected.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint)">Last Working Day</p>
                <p className="font-semibold text-(--text-secondary) mt-0.5">
                  {new Date(selected.lastWorkingDay).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint)">Exit Reason</p>
                <p className="font-semibold text-(--text-secondary) mt-0.5">
                  {EXIT_REASON_LABEL[selected.exitReason] ?? selected.exitReason}
                </p>
              </div>
            </div>

            {/* Asset checklist */}
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-3">Asset Checklist</p>
              <div className="space-y-2">
                {selected.assetChecklist.map(asset => (
                  <div key={asset.id}
                    onClick={() => toggleAsset(asset)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      asset.returned
                        ? 'bg-(--status-success-bg) border-(--status-success-border) hover:opacity-90'
                        : 'bg-(--hover-overlay) border-(--border-default) hover:bg-(--hover-overlay)'
                    } ${selected.status === 'COMPLETED' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {asset.returned
                      ? <CheckCircle2 className="w-4 h-4 text-(--status-success) shrink-0" />
                      : <Circle className="w-4 h-4 text-(--text-faint) shrink-0" />}
                    <span className={`font-sans text-sm flex-1 ${asset.returned ? 'line-through text-(--text-faint)' : 'text-(--text-primary)'}`}>
                      {asset.item}
                    </span>
                    {asset.notes && <span className="text-[10px] text-(--text-faint) italic">{asset.notes}</span>}
                  </div>
                ))}
              </div>
            </div>

            {selected.status === 'IN_PROGRESS' && (
              selected.assetChecklist.every(a => a.returned) ? (
                <Button variant="danger" className="w-full" icon={<Lock className="w-4 h-4" />}
                  onClick={() => setFinalizeTarget(selected)}>
                  Finalize Offboarding (Terminate Employee)
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl text-xs text-(--status-warning)">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  All assets must be returned before finalizing.
                </div>
              )
            )}

            {selected.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 p-3 bg-(--status-success-bg) border border-(--status-success-border) rounded-xl text-xs text-(--status-success)">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Offboarding completed. Employee is TERMINATED.
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* ── Start Offboarding Modal ──────────────────────────────────────── */}
      <Modal isOpen={startModal} onClose={() => setStartModal(false)}
        title="Initiate Offboarding" maxWidth="max-w-md">
        <form onSubmit={handleStart} className="space-y-4">
          {startError && (
            <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">
              {startError}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Employee *</label>
            <select required value={startForm.employeeId}
              onChange={e => setStartForm(f => ({ ...f, employeeId: e.target.value }))}
              className={inputSel}>
              <option value="">— Select Employee —</option>
              {eligibleEmps.map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Last Working Day *</label>
            <input type="date" required value={startForm.lastWorkingDay}
              onChange={e => setStartForm(f => ({ ...f, lastWorkingDay: e.target.value }))}
              className={inputSel} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Exit Reason *</label>
            <select value={startForm.exitReason}
              onChange={e => setStartForm(f => ({ ...f, exitReason: e.target.value as HRExitReason }))}
              className={inputSel}>
              {(Object.entries(EXIT_REASON_LABEL) as [HRExitReason, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">
              Additional Assets <span className="text-(--text-faint)">(comma-separated, optional)</span>
            </label>
            <input type="text" placeholder="e.g. Printer, Hard Drive"
              value={startForm.customAssets}
              onChange={e => setStartForm(f => ({ ...f, customAssets: e.target.value }))}
              className={inputSel} />
          </div>
          <p className="text-[10px] text-(--text-faint)">
            Default checklist: Laptop, ID Card, Access Card, Office Keys, Mobile Phone, Parking Pass.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setStartModal(false)}>Cancel</Button>
            <Button variant="danger" type="submit" className="flex-1" disabled={startSaving || !startForm.employeeId}>
              {startSaving ? 'Starting…' : 'Initiate Offboarding'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Finalize Confirm ─────────────────────────────────────────────── */}
      <ConfirmModal isOpen={!!finalizeTarget} onClose={() => setFinalizeTarget(null)} onConfirm={handleFinalize}
        title="Finalize Offboarding"
        message={`Permanently set ${finalizeTarget?.employee?.fullName}'s status to TERMINATED and revoke all access. This cannot be undone.`}
        icon={<Lock className="w-6 h-6" />} variant="danger" confirmLabel="Finalize & Terminate" />
    </div>
  );
};
