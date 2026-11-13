// Arma los datos del panel a partir de los movimientos guardados. Sin red: se puede probar.

import { DEFAULT_BUDGETS, colorFor } from "./budgets";
import { addDays } from "./dates";
import { detectRecurring, type RecurringPayment } from "./recurring";
import type { Kind, Tx } from "./store";

export type CategoryRow = { name: string; budget: number; spent: number; color: string };
export type RecentRow = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  kind: Kind;
  source: string;
  needsReview: boolean;
};

export type Dashboard = {
  demo: boolean;
  today: string;
  categories: CategoryRow[];
  totalSpent: number;
  totalBudget: number;
  income: number;
  transfers: number;
  trend: { day: number; total: number }[];
  recent: RecentRow[];
  needsReview: number;
  otherCurrency: number;
  recurring: RecurringPayment[];
};

export const HISTORY_DAYS = 120;

export function buildDashboard(
  rows: Tx[],
  today: string,
  opts: { currency?: string; fallbackIncome?: number; budgets?: Record<string, number> } = {},
): Dashboard {
  const currency = opts.currency ?? "MXN";
  const budgets = opts.budgets ?? DEFAULT_BUDGETS;
  const month = today.slice(0, 7);

  const sameCurrency = (r: Tx) => !r.currency || r.currency === currency;
  const monthRows = rows.filter((r) => r.date.slice(0, 7) === month && r.date <= today);
  const counted = monthRows.filter(sameCurrency);
  const expenses = counted.filter((r) => r.kind === "expense");

  const spent = new Map<string, number>();
  for (const e of expenses) spent.set(e.category, (spent.get(e.category) ?? 0) + e.amount);

  const names = [...Object.keys(budgets), ...[...spent.keys()].filter((k) => !(k in budgets))];
  const categories = names.map((name) => ({
    name,
    budget: budgets[name] ?? 0,
    spent: Math.round((spent.get(name) ?? 0) * 100) / 100,
    color: colorFor(name),
  }));

  const dayOfMonth = Number(today.slice(8, 10));
  const trend: { day: number; total: number }[] = [];
  let acc = 0;
  for (let d = 1; d <= dayOfMonth; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    acc += expenses.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0);
    trend.push({ day: d, total: Math.round(acc * 100) / 100 });
  }

  const sum = (kind: Kind) => counted.filter((r) => r.kind === kind).reduce((s, r) => s + r.amount, 0);
  const incomeRegistered = sum("income");

  const recent = [...monthRows]
    .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      date: r.date,
      merchant: r.merchant,
      category: r.category,
      amount: r.amount,
      kind: r.kind,
      source: r.source,
      needsReview: r.needs_review,
    }));

  return {
    demo: false,
    today,
    categories,
    totalSpent: Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100,
    totalBudget: categories.reduce((s, c) => s + c.budget, 0),
    income: incomeRegistered > 0 ? incomeRegistered : (opts.fallbackIncome ?? 0),
    transfers: sum("transfer"),
    trend,
    recent,
    needsReview: monthRows.filter((r) => r.needs_review).length,
    otherCurrency: monthRows.length - counted.length,
    recurring: detectRecurring(rows.filter(sameCurrency), today, HISTORY_DAYS),
  };
}

export const historyStart = (today: string) => addDays(today, -HISTORY_DAYS);
