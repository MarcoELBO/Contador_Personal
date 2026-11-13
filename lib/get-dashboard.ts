// Punto de entrada de datos para las pantallas (solo servidor).

import { connection } from "next/server";
import { todayISO } from "./dates";
import { buildDashboard, historyStart, type Dashboard } from "./dashboard";
import { daysUntilNext } from "./recurring";
import { categories, income, recurring, transactions, trend } from "./sample-data";
import { getStore, storeIsPersistent } from "./store";

function demoDashboard(today: string): Dashboard {
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  return {
    demo: true,
    today,
    categories,
    totalSpent,
    totalBudget: categories.reduce((s, c) => s + c.budget, 0),
    income,
    transfers: 0,
    trend: trend.map(({ day, total }) => ({ day, total })),
    recent: transactions.map((t) => ({
      id: t.id, date: t.date, merchant: t.merchant, category: t.category, amount: t.amount,
      kind: "expense" as const, source: t.source, needsReview: false,
    })),
    needsReview: 0,
    otherCurrency: 0,
    recurring: recurring
      .map((r) => ({ name: r.name, amount: r.amount, day: r.day, category: r.category, nextInDays: daysUntilNext(r.day, today) }))
      .sort((a, b) => a.nextInDays - b.nextInDays),
  };
}

export async function getDashboard(): Promise<Dashboard> {
  await connection(); // dato por petición: no congelar en el build
  const today = todayISO();
  // Producción sin Supabase: no hay dónde leer, se muestra el ejemplo (marcado) en vez de romper la página.
  if (!storeIsPersistent() && process.env.NODE_ENV === "production") return demoDashboard(today);
  const rows = await getStore().recent(historyStart(today));

  // Sin base de datos y sin nada registrado: se muestran datos de ejemplo, claramente marcados.
  if (!storeIsPersistent() && rows.length === 0) return demoDashboard(today);

  return buildDashboard(rows, today, {
    currency: process.env.NEXT_PUBLIC_CURRENCY ?? "MXN",
    fallbackIncome: Number(process.env.MONTHLY_INCOME) || 0,
  });
}
