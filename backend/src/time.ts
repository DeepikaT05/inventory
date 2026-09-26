const OFFSET_MS = Number(process.env.TZ_OFFSET_MINUTES ?? 330) * 60_000;

/** Start of the shop-local day containing `d`, as a UTC instant. */
export function startOfDay(d: Date = new Date()): Date {
  const local = new Date(d.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Parse "YYYY-MM-DD" as a shop-local day and return its start. */
export function parseDay(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day) - OFFSET_MS);
}

/** Shop-local "YYYY-MM-DD" key for an instant. */
export function dayKey(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}
