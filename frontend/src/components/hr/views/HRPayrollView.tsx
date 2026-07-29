'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Banknote, Eye, EyeOff, CheckCircle2, AlertTriangle, Download, Lock } from 'lucide-react';
import { PayrollStage } from '../../../types/hr';
import { payrollRecords, payslipEntries, employees } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';

const stageBadge = (s: PayrollStage) => {
  const m: Record<PayrollStage, 'glass'|'amber'|'gold'|'emerald'|'rose'> = {
    Draft: 'glass', 'Pending Review': 'amber', 'Pending HR Approval': 'gold', Approved: 'emerald', Locked: 'glass',
  };
  return <Badge variant={m[s]}>{s}</Badge>;
};

const stageOrder: PayrollStage[] = ['Draft', 'Pending Review', 'Pending HR Approval', 'Approved', 'Locked'];

function SalaryField({ value }: { value: number }) {
  const [revealed, setRevealed] = useState(false);
  React.useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 30000);
    return () => clearTimeout(t);
  }, [revealed]);
  const formatted = `ETB ${value.toLocaleString()}`;
  const masked = `ETB ${'•'.repeat(8)}`;
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-semibold text-(--text-primary)">{revealed ? formatted : masked}</span>
      <button onClick={() => setRevealed(p => !p)} className="text-(--text-faint) hover:text-(--brand-gold) transition-colors">
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

