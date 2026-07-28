// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Export / Print / Share Utilities
// No external libraries — uses native browser APIs only.
// ─────────────────────────────────────────────────────────────────────────────

// ── CSV / Excel export ────────────────────────────────────────────────────────
/** Convert an array of objects to a CSV string */
function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const keys = headers ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const head = keys.join(',');
  const body = rows.map((r) => keys.map((k) => escape(r[k])).join(',')).join('\n');
  return `${head}\n${body}`;
}

/** Download a CSV file (opens as Excel on most systems) */
export function exportToExcel(
  rows: Record<string, unknown>[],
  filename = 'harmony-export',
  headers?: string[]
): void {
  const csv = toCSV(rows, headers);
  const bom  = '\uFEFF'; // UTF-8 BOM so Excel reads ETB / Amharic correctly
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF / Print ───────────────────────────────────────────────────────────────
/**
 * Print a specific DOM element by temporarily injecting its HTML
 * into a hidden iframe and calling print() on that iframe.
 * Falls back to `window.print()` if the element is not found.
 */
export function printElement(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) { window.print(); return; }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { window.print(); document.body.removeChild(iframe); return; }

  // Copy all stylesheets into the iframe
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => l.outerHTML)
    .join('\n');
  const styleBlocks = Array.from(document.querySelectorAll('style'))
    .map((s) => `<style>${s.innerHTML}</style>`)
    .join('\n');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Harmony College — Print</title>
${styleLinks}
${styleBlocks}
<style>
  @page { margin: 18mm 16mm; size: A4; }
  body { background: white !important; color: black !important; font-family: Georgia, serif; padding: 24px; }
  * { color: black !important; background: white !important; border-color: #ccc !important; box-shadow: none !important; }
  .no-print { display: none !important; }
</style>
</head>
<body>${el.innerHTML}</body>
</html>`);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // Remove iframe after print dialog closes
  setTimeout(() => document.body.removeChild(iframe), 1000);
}

/**
 * Generate a simple HTML string from tabular data and print it directly.
 * Used for reports where no DOM element exists yet.
 */
export function printTable(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  footerNote?: string
): void {
  const tableRows = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { margin: 18mm 16mm; size: A4; }
  body { font-family: Georgia, serif; color: #000; background: #fff; padding: 0; margin: 0; }
  .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; font-weight: bold; margin: 0 0 4px; }
  .header p  { font-size: 11px; color: #555; margin: 0; font-family: monospace; }
  .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f5f5f5 !important; font-weight: bold; border-bottom: 1.5px solid #000; padding: 8px 10px; text-align: left; font-family: monospace; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e0e0e0; }
  tbody tr:nth-child(even) td { background: #fafafa !important; }
  .footer { margin-top: 24px; font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; font-family: monospace; }
  .stamp { font-size: 10px; color: #888; margin-top: 6px; }
</style>
</head>
<body>
<div class="header">
  <h1>HARMONY COLLEGE</h1>
  <p>${title.toUpperCase()} &bull; FINANCE &amp; BURSARY OFFICE</p>
</div>
<p class="meta"><strong>${title}</strong> &nbsp;|&nbsp; ${subtitle} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
<table>
  <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
${footerNote ? `<div class="footer">${footerNote}</div>` : ''}
<p class="stamp">Digitally generated &bull; Harmony College Finance System &bull; ${new Date().toISOString()}</p>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { window.print(); document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => document.body.removeChild(iframe), 1000);
}

// ── Share ─────────────────────────────────────────────────────────────────────
export interface ShareData {
  title: string;
  text?: string;
  url?: string;
}

/**
 * Uses Web Share API if available (mobile/modern browsers).
 * Falls back to copying the URL to clipboard with a toast.
 */
export async function shareContent(
  data: ShareData,
  onFallback?: (message: string) => void
): Promise<void> {
  const shareUrl = data.url ?? window.location.href;

  if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ title: data.title, text: data.text ?? '', url: shareUrl });
      return;
    } catch { /* user cancelled */ return; }
  }

  // Desktop fallback — copy URL to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl);
    onFallback?.('Link copied to clipboard!');
  } catch {
    // Last resort — prompt
    window.prompt('Copy this link:', shareUrl);
  }
}

// ── Download HTML as PDF (print-to-PDF) ──────────────────────────────────────
/**
 * Opens a print dialog pre-configured for "Save as PDF".
 * Passes the same HTML as printTable but adds a notice to save as PDF.
 */
export function downloadPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  footerNote?: string
): void {
  printTable(title, subtitle, headers, rows,
    (footerNote ? footerNote + '\n' : '') +
    'To save as PDF: In the print dialog, select "Save as PDF" as the destination.');
}
