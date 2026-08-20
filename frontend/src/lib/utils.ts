/**
 * Harmony College Utility Functions
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Ethiopian Time (ETC) utilities
//
// Ethiopian 12-hour clock starts at dawn (6:00 AM standard) = 12:00 ETC.
// Conversion:  ethiopianHour = ((standardHour + 18) % 12) || 12
// Period:      "ቀን" (day) for 06:00–17:59 standard, "ሌሊት" (night) for 18:00–05:59
//
// The DB and all backend logic stay in 24-hour standard time.
// These helpers are display-only, applied in the frontend render layer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a 24-hour "HH:MM" string to Ethiopian time string.
 *
 * Examples:
 *   "06:00" → "12:00 ቀን"
 *   "07:30" → "1:30 ቀን"
 *   "13:00" → "7:00 ቀን"
 *   "18:00" → "12:00 ሌሊት"
 *   "23:00" → "5:00 ሌሊት"
 *   "00:00" → "6:00 ሌሊት"
 */
export function toEthiopianTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const stdHour = parseInt(hStr, 10);
  const minutes = mStr ?? '00';

  // Shift by 6: Ethiopian hour = ((stdHour + 18) % 12) || 12
  const ethHour = ((stdHour + 18) % 12) || 12;

  // Day period: 06:00–17:59 standard = ቀን (day); 18:00–05:59 = ሌሊት (night)
  const period = stdHour >= 6 && stdHour < 18 ? 'ቀን' : 'ሌሊት';

  return `${ethHour}:${minutes} ${period}`;
}

/**
 * Format a time range (both strings "HH:MM") in Ethiopian time.
 * E.g. "08:00" to "10:00"  →  "2:00–4:00 ቀን"
 * If start and end are in different periods, each label shows its own period.
 */
export function toEthiopianTimeRange(startHHMM: string, endHHMM: string): string {
  const [sh] = startHHMM.split(':').map(Number);
  const [eh] = endHHMM.split(':').map(Number);
  const startPeriod = sh >= 6 && sh < 18 ? 'ቀን' : 'ሌሊት';
  const endPeriod   = eh >= 6 && eh < 18 ? 'ቀን' : 'ሌሊት';

  const startEth = ((sh + 18) % 12) || 12;
  const endEth   = ((eh + 18) % 12) || 12;
  const startMin = startHHMM.split(':')[1] ?? '00';
  const endMin   = endHHMM.split(':')[1]   ?? '00';

  if (startPeriod === endPeriod) {
    return `${startEth}:${startMin}–${endEth}:${endMin} ${startPeriod}`;
  }
  return `${startEth}:${startMin} ${startPeriod}–${endEth}:${endMin} ${endPeriod}`;
}

/**
 * Convert a standard JS Date object to an Ethiopian time string.
 * Uses the local wall-clock hours of the date (EAT = UTC+3).
 */
export function dateToEthiopianTime(date: Date): string {
  const stdHour = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ethHour = ((stdHour + 18) % 12) || 12;
  const period  = stdHour >= 6 && stdHour < 18 ? 'ቀን' : 'ሌሊት';
  return `${ethHour}:${minutes} ${period}`;
}