export const HRPayrollView: React.FC = () => {
  const [selectedPayroll, setSelectedPayroll] = useState(payrollRecords[0]);
  const [approveModal, setApproveModal] = useState(false);
  const [localStage, setLocalStage] = useState<Record<string, PayrollStage>>({});
  const [comment, setComment] = useState('');

  const getStage = (id: string) => localStage[id] ?? payrollRecords.find(p => p.id === id)?.stage ?? 'Draft';
  const currentStage = getStage(selectedPayroll.id);
  const entries = payslipEntries.slice(0, 8); // show first 8 employees

  const handleApprove = () => {
    setLocalStage(prev => ({ ...prev, [selectedPayroll.id]: 'Approved' }));
    setApproveModal(false);
    setComment('');
  };

  const stageIdx = stageOrder.indexOf(currentStage);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Payroll"
        subtitle={`${selectedPayroll.month} ${selectedPayroll.year} · ${selectedPayroll.employeeCount} employees`}
        icon={<Banknote className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export Payslips</Button>
            {currentStage === 'Pending HR Approval' && (
              <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setApproveModal(true)}>
                Approve Payroll
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Payroll history sidebar */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-(--text-faint) px-1 mb-3">Payroll Periods</p>
          {payrollRecords.map(pr => {
            const stage = getStage(pr.id);
            const isActive = selectedPayroll.id === pr.id;
            return (
              <button key={pr.id} onClick={() => setSelectedPayroll(pr)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border)' : 'bg-(--hover-overlay) border-(--border-subtle) hover:bg-(--hover-overlay)'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs font-bold ${isActive ? 'text-(--brand-gold)' : 'text-(--text-secondary)'}`}>{pr.month} {pr.year}</span>
                  {stage === 'Locked' && <Lock className="w-3 h-3 text-(--text-faint)" />}
                </div>
                {stageBadge(stage)}
              </button>
            );
          })}
        </div>

        {/* Main payroll area */}
        <div className="lg:col-span-3 space-y-5">
          {/* Stage progress */}
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">{selectedPayroll.month} {selectedPayroll.year} Payroll</h3>
              {stageBadge(currentStage)}
            </div>

            {/* Stage pipeline */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stageOrder.map((stage, i) => {
                const done = i < stageIdx;
                const active = i === stageIdx;
                return (
                  <React.Fragment key={stage}>
                    <div className={`flex flex-col items-center gap-1 shrink-0 ${done ? 'opacity-100' : active ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-(--status-success)' : active ? 'bg-[#E9C349]' : 'bg-(--active-overlay)'}`}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5 text-(--text-inverse)" /> : <span className="font-mono text-[9px] text-(--text-inverse) font-bold">{i + 1}</span>}
                      </div>
                      <span className="font-mono text-[9px] text-(--text-muted) whitespace-nowrap">{stage}</span>
                    </div>
                    {i < stageOrder.length - 1 && <div className={`h-px flex-1 min-w-[16px] ${i < stageIdx ? 'bg-emerald-400/50' : 'bg-(--hover-overlay)'}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Approval timeline */}
            <div className="space-y-2">
              {selectedPayroll.approvals.map((ap, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ap.status === 'Approved' ? 'bg-(--status-success)' : ap.status === 'Returned' ? 'bg-(--status-danger)' : 'bg-(--status-warning)'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-sans text-xs font-semibold text-(--text-primary)">{ap.stage}</p>
                      <Badge variant={ap.status === 'Approved' ? 'emerald' : ap.status === 'Returned' ? 'rose' : 'amber'} className="text-[10px]">{ap.status}</Badge>
                    </div>
                    <p className="font-sans text-[11px] text-(--text-faint) mt-0.5">{ap.approver} {ap.date && `· ${ap.date}`}</p>
                    {ap.comment && <p className="font-sans text-[11px] text-(--text-secondary) mt-1 italic">&quot;{ap.comment}&quot;</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[['Total Gross', `ETB ${selectedPayroll.totalGross.toLocaleString()}`], ['Total Net', `ETB ${selectedPayroll.totalNet.toLocaleString()}`], ['Employees', selectedPayroll.employeeCount]].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="font-mono text-base font-bold text-(--text-primary) mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Payslip table */}
          {currentStage !== 'Draft' && (
            <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay)">
              <table className="w-full text-xs font-sans min-w-[700px]">
                <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                  <tr>
                    {['Employee', 'Basic', 'Allowances', 'Bonus', 'Tax', 'Pension', 'Net Salary'].map(h => (
                      <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted)">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {entries.map(entry => {
                    const emp = employees.find(e => e.id === entry.employeeId);
                    return (
                      <tr key={entry.employeeId} className="hover:bg-(--hover-overlay) transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <img src={emp?.avatar} alt="" className="w-6 h-6 rounded-full border border-(--border-default) shrink-0" />
                            <span className="font-semibold text-(--text-primary) text-xs">{emp?.name?.split(' ').slice(-1)[0]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><SalaryField value={entry.basicSalary} /></td>
                        <td className="px-4 py-3.5"><SalaryField value={entry.allowances} /></td>
                        <td className="px-4 py-3.5"><SalaryField value={entry.bonuses} /></td>
                        <td className="px-4 py-3.5 font-mono text-xs text-(--status-danger)">-{entry.tax.toLocaleString()}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-(--status-warning)">-{entry.pension.toLocaleString()}</td>
                        <td className="px-4 py-3.5"><SalaryField value={entry.netSalary} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {currentStage === 'Locked' && (
            <div className="flex items-center gap-3 p-4 bg-(--hover-overlay) border border-(--border-default) rounded-xl">
              <Lock className="w-5 h-5 text-(--text-faint) shrink-0" />
              <p className="font-sans text-xs text-(--text-muted)">This payroll is locked. Any corrections must be processed as a separate Payroll Adjustment record to preserve the audit trail.</p>
            </div>
          )}
        </div>
      </div>

      {/* Approve — stays as centered Modal (confirmation dialog) */}
      <Modal isOpen={approveModal} onClose={() => setApproveModal(false)} title="Approve Payroll — Final HR Approval" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <div className="p-4 bg-(--status-warning-bg) border border-(--status-warning-border) rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-(--status-warning) shrink-0 mt-0.5" />
            <p className="text-amber-200/80 text-xs leading-relaxed">
              This is the final HR approval. Once approved, payslips will be released to all employees and the payroll will be locked.
            </p>
          </div>
          <p className="text-(--text-secondary) text-xs">
            Approving <span className="font-semibold text-(--text-primary)">{selectedPayroll.month} {selectedPayroll.year}</span> payroll for{' '}
            <span className="text-(--brand-gold) font-mono">{selectedPayroll.employeeCount}</span> employees.
            Total net: <span className="font-mono text-(--text-primary)">ETB {selectedPayroll.totalNet.toLocaleString()}</span>.
          </p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Optional approval comment..."
            className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setApproveModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<CheckCircle2 className="w-4 h-4" />} onClick={handleApprove}>Confirm Approval</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
