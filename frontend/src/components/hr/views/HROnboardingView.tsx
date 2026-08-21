'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { UserPlus, CheckCircle2, Circle, ChevronRight, Plus } from 'lucide-react';
import {
  hrOnboardingApi, hrEmployeesApi, type HROnboardingRecordApi, type HREmployeeApi,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonPage, ErrorState } from '../../ui/States';

const statusColor: Record<string, string> = {
  NOT_STARTED: 'text-(--text-faint)',
  IN_PROGRESS: 'text-(--brand-gold)',
  COMPLETED:   'text-(--status-success)',
  ON_HOLD:     'text-(--status-warning)',
};
const statusLabel: Record<string, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', ON_HOLD: 'On Hold',
};
const statusVariant: Record<string, 'glass'|'gold'|'emerald'|'amber'> = {
  NOT_STARTED: 'glass', IN_PROGRESS: 'gold', COMPLETED: 'emerald', ON_HOLD: 'amber',
};

export const HROnboardingView: React.FC = () => {
  const [records,   setRecords]   = useState<HROnboardingRecordApi[]>([]);
  const [employees, setEmployees] = useState<HREmployeeApi[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<HROnboardingRecordApi | null>(null);
  const [startModal, setStartModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [stepSaving, setStepSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rec, em] = await Promise.all([
        hrOnboardingApi.list(),
        hrEmployeesApi.list({ limit: 200, status: 'ACTIVE' }),
      ]);
      setRecords(rec);
      setEmployees(em.employees);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load onboarding records'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshSelected = async (employeeId: string) => {
    try {
      const updated = await hrOnboardingApi.getByEmployee(employeeId);
      setSelected(updated);
      setRecords(prev => prev.map(r => r.employeeId === employeeId ? updated : r));
    } catch { /* keep stale */ }
  };

  const handleStartOnboarding = async () => {
    if (!selectedEmpId) return;
    setSaving(true);
    try {
      await hrOnboardingApi.start(selectedEmpId);
      setStartModal(false); setSelectedEmpId('');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to start onboarding'); }
    finally { setSaving(false); }
  };

  const handleToggleStep = async (stepKey: string, currentCompleted: boolean) => {
    if (!selected) return;
    setStepSaving(true);
    try {
      await hrOnboardingApi.advanceStep(selected.employeeId, stepKey, !currentCompleted);
      await refreshSelected(selected.employeeId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update step'); }
    finally { setStepSaving(false); }
  };

  const handleComplete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await hrOnboardingApi.complete(selected.employeeId);
      await refreshSelected(selected.employeeId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to complete onboarding'); }
    finally { setSaving(false); }
  };

  // Employees without an onboarding record yet
  const onboardedEmpIds = new Set(records.map(r => r.employeeId));
  const eligibleEmployees = employees.filter(e => !onboardedEmpIds.has(e.id));

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Onboarding"
        subtitle={`${records.filter(r => r.status === 'IN_PROGRESS').length} in progress · ${records.filter(r => r.status === 'COMPLETED').length} completed`}
        icon={<UserPlus className="w-5 h-5" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setStartModal(true)}>
            Start Onboarding
          </Button>
        }
      />

      {records.length === 0 ? (
        <div className="py-16 text-center text-(--text-faint) text-sm border border-dashed border-(--border-default) rounded-2xl">
          No onboarding records. Click &ldquo;Start Onboarding&rdquo; to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map(rec => {
            const completedSteps = rec.steps.filter(s => s.completed).length;
            const totalSteps = rec.steps.length;
            const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            return (
              <Card key={rec.id} hoverable className="space-y-4 cursor-pointer" onClick={() => setSelected(rec)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={rec.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-10 h-10 rounded-xl object-cover border border-(--border-default) shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">{rec.employee?.fullName}</p>
                      <p className="font-sans text-xs text-(--text-muted) truncate">{rec.employee?.position}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[rec.status] ?? 'glass'} className="shrink-0">
                    {statusLabel[rec.status] ?? rec.status}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-(--text-faint)">{completedSteps}/{totalSteps} steps</span>
                    <span className={statusColor[rec.status] ?? 'text-(--text-muted)'}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div className="h-full bg-[#E9C349] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Step dots */}
                <div className="flex gap-1.5 flex-wrap">
                  {rec.steps.map(step => (
                    <div key={step.id} title={step.label}
                      className={`w-2 h-2 rounded-full ${step.completed ? 'bg-(--status-success)' : 'bg-(--hover-overlay) border border-(--border-default)'}`} />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                  <span>Started {new Date(rec.startedAt).toLocaleDateString()}</span>
                  {rec.completedAt && <span>Done {new Date(rec.completedAt).toLocaleDateString()}</span>}
                </div>

                <Button variant="secondary" size="sm" className="w-full" icon={<ChevronRight className="w-3.5 h-3.5" />}
                  onClick={e => { e.stopPropagation(); setSelected(rec); }}>
                  View Progress
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title={`Onboarding — ${selected?.employee?.fullName}`} subtitle="HR Onboarding" width="max-w-lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img src={selected.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-10 h-10 rounded-xl border border-(--border-default)" />
              <div>
                <p className="font-semibold text-(--text-primary) text-sm">{selected.employee?.fullName}</p>
                <p className="text-xs text-(--text-muted)">{selected.employee?.position}</p>
              </div>
              <Badge variant={statusVariant[selected.status] ?? 'glass'} className="ml-auto">
                {statusLabel[selected.status] ?? selected.status}
              </Badge>
            </div>

            {/* Steps checklist */}
            <div className="space-y-2">
              {selected.steps.sort((a, b) => a.orderIndex - b.orderIndex).map(step => (
                <div key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-(--hover-overlay) ${step.completed ? 'bg-(--status-success-bg) border-(--status-success-border)' : 'bg-(--hover-overlay) border-(--border-default)'}`}
                  onClick={() => !stepSaving && selected.status !== 'COMPLETED' && handleToggleStep(step.stepKey, step.completed)}>
                  {step.completed
                    ? <CheckCircle2 className="w-4 h-4 text-(--status-success) shrink-0" />
                    : <Circle className="w-4 h-4 text-(--text-faint) shrink-0" />}
                  <span className={`font-sans text-sm ${step.completed ? 'text-(--status-success) line-through' : 'text-(--text-primary)'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {selected.status !== 'COMPLETED' && (
              <Button variant="primary" className="w-full" disabled={saving} onClick={handleComplete}>
                {saving ? 'Completing…' : 'Mark Onboarding Complete'}
              </Button>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Start Onboarding Modal */}
      <Modal isOpen={startModal} onClose={() => setStartModal(false)} title="Start Employee Onboarding" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Select Employee</label>
            <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="">— Select Employee —</option>
              {eligibleEmployees.map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStartModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={saving || !selectedEmpId} onClick={handleStartOnboarding}>
              {saving ? 'Starting…' : 'Start Onboarding'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
