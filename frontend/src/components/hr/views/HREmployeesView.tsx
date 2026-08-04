'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Download, Eye, EyeOff, UserX, Edit, Plus, Phone, Mail, MapPin, X } from 'lucide-react';
import { Employee } from '../../../types/hr';
import { employees, departments, getDeptById } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { ConfirmModal } from '../../ui/ConfirmModal';

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
      <span className="font-mono text-xs text-(--text-secondary)">{revealed ? value : masked}</span>
      <button onClick={() => setRevealed(p => !p)} className="text-(--text-faint) hover:text-(--brand-gold) transition-colors" aria-label={revealed ? 'Hide' : 'Reveal'}>
        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export const HREmployeesView: React.FC = () => {
  const [empList, setEmpList] = useState<Employee[]>(employees);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All'|Employee['status']>('All');
  const [typeFilter, setTypeFilter] = useState<'All'|Employee['employmentType']>('All');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [deactivateModal, setDeactivateModal] = useState<Employee | null>(null);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', departmentId: 'dept1', position: '', employmentType: 'Full-Time' as Employee['employmentType']
  });

  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = empList.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.position.toLowerCase().includes(q);
    const matchD = deptFilter === 'All' || e.departmentId === deptFilter;
    const matchS = statusFilter === 'All' || e.status === statusFilter;
    const matchT = typeFilter === 'All' || e.employmentType === typeFilter;
    return matchQ && matchD && matchS && matchT;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmp: Employee = {
      id: `emp${Date.now()}`,
      employeeId: `EMP-${Math.floor(Math.random() * 10000)}`,
      name: formData.name,
      email: formData.email,
      departmentId: formData.departmentId,
      position: formData.position,
      employmentType: formData.employmentType,
      status: 'Active',
      contractStatus: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      phone: '+251911000000',
      hireDate: new Date().toISOString().split('T')[0],
      basicSalary: 10000,
      allowances: 0,
      education: 'B.Sc.',
      experience: 1,
      nationalId: 'ET-00000000',
      bankAccount: '100000000000',
      taxNumber: '00000000',
      gender: 'Male',
      deductions: 0,
      emergencyName: 'Contact Name',
      emergencyRelation: 'Relative',
      emergencyPhone: '+251911000000'
    };
    setEmpList(prev => [newEmp, ...prev]);
    setIsAddModalOpen(false);
    setFormData({ name: '', email: '', departmentId: 'dept1', position: '', employmentType: 'Full-Time' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEmpList(prev => prev.map(emp => 
      emp.id === editingEmployee.id ? { ...emp, ...formData } : emp
    ));
    setEditingEmployee(null);
  };

  const handleDeactivateConfirm = () => {
    if (!deactivateModal) return;
    setEmpList(prev => prev.map(emp => 
      emp.id === deactivateModal.id ? { ...emp, status: 'Inactive' } : emp
    ));
    setDeactivateModal(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Employees"
        subtitle={`${empList.filter(e => e.status === 'Active').length} active · ${empList.filter(e => e.contractStatus === 'Expiring Soon').length} contracts expiring`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>Add Employee</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by name, ID, or position..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="flex gap-2 flex-wrap">
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option className="bg-(--bg-card-solid)" value="All">All Departments</option>
            {departments.map(d => <option key={d.id} className="bg-(--bg-card-solid)" value={d.id}>{d.name.split(' ')[0]}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            {['All', 'Active', 'On Leave', 'Inactive', 'Terminated'].map(s => <option key={s} className="bg-(--bg-card-solid)" value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            {['All', 'Full-Time', 'Part-Time', 'Contract', 'Intern'].map(t => <option key={t} className="bg-(--bg-card-solid)" value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Employee', 'Department', 'Position', 'Type', 'Contract', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-(--text-faint)">No employees match your filters.</td></tr>
            ) : paginated.map(emp => {
              const dept = getDeptById(emp.departmentId);
              return (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover border border-(--border-default)" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-(--bg-base) ${emp.status === 'Active' ? 'bg-(--status-success)' : emp.status === 'On Leave' ? 'bg-(--status-warning)' : 'bg-(--active-overlay)'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-(--text-primary) text-xs">{emp.name}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[130px]">{dept?.name.split(' ')[0]}</td>
                  <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[160px]">{emp.position}</td>
                  <td className="px-4 py-3.5"><Badge variant="glass" className="text-[10px]">{emp.employmentType}</Badge></td>
                  <td className="px-4 py-3.5">{contractBadge(emp.contractStatus)}</td>
                  <td className="px-4 py-3.5">{statusBadge(emp.status)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(emp)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View profile"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => { setEditingEmployee(emp); setFormData({ name: emp.name, email: emp.email, departmentId: emp.departmentId, position: emp.position, employmentType: emp.employmentType }); }} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit"><Edit className="w-4 h-4" /></button>
                      {emp.status === 'Active' && (
                        <button onClick={() => setDeactivateModal(emp)} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors" aria-label="Deactivate"><UserX className="w-4 h-4" /></button>
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
          <p className="font-sans text-xs text-(--text-faint)">{filtered.length} employees · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Employee Profile — SlidePanel */}
      <SlidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle="Employee Profile"
        width="max-w-2xl"
      >
        {selected && (() => {
          const dept = getDeptById(selected.departmentId);
          return (
            <div className="space-y-5 text-sm font-sans">
              <div className="flex items-center gap-4">
                <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-(--border-default)" />
                <div>
                  <p className="font-sans text-base font-bold text-(--text-primary)">{selected.position}</p>
                  <p className="font-sans text-xs text-(--text-muted) mt-0.5">{dept?.name}</p>
                  <div className="flex gap-2 mt-1.5">{statusBadge(selected.status)}{contractBadge(selected.contractStatus)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Employee ID', selected.employeeId], ['Hire Date', selected.hireDate], ['Type', selected.employmentType], ['Education', selected.education], ['Experience', `${selected.experience} years`]].map(([k, v]) => (
                  <div key={String(k)} className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">{k}</p>
                    <p className="text-(--text-secondary) text-xs mt-1">{v}</p>
                  </div>
                ))}
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Monthly Salary</p>
                  <MaskedField value={`ETB ${(selected.basicSalary + selected.allowances).toLocaleString()}`} label="Salary" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">National ID</p>
                  <MaskedField value={selected.nationalId} label="National ID" />
                </div>
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Bank Account</p>
                  <MaskedField value={selected.bankAccount} label="Bank Account" />
                </div>
                <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Tax Number</p>
                  <MaskedField value={selected.taxNumber} label="Tax Number" />
                </div>
              </div>
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Emergency Contact</p>
                <div className="flex items-center gap-4 text-xs text-(--text-secondary)">
                  <span className="font-semibold text-(--text-primary)">{selected.emergencyName}</span>
                  <span>·</span><span>{selected.emergencyRelation}</span>
                  <span>·</span><span className="font-mono">{selected.emergencyPhone}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-(--text-secondary)">
                <Mail className="w-3.5 h-3.5 text-(--text-faint)" /><span>{selected.email}</span>
                <Phone className="w-3.5 h-3.5 text-(--text-faint) ml-2" /><span className="font-mono">{selected.phone}</span>
              </div>
            </div>
          );
        })()}
      </SlidePanel>

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deactivateModal}
        onClose={() => setDeactivateModal(null)}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate Employee"
        message={`This will disable system access for ${deactivateModal?.name} and move them to Inactive status. Historical records will be preserved.`}
        icon={<UserX className="w-6 h-6" />}
        variant="danger"
        confirmLabel="Confirm Deactivate"
      />

      {/* Add Employee Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Employee" maxWidth="max-w-md">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input label="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Email Address" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department</label>
            <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <Input label="Position Title" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Employment Type</label>
            <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value as Employee['employmentType'] })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {['Full-Time', 'Part-Time', 'Contract', 'Intern'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1 font-semibold">Create Employee</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title={`Edit Employee: ${editingEmployee?.name}`} maxWidth="max-w-md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input label="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Email Address" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Department</label>
            <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <Input label="Position Title" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Employment Type</label>
            <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value as Employee['employmentType'] })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {['Full-Time', 'Part-Time', 'Contract', 'Intern'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditingEmployee(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1 font-semibold">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
