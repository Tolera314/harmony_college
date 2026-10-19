'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, CheckCircle2, XCircle, AlertCircle, FileText,
  Download, ZoomIn, ZoomOut, RotateCw, Maximize2, Send,
  Image as ImageIcon, Calendar, User, Phone, MapPin, FileCheck2, ExternalLink,
  ShieldCheck, ShieldAlert, GraduationCap, Users, Clock, CheckCircle, XCircle as XCircleIcon,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable, EmptyState, ErrorState } from '../ui/States';
import {
  admissionsApi, staffInvitationsApi, apiFetch, qs,
  type Application, type AdmissionsListResponse, type StaffInvitation, type StaffInvitationsResponse,
} from '@/src/lib/registrarApi';

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, any> = {
  DRAFT: 'glass', SUBMITTED: 'glass', UNDER_REVIEW: 'amber',
  ACCEPTED: 'emerald', REJECTED: 'rose', WAITLISTED: 'amber',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Applied', UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Approved', REJECTED: 'Rejected', WAITLISTED: 'Waitlisted',
};

const INV_BADGE: Record<string, any> = {
  PENDING: 'amber', ACCEPTED: 'emerald', EXPIRED: 'glass', REVOKED: 'rose',
};
const ROLE_LABEL: Record<string, string> = {
  INSTRUCTOR: 'Instructor', DEPARTMENT_HEAD: 'Dept. Head',
  REGISTRAR: 'Registrar', FINANCE_OFFICER: 'Finance Officer',
  HR_OFFICER: 'HR Officer', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin',
};

