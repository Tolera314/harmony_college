'use client';

/**
 * Finance Officer → Outstanding Accounts Management View
 * 
 * Audits students with overdue balances, calculates financial risk tiers,
 * sends payment reminder notifications, and exports receivables ledgers.
 * Connected to live Prisma PostgreSQL `StudentRecord` & `FinancialAccount` records.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, Search, X, Mail, Phone, CreditCard,
  CalendarClock, Flag, Filter, RefreshCw, ChevronLeft, ChevronRight,
  FileSpreadsheet, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Send
} from 'lucide-react';
import { SlidePanel } from '../../ui/SlidePanel';
import { getOutstandingAccounts, sendPaymentReminder } from '@/src/lib/foApi';
import { FinanceStudent, FinanceRiskLevel } from '../../../types/finance';
import { sendPaymentReminder, getOutstandingAccounts } from '../../../lib/foApi';
import { fmtETB } from '../FOCharts';

interface OutstandingStudent {
  id: string; // studentRecordId
  studentRecordId: string;
  studentId: string;
  name: string;
  email: string | null;
  phone: string | null;
  programName: string;
  departmentName: string;
  avatar: string;
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
  daysOverdue: number;
  paymentStatus: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

const riskBadgeConfig: Record<string, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  Low: { label: 'Low Risk', textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' },
  Medium: { label: 'Medium Risk', textClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20' },
  High: { label: 'High Risk', textClass: 'text-orange-400', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20' },
  Critical: { label: 'Critical Risk', textClass: 'text-rose-400', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20' },
};

// ── Payment Reminder Modal Component ─────────────────────────────────────────
function PaymentReminderModal({
  student,
  onClose,
  onSuccess
}: {
  student: OutstandingStudent;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [customMsg, setCustomMsg] = useState(
    `Dear ${student.name},\n\nThis is an official notice from the Finance Office at Harmony College. Your account currently has an outstanding balance of ETB ${student.outstanding.toLocaleString()} (${student.daysOverdue} days overdue).\n\nPlease settle your balance promptly to maintain good financial standing.\n\nRegards,\nHarmony College Bursary Office`
  );
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendReminder = async () => {
    setSending(true);
    setErrorMsg('');
    try {
      await sendPaymentReminder(student.studentRecordId, customMsg);
      onSuccess(`Reminder notification dispatched to ${student.name}`);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to send reminder notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <SlidePanel
      isOpen
      onClose={onClose}
      title={<><Mail className="w-5 h-5 inline mr-2 text-(--brand-gold)" /> Send Payment Reminder</>}
      subtitle="Finance — Outstanding Receivables"
      width="max-w-lg"
    >
      <div className="space-y-5">
        {/* Student summary box */}
        <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle) flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-serif font-bold text-base border bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold) shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold font-sans truncate text-(--text-primary)">
              {student.name}
            </h4>
            <p className="text-xs font-mono text-(--text-faint) mt-0.5">
              ID: {student.studentId} · {student.programName}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono">
              <span className="text-rose-400 font-bold">ETB {student.outstanding.toLocaleString()}</span>
              <span className="text-(--text-faint)">{student.daysOverdue} days overdue</span>
            </div>
          </div>
        </div>

        {/* Channel Selection */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">
            Delivery Channel
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setChannel('email')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold font-sans transition-all ${
                channel === 'email'
                  ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)'
                  : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>In-App & Email</span>
            </button>
            <button
              onClick={() => setChannel('phone')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold font-sans transition-all ${
                channel === 'phone'
                  ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)'
                  : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>SMS Dispatch</span>
            </button>
          </div>
        </div>

        {/* Message editor */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">
            Notice Message Content
          </label>
          <textarea
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            rows={6}
            className="w-full p-3.5 rounded-xl border text-xs font-sans focus:outline-none focus:ring-1 focus:ring-(--brand-gold) bg-(--bg-base) border-(--border-default) text-(--text-primary) resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) text-(--text-secondary) border-(--border-default)"
          >
            Cancel
          </button>
          <button
            onClick={handleSendReminder}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-sans transition-all disabled:opacity-50 text-(--bg-base)"
            style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))' }}
          >
            {sending ? (
              <span className="w-3.5 h-3.5 border-2 border-(--bg-base)/30 border-t-(--bg-base) rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{sending ? 'Sending...' : 'Dispatch Reminder'}</span>
          </button>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Main View Component ───────────────────────────────────────────────────────
export function FOOutstandingView() {
  const [students, setStudents]         = useState<OutstandingStudent[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [riskFilter, setRiskFilter]     = useState<string>('All');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [selectedStudent, setSelectedStudent] = useState<OutstandingStudent | null>(null);
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sendingBulk, setSendingBulk]   = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOutstandingData = useCallback(async (p: number, s: string, risk: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getOutstandingAccounts({
        page: p,
        limit: 15,
        search: s.trim() || undefined,
      });

      let fetchedList: OutstandingStudent[] = data.accounts || [];
      // Filter for active outstanding debt (> 0)
      fetchedList = fetchedList.filter(st => st.outstanding > 0);

      if (risk !== 'All') {
        fetchedList = fetchedList.filter(st => st.riskLevel === risk);
      }

      setStudents(fetchedList);
      setTotal(data.total || fetchedList.length);
      setTotalPages(data.totalPages || 1);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load outstanding student accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchOutstandingData(page, search, riskFilter);
    }, 300);
  }, [page, search, riskFilter, fetchOutstandingData]);

  // Risk Counts Summary
  const riskCounts = {
    Critical: students.filter(s => s.riskLevel === 'Critical').length,
    High:     students.filter(s => s.riskLevel === 'High').length,
    Medium:   students.filter(s => s.riskLevel === 'Medium').length,
    Low:      students.filter(s => s.riskLevel === 'Low').length,
  };

  const totalOwed = students.reduce((sum, s) => sum + s.outstanding, 0);

  const handleSendAllReminders = async () => {
    const highRiskStudents = students.filter(s => s.riskLevel === 'Critical' || s.riskLevel === 'High');
    if (highRiskStudents.length === 0) {
      showToast('No critical or high-risk outstanding accounts to notify.', 'error');
      return;
    }

    setSendingBulk(true);
    let successCount = 0;
    for (const student of highRiskStudents) {
      try {
        await sendPaymentReminder(
          student.studentRecordId,
          `Urgent Payment Notice: Dear ${student.name}, your balance of ETB ${student.outstanding.toLocaleString()} is overdue. Please settle your account immediately.`
        );
        successCount++;
      } catch {
        // Continue notifying remaining students
      }
    }
    setSendingBulk(false);
    showToast(`Bulk reminders sent to ${successCount} high-risk students`, 'success');
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const headers = ['Student ID', 'Full Name', 'Program', 'Outstanding Balance (ETB)', 'Days Overdue', 'Risk Level', 'Phone', 'Email'];
    const rows = students.map(s => [
      `"${s.studentId}"`,
      `"${s.name}"`,
      `"${s.programName}"`,
      s.outstanding,
      s.daysOverdue,
      `"${s.riskLevel}"`,
      `"${s.phone ?? ''}"`,
      `"${s.email ?? ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Harmony_Outstanding_Accounts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendAllReminders = async () => {
    if (outstanding.length === 0) return;
    setSendingAll(true);
    try {
      let sent = 0;
      for (const st of outstanding.slice(0, 20)) {
        await sendPaymentReminder(
          st.id,
          `Dear ${st.name}, this is an official reminder that you have an outstanding balance of ETB ${st.outstanding.toLocaleString()} at Harmony College. Please settle this balance at the Finance Office.`
        ).catch(() => {});
        sent++;
      }
      setBulkStatus(`Successfully sent reminders to ${sent} student${sent !== 1 ? 's' : ''}.`);
      setTimeout(() => setBulkStatus(null), 4000);
    } catch {
      setBulkStatus('Error dispatching reminders.');
      setTimeout(() => setBulkStatus(null), 4000);
    } finally {
      setSendingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-3 backdrop-blur-md"
            style={{
              backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: toast.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Outstanding Accounts"
        subtitle={`${outstanding.length} students with unpaid balances · ETB ${fmtETB(totalOwed)} total outstanding`}
        icon={<AlertTriangle className="w-5 h-5" />}
        actions={
          <Button variant="danger" size="sm" icon={<Mail className="w-4 h-4" />}
            disabled={sendingAll || outstanding.length === 0}
            onClick={handleSendAllReminders}>
            {sendingAll ? 'Sending Reminders…' : 'Send All Reminders'}
          </Button>
        }
      />

      {bulkStatus && (
        <div className="p-3 bg-(--status-success-bg) border border-(--status-success-border) text-(--status-success) rounded-xl font-sans text-xs flex items-center justify-between">
          <span>{bulkStatus}</span>
          <button onClick={() => setBulkStatus(null)} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['Critical','High','Medium','Low'] as FinanceRiskLevel[]).map((level) => (
          <motion.div key={level} whileHover={{ y: -3 }} onClick={() => { setRiskFilter(level); setPage(1); }}
            className={`cursor-pointer border rounded-2xl p-4 transition-all ${riskFilter === level ? 'ring-2 ring-[#E9C349]/40' : ''} ${riskConfig[level].bg}`}>
            <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{level} Risk</p>
            <p className="font-mono text-3xl font-bold mt-1" style={{ color: riskConfig[level].bar }}>{counts[level]}</p>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">students</p>
          </motion.div>
        )}
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl backdrop-blur-xl border border-(--border-default) bg-gradient-to-r from-(--hover-overlay) via-transparent to-(--accent-gold-subtle)">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-(--text-primary)">
                Outstanding Accounts
              </h1>
              <p className="text-xs font-sans text-(--text-muted) mt-0.5">
                Audit overdue student balances, assess financial risk, and dispatch payment notices
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSendAllReminders}
            disabled={sendingBulk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-sans transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 text-rose-400 bg-rose-500/10 border border-rose-500/20"
          >
            {sendingBulk ? (
              <span className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5" />
            )}
            <span>{sendingBulk ? 'Dispatching...' : 'Remind High Risk'}</span>
          </button>
        </div>
      </div>

      {/* Risk Tier KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['Critical', 'High', 'Medium', 'Low'] as const).map((level) => {
          const cfg = riskBadgeConfig[level];
          const isSelected = riskFilter === level;
          return (
            <div
              key={level}
              onClick={() => { setRiskFilter(level); setPage(1); }}
              className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-(--brand-gold) bg-(--accent-gold-subtle)' : 'bg-(--hover-overlay)'
              } border-(--border-subtle)`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-semibold text-(--text-muted)">{level} Risk</span>
                <ShieldAlert className={`w-4 h-4 ${cfg.textClass}`} />
              </div>
              <p className={`font-serif text-2xl font-bold mt-2 ${cfg.textClass}`}>
                {riskCounts[level]}
              </p>
              <p className="text-[11px] text-(--text-faint) mt-0.5">Students in tier</p>
            </div>
          );
        })}
      </div>

      {/* Total Receivables Banner */}
      <div className="p-4 rounded-2xl bg-(--hover-overlay) border border-(--border-subtle) flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-(--brand-gold)" />
          <div>
            <span className="text-xs font-sans text-(--text-muted)">Total Outstanding Receivables:</span>
            <span className="text-base font-serif font-bold text-rose-400 ml-2">
              ETB {totalOwed.toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchOutstandingData(page, search, riskFilter)}
          className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--accent-gold-subtle)"
          title="Refresh Receivables"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-(--hover-overlay) border border-(--border-subtle)">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search student name, ID, or academic program..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs font-sans focus:outline-none focus:ring-1 focus:ring-(--brand-gold) bg-(--bg-base) border-(--border-default) text-(--text-primary)"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-primary)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((r) => {
            const isActive = riskFilter === r;
            return (
              <button
                key={r}
                onClick={() => { setRiskFilter(r); setPage(1); }}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border) shadow-sm'
                    : 'bg-transparent text-(--text-secondary) border-(--border-default) hover:bg-(--hover-overlay)'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accounts List / Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse bg-(--hover-overlay) border border-(--border-subtle)" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl text-center border bg-(--hover-overlay) border-(--border-subtle)">
          <AlertCircle className="w-10 h-10 mx-auto text-(--status-danger) mb-2" />
          <p className="text-sm text-(--status-danger) font-medium">{error}</p>
          <button
            onClick={() => fetchOutstandingData(page, search, riskFilter)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)"
          >
            Retry Loading
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="py-16 text-center border rounded-2xl bg-(--hover-overlay) border-(--border-subtle)">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-(--text-faint)" />
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">No outstanding accounts</h3>
          <p className="text-xs font-sans text-(--text-muted) mt-1 max-w-sm mx-auto">
            No student accounts with unpaid balances matched your criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--hover-overlay)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans min-w-[800px]">
              <thead className="bg-(--bg-base) border-b border-(--border-subtle)">
                <tr>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Student Profile</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Program</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Balance Owed</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Days Overdue</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Risk Level</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Contact</th>
                  <th className="p-4 text-right font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {students.map((s) => {
                  const cfg = riskBadgeConfig[s.riskLevel] ?? riskBadgeConfig.Low;
                  return (
                    <tr key={s.id} className="hover:bg-(--accent-gold-subtle)/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold font-serif text-sm border bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-sans text-xs font-semibold text-(--text-primary)">{s.name}</p>
                            <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{s.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-sans text-xs text-(--text-muted) max-w-[140px] truncate">
                        {s.programName}
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-xs font-bold text-rose-400">
                          ETB {s.outstanding.toLocaleString()}
                        </p>
                        <p className="font-mono text-[10px] text-(--text-faint)">of ETB {s.totalCharged.toLocaleString()}</p>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-amber-400">
                        {s.daysOverdue > 0 ? `${s.daysOverdue} days` : '0 days'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-(--text-muted)">
                        {s.email ?? s.phone ?? 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            title="Send Payment Reminder Notice"
                            className="p-2 rounded-xl border text-xs font-semibold transition-all hover:bg-(--accent-gold-subtle) text-(--text-secondary) border-(--border-default)"
                          >
                            <Mail className="w-3.5 h-3.5 text-(--brand-gold)" />
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

      {/* Pagination Footer */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-(--border-subtle)">
          <p className="text-xs font-sans text-(--text-faint)">
            Showing {students.length} of {total} accounts · Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Payment Reminder Slide-out Panel */}
      <AnimatePresence>
        {selectedStudent && (
          <PaymentReminderModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            onSuccess={(msg) => showToast(msg, 'success')}
          />
        )}
      </div>
    </div>
  );
}

