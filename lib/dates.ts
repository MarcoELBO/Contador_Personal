// Fechas como "YYYY-MM-DD". Se calculan en la zona horaria del usuario, no en la del servidor
// (Vercel corre en UTC y de noche "hoy" saldría un día adelantado).

export const TIMEZONE = process.env.APP_TIMEZONE ?? "America/Mexico_City";

export function todayISO(tz: string = TIMEZONE, now: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
}

export function weekday(iso: string): number {
  return toUTC(iso).getUTCDay(); // 0 = domingo
}

export function isValidDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const pad = (n: number) => String(n).padStart(2, "0");
