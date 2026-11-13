// Detecta pagos recurrentes (suscripciones, renta...) a partir de tus propios gastos:
// mismo comercio en al menos 2 meses distintos con montos parecidos.

import { addDays, diffDays, pad } from "./dates";
import type { Tx } from "./store";

export type RecurringPayment = {
  name: string;
  amount: number;
  day: number; // día del mes en que suele cobrar
  category: string;
  nextInDays: number;
};

const key = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Días hasta la próxima vez que cae `day` (0 = hoy). Ajusta meses cortos (31 -> 28/30). */
export function daysUntilNext(day: number, today: string): number {
  const [y, m] = today.split("-").map(Number);
  const thisMonth = `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
  if (thisMonth >= today) return diffDays(thisMonth, today);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return diffDays(`${ny}-${pad(nm)}-${pad(Math.min(day, daysInMonth(ny, nm)))}`, today);
}

export function detectRecurring(rows: Tx[], today: string, lookbackDays = 120): RecurringPayment[] {
  const since = addDays(today, -lookbackDays);
  const groups = new Map<string, Tx[]>();
  for (const r of rows) {
    if (r.kind !== "expense" || r.date < since || r.date > today) continue;
    const k = key(r.merchant);
    if (!k || k === key("Sin descripción")) continue;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  const out: RecurringPayment[] = [];
  for (const list of groups.values()) {
    const months = new Set(list.map((r) => r.date.slice(0, 7)));
    if (months.size < 2) continue;
    const typical = median(list.map((r) => r.amount));
    if (!list.every((r) => Math.abs(r.amount - typical) <= typical * 0.15)) continue;
    const latest = list.reduce((a, b) => (a.date >= b.date ? a : b));
    const day = Number(latest.date.slice(8, 10));
    out.push({
      name: latest.merchant,
      amount: Math.round(typical * 100) / 100,
      day,
      category: latest.category,
      nextInDays: daysUntilNext(day, today),
    });
  }
  return out.sort((a, b) => a.nextInDays - b.nextInDays);
}
