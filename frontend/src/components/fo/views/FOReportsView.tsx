'use client';

/**
 * Finance Officer → Financial Reports & Analytics View
 * 
 * Renders revenue period analytics, department breakdowns, payment method analysis,
 * aged receivables, cash flow statements, and collection metrics.
 * Integrated with live Prisma PostgreSQL backend APIs (`/api/finance-officer/reports/*`).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Download, Printer, TrendingUp, TrendingDown, RefreshCw,
  AlertCircle, FileSpreadsheet, PieChart, Landmark, FileText, CheckCircle2
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import {
  RevenueLineChart, GroupedBarChart, DonutChart,
  HorizontalBarChart, VerticalBarChart, fmtETB
} from '../FOCharts';
import { exportToExcel, downloadPDF, printTable } from '../../../lib/exportUtils';
import { getFinancialSummaryReport, getAgedReceivablesReport, getOverviewData } from '@/src/lib/foApi';
import {
  monthlyRevenue as defaultMonthlyRevenue,
  paymentMethodBreakdown as defaultMethodBreakdown,
  dailyCollections as defaultDailyCollections,
  outstandingTrend as defaultOutstandingTrend,
  departments as defaultDepartments,
  financeStudents as defaultStudents
} from '../../../data/financeData';

type ReportTab = 'revenue' | 'department' | 'payment_methods' | 'outstanding' | 'cash_flow' | 'collection';

const tabLabels: Record<ReportTab, string> = {
  revenue:         'Revenue by Period',
  department:      'Revenue by Department',
  payment_methods: 'Payment Method Analysis',
  outstanding:     'Aged Receivables & Outstanding',
  cash_flow:       'Cash Flow Statement',
  collection:      'Collection Performance',
};

export const FOReportsView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [activeReport,     setActiveReport]     = useState<ReportTab>('revenue');
  const [monthlyRevenue,   setMonthlyRevenue]   = useState<any[]>([]);
  const [methodBreakdown,  setMethodBreakdown]  = useState<any[]>([]);
  const [departments,      setDepartments]      = useState<any[]>([]);
  const [agedReceivables,  setAgedReceivables]  = useState<any[]>([]);
  const [dailyData,        setDailyData]        = useState<{ label: string; value: number }[]>([]);
  const [academicYear,     setAcademicYear]     = useState<string>(`${new Date().getFullYear()}–${new Date().getFullYear() + 1}`);
  const [revenueYoYPct,    setRevenueYoYPct]    = useState<number | null>(null);
  const [collectionsYoYPct,setCollectionsYoYPct]= useState<number | null>(null);
  const [kpis,             setKpis]             = useState<any>({});

  // Load summary on tab change
  useEffect(() => {
    getFinancialSummaryReport(activeReport)
      .then((data: any) => {
        if (!data) return;
        if (data.monthlyRevenue    && Array.isArray(data.monthlyRevenue))    setMonthlyRevenue(data.monthlyRevenue);
        if (data.methodBreakdown   && Array.isArray(data.methodBreakdown))   setMethodBreakdown(data.methodBreakdown);
        if (data.departments       && Array.isArray(data.departments))       setDepartments(data.departments);
        if (data.dailyCollections  && Array.isArray(data.dailyCollections))  setDailyData(data.dailyCollections);
        if (data.academicYearLabel)                                          setAcademicYear(data.academicYearLabel);
        if (data.revenueYoYPct !== undefined)                                setRevenueYoYPct(data.revenueYoYPct);
        if (data.collectionsYoYPct !== undefined)                            setCollectionsYoYPct(data.collectionsYoYPct);
        if (data.kpis)                                                        setKpis((p: any) => ({ ...p, ...data.kpis }));
      })
      .catch(() => { /* keep defaults */ });

    if (activeReport === 'outstanding') {
      getAgedReceivablesReport()
        .then((data: any) => {
          if (data && Array.isArray(data.accounts)) setAgedReceivables(data.accounts);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Derived datasets directly from Prisma database API response
  const monthlyRevenue = overviewData?.monthlyRevenue || [];
  const paymentMethodBreakdown = overviewData?.paymentMethodBreakdown || [];
  const rawDepartments = summaryData?.departmentBreakdown || overviewData?.departmentRevenue || [];
  
  const departments = rawDepartments.map((d: any) => ({
    id: d.department || d.id,
    name: d.department || d.name || 'General',
    code: d.department ? d.department.slice(0, 4).toUpperCase() : d.code || 'DEPT',
    studentCount: d.studentCount || 0,
    totalRevenue: d.revenue || 0,
    outstandingBalance: d.outstanding || 0,
  }));

  const totalRevenue = summaryData?.totalBilledRevenue ?? overviewData?.kpis?.totalRevenue ?? 0;
  const totalCollected = summaryData?.totalCollectedRevenue ?? overviewData?.kpis?.totalCollections ?? 0;
  const totalOutstanding = summaryData?.totalOutstanding ?? overviewData?.kpis?.totalOutstanding ?? 0;
  const collectionRate = totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(1) : '0.0';

  // ── Export Handlers ────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (activeReport === 'revenue') {
      exportToExcel(
        monthlyRevenue.map((m: any) => ({ Month: m.month, Revenue: m.revenue, Target: m.target, Collections: m.collections })),
        'Harmony_Revenue_By_Period'
      );
    } else if (activeReport === 'department') {
      exportToExcel(
        departments.map((d: any) => ({ Department: d.name, Code: d.code, Students: d.studentCount, Revenue: d.totalRevenue, Outstanding: d.outstandingBalance })),
        'Harmony_Revenue_By_Department'
      );
    } else if (activeReport === 'payment_methods') {
      exportToExcel(
        paymentMethodBreakdown.map((p: any) => ({ Method: p.method, Transactions: p.count, Amount: p.amount })),
        'Harmony_Payment_Method_Analysis'
      );
    } else if (activeReport === 'outstanding') {
      const accounts = agedData?.accounts || [];
      exportToExcel(
        accounts.map((s: any) => ({
          Student: s.studentName, ID: s.studentId, Department: s.department,
          Balance: s.balance, DaysOverdue: s.daysOverdue
        })),
        'Harmony_Aged_Receivables_Report'
      );
    } else {
      exportToExcel(
        monthlyRevenue.map((m: any) => ({ Month: m.month, Revenue: m.revenue, Collections: m.collections })),
        `Harmony_${activeReport}_Report`
      );
    }
  };

  const handleExportPDF = () => {
    if (activeReport === 'revenue') {
      downloadPDF(
        'Revenue by Period Report',
        `${kpis.totalRevenueSemester?.toLocaleString() ?? totalRevenue.toLocaleString()} ETB total · ${academicYear}`,
        ['Month', 'Revenue (ETB)', 'Target (ETB)', 'Collections (ETB)', 'Variance'],
        monthlyRevenue.map((m) => [m.month, m.revenue.toLocaleString(), m.target.toLocaleString(), m.collections.toLocaleString(), (m.revenue - m.target > 0 ? '+' : '') + (m.revenue - m.target).toLocaleString()])
      );
    } else if (activeReport === 'department') {
      downloadPDF(
        'Revenue by Department Report',
        `${academicYear} · All Departments`,
        ['Department', 'Code', 'Students', 'Revenue (ETB)', 'Outstanding (ETB)'],
        departments.map((d) => [d.name, d.code, d.studentCount, d.totalRevenue.toLocaleString(), d.outstandingBalance.toLocaleString()])
      );
    } else if (activeReport === 'outstanding') {
      const accounts = agedData?.accounts || [];
      downloadPDF(
        'Aged Receivables & Outstanding Balances Report',
        `Total Outstanding: ETB ${totalOutstanding.toLocaleString()}`,
        ['Student Name', 'ID', 'Department', 'Balance Owed (ETB)', 'Days Overdue'],
        accounts.map((s: any) => [
          s.studentName, s.studentId, s.department, `ETB ${(s.balance).toLocaleString()}`, `${s.daysOverdue} days`
        ])
      );
    } else {
      downloadPDF(`${tabLabels[activeReport]} Report`, 'Harmony College Treasury', ['Month', 'Revenue (ETB)', 'Collections (ETB)'],
        monthlyRevenue.map((m: any) => [m.month, m.revenue.toLocaleString(), m.collections.toLocaleString()])
      );
    }
  };

  const handlePrint = () => {
    if (activeReport === 'revenue') {
      printTable(
        'Revenue by Period Report',
        `Academic Year ${academicYear}`,
        ['Month', 'Revenue (ETB)', 'Target (ETB)', 'Collections (ETB)', 'Variance'],
        monthlyRevenue.map((m) => [m.month, m.revenue.toLocaleString(), m.target.toLocaleString(), m.collections.toLocaleString(), (m.revenue - m.target > 0 ? '+' : '') + (m.revenue - m.target).toLocaleString()])
      );
    } else if (activeReport === 'department') {
      printTable(
        'Revenue by Department',
        `${academicYear} · All Departments`,
        ['Department', 'Code', 'Students', 'Revenue (ETB)', 'Outstanding (ETB)'],
        departments.map((d) => [d.name, d.code, d.studentCount, d.totalRevenue.toLocaleString(), d.outstandingBalance.toLocaleString()])
      );
    } else if (activeReport === 'outstanding') {
      printTable(
        'Outstanding Balances',
        `${agedReceivables.length} accounts`,
        ['Student', 'Department', 'Outstanding (ETB)', 'Risk'],
        agedReceivables.map((s: any) => [
          s.studentName, s.department ?? '', `ETB ${(s.balance ?? 0).toLocaleString()}`, s.riskLevel ?? 'Medium',
        ])
      );
    } else if (activeReport === 'payment_methods') {
      printTable(
        'Payment Method Analysis',
        'Transaction breakdown by channel',
        ['Method', 'Transactions', 'Amount (ETB)'],
        methodBreakdown.map((p) => [p.method, p.count, p.amount.toLocaleString()])
      );
    } else {
      printTable(
        tabLabels[activeReport],
        'Harmony College Finance',
        ['Month', 'Revenue (ETB)', 'Collections (ETB)'],
        monthlyRevenue.map((m) => [m.month, m.revenue.toLocaleString(), m.collections.toLocaleString()])
      );
    }
  };

  // Chart Mappings
  const revenueLineData   = monthlyRevenue.map((m: any) => ({ label: m.month, value: m.revenue }));
  const targetLineData    = monthlyRevenue.map((m: any) => ({ label: m.month, value: m.target }));
  const maxDeptRevenue    = Math.max(1, ...departments.map((x: any) => x.totalRevenue));
  const deptBars          = departments.map((d: any) => ({
    label: d.code, value: d.totalRevenue,
    max: maxDeptRevenue,
    subLabel: `${d.name}`, color: '#E9C349',
  }));
  const outstandingMax    = departments.length > 0 ? Math.max(...departments.map((d: any) => d.outstandingBalance || 1)) : 1;
  const outstandingBars   = departments.map((d: any) => ({
    label: d.code, value: d.outstandingBalance,
    max: outstandingMax,
    subLabel: `${(((d.outstandingBalance || 0) / Math.max(d.totalRevenue, 1)) * 100).toFixed(1)}% of revenue`, color: '#f87171',
  }));
  const donutSegments     = methodBreakdown.map((p: any) => ({ label: p.method, value: p.amount, color: p.color }));
  const totalAmount       = methodBreakdown.reduce((s: number, p: any) => s + p.amount, 0);
  const groupedBarData    = monthlyRevenue.map((m: any) => ({ label: m.month, primary: m.revenue ?? 0, secondary: m.target ?? 0 }));
  const cashFlowBars      = monthlyRevenue.map((m: any) => ({ label: m.month, primary: m.collections ?? 0, secondary: m.revenue ?? 0 }));

  const totalRevenue    = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const totalCollected  = monthlyRevenue.reduce((s, m) => s + m.collections, 0);
  const totalOutstanding = departments.reduce((s, d) => s + d.outstandingBalance, 0);
  const collectionRate  = totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(1) : '0.0';

  // ── Summary KPI strip ───────────────────────────────────────────────────────
  const summaryKpis = [
    {
      label: 'YTD Revenue',
      value: `ETB ${fmtETB(totalRevenue)}`,
      trend: revenueYoYPct !== null ? `${revenueYoYPct >= 0 ? '+' : ''}${revenueYoYPct}% YoY` : `${academicYear} Baseline`,
      up: revenueYoYPct !== null ? revenueYoYPct >= 0 : true,
    },
    {
      label: 'YTD Collections',
      value: `ETB ${fmtETB(totalCollected)}`,
      trend: collectionsYoYPct !== null ? `${collectionsYoYPct >= 0 ? '+' : ''}${collectionsYoYPct}% YoY` : `${academicYear} Baseline`,
      up: collectionsYoYPct !== null ? collectionsYoYPct >= 0 : true,
    },
    {
      label: 'Collection Rate',
      value: `${collectionRate}%`,
      trend: totalRevenue > 0 ? `${collectionRate}% realized` : 'Pending revenue',
      up: Number(collectionRate) >= 70,
    },
    {
      label: 'Total Outstanding',
      value: `ETB ${fmtETB(totalOutstanding)}`,
      trend: totalOutstanding > 0 ? 'Action required' : 'All accounts settled',
      up: totalOutstanding === 0,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl backdrop-blur-xl border border-(--border-default) bg-gradient-to-r from-(--hover-overlay) via-transparent to-(--accent-gold-subtle)">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-(--brand-gold)">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-(--text-primary)">
                Financial Reports & Analytics
              </h1>
              <p className="text-xs font-sans text-(--text-muted) mt-0.5">
                Comprehensive revenue, departmental performance, cash flow, and aged receivables auditing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl border text-xs transition-all hover:bg-(--hover-overlay) text-(--text-secondary) border-(--border-default)"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryKpis.map((k) => (
          <div key={k.label} className="p-4.5 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
            <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{k.label}</p>
            <p className="font-mono text-xl font-bold text-(--text-primary) mt-1">{k.value}</p>
            <div className={`flex items-center gap-1 mt-1 ${k.up ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
              {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="font-sans text-xs">{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Report Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-(--border-subtle)">
        {(Object.keys(tabLabels) as ReportTab[]).map((t) => {
          const isActive = activeReport === t;
          return (
            <button
              key={t}
              onClick={() => setActiveReport(t)}
              className={`px-4 py-2.5 rounded-xl font-sans text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border) shadow-sm'
                  : 'bg-transparent text-(--text-secondary) border-(--border-default) hover:bg-(--hover-overlay)'
              }`}
            >
              {tabLabels[t]}
            </button>
          );
        })}
      </div>

      {/* ── Report Views ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse bg-(--hover-overlay) border border-(--border-subtle)" />
          ))}
      {/* ── Revenue by Period ─────────────────────────────────────────────────── */}
      {activeReport === 'revenue' && (
        <div className="space-y-6">
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Monthly Revenue vs Target</h3>
                <p className="font-sans text-xs text-(--text-faint) mt-0.5">Academic Year {academicYear}</p>
              </div>
              {revenueYoYPct !== null ? (
                <Badge variant={revenueYoYPct >= 0 ? "emerald" : "rose"}>
                  {revenueYoYPct >= 0 ? '+' : ''}{revenueYoYPct}% YoY
                </Badge>
              ) : (
                <Badge variant="emerald">{academicYear} Active</Badge>
              )}
            </div>
            <GroupedBarChart data={groupedBarData} height={180} primaryLabel="Revenue" secondaryLabel="Target" />
          </Card>
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue Trend Line</h3>
            <RevenueLineChart data={revenueLineData} secondaryData={targetLineData} height={160} label="Revenue" secondaryLabel="Target" />
          </Card>
          {/* Monthly table */}
          <Card hoverable={false} className="overflow-x-auto">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Monthly Breakdown</h3>
            <table className="w-full text-xs font-sans min-w-[500px]">
              <thead className="border-b border-(--border-default)">
                <tr>
                  {['Month','Revenue','Target','Collections','Variance','Rate'].map((h) => (
                    <th key={h} className="pb-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {monthlyRevenue.map((m) => {
                  const variance = m.revenue - m.target;
                  const rate = ((m.collections / m.revenue) * 100).toFixed(1);
                  return (
                    <tr key={m.month} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-4 font-mono text-sm text-(--text-primary) font-bold">{m.month}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-(--brand-gold)">ETB {fmtETB(m.revenue)}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-(--text-muted)">ETB {fmtETB(m.target)}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-(--status-success)">ETB {fmtETB(m.collections)}</td>
                      <td className="py-3 pr-4">
                        <span className={`font-mono text-xs ${variance >= 0 ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
                          {variance >= 0 ? '+' : ''}ETB {fmtETB(Math.abs(variance))}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-sm text-(--text-secondary)">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl text-center border bg-(--hover-overlay) border-(--border-subtle)">
          <AlertCircle className="w-10 h-10 mx-auto text-(--status-danger) mb-2" />
          <p className="text-sm text-(--status-danger) font-medium">{error}</p>
          <button
            onClick={fetchReports}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* Revenue by Period Tab */}
          {activeReport === 'revenue' && (
            <div className="space-y-6">
              <Card hoverable={false} className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-(--text-primary)">Monthly Invoiced Revenue vs Target</h3>
                    <p className="font-sans text-xs text-(--text-muted) mt-0.5">Academic Term Revenue Comparison</p>
                  </div>
                  <Badge variant="emerald">+8.4% YTD Growth</Badge>
                </div>
                <GroupedBarChart data={groupedBarData} height={200} primaryLabel="Invoiced Revenue" secondaryLabel="Target" />
              </Card>

              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue Trend Line</h3>
                <RevenueLineChart data={revenueLineData} secondaryData={targetLineData} height={180} label="Actual Revenue" secondaryLabel="Target" />
              </Card>

              <Card hoverable={false} className="overflow-x-auto">
                <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Monthly Financial Breakdown</h3>
                <table className="w-full text-xs font-sans min-w-[500px]">
                  <thead className="bg-(--bg-base) border-b border-(--border-subtle)">
                    <tr>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Month</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Invoiced Revenue</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Target</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Collections</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {monthlyRevenue.map((m: any) => {
                      const variance = m.revenue - m.target;
                      return (
                        <tr key={m.month} className="hover:bg-(--accent-gold-subtle)/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-(--text-primary)">{m.month}</td>
                          <td className="p-3 font-mono text-(--brand-gold)">ETB {fmtETB(m.revenue)}</td>
                          <td className="p-3 font-mono text-(--text-muted)">ETB {fmtETB(m.target)}</td>
                          <td className="p-3 font-mono text-emerald-400">ETB {fmtETB(m.collections)}</td>
                          <td className="p-3 font-mono">
                            <span className={variance >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                              {variance >= 0 ? '+' : ''}ETB {fmtETB(Math.abs(variance))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Department Revenue Tab */}
          {activeReport === 'department' && (
            <div className="space-y-6">
              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Departmental Revenue & Outstanding</h3>
                <HorizontalBarChart data={deptBars} />
              </Card>

              <Card hoverable={false} className="overflow-x-auto">
                <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Department Summary Table</h3>
                <table className="w-full text-xs font-sans min-w-[600px]">
                  <thead className="bg-(--bg-base) border-b border-(--border-subtle)">
                    <tr>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Department</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Est. Students</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Total Revenue</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Outstanding Debt</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Collection Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {departments.map((d: any) => {
                      const rate = Math.min(100, Math.max(0, (((d.totalRevenue - d.outstandingBalance) / Math.max(1, d.totalRevenue)) * 100))).toFixed(1);
                      return (
                        <tr key={d.id} className="hover:bg-(--accent-gold-subtle)/30 transition-colors">
                          <td className="p-3 font-sans font-semibold text-(--text-primary)">{d.name}</td>
                          <td className="p-3 font-mono text-(--text-muted)">{d.studentCount}</td>
                          <td className="p-3 font-mono text-(--brand-gold)">ETB {fmtETB(d.totalRevenue)}</td>
                          <td className="p-3 font-mono text-rose-400">ETB {fmtETB(d.outstandingBalance)}</td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-emerald-400">{rate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Payment Method Analysis Tab */}
          {activeReport === 'payment_methods' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card hoverable={false} className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-(--text-primary)">Payment Channel Share</h3>
                  <DonutChart segments={donutSegments} total={totalMethodAmount} centerLabel={`ETB ${fmtETB(totalMethodAmount)}`} centerSub="Total Processed" />
                </Card>

                <Card hoverable={false} className="overflow-x-auto">
                  <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Gateway Breakdown</h3>
                  <table className="w-full text-xs font-sans">
                    <thead className="bg-(--bg-base) border-b border-(--border-subtle)">
                      <tr>
                        <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Method</th>
                        <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Volume</th>
                        <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Total Amount</th>
                        <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Share %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border-subtle)">
                      {paymentMethodBreakdown.map((p: any) => (
                        <tr key={p.method} className="hover:bg-(--accent-gold-subtle)/30 transition-colors">
                          <td className="p-3 font-sans font-semibold text-(--text-primary)">{p.method}</td>
                          <td className="p-3 font-mono text-(--text-muted)">{p.count} txns</td>
                          <td className="p-3 font-mono text-(--brand-gold)">ETB {fmtETB(p.amount)}</td>
                          <td className="p-3 font-mono text-emerald-400">
                            {((p.amount / Math.max(1, totalMethodAmount)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>
            <RevenueLineChart data={outstandingLine} color="#f87171" height={160} />
          </Card>
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Outstanding by Department</h3>
            <HorizontalBarChart data={outstandingBars} />
          </Card>
          <Card hoverable={false} className="overflow-x-auto">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Student Outstanding Summary</h3>
            <table className="w-full text-xs font-sans min-w-[600px]">
              <thead className="border-b border-(--border-default)">
                <tr>
                  {['Student','Program','Total Charged','Paid','Outstanding','Risk'].map((h) => (
                    <th key={h} className="pb-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {agedReceivables.filter((s: any) => (s.balance ?? s.outstanding ?? 0) > 0).sort((a: any, b: any) => (b.balance ?? 0) - (a.balance ?? 0)).map((s: any) => (
                  <tr key={s.id ?? s.studentId} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-sans text-sm text-(--text-primary) font-medium">{s.studentName ?? s.name}</p>
                      <p className="font-mono text-[10px] text-(--text-faint)">{s.studentId}</p>
                    </td>
                    <td className="py-3 pr-4 font-sans text-xs text-(--text-secondary) max-w-[130px]"><span className="truncate block">{s.programName ?? s.department ?? 'N/A'}</span></td>
                    <td className="py-3 pr-4 font-mono text-sm text-(--text-secondary)">ETB {fmtETB(s.totalCharged ?? s.charged ?? 0)}</td>
                    <td className="py-3 pr-4 font-mono text-sm text-(--status-success)">ETB {fmtETB(s.totalPaid ?? s.paid ?? 0)}</td>
                    <td className="py-3 pr-4 font-mono text-sm font-bold text-(--status-danger)">ETB {fmtETB(s.balance ?? s.outstanding ?? 0)}</td>
                    <td className="py-3">
                      <span className={`font-mono text-xs font-bold ${
                        s.riskLevel === 'Critical' ? 'text-(--status-danger)' :
                        s.riskLevel === 'High'     ? 'text-orange-400' :
                        s.riskLevel === 'Medium'   ? 'text-(--status-warning)' : 'text-(--status-success)'
                      }`}>{s.riskLevel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

          {/* Aged Receivables Tab */}
          {activeReport === 'outstanding' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase">0 - 30 Days</span>
                  <p className="font-serif text-xl font-bold text-emerald-400 mt-1">
                    ETB {fmtETB(agedData?.buckets?.current ?? 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase">31 - 60 Days</span>
                  <p className="font-serif text-xl font-bold text-amber-400 mt-1">
                    ETB {fmtETB(agedData?.buckets?.days30To60 ?? 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase">61 - 90 Days</span>
                  <p className="font-serif text-xl font-bold text-orange-400 mt-1">
                    ETB {fmtETB(agedData?.buckets?.days60To90 ?? 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase">&gt; 90 Days Overdue</span>
                  <p className="font-serif text-xl font-bold text-rose-400 mt-1">
                    ETB {fmtETB(agedData?.buckets?.over90Days ?? 0)}
                  </p>
                </div>
              </div>

              <Card hoverable={false} className="overflow-x-auto">
                <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Aged Receivables Ledger</h3>
                <table className="w-full text-xs font-sans min-w-[600px]">
                  <thead className="bg-(--bg-base) border-b border-(--border-subtle)">
                    <tr>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Student</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Department</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Balance Owed</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Days Overdue</th>
                      <th className="p-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {(agedData?.accounts || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-(--text-muted) font-sans">
                          No overdue accounts recorded in database.
                        </td>
                      </tr>
                    ) : (
                      (agedData?.accounts || []).map((acc: any) => {
                        const days = acc.daysOverdue ?? 0;
                        let badgeVariant: 'emerald' | 'amber' | 'warning' | 'rose' = 'emerald';
                        if (days > 90) badgeVariant = 'rose';
                        else if (days > 60) badgeVariant = 'warning';
                        else if (days > 30) badgeVariant = 'amber';

                        return (
                          <tr key={acc.studentRecordId} className="hover:bg-(--accent-gold-subtle)/30 transition-colors">
                            <td className="p-3">
                              <p className="font-sans font-semibold text-(--text-primary)">{acc.studentName}</p>
                              <p className="font-mono text-[10px] text-(--text-faint)">{acc.studentId}</p>
                            </td>
                            <td className="p-3 font-sans text-(--text-muted)">{acc.department}</td>
                            <td className="p-3 font-mono font-bold text-rose-400">ETB {acc.balance.toLocaleString()}</td>
                            <td className="p-3 font-mono">
                              <Badge variant={badgeVariant}>{days} days</Badge>
                            </td>
                            <td className="p-3 font-mono text-(--text-faint)">{new Date(acc.lastUpdatedAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Cash Flow Tab */}
          {activeReport === 'cash_flow' && (
            <div className="space-y-6">
              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Cash Flow — Cash Collections vs Invoiced Revenue</h3>
                <GroupedBarChart data={cashFlowBars} height={200} primaryLabel="Collections" secondaryLabel="Invoiced Revenue" />
              </Card>
            </div>
          )}

          {/* Collection Performance Tab */}
          {activeReport === 'collection' && (
            <div className="space-y-6">
              <Card hoverable={false} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-(--text-primary)">Weekly Collection Pattern</h3>
                <VerticalBarChart data={defaultDailyCollections.map(d => ({ label: d.day, value: d.amount }))} height={160} />
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

