'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  DollarSign, AlertTriangle, Receipt, TrendingUp, TrendingDown,
  Clock, RefreshCw, BarChart3, CreditCard, Users, Loader2, Landmark,
} from 'lucide-react';
import { KPICard } from '../KPICard';
import { RevenueLineChart, GroupedBarChart, DonutChart, HorizontalBarChart, VerticalBarChart, fmtETB } from '../FOCharts';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { FONavTab } from '../../../types/finance';
import {
  foKpis as defaultKpis, monthlyRevenue as defaultRevenue, paymentMethodBreakdown as defaultPaymentMethods, dailyCollections as defaultDailyCollections,
  outstandingTrend as defaultOutstandingTrend, departments as defaultDepartments, financeStudents,
  foNotifications, transactions as defaultTxns, foProfile,
} from '../../../data/financeData';
import {
  getOverviewData,
  getNotifications,
  getSettings,
  getPaymentSubmissionAnalytics,
} from '../../../lib/foApi';

interface FOOverviewViewProps {
  setActiveTab: (tab: FONavTab) => void;
  programType?: 'TVET' | 'SHORT_PROGRAM';
  profile?: typeof foProfile;
}

const payStatusColor: Record<string, string> = {
  Paid:     'text-(--status-success)',
  Partial:  'text-(--status-warning)',
  Unpaid:   'text-(--status-danger)',
  Overdue:  'text-rose-500',
  Deferred: 'text-(--text-muted)',
};

const payStatusBadge: Record<string, 'emerald' | 'amber' | 'rose' | 'glass'> = {
  Paid:     'emerald',
  Partial:  'amber',
  Unpaid:   'rose',
  Overdue:  'rose',
  Deferred: 'glass',
};

