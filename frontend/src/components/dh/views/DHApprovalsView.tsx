'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, CheckCircle2, XCircle, Eye, Clock } from 'lucide-react';
import { ApprovalRequest } from '../../../types/department';
import { approvalRequests, courses, classrooms } from '../../../data/departmentData';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

const statusConfig: Record<ApprovalRequest['status'], { variant: 'amber'|'emerald'|'rose'; label: string }> = {
  Pending:  { variant: 'amber',   label: 'Pending' },
  Approved: { variant: 'emerald', label: 'Approved' },
  Rejected: { variant: 'rose',    label: 'Rejected' },
};

export const DHApprovalsView: React.FC = () => {
  const [filter, setFilter] = useState<'All' | ApprovalRequest['status']>('All');
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ req: ApprovalRequest; action: 'Approve' | 'Reject' } | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, ApprovalRequest['status']>>({});
  const [rejectReason, setRejectReason] = useState('');

  const getStatus = (req: ApprovalRequest): ApprovalRequest['status'] => localStatus[req.id] ?? req.status;

  const filtered = approvalRequests.filter((r) => filter === 'All' || getStatus(r) === filter);

  const handleAction = () => {
    if (!confirmModal) return;
    const newStatus: ApprovalRequest['status'] = confirmModal.action === 'Approve' ? 'Approved' : 'Rejected';
    setLocalStatus((prev) => ({ ...prev, [confirmModal.req.id]: newStatus }));
    setConfirmModal(null);
    setRejectReason('');
    setSelected(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Approval Center"
        subtitle={`${approvalRequests.filter(r => getStatus(r) === 'Pending').length} pending · ${approvalRequests.filter(r => getStatus(r) === 'Approved').length} approved`}
        icon={<CheckSquare className="w-5 h-5" />}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${filter === s ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
            {s}
            {s !== 'All' && (
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                ({approvalRequests.filter(r => getStatus(r) === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="col-span-2 py-20 text-center">
              <CheckCircle2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="font-sans text-sm text-white/30">No approval requests in this category.</p>
            </div>
          ) : filtered.map((req) => {
            const course = courses.find((c) => c.id === req.courseId);
            const room = classrooms.find((r) => r.id === course?.roomId);
            const status = getStatus(req);
            const sc = statusConfig[status];
            const isPending = status === 'Pending';
            return (
              <motion.div key={req.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                className={`relative bg-white/5 border rounded-2xl p-5 transition-all ${isPending ? 'border-[#E9C349]/20 bg-[#E9C349]/[0.03]' : 'border-white/10'}`}>
                {isPending && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#E9C349] animate-pulse" />}

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="glass" className="text-[10px]">{req.type}</Badge>
                      <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                    </div>
                    <h3 className="font-serif text-base font-bold text-white">
                      {course ? `${course.code} — ${course.title}` : req.courseId}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-sans">
                  {course && <>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                      <p className="text-white/40 text-[10px] font-mono uppercase">Credits</p>
                      <p className="text-white font-semibold mt-0.5">{course.credits} cr</p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                      <p className="text-white/40 text-[10px] font-mono uppercase">Room</p>
                      <p className="text-white font-semibold mt-0.5 truncate">{room?.name ?? '—'}</p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                      <p className="text-white/40 text-[10px] font-mono uppercase">Capacity</p>
                      <p className="text-white font-semibold mt-0.5">{course.capacity}</p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                      <p className="text-white/40 text-[10px] font-mono uppercase">Semester</p>
                      <p className="text-white font-semibold mt-0.5">{course.semester}</p>
                    </div>
                  </>}
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Submitted by <span className="text-white/70 font-medium">{req.submittedBy}</span> · {req.submittedAt}</span>
                </div>

                {req.notes && (
                  <p className="text-xs text-white/50 italic bg-white/5 rounded-xl px-3 py-2 border border-white/8 mb-4 line-clamp-2">
                    &quot;{req.notes}&quot;
                  </p>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(req)} icon={<Eye className="w-4 h-4" />}>
                    Details
                  </Button>
                  {isPending && (
                    <>
                      <Button variant="danger" size="sm" onClick={() => setConfirmModal({ req, action: 'Reject' })}>Reject</Button>
                      <Button variant="primary" size="sm" onClick={() => setConfirmModal({ req, action: 'Approve' })} icon={<CheckCircle2 className="w-4 h-4" />}>
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Request Details" maxWidth="max-w-lg">
        {selected && (() => {
          const course = courses.find((c) => c.id === selected.courseId);
          const status = getStatus(selected);
          return (
            <div className="space-y-4 text-sm font-sans">
              <div className="flex gap-2">
                <Badge variant="glass">{selected.type}</Badge>
                <Badge variant={statusConfig[status].variant}>{status}</Badge>
              </div>
              {course && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-xs text-[#E9C349] mb-1">{course.code}</p>
                  <p className="font-semibold text-white">{course.title}</p>
                  <p className="text-white/50 text-xs mt-1">{course.description}</p>
                </div>
              )}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-1">Submitted By</p>
                <p className="text-white/80">{selected.submittedBy}</p>
                <p className="text-white/40 text-xs">{selected.submittedAt}</p>
              </div>
              {selected.notes && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-1">Notes</p>
                  <p className="text-white/70 leading-relaxed">{selected.notes}</p>
                </div>
              )}
              {status === 'Pending' && (
                <div className="flex gap-3 pt-2">
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
          <div className="space-y-4">
            <p className="font-sans text-sm text-white/70">
              Are you sure you want to <span className="font-semibold text-white">{confirmModal.action.toLowerCase()}</span> this request?
            </p>
            {confirmModal.action === 'Reject' && (
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E9C349] resize-none"
                rows={3} placeholder="Reason for rejection (recommended)..."
              />
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
