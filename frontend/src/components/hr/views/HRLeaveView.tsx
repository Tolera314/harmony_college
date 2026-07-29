'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { CalendarCheck, CheckCircle2, XCircle, MessageSquare, Info } from 'lucide-react';
import { LeaveRequest } from '../../../types/hr';
import { leaveRequests, employees, leaveBalances } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

const statusConfig: Record<LeaveRequest['status'], { variant: 'amber'|'emerald'|'rose'|'glass' }> = {
  Pending: { variant: 'amber' }, Approved: { variant: 'emerald' },
  Rejected: { variant: 'rose' }, Forwarded: { variant: 'glass' }, Cancelled: { variant: 'glass' },
};

const typeColor: Record<LeaveRequest['type'], string> = {
  Annual: 'text-(--brand-gold)', Sick: 'text-(--status-danger)', Maternity: 'text-purple-400',
  Paternity: 'text-(--status-info)', Emergency: 'text-(--status-warning)', Study: 'text-(--status-success)',
};

export const HRLeaveView: React.FC = () => {
  const [filter, setFilter] = useState<'All'|LeaveRequest['status']>('All');
  const [viewMode, setViewMode] = useState<'requests'|'balances'|'policies'>('requests');
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ req: LeaveRequest; action: 'Approve'|'Reject' } | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, LeaveRequest['status']>>({});
  const [comment, setComment] = useState('');

  const getStatus = (r: LeaveRequest) => localStatus[r.id] ?? r.status;
  const filtered = leaveRequests.filter(r => filter === 'All' || getStatus(r) === filter);
  const pending = leaveRequests.filter(r => getStatus(r) === 'Pending');

  const handleAction = () => {
    if (!confirmModal) return;
    setLocalStatus(prev => ({ ...prev, [confirmModal.req.id]: confirmModal.action === 'Approve' ? 'Approved' : 'Rejected' }));
    setConfirmModal(null);
    setComment('');
    setSelected(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Leave Management"
        subtitle={`${pending.length} pending · ${leaveRequests.filter(r => getStatus(r) === 'Approved').length} approved`}
        icon={<CalendarCheck className="w-5 h-5" />}
      />

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {(['requests', 'balances', 'policies'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${viewMode === v ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {v === 'requests' ? 'Leave Requests' : v === 'balances' ? 'Leave Balances' : 'Leave Policies'}
          </button>
        ))}
      </div>

      {/* Leave Requests */}
      {viewMode === 'requests' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected', 'Forwarded'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
                {s} {s !== 'All' && <span className="ml-1 font-mono text-[10px] opacity-60">({leaveRequests.filter(r => getStatus(r) === s).length})</span>}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[800px]">
              <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
                <tr>
                  {['Employee', 'Leave Type', 'Duration', 'Dates', 'Manager', 'HR', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-(--text-faint)">No requests in this category.</td></tr>
                ) : filtered.map(req => {
                  const emp = employees.find(e => e.id === req.employeeId);
                  const status = getStatus(req);
                  const sc = statusConfig[status];
                  return (
                    <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <img src={emp?.avatar} alt="" className="w-7 h-7 rounded-full border border-(--border-default) shrink-0" />
                          <div>
                            <p className="font-semibold text-(--text-primary) text-xs">{emp?.name}</p>
                            <p className="font-mono text-[10px] text-(--text-faint)">{emp?.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className={`font-sans text-xs font-semibold ${typeColor[req.type]}`}>{req.type}</span></td>
                      <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary)">{req.days}d</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-(--text-secondary) whitespace-nowrap">{req.startDate} → {req.endDate}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={req.managerApproval === 'Approved' ? 'emerald' : req.managerApproval === 'Rejected' ? 'rose' : 'amber'} className="text-[10px]">
                          {req.managerApproval ?? 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={req.hrApproval === 'Approved' ? 'emerald' : req.hrApproval === 'Rejected' ? 'rose' : 'amber'} className="text-[10px]">
                          {req.hrApproval ?? 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5"><Badge variant={sc.variant}>{status}</Badge></td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => setSelected(req)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"><Info className="w-4 h-4" /></button>
                          {status === 'Pending' && (
                            <>
                              <button onClick={() => setConfirmModal({ req, action: 'Approve' })} className="p-1.5 rounded-lg hover:bg-(--status-success-bg) text-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => setConfirmModal({ req, action: 'Reject' })} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--status-danger) transition-colors"><XCircle className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Leave Balances */}
      {viewMode === 'balances' && (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-xs font-sans min-w-[700px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>
                {['Employee', 'Annual (Entitled/Taken/Remaining)', 'Sick (Entitled/Taken/Remaining)', 'Study (Entitled/Taken/Remaining)'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {leaveBalances.slice(0, 10).map(bal => {
                const emp = employees.find(e => e.id === bal.employeeId);
                return (
                  <tr key={bal.employeeId} className="hover:bg-(--hover-overlay) transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <img src={emp?.avatar} alt="" className="w-7 h-7 rounded-full border border-(--border-default) shrink-0" />
                        <span className="font-semibold text-(--text-primary) text-xs">{emp?.name}</span>
                      </div>
                    </td>
                    {[bal.annual, bal.sick, bal.study].map((b, i) => (
                      <td key={i} className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex gap-2 font-mono text-xs">
                            <span className="text-(--text-muted)">{b.entitled}</span>/<span className="text-(--status-warning)">{b.taken}</span>/<span className="text-(--status-success)">{b.remaining}</span>
                          </div>
                          <div className="h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden w-20">
                            <div className="h-full bg-[#E9C349] rounded-full" style={{ width: `${(b.taken / b.entitled) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Policies */}
      {viewMode === 'policies' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { type: 'Annual Leave', days: 20, carryOver: 5, color: 'text-(--brand-gold)', desc: 'Accrued monthly, carry-over up to 5 days.' },
            { type: 'Sick Leave', days: 15, carryOver: 0, color: 'text-(--status-danger)', desc: 'Medical certificate required after 3 consecutive days.' },
            { type: 'Maternity Leave', days: 90, carryOver: 0, color: 'text-purple-400', desc: '90 days fully paid maternity leave per birth.' },
            { type: 'Paternity Leave', days: 5, carryOver: 0, color: 'text-(--status-info)', desc: '5 days paid paternity leave within 2 weeks of birth.' },
            { type: 'Emergency Leave', days: 3, carryOver: 0, color: 'text-(--status-warning)', desc: 'Up to 3 days per incident, approval required.' },
            { type: 'Study Leave', days: 10, carryOver: 0, color: 'text-(--status-success)', desc: 'For conferences, research, and academic development.' },
          ].map(p => (
            <Card key={p.type} hoverable={false} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`font-serif text-base font-bold ${p.color}`}>{p.type}</h4>
                <Badge variant="glass" className="font-mono">{p.days}d/yr</Badge>
              </div>
              <p className="font-sans text-xs text-(--text-secondary) leading-relaxed">{p.desc}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                <span>Carry-over: {p.carryOver}d</span>
                <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2">Configure</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Leave Request Details" maxWidth="max-w-lg">
        {selected && (() => {
          const emp = employees.find(e => e.id === selected.employeeId);
          const status = getStatus(selected);
          return (
            <div className="space-y-4 font-sans text-sm">
              <div className="flex items-center gap-3">
                <img src={emp?.avatar} alt="" className="w-10 h-10 rounded-xl border border-(--border-default)" />
                <div>
                  <p className="font-semibold text-(--text-primary)">{emp?.name}</p>
                  <p className="text-(--text-muted) text-xs">{emp?.position}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Type', selected.type], ['Days', selected.days], ['From', selected.startDate], ['To', selected.endDate], ['Submitted', selected.submittedAt], ['Status', status]].map(([k, v]) => (
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
              {selected.comment && (
                <div className="p-3 bg-(--status-danger-bg) rounded-xl border border-(--status-danger-border)">
                  <p className="text-(--status-danger) text-xs">{selected.comment}</p>
                </div>
              )}
              {status === 'Pending' && (
                <div className="flex gap-3">
                  <Button variant="danger" className="flex-1" onClick={() => { setConfirmModal({ req: selected, action: 'Reject' }); setSelected(null); }}>Reject</Button>
                  <Button variant="primary" className="flex-1" onClick={() => { setConfirmModal({ req: selected, action: 'Approve' }); setSelected(null); }}>Approve</Button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-4 font-sans text-sm">
            <p className="text-(--text-secondary)">
              {confirmModal.action === 'Reject' ? 'Provide a reason for rejection:' : 'Are you sure you want to approve this leave request?'}
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Reason for rejection..."
                className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl px-4 py-3 font-sans text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold) resize-none" />
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button variant={confirmModal.action === 'Approve' ? 'primary' : 'danger'} className="flex-1" onClick={handleAction}>
                Confirm {confirmModal.action}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
