'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Banknote, Eye, EyeOff, CheckCircle2, AlertTriangle, Download, Lock } from 'lucide-react';
import {
  hrPayrollApi, type HRPayrollRecordApi,
  PAYROLL_STAGE_LABEL, type HRPayrollStage,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SkeletonPage, ErrorState } from '../../ui/States';

const stageOrder: HRPayrollStage[] = ['DRAFT','PENDING_REVIEW','PENDING_HR_APPROVAL','APPROVED','LOCKED'];
const stageBadgeVariant: Record<HRPayrollStage, 'glass'|'amber'|'gold'|'emerald'|'glass'> = {
  DRAFT: 'glass', PENDING_REVIEW: 'amber', PENDING_HR_APPROVAL: 'gold', APPROVED: 'emerald', LOCKED: 'glass',
};

function SalaryField({ value }: { value: number }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 30000);
    return () => clearTimeout(t);
  }, [revealed]);
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-semibold text-(--text-primary)">{revealed ? `ETB ${value.toLocaleString()}` : `ETB ${'•'.repeat(8)}`}</span>
      <button onClick={() => setRevealed(p => !p)} className="text-(--text-faint) hover:text-(--brand-gold) transition-colors">
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

export const HRPayrollView: React.FC = () => {
  const [records,  setRecords]  = useState<HRPayrollRecordApi[]>([]);
  const [selected, setSelected] = useState<HRPayrollRecordApi | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [approveModal, setApproveModal] = useState(false);
  const [comment,  setComment]  = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await hrPayrollApi.list();
      setRecords(list);
      if (list.length > 0) {
        // Load detailed view (with payslips) for the first record
        const detail = await hrPayrollApi.getById(list[0]!.id);
        setSelected(detail);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load payroll'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectRecord = async (id: string) => {
    try { setSelected(await hrPayrollApi.getById(id)); }
    catch { /* keep current */ }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await hrPayrollApi.approve(selected.id, comment || undefined);
      setApproveModal(false); setComment('');
      const detail = await hrPayrollApi.getById(selected.id);
      setSelected(detail);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Approval failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;
  if (!selected) return <div className="p-8 text-center text-(--text-faint)">No payroll records found.</div>;

  const stageIdx = stageOrder.indexOf(selected.stage);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Payroll"
        subtitle={`${selected.month} ${selected.year} · ${selected.employeeCount} employees`}
        icon={<Banknote className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export Payslips</Button>
            {selected.stage === 'PENDING_HR_APPROVAL' && (
              <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setApproveModal(true)}>Approve Payroll</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) px-1 mb-3">Payroll Periods</p>
          {records.map(pr => {
            const isActive = selected.id === pr.id;
            return (
              <button key={pr.id} onClick={() => selectRecord(pr.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border)' : 'bg-(--hover-overlay) border-(--border-subtle) hover:bg-(--hover-overlay)'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs font-bold ${isActive ? 'text-(--brand-gold)' : 'text-(--text-secondary)'}`}>{pr.month} {pr.year}</span>
                  {pr.stage === 'LOCKED' && <Lock className="w-3 h-3 text-(--text-faint)" />}
                </div>
                <Badge variant={stageBadgeVariant[pr.stage] ?? 'glass'} className="text-[10px]">{PAYROLL_STAGE_LABEL[pr.stage] ?? pr.stage}</Badge>
              </button>
            );
          })}
        </div>

        {/* Main */}
        <div className="lg:col-span-3 space-y-5">
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">{selected.month} {selected.year} Payroll</h3>
              <Badge variant={stageBadgeVariant[selected.stage] ?? 'glass'}>{PAYROLL_STAGE_LABEL[selected.stage] ?? selected.stage}</Badge>
            </div>

            {/* Stage pipeline */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stageOrder.map((stage, i) => {
                const done = i < stageIdx; const active = i === stageIdx;
                return (
                  <React.Fragment key={stage}>
                    <div className={`flex flex-col items-center gap-1 shrink-0 ${done || active ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-(--status-success)' : active ? 'bg-[#E9C349]' : 'bg-(--active-overlay)'}`}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5 text-(--text-inverse)" /> : <span className="font-mono text-[9px] text-(--text-inverse) font-bold">{i + 1}</span>}
                      </div>
                      <span className="font-mono text-[9px] text-(--text-muted) whitespace-nowrap">{PAYROLL_STAGE_LABEL[stage]}</span>
                    </div>
                    {i < stageOrder.length - 1 && <div className={`h-px flex-1 min-w-[16px] ${i < stageIdx ? 'bg-emerald-400/50' : 'bg-(--hover-overlay)'}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Approvals */}
            <div className="space-y-2">
              {selected.approvals.map((ap, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ap.status === 'APPROVED' ? 'bg-(--status-success)' : ap.status === 'REJECTED' ? 'bg-(--status-danger)' : 'bg-(--status-warning)'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-sans text-xs font-semibold text-(--text-primary)">{ap.stageName}</p>
                      <Badge variant={ap.status === 'APPROVED' ? 'emerald' : ap.status === 'REJECTED' ? 'rose' : 'amber'} className="text-[10px]">{ap.status}</Badge>
                    </div>
                    <p className="font-sans text-[11px] text-(--text-faint) mt-0.5">{ap.approverName}{ap.approvedAt && ` · ${new Date(ap.approvedAt).toLocaleDateString()}`}</p>
                    {ap.comment && <p className="font-sans text-[11px] text-(--text-secondary) mt-1 italic">&ldquo;{ap.comment}&rdquo;</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
              {[['Total Gross', `ETB ${selected.totalGross.toLocaleString()}`], ['Total Net', `ETB ${selected.totalNet.toLocaleString()}`], ['Employees', selected.employeeCount]].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="font-mono text-base font-bold text-(--text-primary) mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Payslips */}
          {selected.stage !== 'DRAFT' && selected.payslips && selected.payslips.length > 0 && (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
              <table className="w-full text-xs font-sans min-w-[700px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>{['Employee','Basic','Allowances','Bonus','Tax','Pension','Net Salary'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {selected.payslips.slice(0, 10).map(entry => (
                    <tr key={entry.id} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <img src={entry.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-6 h-6 rounded-full border border-(--border-default) shrink-0" />
                          <span className="font-semibold text-(--text-primary) text-xs">{entry.employee?.fullName?.split(' ').slice(-1)[0]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><SalaryField value={entry.basicSalary} /></td>
                      <td className="px-4 py-3.5"><SalaryField value={entry.allowances} /></td>
                      <td className="px-4 py-3.5"><SalaryField value={entry.bonuses} /></td>
                      <td className="px-4 py-3.5 font-mono text-xs text-(--status-danger)">-{entry.tax.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-(--status-warning)">-{entry.pension.toLocaleString()}</td>
                      <td className="px-4 py-3.5"><SalaryField value={entry.netSalary} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selected.stage === 'LOCKED' && (
            <div className="flex items-center gap-3 p-4 bg-(--hover-overlay) border border-(--border-default) rounded-xl">
              <Lock className="w-5 h-5 text-(--text-faint) shrink-0" />
              <p className="font-sans text-xs text-(--text-muted)">This payroll is locked. Corrections must be processed as a separate Payroll Adjustment record.</p>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      <Modal isOpen={approveModal} onClose={() => setApproveModal(false)} title="Approve Payroll — Final HR Approval" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <div className="p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
            <p className="text-amber-200/80 text-xs leading-relaxed">This is the final HR approval. Once approved, payslips will be released to all employees and the payroll will be locked.</p>
          </div>
          <p className="text-(--text-secondary) text-xs">
            Approving <span className="font-semibold text-(--text-primary)">{selected.month} {selected.year}</span> payroll for{' '}
            <span className="text-(--brand-gold) font-mono">{selected.employeeCount}</span> employees.
            Total net: <span className="font-mono text-(--text-primary)">ETB {selected.totalNet.toLocaleString()}</span>.
          </p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Optional approval comment..."
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setApproveModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<CheckCircle2 className="w-4 h-4" />} disabled={saving} onClick={handleApprove}>
              {saving ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