// ─────────────────────────────────────────────────────────────────────────────
// STAFF INVITATIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
const StaffInvitationsTab: React.FC = () => {
  const [data, setData]           = useState<StaffInvitationsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]           = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pg = 1, q = search, r = roleFilter, s = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await staffInvitationsApi.list({
        page: pg, limit: 15,
        ...(q ? { search: q } : {}),
        ...(r ? { role: r } : {}),
        ...(s ? { status: s } : {}),
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invitations');
    } finally { setLoading(false); }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { load(page); }, [page]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(1, val, roleFilter, statusFilter), 350);
  };

  const invitations = data?.invitations ?? [];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-(--hover-overlay) border border-(--border-default) p-4 rounded-2xl">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); load(1, search, e.target.value, statusFilter); }}
          className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); load(1, search, roleFilter, e.target.value); }}
          className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load(page)} description={error} />
      ) : (
        <div className="overflow-x-auto border ds-card rounded-2xl backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Position</th>
                <th className="px-5 py-4">Invited By</th>
                <th className="px-5 py-4">Invited On</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {invitations.map(inv => (
                <tr key={inv.id} className="ds-table-row transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-(--hover-overlay) border border-(--border-strong) flex items-center justify-center font-serif font-bold text-xs text-(--brand-gold)">
                        {inv.fullName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary)">{inv.fullName}</p>
                        <p className="text-[10px] text-(--text-faint)">{inv.email}</p>
                        {inv.employeeId && <p className="font-mono text-[10px] text-(--text-faint)">{inv.employeeId}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="gold">{ROLE_LABEL[inv.role] ?? inv.role}</Badge>
                  </td>
                  <td className="px-5 py-4 text-(--text-secondary)">
                    {inv.department ? (
                      <span>{inv.department.name} <span className="font-mono text-[10px] text-(--text-faint)">({inv.department.code})</span></span>
                    ) : <span className="text-(--text-faint)">—</span>}
                  </td>
                  <td className="px-5 py-4 text-(--text-secondary)">{inv.positionTitle ?? '—'}</td>
                  <td className="px-5 py-4 text-(--text-secondary)">
                    {inv.acceptedAt ? (
                      <div>
                        <p className="font-semibold text-(--status-success)">{inv.acceptedByUser?.fullName ?? '—'}</p>
                        <p className="text-[10px] text-(--text-faint)">Accepted {new Date(inv.acceptedAt).toLocaleDateString()}</p>
                      </div>
                    ) : inv.invitedByUser?.fullName ?? '—'}
                  </td>
                  <td className="px-5 py-4 font-mono text-(--text-muted)">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {inv.status === 'ACCEPTED' && <CheckCircle className="w-3.5 h-3.5 text-(--status-success)" />}
                      {inv.status === 'PENDING'  && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                      {inv.status === 'EXPIRED'  && <XCircleIcon className="w-3.5 h-3.5 text-(--text-faint)" />}
                      {inv.status === 'REVOKED'  && <XCircleIcon className="w-3.5 h-3.5 text-(--status-danger)" />}
                      <Badge variant={INV_BADGE[inv.status] ?? 'glass'}>{inv.status}</Badge>
                    </div>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="search" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} invitations · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ADMISSIONS TAB (Payment-Verified Students)
// ─────────────────────────────────────────────────────────────────────────────

interface AdmissionStudent {
  userId: string;
  registrationFeePaid: boolean;
  registrationFeePaidAt: string | null;
  departmentSelected: boolean;
  paymentVerifiedByFinance: boolean;
  paymentVerifiedAt: string | null;
  paymentVerifiedByUserId: string | null;
  notifiedByRegistrar: boolean;
  notifiedAt: string | null;
  selectedDepartmentId: string | null;
  program: string | null;
  programType: string | null;
  shortProgramDuration: string | null;
  matricResult: string | null;
  ministryResult: string | null;
  transcriptUrl: string | null;
  profilePictureUrl: string | null;
  nationalId: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string; createdAt: string; profileCompleted: boolean };
  selectedDepartment: { id: string; name: string; code: string } | null;
}

interface AdmissionsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  admissions: AdmissionStudent[];
}

const StudentApplicationsTab: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [subTab, setSubTab] = useState<'pending' | 'approved'>('pending');
  const [data, setData] = useState<AdmissionsResponse | null>(null);
  const [selected, setSelected] = useState<AdmissionStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pg = page, q = search, pf = programFilter, tab = subTab) => {
    setLoading(true); setError(null);
    try {
      // Filter by profileCompleted status: false = pending, true = approved
      const isApproved = tab === 'approved';
      const res = await apiFetch<AdmissionsResponse>(`/api/registrar/admissions${qs({ 
        page: pg, 
        limit: 15, 
        search: q, 
        program: pf || undefined,
        approved: isApproved ? 'true' : 'false',
        programType,
      })}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admissions');
    } finally { setLoading(false); }
  }, [page, search, programFilter, subTab, programType]);

  useEffect(() => { load(); }, [page, subTab, load, programType]);

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, programFilter, subTab), 350);
  };

  const handleFilter = (val: string) => { setProgramFilter(val); setPage(1); load(1, search, val, subTab); };

  const doAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true); setActionError(null);
    try {
      await action();
      await load(page, search, programFilter, subTab);
      setSelected(null); // Close drawer after success
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleApprove = () => doAction(() => apiFetch(`/api/registrar/admissions/${selected!.userId}/approve`, { method: 'PATCH' }));

  return (
    <>
      {/* Sub-tabs: Pending / Approved */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => { setSubTab('pending'); setPage(1); }}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === 'pending'
              ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-2 border-(--brand-gold)/30'
              : 'bg-(--hover-overlay) text-(--text-secondary) border border-(--border-default) hover:border-(--border-strong)'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Pending Approval</span>
            {data && subTab === 'pending' && <Badge variant="amber" className="ml-1">{data.total}</Badge>}
          </div>
        </button>
        <button
          onClick={() => { setSubTab('approved'); setPage(1); }}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === 'approved'
              ? 'bg-(--status-success-bg) text-(--status-success) border-2 border-(--status-success-border)'
              : 'bg-(--hover-overlay) text-(--text-secondary) border border-(--border-default) hover:border-(--border-strong)'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Approved</span>
            {data && subTab === 'approved' && <Badge variant="emerald" className="ml-1">{data.total}</Badge>}
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-(--hover-overlay) border border-(--border-default) p-4 rounded-2xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)" />
        </div>
        <select value={programFilter} onChange={e => handleFilter(e.target.value)}
          className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
          <option value="">All Programs</option>
          <option value="HND">HND</option>
          <option value="ND">ND</option>
          <option value="Short Program">Short Program</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable /> : error ? (
        <ErrorState variant="network" onRetry={() => load()} description={error} />
      ) : (
        <div className="overflow-x-auto border ds-card rounded-2xl backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b ds-table-header font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Registered</th>
                <th className="px-5 py-4">Payment Verified</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y ds-table-row ds-table-cell">
              {(data?.admissions ?? []).map(student => (
                <tr key={student.userId} onClick={() => { setSelected(student); setActionError(null); }}
                  className="ds-table-row transition-colors cursor-pointer group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {student.profilePictureUrl ? (
                        <img src={student.profilePictureUrl} alt={student.user.fullName} className="w-8 h-8 rounded-full border border-(--border-strong) object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-(--hover-overlay) border border-(--border-strong) flex items-center justify-center font-serif font-bold text-xs text-(--brand-gold)">
                          {student.user.fullName[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-(--text-primary) group-hover:text-(--brand-gold) transition-colors">{student.user.fullName}</p>
                        <p className="text-[10px] text-(--text-faint)">{student.user.email}</p>
                        {student.user.phone && <p className="text-[10px] text-(--text-faint)">{student.user.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-(--text-secondary)">{student.program ?? '—'}</p>
                    {student.programType && <Badge variant="glass" className="text-[9px] mt-1">{student.programType}</Badge>}
                  </td>
                  <td className="px-5 py-4 text-(--text-secondary)">
                    {student.selectedDepartment ? (
                      <span>{student.selectedDepartment.name} <span className="font-mono text-[10px] text-(--text-faint)">({student.selectedDepartment.code})</span></span>
                    ) : <span className="text-(--text-faint)">—</span>}
                  </td>
                  <td className="px-5 py-4 font-mono text-(--text-muted)">{new Date(student.user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-(--status-success) shrink-0" />
                      <span className="text-[10px] font-semibold text-(--status-success)">
                        {student.paymentVerifiedAt ? new Date(student.paymentVerifiedAt).toLocaleDateString() : 'Verified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {student.user.profileCompleted ? (
                      <Badge variant="emerald">Approved</Badge>
                    ) : (
                      <Badge variant="amber">Pending</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setSelected(student); setActionError(null); }}
                      className="px-3 py-1.5 rounded-xl border border-(--border-default) bg-(--hover-overlay) text-(--text-secondary) hover:text-(--brand-gold) hover:border-(--brand-gold)/30 text-[10px] font-semibold transition-all">
                      {student.user.profileCompleted ? 'View' : 'Review'}
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.admissions ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-0"><EmptyState variant="search" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-(--text-faint)">{data.total} applications · Page {page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[650px] bg-(--bg-base) border-l border-(--border-default) z-50 overflow-y-auto flex flex-col shadow-2xl font-sans">

              {/* Drawer Header */}
              <div className="p-6 border-b border-(--border-default) flex items-center justify-between sticky top-0 bg-(--bg-base) z-10">
                <div>
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase tracking-widest">Admission Review</span>
                  <h3 className="text-lg font-serif font-bold text-(--text-primary) flex items-center gap-2">
                    {selected.user.fullName}
                    {selected.user.profileCompleted ? (
                      <Badge variant="emerald">Approved</Badge>
                    ) : (
                      <Badge variant="amber">Pending Approval</Badge>
                    )}
                  </h3>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl text-(--text-muted) hover:text-(--text-primary) transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-6">
                {actionError && (
                  <div className="p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">{actionError}</div>
                )}

                {/* Student Info */}
                <div className="p-5 bg-(--hover-overlay) border border-(--border-default) rounded-2xl space-y-4">
                  <div className="flex items-center gap-4 border-b border-(--border-subtle) pb-4">
                    {selected.profilePictureUrl ? (
                      <img src={selected.profilePictureUrl} alt={selected.user.fullName} className="w-14 h-14 rounded-xl border-2 border-(--brand-gold)/30 object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-(--brand-gold)/20 border-2 border-(--brand-gold)/30 flex items-center justify-center font-serif font-bold text-xl text-(--brand-gold)">{selected.user.fullName[0]}</div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-(--text-primary)">{selected.user.fullName}</p>
                      <p className="text-xs text-(--text-faint)">{selected.user.email}</p>
                      {selected.user.phone && <p className="text-xs text-(--text-faint)">{selected.user.phone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: GraduationCap, label: 'Program', val: selected.program ?? '—' },
                      { icon: FileCheck2, label: 'Program Type', val: selected.programType ?? '—' },
                      { icon: User, label: 'Department', val: selected.selectedDepartment?.name ?? '—' },
                      { icon: FileText, label: 'National ID', val: selected.nationalId ?? '—' },
                      { icon: Calendar, label: 'Registered', val: new Date(selected.createdAt).toLocaleDateString() },
                      { icon: ShieldCheck, label: 'Payment Verified', val: selected.paymentVerifiedAt ? new Date(selected.paymentVerifiedAt).toLocaleDateString() : '—' },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1 p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                        <span className="text-[10px] font-mono text-(--text-faint) flex items-center gap-1">
                          <item.icon className="w-3 h-3 text-(--brand-gold)" /> {item.label}
                        </span>
                        <p className="text-xs text-(--text-primary) font-medium truncate">{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Academic Documents */}
                {(selected.matricResult || selected.ministryResult || selected.transcriptUrl) && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Academic Records</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {selected.matricResult && (
                        <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                          <p className="text-[10px] font-mono text-(--text-faint) mb-1">Matric Result</p>
                          <p className="text-xs text-(--text-primary) font-semibold">{selected.matricResult}</p>
                        </div>
                      )}
                      {selected.ministryResult && (
                        <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                          <p className="text-[10px] font-mono text-(--text-faint) mb-1">Ministry Result</p>
                          <p className="text-xs text-(--text-primary) font-semibold">{selected.ministryResult}</p>
                        </div>
                      )}
                      {selected.transcriptUrl && (
                        <div className="p-3 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                          <p className="text-[10px] font-mono text-(--text-faint) mb-1">Transcript</p>
                          <a href={selected.transcriptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-(--brand-gold) hover:underline flex items-center gap-1">
                            View Document <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!selected.user.profileCompleted && (
                  <div className="relative p-5 bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-2 border-emerald-500/40 rounded-2xl space-y-3 shadow-lg shadow-emerald-500/20 animate-pulse-subtle">
                    {/* Attention badge */}
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg animate-bounce-slow">
                      ACTION REQUIRED
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-emerald-400">Ready for Admission Approval</h4>
                    </div>
                    <p className="text-xs text-(--text-secondary) leading-relaxed">
                      ✅ Payment verified by Finance Officer<br/>
                      ✅ Department selected and confirmed<br/>
                      🎓 Student is ready to be approved for admission
                    </p>
                    <div className="flex gap-2 pt-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleApprove} 
                        disabled={actionLoading} 
                        className="flex-1 !bg-gradient-to-r !from-emerald-500 !to-green-600 hover:!from-emerald-600 hover:!to-green-700 !text-white font-bold !py-3 !text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      >
                        {actionLoading ? (
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Approve Admission Now
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {selected.user.profileCompleted && (
                  <div className="p-5 bg-(--status-success-bg) border border-(--status-success-border)/40 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-(--status-success)" />
                      <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-(--status-success)">Admission Approved</h4>
                    </div>
                    <p className="text-xs text-(--text-secondary)">This student has been approved and can now access the Student Dashboard.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — tab switcher
// ─────────────────────────────────────────────────────────────────────────────
export const AdmissionsManagement: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');

  const tabs = [
    { id: 'students' as const, label: 'Student Applications', icon: GraduationCap },
    { id: 'staff'    as const, label: 'Staff Invitations',    icon: Users },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-(--text-primary)">Admissions Management</h2>
          <p className="text-xs text-(--text-muted)">Review student applications and track staff onboarding invitations.</p>
        </div>
      </div>

      {/* Top tab bar */}
      <div className="flex gap-1 p-1 bg-(--hover-overlay) border border-(--border-default) rounded-2xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans transition-all ${
                active
                  ? 'bg-(--brand-gold) text-(--bg-base) shadow-sm'
                  : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--active-overlay)'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'students' ? <StudentApplicationsTab programType={programType} /> : <StaffInvitationsTab />}
        </motion.div>
      </AnimatePresence>

    </motion.div>
  );
};
