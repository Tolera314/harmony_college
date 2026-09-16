'use client';

/**
 * HRSalaryHistoryView
 * ─────────────────────────────────────────────────────────────────
 * Shows pay change timeline for all employees.
 * HR can pick an employee and record a new salary change.
 * Salary figures are masked by default (reveal-on-click, auto-hide after 30 s).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { TrendingUp, Eye, EyeOff, Plus, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  hrSalaryHistoryApi, hrEmployeesApi, hrContractRenewalApi,
  type HRSalaryHistoryEntry, type HREmployeeApi, type HRContractRenewalEntry,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Button }       from '../../ui/Button';
import { Input }        from '../../ui/Input';
import { SlidePanel }   from '../../ui/SlidePanel';
import { Badge }        from '../../ui/Badge';
import { SkeletonPage, ErrorState } from '../../ui/States';

// ── Masked number ─────────────────────────────────────────────────────────────
function Masked({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 30000);
    return () => clearTimeout(t);
  }, [show]);
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-semibold text-(--text-primary)">
        {show ? value : `ETB ${'•'.repeat(8)}`}
      </span>
      <button onClick={() => setShow(p => !p)} className="text-(--text-faint) hover:text-(--brand-gold) transition-colors">
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export const HRSalaryHistoryView: React.FC = () => {
  const [employees,    setEmployees]    = useState<HREmployeeApi[]>([]);
  const [selectedEmp,  setSelectedEmp]  = useState<HREmployeeApi | null>(null);
  const [history,      setHistory]      = useState<HRSalaryHistoryEntry[]>([]);
  const [renewals,     setRenewals]     = useState<HRContractRenewalEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');

  // Salary change modal
  const [salaryModal,  setSalaryModal]  = useState(false);
  const [salaryForm,   setSalaryForm]   = useState({
    effectiveDate: new Date().toISOString().slice(0, 10),
    basicSalary: 0, allowances: 0, deductions: 0, reason: '',
  });
  const [salaryError,  setSalaryError]  = useState('');
  const [saving,       setSaving]       = useState(false);

  // Contract renewal modal
  const [renewModal,   setRenewModal]   = useState(false);
  const [renewForm,    setRenewForm]    = useState({ newEndDate: '', reason: '' });
  const [renewError,   setRenewError]   = useState('');

  // Active sub-tab: 'salary' | 'contracts'
  const [subTab,       setSubTab]       = useState<'salary' | 'contracts'>('salary');

  // ── Load employees list ──────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await hrEmployeesApi.list({ limit: 200 });
      setEmployees(res.employees);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load employees'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // ── Load salary history + renewals for selected employee ─────────────────
  const loadDetail = useCallback(async (emp: HREmployeeApi) => {
    setDetailLoading(true);
    try {
      const [sh, cr] = await Promise.all([
        hrSalaryHistoryApi.list(emp.id),
        hrContractRenewalApi.list(emp.id),
      ]);
      setHistory(sh.history);
      setRenewals(cr.renewals);
      // Pre-fill salary modal with current values
      setSalaryForm(f => ({ ...f, basicSalary: emp.basicSalary, allowances: emp.allowances, deductions: emp.deductions }));
    } catch { /* keep empty */ }
    finally { setDetailLoading(false); }
  }, []);

  const selectEmployee = (emp: HREmployeeApi) => {
    setSelectedEmp(emp);
    loadDetail(emp);
    setSubTab('salary');
  };

  // ── Submit salary change ──────────────────────────────────────────────────
  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSalaryError('');
    try {
      if (!selectedEmp) return;
      await hrSalaryHistoryApi.record(selectedEmp.id, salaryForm);
      setSalaryModal(false);
      loadDetail(selectedEmp);
      // Refresh employee list to show updated salary badge
      loadEmployees();
    } catch (err) { setSalaryError(err instanceof Error ? err.message : 'Failed to save salary change'); }
    finally { setSaving(false); }
  };

  // ── Submit contract renewal ───────────────────────────────────────────────
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setRenewError('');
    try {
      if (!selectedEmp) return;
      await hrContractRenewalApi.renew(selectedEmp.id, renewForm);
      setRenewModal(false);
      loadDetail(selectedEmp);
      loadEmployees();
    } catch (err) { setRenewError(err instanceof Error ? err.message : 'Failed to renew contract'); }
    finally { setSaving(false); }
  };

  // ── Filtered employee list ────────────────────────────────────────────────
  const filtered = employees.filter(e =>
    !search || e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const sel = 'w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)';

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={loadEmployees} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Salary History & Contract Renewals"
        subtitle="Full pay change audit trail · contract renewal log"
        icon={<TrendingUp className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Employee list panel ─────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-3">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search employee…"
            value={search} onChange={e => setSearch(e.target.value)} />

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map(emp => {
              const isSelected = selectedEmp?.id === emp.id;
              return (
                <button key={emp.id} onClick={() => selectEmployee(emp)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${isSelected ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border)' : 'bg-(--hover-overlay) border-(--border-subtle) hover:border-(--brand-gold)/30'}`}>
                  <img src={emp.avatarUrl ?? '/tigist.png'} alt="" className="w-9 h-9 rounded-full border border-(--border-default) shrink-0 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-sans text-xs font-semibold truncate ${isSelected ? 'text-(--brand-gold)' : 'text-(--text-primary)'}`}>{emp.fullName}</p>
                    <p className="font-mono text-[10px] text-(--text-faint) truncate">{emp.employeeCode} · {emp.position.split(',')[0]}</p>
                  </div>
                  {emp.contractStatus === 'EXPIRING_SOON' && (
                    <Badge variant="amber" className="text-[9px] shrink-0">Expiring</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detail panel ────────────────────────────────────────────── */}
        <div className="lg:col-span-8">
          {!selectedEmp ? (
            <div className="h-64 flex items-center justify-center border border-dashed border-(--border-default) rounded-2xl text-(--text-faint) text-sm">
              Select an employee to view their history
            </div>
          ) : (
            <div className="space-y-4">
              {/* Employee header + actions */}
              <div className="flex items-center gap-4 p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl">
                <img src={selectedEmp.avatarUrl ?? '/tigist.png'} alt="" className="w-12 h-12 rounded-xl border border-(--border-default) object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-bold text-(--text-primary)">{selectedEmp.fullName}</p>
                  <p className="text-xs text-(--text-muted)">{selectedEmp.position} · {selectedEmp.department?.name.split(' ')[0]}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="font-mono text-[11px] text-(--text-faint)">
                      Current: ETB {(selectedEmp.basicSalary + selectedEmp.allowances).toLocaleString()} gross
                    </span>
                    {selectedEmp.contractEndDate && (
                      <span className="font-mono text-[11px] text-(--text-faint)">
                        · Contract ends {new Date(selectedEmp.contractEndDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => { setRenewModal(true); setRenewError(''); setRenewForm({ newEndDate: '', reason: '' }); }}>
                    Renew Contract
                  </Button>
                  <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
                    onClick={() => { setSalaryModal(true); setSalaryError(''); }}>
                    Record Salary Change
                  </Button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2">
                {(['salary', 'contracts'] as const).map(t => (
                  <button key={t} onClick={() => setSubTab(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${subTab === t ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'}`}>
                    {t === 'salary' ? `Salary History (${history.length})` : `Contract Renewals (${renewals.length})`}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-xs text-(--text-faint) animate-pulse">Loading…</div>
              ) : subTab === 'salary' ? (
                /* ── Salary history timeline ── */
                history.length === 0 ? (
                  <div className="py-12 text-center text-sm text-(--text-faint) border border-dashed border-(--border-default) rounded-2xl">
                    No salary changes recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-(--border-default)" />
                    {history.map((entry, idx) => {
                      const prev = history[idx + 1];
                      const delta = prev ? entry.grossSalary - prev.grossSalary : 0;
                      return (
                        <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          className="relative p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                          <div className="absolute -left-6 top-4 w-3 h-3 rounded-full bg-[#E9C349] border-2 border-(--bg-base)" />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-mono text-[11px] text-(--brand-gold) font-bold">
                                  {new Date(entry.effectiveDate).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                                </p>
                                {prev && delta !== 0 && (
                                  <span className={`flex items-center gap-0.5 font-mono text-[10px] font-semibold ${delta > 0 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                                    {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    ETB {Math.abs(delta).toLocaleString()}
                                  </span>
                                )}
                                {idx === 0 && <Badge variant="gold" className="text-[9px]">Current</Badge>}
                              </div>
                              {entry.reason && (
                                <p className="text-xs text-(--text-secondary) italic mb-2">&ldquo;{entry.reason}&rdquo;</p>
                              )}
                              <p className="text-[10px] text-(--text-faint)">By {entry.changedByName}</p>
                            </div>
                            <div className="text-right space-y-1 shrink-0">
                              <div><p className="font-mono text-[10px] text-(--text-faint)">Gross</p><Masked value={`ETB ${entry.grossSalary.toLocaleString()}`} /></div>
                              <div className="flex gap-3 text-[10px] font-mono text-(--text-faint)">
                                <span>Basic: {entry.basicSalary.toLocaleString()}</span>
                                <span>Allow: {entry.allowances.toLocaleString()}</span>
                                <span>Deduct: {entry.deductions.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* ── Contract renewals ── */
                renewals.length === 0 ? (
                  <div className="py-12 text-center text-sm text-(--text-faint) border border-dashed border-(--border-default) rounded-2xl">
                    No contract renewals recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-(--border-default)" />
                    {renewals.map((r, idx) => (
                      <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        className="relative p-4 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                        <div className="absolute -left-6 top-4 w-3 h-3 rounded-full bg-emerald-400 border-2 border-(--bg-base)" />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-mono text-[11px] text-emerald-400 font-bold">
                                {new Date(r.approvedAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                              </p>
                              {idx === 0 && <Badge variant="emerald" className="text-[9px]">Latest</Badge>}
                            </div>
                            <div className="font-sans text-xs text-(--text-secondary) space-y-0.5">
                              <p>Previous end: <span className="font-semibold text-(--text-primary)">{new Date(r.previousEndDate).toLocaleDateString()}</span></p>
                              <p>New end: <span className="font-semibold text-(--status-success)">{new Date(r.newEndDate).toLocaleDateString()}</span></p>
                              {r.reason && <p className="italic text-(--text-faint)">&ldquo;{r.reason}&rdquo;</p>}
                            </div>
                            <p className="text-[10px] text-(--text-faint) mt-1">Approved by {r.approvedByName}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Record Salary SlidePanel ────────────────────────────── */}
      <SlidePanel
        isOpen={salaryModal}
        onClose={() => setSalaryModal(false)}
        title={`Record Salary Change — ${selectedEmp?.fullName ?? ''}`}
        subtitle={selectedEmp?.employeeCode}
        width="max-w-md"
      >
        {selectedEmp && (
          <form onSubmit={handleSalarySubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {salaryError && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">{salaryError}</p>}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Effective Date *</label>
                <input type="date" required value={salaryForm.effectiveDate}
                  onChange={e => setSalaryForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-secondary)">Basic Salary (ETB) *</label>
                  <input type="number" min="0" required value={String(salaryForm.basicSalary)}
                    onChange={e => setSalaryForm(f => ({ ...f, basicSalary: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-secondary)">Allowances (ETB)</label>
                  <input type="number" min="0" value={String(salaryForm.allowances)}
                    onChange={e => setSalaryForm(f => ({ ...f, allowances: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-secondary)">Deductions (ETB)</label>
                  <input type="number" min="0" value={String(salaryForm.deductions)}
                    onChange={e => setSalaryForm(f => ({ ...f, deductions: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
                </div>
              </div>
              <div className="px-3 py-2 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl font-mono text-sm text-(--brand-gold)">
                New gross: ETB {(salaryForm.basicSalary + salaryForm.allowances).toLocaleString()}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Reason</label>
                <input type="text" placeholder="e.g. Annual increment, Promotion…"
                  value={salaryForm.reason} onChange={e => setSalaryForm(f => ({ ...f, reason: e.target.value }))}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
              </div>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-(--border-default) bg-(--bg-modal) flex gap-3 justify-end">
              <Button variant="secondary" type="button" onClick={() => setSalaryModal(false)}>Cancel</Button>
              <Button variant="gold" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record Change'}</Button>
            </div>
          </form>
        )}
      </SlidePanel>

      {/* ── Contract Renewal SlidePanel ─────────────────────────── */}
      <SlidePanel
        isOpen={renewModal}
        onClose={() => setRenewModal(false)}
        title={`Renew Contract — ${selectedEmp?.fullName ?? ''}`}
        subtitle={selectedEmp?.contractEndDate
          ? `Current end: ${new Date(selectedEmp.contractEndDate).toLocaleDateString()}`
          : 'No current contract end date'}
        width="max-w-md"
      >
        {selectedEmp && (
          <form onSubmit={handleRenewSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {renewError && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">{renewError}</p>}
              {selectedEmp.contractEndDate && (
                <p className="text-xs text-(--text-secondary) bg-(--hover-overlay) p-3 rounded-xl border border-(--border-subtle)">
                  Current end date: <span className="font-semibold text-(--text-primary)">{new Date(selectedEmp.contractEndDate).toLocaleDateString()}</span>
                </p>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">New End Date *</label>
                <input type="date" required value={renewForm.newEndDate}
                  onChange={e => setRenewForm(f => ({ ...f, newEndDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Reason</label>
                <input type="text" placeholder="e.g. Performance satisfactory, budget approved…"
                  value={renewForm.reason} onChange={e => setRenewForm(f => ({ ...f, reason: e.target.value }))}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
              </div>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-(--border-default) bg-(--bg-modal) flex gap-3 justify-end">
              <Button variant="secondary" type="button" onClick={() => setRenewModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Renewing…' : 'Renew Contract'}</Button>
            </div>
          </form>
        )}
      </SlidePanel>

    </motion.div>
  );
};
