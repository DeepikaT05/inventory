/** Grams → "486 kg", "1.5 kg", "750 g". */
export function wt(g: number): string {
  if (g >= 1000) return (g / 1000).toFixed(3).replace(/\.?0+$/, '') + ' kg';
  return g + ' g';
}

/** Paise → "1,180" or "1,180.50" (no ₹ sign). */
export function rs(paise: number): string {
  const n = paise / 100;
  return Number.isInteger(n)
    ? n.toLocaleString('en-IN')
    : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Amount for a weight at a per-kg rate, rounded to the rupee's paise. */
export const lineAmount = (ratePaise: number, grams: number) => Math.round((ratePaise * grams) / 1000);

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const longDate = (d: Date) => `${shortDate(d)} ${d.getFullYear()}`;
export const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
export const weekday = (d: Date) => WEEKDAYS[d.getDay()];

/** "Today · 11 Sep", "Yesterday · 10 Sep", "Tue · 8 Sep". */
export function dayLabel(d: Date): string {
  const diff = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000);
  const prefix = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : weekday(d);
  return `${prefix} · ${shortDate(d)}`;
}

/** "today", "yesterday" or "9 Sep". */
export function relDay(d: Date): string {
  const diff = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000);
  return diff === 0 ? 'today' : diff === 1 ? 'yesterday' : shortDate(d);
}

/** "12.5" rupees text → paise; null when empty/invalid. */
export function toPaise(text: string): number | null {
  const n = Number(text.replace(/,/g, '').trim());
  return text.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** "2.5" kg text → grams; null when empty/invalid. */
export function toGrams(text: string): number | null {
  const n = Number(text.trim());
  return text.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) : null;
}
