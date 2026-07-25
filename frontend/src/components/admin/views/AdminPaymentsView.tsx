'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Search, Download } from 'lucide-react';
import { Payment } from '../../../types/admin';
import { payments } from '../../../data/adminData2';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

const statusBadge = (s: Payment['status']) => {
  const m: Record<Payment['status'], 'emerald'|'amber'|'rose'|'glass'> = {
    Completed: 'emerald', Pending: 'amber', Failed: 'rose', Refunded: 'glass', Partial: 'amber',
  };
  return <Badge variant={m[s]}>{s}</Badge>;
};

export const AdminPaymentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.studentName.toLowerCase().includes(q) || p.transactionId.toLowerCase().includes(q);
    const matchM = methodFilter === 'All' || p.method === methodFilter;
    return matchQ && matchM;
  });
  const totalCollected = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Payments"
        subtitle={`ETB ${totalCollected.toLocaleString()} collected · ${payments.filter(p => p.status === 'Pending' || p.status === 'Failed').length} pending/failed`}
        icon={<CreditCard className="w-5 h-5" />}
        actions={<Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by student or transaction ID..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white/70 focus:outline-none focus:border-[#E9C349]">
          {['All', 'Chapa', 'Telebirr', 'Bank Transfer', 'Cash', 'Commercial Bank'].map(m => <option key={m} className="bg-[#1a1a1b]" value={m}>{m}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans min-w-[800px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>{['Transaction', 'Student', 'Amount', 'Method', 'Category', 'Date', 'Status'].map(h => (
              <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-white/50">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-4 py-3.5 font-mono text-xs text-[#E9C349]">{p.transactionId}</td>
                <td className="px-4 py-3.5 font-semibold text-white">{p.studentName}</td>
                <td className="px-4 py-3.5 font-mono text-sm font-bold text-white">ETB {p.amount.toLocaleString()}</td>
                <td className="px-4 py-3.5"><Badge variant="glass" className="text-[10px]">{p.method}</Badge></td>
                <td className="px-4 py-3.5 text-white/60">{p.category}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-white/50">{p.date}</td>
                <td className="px-4 py-3.5">{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
