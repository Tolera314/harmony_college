'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt, Search, X, Download, Printer, Share2, Eye, QrCode, CheckCircle2,
} from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';
import { receipts as defaultReceipts } from '../../../data/financeData';
import type { Receipt as ReceiptType } from '../../../types/finance';
import { shareContent, downloadPDF } from '../../../lib/exportUtils';
import { getReceipts } from '../../../lib/foApi';

// ── Receipt print helper ──────────────────────────────────────────────────────
function printTranscriptReceipt(r: ReceiptType): void {
  const itemRows = r.items.map(item =>
    `<tr>
      <td style="padding:7px 14px;border-bottom:1px solid #eee;font-size:11px">${item.label}</td>
      <td style="padding:7px 14px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;font-size:11px">ETB ${item.amount.toLocaleString()}</td>
    </tr>`
  ).join('');

  const PRINT_ID = '__hc_print__';
  const STYLE_ID = '__hc_print_style__';
  document.getElementById(PRINT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = PRINT_ID;
  wrapper.innerHTML = `
    <div style="font-family:Georgia,serif;color:#000;background:#fff;max-width:480px;margin:0 auto;padding:32px 24px">
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:16px">
        <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #E9C349;margin:0 auto 8px">
          <img src="/logo2.jpg" alt="Harmony" style="width:100%;height:100%;object-fit:cover" />
        </div>
        <div style="font-size:18px;font-weight:bold;letter-spacing:1px">HARMONY COLLEGE</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-top:2px;font-family:monospace">Finance &amp; Bursary Office</div>
        <div style="font-family:monospace;font-size:11px;color:#E9C349;font-weight:bold;margin-top:6px;letter-spacing:1px">${r.receiptNumber}</div>
      </div>
      <table style="width:100%;font-size:11px;margin-bottom:16px" cellpadding="0" cellspacing="0">
        ${[['Student',r.studentName],['Program',r.studentProgramName],['Cashier',r.cashierName],['Date',`${r.date} ${r.time}`],['Method',r.paymentMethod],['Reference',r.referenceNumber]]
          .map(([l,v])=>`<tr><td style="padding:4px 0;color:#777;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;width:90px">${l}</td><td style="padding:4px 0">${v}</td></tr>`).join('')}
      </table>
      <table style="width:100%;border-collapse:collapse;border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;margin-bottom:14px">${itemRows}</table>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f5f5f5;border-radius:8px;margin-bottom:14px">
        <span style="font-size:14px;font-weight:bold">TOTAL PAID</span>
        <span style="font-family:monospace;font-size:22px;font-weight:bold">ETB ${r.amount.toLocaleString()}</span>
      </div>
      <p style="font-size:9px;color:#aaa;text-align:center;font-style:italic;font-family:Arial,sans-serif">
        Official payment receipt — Harmony College Finance Office.
      </p>
    </div>`;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#${PRINT_ID}) { display: none !important; visibility: hidden !important; }
      #${PRINT_ID} { display: block !important; visibility: visible !important; position: fixed !important; inset: 0 !important; z-index: 999999 !important; background: white !important; }
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

// ── Receipt Preview Modal ─────────────────────────────────────────────────────
function ReceiptPreviewModal({ receipt, onClose }: { receipt: ReceiptType; onClose: () => void }) {
  const [shareMsg, setShareMsg] = React.useState('');

  const handleShare = () => {
    shareContent(
      { title: `Receipt ${receipt.receiptNumber} — Harmony College`, text: `Payment ETB ${receipt.amount.toLocaleString()} by ${receipt.studentName}`, url: window.location.href },
      (msg) => { setShareMsg(msg); setTimeout(() => setShareMsg(''), 2500); }
    );
  };

  const methodColor: Record<string, string> = {
    Cash: 'text-amber-400', 'Bank Transfer': 'text-blue-400',
    Telebirr: 'text-green-400', Chapa: 'text-purple-400',
  };

  return (
    <SlidePanel isOpen onClose={onClose} title={<><Receipt className="w-5 h-5 inline mr-2 text-(--brand-gold)" />Receipt Preview</>} subtitle="Finance — Receipts" width="max-w-md">
      <div className="space-y-5">
        {/* Printable region */}
        <div id={`receipt-print-${receipt.id}`}>
          {/* Receipt header */}
          <div className="text-center space-y-1 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E9C349]/50 mx-auto mb-2">
              <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
            </div>
            <p className="font-serif text-lg font-bold text-white">Harmony College</p>
            <p className="font-sans text-xs text-white/50">Finance & Bursary Office</p>
            <p className="font-mono text-[11px] text-[#E9C349] mt-2 font-bold tracking-wider">{receipt.receiptNumber}</p>
          </div>

          {/* Student info */}
          <div className="space-y-2 mt-4">
            {[
              ['Student',   receipt.studentName],
              ['Program',   receipt.studentProgramName],
              ['Cashier',   receipt.cashierName],
              ['Date',      `${receipt.date}  ${receipt.time}`],
              ['Method',    receipt.paymentMethod],
              ['Reference', receipt.referenceNumber],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="font-mono text-white/40 uppercase tracking-wider">{label}</span>
                <span className={`font-sans text-right ml-4 ${label === 'Method' ? (methodColor[value as string] ?? 'text-white/70') : 'text-white/70'}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Line items */}
          <div className="border-t border-b border-dashed border-white/10 py-3 space-y-2 mt-4">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="font-sans text-white/70">{item.label}</span>
                <span className="font-mono text-white">ETB {item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mt-3">
            <span className="font-serif text-base font-bold text-white">TOTAL PAID</span>
            <span className="font-mono text-2xl font-bold text-[#E9C349]">ETB {receipt.amount.toLocaleString()}</span>
          </div>

          {/* QR */}
          <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10 mt-3">
            <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <QrCode className="w-8 h-8 text-white/30" />
            </div>
            <div>
              <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">QR Verification</p>
              <p className="font-mono text-xs text-[#E9C349] font-bold">{receipt.qrCode}</p>
            </div>
          </div>

          <p className="font-sans text-[10px] text-center text-white/30 italic mt-3">
            Official payment receipt issued by Harmony College Finance Office.
          </p>
        </div>{/* end printable region */}

        {/* Share feedback */}
        {shareMsg && <p className="font-sans text-xs text-emerald-400 text-center">{shareMsg}</p>}

        {/* Actions */}
        <div className="flex gap-2 pt-2 no-print">
          <Button variant="secondary" size="sm" className="flex-1" icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}>Print</Button>
          <Button variant="secondary" size="sm" className="flex-1" icon={<Download className="w-4 h-4" />}
            onClick={() => {}}>PDF</Button>
          <Button variant="outline" size="sm" className="flex-1" icon={<Share2 className="w-4 h-4" />}
            onClick={() => navigator.clipboard?.writeText(window.location.href)}>Share</Button>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export const FOReceiptsView: React.FC = () => {
  const [receiptList, setReceiptList] = useState<ReceiptType[]>(defaultReceipts);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [selected, setSelected] = useState<ReceiptType | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    getReceipts({ search })
      .then((data) => {
        if (data && Array.isArray(data.receipts)) {
          setReceiptList(data.receipts);
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
  const totalAmount = receiptList.reduce((s, r) => s + r.amount, 0);

  const methodColor: Record<string, string> = {
    Cash: 'text-amber-400', 'Bank Transfer': 'text-blue-400',
    Telebirr: 'text-green-400', Chapa: 'text-purple-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Receipts"
        subtitle={`${receiptList.length} receipts issued · ETB ${(totalAmount / 1_000_000).toFixed(2)}M total`}
        icon={<Receipt className="w-5 h-5" />}
        actions={<Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>Export All</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Receipts',   value: receiptList.length,                              color: 'text-white' },
          { label: 'Total Amount',     value: `ETB ${(totalAmount/1_000_000).toFixed(2)}M`, color: 'text-[#E9C349]' },
          { label: 'Printed',          value: receiptList.filter((r) => r.printed).length,      color: 'text-emerald-400' },
          { label: 'Shared / Digital', value: receiptList.filter((r) => r.shared).length,       color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card hoverable={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search receipt number, student, reference…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 font-sans text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E9C349]/50 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {['All', 'Cash', 'Bank Transfer', 'Telebirr', 'Chapa'].map((m) => (
              <button key={m} onClick={() => { setMethodFilter(m); setPage(1); }}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${methodFilter === m ? 'bg-[#E9C349]/20 text-[#E9C349] border-[#E9C349]/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-xs sm:text-sm font-sans min-w-[700px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Receipt No.', 'Student', 'Amount', 'Method', 'Date', 'Printed', 'Actions'].map((h) => (
                <th key={h} className="p-4 text-left font-mono text-[10px] text-white/40 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-4 font-mono text-xs text-[#E9C349]">{r.receiptNumber}</td>
                <td className="p-4">
                  <p className="font-sans text-sm text-white font-medium truncate max-w-[140px]">{r.studentName}</p>
                  <p className="font-mono text-[10px] text-white/40 truncate max-w-[140px]">{r.studentProgramName}</p>
                </td>
                <td className="p-4 font-mono text-sm font-bold text-white">ETB {r.amount.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`font-sans text-xs font-medium ${methodColor[r.paymentMethod] ?? 'text-white/60'}`}>{r.paymentMethod}</span>
                </td>
                <td className="p-4 font-mono text-xs text-white/50">{r.date}<br /><span className="text-white/30">{r.time}</span></td>
                <td className="p-4">
                  {r.printed
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <span className="w-4 h-4 rounded-full border border-white/20 inline-block" />}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setSelected(r)} title="Preview"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-[#E9C349]/15 text-white/40 hover:text-[#E9C349] transition-colors touch-target">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button title="Print" onClick={() => printTranscriptReceipt(r)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors touch-target">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button title="Save as PDF" onClick={() => printTranscriptReceipt(r)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors touch-target">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center">
                <Receipt className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="font-sans text-sm text-white/30">No receipts found.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-white/40">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1}>Prev</Button>
            {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i+1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${p === page ? 'bg-[#E9C349]/20 text-[#E9C349] border border-[#E9C349]/40' : 'text-white/40 hover:bg-white/5'}`}>
                {p}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && <ReceiptPreviewModal receipt={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
