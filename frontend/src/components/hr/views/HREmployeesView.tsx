'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Users, Search, Download, Eye, EyeOff, UserX, Edit, Plus,
  Phone, Mail, AlertTriangle, ChevronDown,
} from 'lucide-react';
import {
  hrEmployeesApi, hrDepartmentsApi,
  type HREmployeeApi, type HRDepartmentApi,
  EMPLOYMENT_TYPE_LABEL, CONTRACT_STATUS_LABEL, EMPLOYEE_STATUS_LABEL,
} from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { SkeletonPage, ErrorState } from '../../ui/States';

// ── Badge helpers ─────────────────────────────────────────────────────────────
function statusBadge(s: HREmployeeApi['status']) {
  const m: Record<string, 'emerald' | 'amber' | 'glass' | 'rose'> = {
    ACTIVE: 'emerald', ON_LEAVE: 'amber', INACTIVE: 'glass', TERMINATED: 'rose',
  };
  return <Badge variant={m[s] ?? 'glass'}>{(EMPLOYEE_STATUS_LABEL as Record<string, string>)[s] ?? s}</Badge>;
}

function contractBadge(s: HREmployeeApi['contractStatus']) {
  const m: Record<string, 'emerald' | 'amber' | 'rose' | 'gold'> = {
    ACTIVE: 'emerald', EXPIRING_SOON: 'amber', EXPIRED: 'rose', PROBATION: 'gold',
  };
  return <Badge variant={m[s] ?? 'glass'}>{(CONTRACT_STATUS_LABEL as Record<string, string>)[s] ?? s}</Badge>;
}

