'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, FileDown, TrendingUp, BookOpen, 
  Users, CheckCircle2, Award, Zap, HelpCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { LineChart, BarChart, DonutChart, HorizontalBarChart } from '../dh/DHCharts';

// Mock report datasets
const enrollmentTrend = [
  { label: '2022', value: 380 },
  { label: '2023', value: 420 },
  { label: '2024', value: 450 },
  { label: '2025', value: 490 },
  { label: '2026', value: 525 }
];

const deptPerform = [
  { label: 'Comp. Sci', value: 180, color: '#D4AF37' },
  { label: 'Mathemathics', value: 110, color: '#3B82F6' },
  { label: 'Mech. Eng', value: 140, color: '#22C55E' },
  { label: 'Business Admin', value: 95, color: '#F59E0B' }
];

const programPopularity = [
  { label: 'Computer Science', value: 180, color: '#D4AF37' },
  { label: 'Mechanical Eng.', value: 140, color: '#22C55E' },
  { label: 'Mathematics', value: 110, color: '#3B82F6' },
  { label: 'Business Admin', value: 95, color: '#F59E0B' }
];

const capUtilization = [
  { label: 'CS101 Intro to CS', value: 54, max: 60 },
  { label: 'CS201 Data Structures', value: 45, max: 45 },
  { label: 'MATH302 Calculus III', value: 32, max: 40 },
  { label: 'MECH201 Statics', value: 35, max: 35 },
  { label: 'CS440 Art. Intelligence', value: 12, max: 30 }
];

export const InteractiveReports: React.FC = () => {
  const [reportRange, setReportRange] = useState('Academic Year 2026-2027');

  const handleDownload = (format: string) => {
    alert(`Compiling analytical records...\nFormat: ${format}\nData parsed: 4 core reports, 525 enrolled student rosters.\nDownload initialized: institutional_report_${format.toLowerCase()}.${format.toLowerCase()}`);
  };

  const totalEnrollments = enrollmentTrend[enrollmentTrend.length - 1].value;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Interactive Analytics & Reports</h2>
          <p className="text-xs text-white/50">Visualize university KPIs, monitor capacity levels, and export registrar report sheets.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleDownload('PDF')}
            className="flex items-center gap-1.5 font-semibold text-xs py-2"
          >
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleDownload('Excel')}
            className="flex items-center gap-1.5 font-semibold text-xs py-2"
          >
            <FileDown className="w-3.5 h-3.5" /> Excel
          </Button>
          <Button 
            variant="gold" 
            size="sm" 
            onClick={() => handleDownload('CSV')}
            className="flex items-center gap-1.5 font-semibold text-xs py-2"
          >
            <FileDown className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Grad. Rate', val: '94.2%', sub: 'Class of 2025', icon: Award, color: 'text-emerald-400' },
          { label: 'Avg Enrollment Growth', val: '+9.2%', sub: 'Year-over-Year', icon: TrendingUp, color: 'text-[#D4AF37]' },
          { label: 'Section Utilization', val: '86.4%', sub: 'Allocated Seats', icon: Zap, color: 'text-blue-400' },
          { label: 'Faculty workload', val: '14.2h', sub: 'Weekly Avg Lectures', icon: Users, color: 'text-purple-400' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
              <kpi.icon className="w-12 h-12 text-white" />
            </div>
            <p className="font-mono text-[9px] uppercase text-white/40">{kpi.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.val}</p>
            <p className="text-[10px] text-white/40 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid: 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Enrollment Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-serif text-base font-bold text-white">Enrollment Trend (5-Year AY)</h3>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Uptrend
            </span>
          </div>
          <div className="pt-2">
            <LineChart data={enrollmentTrend} color="#D4AF37" height={160} />
          </div>
        </div>

        {/* Program Popularity (5 cols) */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-serif text-base font-bold text-white">Curriculum Distribution</h3>
          </div>
          <div className="flex items-center justify-center pt-2">
            <DonutChart segments={programPopularity} total={totalEnrollments} centerLabel={String(totalEnrollments)} />
          </div>
        </div>

        {/* Department Performance (6 cols) */}
        <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-serif text-base font-bold text-white">Department Headcounts</h3>
          </div>
          <div className="pt-2">
            <BarChart data={deptPerform} height={160} />
          </div>
        </div>

        {/* Capacity Utilization (6 cols) */}
        <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-serif text-base font-bold text-white">Seating Utilization Workloads</h3>
          </div>
          <div className="pt-2">
            <HorizontalBarChart data={capUtilization} />
          </div>
        </div>

      </div>
    </motion.div>
  );
};
