'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Download, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import {
  RevenueLineChart, GroupedBarChart, DonutChart,
  HorizontalBarChart, VerticalBarChart, fmtETB,
} from '../FOCharts';
import {
  monthlyRevenue, paymentMethodBreakdown,
  dailyCollections, outstandingTrend, departments,
  financeStudents, foKpis,
} from '../../../data/financeData';

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
  const [activeReport, setActiveReport] = useState<ReportTab>('revenue');

  // ── Derived chart data ──────────────────────────────────────────────────────
  const revenueLineData   = monthlyRevenue.map((m) => ({ label: m.month, value: m.revenue }));
  const targetLineData    = monthlyRevenue.map((m) => ({ label: m.month, value: m.target }));
  const collectionLine    = monthlyRevenue.map((m) => ({ label: m.month, value: m.collections }));
  const outstandingLine   = outstandingTrend.map((o) => ({ label: o.month, value: o.amount }));
  const deptBars          = departments.map((d) => ({
    label: d.code, value: d.totalRevenue,
    max: Math.max(...departments.map((x) => x.totalRevenue)),
    subLabel: `${d.studentCount} students`, color: '#E9C349',
  }));
  const outstandingBars   = departments.map((d) => ({
    label: d.code, value: d.outstandingBalance,
    max: Math.max(...departments.map((x) => x.outstandingBalance)),
    subLabel: `${((d.outstandingBalance / d.totalRevenue) * 100).toFixed(1)}% of revenue`, color: '#f87171',
  }));
  const donutSegments     = paymentMethodBreakdown.map((p) => ({ label: p.method, value: p.amount, color: p.color }));
  const totalAmount       = paymentMethodBreakdown.reduce((s, p) => s + p.amount, 0);
  const dailyData         = dailyCollections.map((d) => ({ label: d.day, value: d.amount }));
  const groupedBarData    = monthlyRevenue.map((m) => ({ label: m.month, primary: m.revenue, secondary: m.target }));
  const cashFlowBars      = monthlyRevenue.map((m) => ({ label: m.month, primary: m.collections, secondary: m.revenue }));

  const totalRevenue    = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const totalCollected  = monthlyRevenue.reduce((s, m) => s + m.collections, 0);
  const totalOutstanding = departments.reduce((s, d) => s + d.outstandingBalance, 0);
  const collectionRate  = ((totalCollected / totalRevenue) * 100).toFixed(1);

  // ── Summary KPI strip ───────────────────────────────────────────────────────
  const summaryKpis = [
    { label: 'YTD Revenue',     value: `ETB ${fmtETB(totalRevenue)}`,    trend: '+8.4%',  up: true  },
    { label: 'YTD Collections', value: `ETB ${fmtETB(totalCollected)}`,  trend: '+7.1%',  up: true  },
    { label: 'Collection Rate', value: `${collectionRate}%`,              trend: '+1.2pp', up: true  },
    { label: 'Total Outstanding', value: `ETB ${fmtETB(totalOutstanding)}`, trend: '-3.2%', up: false },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Financial Reports"
        subtitle="Analytics, trends, and performance summaries"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>Export Excel</Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export PDF</Button>
            <Button variant="ghost" size="sm" icon={<Printer className="w-4 h-4" />}>Print</Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryKpis.map((k) => (
          <div key={k.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{k.label}</p>
            <p className="font-mono text-xl font-bold text-white mt-1">{k.value}</p>
            <div className={`flex items-center gap-1 mt-1 ${k.up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="font-sans text-xs">{k.trend} YoY</span>
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
                ? 'bg-[#E9C349]/15 text-[#E9C349] border-[#E9C349]/40'
                : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
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
                <h3 className="font-serif text-lg font-bold text-white">Monthly Revenue vs Target</h3>
                <p className="font-sans text-xs text-white/40 mt-0.5">Academic Year 2024–2025</p>
              </div>
              <Badge variant="emerald">+8.4% YTD</Badge>
            </div>
            <GroupedBarChart data={groupedBarData} height={180} primaryLabel="Revenue" secondaryLabel="Target" />
          </Card>
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-white">Revenue Trend Line</h3>
            <RevenueLineChart data={revenueLineData} secondaryData={targetLineData} height={160} label="Revenue" secondaryLabel="Target" />
          </Card>
          {/* Monthly table */}
          <Card hoverable={false} className="overflow-x-auto">
            <h3 className="font-serif text-lg font-bold text-white mb-4">Monthly Breakdown</h3>
            <table className="w-full text-xs font-sans min-w-[500px]">
              <thead className="border-b border-white/10">
                <tr>
                  {['Month','Revenue','Target','Collections','Variance','Rate'].map((h) => (
                    <th key={h} className="pb-3 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {monthlyRevenue.map((m) => {
                  const variance = m.revenue - m.target;
                  const rate = ((m.collections / m.revenue) * 100).toFixed(1);
                  return (
                    <tr key={m.month} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-4 font-mono text-sm text-white font-bold">{m.month}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-[#E9C349]">ETB {fmtETB(m.revenue)}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-white/50">ETB {fmtETB(m.target)}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-emerald-400">ETB {fmtETB(m.collections)}</td>
                      <td className="py-3 pr-4">
                        <span className={`font-mono text-xs ${variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {variance >= 0 ? '+' : ''}ETB {fmtETB(Math.abs(variance))}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-sm text-white/60">{rate}%</td>
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
            <h3 className="font-serif text-lg font-bold text-white">Revenue by Department</h3>
            <HorizontalBarChart data={deptBars} />
          </Card>
          <Card hoverable={false} className="overflow-x-auto">
            <h3 className="font-serif text-lg font-bold text-white mb-4">Department Summary</h3>
            <table className="w-full text-xs font-sans min-w-[600px]">
              <thead className="border-b border-white/10">
                <tr>
                  {['Department','Students','Total Revenue','Outstanding','Collection Rate'].map((h) => (
                    <th key={h} className="pb-3 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {departments.map((d) => {
                  const rate = (((d.totalRevenue - d.outstandingBalance) / d.totalRevenue) * 100).toFixed(1);
                  return (
                    <tr key={d.id} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-sans text-sm text-white font-medium">{d.name}</p>
                        <p className="font-mono text-[10px] text-white/40">{d.code}</p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-sm text-white/70">{d.studentCount}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-[#E9C349]">ETB {fmtETB(d.totalRevenue)}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-rose-400">ETB {fmtETB(d.outstandingBalance)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-[#E9C349] rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="font-mono text-xs text-white/60">{rate}%</span>
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
              <h3 className="font-serif text-lg font-bold text-white">Transaction Volume by Method</h3>
              <DonutChart segments={donutSegments} total={totalAmount} centerLabel={`ETB ${fmtETB(totalAmount)}`} centerSub="Total collected" />
            </Card>
            <Card hoverable={false} className="overflow-x-auto">
              <h3 className="font-serif text-lg font-bold text-white mb-4">Method Breakdown</h3>
              <table className="w-full text-xs font-sans">
                <thead className="border-b border-white/10">
                  <tr>
                    {['Method','Transactions','Amount','Share'].map((h) => (
                      <th key={h} className="pb-3 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentMethodBreakdown.map((p) => (
                    <tr key={p.method} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-sans text-sm text-white">{p.method}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-sm text-white/70">{p.count}</td>
                      <td className="py-3 pr-3 font-mono text-sm text-[#E9C349]">ETB {fmtETB(p.amount)}</td>
                      <td className="py-3 font-mono text-sm text-white/50">{((p.amount / totalAmount) * 100).toFixed(1)}%</td>
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
              <h3 className="font-serif text-lg font-bold text-white">Outstanding Balance Trend</h3>
              <Badge variant="rose">ETB {fmtETB(totalOutstanding)} current</Badge>
            </div>
            <RevenueLineChart data={outstandingLine} color="#f87171" height={160} />
          </Card>
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-white">Outstanding by Department</h3>
            <HorizontalBarChart data={outstandingBars} />
          </Card>
          <Card hoverable={false} className="overflow-x-auto">
            <h3 className="font-serif text-lg font-bold text-white mb-4">Student Outstanding Summary</h3>
            <table className="w-full text-xs font-sans min-w-[600px]">
              <thead className="border-b border-white/10">
                <tr>
                  {['Student','Program','Total Charged','Paid','Outstanding','Risk'].map((h) => (
                    <th key={h} className="pb-3 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financeStudents.filter((s) => s.outstanding > 0).sort((a,b) => b.outstanding - a.outstanding).map((s) => (
                  <tr key={s.id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-sans text-sm text-white font-medium">{s.name}</p>
                      <p className="font-mono text-[10px] text-white/40">{s.studentId}</p>
                    </td>
                    <td className="py-3 pr-4 font-sans text-xs text-white/60 max-w-[130px]"><span className="truncate block">{s.programName}</span></td>
                    <td className="py-3 pr-4 font-mono text-sm text-white/70">ETB {fmtETB(s.totalCharged)}</td>
                    <td className="py-3 pr-4 font-mono text-sm text-emerald-400">ETB {fmtETB(s.totalPaid)}</td>
                    <td className="py-3 pr-4 font-mono text-sm font-bold text-rose-400">ETB {fmtETB(s.outstanding)}</td>
                    <td className="py-3">
                      <span className={`font-mono text-xs font-bold ${
                        s.riskLevel === 'Critical' ? 'text-rose-400' :
                        s.riskLevel === 'High'     ? 'text-orange-400' :
                        s.riskLevel === 'Medium'   ? 'text-amber-400' : 'text-emerald-400'
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
            <h3 className="font-serif text-lg font-bold text-white">Cash Flow — Collections vs Revenue</h3>
            <GroupedBarChart data={cashFlowBars} height={180} primaryLabel="Collections" secondaryLabel="Invoiced Revenue" />
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Invoiced',   value: `ETB ${fmtETB(totalRevenue)}`,   color: 'text-white' },
              { label: 'Cash Collected',   value: `ETB ${fmtETB(totalCollected)}`, color: 'text-emerald-400' },
              { label: 'Uncollected',      value: `ETB ${fmtETB(totalRevenue - totalCollected)}`, color: 'text-rose-400' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="font-mono text-[11px] text-white/40 uppercase tracking-wider">{s.label}</p>
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
            <h3 className="font-serif text-lg font-bold text-white">Daily Collection Pattern (This Week)</h3>
            <VerticalBarChart data={dailyData} height={140} />
          </Card>
          <Card hoverable={false} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-white">Collection Rate by Department</h3>
            <div className="space-y-4">
              {departments.map((d) => {
                const collected = d.totalRevenue - d.outstandingBalance;
                const rate = ((collected / d.totalRevenue) * 100);
                const col = rate >= 90 ? '#34d399' : rate >= 70 ? '#E9C349' : '#f87171';
                return (
                  <div key={d.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-sans text-white/70">{d.name}</span>
                      <span className="font-mono text-white/50">{rate.toFixed(1)}% · ETB {fmtETB(collected)} / {fmtETB(d.totalRevenue)}</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
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
