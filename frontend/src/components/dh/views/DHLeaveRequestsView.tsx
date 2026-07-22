'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, CheckCircle2, XCircle, MessageSquare, Calendar, Paperclip } from 'lucide-react';
import { LeaveRequest } from '../../../types/department';
import { leaveRequests, faculty } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

const statusConfig: Record<LeaveRequest['status'], { variant: 'amber'|'emerald'|'rose'|'glass' }> = {
  Pending:          { variant: 'amber' },
  Approved:         { variant: 'emerald' },
  Rejected:         { variant: 'rose' },
  'Forwarded to HR':{ variant: 'glass' },
};

const typeColor: Record<LeaveRequest['type'], string> = {
  Medical: 'text-rose-400', Personal: 'text-white/70', Conference: 'text-[#E9C349]',
  Research: 'text-emerald-400', Annual: 'text-sky-400',
};

export const DHLeaveRequestsView: React.FC = () => {
  const [filter, setFilter] = useState<'All'|LeaveRequest['status']>('All');
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ req: LeaveRequest; action: 'Approve'|'Reject' } | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, LeaveRequest['status']>>({});
  const [comment, setComment] = useState('');

  const getStatus = (r: LeaveRequest): LeaveRequest['status'] => localStatus[r.id] ?? r.status;

  const filtered = leaveRequests.filter((r) => filter === 'All' || getStatus(r) === filter);

  const handleAction = () => {
    if (!confirmModal) return;
    const newStatus: LeaveRequest['status'] = confirmModal.action === 'Approve' ? 'Approved' : 'Rejected';
    setLocalStatus((prev) => ({ ...prev, [confirmModal.req.id]: newStatus }));
    setConfirmModal(null);
    setComment('');
    setSelected(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Faculty Leave Requests"
        subtitle={`${leaveRequests.filter(r => getStatus(r) === 'Pending').length} pending review`}
        icon={<FileText className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Pending', 'Approved', 'Rejected', 'Forwarded to HR'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="font-sans text-sm text-white/30">No leave requests in this category.</p>
          </div>
        ) : filtered.map((req) => {
          const f = faculty.find((x) => x.id === req.facultyId);
          const status = getStatus(req);
          const isPending = status === 'Pending';
          return (
            <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white/5 border rounded-2xl p-5 transition-all ${isPending ? 'border-[#E9C349]/20' : 'border-white/10'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Faculty info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {f && <img src={f.avatar} alt={f.name} className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-serif text-sm font-bold text-white">{f?.name ?? req.facultyId}</p>
                    <p className="font-sans text-xs text-white/50">{f?.rank} · {f?.department}</p>
                  </div>
                </div>

                {/* Leave meta */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-sans">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-white/60">{req.startDate} → {req.endDate}</span>
                    <Badge variant="glass" className="text-[10px]">{req.days}d</Badge>
                  </div>
                  <span className={`font-semibold ${typeColor[req.type]}`}>{req.type}</span>
                  <Badge variant={statusConfig[status].variant}>{status}</Badge>
                  {req.hasDocument && <Paperclip className="w-3.5 h-3.5 text-white/40" />}
                </div>
              </div>

              {/* Reason */}
              <p className="mt-3 text-xs text-white/60 leading-relaxed italic">&quot;{req.reason}&quot;</p>

              {/* Timeline */}
              <div className="mt-4 flex items-center gap-3 flex-wrap text-[11px] font-mono text-white/40">
                {req.timeline.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-white/20">→</span>}
                    <span className="text-white/50">{t.action}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* Actions */}
              {isPending && (
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(req)} icon={<MessageSquare className="w-4 h-4" />}>Comment</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmModal({ req, action: 'Reject' })} icon={<XCircle className="w-4 h-4" />}>Reject</Button>
                  <Button variant="primary" size="sm" onClick={() => setConfirmModal({ req, action: 'Approve' })} icon={<CheckCircle2 className="w-4 h-4" />}>Approve</Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail / Comment Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Leave Request — Comment" maxWidth="max-w-lg">
        {selected && (() => {
          const f = faculty.find((x) => x.id === selected.facultyId);
          return (
            <div className="space-y-4 text-sm font-sans">
              <div className="flex items-center gap-3">
                {f && <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />}
                <div>
                  <p className="font-semibold text-white">{f?.name}</p>
                  <p className="text-white/50 text-xs">{selected.type} Leave · {selected.days} days</p>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                <p className="text-white/60 text-xs leading-relaxed">{selected.reason}</p>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E9C349] resize-none"
                rows={4} placeholder="Add a comment for the faculty member..."
              />
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>Cancel</Button>
                <Button variant="primary" className="flex-1" onClick={() => setSelected(null)}>Send Comment</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={`Confirm ${confirmModal?.action}`} maxWidth="max-w-md">
        {confirmModal && (
          <div className="space-y-4">
            <p className="font-sans text-sm text-white/70">
              You are about to <span className="font-semibold text-white">{confirmModal.action.toLowerCase()}</span> the leave request from{' '}
              <span className="text-[#E9C349]">{faculty.find(f => f.id === confirmModal.req.facultyId)?.name}</span>.
            </p>
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
