// Detecta el mismo gasto llegando por dos vías (p. ej. WhatsApp y correo del banco).

import { diffDays } from "./dates";

export type TxLike = {
  date: string;
  amount: number;
  merchant: string | null;
  source?: string;
};

export type DuplicateMatch<T> = {
  match: T;
  /** "sure": mismo comercio. "maybe": mismo monto y fecha pero comercio distinto y otra fuente. */
  certainty: "sure" | "maybe";
};

const norm = (s: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export function merchantsSimilar(a: string | null, b: string | null): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 3 && long.includes(short);
}

export function findDuplicate<T extends TxLike>(
  candidate: TxLike,
  existing: T[],
): DuplicateMatch<T> | null {
  let maybe: T | null = null;
  for (const e of existing) {
    if (Math.abs(e.amount - candidate.amount) > 0.01) continue;
    if (Math.abs(diffDays(e.date, candidate.date)) > 1) continue;
    if (merchantsSimilar(e.merchant, candidate.merchant)) return { match: e, certainty: "sure" };
    if (e.source && candidate.source && e.source !== candidate.source) maybe ??= e;
  }
  return maybe ? { match: maybe, certainty: "maybe" } : null;
}
