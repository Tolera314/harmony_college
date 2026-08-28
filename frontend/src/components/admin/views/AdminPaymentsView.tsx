'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { CreditCard, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SkeletonTable, EmptyState, ErrorState } from '../../ui/States';
import { adminTransactionsApi, AdminTransaction } from '../../../lib/adminApi';

// ── helpers ──────────────────────────────────────────────────────────────────

const TX_STATUS_BADGE: Record<string, 'emerald' | 'amber' | 'rose' | 'glass'> = {
  POSTED:   'emerald',
  PENDING:  'amber',
  REVERSED: 'rose',
};
const TX_TYPE_BADGE: Record<string, 'gold' | 'emerald' | 'amber' | 'rose' | 'glass' | 'info'> = {
  TUITION:     'gold',
  FEE:         'glass',
  SCHOLARSHIP: 'emerald',
  GRANT:       'emerald',
  PAYMENT:     'emerald',
  REFUND:      'amber',
  PENALTY:     'rose',
};

const TRANSACTION_TYPES = ['TUITION', 'FEE', 'SCHOLARSHIP', 'GRANT', 'PAYMENT', 'REFUND', 'PENALTY'] as const;
const TRANSACTION_STATUSES = ['POSTED', 'PENDING', 'REVERSED'] as const;

// ── component ─────────────────────────────────────────────────────────────────

export const AdminPaymentsView: React.FC = () => {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // ── filters
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchTransactions = useCallback(async (p: number, s: string, t: string, st: string) => {
    setLoading(true); setError('');
    try {
      const res = await adminTransactionsApi.list({ page: p, limit: 15, search: s, type: t, status: st });
      setTransactions(res.transactions); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchTransactions(page, search, typeFilter, statusFilter), 280);
  }, [page, search, typeFilter, statusFilter, fetchTransactions]);

  const totalAmount = transactions
    .filter(t => t.status === 'POSTED')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Payments & Transactions"
        subtitle={`${total} transactions · ETB ${Math.abs(totalAmount).toLocaleString()} this page`}
        icon={<CreditCard className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by description, receipt ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Types</option>
          {TRANSACTION_TYPES.map(t => <option key={t} className="bg-(--bg-card-solid)" value={t}>{t}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-xs text-(--text-secondary) focus:outline-none focus:border-(--brand-gold)"
        >
          <option className="bg-(--bg-card-solid)" value="">All Statuses</option>
          {TRANSACTION_STATUSES.map(s => <option key={s} className="bg-(--bg-card-solid)" value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={10} cols={6} /> : error ? (
        <ErrorState compact description={error}
          onRetry={() => fetchTransactions(page, search, typeFilter, statusFilter)} />
      ) : transactions.length === 0 ? (
        <EmptyState variant="payments" compact />
      ) : (
        <div className="overflow-x-auto border border-(--border-default) rounded-2xl bg-(--hover-overlay) backdrop-blur-xl">
          <table className="w-full text-left text-xs font-sans min-w-[800px]">
            <thead className="bg-(--hover-overlay) border-b border-(--border-default)">
              <tr>{['Student', 'Type', 'Amount', 'Description', 'Receipt', 'Date', 'Status'].map(h => (
                <th key={h} className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-(--text-muted) font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {transactions.map(t => (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-(--hover-overlay) transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-(--text-primary) text-xs">
                      {t.financialAccount.studentRecord.user.fullName}
                    </p>
                    <p className="font-mono text-[10px] text-(--text-faint)">
                      {t.financialAccount.studentRecord.program?.name ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={(TX_TYPE_BADGE[t.type] ?? 'glass') as any} className="text-[10px]">{t.type}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-mono text-sm font-bold ${t.amount < 0 ? 'text-(--status-danger)' : 'text-(--status-success)'}`}>
                      {t.amount < 0 ? '-' : '+'}ETB {Math.abs(t.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-(--text-secondary) max-w-[200px] truncate">{t.description}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--brand-gold)">{t.receiptId ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-(--text-muted)">
                    {new Date(t.transactionDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={TX_STATUS_BADGE[t.status] ?? 'glass'}>{t.status}</Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} transactions · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
