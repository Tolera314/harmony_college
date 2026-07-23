'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Download, Eye, EyeOff, UserX, Edit, Plus, Phone, Mail, MapPin, X } from 'lucide-react';
import { Employee } from '../../../types/hr';
import { employees, departments, getDeptById } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';

const statusBadge = (s: Employee['status']) => {
  const m: Record<Employee['status'], 'emerald'|'amber'|'rose'|'glass'> = {
    Active: 'emerald', 'On Leave': 'amber', Inactive: 'glass', Terminated: 'rose',
  };
  return <Badge variant={m[s]}>{s}</Badge>;
};

const contractBadge = (s: Employee['contractStatus']) => {
  const m: Record<Employee['contractStatus'], 'emerald'|'amber'|'rose'|'gold'> = {
    Active: 'emerald', 'Expiring Soon': 'amber', Expired: 'rose', Probation: 'gold',
  };
  return <Badge variant={m[s]}>{s}</Badge>;
};

// Sensitive field masker
function MaskedField({ value, label }: { value: string; label: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = value.replace(/./g, '•').slice(0, -4) + value.slice(-4);
  React.useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 30000);
    return () => clearTimeout(t);
  }, [revealed]);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-white/70">{revealed ? value : masked}</span>
      <button onClick={() => setRevealed(p => !p)} className="text-white/40 hover:text-[#E9C349] transition-colors" aria-label={revealed ? 'Hide' : 'Reveal'}>
        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export const HREmployeesView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All'|Employee['status']>('All');
  const [typeFilter, setTypeFilter] = useState<'All'|Employee['employmentType']>('All');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [deactivateModal, setDeactivateModal] = useState<Employee | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.position.toLowerCase().includes(q);
    const matchD = deptFilter === 'All' || e.departmentId === deptFilter;
    const matchS = statusFilter === 'All' || e.status === statusFilter;
    const matchT = typeFilter === 'All' || e.employmentType === typeFilter;
    return matchQ && matchD && matchS && matchT;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Employees"
        subtitle={`${employees.filter(e => e.status === 'Active').length} active · ${employees.filter(e => e.contractStatus === 'Expiring Soon').length} contracts expiring`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add Employee</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, ID, or position..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="flex gap-2 flex-wrap">
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
            <option className="bg-[#1a1a1b]" value="All">All Departments</option>
            {departments.map(d => <option key={d.id} className="bg-[#1a1a1b]" value={d.id}>{d.name.split(' ')[0]}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
            {['All', 'Active', 'On Leave', 'Inactive', 'Terminated'].map(s => <option key={s} className="bg-[#1a1a1b]" value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1); }} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
            {['All', 'Full-Time', 'Part-Time', 'Contract', 'Intern'].map(t => <option key={t} className="bg-[#1a1a1b]" value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Employee', 'Department', 'Position', 'Type', 'Contract', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/85">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-white/30">No employees match your filters.</td></tr>
            ) : paginated.map(emp => {
              const dept = getDeptById(emp.departmentId);
              return (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0F0F10] ${emp.status === 'Active' ? 'bg-emerald-400' : emp.status === 'On Leave' ? 'bg-amber-400' : 'bg-white/20'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{emp.name}</p>
                        <p className="font-mono text-[10px] text-white/40">{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-white/60 text-xs truncate max-w-[130px]">{dept?.name.split(' ')[0]}</td>
                  <td className="px-4 py-3.5 text-white/70 text-xs truncate max-w-[160px]">{emp.position}</td>
                  <td className="px-4 py-3.5"><Badge variant="glass" className="text-[10px]">{emp.employmentType}</Badge></td>
                  <td className="px-4 py-3.5">{contractBadge(emp.contractStatus)}</td>
                  <td className="px-4 py-3.5">{statusBadge(emp.status)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(emp)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="View profile"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Edit"><Edit className="w-4 h-4" /></button>
                      {emp.status === 'Active' && (
                        <button onClick={() => setDeactivateModal(emp)} className="p-1.5 rounded-lg hover:bg-rose-950/30 text-white/50 hover:text-rose-400 transition-colors" aria-label="Deactivate"><UserX className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-white/40">{filtered.length} employees · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Employee Profile Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name} maxWidth="max-w-2xl">
        {selected && (() => {
          const dept = getDeptById(selected.departmentId);
          return (
            <div className="space-y-5 text-sm font-sans">
              <div className="flex items-center gap-4">
                <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10" />
                <div>
                  <p className="font-sans text-base font-bold text-white">{selected.position}</p>
                  <p className="font-sans text-xs text-white/50 mt-0.5">{dept?.name}</p>
                  <div className="flex gap-2 mt-1.5">{statusBadge(selected.status)}{contractBadge(selected.contractStatus)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[['Employee ID', selected.employeeId], ['Hire Date', selected.hireDate], ['Type', selected.employmentType], ['Education', selected.education], ['Experience', `${selected.experience} years`]].map(([k, v]) => (
                  <div key={String(k)} className="p-3 bg-white/5 rounded-xl border border-white/8">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{k}</p>
                    <p className="text-white/80 text-xs mt-1">{v}</p>
                  </div>
                ))}
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Monthly Salary</p>
                  <MaskedField value={`ETB ${(selected.basicSalary + selected.allowances).toLocaleString()}`} label="Salary" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">National ID</p>
                  <MaskedField value={selected.nationalId} label="National ID" />
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Bank Account</p>
                  <MaskedField value={selected.bankAccount} label="Bank Account" />
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Tax Number</p>
                  <MaskedField value={selected.taxNumber} label="Tax Number" />
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/8 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Emergency Contact</p>
                <div className="flex items-center gap-4 text-xs text-white/70">
                  <span className="font-semibold text-white">{selected.emergencyName}</span>
                  <span>·</span><span>{selected.emergencyRelation}</span>
                  <span>·</span><span className="font-mono">{selected.emergencyPhone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-white/60">
                <Mail className="w-3.5 h-3.5 text-white/30" /><span>{selected.email}</span>
                <Phone className="w-3.5 h-3.5 text-white/30 ml-2" /><span className="font-mono">{selected.phone}</span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={!!deactivateModal} onClose={() => setDeactivateModal(null)} title="Deactivate Employee" maxWidth="max-w-md">
        {deactivateModal && (
          <div className="space-y-4 font-sans text-sm">
            <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 leading-relaxed">
              This will disable system access for <span className="font-semibold text-white">{deactivateModal.name}</span> and move them to Inactive status. Historical records will be preserved.
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeactivateModal(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" icon={<UserX className="w-4 h-4" />} onClick={() => setDeactivateModal(null)}>Confirm Deactivate</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
