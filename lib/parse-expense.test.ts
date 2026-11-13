import { describe, expect, it } from "vitest";
import { parseExpense, parseNumber } from "./parse-expense";

// Viernes 13 de noviembre de 2026
const TODAY = "2026-11-13";
const p = (t: string) => parseExpense(t, TODAY);

describe("parseNumber", () => {
  it.each([
    ["120", 120],
    ["85.5", 85.5],
    ["12,50", 12.5],
    ["1,240", 1240],
    ["1,240.50", 1240.5],
    ["1.240,50", 1240.5],
    ["120.000", 120000],
    ["1,000,000", 1000000],
  ])("%s -> %d", (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });
});

describe("parseExpense: monto y comercio", () => {
  it("formato simple", () => {
    expect(p("tacos 120")).toMatchObject({ amount: 120, merchant: "Tacos", category: "Comida", date: TODAY });
  });
  it("con signo de pesos", () => {
    expect(p("uber $85")).toMatchObject({ amount: 85, merchant: "Uber", category: "Transporte" });
  });
  it("con 'pesos'", () => {
    expect(p("gasté 250 pesos en gasolina")).toMatchObject({ amount: 250, merchant: "Gasolina", category: "Transporte" });
  });
  it("miles y decimales", () => {
    expect(p("super 1,240.50")).toMatchObject({ amount: 1240.5, category: "Comida" });
  });
  it("formato europeo", () => {
    expect(p("walmart 1.240,50")).toMatchObject({ amount: 1240.5 });
  });
  it("sufijo k", () => {
    expect(p("renta 2k")).toMatchObject({ amount: 2000, category: "Vivienda" });
  });
  it("monto primero", () => {
    expect(p("120 tacos")).toMatchObject({ amount: 120, merchant: "Tacos" });
  });
  it("prefiere el monto marcado con $ sobre otros números", () => {
    expect(p("2 tacos $120")).toMatchObject({ amount: 120 });
  });
  it("sin marca toma el último número", () => {
    expect(p("2 tacos 120")).toMatchObject({ amount: 120 });
  });
  it("conserva acentos y mayúsculas del usuario", () => {
    expect(p("Tacos El Güero 120")).toMatchObject({ merchant: "Tacos El Güero" });
  });
  it("capitaliza si todo viene en minúsculas", () => {
    expect(p("farmacia del ahorro 320")).toMatchObject({ merchant: "Farmacia Del Ahorro", category: "Salud" });
  });
  it("capitaliza bien palabras con acento en minúsculas (mamá, café, jalapeño)", () => {
    expect(p("regalo mamá 500")?.merchant).toBe("Regalo Mamá");
    expect(p("café la esquina 60")?.merchant).toBe("Café La Esquina");
    expect(p("ñoño jalapeño 30")?.merchant).toBe("Ñoño Jalapeño");
  });
  it("sin monto devuelve null", () => {
    expect(p("hola cómo estás")).toBeNull();
  });
  it("monto cero devuelve null", () => {
    expect(p("tacos 0")).toBeNull();
  });
});

describe("parseExpense: fechas", () => {
  it("ayer", () => {
    expect(p("uber 85 ayer")?.date).toBe("2026-11-12");
  });
  it("hoy", () => {
    expect(p("hoy tacos 120")?.date).toBe(TODAY);
  });
  it("anteayer", () => {
    expect(p("cine 240 anteayer")?.date).toBe("2026-11-11");
  });
  it("día de la semana pasado", () => {
    expect(p("gasolina 500 el lunes")?.date).toBe("2026-11-09");
  });
  it("mismo día de la semana es hoy (viernes)", () => {
    expect(p("tacos 100 el viernes")?.date).toBe(TODAY);
  });
  it("dd/mm", () => {
    expect(p("netflix 219 12/11")).toMatchObject({ date: "2026-11-12", amount: 219 });
  });
  it("dd/mm/yyyy", () => {
    expect(p("netflix 219 01/10/2026")?.date).toBe("2026-10-01");
  });
  it("dd/mm futuro sin año cae en el año anterior", () => {
    expect(p("tacos 100 25/12")?.date).toBe("2025-12-25");
  });
  it("'12 de noviembre'", () => {
    expect(p("tacos 120 el 12 de noviembre")).toMatchObject({ date: "2026-11-12", amount: 120 });
  });
  it("fecha inválida no se interpreta como fecha", () => {
    // 31/02 no existe: se ignora como fecha y el resto se parsea como monto
    expect(p("tacos 120 31/02")?.date).toBe(TODAY);
  });
});

describe("parseExpense: categoría y revisión", () => {
  it("categoría conocida con comercio no necesita revisión", () => {
    expect(p("spotify 129")).toMatchObject({ category: "Suscripciones", needsReview: false });
  });
  it("sin categoría -> Otros y needsReview", () => {
    expect(p("regalo mamá 500")).toMatchObject({ category: "Otros", needsReview: true });
  });
  it("sin comercio -> needsReview", () => {
    expect(p("350")).toMatchObject({ merchant: "Sin descripción", needsReview: true });
  });
  it("no confunde palabras que contienen una clave (gas vs gasto)", () => {
    expect(p("gasto raro 100")?.category).toBe("Otros");
  });
  it("confianza más alta cuando hay categoría y comercio", () => {
    expect(p("uber 85")!.confidence).toBeGreaterThan(p("regalo 85")!.confidence);
  });
});
