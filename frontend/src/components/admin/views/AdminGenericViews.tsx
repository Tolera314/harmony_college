'use client';
// Generic admin views for: Registrar, Attendance, Finance, HR, Documents, Reports
// Each follows the same design system — real content references shared data

import React from 'react';
import { motion } from 'motion/react';
import { FileText, CalendarCheck, DollarSign, Users2, FolderOpen, BarChart3 } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { LineChart, BarChart, DonutChart } from '../../dh/DHCharts';
import { adminStudents } from '../../../data/adminData';
import { employees, departments, leaveRequests, payrollRecords } from '../../../data/hrData';
import { payments } from '../../../data/adminData2';

// ── Registrar ──────────────────────────────────────────────────────────────
export const AdminRegistrarView: React.FC = () => {
  const enrolled = adminStudents.filter(s => s.status === 'Active').length;
  const graduated = adminStudents.filter(s => s.status === 'Graduated').length;
  const suspended = adminStudents.filter(s => s.status === 'Suspended').length;
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Registrar" subtitle="Enrollment, transcripts, and student records" icon={<FileText className="w-5 h-5" />} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Enrolled', enrolled, 'text-emerald-400'], ['Suspended', suspended, 'text-amber-400'], ['Graduated', graduated, 'text-[#E9C349]'], ['Outstanding Balance', adminStudents.filter(s => s.tuitionBalance > 0).length, 'text-rose-400']].map(([label, value, color]) => (
          <div key={String(label)} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="font-mono text-[10px] uppercase text-white/40">{label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Academic Records Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>{['Student', 'Program', 'Year', 'CGPA', 'Credits', 'Status'].map(h => <th key={h} className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-white/50">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {adminStudents.slice(0, 8).map(s => (
                <tr key={s.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#E9C349]">{s.programId.toUpperCase()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60 text-center">{s.year}</td>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-white">{s.cgpa.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">{s.creditsEarned}/{s.totalCredits}</td>
                  <td className="px-4 py-3"><Badge variant={s.status === 'Active' ? 'emerald' : 'amber'} className="text-[10px]">{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};

// ── Attendance ─────────────────────────────────────────────────────────────
export const AdminAttendanceView: React.FC = () => {
  const attendanceTrend = [
    { label: 'Wk1', value: 94 }, { label: 'Wk2', value: 93 }, { label: 'Wk3', value: 91 },
    { label: 'Wk4', value: 90 }, { label: 'Wk5', value: 88 }, { label: 'Wk6', value: 90 },
    { label: 'Wk7', value: 91 }, { label: 'Wk8', value: 90 },
  ];
  const avgAtt = Math.round(adminStudents.reduce((s, st) => s + st.attendanceRate, 0) / adminStudents.length);
  const below80 = adminStudents.filter(s => s.attendanceRate < 80);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Attendance" subtitle={`${below80.length} students below 80% threshold`} icon={<CalendarCheck className="w-5 h-5" />} />
      {below80.length > 0 && (
        <div className="p-4 bg-amber-950/25 border border-amber-800/35 rounded-2xl text-xs text-amber-300">
          <strong>{below80.length} students</strong> are below the 80% attendance requirement: {below80.map(s => s.name.split(' ')[0]).join(', ')}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Dept Avg', `${avgAtt}%`, 'text-[#E9C349]'], ['Above 90%', adminStudents.filter(s => s.attendanceRate >= 90).length, 'text-emerald-400'], ['80–89%', adminStudents.filter(s => s.attendanceRate >= 80 && s.attendanceRate < 90).length, 'text-[#E9C349]'], ['Below 80%', below80.length, 'text-rose-400']].map(([label, value, color]) => (
          <div key={String(label)} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="font-mono text-[10px] uppercase text-white/40">{label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Institution-wide Attendance Trend</h3>
        <LineChart data={attendanceTrend} color="#34d399" height={140} />
      </Card>
    </motion.div>
  );
};

// ── Finance ────────────────────────────────────────────────────────────────
export const AdminFinanceView: React.FC = () => {
  const totalRevenue   = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const outstanding    = adminStudents.reduce((s, st) => s + st.tuitionBalance, 0);
  const totalScholarship = adminStudents.reduce((s, st) => s + st.scholarshipAmount, 0);
  const revTrend = [
    { label: 'Apr', value: 4200000 }, { label: 'May', value: 4500000 },
    { label: 'Jun', value: 4800000 }, { label: 'Jul', value: totalRevenue },
  ].map(d => ({ label: d.label, value: Math.round(d.value / 1000) }));

  const paymentMethodSegs = [
    { label: 'Chapa',    value: payments.filter(p => p.method === 'Chapa').length,    color: '#E9C349' },
    { label: 'Telebirr', value: payments.filter(p => p.method === 'Telebirr').length, color: '#34d399' },
    { label: 'Bank',     value: payments.filter(p => p.method === 'Bank Transfer').length, color: '#60a5fa' },
    { label: 'Cash',     value: payments.filter(p => p.method === 'Cash').length,     color: '#fb923c' },
  ].filter(s => s.value > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Finance" subtitle="Revenue, payments, and financial overview" icon={<DollarSign className="w-5 h-5" />} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `ETB ${(totalRevenue / 1000).toFixed(0)}K`, color: 'text-[#E9C349]' },
          { label: 'Outstanding',   value: `ETB ${(outstanding / 1000).toFixed(0)}K`,  color: 'text-rose-400' },
          { label: 'Scholarships',  value: `ETB ${(totalScholarship / 1000).toFixed(0)}K`, color: 'text-sky-400' },
          { label: 'Transactions',  value: payments.length,                             color: 'text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="font-mono text-[10px] uppercase text-white/40">{item.label}</p>
            <p className={`font-mono text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Revenue Trend (ETB thousands)</h3>
          <BarChart data={revTrend.map(r => ({ label: r.label, value: r.value, color: '#E9C349' }))} height={140} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Payment Methods</h3>
          <DonutChart segments={paymentMethodSegs} total={payments.length} centerLabel={String(payments.length)} />
        </Card>
      </div>
    </motion.div>
  );
};

// ── HR (Admin View) ────────────────────────────────────────────────────────
export const AdminHRView: React.FC = () => {
  const active    = employees.filter(e => e.status === 'Active').length;
  const onLeave   = employees.filter(e => e.status === 'On Leave').length;
  const pending   = leaveRequests.filter(l => l.status === 'Pending').length;
  const payroll   = payrollRecords[0];
  const deptSegs  = departments.map(d => ({ label: d.name.split(' ')[0], value: d.employeeCount, color: '#E9C349' }));

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="HR Management" subtitle="System-wide HR overview" icon={<Users2 className="w-5 h-5" />} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Active Employees', active, 'text-emerald-400'], ['On Leave', onLeave, 'text-amber-400'], ['Pending Leave', pending, 'text-rose-400'], ['Payroll Stage', payroll.stage, 'text-[#E9C349]']].map(([label, value, color]) => (
          <div key={String(label)} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="font-mono text-[10px] uppercase text-white/40">{label}</p>
            <p className={`font-mono text-lg font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <Card hoverable={false} className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Staff Distribution by Department</h3>
        <BarChart data={deptSegs} height={140} />
      </Card>
    </motion.div>
  );
};

// ── Documents ──────────────────────────────────────────────────────────────
export const AdminDocumentsView: React.FC = () => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
    <DHPageHeader title="Documents" subtitle="System-wide document management" icon={<FolderOpen className="w-5 h-5" />} />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {['Student Documents', 'Employee Contracts', 'Financial Records', 'Academic Records'].map((cat, i) => (
        <Card key={cat} hoverable className="space-y-2">
          <FolderOpen className="w-8 h-8 text-[#E9C349]" />
          <p className="font-sans text-sm font-semibold text-white">{cat}</p>
          <p className="font-mono text-xs text-white/40">{[48, 24, 36, 18][i]} files</p>
        </Card>
      ))}
    </div>
  </motion.div>
);

// ── Reports ────────────────────────────────────────────────────────────────
export const AdminReportsView: React.FC = () => {
  const enrollTrend = [
    { label: 'Sep 23', value: 312 }, { label: 'Nov 23', value: 318 },
    { label: 'Feb 24', value: 298 }, { label: 'Apr 24', value: 305 },
    { label: 'Jul 24', value: 315 },
  ];
  const standingSegs = [
    { label: 'Excellent', value: adminStudents.filter(s => s.standing === 'Excellent').length, color: '#34d399' },
    { label: 'Good',      value: adminStudents.filter(s => s.standing === 'Good').length,      color: '#E9C349' },
    { label: 'Warning',   value: adminStudents.filter(s => s.standing === 'Warning').length,   color: '#fb923c' },
    { label: 'Probation', value: adminStudents.filter(s => s.standing === 'Probation').length, color: '#f87171' },
  ].filter(s => s.value > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="Reports" subtitle="Institution-wide analytics" icon={<BarChart3 className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm">Export PDF</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Enrollment Trend</h3>
          <LineChart data={enrollTrend} height={140} />
        </Card>
        <Card hoverable={false} className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Academic Standing</h3>
          <DonutChart segments={standingSegs} total={adminStudents.length} centerLabel={String(adminStudents.length)} />
        </Card>
      </div>
    </motion.div>
  );
};
