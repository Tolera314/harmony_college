'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Calendar,
  Send,
  FileEdit,
  Users,
  GraduationCap,
  Sparkles,
  Mail,
  Building2,
  ChevronRight,
  Check,
  Copy,
  CreditCard,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SlidePanel } from '../../ui/SlidePanel';
import { Modal } from '../../ui/Modal';
import { SkeletonCard, SkeletonTable, EmptyState, useToast, ToastContainer } from '../../ui/States';
import {
  getTuitionConfigs,
  createTuitionConfig,
  updateTuitionConfig,
  publishTuitionConfig,
  reviseTuitionConfig,
  deleteTuitionConfig,
  getFeePrograms,
  getRegisteredStudents,
} from '../../../lib/foApi';

function fmtETB(amount: number) {
  return `ETB ${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const MONTHS = [
  { value: '01', name: 'January' },
  { value: '02', name: 'February' },
  { value: '03', name: 'March' },
  { value: '04', name: 'April' },
  { value: '05', name: 'May' },
  { value: '06', name: 'June' },
  { value: '07', name: 'July' },
  { value: '08', name: 'August' },
  { value: '09', name: 'September' },
  { value: '10', name: 'October' },
  { value: '11', name: 'November' },
  { value: '12', name: 'December' },
];

const DEFAULT_INSTRUCTIONS =
  'CBE Acc: 1000123456789 | Awash Bank Acc: 01320987654300 | Telebirr: 889900. Include Student ID in transfer memo and upload payment receipt.';

interface FOTuitionSetupViewProps {
  programType?: 'TVET' | 'SHORT_PROGRAM';
  onProgramTypeChange?: (pt: 'TVET' | 'SHORT_PROGRAM') => void;
}

export function FOTuitionSetupView({
  programType: initialProgramType = 'TVET',
  onProgramTypeChange,
}: FOTuitionSetupViewProps) {
  // Strict Category Track: TVET vs Short Program
  const [academicContext, setAcademicContext] = useState<'TVET' | 'SHORT_PROGRAM'>(
    initialProgramType === 'SHORT_PROGRAM' ? 'SHORT_PROGRAM' : 'TVET'
  );

  useEffect(() => {
    if (initialProgramType && (initialProgramType === 'TVET' || initialProgramType === 'SHORT_PROGRAM')) {
      setAcademicContext(initialProgramType);
    }
  }, [initialProgramType]);

  // View Mode: 'SETUPS' (Fee configurations) vs 'STUDENTS' (Enrolled student roster)
  const [activeTab, setActiveTab] = useState<'SETUPS' | 'STUDENTS'>('SETUPS');

  const [configs, setConfigs] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any | null>(null);

  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [rosterConfig, setRosterConfig] = useState<any | null>(null);

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisingConfig, setRevisingConfig] = useState<any | null>(null);
  const [reviseAmount, setReviseAmount] = useState('');
  const [reviseDueDate, setReviseDueDate] = useState('');
  const [reviseInstructions, setReviseInstructions] = useState('');
  const [reviseReason, setReviseReason] = useState('');
  const [reviseError, setReviseError] = useState<string | null>(null);

  // Form Fields
  const [modalCategory, setModalCategory] = useState<'TVET' | 'SHORT_PROGRAM'>('TVET');
  const [programId, setProgramId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [monthlyAmount, setMonthlyAmount] = useState('2500');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [paymentInstructions, setPaymentInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  
  // Bank accounts state - Finance Officer can edit these
  const [bankAccounts, setBankAccounts] = useState([
    { id: '1', label: 'Commercial Bank of Ethiopia', account: '1000123456789', icon: '🏦' },
    { id: '2', label: 'Awash Bank', account: '01320987654300', icon: '🏦' },
    { id: '3', label: 'Telebirr', account: '889900', icon: '📱' },
  ]);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgData, progsData, studentsData] = await Promise.all([
        getTuitionConfigs({ academicContext }),
        getFeePrograms(academicContext).catch(() => []),
        getRegisteredStudents(academicContext).catch(() => []),
      ]);
      setConfigs(Array.isArray(cfgData) ? cfgData : []);
      setPrograms(Array.isArray(progsData) ? progsData : []);
      setRegisteredStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load fee configurations', 'error');
    } finally {
      setLoading(false);
    }
  }, [academicContext, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update programs when modal category changes
  useEffect(() => {
    getFeePrograms(modalCategory)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPrograms(list);
        if (list.length > 0 && !programId) {
          setProgramId(list[0].id);
        }
      })
      .catch(() => {});
  }, [modalCategory]);

  const programsForModal = useMemo(
    () => programs.filter((p) => p.programType === modalCategory),
    [programs, modalCategory]
  );

  const programsByDepartment = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const prog of programsForModal) {
      const dept = prog.departmentName || 'General';
      if (!map[dept]) map[dept] = [];
      map[dept].push(prog);
    }
    return map;
  }, [programsForModal]);

  const selectedProgramObj = useMemo(
    () => programs.find((p) => p.id === programId) || null,
    [programs, programId]
  );

  const openCreateModal = () => {
    setEditingConfig(null);
    setModalCategory(academicContext);
    const available = programs.filter((p) => p.programType === academicContext);
    setProgramId(available[0]?.id || (programs[0]?.id ?? ''));

    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setSelectedYear(String(now.getFullYear()));
    setMonthlyAmount(academicContext === 'TVET' ? '2500' : '3200');

    const defaultDue = new Date(now.getFullYear(), now.getMonth(), 28);
    setDueDate(defaultDue.toISOString().split('T')[0]);
    setPaymentInstructions(DEFAULT_INSTRUCTIONS);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditDraftModal = (cfg: any) => {
    setEditingConfig(cfg);
    setModalCategory(cfg.academicContext);
    setProgramId(cfg.programId || '');
    if (cfg.billingMonth) {
      const parts = cfg.billingMonth.split('-');
      if (parts.length === 2) {
        setSelectedYear(parts[0]);
        setSelectedMonth(parts[1]);
      }
    }
    setMonthlyAmount(String(cfg.monthlyAmount));
    setDueDate(cfg.dueDate ? new Date(cfg.dueDate).toISOString().split('T')[0] : '');
    setPaymentInstructions(cfg.paymentInstructions || DEFAULT_INSTRUCTIONS);
    setFormError(null);
    setModalOpen(true);
  };

  const openRevisionModal = (cfg: any) => {
    setRevisingConfig(cfg);
    setReviseAmount(String(cfg.monthlyAmount));
    setReviseDueDate(cfg.dueDate ? new Date(cfg.dueDate).toISOString().split('T')[0] : '');
    setReviseInstructions(cfg.paymentInstructions || DEFAULT_INSTRUCTIONS);
    setReviseReason('');
    setReviseError(null);
    setRevisionModalOpen(true);
  };

  const openConfigRoster = (cfg: any) => {
    setRosterConfig(cfg);
    setRosterModalOpen(true);
  };

  const handleSaveFee = async (action: 'DRAFT' | 'PUBLISHED') => {
    const numAmount = parseFloat(monthlyAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Enter a valid tuition amount.');
      return;
    }
    if (!programId) {
      setFormError('Select an academic program.');
      return;
    }
    if (!dueDate) {
      setFormError('Select a payment deadline.');
      return;
    }

    const billingMonth = `${selectedYear}-${selectedMonth}`;
    setActionLoading(true);
    setFormError(null);

    try {
      if (editingConfig) {
        await updateTuitionConfig(editingConfig.id, {
          monthlyAmount: numAmount,
          dueDate,
          paymentInstructions,
          status: action,
        });
        showToast(action === 'PUBLISHED' ? 'Monthly fee published.' : 'Draft saved.', 'success');
      } else {
        await createTuitionConfig({
          academicContext: modalCategory,
          programId,
          billingMonth,
          monthlyAmount: numAmount,
          dueDate,
          paymentInstructions,
          status: action,
        });
        showToast(
          action === 'PUBLISHED' ? 'Monthly fee published successfully!' : 'Fee saved as draft.',
          'success'
        );
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishDraft = async (cfg: any) => {
    setActionLoading(true);
    try {
      await publishTuitionConfig(cfg.id);
      showToast(`Fee setup for ${cfg.billingLabel} published!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish draft.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingConfig) return;

    const numAmount = parseFloat(reviseAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setReviseError('Enter a valid tuition amount.');
      return;
    }
    if (!reviseDueDate) {
      setReviseError('Select a revised deadline.');
      return;
    }

    setActionLoading(true);
    setReviseError(null);

    try {
      await reviseTuitionConfig(revisingConfig.id, {
        monthlyAmount: numAmount,
        dueDate: reviseDueDate,
        paymentInstructions: reviseInstructions,
        description: reviseReason.trim() || undefined,
      });
      showToast('Fee revision applied.', 'success');
      setRevisionModalOpen(false);
      await loadData();
    } catch (err: any) {
      setReviseError(err.message || 'Failed to revise fee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (cfg: any) => {
    if (!window.confirm(`Delete monthly fee setup for ${cfg.program?.name || cfg.department?.name}?`)) {
      return;
    }
    try {
      const res = await deleteTuitionConfig(cfg.id);
      showToast(res.message || 'Fee configuration deleted.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete configuration.', 'error');
    }
  };

  // Filtered fee configurations
  const filteredConfigs = configs.filter((c) => {
    if (c.academicContext !== academicContext) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = c.program?.name?.toLowerCase() || '';
      const pCode = c.program?.code?.toLowerCase() || '';
      const dName = c.department?.name?.toLowerCase() || '';
      const bLabel = c.billingLabel?.toLowerCase() || '';
      if (!pName.includes(q) && !pCode.includes(q) && !dName.includes(q) && !bLabel.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Filtered registered students
  const filteredStudents = registeredStudents.filter((st) => {
    if (st.programType !== academicContext) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      const name = st.fullName?.toLowerCase() || '';
      const sid = st.studentId?.toLowerCase() || '';
      const prog = st.programName?.toLowerCase() || '';
      const dept = st.departmentName?.toLowerCase() || '';
      return name.includes(q) || sid.includes(q) || prog.includes(q) || dept.includes(q);
    }
    return true;
  });

  const publishedCount = filteredConfigs.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = filteredConfigs.filter((c) => c.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      {/* Header */}
      <FOPageHeader
        title="Monthly Fee Setup"
        subtitle="Configure monthly tuition schedules and monitor enrolled students."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />}
              onClick={loadData}
              disabled={actionLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Setup Fee
            </Button>
          </div>
        }
      />

      {/* ── VIEW TABS ── */}
      <div className="flex items-center justify-center gap-3 p-2.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg">
        {/* View Mode Toggle: Fee Setups vs Student Roster */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('SETUPS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'SETUPS'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-[#E9C349]" />
            <span>Fee Setups ({filteredConfigs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STUDENTS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'STUDENTS'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#E9C349]" />
            <span>Student Roster ({filteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md hover:border-[#E9C349]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              Total Setups
            </span>
            <div className="p-1.5 rounded-lg bg-[#E9C349]/10 text-[#E9C349]">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-white">{filteredConfigs.length}</span>
            <span className="text-xs text-zinc-400">{academicContext === 'TVET' ? 'TVET' : 'Short Prog'}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
              Published
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-emerald-400">{publishedCount}</span>
            <span className="text-xs text-zinc-400">Active to students</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-400 font-bold">
              Drafts
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-amber-400">{draftCount}</span>
            <span className="text-xs text-zinc-400">Unpublished</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md hover:border-[#E9C349]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#E9C349] font-bold">
              Real Students
            </span>
            <div className="p-1.5 rounded-lg bg-[#E9C349]/10 text-[#E9C349]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#E9C349]">{filteredStudents.length}</span>
            <span className="text-xs text-zinc-400">Enrolled roster</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW TAB 1: MONTHLY FEE SETUPS                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'SETUPS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-white/10">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ALL' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({filteredConfigs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PUBLISHED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'DRAFT' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Draft ({draftCount})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search program or month..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#E9C349]"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <SkeletonTable rows={5} />
          ) : filteredConfigs.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title={`No ${academicContext === 'TVET' ? 'TVET' : 'Short Program'} Fee Setups`}
              description="Click Setup Fee to configure the monthly fee for any program."
              action={{ label: 'Setup Monthly Fee', onClick: openCreateModal }}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Program & Department</th>
                      <th className="py-3 px-4">Monthly Fee</th>
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Enrolled</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredConfigs.map((cfg) => {
                      const isPublished = cfg.status === 'PUBLISHED';
                      const isPast = cfg.dueDate && new Date(cfg.dueDate) < new Date();

                      return (
                        <tr key={cfg.id} className="hover:bg-white/[0.03] transition-colors">
                          {/* Period */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#E9C349]/10 border border-[#E9C349]/20 flex items-center justify-center text-[#E9C349]">
                                <Calendar className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-white">{cfg.billingLabel}</span>
                            </div>
                          </td>

                          {/* Program */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            <p className="font-semibold text-white truncate">
                              {cfg.program?.name || 'All Programs'}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {cfg.department?.name} ({cfg.program?.code || cfg.department?.code})
                            </p>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#E9C349]">
                            {fmtETB(cfg.monthlyAmount)}
                          </td>

                          {/* Deadline */}
                          <td className="py-3.5 px-4">
                            <span className={isPast ? 'text-rose-400 font-semibold' : 'text-zinc-300'}>
                              {formatDate(cfg.dueDate)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <Badge variant={isPublished ? 'emerald' : 'amber'}>
                              {isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </td>

                          {/* Enrolled Students Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => openConfigRoster(cfg)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-[#E9C349]/50 hover:bg-[#E9C349]/10 transition-all text-xs font-mono font-bold text-zinc-200"
                              title="Click to view enrolled students"
                            >
                              <Users className="w-3 h-3 text-[#E9C349]" />
                              <span>{cfg.enrolledStudentCount}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isPublished ? (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<Send className="w-3 h-3" />}
                                    onClick={() => handlePublishDraft(cfg)}
                                    disabled={actionLoading}
                                  >
                                    Publish
                                  </Button>
                                  <button
                                    onClick={() => openEditDraftModal(cfg)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Edit draft"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<FileEdit className="w-3 h-3" />}
                                  onClick={() => openRevisionModal(cfg)}
                                >
                                  Revise
                                </Button>
                              )}
                              <button
                                onClick={() => handleDelete(cfg)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                title="Delete fee setup"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW TAB 2: REGISTERED STUDENTS ROSTER                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-white/10">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E9C349]" />
              <span>
                {academicContext === 'TVET' ? 'TVET Enrolled Roster' : 'Short Program Cohort Roster'}
              </span>
            </span>

            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search student, ID, program..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#E9C349]"
              />
            </div>
          </div>

          {/* Roster Table */}
          {loading ? (
            <SkeletonTable rows={6} />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title={`No ${academicContext === 'TVET' ? 'TVET' : 'Short Program'} Students`}
              description="No registered students match your search."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Program</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Fee Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudents.map((st) => {
                      const hasActiveConfig = configs.some(
                        (c) => c.programId === st.programId && c.status === 'PUBLISHED'
                      );

                      return (
                        <tr key={st.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E9C349]/20 to-blue-500/20 border border-[#E9C349]/40 flex items-center justify-center font-bold text-xs text-[#E9C349]">
                                {st.fullName ? st.fullName.slice(0, 2).toUpperCase() : 'ST'}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{st.fullName}</p>
                                <p className="text-[10px] text-zinc-400">{st.email || '—'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-zinc-300">
                            {st.studentId}
                          </td>

                          <td className="py-3 px-4 text-zinc-300">{st.departmentName}</td>

                          <td className="py-3 px-4 text-white font-medium">{st.programName}</td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              {st.status || 'Active'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {hasActiveConfig ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Fee Active</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  openCreateModal();
                                  setProgramId(st.programId);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-[#E9C349] hover:underline font-semibold"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Setup Fee</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CREATE / EDIT MONTHLY FEE (SlidePanel)                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SlidePanel
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingConfig ? 'Edit Fee Setup' : 'Setup Monthly Tuition'}
        subtitle="Set tuition amount, deadline, and instructions."
        width="max-w-3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveFee('PUBLISHED');
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Program Track */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Track
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalCategory('TVET')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  modalCategory === 'TVET'
                    ? 'border-[#E9C349] bg-[#E9C349]/10 text-[#E9C349]'
                    : 'border-white/10 bg-white/5 text-zinc-400'
                }`}
              >
                🎓 TVET Track
              </button>
              <button
                type="button"
                onClick={() => setModalCategory('SHORT_PROGRAM')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  modalCategory === 'SHORT_PROGRAM'
                    ? 'border-[#E9C349] bg-[#E9C349]/10 text-[#E9C349]'
                    : 'border-white/10 bg-white/5 text-zinc-400'
                }`}
              >
                🎓 Short Program Track
              </button>
            </div>
          </div>

          {/* Program Select (Grouped by Department, High Contrast) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Academic Program
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {programsForModal.length} in database
              </span>
            </div>

            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              style={{ backgroundColor: '#14171f', color: '#ffffff' }}
              className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-[#14171f] text-white text-xs font-medium focus:outline-none focus:border-[#E9C349]"
              required
            >
              <option value="" disabled style={{ backgroundColor: '#14171f', color: '#9ca3af' }}>
                -- Choose a Program --
              </option>
              {Object.entries(programsByDepartment).map(([deptName, progs]) => (
                <optgroup
                  key={deptName}
                  label={deptName}
                  style={{ backgroundColor: '#0c0f14', color: '#E9C349', fontWeight: 'bold' }}
                >
                  {progs.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      style={{ backgroundColor: '#181d28', color: '#ffffff' }}
                    >
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Selected Program Mini-Summary */}
            {selectedProgramObj && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{selectedProgramObj.name}</span>
                  <Badge variant="gold">{selectedProgramObj.departmentName}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-[#E9C349]" />
                  <span>
                    {selectedProgramObj.enrolledStudents?.length ?? selectedProgramObj.enrolledStudentCount ?? 0} active student(s) enrolled
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ backgroundColor: '#14171f', color: '#ffffff' }}
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-[#14171f] text-white text-xs focus:outline-none focus:border-[#E9C349]"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value} style={{ backgroundColor: '#181d28', color: '#ffffff' }}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ backgroundColor: '#14171f', color: '#ffffff' }}
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-[#14171f] text-white text-xs focus:outline-none focus:border-[#E9C349]"
              >
                <option value="2025" style={{ backgroundColor: '#181d28', color: '#ffffff' }}>2025</option>
                <option value="2026" style={{ backgroundColor: '#181d28', color: '#ffffff' }}>2026</option>
                <option value="2027" style={{ backgroundColor: '#181d28', color: '#ffffff' }}>2027</option>
              </select>
            </div>
          </div>

          {/* Monthly Tuition Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Monthly Amount (ETB)
              </label>
              <div className="flex items-center gap-1">
                {['2000', '2500', '3000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMonthlyAmount(val)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 font-mono"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500">
                ETB
              </span>
              <input
                type="number"
                min="1"
                step="50"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="w-full pl-12 pr-3 py-2 rounded-xl border border-white/20 bg-black/40 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#E9C349]"
                required
              />
            </div>
          </div>

          {/* Payment Deadline */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Payment Deadline
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/20 bg-black/40 text-white text-xs focus:outline-none focus:border-[#E9C349]"
              required
            />
          </div>

          {/* Payment Instructions */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              Payment Instructions
              <button
                type="button"
                onClick={() => {
                  setBankAccounts([
                    ...bankAccounts,
                    { id: Date.now().toString(), label: 'New Bank', account: '', icon: '🏦' }
                  ]);
                }}
                className="text-[10px] font-semibold text-[#E9C349] hover:text-[#E9C349]/80 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Account
              </button>
            </label>
            
            {/* Bank Accounts - Finance Officer can edit */}
            <div className="space-y-2.5 p-4 rounded-xl border-2 border-[#E9C349]/30 bg-gradient-to-br from-[#E9C349]/5 to-transparent">
              <p className="text-xs font-semibold text-[#E9C349] flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Bank Account Details
              </p>
              
              {bankAccounts.map((bank, index) => (
                <div
                  key={bank.id}
                  className="space-y-2 p-3 rounded-lg bg-black/40 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={bank.icon}
                      onChange={(e) => {
                        const updated = [...bankAccounts];
                        updated[index].icon = e.target.value;
                        setBankAccounts(updated);
                      }}
                      className="w-16 px-2 py-1 rounded-lg border border-white/10 bg-black/60 text-white text-sm focus:outline-none focus:border-[#E9C349]"
                    >
                      <option value="🏦">🏦</option>
                      <option value="📱">📱</option>
                      <option value="💳">💳</option>
                      <option value="💰">💰</option>
                      <option value="🏧">🏧</option>
                    </select>
                    
                    <input
                      type="text"
                      value={bank.label}
                      onChange={(e) => {
                        const updated = [...bankAccounts];
                        updated[index].label = e.target.value;
                        setBankAccounts(updated);
                      }}
                      placeholder="Bank Name"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-white/10 bg-black/60 text-white text-xs focus:outline-none focus:border-[#E9C349] placeholder:text-zinc-600"
                    />
                    
                    {bankAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBankAccounts(bankAccounts.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 rounded-lg border border-white/10 hover:border-rose-500 hover:bg-rose-500/10 transition-all"
                        title="Remove account"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={bank.account}
                    onChange={(e) => {
                      const updated = [...bankAccounts];
                      updated[index].account = e.target.value;
                      setBankAccounts(updated);
                    }}
                    placeholder="Account Number"
                    className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-black/60 text-white text-xs font-mono focus:outline-none focus:border-[#E9C349] placeholder:text-zinc-600"
                  />
                </div>
              ))}
              
              <p className="text-[11px] text-zinc-400 mt-3 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Students will see these accounts with copy buttons for easy payment.
                </span>
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSaveFee('DRAFT')}
              disabled={actionLoading}
            >
              Save Draft
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={actionLoading}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {actionLoading ? 'Saving...' : 'Publish'}
              </Button>
            </div>
          </div>
        </form>
      </SlidePanel>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: ROSTER MODAL                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={`Enrolled Students — ${rosterConfig?.program?.name || 'Program'}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono">{rosterConfig?.billingLabel}</span>
            <span className="font-bold text-[#E9C349] font-mono">{fmtETB(rosterConfig?.monthlyAmount || 0)}</span>
          </div>

          {(() => {
            const list = registeredStudents.filter((st) => st.programId === rosterConfig?.programId);
            if (list.length === 0) {
              return (
                <p className="text-xs text-zinc-400 text-center py-4">
                  No enrolled students in this program yet.
                </p>
              );
            }
            return (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {list.map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{st.fullName}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{st.studentId}</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {st.status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setRosterModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: REVISION MODAL                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Revise Monthly Fee"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReviseSubmit} className="space-y-3">
          {reviseError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {reviseError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Revised Amount (ETB)
            </label>
            <input
              type="number"
              min="1"
              value={reviseAmount}
              onChange={(e) => setReviseAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/20 bg-black/40 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#E9C349]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Revised Deadline
            </label>
            <input
              type="date"
              value={reviseDueDate}
              onChange={(e) => setReviseDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/20 bg-black/40 text-white text-xs focus:outline-none focus:border-[#E9C349]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Reason for Revision
            </label>
            <input
              type="text"
              placeholder="e.g. Approved deadline extension"
              value={reviseReason}
              onChange={(e) => setReviseReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/20 bg-black/40 text-white text-xs focus:outline-none focus:border-[#E9C349]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Apply Revision'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
