'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Settings2, CheckCircle2, Plus, X } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, ErrorState, InlineError, useToast, ToastContainer } from '../../ui/States';
import {
  adminAcademicYearsApi, adminSemestersApi,
  ApiAcademicYear, ApiSemester,
} from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── component ─────────────────────────────────────────────────────────────────

export const AdminSystemConfigView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'academic' | 'semesters' | 'institution' | 'storage'>('academic');
  const [saved, setSaved]   = useState(false);

  // ── academic years
  const [years, setYears]           = useState<ApiAcademicYear[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState('');

  // ── semesters
  const [semesters, setSemesters]     = useState<ApiSemester[]>([]);
  const [semLoading, setSemLoading]   = useState(false);
  const [semError, setSemError]       = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');

  // ── modals
  const [createYearOpen, setCreateYearOpen]   = useState(false);
  const [createSemOpen, setCreateSemOpen]     = useState(false);
  const [editYearTarget, setEditYearTarget]   = useState<ApiAcademicYear | null>(null);
  const [actionLoading, setActionLoading]     = useState(false);
  const [formError, setFormError]             = useState('');

  // ── create academic year form
  const [yf, setYf] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  // ── create semester form
  const [sf, setSf] = useState({
    name: '', academicYearId: '', startDate: '', endDate: '',
    registrationStart: '', registrationEnd: '', addDropDeadline: '', isCurrent: false,
  });

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── load academic years
  useEffect(() => {
    setYearsLoading(true); setYearsError('');
    adminAcademicYearsApi.list()
      .then(data => { setYears(data); if (data.length > 0) setSelectedYearId(data.find(y => y.isCurrent)?.id ?? data[0].id); })
      .catch(e => setYearsError(e.message ?? 'Failed to load academic years'))
      .finally(() => setYearsLoading(false));
  }, []);

  // ── load semesters for selected year
  useEffect(() => {
    if (!selectedYearId) return;
    setSemLoading(true); setSemError('');
    adminSemestersApi.list(selectedYearId)
      .then(setSemesters)
      .catch(e => setSemError(e.message ?? 'Failed to load semesters'))
      .finally(() => setSemLoading(false));
  }, [selectedYearId]);

  // ── handlers
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setActionLoading(true);
    try {
      const created = await adminAcademicYearsApi.create({
        name: yf.name, startDate: yf.startDate, endDate: yf.endDate, isCurrent: yf.isCurrent,
      });
      setYears(prev => [created, ...prev]);
      showToast('Academic year created', 'success');
      setCreateYearOpen(false);
      setYf({ name: '', startDate: '', endDate: '', isCurrent: false });
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create academic year');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setActionLoading(true);
    try {
      const created = await adminSemestersApi.create({
        ...sf,
        academicYearId: selectedYearId,
      });
      setSemesters(prev => [...prev, created]);
      showToast('Semester created', 'success');
      setCreateSemOpen(false);
      setSf({ name: '', academicYearId: '', startDate: '', endDate: '', registrationStart: '', registrationEnd: '', addDropDeadline: '', isCurrent: false });
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create semester');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateYear = async (id: string) => {
    try {
      await adminAcademicYearsApi.deactivate(id);
      setYears(prev => prev.map(y => y.id === id ? { ...y, isActive: false, isCurrent: false } : y));
      showToast('Academic year deactivated', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    }
  };

  const handleSetCurrentYear = async (id: string) => {
    try {
      await adminAcademicYearsApi.update(id, { isCurrent: true });
      setYears(prev => prev.map(y => ({ ...y, isCurrent: y.id === id })));
      showToast('Current academic year updated', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    }
  };

  const handleDeactivateSemester = async (id: string) => {
    try {
      await adminSemestersApi.deactivate(id);
      setSemesters(prev => prev.map(s => s.id === id ? { ...s, isActive: false, isCurrent: false } : s));
      showToast('Semester deactivated', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Action failed', 'error');
    }
  };

  const sections = [
    { id: 'academic'    as const, label: 'Academic Years' },
    { id: 'semesters'   as const, label: 'Semesters' },
    { id: 'institution' as const, label: 'Institution Info' },
    { id: 'storage'     as const, label: 'Storage & Limits' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <DHPageHeader title="System Configuration" subtitle="Academic calendar and institution settings" icon={<Settings2 className="w-5 h-5" />} />

      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-(--status-success-bg) border border-(--status-success-border) text-(--status-success) rounded-2xl font-sans text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Configuration saved.
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nav */}
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${
                activeSection === s.id
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)'
                  : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) border border-transparent'
              }`}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Academic Years ── */}
          {activeSection === 'academic' && (
            <Card hoverable={false} className="space-y-5">
              <div className="flex items-center justify-between border-b border-(--border-default) pb-4">
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Academic Years</h3>
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
                  onClick={() => { setCreateYearOpen(true); setFormError(''); }}>
                  Add Year
                </Button>
              </div>

              {yearsLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={1} />)}</div>
              ) : yearsError ? (
                <ErrorState compact description={yearsError}
                  onRetry={() => { setYearsLoading(true); adminAcademicYearsApi.list().then(setYears).catch(e => setYearsError(e.message)).finally(() => setYearsLoading(false)); }} />
              ) : years.length === 0 ? (
                <p className="font-sans text-sm text-(--text-faint) text-center py-8">No academic years configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {years.map(y => (
                    <div key={y.id} className="flex items-center justify-between p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-sans text-sm font-bold text-(--text-primary)">{y.name}</p>
                          {y.isCurrent && <Badge variant="gold" className="text-[10px]">Current</Badge>}
                          {!y.isActive && <Badge variant="glass" className="text-[10px]">Inactive</Badge>}
                        </div>
                        <p className="font-mono text-[11px] text-(--text-faint) mt-0.5">
                          {formatDate(y.startDate)} → {formatDate(y.endDate)}
                        </p>
                        {y.semesters?.length > 0 && (
                          <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">
                            {y.semesters.length} semester{y.semesters.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!y.isCurrent && y.isActive && (
                          <Button variant="secondary" size="sm" onClick={() => handleSetCurrentYear(y.id)}>
                            Set Current
                          </Button>
                        )}
                        {y.isActive && (
                          <button
                            onClick={() => handleDeactivateYear(y.id)}
                            className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors"
                            title="Deactivate">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── Semesters ── */}
          {activeSection === 'semesters' && (
            <Card hoverable={false} className="space-y-5">
              <div className="flex items-center justify-between border-b border-(--border-default) pb-4 flex-wrap gap-3">
                <h3 className="font-serif text-xl font-bold text-(--text-primary)">Semesters</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedYearId}
                    onChange={e => setSelectedYearId(e.target.value)}
                    className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
                  >
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
                    onClick={() => { setCreateSemOpen(true); setFormError(''); }}
                    disabled={!selectedYearId}>
                    Add Semester
                  </Button>
                </div>
              </div>

              {semLoading ? (
                <div className="space-y-3">{[...Array(2)].map((_, i) => <SkeletonCard key={i} rows={2} />)}</div>
              ) : semError ? (
                <ErrorState compact description={semError} />
              ) : semesters.length === 0 ? (
                <p className="font-sans text-sm text-(--text-faint) text-center py-8">No semesters for this academic year yet.</p>
              ) : (
                <div className="space-y-3">
                  {semesters.map(s => (
                    <div key={s.id} className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-sans text-sm font-bold text-(--text-primary)">{s.name}</p>
                            {s.isCurrent && <Badge variant="gold" className="text-[10px]">Current</Badge>}
                            {!s.isActive && <Badge variant="glass" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <p className="font-mono text-[11px] text-(--text-faint) mt-0.5">
                            {formatDate(s.startDate)} → {formatDate(s.endDate)}
                          </p>
                        </div>
                        {s.isActive && (
                          <button
                            onClick={() => handleDeactivateSemester(s.id)}
                            className="p-1.5 rounded-lg hover:bg-(--status-danger-bg) text-(--text-muted) hover:text-(--status-danger) transition-colors shrink-0"
                            title="Deactivate">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono text-(--text-faint)">
                        <span>Reg: {formatDate(s.registrationStart)}</span>
                        <span>Reg End: {formatDate(s.registrationEnd)}</span>
                        <span>Add/Drop: {formatDate(s.addDropDeadline)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── Institution Info (static form — no DB model for institution config) ── */}
          {activeSection === 'institution' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) border-b border-(--border-default) pb-4">Institution Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Institution Name"    defaultValue="Harmony College" />
                <Input label="Short Name / Acronym" defaultValue="HC" />
                <Input label="Official Email"      type="email" defaultValue="info@harmony.edu" />
                <Input label="Official Phone"      defaultValue="+251 (0)11 234 5678" />
                <Input label="Website"             defaultValue="https://harmony.edu.et" />
                <Input label="Address"             defaultValue="Burayu, Addis Ababa, Ethiopia" />
              </div>
              <p className="font-sans text-xs text-(--text-faint)">
                Institution configuration is currently managed via environment variables. A persistent settings model is planned for a future release.
              </p>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Save Changes</Button>
              </div>
            </Card>
          )}

          {/* ── Storage & Limits ── */}
          {activeSection === 'storage' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-(--text-primary) border-b border-(--border-default) pb-4">Storage &amp; File Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Max File Upload Size (MB)"          type="number" defaultValue="50" />
                <Input label="Total Storage Limit (GB)"          type="number" defaultValue="100" />
                <Input label="Student Document Retention (years)" type="number" defaultValue="7" />
                <Input label="Audit Log Retention (years)"       type="number" defaultValue="5" />
              </div>
              <p className="font-sans text-xs text-(--text-faint)">
                Storage configuration is managed via the backend environment. These values are for reference; changes require a backend deployment.
              </p>
              <div className="flex justify-end">
                <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Save</Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Academic Year Modal */}
      <Modal isOpen={createYearOpen} onClose={() => setCreateYearOpen(false)} title="Add Academic Year" maxWidth="max-w-md">
        <form onSubmit={handleCreateYear} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label='Name (e.g. "2025-2026")' required value={yf.name} onChange={e => setYf({ ...yf, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" required value={yf.startDate} onChange={e => setYf({ ...yf, startDate: e.target.value })} />
            <Input label="End Date"   type="date" required value={yf.endDate}   onChange={e => setYf({ ...yf, endDate: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isCurrent" checked={yf.isCurrent} onChange={e => setYf({ ...yf, isCurrent: e.target.checked })}
              className="w-4 h-4 rounded border-(--border-default) accent-(--brand-gold)" />
            <label htmlFor="isCurrent" className="text-xs font-semibold text-(--text-secondary)">Set as current academic year</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateYearOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Create Semester Modal */}
      <Modal isOpen={createSemOpen} onClose={() => setCreateSemOpen(false)} title="Add Semester" maxWidth="max-w-lg">
        <form onSubmit={handleCreateSemester} className="space-y-4">
          {formError && <InlineError message={formError} />}
          <Input label='Semester Name (e.g. "Semester I")' required value={sf.name} onChange={e => setSf({ ...sf, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date"   type="date" required value={sf.startDate}   onChange={e => setSf({ ...sf, startDate: e.target.value })} />
            <Input label="End Date"     type="date" required value={sf.endDate}     onChange={e => setSf({ ...sf, endDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Reg. Open"   type="date" required value={sf.registrationStart} onChange={e => setSf({ ...sf, registrationStart: e.target.value })} />
            <Input label="Reg. Close"  type="date" required value={sf.registrationEnd}   onChange={e => setSf({ ...sf, registrationEnd: e.target.value })} />
          </div>
          <Input label="Add/Drop Deadline" type="date" required value={sf.addDropDeadline} onChange={e => setSf({ ...sf, addDropDeadline: e.target.value })} />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="semCurrent" checked={sf.isCurrent} onChange={e => setSf({ ...sf, isCurrent: e.target.checked })}
              className="w-4 h-4 rounded border-(--border-default) accent-(--brand-gold)" />
            <label htmlFor="semCurrent" className="text-xs font-semibold text-(--text-secondary)">Set as current semester</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setCreateSemOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit" className="flex-1" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

// Inline Save icon since we don't import it at top level
function Save({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}
