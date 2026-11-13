import { describe, expect, it } from "vitest";
import { daysUntilNext, detectRecurring } from "./recurring";
import type { Tx } from "./store";

const TODAY = "2026-11-13";
let n = 0;
const tx = (merchant: string, date: string, amount: number, category = "Suscripciones"): Tx => ({
  id: `r${++n}`, kind: "expense", merchant, category, date, amount, source: "whatsapp",
  raw_text: null, confidence: 1, needs_review: false, dedupe_key: null, created_at: "2026-11-13T00:00:00Z",
});

describe("detectRecurring", () => {
  it("detecta el mismo comercio en meses distintos con monto parecido", () => {
    const r = detectRecurring(
      [tx("Netflix", "2026-09-14", 219), tx("Netflix", "2026-10-14", 219), tx("Netflix", "2026-11-14", 219)],
      TODAY,
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: "Netflix", amount: 219, day: 14, nextInDays: 1 });
  });

  it("no detecta un comercio que solo aparece un mes", () => {
    expect(detectRecurring([tx("Tacos", "2026-11-02", 100), tx("Tacos", "2026-11-09", 100)], TODAY)).toEqual([]);
  });

  it("no detecta si los montos varían mucho (compras normales)", () => {
    const rows = [tx("Walmart", "2026-10-05", 300, "Comida"), tx("Walmart", "2026-11-05", 1800, "Comida")];
    expect(detectRecurring(rows, TODAY)).toEqual([]);
  });

  it("tolera variación pequeña y reporta el monto típico", () => {
    const r = detectRecurring([tx("Luz CFE", "2026-10-03", 410, "Vivienda"), tx("Luz CFE", "2026-11-03", 450, "Vivienda")], TODAY);
    expect(r[0].amount).toBe(430);
  });

  it("ignora ingresos, transferencias y lo muy antiguo", () => {
    const rows: Tx[] = [
      { ...tx("Nómina", "2026-10-01", 9000), kind: "income" },
      { ...tx("Nómina", "2026-11-01", 9000), kind: "income" },
      tx("Viejo", "2025-01-01", 100),
      tx("Viejo", "2025-02-01", 100),
    ];
    expect(detectRecurring(rows, TODAY)).toEqual([]);
  });

  it("ordena por el próximo vencimiento", () => {
    const r = detectRecurring(
      [
        tx("Gym", "2026-09-25", 600), tx("Gym", "2026-10-25", 600),
        tx("Spotify", "2026-09-15", 129), tx("Spotify", "2026-10-15", 129),
      ],
      TODAY,
    );
    expect(r.map((x) => x.name)).toEqual(["Spotify", "Gym"]);
  });
});

describe("daysUntilNext", () => {
  it("hoy es 0, mañana es 1", () => {
    expect(daysUntilNext(13, TODAY)).toBe(0);
    expect(daysUntilNext(14, TODAY)).toBe(1);
  });
  it("si ya pasó, cuenta al mes siguiente", () => {
    expect(daysUntilNext(1, TODAY)).toBe(18); // 1 de diciembre
  });
  it("cruza de año", () => {
    expect(daysUntilNext(5, "2026-12-20")).toBe(16); // 5 de enero
  });
  it("ajusta meses cortos (día 31 en febrero)", () => {
    expect(daysUntilNext(31, "2026-02-10")).toBe(18); // 28 de febrero
  });
});
