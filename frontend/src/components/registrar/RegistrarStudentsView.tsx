'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Users, Search, Download, Eye, EyeOff, UserX, Edit, Plus, Phone, Mail, MapPin, X } from 'lucide-react';
import { DHPageHeader } from '../dh/DHPageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SlidePanel } from '../ui/SlidePanel';
import { ConfirmModal } from '../ui/ConfirmModal';

export type StudentProfile = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  program: string;
  year: number;
  status: 'Active' | 'On Leave' | 'Graduated' | 'Suspended';
  avatar: string;
  phone: string;
};

const initialStudents: StudentProfile[] = [
  {
    id: 's01',
    studentId: 'HC-2024-0012',
    name: 'Selam Alemayehu',
    email: 'selam.a@harmony.edu',
    program: 'Computer Science (B.Sc.)',
    year: 3,
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    phone: '+251911223344',
  },
  {
    id: 's02',
    studentId: 'HC-2024-0015',
    name: 'Yonas Kebede',
    email: 'yonas.k@harmony.edu',
    program: 'Mechanical Engineering (B.Sc.)',
    year: 2,
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    phone: '+251911667788',
  },
];

const statusBadge = (s: StudentProfile['status']) => {
  const m: Record<StudentProfile['status'], 'emerald'|'amber'|'rose'|'glass'> = {
    Active: 'emerald', 'On Leave': 'amber', Graduated: 'glass', Suspended: 'rose',
  };
  return <Badge variant={m[s]}>{s}</Badge>;
};

