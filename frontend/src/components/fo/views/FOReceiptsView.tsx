'use client';

/**
 * Finance Officer → Receipts Management View
 * 
 * Provides official payment receipt auditing, searching, filtering,
 * printable PDF-style receipt generation, and CSV ledger exports.
 * Backed by live Prisma PostgreSQL `FinancialTransaction` records.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt, Search, X, Download, Printer, Share2, Eye, QrCode, CheckCircle2,
  AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Filter, FileSpreadsheet, Sparkles, Building2
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { SlidePanel } from '../../ui/SlidePanel';
import type { Receipt as ReceiptType } from '../../../types/finance';
import { shareContent, downloadPDF, exportToExcel } from '../../../lib/exportUtils';
import { fmtETB } from '../FOCharts';
import { getReceipts } from '../../../lib/foApi';

interface ReceiptItem {
  label: string;
  amount: number;
}

interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  studentProgramName: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  cashierId: string;
  cashierName: string;
  date: string;
  time: string;
  description: string;
  items: ReceiptItem[];
  qrCode: string;
  printed: boolean;
  shared: boolean;
}

// ── Print Helper Function ────────────────────────────────────────────────────
function printReceiptDocument(r: ReceiptRecord): void {
  const itemRows = r.items.map(item =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:11px">${item.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;font-size:11px">ETB ${item.amount.toLocaleString()}</td>
    </tr>`
  ).join('');

  const PRINT_ID = '__hc_receipt_print__';
  const STYLE_ID = '__hc_receipt_style__';
  document.getElementById(PRINT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = PRINT_ID;
  wrapper.innerHTML = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;color:#111;background:#fff;max-width:480px;margin:0 auto;padding:32px 24px;border:1px solid #eee;border-radius:12px">
      <div style="text-align:center;border-bottom:2px solid #E9C349;padding-bottom:16px;margin-bottom:16px">
        <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid #E9C349;margin:0 auto 8px">
          <img src="/logo2.jpg" alt="Harmony College" style="width:100%;height:100%;object-fit:cover" />
        </div>
        <div style="font-family:Georgia,serif;font-size:20px;font-weight:bold;letter-spacing:0.5px">HARMONY COLLEGE</div>
        <div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-top:2px;font-family:monospace">Finance &amp; Treasury Office</div>
        <div style="font-family:monospace;font-size:12px;color:#B38E19;font-weight:bold;margin-top:8px;letter-spacing:1px;background:#FFFBF0;padding:4px 12px;border-radius:6px;display:inline-block">OFFICIAL RECEIPT: ${r.receiptNumber}</div>
      </div>
      <table style="width:100%;font-size:11px;margin-bottom:16px" cellpadding="0" cellspacing="0">
        ${[
          ['Student Name', r.studentName],
          ['Student ID', r.studentId],
          ['Academic Unit', r.studentProgramName],
          ['Issued By', r.cashierName],
          ['Transaction Date', `${r.date} ${r.time}`],
          ['Payment Method', r.paymentMethod],
          ['Bank Ref / Tx ID', r.referenceNumber]
        ].map(([l,v]) => `<tr><td style="padding:4px 0;color:#666;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;width:120px">${l}</td><td style="padding:4px 0;font-weight:600;color:#111">${v}</td></tr>`).join('')}
      </table>
      <table style="width:100%;border-collapse:collapse;border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;margin-bottom:16px">${itemRows}</table>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:16px">
        <span style="font-size:13px;font-weight:bold;color:#374151">TOTAL AMOUNT PAID</span>
        <span style="font-family:monospace;font-size:22px;font-weight:bold;color:#111827">ETB ${r.amount.toLocaleString()}</span>
      </div>
      <div style="text-align:center;padding:12px;background:#FFFDF5;border:1px solid #FEF08A;border-radius:10px;margin-bottom:16px">
        <div style="font-family:monospace;font-size:10px;color:#854D0E;font-weight:bold">${r.qrCode}</div>
        <div style="font-size:9px;color:#A16207;margin-top:2px">Digital QR Security Verification Code</div>
      </div>
      <p style="font-size:9px;color:#9CA3AF;text-align:center;font-style:italic">
        This is an official computer-generated receipt issued by Harmony College Finance System.
      </p>
    </div>`;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#${PRINT_ID}) { display: none !important; visibility: hidden !important; }
      #${PRINT_ID} { display: block !important; visibility: visible !important; position: fixed !important; inset: 0 !important; z-index: 999999 !important; background: white !important; padding: 20px !important; }
      @page { margin: 10mm; size: A5 portrait; }
    }
    #${PRINT_ID} { display: none; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(wrapper);
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.getElementById(PRINT_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    }, 1500);
  }, 150);
}

export function FOReceiptsView() {
  const [receipts, setReceipts]       = useState<ReceiptRecord[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [shareMsg, setShareMsg]       = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchReceiptsData = useCallback(async (p: number, s: string, method: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getReceipts({
        page: p,
        limit: 15,
        search: s.trim() || undefined,
      });

      let fetchedList: ReceiptRecord[] = data.receipts || [];
      if (method !== 'All') {
        fetchedList = fetchedList.filter(r => r.paymentMethod.toLowerCase() === method.toLowerCase());
      }

      setReceipts(fetchedList);
      setTotal(data.total || fetchedList.length);
      setTotalPages(data.totalPages || 1);
      setTotalRevenue(data.totalAmount || fetchedList.reduce((sum, r) => sum + r.amount, 0));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load official receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchReceiptsData(page, search, methodFilter);
    }, 300);
  }, [page, search, methodFilter, fetchReceiptsData]);

  const handleExportCSV = () => {
    if (receipts.length === 0) return;
    const headers = ['Receipt Number', 'Student Name', 'Student ID', 'Amount (ETB)', 'Payment Method', 'Reference', 'Date', 'Time'];
    const rows = receipts.map(r => [
      `"${r.receiptNumber}"`,
      `"${r.studentName}"`,
      `"${r.studentId}"`,
      r.amount,
      `"${r.paymentMethod}"`,
      `"${r.referenceNumber}"`,
      `"${r.date}"`,
      `"${r.time}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Harmony_Receipts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const methodColor: Record<string, string> = {
    Cash: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Bank Transfer': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Telebirr: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Chapa: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl backdrop-blur-xl border border-(--border-default) bg-gradient-to-r from-(--hover-overlay) via-transparent to-(--accent-gold-subtle)">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-(--brand-gold)">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-(--text-primary)">
                Receipts Ledger
              </h1>
              <p className="text-xs font-sans text-(--text-muted) mt-0.5">
                Official payment receipt verification, PDF printing, and transaction audit trails
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchReceiptsData(page, search, methodFilter)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) active:scale-95 text-(--text-secondary) border-(--border-default)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-(--text-muted)">Total Receipts Issued</span>
            <Receipt className="w-4 h-4 text-(--brand-gold)" />
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-(--text-primary)">{total}</p>
          <p className="text-[11px] text-(--text-faint) mt-1">Verified financial vouchers</p>
        </div>

        <div className="p-5 rounded-2xl border bg-(--hover-overlay) border-(--border-subtle)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-(--text-muted)">Total Collections</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-emerald-400">
            ETB {totalRevenue.toLocaleString()}
          </p>
        </div>{/* end printable region */}

        {/* Share feedback */}
        {shareMsg && <p className="font-sans text-xs text-emerald-400 text-center">{shareMsg}</p>}

        {/* Actions */}
        <div className="flex gap-2 pt-2 no-print">
          <Button variant="secondary" size="sm" className="flex-1" icon={<Printer className="w-4 h-4" />}
            onClick={() => printTranscriptReceipt(receipt)}>Print</Button>
          <Button variant="secondary" size="sm" className="flex-1" icon={<Download className="w-4 h-4" />}
            onClick={() => printTranscriptReceipt(receipt)}>PDF</Button>
          <Button variant="outline" size="sm" className="flex-1" icon={<Share2 className="w-4 h-4" />}
            onClick={handleShare}>Share</Button>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOReceiptsView: React.FC<{ programType?: 'TVET' | 'SHORT_PROGRAM' }> = ({ programType }) => {
  const [receiptList, setReceiptList] = useState<ReceiptType[]>([]);
  const [stats, setStats]             = useState({ totalReceipts: 0, totalAmount: 0, printedCount: 0, digitalCount: 0 });
  const [search, setSearch]           = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [selected, setSelected]       = useState<ReceiptType | null>(null);
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    getReceipts({ search: search || undefined, limit: 100 })
      .then((data: any) => {
        if (data && Array.isArray(data.receipts)) {
          setReceiptList(data.receipts);
          if (data.stats) {
            setStats(data.stats);
          } else {
            const sum = data.totalAmount ?? data.receipts.reduce((s: number, r: any) => s + (r.amount || 0), 0);
            const printed = data.printedCount ?? data.receipts.filter((r: any) => r.printed).length;
            const digital = data.digitalCount ?? data.receipts.filter((r: any) => r.shared).length;
            setStats({
              totalReceipts: data.total ?? data.receipts.length,
              totalAmount: sum,
              printedCount: printed,
              digitalCount: digital,
            });
          }
        }
      })
      .catch(() => {});
  }, [search]);

  const filtered = useMemo(() => {
    let list = [...receiptList];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.receiptNumber.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q)
      );
    }
    if (methodFilter !== 'All') list = list.filter((r) => r.paymentMethod === methodFilter);
    return list;
  }, [search, methodFilter, receiptList]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const totalAmount = stats.totalAmount > 0 ? stats.totalAmount : filtered.reduce((s, r) => s + r.amount, 0);
  const totalCount  = stats.totalReceipts > 0 ? stats.totalReceipts : filtered.length;

  const handleExportAll = () => {
    exportToExcel(
      filtered.map((r) => ({
        'Receipt No.': r.receiptNumber,
        'Student Name': r.studentName,
        'Program': r.studentProgramName,
        'Amount (ETB)': r.amount,
        'Payment Method': r.paymentMethod,
        'Reference Number': r.referenceNumber,
        'Date': `${r.date} ${r.time}`,
        'Delivery Type': r.printed ? 'Printed' : 'Digital',
      })),
      'harmony-college-receipts'
    );
  };

  const methodColor: Record<string, string> = {
    Cash: 'text-amber-400', 'Bank Transfer': 'text-blue-400',
    Telebirr: 'text-green-400', Chapa: 'text-purple-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Receipts"
        subtitle={`${totalCount} receipt${totalCount !== 1 ? 's' : ''} issued · ETB ${fmtETB(totalAmount)} total`}
        icon={<Receipt className="w-5 h-5" />}
        actions={
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportAll}>
            Export All
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Receipts',   value: totalCount,                              color: 'text-white' },
          { label: 'Total Amount',     value: `ETB ${fmtETB(totalAmount)}`,            color: 'text-[#E9C349]' },
          { label: 'Printed',          value: stats.printedCount,                      color: 'text-emerald-400' },
          { label: 'Shared / Digital', value: stats.digitalCount,                      color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-(--brand-gold)">{methodFilter}</p>
          <p className="text-[11px] text-(--text-faint) mt-1">
            {methodFilter === 'All' ? 'Showing all payment channels' : `Filtered by ${methodFilter}`}
          </p>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-(--hover-overlay) border border-(--border-subtle)">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search receipt #, student name, ID, or bank reference..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs font-sans focus:outline-none focus:ring-1 focus:ring-(--brand-gold) bg-(--bg-base) border-(--border-default) text-(--text-primary)"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-primary)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Method filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['All', 'Cash', 'Bank Transfer', 'Telebirr', 'Chapa'].map((m) => {
            const isActive = methodFilter === m;
            return (
              <button
                key={m}
                onClick={() => { setMethodFilter(m); setPage(1); }}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border) shadow-sm'
                    : 'bg-transparent text-(--text-secondary) border-(--border-default) hover:bg-(--hover-overlay)'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse bg-(--hover-overlay) border border-(--border-subtle)" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl text-center border bg-(--hover-overlay) border-(--border-subtle)">
          <AlertCircle className="w-10 h-10 mx-auto text-(--status-danger) mb-2" />
          <p className="text-sm text-(--status-danger) font-medium">{error}</p>
          <button
            onClick={() => fetchReceiptsData(page, search, methodFilter)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border)"
          >
            Retry Loading
          </button>
        </div>
      ) : receipts.length === 0 ? (
        <div className="py-16 text-center border rounded-2xl bg-(--hover-overlay) border-(--border-subtle)">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-(--text-faint)" />
          <h3 className="font-serif text-lg font-bold text-(--text-primary)">No receipts found</h3>
          <p className="text-xs font-sans text-(--text-muted) mt-1 max-w-sm mx-auto">
            No official receipts matched your search or payment method criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--hover-overlay)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans min-w-[700px]">
              <thead className="bg-(--bg-base) border-b border-(--border-subtle)">
                <tr>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Receipt No.</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Student Profile</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Method</th>
                  <th className="p-4 text-left font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Date & Time</th>
                  <th className="p-4 text-center font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Status</th>
                  <th className="p-4 text-right font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-(--accent-gold-subtle)/30 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-(--brand-gold)">
                      {r.receiptNumber}
                    </td>
                    <td className="p-4">
                      <p className="font-sans text-xs font-semibold text-(--text-primary)">{r.studentName}</p>
                      <p className="font-mono text-[10px] text-(--text-faint) mt-0.5">{r.studentId} · {r.studentProgramName}</p>
                    </td>
                    <td className="p-4 font-mono text-sm font-bold text-(--text-primary)">
                      ETB {r.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border ${methodColor[r.paymentMethod] ?? 'text-(--text-muted) border-(--border-default)'}`}>
                        {r.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-(--text-muted)">
                      {r.date} <span className="text-(--text-faint)">{r.time}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Official
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          title="Preview Receipt"
                          className="p-2 rounded-xl border text-xs font-semibold transition-all hover:bg-(--accent-gold-subtle) text-(--text-secondary) border-(--border-default)"
                        >
                          <Eye className="w-3.5 h-3.5 text-(--brand-gold)" />
                        </button>
                        <button
                          onClick={() => printReceiptDocument(r)}
                          title="Print Official Voucher"
                          className="p-2 rounded-xl border text-xs font-semibold transition-all hover:bg-(--hover-overlay) text-(--text-secondary) border-(--border-default)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-(--border-subtle)">
          <p className="text-xs font-sans text-(--text-faint)">
            Showing {receipts.length} of {total} receipts · Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 bg-(--hover-overlay) border-(--border-default) text-(--text-secondary)"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Receipt Slide-out Preview Panel */}
      <AnimatePresence>
        {selectedReceipt && (
          <SlidePanel
            isOpen
            onClose={() => setSelectedReceipt(null)}
            title={<><Receipt className="w-5 h-5 inline mr-2 text-(--brand-gold)" /> Official Receipt Voucher</>}
            subtitle={`Verification Number: ${selectedReceipt.receiptNumber}`}
            width="max-w-md"
          >
            <div className="space-y-5">
              {/* Receipt Visual Header */}
              <div className="text-center space-y-1 pb-4 border-b border-(--border-subtle)">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-(--brand-gold) mx-auto mb-2 shadow-md">
                  <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
                </div>
                <p className="font-serif text-lg font-bold text-(--text-primary)">Harmony College</p>
                <p className="font-sans text-xs text-(--text-muted)">Finance & Treasury Office</p>
                <p className="font-mono text-xs text-(--brand-gold) mt-2 font-bold tracking-wider bg-(--accent-gold-subtle) py-1 px-3 rounded-lg inline-block">
                  {selectedReceipt.receiptNumber}
                </p>
              </div>

              {/* Transaction & Student Info */}
              <div className="space-y-2.5 text-xs font-sans">
                {[
                  ['Student Name', selectedReceipt.studentName],
                  ['Student ID', selectedReceipt.studentId],
                  ['Academic Program', selectedReceipt.studentProgramName],
                  ['Finance Cashier', selectedReceipt.cashierName],
                  ['Issue Date', `${selectedReceipt.date} ${selectedReceipt.time}`],
                  ['Payment Method', selectedReceipt.paymentMethod],
                  ['Reference Code', selectedReceipt.referenceNumber],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="font-mono text-(--text-faint) uppercase tracking-wider">{label}</span>
                    <span className="font-medium text-right text-(--text-primary) ml-4">{value}</span>
                  </div>
                ))}
              </div>

              {/* Line Items */}
              <div className="border-t border-b border-dashed border-(--border-subtle) py-3 space-y-2">
                {selectedReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs font-sans">
                    <span className="text-(--text-muted)">{item.label}</span>
                    <span className="font-mono font-bold text-(--text-primary)">ETB {item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Total Paid Banner */}
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-(--hover-overlay) border border-(--border-subtle)">
                <span className="font-serif text-sm font-bold text-(--text-primary)">TOTAL PAID</span>
                <span className="font-mono text-xl font-bold text-(--brand-gold)">
                  ETB {selectedReceipt.amount.toLocaleString()}
                </span>
              </div>

              {/* QR Verification Box */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border)">
                <div className="w-12 h-12 bg-(--bg-base) rounded-lg flex items-center justify-center shrink-0">
                  <QrCode className="w-7 h-7 text-(--brand-gold)" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-(--text-faint) uppercase tracking-wider">Security Verification</p>
                  <p className="font-mono text-xs text-(--brand-gold) font-bold">{selectedReceipt.qrCode}</p>
                </div>
              </div>

              {/* Share Feedback Toast */}
              {shareMsg && (
                <p className="font-sans text-xs text-emerald-400 text-center font-medium">{shareMsg}</p>
              )}

              {/* Actions Footer */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => printReceiptDocument(selectedReceipt)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-sans transition-all text-(--bg-base)"
                  style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))' }}
                >
                  <Printer className="w-4 h-4" /> Print PDF Voucher
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setShareMsg('✓ Link copied to clipboard');
                    setTimeout(() => setShareMsg(''), 2500);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold font-sans border transition-all hover:bg-(--hover-overlay) text-(--text-secondary) border-(--border-default)"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </SlidePanel>
        )}
      </AnimatePresence>
    </div>
  );
}