// ── Masked sensitive field ────────────────────────────────────────────────────
function MaskedField({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = value.slice(0, 2) + '•'.repeat(Math.max(0, value.length - 4)) + value.slice(-2);
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 30000);
    return () => clearTimeout(t);
  }, [revealed]);
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-xs text-(--text-secondary)">{revealed ? value : masked}</span>
      <button onClick={() => setRevealed(p => !p)} className="text-(--text-faint) hover:text-(--brand-gold) transition-colors">
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(data: HREmployeeApi[]) {
  const headers = ['Employee Code', 'Full Name', 'Department', 'Position', 'Type', 'Status', 'Contract', 'Email', 'Phone', 'Hire Date'];
  const rows = data.map(e => [
    e.employeeCode, e.fullName, e.department?.name ?? '', e.position,
    (EMPLOYMENT_TYPE_LABEL as Record<string, string>)[e.employmentType] ?? e.employmentType,
    (EMPLOYEE_STATUS_LABEL as Record<string, string>)[e.status] ?? e.status,
    (CONTRACT_STATUS_LABEL as Record<string, string>)[e.contractStatus] ?? e.contractStatus,
    e.email, e.phone ?? '', new Date(e.hireDate).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'employees.csv'; a.click();
}

// ── Empty add-form state ──────────────────────────────────────────────────────
const EMPTY_ADD = {
  fullName: '', email: '', phone: '', gender: 'MALE' as 'MALE' | 'FEMALE',
  departmentId: '', position: '', employmentType: 'FULL_TIME',
  hireDate: new Date().toISOString().slice(0, 10),
  contractEndDate: '', managerId: '',
  education: '', experienceYears: 0,
  basicSalary: 0, allowances: 0, deductions: 0,
  nationalId: '', bankAccount: '', taxNumber: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
};

const EMPTY_EDIT = {
  fullName: '', email: '', phone: '',
  departmentId: '', position: '', employmentType: 'FULL_TIME',
  contractStatus: 'ACTIVE', status: 'ACTIVE',
  contractEndDate: '', managerId: '',
  education: '', experienceYears: 0,
  basicSalary: 0, allowances: 0, deductions: 0,
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
};

// ─────────────────────────────────────────────────────────────────────────────

export const HREmployeesView: React.FC = () => {
  const [empList,    setEmpList]    = useState<HREmployeeApi[]>([]);
  const [depts,      setDepts]      = useState<HRDepartmentApi[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');

  // filters
  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter,   setTypeFilter]   = useState('All');
  const [page,         setPage]         = useState(1);
  const PER_PAGE = 8;

  // panel / modal state
  const [selected,         setSelected]         = useState<HREmployeeApi | null>(null);
  const [selectedFull,     setSelectedFull]     = useState<HREmployeeApi | null>(null);
  const [loadingFull,      setLoadingFull]      = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<HREmployeeApi | null>(null);
  const [isAddOpen,        setIsAddOpen]        = useState(false);
  const [editTarget,       setEditTarget]       = useState<HREmployeeApi | null>(null);

  const [addForm,  setAddForm]  = useState(EMPTY_ADD);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  // ── Load employees + departments ─────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [res, deptRes] = await Promise.all([
        hrEmployeesApi.list({
          page, limit: PER_PAGE,
          search:         search || undefined,
          departmentId:   deptFilter !== 'All' ? deptFilter : undefined,
          status:         statusFilter !== 'All' ? statusFilter : undefined,
          employmentType: typeFilter !== 'All' ? typeFilter : undefined,
        }),
        hrDepartmentsApi.list(),
      ]);
      setEmpList(res.employees);
      setTotal(res.total);
      setDepts(deptRes);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load employees'); }
    finally { setLoading(false); }
  }, [page, search, deptFilter, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // ── Open profile panel — fetch full details including sensitive fields ─────
  const openProfile = async (emp: HREmployeeApi) => {
    setSelected(emp);
    setSelectedFull(null);
    setLoadingFull(true);
    try {
      const full = await hrEmployeesApi.getFullById(emp.id);
      setSelectedFull(full);
    } catch { /* show partial */ }
    finally { setLoadingFull(false); }
  };

  // ── Add employee ──────────────────────────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveError('');
    try {
      // Build a deterministic employee code: dept prefix + 4-digit timestamp
      const deptName  = depts.find(d => d.id === addForm.departmentId)?.name ?? 'GEN';
      const prefix    = deptName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
      const code      = `HC-${prefix}-${Date.now().toString().slice(-4)}`;

      await hrEmployeesApi.create({
        ...addForm,
        employeeCode:   code,
        experienceYears: Number(addForm.experienceYears),
        basicSalary:    Number(addForm.basicSalary),
        allowances:     Number(addForm.allowances),
        deductions:     Number(addForm.deductions),
        contractEndDate: addForm.contractEndDate || undefined,
        managerId:      addForm.managerId || undefined,
      });
      setIsAddOpen(false);
      setAddForm(EMPTY_ADD);
      load();
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Failed to create employee'); }
    finally { setSaving(false); }
  };

  // ── Edit employee ─────────────────────────────────────────────────────────
  const openEdit = (emp: HREmployeeApi) => {
    setEditTarget(emp);
    setEditForm({
      fullName:         emp.fullName,
      email:            emp.email,
      phone:            emp.phone ?? '',
      departmentId:     emp.departmentId,
      position:         emp.position,
      employmentType:   emp.employmentType,
      contractStatus:   emp.contractStatus,
      status:           emp.status,
      contractEndDate:  emp.contractEndDate ? new Date(emp.contractEndDate).toISOString().slice(0, 10) : '',
      managerId:        emp.managerId ?? '',
      education:        emp.education ?? '',
      experienceYears:  emp.experienceYears,
      basicSalary:      emp.basicSalary,
      allowances:       emp.allowances,
      deductions:       emp.deductions,
      emergencyName:    emp.emergencyName ?? '',
      emergencyPhone:   emp.emergencyPhone ?? '',
      emergencyRelation: emp.emergencyRelation ?? '',
    });
    setSaveError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setSaveError('');
    try {
      await hrEmployeesApi.update(editTarget.id, {
        ...editForm,
        experienceYears: Number(editForm.experienceYears),
        basicSalary:    Number(editForm.basicSalary),
        allowances:     Number(editForm.allowances),
        deductions:     Number(editForm.deductions),
        contractEndDate: editForm.contractEndDate || null,
        managerId:      editForm.managerId || null,
      });
      setEditTarget(null);
      load();
      // refresh profile panel if same employee is open
      if (selected?.id === editTarget.id) openProfile(editTarget);
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Failed to update employee'); }
    finally { setSaving(false); }
  };

  // ── Deactivate ────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await hrEmployeesApi.deactivate(deactivateTarget.id);
      load();
      if (selected?.id === deactivateTarget.id) setSelected(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Deactivation failed'); }
    finally { setDeactivateTarget(null); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  const activeCount   = empList.filter(e => e.status === 'ACTIVE').length;
  const expiringCount = empList.filter(e => e.contractStatus === 'EXPIRING_SOON').length;

  // ─── shared select class ───
  const sel = 'w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)';
  const filterSel = 'px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      <DHPageHeader
        title="Employees"
        subtitle={`${activeCount} active · ${expiringCount} contracts expiring · ${total} total`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => exportCsv(empList)}>
              Export CSV
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setIsAddOpen(true); setSaveError(''); }}>
              Add Employee
            </Button>
          </div>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, ID, position, or email…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className={filterSel}>
            <option value="All">All Depts</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={filterSel}>
            {['All','ACTIVE','ON_LEAVE','INACTIVE','TERMINATED'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Status' : (EMPLOYEE_STATUS_LABEL as Record<string,string>)[s] ?? s}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={filterSel}>
            {['All','FULL_TIME','PART_TIME','CONTRACT','INTERN'].map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : (EMPLOYMENT_TYPE_LABEL as Record<string,string>)[t] ?? t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Employee','Department','Position','Type','Contract','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {empList.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-(--text-faint) font-sans text-sm">No employees match your filters.</td></tr>
            ) : empList.map(emp => (
              <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="hover:bg-(--hover-overlay) transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img src={emp.avatarUrl ?? '/tigist.png'} alt={emp.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-(--border-default)" />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-(--bg-base) ${
                        emp.status === 'ACTIVE' ? 'bg-(--status-success)' :
                        emp.status === 'ON_LEAVE' ? 'bg-(--status-warning)' : 'bg-(--active-overlay)'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-(--text-primary) text-xs">{emp.fullName}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{emp.employeeCode}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[130px]">
                  {emp.department?.name.split('&')[0].trim()}
                </td>
                <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[160px]">{emp.position}</td>
                <td className="px-4 py-3.5">
                  <Badge variant="glass" className="text-[10px]">
                    {(EMPLOYMENT_TYPE_LABEL as Record<string,string>)[emp.employmentType] ?? emp.employmentType}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">{contractBadge(emp.contractStatus)}</td>
                <td className="px-4 py-3.5">{statusBadge(emp.status)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button title="View Profile" onClick={() => openProfile(emp)}
                      className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button title="Edit Employee" onClick={() => openEdit(emp)}
                      className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--brand-gold) transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    {emp.status === 'ACTIVE' && (
                      <button title="Deactivate" onClick={() => setDeactivateTarget(emp)}
                        className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                    {emp.contractStatus === 'EXPIRING_SOON' && (
                      <span title="Contract expiring soon">
                        <AlertTriangle className="w-4 h-4 text-(--status-warning)" />
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} employees · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* ── Profile Panel ───────────────────────────────────────────────── */}
      <SlidePanel isOpen={!!selected} onClose={() => { setSelected(null); setSelectedFull(null); }}
        title={selected?.fullName ?? ''} subtitle="Employee Profile" width="max-w-2xl">
        {selected && (() => {
          const emp = selectedFull ?? selected;
          return (
            <div className="space-y-5 text-sm font-sans">
              {/* Header */}
              <div className="flex items-center gap-4">
                <img src={emp.avatarUrl ?? '/tigist.png'} alt={emp.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-(--border-default)" />
                <div>
                  <p className="font-sans text-base font-bold text-(--text-primary)">{emp.position}</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5">{emp.department?.name}</p>
                  <div className="flex gap-2 mt-1.5">{statusBadge(emp.status)}{contractBadge(emp.contractStatus)}</div>
                </div>
                <Button variant="secondary" size="sm" className="ml-auto" onClick={() => openEdit(emp)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Employment details */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['Employee ID', emp.employeeCode],
                  ['Hire Date', new Date(emp.hireDate).toLocaleDateString()],
                  ['Type', (EMPLOYMENT_TYPE_LABEL as Record<string,string>)[emp.employmentType] ?? emp.employmentType],
                  ['Education', emp.education ?? '—'],
                  ['Experience', `${emp.experienceYears} yr${emp.experienceYears !== 1 ? 's' : ''}`],
                  ['Contract End', emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString() : 'Permanent'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                    <p className="text-(--text-secondary) text-xs mt-1">{v}</p>
                  </div>
                ))}
              </div>

              {/* Salary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Basic Salary</p>
                  <MaskedField value={`ETB ${emp.basicSalary.toLocaleString()}`} />
                </div>
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Allowances</p>
                  <MaskedField value={`ETB ${emp.allowances.toLocaleString()}`} />
                </div>
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Gross Monthly</p>
                  <MaskedField value={`ETB ${(emp.basicSalary + emp.allowances).toLocaleString()}`} />
                </div>
              </div>

              {/* Sensitive fields — only visible when full detail loaded */}
              {loadingFull && (
                <p className="text-xs text-(--text-faint) animate-pulse">Loading sensitive details…</p>
              )}
              {selectedFull && (selectedFull.nationalId || selectedFull.bankAccount || selectedFull.taxNumber) && (
                <div className="grid grid-cols-3 gap-3">
                  {selectedFull.nationalId && (
                    <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">National ID</p>
                      <MaskedField value={selectedFull.nationalId} />
                    </div>
                  )}
                  {selectedFull.bankAccount && (
                    <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Bank Account</p>
                      <MaskedField value={selectedFull.bankAccount} />
                    </div>
                  )}
                  {selectedFull.taxNumber && (
                    <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Tax Number</p>
                      <MaskedField value={selectedFull.taxNumber} />
                    </div>
                  )}
                </div>
              )}

              {/* Emergency contact */}
              {emp.emergencyName && (
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint) mb-1">Emergency Contact</p>
                  <div className="flex items-center gap-4 text-xs text-(--text-secondary)">
                    <span className="font-semibold text-(--text-primary)">{emp.emergencyName}</span>
                    {emp.emergencyRelation && <><span>·</span><span>{emp.emergencyRelation}</span></>}
                    {emp.emergencyPhone && <><span>·</span><span className="font-mono">{emp.emergencyPhone}</span></>}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="flex items-center gap-4 text-xs text-(--text-secondary)">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-(--text-faint)" />{emp.email}</span>
                {emp.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-(--text-faint)" /><span className="font-mono">{emp.phone}</span></span>}
              </div>
            </div>
          );
        })()}
      </SlidePanel>

      {/* ── Deactivate Confirm ──────────────────────────────────────────── */}
      <ConfirmModal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate}
        title="Deactivate Employee"
        message={`This will set ${deactivateTarget?.fullName} to Inactive and revoke system access. Historical records are preserved.`}
        icon={<UserX className="w-6 h-6" />} variant="danger" confirmLabel="Confirm Deactivate" />

      {/* ── Add Employee Modal ──────────────────────────────────────────── */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Employee" maxWidth="max-w-2xl">
        <form onSubmit={handleAddSubmit} className="space-y-5">
          {saveError && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">{saveError}</p>}

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full Name *" required value={addForm.fullName} onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))} />
              <Input label="Email Address *" type="email" required value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Phone" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Gender *</label>
                <select required value={addForm.gender} onChange={e => setAddForm(f => ({ ...f, gender: e.target.value as 'MALE'|'FEMALE' }))} className={sel}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Employment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Department *</label>
                <select required value={addForm.departmentId} onChange={e => setAddForm(f => ({ ...f, departmentId: e.target.value }))} className={sel}>
                  <option value="">— Select —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <Input label="Position Title *" required value={addForm.position} onChange={e => setAddForm(f => ({ ...f, position: e.target.value }))} />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Employment Type *</label>
                <select value={addForm.employmentType} onChange={e => setAddForm(f => ({ ...f, employmentType: e.target.value }))} className={sel}>
                  {['FULL_TIME','PART_TIME','CONTRACT','INTERN'].map(t => <option key={t} value={t}>{(EMPLOYMENT_TYPE_LABEL as Record<string,string>)[t]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Hire Date *</label>
                <input type="date" required value={addForm.hireDate} onChange={e => setAddForm(f => ({ ...f, hireDate: e.target.value }))}
                  className={sel} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Contract End Date</label>
                <input type="date" value={addForm.contractEndDate} onChange={e => setAddForm(f => ({ ...f, contractEndDate: e.target.value }))}
                  className={sel} />
              </div>
              <Input label="Education" value={addForm.education} onChange={e => setAddForm(f => ({ ...f, education: e.target.value }))} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Salary</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Basic Salary (ETB) *" type="number" min="0" required value={String(addForm.basicSalary)} onChange={e => setAddForm(f => ({ ...f, basicSalary: Number(e.target.value) }))} />
              <Input label="Allowances (ETB)" type="number" min="0" value={String(addForm.allowances)} onChange={e => setAddForm(f => ({ ...f, allowances: Number(e.target.value) }))} />
              <Input label="Deductions (ETB)" type="number" min="0" value={String(addForm.deductions)} onChange={e => setAddForm(f => ({ ...f, deductions: Number(e.target.value) }))} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Emergency Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Name" value={addForm.emergencyName} onChange={e => setAddForm(f => ({ ...f, emergencyName: e.target.value }))} />
              <Input label="Phone" value={addForm.emergencyPhone} onChange={e => setAddForm(f => ({ ...f, emergencyPhone: e.target.value }))} />
              <Input label="Relation" value={addForm.emergencyRelation} onChange={e => setAddForm(f => ({ ...f, emergencyRelation: e.target.value }))} />
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={saving}>{saving ? 'Creating…' : 'Create Employee'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Employee Modal ─────────────────────────────────────────── */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.fullName}`} maxWidth="max-w-2xl">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          {saveError && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger-border) p-3 rounded-xl">{saveError}</p>}

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Personal</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full Name *" required value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
              <Input label="Email *" type="email" required value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Employment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Department</label>
                <select value={editForm.departmentId} onChange={e => setEditForm(f => ({ ...f, departmentId: e.target.value }))} className={sel}>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <Input label="Position" required value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))} />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Employment Type</label>
                <select value={editForm.employmentType} onChange={e => setEditForm(f => ({ ...f, employmentType: e.target.value }))} className={sel}>
                  {['FULL_TIME','PART_TIME','CONTRACT','INTERN'].map(t => <option key={t} value={t}>{(EMPLOYMENT_TYPE_LABEL as Record<string,string>)[t]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={sel}>
                  {['ACTIVE','ON_LEAVE','INACTIVE','TERMINATED'].map(s => <option key={s} value={s}>{(EMPLOYEE_STATUS_LABEL as Record<string,string>)[s]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Contract Status</label>
                <select value={editForm.contractStatus} onChange={e => setEditForm(f => ({ ...f, contractStatus: e.target.value }))} className={sel}>
                  {['ACTIVE','EXPIRING_SOON','EXPIRED','PROBATION'].map(s => <option key={s} value={s}>{(CONTRACT_STATUS_LABEL as Record<string,string>)[s]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Contract End Date</label>
                <input type="date" value={editForm.contractEndDate} onChange={e => setEditForm(f => ({ ...f, contractEndDate: e.target.value }))} className={sel} />
              </div>
              <Input label="Education" value={editForm.education} onChange={e => setEditForm(f => ({ ...f, education: e.target.value }))} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Salary</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Basic Salary (ETB)" type="number" min="0" value={String(editForm.basicSalary)} onChange={e => setEditForm(f => ({ ...f, basicSalary: Number(e.target.value) }))} />
              <Input label="Allowances (ETB)" type="number" min="0" value={String(editForm.allowances)} onChange={e => setEditForm(f => ({ ...f, allowances: Number(e.target.value) }))} />
              <Input label="Deductions (ETB)" type="number" min="0" value={String(editForm.deductions)} onChange={e => setEditForm(f => ({ ...f, deductions: Number(e.target.value) }))} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold)">Emergency Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Name" value={editForm.emergencyName} onChange={e => setEditForm(f => ({ ...f, emergencyName: e.target.value }))} />
              <Input label="Phone" value={editForm.emergencyPhone} onChange={e => setEditForm(f => ({ ...f, emergencyPhone: e.target.value }))} />
              <Input label="Relation" value={editForm.emergencyRelation} onChange={e => setEditForm(f => ({ ...f, emergencyRelation: e.target.value }))} />
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};
