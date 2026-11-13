import { describe, expect, it } from "vitest";
import { buildDashboard } from "./dashboard";
import type { Kind, Tx } from "./store";

const TODAY = "2026-11-13";
let n = 0;
const tx = (o: Partial<Tx> & { date: string; amount: number }): Tx => ({
  id: `t${++n}`,
  kind: "expense" as Kind,
  merchant: "X",
  category: "Comida",
  source: "whatsapp",
  raw_text: null,
  confidence: 1,
  needs_review: false,
  dedupe_key: null,
  created_at: `2026-11-13T10:00:${String(n).padStart(2, "0")}Z`,
  ...o,
});

describe("buildDashboard", () => {
  it("suma solo gastos del mes por categoría", () => {
    const d = buildDashboard(
      [
        tx({ date: "2026-11-02", amount: 100, category: "Comida" }),
        tx({ date: "2026-11-10", amount: 50, category: "Comida" }),
        tx({ date: "2026-11-11", amount: 85, category: "Transporte" }),
        tx({ date: "2026-10-30", amount: 999, category: "Comida" }), // mes anterior
      ],
      TODAY,
    );
    expect(d.totalSpent).toBe(235);
    expect(d.categories.find((c) => c.name === "Comida")).toMatchObject({ spent: 150, budget: 4500 });
    expect(d.categories.find((c) => c.name === "Transporte")?.spent).toBe(85);
  });

  it("ingresos y transferencias no cuentan como gasto", () => {
    const d = buildDashboard(
      [
        tx({ date: "2026-11-05", amount: 100 }),
        tx({ date: "2026-11-06", amount: 5000, kind: "income", category: "Ingreso" }),
        tx({ date: "2026-11-07", amount: 700, kind: "transfer", category: "Transferencia" }),
      ],
      TODAY,
    );
    expect(d.totalSpent).toBe(100);
    expect(d.income).toBe(5000);
    expect(d.transfers).toBe(700);
  });

  it("categorías fuera de presupuesto aparecen con presupuesto 0", () => {
    const d = buildDashboard([tx({ date: "2026-11-05", amount: 40, category: "Otros" })], TODAY);
    expect(d.categories.find((c) => c.name === "Otros")).toMatchObject({ budget: 0, spent: 40 });
  });

  it("la tendencia es acumulada y llega hasta hoy", () => {
    const d = buildDashboard(
      [tx({ date: "2026-11-01", amount: 100 }), tx({ date: "2026-11-03", amount: 50 })],
      TODAY,
    );
    expect(d.trend).toHaveLength(13);
    expect(d.trend[0]).toEqual({ day: 1, total: 100 });
    expect(d.trend[1]).toEqual({ day: 2, total: 100 });
    expect(d.trend[2]).toEqual({ day: 3, total: 150 });
    expect(d.trend.at(-1)?.total).toBe(150);
  });

  it("ignora gastos con fecha futura", () => {
    expect(buildDashboard([tx({ date: "2026-11-20", amount: 500 })], TODAY).totalSpent).toBe(0);
  });

  it("otra moneda no se suma y se avisa", () => {
    const d = buildDashboard(
      [tx({ date: "2026-11-05", amount: 100 }), tx({ date: "2026-11-05", amount: 30, currency: "USD" })],
      TODAY,
    );
    expect(d.totalSpent).toBe(100);
    expect(d.otherCurrency).toBe(1);
  });

  it("usa el ingreso de respaldo solo si no hay ingresos registrados", () => {
    expect(buildDashboard([], TODAY, { fallbackIncome: 20000 }).income).toBe(20000);
    const d = buildDashboard([tx({ date: "2026-11-02", amount: 300, kind: "income" })], TODAY, { fallbackIncome: 20000 });
    expect(d.income).toBe(300);
  });

  it("cuenta los movimientos por revisar y ordena lo reciente primero", () => {
    const d = buildDashboard(
      [
        tx({ date: "2026-11-02", amount: 10, merchant: "Viejo" }),
        tx({ date: "2026-11-12", amount: 20, merchant: "Nuevo", needs_review: true }),
      ],
      TODAY,
    );
    expect(d.needsReview).toBe(1);
    expect(d.recent.map((r) => r.merchant)).toEqual(["Nuevo", "Viejo"]);
  });
});
