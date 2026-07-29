// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Export / Print / Share Utilities
// No external libraries — uses native browser APIs only.
// ─────────────────────────────────────────────────────────────────────────────

// ── CSV / Excel export ────────────────────────────────────────────────────────
function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const keys = headers ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${keys.join(',')}\n${rows.map((r) => keys.map((k) => escape(r[k])).join(',')).join('\n')}`;
}

export function exportToExcel(rows: Record<string, unknown>[], filename = 'harmony-export', headers?: string[]): void {
  const bom  = '\uFEFF';
  const blob = new Blob([bom + toCSV(rows, headers)], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Core print helper — injects content into current page, calls window.print() ──
function doPrint(htmlContent: string, title: string): void {
  const PRINT_ID  = '__hc_print__';
  const STYLE_ID  = '__hc_print_style__';

  // Remove previous leftovers if any
  document.getElementById(PRINT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = PRINT_ID;
  wrapper.innerHTML = htmlContent;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#${PRINT_ID}) { display: none !important; visibility: hidden !important; }
      #${PRINT_ID} { display: block !important; visibility: visible !important; position: fixed !important; inset: 0 !important; z-index: 999999 !important; background: white !important; padding: 0 !important; margin: 0 !important; }
      @page { margin: 12mm 14mm; size: A4 portrait; }
    }
    #${PRINT_ID} { display: none; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(wrapper);

  // Small delay so DOM paints before dialog opens
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.getElementById(PRINT_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    }, 1500);
  }, 150);
}

// ── Report / table print ──────────────────────────────────────────────────────
export function printTable(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  footerNote?: string
): void {
  const esc = (v: string | number) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const issueDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  const tableRows = rows.map((r, i) =>
    `<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">${
      r.map(c => `<td style="padding:7px 10px;border:1px solid #ddd;color:#000;font-size:11px;font-family:Arial,sans-serif">${esc(c)}</td>`).join('')
    }</tr>`
  ).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;color:#000;background:#fff">

    <div style="background:#0F0F10;padding:18px 20px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <div style="width:32px;height:32px;border-radius:6px;overflow:hidden;border:1px solid #E9C349;flex-shrink:0"><img src="/logo2.jpg" alt="Harmony" style="width:100%;height:100%;object-fit:cover" /></div>
          <div>
            <div style="font-size:15px;font-weight:bold;color:#fff;letter-spacing:1px;font-family:Georgia,serif">HARMONY COLLEGE</div>
            <div style="font-size:8px;color:#E9C349;text-transform:uppercase;letter-spacing:2px;font-family:monospace">Finance &amp; Bursary Office</div>
          </div>
        </div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;font-family:monospace;margin-top:4px">${esc(title)}</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:9px;color:rgba(255,255,255,0.5)">
        Generated<br><span style="color:#fff;font-weight:bold;font-size:10px">${issueDate}</span>
      </div>
    </div>

    <div style="background:#f5f5f5;padding:9px 20px;border-bottom:1px solid #ddd;font-family:monospace;font-size:10px;color:#555">
      <strong style="color:#000">${esc(title)}</strong> &nbsp;|&nbsp; ${esc(subtitle)}
    </div>

    <div style="padding:10px 20px 6px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000;border-left:3px solid #E9C349;background:#fafafa;font-family:monospace">
      ${esc(title)}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr>${headers.map(h => `<th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">${esc(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    ${footerNote ? `<div style="margin-top:14px;padding:10px 20px;border-top:1px solid #ccc;font-family:monospace;font-size:9px;color:#777">${esc(footerNote)}</div>` : ''}

    <div style="padding:8px 20px;font-size:8px;color:#bbb;font-family:monospace;margin-top:6px">
      Harmony College &bull; Finance System &bull; ${new Date().toISOString()}
    </div>
  </div>`;

  doPrint(html, title);
}

// ── Download as HTML file (real browser download, no print dialog) ─────────────
function triggerDownload(htmlContent: string, filename: string): void {
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${filename}</title>
<style>
  @page { margin: 12mm 14mm; size: A4 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>${htmlContent}</body>
</html>`;
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTableAsFile(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  footerNote?: string
): void {
  const esc = (v: string | number) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const issueDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  const tableRows = rows.map((r, i) =>
    `<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">${
      r.map(c => `<td style="padding:8px 12px;border:1px solid #ddd;font-size:12px">${esc(c)}</td>`).join('')
    }</tr>`
  ).join('');

  const html = `
    <div style="background:#0F0F10;padding:20px 24px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;border:1px solid #E9C349;flex-shrink:0"><img src="/logo2.jpg" alt="Harmony" style="width:100%;height:100%;object-fit:cover" /></div>
        <div>
          <div style="font-size:16px;font-weight:bold;color:#fff;font-family:Georgia,serif;letter-spacing:1px">HARMONY COLLEGE</div>
          <div style="font-size:8px;color:#E9C349;text-transform:uppercase;letter-spacing:2px;font-family:monospace">Finance &amp; Bursary Office</div>
        </div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:9px;color:rgba(255,255,255,0.5)">
        Generated<br><span style="color:#fff;font-weight:bold;font-size:11px">${issueDate}</span>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:10px 24px;border-bottom:2px solid #E9C349;font-family:monospace;font-size:11px;color:#555">
      <strong style="color:#000">${esc(title)}</strong> &nbsp;|&nbsp; ${esc(subtitle)}
    </div>
    <div style="padding:16px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr>${headers.map(h => `<th style="padding:9px 12px;text-align:left;font-family:monospace;font-size:10px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">${esc(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    ${footerNote ? `<div style="padding:10px 24px;font-family:monospace;font-size:10px;color:#777;border-top:1px solid #e0e0e0">${esc(footerNote)}</div>` : ''}
    <div style="padding:10px 24px;font-size:9px;color:#bbb;font-family:monospace">
      Harmony College &bull; Finance System &bull; ${new Date().toISOString()}
    </div>`;

  triggerDownload(html, title.replace(/\s+/g, '-').toLowerCase());
}

export function downloadReceiptAsFile(r: {
  receiptNumber: string; studentName: string; studentProgramName: string;
  cashierName: string; date: string; time: string; paymentMethod: string;
  referenceNumber: string; amount: number; qrCode: string;
  items: { label: string; amount: number }[];
}): void {
  const itemRows = r.items.map(item =>
    `<tr>
      <td style="padding:8px 14px;border-bottom:1px solid #eee;font-size:12px">${item.label}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;font-size:12px">ETB ${item.amount.toLocaleString()}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="max-width:480px;margin:32px auto;font-family:Georgia,serif;color:#000">
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:16px">
        <div style="width:48px;height:48px;border-radius:10px;margin:0 auto 10px;overflow:hidden;border:2px solid #E9C349">
        <img src="/logo2.jpg" alt="Harmony College" style="width:100%;height:100%;object-fit:cover" />
      </div>
        <div style="font-size:20px;font-weight:bold;letter-spacing:1px">HARMONY COLLEGE</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-top:2px;font-family:monospace">Finance &amp; Bursary Office</div>
        <div style="font-family:monospace;font-size:12px;color:#E9C349;font-weight:bold;margin-top:8px;letter-spacing:1px">${r.receiptNumber}</div>
      </div>
      <table style="width:100%;font-size:12px;margin-bottom:16px" cellpadding="0" cellspacing="0">
        ${[['Student',r.studentName],['Program',r.studentProgramName],['Cashier',r.cashierName],['Date',`${r.date} ${r.time}`],['Method',r.paymentMethod],['Reference',r.referenceNumber]]
          .map(([l,v])=>`<tr><td style="padding:5px 0;color:#777;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;width:90px">${l}</td><td style="padding:5px 0">${v}</td></tr>`).join('')}
      </table>
      <table style="width:100%;border-collapse:collapse;border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;margin-bottom:14px">${itemRows}</table>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f5f5f5;border-radius:8px;margin-bottom:14px">
        <span style="font-size:14px;font-weight:bold">TOTAL PAID</span>
        <span style="font-family:monospace;font-size:22px;font-weight:bold">ETB ${r.amount.toLocaleString()}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:14px">
        <div style="width:40px;height:40px;background:#f0f0f0;border-radius:6px;text-align:center;line-height:40px;font-size:22px">▦</div>
        <div>
          <div style="font-family:monospace;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px">QR Verification</div>
          <div style="font-family:monospace;font-size:11px;color:#E9C349;font-weight:bold">${r.qrCode}</div>
        </div>
      </div>
      <p style="font-size:9px;color:#aaa;text-align:center;font-style:italic;font-family:Arial,sans-serif">
        Official payment receipt — Harmony College Finance Office. Keep for your records.
      </p>
    </div>`;

  triggerDownload(html, `receipt-${r.receiptNumber}`);
}
export function downloadPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  footerNote?: string
): void {
  const esc = (v: string | number) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const issueDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  const tableRows = rows.map((r, i) =>
    `<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">${
      r.map(c => `<td style="padding:7px 10px;border:1px solid #ddd;color:#000;font-size:11px;font-family:Arial,sans-serif">${esc(c)}</td>`).join('')
    }</tr>`
  ).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;color:#000;background:#fff">

    <!-- Save as PDF tip — only visible on screen, hidden when printing -->
    <div class="__no-print__" style="background:#E9C349;color:#0F0F10;padding:10px 20px;font-family:monospace;font-size:11px;font-weight:bold;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">⬇</span>
      To save as PDF: In the print dialog, change <strong>Destination</strong> to <strong>"Save as PDF"</strong>, then click Save.
    </div>

    <div style="background:#0F0F10;padding:18px 20px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <div style="width:32px;height:32px;border-radius:6px;overflow:hidden;border:2px solid #E9C349;flex-shrink:0">
            <img src="/logo2.jpg" alt="Harmony College" style="width:100%;height:100%;object-fit:cover" />
          </div>
          <div>
            <div style="font-size:15px;font-weight:bold;color:#fff;letter-spacing:1px;font-family:Georgia,serif">HARMONY COLLEGE</div>
            <div style="font-size:8px;color:#E9C349;text-transform:uppercase;letter-spacing:2px;font-family:monospace">Finance &amp; Bursary Office</div>
          </div>
        </div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;font-family:monospace;margin-top:4px">${esc(title)}</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:9px;color:rgba(255,255,255,0.5)">
        Generated<br><span style="color:#fff;font-weight:bold;font-size:10px">${issueDate}</span>
      </div>
    </div>

    <div style="background:#f5f5f5;padding:9px 20px;border-bottom:1px solid #ddd;font-family:monospace;font-size:10px;color:#555">
      <strong style="color:#000">${esc(title)}</strong> &nbsp;|&nbsp; ${esc(subtitle)}
    </div>

    <div style="padding:10px 20px 6px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000;border-left:3px solid #E9C349;background:#fafafa;font-family:monospace">
      ${esc(title)}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr>${headers.map(h => `<th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">${esc(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    ${footerNote ? `<div style="margin-top:14px;padding:10px 20px;border-top:1px solid #ccc;font-family:monospace;font-size:9px;color:#777">${esc(footerNote)}</div>` : ''}

    <div style="padding:8px 20px;font-size:8px;color:#bbb;font-family:monospace;margin-top:6px">
      Harmony College &bull; Finance System &bull; ${new Date().toISOString()}
    </div>
  </div>`;

  // Inject extra style to hide the tip banner when actually printing
  const PRINT_ID = '__hc_print__';
  const STYLE_ID = '__hc_print_style__';
  document.getElementById(PRINT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = PRINT_ID;
  wrapper.innerHTML = html;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#${PRINT_ID}) { display: none !important; visibility: hidden !important; }
      #${PRINT_ID} { display: block !important; visibility: visible !important; position: fixed !important; inset: 0 !important; z-index: 999999 !important; background: white !important; padding: 0 !important; margin: 0 !important; }
      .__no-print__ { display: none !important; }
      @page { margin: 12mm 14mm; size: A4 portrait; }
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
export interface TranscriptData {
  studentName: string;
  studentId: string;
  major: string;
  degree: string;
  cumulativeGpa: number;
  completedCredits: number;
  expectedGraduation: string;
  email: string;
  grades: { courseCode: string; courseTitle: string; term: string; credits: number; grade: string; numericGpa: number }[];
}

export function printTranscript(data: TranscriptData): void {
  const esc = (v: string | number) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const totalCredits = data.grades.reduce((s,g) => s + g.credits, 0);
  const weightedGpa  = data.grades.reduce((s,g) => s + g.numericGpa * g.credits, 0) / (totalCredits || 1);
  const issueDate    = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  const rows = data.grades.map((g,i) => `
    <tr style="background:${i%2===0?'#fff':'#f9f9f9'}">
      <td style="padding:7px 10px;border:1px solid #e0e0e0;font-family:monospace;font-weight:bold;font-size:11px">${esc(g.courseCode)}</td>
      <td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${esc(g.courseTitle)}</td>
      <td style="padding:7px 10px;border:1px solid #e0e0e0;font-family:monospace;color:#555;font-size:11px">${esc(g.term)}</td>
      <td style="padding:7px 10px;border:1px solid #e0e0e0;text-align:center;font-family:monospace;font-size:11px">${g.credits}</td>
      <td style="padding:7px 10px;border:1px solid #e0e0e0;text-align:center;font-family:monospace;font-weight:bold;font-size:11px">${esc(g.grade)}</td>
    </tr>`).join('');

  const html = `
  <div style="font-family:Georgia,serif;color:#000;background:#fff">

    <div style="background:#0F0F10;padding:18px 20px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="width:36px;height:36px;border-radius:6px;overflow:hidden;border:1px solid #E9C349;flex-shrink:0"><img src="/logo2.jpg" alt="Harmony" style="width:100%;height:100%;object-fit:cover" /></div>
          <div>
            <div style="font-size:16px;font-weight:bold;color:#fff;letter-spacing:1px">HARMONY COLLEGE</div>
            <div style="font-size:8px;color:#E9C349;text-transform:uppercase;letter-spacing:2px;font-family:monospace">Sheger, Burayu, Ethiopia</div>
          </div>
        </div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;font-family:monospace">OFFICIAL ACADEMIC TRANSCRIPT &bull; OFFICE OF THE REGISTRAR</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:9px;color:rgba(255,255,255,0.5)">
        Date Issued<br><span style="color:#fff;font-weight:bold;font-size:10px">${issueDate}</span>
        <br><span style="color:#E9C349;margin-top:4px;display:block">HC-2024-X8921</span>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr style="background:#f5f5f5"><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Student Name</td><td style="padding:7px 14px;font-weight:bold;border:1px solid #e0e0e0">${esc(data.studentName)}</td><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Cumulative GPA</td><td style="padding:7px 14px;font-family:monospace;font-weight:bold;border:1px solid #e0e0e0">${data.cumulativeGpa.toFixed(2)} / 4.00</td></tr>
      <tr><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Student ID</td><td style="padding:7px 14px;font-family:monospace;font-weight:bold;border:1px solid #e0e0e0">${esc(data.studentId)}</td><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Credits Earned</td><td style="padding:7px 14px;font-family:monospace;font-weight:bold;border:1px solid #e0e0e0">${data.completedCredits}</td></tr>
      <tr style="background:#f5f5f5"><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Program</td><td colspan="3" style="padding:7px 14px;font-weight:bold;border:1px solid #e0e0e0">${esc(data.degree)}</td></tr>
      <tr><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Exp. Graduation</td><td style="padding:7px 14px;font-family:monospace;font-weight:bold;border:1px solid #e0e0e0">${esc(data.expectedGraduation)}</td><td style="padding:6px 14px;font-family:monospace;font-size:9px;font-weight:bold;color:#777;text-transform:uppercase;border:1px solid #e0e0e0">Email</td><td style="padding:7px 14px;font-family:monospace;color:#555;border:1px solid #e0e0e0">${esc(data.email)}</td></tr>
    </table>

    <div style="padding:10px 14px 6px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000;border-left:3px solid #E9C349;background:#fafafa;font-family:monospace;margin-top:14px">
      Course History &amp; Academic Record
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">Code</th>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">Course Title</th>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">Term</th>
          <th style="padding:8px 10px;text-align:center;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">Cr.Hr.</th>
          <th style="padding:8px 10px;text-align:center;font-family:monospace;font-size:9px;color:#E9C349;text-transform:uppercase;letter-spacing:1px;border:1px solid #333;background:#1a1a1a">Grade</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f0f0f0">
          <td colspan="3" style="padding:8px 10px;font-family:monospace;font-weight:bold;font-size:10px;text-transform:uppercase;border:1px solid #ccc">Totals</td>
          <td style="padding:8px 10px;text-align:center;font-family:monospace;font-weight:bold;border:1px solid #ccc">${totalCredits}</td>
          <td style="padding:8px 10px;text-align:center;font-family:monospace;font-weight:bold;border:1px solid #ccc">${weightedGpa.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <table style="width:100%;margin-top:20px;border-top:1px solid #ccc;padding-top:12px" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top">
          <div style="font-family:monospace;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000">Cryptographic Seal</div>
          <div style="font-family:monospace;font-size:8px;color:#555;margin-top:2px">sha256: 8f44d90...b9a2c3d</div>
          <div style="font-family:monospace;font-size:8px;color:#555">Token: HC-2024-X8921</div>
        </td>
        <td style="text-align:right;vertical-align:bottom">
          <div style="border-top:1px solid #000;width:180px;display:inline-block;margin-bottom:3px"></div><br>
          <div style="font-size:10px;font-weight:bold;font-family:Georgia,serif">Registrar, Harmony College</div>
          <div style="font-family:monospace;font-size:8px;color:#888">Office of Academic Records</div>
        </td>
      </tr>
    </table>

  </div>`;

  doPrint(html, `Transcript — ${data.studentName}`);
}

// ── DOM element print (receipt modal etc.) ────────────────────────────────────
export function printElement(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) { window.print(); return; }
  doPrint(el.innerHTML, elementId);
}

// ── Share ─────────────────────────────────────────────────────────────────────
export interface ShareData { title: string; text?: string; url?: string; }

export async function shareContent(data: ShareData, onFallback?: (msg: string) => void): Promise<void> {
  const shareUrl = data.url ?? window.location.href;
  if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
    try { await navigator.share({ title: data.title, text: data.text ?? '', url: shareUrl }); return; }
    catch { return; }
  }
  try {
    await navigator.clipboard.writeText(shareUrl);
    onFallback?.('Link copied to clipboard!');
  } catch {
    window.prompt('Copy this link:', shareUrl);
  }
}