// ── Percentage label ──────────────────────────────────────────────────────────
function PctLabel({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="font-sans text-xs text-(--text-faint)">No data yesterday</span>;
  if (pct === 0)    return <span className="font-sans text-xs text-(--text-faint)">Same as yesterday</span>;
  const up = pct > 0;
  return (
    <span className={`font-sans text-xs flex items-center gap-1 ${up ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct}% vs yesterday
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export const FOOverviewView: React.FC<FOOverviewViewProps> = ({ setActiveTab, programType }) => {
  const [kpis,            setKpis]            = useState(ZERO_KPIS);
  const [recentTxns,      setRecentTxns]      = useState<any[]>([]);
  const [monthlyRev,      setMonthlyRev]      = useState<any[]>([]);
  const [methodBreakdown, setMethodBreakdown] = useState<any[]>([]);
  const [deptList,        setDeptList]        = useState<any[]>([]);
  const [dailyColls,      setDailyColls]      = useState<any[]>([]);
  const [outstandingTrend,setOutstandingTrend]= useState<any[]>([]);
  const [highRisk,        setHighRisk]        = useState<any[]>([]);
  const [notifications,   setNotifications]   = useState<any[]>([]);
  const [academicYear,    setAcademicYear]    = useState('');
  const [foName,          setFoName]          = useState('');
  const [pendingSubCount, setPendingSubCount] = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, notifsData, settingsData, submissionData] = await Promise.allSettled([
        getOverviewData(programType),
        getNotifications(),
        getSettings(),
        getPaymentSubmissionAnalytics(),
      ]);

      if (overviewData.status === 'fulfilled' && overviewData.value) {
        const d = overviewData.value;
        if (d.kpis)               setKpis((prev) => ({ ...prev, ...d.kpis }));
        if (Array.isArray(d.recentTransactions))  setRecentTxns(d.recentTransactions);
        if (Array.isArray(d.monthlyRevenue))       setMonthlyRev(d.monthlyRevenue);
        if (Array.isArray(d.paymentMethodBreakdown)) setMethodBreakdown(d.paymentMethodBreakdown);
        if (Array.isArray(d.departmentBreakdown))  setDeptList(d.departmentBreakdown);
        if (Array.isArray(d.dailyCollections))     setDailyColls(d.dailyCollections);
        if (Array.isArray(d.outstandingTrend))     setOutstandingTrend(d.outstandingTrend);
        if (Array.isArray(d.highRiskAccounts))     setHighRisk(d.highRiskAccounts);
        if (d.academicYearLabel)  setAcademicYear(d.academicYearLabel);
      } else if (overviewData.status === 'rejected') {
        setError('Could not load dashboard data. Please refresh.');
      }

      if (submissionData.status === 'fulfilled' && submissionData.value) {
        setPendingSubCount(submissionData.value.pendingCount ?? 0);
      }

      if (notifsData.status === 'fulfilled' && Array.isArray(notifsData.value)) {
        setNotifications(notifsData.value);
      }

      if (settingsData.status === 'fulfilled' && settingsData.value) {
        const s = settingsData.value as any;
        const name = s?.name ?? s?.fullName ?? s?.officerName ?? '';
        if (name) setFoName(name);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, programType]);
  useEffect(() => {
    getOverviewData()
      .then((data) => {
        if (data) {
          if (data.kpis) setKpis(data.kpis);
          if (Array.isArray(data.recentTransactions)) setRecentTxns(data.recentTransactions);
          if (Array.isArray(data.monthlyRevenue)) setMonthlyRev(data.monthlyRevenue);
          if (Array.isArray(data.paymentMethodBreakdown)) setMethodBreakdown(data.paymentMethodBreakdown);
          if (Array.isArray(data.departments)) setDeptList(data.departments);
        }
      })
      .catch(() => {
        // Keep default preset state on offline or error
      });

  const lineData = monthlyRev.map((m) => ({ label: m.month, value: m.revenue }));
  const targetData = monthlyRev.map((m) => ({ label: m.month, value: m.target }));
  const outstandingLine = defaultOutstandingTrend.map((o) => ({ label: o.month, value: o.amount }));
  const dailyData = defaultDailyCollections.map((d) => ({ label: d.day, value: d.amount }));
  const deptBars = deptList.map((d) => ({
    label: d.code || d.name,
    value: d.totalRevenue,
    max: Math.max(...deptList.map((x) => x.totalRevenue || 1)),
    subLabel: `${d.studentCount} students`,
    color: '#E9C349',
  }));
  const groupedBar = monthlyRev.slice(-6).map((m) => ({
    label: m.month,
    primary: m.revenue,
    secondary: m.target,
  }));
  const donutSegments = methodBreakdown.map((p) => ({
    label: p.method,
    value: p.count,
    color: p.color || '#E9C349',
  }));
  const totalTxns = methodBreakdown.reduce((s, p) => s + p.count, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-8 pb-16">

      {/* Hero banner */}
      <section className="relative rounded-3xl overflow-hidden border border-(--border-default) shadow-2xl min-h-[200px]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E9C349]/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E9C349]/6 rounded-full blur-3xl pointer-events-none" />
        </div>
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-[11px] font-mono font-semibold text-(--brand-gold) uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" />
              {currentProfile.currentSemester} · Finance Portal Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-(--text-primary) leading-tight">
              Good morning, {currentProfile.name.split(' ')[0] || currentProfile.name}.
            </h2>
            <p className="font-sans text-sm text-(--text-secondary) max-w-xl leading-relaxed">
              {currentProfile.department} · {currentProfile.academicYear}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {overdue.length > 0 && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('outstanding')} icon={<AlertTriangle className="w-4 h-4" />}>
                  {overdue.length} High-Risk Accounts
              <Button
                variant={pendingSubCount > 0 ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('payment_submissions')}
                icon={<CreditCard className="w-4 h-4" />}
              >
                {pendingSubCount > 0 ? `${pendingSubCount} Payment Submission${pendingSubCount !== 1 ? 's' : ''} to Review` : 'Payment Submissions'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('tuition_setup')}
                icon={<Landmark className="w-4 h-4" />}
              >
                Tuition Setup
              </Button>
              {highRisk.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('outstanding')} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}>
                  {highRisk.length} High-Risk Account{highRisk.length !== 1 ? 's' : ''}
                </Button>
              )}
              {kpis.pendingReconciliation > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('reconciliation')} icon={<RefreshCw className="w-4 h-4" />}>
                  {kpis.pendingReconciliation} Pending Reconciliations
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('reports')} icon={<BarChart3 className="w-4 h-4" />}>
                Reports
              </Button>
            </div>
          </div>
          {/* Today's collection stat */}
          <div className="hidden lg:flex flex-col items-center gap-1 shrink-0 bg-(--hover-overlay) border border-(--border-default) rounded-2xl px-6 py-5">
            <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Today&apos;s Collections</p>
            <p className="font-mono text-3xl font-bold text-(--brand-gold)">ETB {fmtETB(kpis.todaysCollections)}</p>
            <div className="flex items-center gap-1 text-(--status-success) mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-sans text-xs">+12% vs yesterday</span>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          <KPICard
            label="Total Revenue — Semester"
            value={`ETB ${fmtETB(kpis.totalRevenueSemester)}`}
            icon={<DollarSign className="w-5 h-5" />}
            trend="up" trendLabel="+8.4% vs last sem."
            sparkline={[22, 26, 24, 28, 31.8]}
            accent
            onClick={() => setActiveTab('reports')}
          />
          <KPICard
            label="Outstanding Balances"
            value={`ETB ${fmtETB(kpis.totalOutstanding)}`}
            icon={<AlertTriangle className="w-5 h-5" />}
            trend="down" trendLabel={`${kpis.overdueAccounts} overdue accounts`}
            sparkline={[0.98, 0.85, 0.92, 2.08, 1.89]}
            onClick={() => setActiveTab('outstanding')}
          />
          <KPICard
            label="Receipts Issued"
            value={kpis.receiptsIssued}
            icon={<Receipt className="w-5 h-5" />}
            trend="up" trendLabel="This semester"
            sparkline={[80, 88, 95, 110, 120]}
            onClick={() => setActiveTab('receipts')}
          />
          <KPICard
            label="Pending Reconciliation"
            value={kpis.pendingReconciliation}
            icon={<RefreshCw className="w-5 h-5" />}
            trend={kpis.pendingReconciliation > 0 ? 'down' : 'neutral'}
            trendLabel="Requires review"
            accent={kpis.pendingReconciliation > 0}
            sparkline={[2, 3, 1, 4, 5]}
            onClick={() => setActiveTab('reconciliation')}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KPICard
            label="Today's Collections"
            value={`ETB ${fmtETB(kpis.todaysCollections)}`}
            icon={<CreditCard className="w-5 h-5" />}
            trend="up" trendLabel="+12% vs yesterday"
            sparkline={[310, 380, 290, 460, 520]}
            onClick={() => setActiveTab('payments')}
          />
          <KPICard
            label="Avg Daily Revenue"
            value={`ETB ${fmtETB(kpis.averageDailyRevenue)}`}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="up" trendLabel="30-day average"
            sparkline={[320, 340, 330, 350, 358]}
            onClick={() => setActiveTab('reports')}
          />
          <KPICard
            label="Overdue Accounts"
            value={kpis.overdueAccounts}
            icon={<Clock className="w-5 h-5" />}
            trend="down" trendLabel="Action required"
            accent={kpis.overdueAccounts > 0}
            sparkline={[2, 3, 3, 4, 4]}
            onClick={() => setActiveTab('outstanding')}
          />
          <KPICard
            label="Recent Transactions"
            value={kpis.recentTransactionsCount}
            icon={<Users className="w-5 h-5" />}
            trend="neutral" trendLabel="Last 7 days"
            sparkline={[30, 35, 38, 40, 42]}
            onClick={() => setActiveTab('payments')}
          />
        </div>
      </section>

      {/* Analytics row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue vs Target</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Monthly revenue compared to targets — {foProfile.academicYear}</p>
            </div>
            <Badge variant="emerald">+8.4% YTD</Badge>
          </div>
          <GroupedBarChart data={groupedBar} height={150} primaryLabel="Revenue" secondaryLabel="Target" />
        </Card>

        <Card hoverable={false} className="space-y-5">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Payment Methods</h3>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">Transaction count by channel</p>
          </div>
          <DonutChart
            segments={donutSegments}
            total={totalTxns}
            centerLabel={String(totalTxns)}
            centerSub="Total transactions"
          />
        </Card>
      </section>

      {/* Analytics row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue Trend</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Monthly revenue — {foProfile.academicYear}</p>
            </div>
          </div>
          <RevenueLineChart data={lineData} secondaryData={targetData} height={140} label="Revenue" secondaryLabel="Target" />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Outstanding Balance Trend</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Total overdue over time</p>
            </div>
            <Badge variant="rose">ETB {fmtETB(kpis.totalOutstanding)}</Badge>
          </div>
          <RevenueLineChart data={outstandingLine} color="#f87171" height={140} />
        </Card>
      </section>

      {/* Department revenue + Daily collections */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue by Department</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Total collected — {foProfile.currentSemester}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('reports')}>Full report</Button>
          </div>
          <HorizontalBarChart data={deptBars} />
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Daily Collections</h3>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">This week</p>
          </div>
          <VerticalBarChart data={dailyData} height={130} />
        </Card>
      </section>

      {/* Bottom row: recent transactions + high-risk students */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent Transactions</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('payments')}>View all</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-(--border-subtle)">
                  {['Student', 'Method', 'Amount', 'Date', 'Status'].map((h) => (
                    <th key={h} className="pb-2 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {recentTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-sans text-xs text-(--text-primary) font-medium truncate max-w-[130px]">{t.studentName}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{t.type}</p>
                    </td>
                    <td className="py-3 pr-4 font-sans text-xs text-(--text-secondary)">{t.paymentMethod}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-(--brand-gold) font-bold">ETB {t.amount.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-(--text-faint)">{t.date}</td>
                    <td className="py-3">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                        t.status === 'Completed' ? 'bg-(--status-success-bg) text-(--status-success) border-(--status-success-border)' :
                        t.status === 'Pending'   ? 'bg-(--status-warning-bg) text-(--status-warning) border-(--status-warning-border)' :
                        'bg-(--status-danger-bg) text-(--status-danger) border-rose-800/40'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">High-Risk Accounts</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('outstanding')}>View all</Button>
          </div>
          <div className="space-y-3">
            {overdue.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) hover:border-(--status-danger-border) transition-colors">
                <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-(--border-default) shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{s.name}</p>
                  <p className="font-mono text-[10px] text-(--status-danger)">ETB {s.outstanding.toLocaleString()} · {s.daysOverdue}d overdue</p>
                </div>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full border ${
                  s.riskLevel === 'Critical' ? 'bg-(--status-danger-bg) text-(--status-danger) border-rose-800/40' : 'bg-(--status-warning-bg) text-(--status-warning) border-(--status-warning-border)'
                }`}>{s.riskLevel}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Notifications summary */}
      <section>
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent Notifications</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('notifications')}>View all</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {foNotifications.slice(0, 6).map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  n.read ? 'border-(--border-subtle)' : 'border-(--accent-gold-border) bg-[#E9C349]/3'
                }`}
              >
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                  n.read ? 'bg-(--active-overlay)' :
                  n.type === 'payment_overdue' || n.type === 'reconciliation_failed' ? 'bg-rose-400' :
                  n.type === 'large_payment' || n.type === 'payment_received' ? 'bg-emerald-400' : 'bg-[#E9C349]'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-sans text-xs font-semibold ${n.read ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                  <p className="font-sans text-xs text-(--text-faint) truncate mt-0.5">{n.message}</p>
                </div>
                <p className="font-mono text-[10px] text-(--text-faint) shrink-0 hidden sm:block whitespace-nowrap">{n.timestamp.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </motion.div>
  );
};
