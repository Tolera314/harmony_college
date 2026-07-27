'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Filter, ShieldAlert, Clock, 
  User, Database, RefreshCw, Terminal, Globe
} from 'lucide-react';
import { EmptyState } from '../ui/States';
import { Badge } from '../ui/Badge';

// Mock system audit logs
const initialAuditLogs = [
  { id: 'l01', user: 'Robel Bekele', role: 'Registrar', action: 'Approved Admission File', record: 'Selam Alemayehu (HC-2026-0812)', ip: '196.188.100.44', device: 'HP Laptop · Firefox', time: 'Jul 23, 2026 10:15 AM', status: 'Success' },
  { id: 'l02', user: 'System Auto', role: 'System', action: 'Waitlist Promotion Auto-Fill', record: 'CS440 Section Seat', ip: 'localhost', device: 'Docker Daemon', time: 'Jul 23, 2026 09:00 AM', status: 'Success' },
  { id: 'l03', user: 'Dr. Bekele Ayalew', role: 'Department Head', action: 'Modified Course Capacity', record: 'JOUR401 (30 to 45 seats)', ip: '196.188.210.45', device: 'MacBook Pro · Chrome 126', time: 'Jul 23, 2026 07:30 AM', status: 'Success' },
  { id: 'l04', user: 'Robel Bekele', role: 'Registrar', action: 'Force Add Override', record: 'MATH302 to Selam Alemayehu', ip: '196.188.100.44', device: 'HP Laptop · Firefox', time: 'Jul 22, 2026 02:22 PM', status: 'Success' },
  { id: 'l05', user: 'System Backup', role: 'System', action: 'Scheduled Incremental Backup', record: 'Backup ID #1842-INC', ip: '10.0.4.15', device: 'AWS Backup Agent', time: 'Jul 22, 2026 12:00 AM', status: 'Success' },
  { id: 'l06', user: 'Robel Bekele', role: 'Registrar', action: 'Failed Login Attempt', record: 'Registrar Account (u06)', ip: '196.188.99.12', device: 'Unknown Android Phone', time: 'Jul 21, 2026 04:15 PM', status: 'Failed' }
];

export const AuditLogsTimeline: React.FC = () => {
  const [logs, setLogs] = useState(initialAuditLogs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.user.toLowerCase().includes(search.toLowerCase()) || 
                          l.action.toLowerCase().includes(search.toLowerCase()) ||
                          l.record.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-(--text-primary) tracking-wide">System Audit Logs</h2>
        <p className="text-xs text-(--text-muted)">Trace administrative transactions, security audits, and course override justifications.</p>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-(--hover-overlay) border border-(--border-default) p-4 rounded-2xl backdrop-blur-md">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Actor, Action description, or Affected Record..."
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl focus:outline-none focus:border-(--brand-gold) text-xs text-(--text-primary)"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl focus:outline-none focus:border-(--brand-gold) text-xs text-(--text-secondary)"
          >
            <option value="All">All Operations</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed Alerts</option>
          </select>
        </div>
      </div>

      {/* Table Audit Logs */}
      <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-(--hover-overlay) border-b border-(--border-default) text-(--text-muted) font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4">Timestamp</th>
              <th className="px-5 py-4">Authorized User</th>
              <th className="px-5 py-4">Operation Action</th>
              <th className="px-5 py-4">Affected Record</th>
              <th className="px-5 py-4">IP Address / Device</th>
              <th className="px-5 py-4 text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle) text-(--text-secondary)">
            {filteredLogs.map(l => (
              <tr key={l.id} className="hover:bg-(--hover-overlay) transition-colors">
                <td className="px-5 py-4 font-mono text-[10px] text-(--text-muted)">{l.time}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-(--text-faint)" />
                    <div>
                      <p className="font-semibold text-(--text-primary)">{l.user}</p>
                      <p className="text-[9px] text-(--text-faint) font-mono">{l.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-medium text-(--text-primary)">{l.action}</td>
                <td className="px-5 py-4">
                  <span className="font-mono text-[10px] bg-(--hover-overlay) border border-(--border-subtle) px-1.5 py-0.5 rounded text-(--brand-gold)/90">{l.record}</span>
                </td>
                <td className="px-5 py-4 font-mono text-[10px] text-(--text-muted)">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3" style={{ color: "var(--text-faint)" }} />
                    <span>{l.ip} <span className="text-(--text-faint)">({l.device})</span></span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <Badge variant={l.status === 'Success' ? 'emerald' : 'rose'}>
                    {l.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-0"><EmptyState variant="default" compact /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-(--hover-overlay) border border-(--border-default) rounded-2xl flex gap-3 text-xs leading-relaxed text-(--text-secondary)">
        <ShieldAlert className="w-4 h-4 shrink-0 text-(--brand-gold)" />
        <div>
          <strong>Compliance Compliance Warning:</strong> Audit Logs represent write-once ledger transactions. Deletion, alteration, or tampering with audit timeline entries is strictly blocked by cryptography signatures.
        </div>
      </div>
    </motion.div>
  );
};
