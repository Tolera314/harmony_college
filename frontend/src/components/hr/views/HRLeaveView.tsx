'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Annual: 'text-[#E9C349]', Sick: 'text-rose-400', Maternity: 'text-purple-400',
  Paternity: 'text-sky-400', Emergency: 'text-amber-400', Study: 'text-emerald-400',
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Leave Management"
        subtitle={`${pending.length} pending · ${leaveRequests.filter(r => getStatus(r) === 'Approved').length} approved`}
        icon={<CalendarCheck className="w-5 h-5" />}
      />

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {(['requests', 'balances', 'policies'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${viewMode === v ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
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
                className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
                {s} {s !== 'All' && <span className="ml-1 font-mono text-[10px] opacity-60">({leaveRequests.filter(r => getStatus(r) === s).length})</span>}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
            <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[800px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {['Employee', 'Leave Type', 'Duration', 'Dates', 'Manager', 'HR', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/85">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-white/30">No requests in this category.</td></tr>
                ) : filtered.map(req => {
                  const emp = employees.find(e => e.id === req.employeeId);
                  const status = getStatus(req);
                  const sc = statusConfig[status];
                  return (
                    <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <img src={emp?.avatar} alt="" className="w-7 h-7 rounded-full border border-white/10 shrink-0" />
                          <div>
                            <p className="font-semibold text-white text-xs">{emp?.name}</p>
                            <p className="font-mono text-[10px] text-white/40">{emp?.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className={`font-sans text-xs font-semibold ${typeColor[req.type]}`}>{req.type}</span></td>
                      <td className="px-4 py-3.5 font-mono text-xs text-white/60">{req.days}d</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-white/60 whitespace-nowrap">{req.startDate} → {req.endDate}</td>
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
                          <button onClick={() => setSelected(req)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Info className="w-4 h-4" /></button>
                          {status === 'Pending' && (
                            <>
                              <button onClick={() => setConfirmModal({ req, action: 'Approve' })} className="p-1.5 rounded-lg hover:bg-emerald-950/30 text-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => setConfirmModal({ req, action: 'Reject' })} className="p-1.5 rounded-lg hover:bg-rose-950/30 text-rose-400 transition-colors"><XCircle className="w-4 h-4" /></button>
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
        <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
          <table className="w-full text-xs font-sans min-w-[700px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Employee', 'Annual (Entitled/Taken/Remaining)', 'Sick (Entitled/Taken/Remaining)', 'Study (Entitled/Taken/Remaining)'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaveBalances.slice(0, 10).map(bal => {
                const emp = employees.find(e => e.id === bal.employeeId);
                return (
                  <tr key={bal.employeeId} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <img src={emp?.avatar} alt="" className="w-7 h-7 rounded-full border border-white/10 shrink-0" />
                        <span className="font-semibold text-white text-xs">{emp?.name}</span>
                      </div>
                    </td>
                    {[bal.annual, bal.sick, bal.study].map((b, i) => (
                      <td key={i} className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex gap-2 font-mono text-xs">
                            <span className="text-white/50">{b.entitled}</span>/<span className="text-amber-400">{b.taken}</span>/<span className="text-emerald-400">{b.remaining}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-20">
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
            { type: 'Annual Leave', days: 20, carryOver: 5, color: 'text-[#E9C349]', desc: 'Accrued monthly, carry-over up to 5 days.' },
            { type: 'Sick Leave', days: 15, carryOver: 0, color: 'text-rose-400', desc: 'Medical certificate required after 3 consecutive days.' },
            { type: 'Maternity Leave', days: 90, carryOver: 0, color: 'text-purple-400', desc: '90 days fully paid maternity leave per birth.' },
            { type: 'Paternity Leave', days: 5, carryOver: 0, color: 'text-sky-400', desc: '5 days paid paternity leave within 2 weeks of birth.' },
            { type: 'Emergency Leave', days: 3, carryOver: 0, color: 'text-amber-400', desc: 'Up to 3 days per incident, approval required.' },
            { type: 'Study Leave', days: 10, carryOver: 0, color: 'text-emerald-400', desc: 'For conferences, research, and academic development.' },
          ].map(p => (
            <Card key={p.type} hoverable={false} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`font-serif text-base font-bold ${p.color}`}>{p.type}</h4>
                <Badge variant="glass" className="font-mono">{p.days}d/yr</Badge>
              </div>
              <p className="font-sans text-xs text-white/60 leading-relaxed">{p.desc}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
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
                <img src={emp?.avatar} alt="" className="w-10 h-10 rounded-xl border border-white/10" />
                <div>
                  <p className="font-semibold text-white">{emp?.name}</p>
                  <p className="text-white/50 text-xs">{emp?.position}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Type', selected.type], ['Days', selected.days], ['From', selected.startDate], ['To', selected.endDate], ['Submitted', selected.submittedAt], ['Status', status]].map(([k, v]) => (
                  <div key={String(k)} className="p-3 bg-white/5 rounded-xl border border-white/8">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{k}</p>
                    <p className="text-white/80 text-xs mt-1">{v}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-1">Reason</p>
                <p className="text-white/70 text-xs leading-relaxed">{selected.reason}</p>
              </div>
              {selected.comment && (
                <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-800/30">
                  <p className="text-rose-300 text-xs">{selected.comment}</p>
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
            <p className="text-white/70">
              {confirmModal.action === 'Reject' ? 'Provide a reason for rejection:' : 'Are you sure you want to approve this leave request?'}
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Reason for rejection..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E9C349] resize-none" />
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
