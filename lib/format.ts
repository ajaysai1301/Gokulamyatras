/**
 * Pure, client-safe formatting helpers (no server dependencies).
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Deterministic formatting (locale-independent) to avoid SSR/client hydration mismatches.
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function durationLabel(days: number, nights: number): string {
  const d = `${days} ${days === 1 ? 'Day' : 'Days'}`;
  const n = `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
  return `${d} \u00B7 ${n}`;
}
