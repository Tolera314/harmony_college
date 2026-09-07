'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Bell,
  Search,
  Filter,
  Layers,
  Calendar,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SlidePanel } from '../../ui/SlidePanel';
import { Input } from '../../ui/Input';
import { SkeletonCard, SkeletonTable, EmptyState, useToast, ToastContainer } from '../../ui/States';
import {
  getTuitionConfigs,
  createTuitionConfig,
  updateTuitionConfig,
  deleteTuitionConfig,
  syncInstallmentStatuses,
  sendPaymentReminders,
  getOverviewData,
} from '../../../lib/foApi';

function fmtETB(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `ETB ${abs}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FOTuitionSetupView() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [contextFilter, setContextFilter] = useState<'ALL' | 'TVET' | 'SHORT_PROGRAM'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any | null>(null);

  // Form Fields
  const [academicContext, setAcademicContext] = useState<'TVET' | 'SHORT_PROGRAM'>('TVET');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<number>(2);
  const [academicYearLabel, setAcademicYearLabel] = useState<string>('2026-2027');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('2500');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Load Data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgData, overviewData] = await Promise.all([
        getTuitionConfigs(),
        getOverviewData().catch(() => ({ departments: [] })),
      ]);
      setConfigs(Array.isArray(cfgData) ? cfgData : []);
      if (overviewData?.departments && Array.isArray(overviewData.departments)) {
        setDepartments(overviewData.departments);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load tuition configurations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Open Create Modal ─────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingConfig(null);
    setAcademicContext('TVET');
    setDepartmentId(departments[0]?.id || '');
    setDurationMonths(2);
    setAcademicYearLabel('2026-2027');
    setMonthlyAmount('2500');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  // ── Open Edit Modal ───────────────────────────────────────────────────────
  const openEditModal = (cfg: any) => {
    setEditingConfig(cfg);
    setAcademicContext(cfg.academicContext);
    setDepartmentId(cfg.departmentId);
    setDurationMonths(cfg.durationMonths || 2);
    setAcademicYearLabel(cfg.academicYearLabel || '2026-2027');
    setMonthlyAmount(String(cfg.monthlyAmount));
    setEffectiveDate(cfg.effectiveDate ? new Date(cfg.effectiveDate).toISOString().split('T')[0] : '');
    setDescription(cfg.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  // ── Save Config (Create or Update) ────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(monthlyAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Monthly tuition amount must be greater than zero.');
      return;
    }
    if (!departmentId) {
      setFormError('Please select a department.');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      if (editingConfig) {
        await updateTuitionConfig(editingConfig.id, {
          monthlyAmount: numAmount,
          effectiveDate: effectiveDate || undefined,
          description: description.trim() || undefined,
          durationMonths: academicContext === 'SHORT_PROGRAM' ? durationMonths : undefined,
          academicYearLabel: academicYearLabel.trim() || undefined,
        });
        showToast('Tuition configuration updated successfully.', 'success');
      } else {
        await createTuitionConfig({
          academicContext,
          departmentId,
          durationMonths: academicContext === 'SHORT_PROGRAM' ? durationMonths : undefined,
          academicYearLabel: academicYearLabel.trim() || undefined,
          monthlyAmount: numAmount,
          effectiveDate: effectiveDate || undefined,
          description: description.trim() || undefined,
        });
        showToast('Tuition configuration created successfully.', 'success');
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Toggle Active Status ──────────────────────────────────────────────────
  const handleToggleActive = async (cfg: any) => {
    try {
      await updateTuitionConfig(cfg.id, { isActive: !cfg.isActive });
      showToast(`Configuration ${!cfg.isActive ? 'activated' : 'deactivated'}.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to change status.', 'error');
    }
  };

  // ── Delete Config ─────────────────────────────────────────────────────────
  const handleDelete = async (cfg: any) => {
    if (!window.confirm(`Are you sure you want to delete tuition configuration for ${cfg.department?.name}?`)) return;
    try {
      await deleteTuitionConfig(cfg.id);
      showToast('Tuition configuration removed.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete configuration.', 'error');
    }
  };

  // ── Batch Actions: Sync Statuses & Send Reminders ─────────────────────────
  const handleSyncStatuses = async () => {
    setActionLoading(true);
    try {
      const res = await syncInstallmentStatuses();
      showToast(`Installment statuses synced: ${res.updatedCount} installments updated to DUE or OVERDUE.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to sync statuses.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminders = async () => {
    setActionLoading(true);
    try {
      const res = await sendPaymentReminders();
      showToast(`Automated payment reminders processed: ${res.remindersSent} notifications sent.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reminders.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Filtered List ─────────────────────────────────────────────────────────
  const filteredConfigs = configs.filter((c) => {
    if (contextFilter !== 'ALL' && c.academicContext !== contextFilter) return false;
    if (deptFilter !== 'ALL' && c.departmentId !== deptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const dName = c.department?.name?.toLowerCase() || '';
      const dCode = c.department?.code?.toLowerCase() || '';
      if (!dName.includes(q) && !dCode.includes(q)) return false;
    }
    return true;
  });

  const tvetCount = configs.filter((c) => c.academicContext === 'TVET').length;
  const shortCount = configs.filter((c) => c.academicContext === 'SHORT_PROGRAM').length;
  const activeCount = configs.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      <FOPageHeader
        title="Tuition & Fee Setup"
        subtitle="Manage monthly tuition rates across TVET and Short Programs with conflict prevention."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />}
              onClick={handleSyncStatuses}
              disabled={actionLoading}
            >
              Sync Statuses
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Bell className="w-3.5 h-3.5" />}
              onClick={handleSendReminders}
              disabled={actionLoading}
            >
              Send Reminders
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Add Configuration
            </Button>
          </div>
        }
      />

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Total Configs
          </p>
          <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {configs.length}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Configured academic rates</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-emerald-500">
            Active Rates
          </p>
          <h3 className="font-serif text-2xl font-bold text-emerald-500">
            {activeCount}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Currently applied to student accounts</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--brand-gold)' }}>
            TVET Programs
          </p>
          <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--brand-gold)' }}>
            {tvetCount}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Annual / semester TVET rates</p>
        </Card>

        <Card hoverable={false} className="p-4 space-y-1.5">
          <p className="font-mono text-xs uppercase font-bold tracking-wider text-indigo-500">
            Short Programs
          </p>
          <h3 className="font-serif text-2xl font-bold text-indigo-500">
            {shortCount}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>2, 4, and 8-month cohort rates</p>
        </Card>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <Card hoverable={false} className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by department name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none focus:border-[var(--brand-gold)]"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Context filter buttons */}
            <div className="flex items-center rounded-xl p-1 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)' }}>
              <button
                onClick={() => setContextFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  contextFilter === 'ALL' ? 'bg-[var(--brand-gold)] text-black font-bold' : 'text-muted'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setContextFilter('TVET')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  contextFilter === 'TVET' ? 'bg-[var(--brand-gold)] text-black font-bold' : 'text-muted'
                }`}
              >
                TVET
              </button>
              <button
                onClick={() => setContextFilter('SHORT_PROGRAM')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  contextFilter === 'SHORT_PROGRAM' ? 'bg-[var(--brand-gold)] text-black font-bold' : 'text-muted'
                }`}
              >
                Short Program
              </button>
            </div>

            {/* Department dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border outline-none"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── TABLE OF CONFIGURATIONS ── */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : filteredConfigs.length === 0 ? (
        <EmptyState
          title="No Tuition Configurations Found"
          description="Click 'Add Configuration' to set up monthly tuition for TVET or Short Program departments."
        />
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead
                className="font-mono text-[11px] uppercase tracking-wider border-b"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}
              >
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Department / Program</th>
                  <th className="py-3.5 px-4 font-semibold">Academic Context</th>
                  <th className="py-3.5 px-4 font-semibold">Duration / Period</th>
                  <th className="py-3.5 px-4 font-semibold">Monthly Tuition</th>
                  <th className="py-3.5 px-4 font-semibold">Effective Date</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredConfigs.map((cfg) => (
                  <tr
                    key={cfg.id}
                    className="transition-colors hover:bg-[var(--hover-overlay)]"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {cfg.department?.name || 'Department'}
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        Code: {cfg.department?.code || '—'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {cfg.academicContext === 'TVET' ? (
                        <Badge variant="amber">TVET Program</Badge>
                      ) : (
                        <Badge variant="info">Short Program</Badge>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {cfg.academicContext === 'SHORT_PROGRAM'
                        ? `${cfg.durationMonths || '—'} Months`
                        : cfg.academicYearLabel || 'Standard TVET'}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-sm" style={{ color: 'var(--brand-gold)' }}>
                      {fmtETB(cfg.monthlyAmount)}
                    </td>

                    <td className="py-4 px-4 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(cfg.effectiveDate)}
                    </td>

                    <td className="py-4 px-4">
                      {cfg.isActive ? (
                        <button
                          onClick={() => handleToggleActive(cfg)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(cfg)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </button>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => openEditModal(cfg)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                          onClick={() => handleDelete(cfg)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT SLIDEPANEL (Right side) ── */}
      <SlidePanel
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingConfig ? 'Edit Tuition Configuration' : 'Create Tuition Configuration'}
        subtitle="Finance Officer — Tuition Setup"
        width="max-w-md"
        side="right"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs font-sans p-1">
          {formError && (
            <div className="p-3 rounded-lg text-rose-500 bg-rose-500/10 border border-rose-500/20 text-xs">
              {formError}
            </div>
          )}

          {/* Academic Context */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Academic Context <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAcademicContext('TVET')}
                className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                  academicContext === 'TVET'
                    ? 'border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]'
                    : 'border-[var(--border-default)] text-muted'
                }`}
              >
                TVET
              </button>
              <button
                type="button"
                onClick={() => setAcademicContext('SHORT_PROGRAM')}
                className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                  academicContext === 'SHORT_PROGRAM'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                    : 'border-[var(--border-default)] text-muted'
                }`}
              >
                Short Program
              </button>
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans outline-none focus:border-[var(--brand-gold)]"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              required
            >
              <option value="" disabled>Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Short Program Duration */}
          {academicContext === 'SHORT_PROGRAM' && (
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Program Duration <span className="text-rose-500">*</span>
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans outline-none focus:border-[var(--brand-gold)]"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                <option value={2}>2 Months Program</option>
                <option value={4}>4 Months Program</option>
                <option value={8}>8 Months Program</option>
              </select>
            </div>
          )}

          {/* Academic Year Label */}
          <Input
            label="Academic Year Label"
            type="text"
            placeholder="e.g. 2026-2027"
            value={academicYearLabel}
            onChange={(e) => setAcademicYearLabel(e.target.value)}
          />

          {/* Monthly Amount */}
          <Input
            label="Monthly Tuition Amount (ETB)"
            type="number"
            step="0.01"
            min="1"
            placeholder="e.g. 2500"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            required
          />

          {/* Effective Date */}
          <Input
            label="Effective Date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or fee breakdown..."
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans outline-none focus:border-[var(--brand-gold)]"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : editingConfig ? 'Save Changes' : 'Create Configuration'}
            </Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
