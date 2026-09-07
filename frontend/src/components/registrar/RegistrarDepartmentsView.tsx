'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  Building2, Plus, Users, BookOpen, GraduationCap, UserCog,
  Pencil, UserCheck, UserX, Power, X, Loader2, Search, ChevronRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/States';
import {
  departmentMgmtApi,
  type DepartmentCard,
  type EligibleHod,
} from '../../lib/registrarApi';

// ─────────────────────────────────────────────────────────────────────────────
// Create / Edit Department Panel
// ─────────────────────────────────────────────────────────────────────────────

interface DeptFormProps {
  initial?: DepartmentCard | null;
  onSave: (data: { name: string; code: string; description?: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const DeptForm: React.FC<DeptFormProps> = ({ initial, onSave, onClose, saving }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [err,  setErr]  = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!name.trim() || !code.trim()) { setErr('Name and Code are required.'); return; }
    await onSave({ name: name.trim(), code: code.trim().toUpperCase(), description: desc.trim() || undefined });
  };

  const field = 'w-full px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all placeholder:text-(--text-faint)';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-(--border-default)">
        <h2 className="font-serif text-xl font-bold text-(--text-primary)">{initial ? 'Edit Department' : 'New Department'}</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-muted) transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {err && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger)/20 rounded-xl px-3 py-2">{err}</p>}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Department Name *</label>
          <input className={field} placeholder="e.g. Computer Science" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Department Code *</label>
          <input className={field} placeholder="e.g. CS" value={code} onChange={e => setCode(e.target.value)} maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Description</label>
          <textarea rows={3} className={field} placeholder="Brief description of this department..." value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      </div>
      <div className="p-6 border-t border-(--border-default) flex gap-3">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Save Changes' : 'Create Department'}
        </Button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Assign HOD Panel
// ─────────────────────────────────────────────────────────────────────────────

interface AssignHodPanelProps {
  dept: DepartmentCard;
  eligible: EligibleHod[];
  onAssign: (instructorId: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const AssignHodPanel: React.FC<AssignHodPanelProps> = ({ dept, eligible, onAssign, onRemove, onClose, saving }) => {
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');

  const currentHod = dept.departmentHeads[0];
  const filtered = eligible.filter(e => {
    const q = search.toLowerCase();
    return !q || e.user.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-(--border-default)">
        <div>
          <h2 className="font-serif text-xl font-bold text-(--text-primary)">Assign HOD</h2>
          <p className="font-sans text-sm text-(--text-secondary) mt-0.5">{dept.name}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-muted) transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Current HOD */}
        {currentHod ? (
          <div className="p-4 rounded-xl border border-(--status-success)/20 bg-(--status-success-bg) flex items-center justify-between">
            <div>
              <p className="font-sans text-xs font-semibold text-(--status-success)">Current HOD</p>
              <p className="font-sans text-sm font-bold text-(--text-primary) mt-0.5">{currentHod.user.fullName}</p>
              <p className="font-mono text-xs text-(--text-faint)">{currentHod.employeeId} · {currentHod.title}</p>
            </div>
            <Button variant="ghost" size="sm" icon={<UserX className="w-3.5 h-3.5" />} disabled={saving} onClick={onRemove}>Remove</Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--hover-overlay)">
            <p className="font-sans text-sm text-(--text-faint) italic">No HOD currently assigned to this department.</p>
          </div>
        )}

        {/* Search eligible */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Select New HOD</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all placeholder:text-(--text-faint)"
              placeholder="Search by name or employee ID..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="font-sans text-sm text-(--text-faint) text-center py-4">No eligible instructors found.</p>
            ) : filtered.map(i => (
              <button
                key={i.id}
                onClick={() => setSelected(i.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selected === i.id ? 'border-(--brand-gold) bg-(--accent-gold-subtle)' : 'border-(--border-subtle) hover:border-(--border-default) hover:bg-(--hover-overlay)'}`}
              >
                <div className="w-9 h-9 rounded-xl bg-(--hover-overlay) border border-(--border-default) flex items-center justify-center font-serif font-bold text-(--text-secondary) shrink-0">
                  {i.user.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-semibold text-(--text-primary) truncate">{i.user.fullName}</p>
                  <p className="font-mono text-xs text-(--text-faint)">{i.employeeId} · {i.title}</p>
                  {i.department && <p className="font-sans text-[10px] text-(--text-faint)">{i.department.name}</p>}
                </div>
                {i._count.departmentHeadRecords > 0 && (
                  <Badge variant="amber" className="shrink-0">HOD</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-(--border-default) flex gap-3">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="primary" disabled={!selected || saving} className="flex-1" onClick={() => onAssign(selected)}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign HOD'}
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

type Panel = 'create' | { kind: 'edit'; dept: DepartmentCard } | { kind: 'hod'; dept: DepartmentCard };

export const RegistrarDepartmentsView: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentCard[]>([]);
  const [eligible,    setEligible]    = useState<EligibleHod[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [panel,       setPanel]       = useState<Panel | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [depts, hods] = await Promise.all([departmentMgmtApi.list(), departmentMgmtApi.getEligibleHods()]);
      setDepartments(depts);
      setEligible(hods);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load departments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateOrUpdate = async (data: { name: string; code: string; description?: string }) => {
    setSaving(true);
    try {
      if (panel === 'create') {
        const created = await departmentMgmtApi.create(data);
        setDepartments(prev => [created, ...prev]);
      } else if (panel && typeof panel === 'object' && panel.kind === 'edit') {
        const updated = await departmentMgmtApi.update(panel.dept.id, data);
        setDepartments(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
      }
      setPanel(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (dept: DepartmentCard) => {
    try {
      const updated = await departmentMgmtApi.update(dept.id, { isActive: !dept.isActive });
      setDepartments(prev => prev.map(d => d.id === updated.id ? { ...d, isActive: updated.isActive } : d));
    } catch (e) { alert(e instanceof Error ? e.message : 'Toggle failed'); }
  };

  const handleAssignHod = async (instructorId: string) => {
    if (!panel || typeof panel !== 'object' || panel.kind !== 'hod') return;
    setSaving(true);
    try {
      const newHod = await departmentMgmtApi.assignHod(panel.dept.id, instructorId);
      const instructor = eligible.find(e => e.id === instructorId);
      setDepartments(prev => prev.map(d => d.id === panel.dept.id
        ? { ...d, departmentHeads: [newHod] }
        : d));
      setPanel(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'HOD assignment failed'); }
    finally { setSaving(false); }
  };

  const handleRemoveHod = async () => {
    if (!panel || typeof panel !== 'object' || panel.kind !== 'hod') return;
    setSaving(true);
    try {
      await departmentMgmtApi.removeHod(panel.dept.id);
      setDepartments(prev => prev.map(d => d.id === (panel as any).dept.id ? { ...d, departmentHeads: [] } : d));
      setPanel(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'HOD removal failed'); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState variant="generic" title="Departments unavailable" description={error} onRetry={load} />;

  const filtered = departments.filter(d => {
    const q = search.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });

  const activeCount = departments.filter(d => d.isActive).length;
  const withHod = departments.filter(d => d.departmentHeads.length > 0).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Department Management</h1>
          <p className="font-sans text-sm text-(--text-secondary) mt-1">Manage academic departments and HOD assignments</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setPanel('create')}>New Department</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Departments', value: departments.length,                                color: 'text-(--brand-gold)' },
          { label: 'Active',            value: activeCount,                                       color: 'text-(--status-success)' },
          { label: 'With HOD',          value: withHod,                                           color: 'text-(--status-info)' },
          { label: 'No HOD Assigned',   value: departments.length - withHod,                      color: departments.length - withHod > 0 ? 'text-(--status-danger)' : 'text-(--text-muted)' },
        ].map(s => (
          <Card key={s.label} hoverable={false} className="p-4">
            <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all placeholder:text-(--text-faint)"
          placeholder="Search departments..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : filtered.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center">
          <Building2 className="w-10 h-10 text-(--text-faint) mx-auto mb-3" />
          <p className="font-sans text-sm text-(--text-secondary)">{search ? 'No departments match your search.' : 'No departments yet. Create the first one.'}</p>
          {!search && <Button variant="primary" size="sm" className="mt-4" onClick={() => setPanel('create')}>Create Department</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(dept => {
            const hod = dept.departmentHeads[0];
            return (
              <Card key={dept.id} className="p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">{dept.code}</span>
                      <Badge variant={dept.isActive ? 'emerald' : 'glass'}>{dept.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <h3 className="font-serif text-base font-bold text-(--text-primary)">{dept.name}</h3>
                    {dept.description && <p className="font-sans text-xs text-(--text-faint) mt-1 line-clamp-2">{dept.description}</p>}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: <GraduationCap className="w-3.5 h-3.5" />, value: dept._count.studentRecords, label: 'Students' },
                    { icon: <BookOpen className="w-3.5 h-3.5" />,      value: dept._count.courses,        label: 'Courses' },
                    { icon: <UserCog className="w-3.5 h-3.5" />,       value: dept._count.instructors,    label: 'Instructors' },
                    { icon: <Users className="w-3.5 h-3.5" />,         value: dept._count.programs,       label: 'Programs' },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-(--hover-overlay) rounded-xl p-2">
                      <div className="flex justify-center text-(--text-faint) mb-0.5">{s.icon}</div>
                      <p className="font-mono text-sm font-bold text-(--text-primary)">{s.value}</p>
                      <p className="font-sans text-[10px] text-(--text-faint)">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* HOD */}
                <div className={`p-3 rounded-xl border ${hod ? 'border-(--status-success)/20 bg-(--status-success-bg)' : 'border-(--border-subtle) bg-(--hover-overlay)'}`}>
                  {hod ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-(--status-success-bg) border border-(--status-success)/20 flex items-center justify-center text-(--status-success) font-bold text-sm font-serif shrink-0">
                        {hod.user.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-xs font-semibold text-(--status-success)">Head of Department</p>
                        <p className="font-sans text-sm font-bold text-(--text-primary) truncate">{hod.user.fullName}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{hod.employeeId}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-(--hover-overlay) border border-(--border-subtle) flex items-center justify-center text-(--text-faint)">
                        <UserX className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-sans text-xs font-semibold text-(--status-danger)">No HOD Assigned</p>
                        <p className="font-sans text-xs text-(--text-faint)">Click "Assign HOD" to set one</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Programs */}
                {dept.programs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {dept.programs.slice(0, 4).map(p => (
                      <span key={p.id} className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${p.isActive ? 'bg-(--accent-gold-subtle) text-(--brand-gold)' : 'bg-(--hover-overlay) text-(--text-faint)'}`}>
                        {p.code}
                      </span>
                    ))}
                    {dept.programs.length > 4 && (
                      <span className="font-sans text-[10px] text-(--text-faint) self-center">+{dept.programs.length - 4} more</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-(--border-subtle)">
                  <Button variant="ghost" size="sm" className="flex-1" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setPanel({ kind: 'edit', dept })}>Edit</Button>
                  <Button variant="ghost" size="sm" className="flex-1" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => setPanel({ kind: 'hod', dept })}>
                    {hod ? 'Change HOD' : 'Assign HOD'}
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Power className="w-3.5 h-3.5" />} onClick={() => handleToggleStatus(dept)}>
                    {dept.isActive ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Slide Panels */}
      <AnimatePresence>
        {panel !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" onClick={() => setPanel(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-(--bg-modal) border-l border-(--border-default) shadow-2xl flex flex-col"
            >
              {(panel === 'create' || (typeof panel === 'object' && panel.kind === 'edit')) && (
                <DeptForm
                  initial={typeof panel === 'object' && panel.kind === 'edit' ? panel.dept : null}
                  onSave={handleCreateOrUpdate}
                  onClose={() => setPanel(null)}
                  saving={saving}
                />
              )}
              {typeof panel === 'object' && panel.kind === 'hod' && (
                <AssignHodPanel
                  dept={panel.dept}
                  eligible={eligible}
                  onAssign={handleAssignHod}
                  onRemove={handleRemoveHod}
                  onClose={() => setPanel(null)}
                  saving={saving}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


