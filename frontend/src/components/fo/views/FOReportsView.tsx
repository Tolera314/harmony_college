'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { BarChart3, Download, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import {
  RevenueLineChart, GroupedBarChart, DonutChart,
  HorizontalBarChart, VerticalBarChart, fmtETB,
} from '../FOCharts';
import { exportToExcel, downloadPDF, printTable } from '../../../lib/exportUtils';
import { getFinancialSummaryReport, getAgedReceivablesReport } from '../../../lib/foApi';

type ReportTab = 'revenue' | 'department' | 'payment_methods' | 'outstanding' | 'cash_flow' | 'collection';

const tabLabels: Record<ReportTab, string> = {
  revenue:         'Revenue by Period',
  department:      'Revenue by Department',
  payment_methods: 'Payment Method Analysis',
  outstanding:     'Outstanding Balances',
  cash_flow:       'Cash Flow',
  collection:      'Collection Summary',
};

export const FOReportsView: React.FC = () => {
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
  }, [activeReport]);

  // ── Export helpers ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (activeReport === 'revenue') {
      exportToExcel(
        monthlyRevenue.map((m) => ({ Month: m.month, Revenue: m.revenue, Target: m.target, Collections: m.collections })),
        'harmony-revenue-by-period'
      );
    } else if (activeReport === 'department') {
      exportToExcel(
        departments.map((d) => ({ Department: d.name, Code: d.code, Students: d.studentCount, Revenue: d.totalRevenue, Outstanding: d.outstandingBalance })),
        'harmony-revenue-by-department'
      );
    } else if (activeReport === 'payment_methods') {
      exportToExcel(
        methodBreakdown.map((p) => ({ Method: p.method, Transactions: p.count, Amount: p.amount })),
        'harmony-payment-methods'
      );
    } else if (activeReport === 'outstanding') {
      exportToExcel(
        agedReceivables.map((s: any) => ({
          Student: s.studentName, ID: s.studentId ?? '', Department: s.department ?? '',
          Outstanding: s.balance, 'Last Updated': s.lastUpdatedAt,
        })),
        'harmony-outstanding-balances'
      );
    } else {
      exportToExcel(
        monthlyRevenue.map((m) => ({ Month: m.month, Revenue: m.revenue, Collections: m.collections })),
        `harmony-${activeReport}-report`
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
      downloadPDF(
        'Outstanding Balances Report',
        `${agedReceivables.length} accounts with unpaid balances`,
        ['Student', 'ID', 'Department', 'Outstanding (ETB)', 'Last Updated'],
        agedReceivables.map((s: any) => [
          s.studentName, s.studentId ?? '', s.department ?? '',
          `ETB ${(s.balance ?? 0).toLocaleString()}`, s.lastUpdatedAt?.toString().split('T')[0] ?? '',
        ])
      );
    } else if (activeReport === 'payment_methods') {
      downloadPDF(
        'Payment Method Analysis',
        'Transaction breakdown by channel',
        ['Method', 'Transactions', 'Amount (ETB)', 'Share %'],
        methodBreakdown.map((p) => {
          const total = methodBreakdown.reduce((s, x) => s + x.amount, 0);
          return [p.method, p.count, p.amount.toLocaleString(), `${((p.amount / total) * 100).toFixed(1)}%`];
        })
      );
    } else {
      downloadPDF(`${tabLabels[activeReport]}`, 'Harmony College Finance', ['Month', 'Revenue', 'Collections'],
        monthlyRevenue.map((m) => [m.month, m.revenue.toLocaleString(), m.collections.toLocaleString()])
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

  // ── Derived chart data ──────────────────────────────────────────────────────
  const revenueLineData   = monthlyRevenue.map((m) => ({ label: m.month, value: m.revenue }));
  const targetLineData    = monthlyRevenue.map((m) => ({ label: m.month, value: m.target }));
  const collectionLine    = monthlyRevenue.map((m) => ({ label: m.month, value: m.collections }));
  const outstandingLine   = monthlyRevenue.map((m: any) => ({ label: m.month, value: m.target ?? 0 }));
  const deptMax           = departments.length > 0 ? Math.max(...departments.map((d: any) => d.totalRevenue || 1)) : 1;
  const deptBars          = departments.map((d: any) => ({
    label: d.code, value: d.totalRevenue,
    max: deptMax,
    subLabel: `${d.studentCount} students`, color: '#E9C349',
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Financial Reports"
        subtitle="Analytics, trends, and performance summaries"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportExcel}>Export Excel</Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportPDF}>Save as PDF</Button>
            <Button variant="ghost" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>Print</Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryKpis.map((k) => (
          <div key={k.label} className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-4">
            <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">{k.label}</p>
            <p className="font-mono text-xl font-bold text-(--text-primary) mt-1">{k.value}</p>
            <div className={`flex items-center gap-1 mt-1 ${k.up ? 'text-(--status-success)' : 'text-(--status-danger)'}`}>
              {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="font-sans text-xs">{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Report tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(tabLabels) as ReportTab[]).map((t) => (
          <button key={t} onClick={() => setActiveReport(t)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-semibold transition-all border ${
              activeReport === t
                ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
            }`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

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
      )}

      {/* ── Revenue by Department ─────────────────────────────────────────────── */}
      {activeReport === 'department' && (
        <div className="space-y-6">
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Revenue by Department</h3>
            <HorizontalBarChart data={deptBars} />
          </Card>
          <Card hoverable={false} className="overflow-x-auto">
            <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Department Summary</h3>
            <table className="w-full text-xs font-sans min-w-[600px]">
              <thead className="border-b border-(--border-default)">
                <tr>
                  {['Department','Students','Total Revenue','Outstanding','Collection Rate'].map((h) => (
                    <th key={h} className="pb-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {departments.map((d) => {
                  const rate = (((d.totalRevenue - d.outstandingBalance) / d.totalRevenue) * 100).toFixed(1);
                  return (
                    <tr key={d.id} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-sans text-sm text-(--text-primary) font-medium">{d.name}</p>
                        <p className="font-mono text-[10px] text-(--text-faint)">{d.code}</p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-sm text-(--text-secondary)">{d.studentCount}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-(--brand-gold)">ETB {fmtETB(d.totalRevenue)}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-(--status-danger)">ETB {fmtETB(d.outstandingBalance)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-(--hover-overlay) rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-[#E9C349] rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="font-mono text-xs text-(--text-secondary)">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Payment Method Analysis ───────────────────────────────────────────── */}
      {activeReport === 'payment_methods' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Transaction Volume by Method</h3>
              <DonutChart segments={donutSegments} total={totalAmount} centerLabel={`ETB ${fmtETB(totalAmount)}`} centerSub="Total collected" />
            </Card>
            <Card hoverable={false} className="overflow-x-auto">
              <h3 className="font-serif text-lg font-bold text-(--text-primary) mb-4">Method Breakdown</h3>
              <table className="w-full text-xs font-sans">
                <thead className="border-b border-(--border-default)">
                  <tr>
                    {['Method','Transactions','Amount','Share'].map((h) => (
                      <th key={h} className="pb-3 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {methodBreakdown.map((p) => (
                    <tr key={p.method} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-sans text-sm text-(--text-primary)">{p.method}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-sm text-(--text-secondary)">{p.count}</td>
                      <td className="py-3 pr-3 font-mono text-sm text-(--brand-gold)">ETB {fmtETB(p.amount)}</td>
                      <td className="py-3 font-mono text-sm text-(--text-muted)">{((p.amount / totalAmount) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* ── Outstanding Balances ──────────────────────────────────────────────── */}
      {activeReport === 'outstanding' && (
        <div className="space-y-6">
          <Card hoverable={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-(--text-primary)">Outstanding Balance Trend</h3>
              <Badge variant="rose">ETB {fmtETB(totalOutstanding)} current</Badge>
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

      {/* ── Cash Flow ─────────────────────────────────────────────────────────── */}
      {activeReport === 'cash_flow' && (
        <div className="space-y-6">
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Cash Flow — Collections vs Revenue</h3>
            <GroupedBarChart data={cashFlowBars} height={180} primaryLabel="Collections" secondaryLabel="Invoiced Revenue" />
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Invoiced',   value: `ETB ${fmtETB(totalRevenue)}`,   color: 'text-(--text-primary)' },
              { label: 'Cash Collected',   value: `ETB ${fmtETB(totalCollected)}`, color: 'text-(--status-success)' },
              { label: 'Uncollected',      value: `ETB ${fmtETB(totalRevenue - totalCollected)}`, color: 'text-(--status-danger)' },
            ].map((s) => (
              <div key={s.label} className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-5 text-center">
                <p className="font-mono text-[11px] text-(--text-faint) uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Collection Summary ────────────────────────────────────────────────── */}
      {activeReport === 'collection' && (
        <div className="space-y-6">
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Daily Collection Pattern (This Week)</h3>
            <VerticalBarChart data={dailyData} height={140} />
          </Card>
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-(--text-primary)">Collection Rate by Department</h3>
            <div className="space-y-4">
              {departments.map((d) => {
                const collected = d.totalRevenue - d.outstandingBalance;
                const rate = ((collected / d.totalRevenue) * 100);
                const col = rate >= 90 ? '#34d399' : rate >= 70 ? '#E9C349' : '#f87171';
                return (
                  <div key={d.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-sans text-(--text-secondary)">{d.name}</span>
                      <span className="font-mono text-(--text-muted)">{rate.toFixed(1)}% · ETB {fmtETB(collected)} / {fmtETB(d.totalRevenue)}</span>
                    </div>
                    <div className="h-2 bg-(--hover-overlay) rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: col }}
                        initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
};
