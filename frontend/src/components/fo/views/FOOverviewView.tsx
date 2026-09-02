'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign, AlertTriangle, Receipt, TrendingUp, TrendingDown,
  Clock, RefreshCw, BarChart3, CreditCard, Users, Loader2,
} from 'lucide-react';
import { KPICard } from '../KPICard';
import {
  RevenueLineChart, GroupedBarChart, DonutChart,
  HorizontalBarChart, VerticalBarChart, fmtETB,
} from '../FOCharts';
import { Card }   from '../../ui/Card';
import { Badge }  from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { FONavTab } from '../../../types/finance';
import {
  getOverviewData,
  getNotifications,
  getSettings,
} from '../../../lib/foApi';

interface FOOverviewViewProps {
  setActiveTab: (tab: FONavTab) => void;
}

// ── Zero-state KPIs (shown while loading or on empty DB) ─────────────────────
const ZERO_KPIS = {
  totalRevenueSemester:    0,
  totalCollections:        0,
  totalOutstanding:        0,
  overdueAccounts:         0,
  receiptsIssued:          0,
  pendingReconciliation:   0,
  todaysCollections:       0,
  yesterdaysCollections:   0,
  todayVsYesterdayPct:     null as number | null,
  averageDailyRevenue:     0,
  recentTransactionsCount: 0,
  pendingReconciliationCount: 0,
};

