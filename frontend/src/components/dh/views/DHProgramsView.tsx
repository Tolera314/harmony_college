'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Plus, Layers, Users, BookOpen, Power, Pencil, X, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ErrorState } from '../../ui/States';
import { hodProgramsApi, type DHProgram } from '../../../lib/hodApi';

// ─────────────────────────────────────────────────────────────────────────────
// Form Panel
// ─────────────────────────────────────────────────────────────────────────────

interface ProgramFormProps {
  initial?: DHProgram | null;
  onSave: (data: { name: string; code: string; description?: string; durationYears?: number; totalCredits?: number }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const ProgramForm: React.FC<ProgramFormProps> = ({ initial, onSave, onClose, saving }) => {
  const [name, setName]               = useState(initial?.name ?? '');
  const [code, setCode]               = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [durationYears, setDuration]  = useState(initial?.durationYears?.toString() ?? '');
  const [totalCredits, setCredits]    = useState(initial?.totalCredits?.toString() ?? '');
  const [error, setError]             = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !code.trim()) { setError('Name and Code are required.'); return; }
    await onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      durationYears: durationYears ? parseInt(durationYears, 10) : undefined,
      totalCredits:  totalCredits  ? parseInt(totalCredits,  10) : undefined,
    });
  };

  const field = 'w-full px-3.5 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-modal) text-(--text-primary) text-sm font-sans focus:outline-none focus:border-(--brand-gold) focus:ring-2 focus:ring-(--brand-gold)/20 transition-all placeholder:text-(--text-faint)';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-(--border-default)">
        <h2 className="font-serif text-xl font-bold text-(--text-primary)">{initial ? 'Edit Program' : 'New Program'}</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && <p className="text-xs text-(--status-danger) bg-(--status-danger-bg) border border-(--status-danger)/20 rounded-xl px-3 py-2">{error}</p>}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Program Name *</label>
          <input className={field} placeholder="e.g. Computer Science" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Program Code *</label>
          <input className={field} placeholder="e.g. CS" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Description</label>
          <textarea rows={3} className={field} placeholder="Brief program description..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Duration (Years)</label>
            <input type="number" min={1} max={7} className={field} placeholder="e.g. 2" value={durationYears} onChange={e => setDuration(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Total Credits</label>
            <input type="number" min={10} max={300} className={field} placeholder="e.g. 120" value={totalCredits} onChange={e => setCredits(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-(--border-default) flex gap-3">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Save Changes' : 'Create Program'}
        </Button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export const DHProgramsView: React.FC = () => {
  const [programs, setPrograms] = useState<DHProgram[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [panel,    setPanel]    = useState<'create' | DHProgram | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPrograms(await hodProgramsApi.list()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load programs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Parameters<typeof hodProgramsApi.create>[0]) => {
    setSaving(true);
    try {
      if (typeof panel === 'object' && panel !== null && 'id' in panel) {
        const updated = await hodProgramsApi.update(panel.id, data);
        setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await hodProgramsApi.create(data);
        setPrograms(prev => [created, ...prev]);
      }
      setPanel(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (prog: DHProgram) => {
    setTogglingId(prog.id);
    try {
      const res = await hodProgramsApi.toggleStatus(prog.id);
      setPrograms(prev => prev.map(p => p.id === prog.id ? { ...p, isActive: res.isActive } : p));
    } catch (e) { alert(e instanceof Error ? e.message : 'Toggle failed'); }
    finally { setTogglingId(null); }
  };

  if (error) return <ErrorState variant="generic" title="Programs unavailable" description={error} onRetry={load} />;

  const active   = programs.filter(p => p.isActive);
  const inactive = programs.filter(p => !p.isActive);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-(--text-primary)">Programs</h1>
          <p className="font-sans text-sm text-(--text-secondary) mt-1">Manage academic programs in your department</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setPanel('create')}>New Program</Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Programs',  value: programs.length,    icon: <Layers className="w-4 h-4" />, color: 'text-(--brand-gold)' },
          { label: 'Active',          value: active.length,      icon: <BookOpen className="w-4 h-4" />, color: 'text-(--status-success)' },
          { label: 'Inactive',        value: inactive.length,    icon: <Power className="w-4 h-4" />, color: 'text-(--text-muted)' },
          { label: 'Total Enrolled',  value: programs.reduce((a, p) => a + (p.enrolledCount ?? 0), 0), icon: <Users className="w-4 h-4" />, color: 'text-(--status-info)' },
        ].map(s => (
          <Card key={s.label} hoverable={false} className="p-4">
            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
            <p className="font-mono text-2xl font-bold text-(--text-primary)">{s.value}</p>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-(--text-faint)" /></div>
      ) : programs.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center">
          <Layers className="w-10 h-10 text-(--text-faint) mx-auto mb-3" />
          <p className="font-sans text-sm text-(--text-secondary)">No programs yet. Create the first one.</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setPanel('create')}>Create Program</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programs.map(prog => (
            <Card key={prog.id} className="p-5 group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-(--brand-gold) bg-(--accent-gold-subtle) px-2 py-0.5 rounded-lg">{prog.code}</span>
                    <Badge variant={prog.isActive ? 'emerald' : 'glass'}>{prog.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <h3 className="font-serif text-base font-bold text-(--text-primary) leading-tight">{prog.name}</h3>
                  {prog.description && <p className="font-sans text-xs text-(--text-faint) mt-1 line-clamp-2">{prog.description}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Students', value: prog.enrolledCount ?? 0 },
                  { label: 'Duration', value: prog.durationYears ? `${prog.durationYears}y` : '—' },
                  { label: 'Credits',  value: prog.totalCredits ?? '—' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-(--hover-overlay) rounded-xl p-2">
                    <p className="font-mono text-sm font-bold text-(--text-primary)">{s.value}</p>
                    <p className="font-sans text-[10px] text-(--text-faint)">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setPanel(prog)}>Edit</Button>
                <Button
                  variant="ghost" size="sm" className="flex-1"
                  icon={togglingId === prog.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                  disabled={togglingId === prog.id}
                  onClick={() => handleToggle(prog)}
                >
                  {prog.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slide Panel */}
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
              <ProgramForm
                initial={typeof panel === 'object' ? panel : null}
                onSave={handleSave}
                onClose={() => setPanel(null)}
                saving={saving}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