export const RegistrarStudentsView: React.FC = () => {
  const [studentsList, setStudentsList] = useState<StudentProfile[]>(initialStudents);
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All'|StudentProfile['status']>('All');
  const [selected, setSelected] = useState<StudentProfile | null>(null);
  const [deactivateModal, setDeactivateModal] = useState<StudentProfile | null>(null);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', program: 'Computer Science (B.Sc.)', year: 1, phone: ''
  });

  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = studentsList.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
    const matchP = programFilter === 'All' || s.program.includes(programFilter);
    const matchS = statusFilter === 'All' || s.status === statusFilter;
    return matchQ && matchP && matchS;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: StudentProfile = {
      id: `s${Date.now()}`,
      studentId: `HC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      name: formData.name,
      email: formData.email,
      program: formData.program,
      year: formData.year,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      phone: formData.phone,
    };
    setStudentsList(prev => [newStudent, ...prev]);
    setIsAddModalOpen(false);
    setFormData({ name: '', email: '', program: 'Computer Science (B.Sc.)', year: 1, phone: '' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setStudentsList(prev => prev.map(s => 
      s.id === editingStudent.id ? { ...s, ...formData } : s
    ));
    setEditingStudent(null);
  };

  const handleDeactivateConfirm = () => {
    if (!deactivateModal) return;
    setStudentsList(prev => prev.map(s => 
      s.id === deactivateModal.id ? { ...s, status: 'Suspended' } : s
    ));
    setDeactivateModal(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Student Records"
        subtitle={`${studentsList.filter(s => s.status === 'Active').length} active students`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>Add Student</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="flex gap-2 flex-wrap">
          <select value={programFilter} onChange={e => { setProgramFilter(e.target.value); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            <option className="bg-(--bg-card-solid)" value="All">All Programs</option>
            <option className="bg-(--bg-card-solid)" value="Computer Science">Computer Science</option>
            <option className="bg-(--bg-card-solid)" value="Engineering">Engineering</option>
            <option className="bg-(--bg-card-solid)" value="Business">Business</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)">
            {['All', 'Active', 'On Leave', 'Suspended', 'Graduated'].map(s => <option key={s} className="bg-(--bg-card-solid)" value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs sm:text-sm font-sans min-w-[900px]">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
            <tr>
              {['Student', 'Program', 'Year', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-(--text-faint)">No students match your filters.</td></tr>
            ) : paginated.map(student => (
              <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-(--hover-overlay) transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-full object-cover border border-(--border-default)" />
                    <div>
                      <p className="font-semibold text-(--text-primary) text-xs">{student.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{student.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-(--text-secondary) text-xs truncate max-w-[200px]">{student.program}</td>
                <td className="px-4 py-3.5 text-(--text-secondary) text-xs">Year {student.year}</td>
                <td className="px-4 py-3.5">{statusBadge(student.status)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setSelected(student)} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="View profile"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingStudent(student); setFormData({ name: student.name, email: student.email, program: student.program, year: student.year, phone: student.phone }); }} className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Edit"><Edit className="w-4 h-4" /></button>
                    {student.status === 'Active' && (
                      <button onClick={() => setDeactivateModal(student)} className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors" aria-label="Suspend"><UserX className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{filtered.length} students · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Student Profile — SlidePanel */}
      <SlidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle="Student Profile"
        width="max-w-xl"
      >
        {selected && (
          <div className="space-y-5 text-sm font-sans">
            <div className="flex items-center gap-4 border-b border-(--border-subtle) pb-4">
              <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-(--border-default)" />
              <div>
                <p className="font-sans text-base font-bold text-(--text-primary)">{selected.name}</p>
                <p className="font-sans text-xs text-(--text-muted) mt-0.5">{selected.studentId}</p>
                <div className="mt-1.5">{statusBadge(selected.status)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Program</p>
                <p className="text-(--text-secondary) text-xs mt-1">{selected.program}</p>
              </div>
              <div className="p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <p className="font-mono text-[10px] uppercase tracking-wider text-(--text-faint)">Year</p>
                <p className="text-(--text-secondary) text-xs mt-1">Year {selected.year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-(--text-secondary) bg-(--hover-overlay) p-3 rounded-xl border border-(--border-subtle)">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-(--brand-gold)" /><span>{selected.email}</span></div>
              <div className="flex items-center gap-2 ml-4"><Phone className="w-3.5 h-3.5 text-(--brand-gold)" /><span className="font-mono">{selected.phone}</span></div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Suspend Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deactivateModal}
        onClose={() => setDeactivateModal(null)}
        onConfirm={handleDeactivateConfirm}
        title="Suspend Student Account"
        message={`This will suspend system access for ${deactivateModal?.name}. Are you sure you want to proceed?`}
        icon={<UserX className="w-6 h-6" />}
        variant="danger"
        confirmLabel="Confirm Suspend"
      />

      {/* Add Student Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Student Profile" maxWidth="max-w-md">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input label="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Email Address" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Phone Number" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Program</label>
            <select value={formData.program} onChange={e => setFormData({ ...formData, program: e.target.value })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="Computer Science (B.Sc.)">Computer Science (B.Sc.)</option>
              <option value="Mechanical Engineering (B.Sc.)">Mechanical Engineering (B.Sc.)</option>
              <option value="Business Administration (B.A.)">Business Administration (B.A.)</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Year</label>
            <select value={formData.year} onChange={e => setFormData({ ...formData, year: Number(e.target.value) })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1 font-semibold">Create Profile</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title={`Edit Student: ${editingStudent?.name}`} maxWidth="max-w-md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input label="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Email Address" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Phone Number" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Program</label>
            <select value={formData.program} onChange={e => setFormData({ ...formData, program: e.target.value })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option value="Computer Science (B.Sc.)">Computer Science (B.Sc.)</option>
              <option value="Mechanical Engineering (B.Sc.)">Mechanical Engineering (B.Sc.)</option>
              <option value="Business Administration (B.A.)">Business Administration (B.A.)</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-secondary)">Year</label>
            <select value={formData.year} onChange={e => setFormData({ ...formData, year: Number(e.target.value) })} className="w-full px-3 py-2 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditingStudent(null)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1 font-semibold">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
