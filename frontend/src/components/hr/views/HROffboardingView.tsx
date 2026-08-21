'use client';

/**
 * HROffboardingView
 * ─────────────────────────────────────────────────────────────────
 * Manages employee departures:
 * - Initiate offboarding for an active employee
 * - Asset return checklist (toggle returned/not-returned)
 * - Finalize → sets employee status to TERMINATED
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  LogOut, CheckCircle2, Circle, AlertTriangle, Plus,
  Lock, ChevronRight,
} from 'lucide-react';
import {
  hrOffboardingApi, hrEmployeesApi,
  type HROffboardingRecordApi, type HREmployeeApi,
  EXIT_REASON_LABEL, type HRExitReason,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { SkeletonPage, ErrorState } from '../../ui/States';

const statusVariant: Record<string, 'glass' | 'gold' | 'emerald'> = {
  NOT_STARTED: 'glass', IN_PROGRESS: 'gold', COMPLETED: 'emerald',
};
const statusLabel: Record<string, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed',
};

export const HROffboardingView: React.FC = () => {
  const [records,       setRecords]       = useState<HROffboardingRecordApi[]>([]);
  const [employees,     setEmployees]     = useState<HREmployeeApi[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [selected,      setSelected]      = useState<HROffboardingRecordApi | null>(null);
  const [startModal,    setStartModal]    = useState(false);
  const [finalizeTarget, setFinalizeTarget] = useState<HROffboardingRecordApi | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [startError,    setStartError]    = useState('');

  const [startForm, setStartForm] = useState({
    employeeId:    '',
    lastWorkingDay: new Date().toISOString().slice(0, 10),
    exitReason:    'RESIGNATION' as HRExitReason,
    customAssets:  '',
  });

  // ── Load records + eligible employees ──────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [recs, emps] = await Promise.all([
        hrOffboardingApi.list(),
        hrEmployeesApi.list({ limit: 200, status: 'ACTIVE' }),
      ]);
      setRecords(recs);
      // Exclude employees already being offboarded
      const offboardedIds = new Set(recs.map(r => r.employeeId));
      setEmployees(emps.employees.filter(e => !offboardedIds.has(e.id)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load offboarding data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh selected record after an update
  const refreshSelected = async (recordId: string) => {
    const all = await hrOffboardingApi.list();
    setRecords(all);
    const updated = all.find(r => r.id === recordId);
    if (updated) setSelected(updated);
  };

  // ── Start offboarding ───────────────────────────────────────────────────
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setStartError('');
    try {
      const extras = startForm.customAssets
        .split(',').map(s => s.trim()).filter(Boolean);
      await hrOffboardingApi.start({
        employeeId:    startForm.employeeId,
        lastWorkingDay: startForm.lastWorkingDay,
        exitReason:    startForm.exitReason,
        ...(extras.length && { customAssets: extras }),
      });
      setStartModal(false);
      setStartForm({ employeeId: '', lastWorkingDay: new Date().toISOString().slice(0, 10), exitReason: 'RESIGNATION', customAssets: '' });
      load();
    } catch (err) { setStartError(err instanceof Error ? err.message : 'Failed to start offboarding'); }
    finally { setSaving(false); }
  };

  // ── Toggle asset return ─────────────────────────────────────────────────
  const handleToggleAsset = async (asset: { id: string; returned: boolean }) => {
    if (!selected || selected.status === 'COMPLETED') return;
    try {
      const updated = await hrOffboardingApi.updateAsset(selected.id, asset.id, { returned: !asset.returned });
      if (updated) setSelected(updated);
      setRecords(prev => prev.map(r => r.id === selected.id ? (updated ?? r) : r));
    } catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  };

  // ── Finalize ────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    if (!finalizeTarget) return;
    setSaving(true);
    try {
      await hrOffboardingApi.finalize(finalizeTarget.id);
      setFinalizeTarget(null);
      setSelected(null);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Finalization failed'); }
    finally { setSaving(false); }
  };

  const sel = 'w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)';

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  const inProgress  = records.filter(r => r.status === 'IN_PROGRESS').length;
  const completedCt = records.filter(r => r.status === 'COMPLETED').length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Offboarding"
        subtitle={`${inProgress} in progress · ${completedCt} completed`}
        icon={<LogOut className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
            onClick={() => { setStartModal(true); setStartError(''); }}>
            Initiate Offboarding
          </Button>
        }
      />

      {/* ── Records grid ─────────────────────────────────────────────── */}
      {records.length === 0 ? (
        <div className="py-16 text-center text-sm text-(--text-faint) border border-dashed border-(--border-default) rounded-2xl">
          No offboarding records. Click &ldquo;Initiate Offboarding&rdquo; to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map(rec => {
            const returned   = rec.assetChecklist.filter(a => a.returned).length;
            const total      = rec.assetChecklist.length;
            const pct        = total > 0 ? Math.round((returned / total) * 100) : 0;
            const isComplete = rec.status === 'COMPLETED';

            return (
              <Card key={rec.id} hoverable className="space-y-4 cursor-pointer" onClick={() => setSelected(rec)}>
                {/* Employee header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={rec.employee?.avatarUrl ?? '/tigist.png'} alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">{rec.employee?.fullName}</p>
                      <p className="font-sans text-xs text-(--text-muted) truncate">{rec.employee?.position}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[rec.status] ?? 'glass'} className="shrink-0">
                    {statusLabel[rec.status] ?? rec.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase text-(--text-faint)">Exit Reason</p>
                    <p className="font-semibold text-(--text-secondary) mt-0.5">{EXIT_REASON_LABEL[rec.exitReason]}</p>
                  </div>
                  <div className="p-2 bg-(--hover-overlay) rounded-lg border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase text-(--text-faint)">Last Day</p>
                    <p className="font-semibold text-(--text-secondary) mt-0.5">{new Date(rec.lastWorkingDay).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Asset checklist progress */}
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

                <Button variant="secondary" size="sm" className="w-full" icon={<ChevronRight className="w-3.5 h-3.5" />}
                  onClick={e => { e.stopPropagation(); setSelected(rec); }}>
                  Manage
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Detail SlidePanel ────────────────────────────────────────── */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)}
        title={`Offboarding — ${selected?.employee?.fullName}`} subtitle="HR Offboarding" width="max-w-lg">
        {selected && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="flex items-center gap-3">
              <img src={selected.employee?.avatarUrl ?? '/tigist.png'} alt=""
                className="w-12 h-12 rounded-xl border border-(--border-default) object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-(--text-primary)">{selected.employee?.fullName}</p>
                <p className="text-xs text-(--text-muted)">{selected.employee?.position}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={statusVariant[selected.status] ?? 'glass'}>{statusLabel[selected.status]}</Badge>
                  <Badge variant="glass" className="text-[10px]">{EXIT_REASON_LABEL[selected.exitReason]}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint)">Last Working Day</p>
                <p className="font-semibold text-(--text-secondary) mt-0.5">{new Date(selected.lastWorkingDay).toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase text-(--text-faint)">Assets Returned</p>
                <p className="font-semibold text-(--text-secondary) mt-0.5">
                  {selected.assetChecklist.filter(a => a.returned).length} / {selected.assetChecklist.length}
                </p>
              </div>
            </div>

            {/* Asset checklist */}
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-(--text-faint) mb-3">Asset Checklist</p>
              <div className="space-y-2">
                {selected.assetChecklist.map(asset => (
                  <div key={asset.id}
                    onClick={() => handleToggleAsset(asset)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      asset.returned
                        ? 'bg-(--status-success-bg) border-(--status-success-border) hover:opacity-90'
                        : 'bg-(--hover-overlay) border-(--border-default) hover:bg-(--hover-overlay)'
                    } ${selected.status === 'COMPLETED' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {asset.returned
                      ? <CheckCircle2 className="w-4 h-4 text-(--status-success) shrink-0" />
                      : <Circle className="w-4 h-4 text-(--text-faint) shrink-0" />
                    }
                    <span className={`font-sans text-sm flex-1 ${asset.returned ? 'line-through text-(--text-faint)' : 'text-(--text-primary)'}`}>
                      {asset.item}
                    </span>
                    {asset.notes && (
                      <span className="text-[10px] text-(--text-faint) italic">{asset.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Finalize button — only when all assets returned and not yet completed */}
            {selected.status === 'IN_PROGRESS' && (
              <>
                {selected.assetChecklist.every(a => a.returned) ? (
                  <Button variant="danger" className="w-full" icon={<Lock className="w-4 h-4" />}
                    onClick={() => setFinalizeTarget(selected)}>
                    Finalize Offboarding (Terminate Employee)
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl text-xs text-(--status-warning)">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    All assets must be returned before finalizing.
                  </div>
                )}
              </>
            )}

            {selected.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 p-3 bg-(--status-success-bg) border border-(--status-success-border) rounded-xl text-xs text-(--status-success)">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Offboarding completed. Employee status is now TERMINATED.
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* ── Start Offboarding Modal ───────────────────────────────────── */}
      <Modal isOpen={startModal} onClose={() => setStartModal(false)} title="Initiate Offboarding" maxWidth="max-w-md">
        <form onSubmit={handleStart} className="space-y-4">
          {startError && (
            <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">
              {startError}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Employee *</label>
            <select required value={startForm.employeeId}
              onChange={e => setStartForm(f => ({ ...f, employeeId: e.target.value }))} className={sel}>
              <option value="">— Select Employee —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Last Working Day *</label>
            <input type="date" required value={startForm.lastWorkingDay}
              onChange={e => setStartForm(f => ({ ...f, lastWorkingDay: e.target.value }))} className={sel} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Exit Reason *</label>
            <select value={startForm.exitReason}
              onChange={e => setStartForm(f => ({ ...f, exitReason: e.target.value as HRExitReason }))} className={sel}>
              {(Object.entries(EXIT_REASON_LABEL) as [HRExitReason, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">
              Additional Assets to Return <span className="text-(--text-faint)">(comma-separated, optional)</span>
            </label>
            <input type="text" placeholder="e.g. Printer, Hard Drive, Headset"
              value={startForm.customAssets}
              onChange={e => setStartForm(f => ({ ...f, customAssets: e.target.value }))} className={sel} />
          </div>
          <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary)">
            Default checklist includes: Laptop, ID Card, Access Card, Office Keys, Mobile Phone, Parking Pass.
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setStartModal(false)}>Cancel</Button>
            <Button variant="danger" type="submit" className="flex-1" disabled={saving || !startForm.employeeId}>
              {saving ? 'Starting…' : 'Initiate Offboarding'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Finalize Confirm ─────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!finalizeTarget}
        onClose={() => setFinalizeTarget(null)}
        onConfirm={handleFinalize}
        title="Finalize Offboarding"
        message={`This will permanently set ${finalizeTarget?.employee?.fullName}'s status to TERMINATED and revoke all system access. This cannot be undone.`}
        icon={<Lock className="w-6 h-6" />}
        variant="danger"
        confirmLabel="Finalize & Terminate"
      />
    </motion.div>
  );
};
