'use client';

/**
 * HROffboardingView
 *
 * Has two screens rendered in-place (no modal):
 *   screen="list"     — the paginated dashboard (default)
 *   screen="initiate" — the "Initiate Offboarding" sub-view with employee
 *                       search, employee info, form fields, and a ConfirmModal
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  LogOut, CheckCircle2, Circle, AlertTriangle, Search,
  RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, Lock,
  User, Building2, Briefcase, MapPin, AlertCircle, Calendar,
} from 'lucide-react';
import {
  hrOffboardingApi, hrEmployeesApi, hrDepartmentsApi,
  type HROffboardingRecordApi, type HREmployeeApi, type HRDepartmentApi,
  EXIT_REASON_LABEL, type HRExitReason,
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
const STATUS_LABEL:   Record<string, string>                            = { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' };
const STATUS_VARIANT: Record<string, 'glass'|'gold'|'emerald'>         = { NOT_STARTED: 'glass', IN_PROGRESS: 'gold', COMPLETED: 'emerald' };
const DEFAULT_ASSETS = ['Laptop', 'ID Card', 'Access Card', 'Office Keys', 'Mobile Phone', 'Parking Pass'];
const PER_PAGE     = 12;
const EMP_PER_PAGE = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-view: Initiate Offboarding
// ─────────────────────────────────────────────────────────────────────────────

interface InitiateOffboardingViewProps {
  onBack:    () => void;
  onSuccess: () => void;
}

const InitiateOffboardingView: React.FC<InitiateOffboardingViewProps> = ({ onBack, onSuccess }) => {
  const [empSearch,    setEmpSearch]    = useState('');
  const [empPage,      setEmpPage]      = useState(1);
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [depts,        setDepts]        = useState<HRDepartmentApi[]>([]);
  const [empList,      setEmpList]      = useState<HREmployeeApi[]>([]);
  const [empTotal,     setEmpTotal]     = useState(0);
  const [empLoading,   setEmpLoading]   = useState(false);
  const [selectedEmp,  setSelectedEmp]  = useState<HREmployeeApi | null>(null);

  // Form fields
  const [lastWorkingDay, setLastWorkingDay] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [exitReason,    setExitReason]    = useState<HRExitReason>('RESIGNATION');
  const [customAssets,  setCustomAssets]  = useState('');

  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
  }, []);

  const loadEmps = useCallback(async (p = empPage) => {
    setEmpLoading(true);
    try {
      const offboarded = await hrOffboardingApi.list({ page: 1, limit: 500 });
      const offIds = new Set(offboarded.records.map(r => r.employeeId));

      const res = await hrEmployeesApi.list({
        page: p, limit: EMP_PER_PAGE,
        search:       empSearch  || undefined,
        departmentId: deptFilter !== 'All' ? deptFilter : undefined,
      });
      // Only show ACTIVE / ON_LEAVE employees not already being offboarded
      const eligible = res.employees.filter(
        e => !offIds.has(e.id) && e.status !== 'TERMINATED' && e.status !== 'INACTIVE'
      );
      setEmpList(eligible);
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

  const extraAssets = customAssets.split(',').map(s => s.trim()).filter(Boolean);
  const allAssets   = [...DEFAULT_ASSETS, ...extraAssets];

  const handleConfirm = async () => {
    if (!selectedEmp) return;
    setSaving(true); setSaveError('');
    try {
      await hrOffboardingApi.start({
        employeeId:    selectedEmp.id,
        lastWorkingDay,
        exitReason,
        ...(extraAssets.length && { customAssets: extraAssets }),
      });
      setConfirmOpen(false);
      onSuccess();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to initiate offboarding');
    } finally {
      setSaving(false);
    }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';
  const inputSel  = 'w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)';

  return (
    <motion.div
      key="initiate-offboarding"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      {/* Breadcrumb */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-(--text-faint) hover:text-(--text-secondary) transition-colors mb-3 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Offboarding
        </button>

        <DHPageHeader
          title="Initiate Offboarding"
          subtitle="Search for an employee, fill in the details, and begin their offboarding process"
          icon={<LogOut className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Employee search ───────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input icon={<Search className="w-4 h-4" />}
                placeholder="Search by name, employee ID, or email…"
                value={empSearch} onChange={e => handleEmpSearch(e.target.value)} />
            </div>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setEmpPage(1); }} className={filterSel}>
              <option value="All">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>)}
            </select>
          </div>

          {empLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-(--hover-overlay) rounded-xl animate-pulse border border-(--border-subtle)" />
              ))}
            </div>
          ) : empList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-(--border-default) rounded-2xl text-(--text-faint) text-sm">
              No eligible employees found.
            </div>
          ) : (
            <div className="space-y-2">
              {empList.map(emp => {
                const isSelected = selectedEmp?.id === emp.id;
                return (
                  <button key={emp.id} onClick={() => setSelectedEmp(isSelected ? null : emp)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-(--accent-gold-subtle) border-(--brand-gold)'
                        : 'bg-(--hover-overlay) border-(--border-default) hover:border-(--border-strong)'
                    }`}>
                    <img src={emp.avatarUrl ?? '/tigist.png'} alt={emp.fullName}
                      className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-sans text-sm font-semibold truncate ${isSelected ? 'text-(--brand-gold)' : 'text-(--text-primary)'}`}>
                        {emp.fullName}
                      </p>
                      <p className="font-sans text-xs text-(--text-muted) truncate">{emp.position}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{emp.employeeCode}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={emp.status === 'ACTIVE' ? 'emerald' : 'amber'} className="text-[9px]">
                        {(EMPLOYEE_STATUS_LABEL as Record<string,string>)[emp.status] ?? emp.status}
                      </Badge>
                      {emp.department && (
                        <span className="text-[10px] font-mono text-(--text-faint)">{emp.department.name.split(' ')[0]}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

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

        {/* ── Right: employee info + form ───────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          {selectedEmp ? (
            <motion.div key={selectedEmp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-4">

              {/* Employee card */}
              <div className="p-5 ds-card rounded-2xl border border-(--border-default) space-y-4">
                <div className="flex items-center gap-4">
                  <img src={selectedEmp.avatarUrl ?? '/tigist.png'} alt={selectedEmp.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-(--status-warning)/30" />
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
                    { icon: <Calendar className="w-3 h-3" />,  label: 'Hired',      val: new Date(selectedEmp.hireDate).toLocaleDateString() },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-(--text-faint) mb-0.5">{icon} {label}</p>
                      <p className="font-semibold text-(--text-primary) truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offboarding form */}
              <div className="p-4 ds-card rounded-2xl border border-(--border-default) space-y-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Offboarding Details</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Last Working Day <span className="text-(--status-danger)">*</span>
                  </label>
                  <input type="date" value={lastWorkingDay}
                    onChange={e => setLastWorkingDay(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className={inputSel} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Exit Reason <span className="text-(--status-danger)">*</span>
                  </label>
                  <select value={exitReason} onChange={e => setExitReason(e.target.value as HRExitReason)} className={inputSel}>
                    {(Object.entries(EXIT_REASON_LABEL) as [HRExitReason, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Additional Assets to Return
                    <span className="ml-1 text-(--text-faint) font-normal">(comma-separated, optional)</span>
                  </label>
                  <input type="text" placeholder="e.g. Printer, Hard Drive, Uniform"
                    value={customAssets} onChange={e => setCustomAssets(e.target.value)}
                    className={inputSel} />
                </div>
              </div>

              {/* Asset checklist preview */}
              <div className="p-4 ds-card rounded-2xl border border-(--border-default) space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) mb-2">
                  Asset checklist ({allAssets.length} items)
                </p>
                {allAssets.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <Circle className="w-3.5 h-3.5 text-(--text-faint) shrink-0" />
                    <span className="text-(--text-secondary)">{item}</span>
                    {i >= DEFAULT_ASSETS.length && (
                      <Badge variant="glass" className="text-[9px] ml-auto">Custom</Badge>
                    )}
                  </div>
                ))}
              </div>

              {saveError && (
                <div className="flex items-start gap-2 p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}

              <Button variant="danger" className="w-full" icon={<LogOut className="w-4 h-4" />}
                disabled={!lastWorkingDay}
                onClick={() => { setSaveError(''); setConfirmOpen(true); }}>
                Initiate Offboarding for {selectedEmp.fullName.split(' ')[0]}
              </Button>
            </motion.div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-(--border-default) rounded-2xl text-center px-6 space-y-2">
              <LogOut className="w-10 h-10 text-(--text-faint)" />
              <p className="font-sans text-sm text-(--text-secondary) font-medium">Select an employee</p>
              <p className="font-sans text-xs text-(--text-faint)">
                Choose an employee from the list, then fill in the offboarding details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation modal ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { if (!saving) setConfirmOpen(false); }}
        onConfirm={handleConfirm}
        title="Initiate Offboarding"
        message={
          selectedEmp
            ? `Begin the offboarding process for ${selectedEmp.fullName} (${selectedEmp.employeeCode})?\n\nLast working day: ${new Date(lastWorkingDay).toLocaleDateString()}\nExit reason: ${EXIT_REASON_LABEL[exitReason]}\n\nThe employee's account will be set to INACTIVE immediately. Final termination happens after all assets are returned.`
            : ''
        }
        confirmLabel={saving ? 'Initiating…' : 'Yes, Initiate Offboarding'}
        variant="danger"
        icon={<LogOut className="w-6 h-6" />}
      />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────────

export const HROffboardingView: React.FC = () => {
  // ── Screens ───────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<'list' | 'initiate'>('list');

  // ── List state ────────────────────────────────────────────────────────────
  const [records,   setRecords]   = useState<HROffboardingRecordApi[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page,         setPage]         = useState(1);
  const [depts,        setDepts]        = useState<HRDepartmentApi[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detail / confirm state ────────────────────────────────────────────────
  const [selected,       setSelected]       = useState<HROffboardingRecordApi | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<HROffboardingRecordApi | null>(null);
  const [finalizing,     setFinalizing]     = useState(false);

  useEffect(() => {
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
  }, []);

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

  const toggleAsset = async (asset: HROffboardingRecordApi['assetChecklist'][0]) => {
    if (!selected || selected.status === 'COMPLETED') return;
    try {
      const updated = await hrOffboardingApi.updateAsset(selected.id, asset.id, { returned: !asset.returned });
      if (updated) { setSelected(updated); setRecords(prev => prev.map(r => r.id === selected.id ? updated : r)); }
    } catch { /* fail silently */ }
  };

  const handleFinalize = async () => {
    if (!finalizeTarget) return;
    setFinalizing(true);
    try {
      await hrOffboardingApi.finalize(finalizeTarget.id);
      setFinalizeTarget(null);
      setSelected(null);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Finalization failed'); }
    finally { setFinalizing(false); }
  };

  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';

  // ── Render initiate screen ────────────────────────────────────────────────
  if (screen === 'initiate') {
    return (
      <InitiateOffboardingView
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
      key="offboarding-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Offboarding"
        subtitle={`${records.filter(r => r.status === 'IN_PROGRESS').length} in progress · ${total} total`}
        icon={<LogOut className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => load()}>Refresh</Button>
            <Button variant="danger" size="sm" icon={<LogOut className="w-4 h-4" />}
              onClick={() => setScreen('initiate')}>
              Initiate Offboarding
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
            {['All','IN_PROGRESS','COMPLETED','NOT_STARTED'].map(s => (
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
        <EmptyState variant="employees" description="No offboarding records match your filters."
          action={{ label: 'Initiate Offboarding', onClick: () => setScreen('initiate') }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map(rec => {
            const returned  = rec.assetChecklist.filter(a => a.returned).length;
            const assetTotal = rec.assetChecklist.length;
            const pct       = assetTotal > 0 ? Math.round((returned / assetTotal) * 100) : 0;
            const isComplete = rec.status === 'COMPLETED';
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
                        <p className="font-mono text-[10px] text-(--text-faint)">{rec.employee.department.name.split(' ')[0]}</p>
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
                    <p className="font-semibold text-(--text-secondary) mt-0.5">{EXIT_REASON_LABEL[rec.exitReason] ?? rec.exitReason}</p>
                  </div>
                  <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase text-(--text-faint)">Last Day</p>
                    <p className="font-semibold text-(--text-secondary) mt-0.5">{new Date(rec.lastWorkingDay).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-(--text-faint)">Assets returned: {returned}/{assetTotal}</span>
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
                <p className="font-semibold text-(--text-secondary) mt-0.5">{new Date(selected.lastWorkingDay).toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint)">Exit Reason</p>
                <p className="font-semibold text-(--text-secondary) mt-0.5">{EXIT_REASON_LABEL[selected.exitReason] ?? selected.exitReason}</p>
              </div>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-3">Asset Checklist</p>
              <div className="space-y-2">
                {selected.assetChecklist.map(asset => (
                  <div key={asset.id} onClick={() => toggleAsset(asset)}
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

      {/* Finalize confirmation */}
      <ConfirmModal
        isOpen={!!finalizeTarget}
        onClose={() => { if (!finalizing) setFinalizeTarget(null); }}
        onConfirm={handleFinalize}
        title="Finalize Offboarding"
        message={`Permanently set ${finalizeTarget?.employee?.fullName}'s status to TERMINATED and revoke all system access. This cannot be undone.`}
        confirmLabel={finalizing ? 'Finalizing…' : 'Finalize & Terminate'}
        icon={<Lock className="w-6 h-6" />}
        variant="danger"
      />
    </motion.div>
  );
};
