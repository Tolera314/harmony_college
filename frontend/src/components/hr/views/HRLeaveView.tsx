'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { CalendarCheck, CheckCircle2, XCircle, Info } from 'lucide-react';
import {
  hrLeaveApi, type HRLeaveRequestApi, type HRLeaveBalanceApi,
  LEAVE_TYPE_LABEL, LEAVE_STATUS_LABEL,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { SkeletonPage, ErrorState } from '../../ui/States';

const statusVariant: Record<string, 'amber'|'emerald'|'rose'|'glass'> = {
  PENDING: 'amber', APPROVED: 'emerald', REJECTED: 'rose', FORWARDED: 'glass', CANCELLED: 'glass',
};
const approvalVariant: Record<string, 'amber'|'emerald'|'rose'> = {
  PENDING: 'amber', APPROVED: 'emerald', REJECTED: 'rose',
};

export const HRLeaveView: React.FC = () => {
  const [requests,  setRequests]  = useState<HRLeaveRequestApi[]>([]);
  const [balances,  setBalances]  = useState<HRLeaveBalanceApi[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [filter,   setFilter]   = useState('All');
  const [viewMode, setViewMode] = useState<'requests'|'balances'|'policies'>('requests');
  const [selected, setSelected] = useState<HRLeaveRequestApi | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ req: HRLeaveRequestApi; action: 'APPROVED'|'REJECTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lr, lb] = await Promise.all([
        hrLeaveApi.list({ status: filter !== 'All' ? filter : undefined, limit: 100 }),
        hrLeaveApi.listBalances(),
      ]);
      setRequests(lr.requests);
      setTotal(lr.total);
      setBalances(lb);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load leave data'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      await hrLeaveApi.review(confirmModal.req.id, { action: confirmModal.action, comment: comment || undefined });
      setConfirmModal(null); setComment(''); setSelected(null);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setSaving(false); }
  };

  const pending = requests.filter(r => r.status === 'PENDING');

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Leave Management"
        subtitle={`${pending.length} pending · ${requests.filter(r => r.status === 'APPROVED').length} approved`}
        icon={<CalendarCheck className="w-5 h-5" />}
      />

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {(['requests','balances','policies'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${viewMode === v ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {v === 'requests' ? 'Leave Requests' : v === 'balances' ? 'Leave Balances' : 'Leave Policies'}
          </button>
        ))}
      </div>

      {/* Requests */}
      {viewMode === 'requests' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['All','PENDING','APPROVED','REJECTED','FORWARDED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {s === 'All' ? 'All' : (LEAVE_STATUS_LABEL as Record<string,string>)[s] ?? s}
                {s !== 'All' && <span className="ml-1 font-mono text-[10px] opacity-60">({requests.filter(r => r.status === s).length})</span>}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[800px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>{['Employee','Leave Type','Duration','Dates','Manager','HR','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {requests.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-(--text-faint)">No requests in this category.</td></tr>
                ) : requests.map(req => (
                  <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <img src={req.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-7 h-7 rounded-full border border-(--border-default) shrink-0" />
                        <div>
                          <p className="font-semibold text-(--text-primary) text-xs">{req.employee?.fullName}</p>
                          <p className="font-mono text-[10px] text-(--text-faint)">{req.employee?.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-(--brand-gold)">{LEAVE_TYPE_LABEL[req.leaveType] ?? req.leaveType}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{req.daysCount}d</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary) whitespace-nowrap">{new Date(req.startDate).toLocaleDateString()} → {new Date(req.endDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5"><Badge variant={approvalVariant[req.managerApproval] ?? 'amber'} className="text-[10px]">{req.managerApproval}</Badge></td>
                    <td className="px-4 py-3.5"><Badge variant={approvalVariant[req.hrApproval] ?? 'amber'} className="text-[10px]">{req.hrApproval}</Badge></td>
                    <td className="px-4 py-3.5"><Badge variant={statusVariant[req.status] ?? 'glass'}>{LEAVE_STATUS_LABEL[req.status] ?? req.status}</Badge></td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelected(req)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"><Info className="w-4 h-4" /></button>
                        {req.status === 'PENDING' && (
                          <>
                            <button onClick={() => setConfirmModal({ req, action: 'APPROVED' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                            <button onClick={() => setConfirmModal({ req, action: 'REJECTED' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--status-danger) transition-colors"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Balances */}
      {viewMode === 'balances' && (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-xs font-sans min-w-[700px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Employee','Annual','Sick','Study'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {/* Group by employee */}
              {Array.from(new Set(balances.map(b => b.employeeId))).map(eid => {
                const empBalances = balances.filter(b => b.employeeId === eid);
                const emp = empBalances[0]?.employee;
                const annual = empBalances.find(b => b.leaveType === 'ANNUAL');
                const sick   = empBalances.find(b => b.leaveType === 'SICK');
                const study  = empBalances.find(b => b.leaveType === 'STUDY');
                return (
                  <tr key={eid} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <img src={emp?.avatarUrl ?? '/tigist.png'} alt="" className="w-7 h-7 rounded-full border border-(--border-default) shrink-0" />
                        <span className="font-semibold text-(--text-primary) text-xs">{emp?.fullName ?? eid}</span>
                      </div>
                    </td>
                    {[annual, sick, study].map((b, i) => b ? (
                      <td key={i} className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex gap-2 font-mono text-xs">
                            <span className="text-(--text-muted)">{b.entitled}</span>/<span className="text-(--status-warning)">{b.taken}</span>/<span className="text-(--status-success)">{b.remaining}</span>
                          </div>
                          <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden w-20">
                            <div className="h-full bg-[#E9C349] rounded-full" style={{ width: `${b.entitled > 0 ? (b.taken / b.entitled) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </td>
                    ) : <td key={i} className="px-4 py-3.5 text-(--text-faint) text-xs">—</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Policies */}
      {viewMode === 'policies' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { type:'Annual Leave',    days:20, carryOver:5, color:'text-(--brand-gold)',   desc:'Accrued monthly, carry-over up to 5 days.' },
            { type:'Sick Leave',      days:15, carryOver:0, color:'text-(--status-danger)', desc:'Medical certificate required after 3 consecutive days.' },
            { type:'Maternity Leave', days:90, carryOver:0, color:'text-purple-400',        desc:'90 days fully paid maternity leave per birth.' },
            { type:'Paternity Leave', days: 5, carryOver:0, color:'text-(--status-info)',   desc:'5 days paid paternity leave within 2 weeks of birth.' },
            { type:'Emergency Leave', days: 3, carryOver:0, color:'text-(--status-warning)',desc:'Up to 3 days per incident, approval required.' },
            { type:'Study Leave',     days:10, carryOver:0, color:'text-(--status-success)', desc:'For conferences, research, and academic development.' },
          ].map(p => (
            <Card key={p.type} hoverable={false} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`font-serif text-base font-bold ${p.color}`}>{p.type}</h4>
                <Badge variant="glass" className="font-mono">{p.days}d/yr</Badge>
              </div>
              <p className="font-sans text-xs text-(--text-secondary) leading-relaxed">{p.desc}</p>
              <p className="text-[10px] font-mono text-(--text-faint)">Carry-over: {p.carryOver}d</p>
            </Card>
          ))}
        </div>
      )}

      {/* Detail panel */}
      <SlidePanel isOpen={!!selected} onClose={() => setSelected(null)} title="Leave Request Details" subtitle="HR Leave Management" width="max-w-lg">
        {selected && (
          <div className="space-y-4 font-sans text-sm">
            <div className="flex items-center gap-3">
              <img src={selected.employee?.avatarUrl ?? '/tigist.png'} alt="" className="w-10 h-10 rounded-xl border border-(--border-default)" />
              <div>
                <p className="font-semibold text-(--text-primary)">{selected.employee?.fullName}</p>
                <p className="text-(--text-muted) text-xs">{selected.employee?.position}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Type', LEAVE_TYPE_LABEL[selected.leaveType] ?? selected.leaveType], ['Days', selected.daysCount], ['From', new Date(selected.startDate).toLocaleDateString()], ['To', new Date(selected.endDate).toLocaleDateString()], ['Submitted', new Date(selected.submittedAt).toLocaleDateString()], ['Status', LEAVE_STATUS_LABEL[selected.status] ?? selected.status]].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                  <p className="text-(--text-secondary) text-xs mt-1">{v}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
              <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-1">Reason</p>
              <p className="text-(--text-secondary) text-xs leading-relaxed">{selected.reason}</p>
            </div>
            {selected.reviewComment && (
              <div className="p-3 bg-(--status-danger-bg) rounded-xl border border-(--status-danger-border)">
                <p className="text-(--status-danger) text-xs">{selected.reviewComment}</p>
              </div>
            )}
            {selected.status === 'PENDING' && (
              <div className="flex gap-3">
                <Button variant="danger" className="flex-1" onClick={() => { setConfirmModal({ req: selected, action: 'REJECTED' }); setSelected(null); }}>Reject</Button>
                <Button variant="primary" className="flex-1" onClick={() => { setConfirmModal({ req: selected, action: 'APPROVED' }); setSelected(null); }}>Approve</Button>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Confirm modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={`Confirm ${confirmModal?.action === 'APPROVED' ? 'Approval' : 'Rejection'}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">{confirmModal.action === 'REJECTED' ? 'Provide a reason for rejection:' : 'Are you sure you want to approve this leave request?'}</p>
            {confirmModal.action === 'REJECTED' && (
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Reason for rejection..."
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none" />
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button variant={confirmModal.action === 'APPROVED' ? 'primary' : 'danger'} className="flex-1" disabled={saving} onClick={handleAction}>
                {saving ? 'Processing…' : `Confirm ${confirmModal.action === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