// ── Status badge colours ──────────────────────────────────────────────────────
const txStatusCls = (status: string) => {
  if (status === 'Completed' || status === 'POSTED')
    return 'bg-(--status-success-bg) text-(--status-success) border-(--status-success-border)';
  if (status === 'Pending' || status === 'PENDING')
    return 'bg-(--status-warning-bg) text-(--status-warning) border-(--status-warning-border)';
  return 'bg-(--status-danger-bg) text-(--status-danger) border-rose-800/40';
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

export const FOOverviewView: React.FC<FOOverviewViewProps> = ({ setActiveTab }) => {
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
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, notifsData, settingsData] = await Promise.allSettled([
        getOverviewData(),
        getNotifications(),
        getSettings(),
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

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived chart data ──────────────────────────────────────────────────
  const lineData        = monthlyRev.map((m) => ({ label: m.month, value: m.revenue ?? m.collections ?? 0 }));
  const targetData      = monthlyRev.map((m) => ({ label: m.month, value: m.target ?? 0 }));
  const outstandingLine = outstandingTrend.map((o) => ({ label: o.month, value: o.amount ?? 0 }));
  const dailyData       = dailyColls.map((d) => ({ label: d.day, value: d.amount ?? 0 }));

  const deptMax = Math.max(...deptList.map((d) => d.totalRevenue || d.outstandingBalance || 1), 1);
  const deptBars = deptList.map((d) => ({
    label:    d.code || d.name,
    value:    d.outstandingBalance ?? 0,
    max:      deptMax,
    subLabel: `${d.studentCount ?? 0} students`,
    color:    '#E9C349',
  }));

  const groupedBar = monthlyRev.slice(-6).map((m) => ({
    label:     m.month,
    primary:   m.revenue ?? m.collections ?? 0,
    secondary: m.target ?? 0,
  }));

  const donutSegments  = methodBreakdown.map((p) => ({
    label: p.method,
    value: p.count ?? 0,
    color: p.color ?? '#E9C349',
  }));
  const totalTxnCount  = methodBreakdown.reduce((s, p) => s + (p.count ?? 0), 0);

  const unreadNotifs   = notifications.filter((n: any) => !n.read && !n.isRead);
  const semesterLabel  = academicYear || new Date().getFullYear().toString();
  const displayName    = foName ? foName.split(' ').slice(-1)[0] : 'Officer';

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-(--text-faint)">
        <Loader2 className="w-8 h-8 animate-spin text-(--brand-gold)" />
        <p className="font-sans text-sm">Loading dashboard data…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-16"
    >
      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-(--status-danger-bg) border border-(--status-danger-border) text-(--status-danger) font-sans text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
          <button onClick={loadData} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

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
              {semesterLabel} · Finance Portal Active
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-(--text-primary) leading-tight">
              Good morning, {displayName}.
            </h2>
            <p className="font-sans text-sm text-(--text-secondary) max-w-xl leading-relaxed">
              Finance &amp; Bursary Office · {semesterLabel}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {highRisk.length > 0 && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('outstanding')} icon={<AlertTriangle className="w-4 h-4" />}>
                  {highRisk.length} High-Risk Account{highRisk.length !== 1 ? 's' : ''}
                </Button>
              )}
              {kpis.pendingReconciliation > 0 && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('reconciliation')} icon={<RefreshCw className="w-4 h-4" />}>
                  {kpis.pendingReconciliation} Pending Reconciliation{kpis.pendingReconciliation !== 1 ? 's' : ''}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('reports')} icon={<BarChart3 className="w-4 h-4" />}>
                View Reports
              </Button>
            </div>
          </div>

          {/* Today's collection live stat */}
          <div className="hidden lg:flex flex-col items-center gap-1 shrink-0 bg-(--hover-overlay) border border-(--border-default) rounded-2xl px-6 py-5">
            <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">Today&apos;s Collections</p>
            <p className="font-mono text-3xl font-bold text-(--brand-gold)">
              {kpis.todaysCollections > 0 ? `ETB ${fmtETB(kpis.todaysCollections)}` : 'ETB 0'}
            </p>
            <div className="mt-1">
              <PctLabel pct={kpis.todayVsYesterdayPct} />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Grid — row 1 */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Revenue — Semester"
            value={kpis.totalRevenueSemester > 0 ? `ETB ${fmtETB(kpis.totalRevenueSemester)}` : 'ETB 0'}
            icon={<DollarSign className="w-5 h-5" />}
            trend="neutral" trendLabel={semesterLabel}
            sparkline={monthlyRev.slice(-5).map((m) => m.revenue ?? m.collections ?? 0)}
            accent
            onClick={() => setActiveTab('reports')}
          />
          <KPICard
            label="Outstanding Balances"
            value={kpis.totalOutstanding > 0 ? `ETB ${fmtETB(kpis.totalOutstanding)}` : 'ETB 0'}
            icon={<AlertTriangle className="w-5 h-5" />}
            trend={kpis.totalOutstanding > 0 ? 'down' : 'neutral'}
            trendLabel={kpis.overdueAccounts > 0 ? `${kpis.overdueAccounts} overdue account${kpis.overdueAccounts !== 1 ? 's' : ''}` : 'No overdue accounts'}
            sparkline={outstandingTrend.slice(-5).map((o) => o.amount ?? 0)}
            onClick={() => setActiveTab('outstanding')}
          />
          <KPICard
            label="Receipts Issued"
            value={kpis.receiptsIssued}
            icon={<Receipt className="w-5 h-5" />}
            trend="neutral" trendLabel="This semester"
            sparkline={[0]}
            onClick={() => setActiveTab('receipts')}
          />
          <KPICard
            label="Pending Reconciliation"
            value={kpis.pendingReconciliation}
            icon={<RefreshCw className="w-5 h-5" />}
            trend={kpis.pendingReconciliation > 0 ? 'down' : 'neutral'}
            trendLabel={kpis.pendingReconciliation > 0 ? 'Requires review' : 'All clear'}
            accent={kpis.pendingReconciliation > 0}
            sparkline={[0]}
            onClick={() => setActiveTab('reconciliation')}
          />
        </div>

        {/* KPI Grid — row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KPICard
            label="Today's Collections"
            value={kpis.todaysCollections > 0 ? `ETB ${fmtETB(kpis.todaysCollections)}` : 'ETB 0'}
            icon={<CreditCard className="w-5 h-5" />}
            trend={
              kpis.todayVsYesterdayPct === null ? 'neutral' :
              kpis.todayVsYesterdayPct >= 0 ? 'up' : 'down'
            }
            trendLabel={
              kpis.todayVsYesterdayPct === null
                ? 'No data yesterday'
                : `${kpis.todayVsYesterdayPct >= 0 ? '+' : ''}${kpis.todayVsYesterdayPct}% vs yesterday`
            }
            sparkline={dailyColls.slice(-5).map((d) => d.amount ?? 0)}
            onClick={() => setActiveTab('payments')}
          />
          <KPICard
            label="Avg Daily Revenue"
            value={kpis.averageDailyRevenue > 0 ? `ETB ${fmtETB(kpis.averageDailyRevenue)}` : 'ETB 0'}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="neutral" trendLabel="30-day average"
            sparkline={dailyColls.slice(-5).map((d) => d.amount ?? 0)}
            onClick={() => setActiveTab('reports')}
          />
          <KPICard
            label="Overdue Accounts"
            value={kpis.overdueAccounts}
            icon={<Clock className="w-5 h-5" />}
            trend={kpis.overdueAccounts > 0 ? 'down' : 'neutral'}
            trendLabel={kpis.overdueAccounts > 0 ? 'Action required' : 'All current'}
            accent={kpis.overdueAccounts > 0}
            sparkline={[0]}
            onClick={() => setActiveTab('outstanding')}
          />
          <KPICard
            label="Recent Transactions"
            value={kpis.recentTransactionsCount}
            icon={<Users className="w-5 h-5" />}
            trend="neutral" trendLabel="Last 7 days"
            sparkline={[0]}
            onClick={() => setActiveTab('payments')}
          />
        </div>
      </section>

      {/* Analytics row 1: Revenue vs Target + Payment Methods */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue vs Target</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">
                Monthly collections compared to targets — {semesterLabel}
              </p>
            </div>
            {groupedBar.length > 0 && (
              <Badge variant="emerald">
                {groupedBar.length} month{groupedBar.length !== 1 ? 's' : ''} of data
              </Badge>
            )}
          </div>
          {groupedBar.length > 0 ? (
            <GroupedBarChart data={groupedBar} height={150} primaryLabel="Collections" secondaryLabel="Target" />
          ) : (
            <div className="h-36 flex items-center justify-center text-(--text-faint) font-sans text-sm">
              No monthly data available yet
            </div>
          )}
        </Card>

        <Card hoverable={false} className="space-y-5">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Payment Methods</h3>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">Transaction count by channel</p>
          </div>
          {totalTxnCount > 0 ? (
            <DonutChart
              segments={donutSegments}
              total={totalTxnCount}
              centerLabel={String(totalTxnCount)}
              centerSub="Total transactions"
            />
          ) : (
            <div className="h-36 flex items-center justify-center text-(--text-faint) font-sans text-sm">
              No payment data available yet
            </div>
          )}
        </Card>
      </section>

      {/* Analytics row 2: Revenue Trend + Outstanding Trend */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue Trend</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Monthly collections — {semesterLabel}</p>
            </div>
          </div>
          {lineData.length > 0 ? (
            <RevenueLineChart data={lineData} secondaryData={targetData} height={140} label="Collections" secondaryLabel="Target" />
          ) : (
            <div className="h-36 flex items-center justify-center text-(--text-faint) font-sans text-sm">
              No collections recorded yet
            </div>
          )}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Outstanding Balance Trend</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Total overdue over time</p>
            </div>
            <Badge variant="rose">ETB {fmtETB(kpis.totalOutstanding)}</Badge>
          </div>
          {outstandingLine.length > 0 && outstandingLine.some((o) => o.value > 0) ? (
            <RevenueLineChart data={outstandingLine} color="#f87171" height={140} />
          ) : (
            <div className="h-36 flex items-center justify-center text-(--text-faint) font-sans text-sm">
              No outstanding balance history
            </div>
          )}
        </Card>
      </section>

      {/* Department revenue + Daily collections */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Outstanding by Department</h3>
              <p className="font-sans text-xs text-(--text-faint) mt-0.5">Current balances — {semesterLabel}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('reports')}>Full report</Button>
          </div>
          {deptBars.length > 0 ? (
            <HorizontalBarChart data={deptBars} />
          ) : (
            <div className="h-24 flex items-center justify-center text-(--text-faint) font-sans text-sm">
              No department data available yet
            </div>
          )}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Daily Collections</h3>
            <p className="font-sans text-xs text-(--text-faint) mt-0.5">This week</p>
          </div>
          {dailyData.length > 0 && dailyData.some((d) => d.value > 0) ? (
            <VerticalBarChart data={dailyData} height={130} />
          ) : (
            <div className="h-32 flex items-center justify-center text-(--text-faint) font-sans text-sm">
              No collections recorded today
            </div>
          )}
        </Card>
      </section>

      {/* Recent transactions + High-risk accounts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hoverable={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Recent Transactions</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('payments')}>View all</Button>
          </div>
          {recentTxns.length > 0 ? (
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
                  {recentTxns.map((t: any) => (
                    <tr key={t.id} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-sans text-xs text-(--text-primary) font-medium truncate max-w-[130px]">
                          {t.studentName ?? 'Unknown'}
                        </p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{t.type}</p>
                      </td>
                      <td className="py-3 pr-4 font-sans text-xs text-(--text-secondary)">
                        {t.paymentMethod ?? '—'}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-(--brand-gold) font-bold">
                        ETB {(t.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-(--text-faint)">
                        {t.date ?? '—'}
                      </td>
                      <td className="py-3">
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${txStatusCls(t.status ?? '')}`}>
                          {t.status === 'POSTED' ? 'Completed' : t.status ?? 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-(--text-faint)">
              <CreditCard className="w-8 h-8 opacity-30" />
              <p className="font-sans text-sm">No transactions recorded yet</p>
            </div>
          )}
        </Card>

        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">High-Risk Accounts</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('outstanding')}>View all</Button>
          </div>
          {highRisk.length > 0 ? (
            <div className="space-y-3">
              {highRisk.slice(0, 5).map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 bg-(--hover-overlay) rounded-xl border border-(--border-subtle) hover:border-(--status-danger-border) transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-(--accent-gold-subtle) border border-(--accent-gold-border) shrink-0 flex items-center justify-center font-mono text-xs text-(--brand-gold) font-bold">
                    {(s.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs font-semibold text-(--text-primary) truncate">{s.name}</p>
                    <p className="font-mono text-[10px] text-(--status-danger)">
                      ETB {(s.outstanding ?? 0).toLocaleString()} outstanding
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full border ${
                    s.riskLevel === 'Critical'
                      ? 'bg-(--status-danger-bg) text-(--status-danger) border-rose-800/40'
                      : 'bg-(--status-warning-bg) text-(--status-warning) border-(--status-warning-border)'
                  }`}>
                    {s.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-(--text-faint)">
              <AlertTriangle className="w-6 h-6 opacity-30" />
              <p className="font-sans text-sm">No high-risk accounts</p>
            </div>
          )}
        </Card>
      </section>

      {/* Notifications summary */}
      <section>
        <Card hoverable={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">
              Recent Notifications
              {unreadNotifs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-(--brand-gold) text-[10px] font-bold text-black">
                  {unreadNotifs.length}
                </span>
              )}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('notifications')}>View all</Button>
          </div>
          {notifications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {notifications.slice(0, 6).map((n: any) => {
                const isRead = n.read || n.isRead;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      isRead ? 'border-(--border-subtle)' : 'border-(--accent-gold-border) bg-[#E9C349]/3'
                    }`}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      isRead ? 'bg-(--active-overlay)' :
                      n.type === 'ERROR' || n.type === 'payment_overdue' ? 'bg-rose-400' :
                      n.type === 'SUCCESS' || n.type === 'payment_received' ? 'bg-emerald-400' :
                      'bg-[#E9C349]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-sans text-xs font-semibold ${isRead ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>
                        {n.title}
                      </p>
                      <p className="font-sans text-xs text-(--text-faint) truncate mt-0.5">{n.message}</p>
                    </div>
                    {(n.timestamp || n.createdAt) && (
                      <p className="font-mono text-[10px] text-(--text-faint) shrink-0 hidden sm:block whitespace-nowrap">
                        {(n.timestamp || n.createdAt)?.toString().split('T')[0]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-(--text-faint)">
              <p className="font-sans text-sm">No notifications</p>
            </div>
          )}
        </Card>
      </section>
    </motion.div>
  );
};
