import { describe, expect, it } from "vitest";
import { findDuplicate, merchantsSimilar } from "./dedupe";

const existing = [
  { id: 1, date: "2026-11-11", amount: 1240.5, merchant: "WAL MART SUPERCENTER", source: "email" },
  { id: 2, date: "2026-11-12", amount: 85, merchant: "Uber", source: "email" },
];

describe("merchantsSimilar", () => {
  it("ignora mayúsculas, espacios y acentos", () => {
    expect(merchantsSimilar("Tacos El Güero", "TACOS EL GUERO")).toBe(true);
  });
  it("coincide si uno contiene al otro", () => {
    expect(merchantsSimilar("Walmart", "WAL MART SUPERCENTER")).toBe(true);
  });
  it("comercios distintos no coinciden", () => {
    expect(merchantsSimilar("Uber", "Oxxo")).toBe(false);
  });
  it("vacío nunca coincide", () => {
    expect(merchantsSimilar("", "Uber")).toBe(false);
    expect(merchantsSimilar(null, null)).toBe(false);
  });
});

describe("findDuplicate", () => {
  it("mismo monto, fecha y comercio -> sure", () => {
    const r = findDuplicate({ date: "2026-11-11", amount: 1240.5, merchant: "Walmart", source: "whatsapp" }, existing);
    expect(r?.certainty).toBe("sure");
    expect(r?.match.id).toBe(1);
  });
  it("tolera un día de diferencia", () => {
    const r = findDuplicate({ date: "2026-11-12", amount: 1240.5, merchant: "Walmart", source: "whatsapp" }, existing);
    expect(r?.certainty).toBe("sure");
  });
  it("dos días de diferencia no es duplicado", () => {
    expect(findDuplicate({ date: "2026-11-13", amount: 1240.5, merchant: "Walmart", source: "whatsapp" }, existing)).toBeNull();
  });
  it("monto distinto no es duplicado", () => {
    expect(findDuplicate({ date: "2026-11-11", amount: 1240, merchant: "Walmart", source: "whatsapp" }, existing)).toBeNull();
  });
  it("mismo monto y fecha, comercio distinto, otra fuente -> maybe", () => {
    const r = findDuplicate({ date: "2026-11-12", amount: 85, merchant: "Taxi", source: "whatsapp" }, existing);
    expect(r?.certainty).toBe("maybe");
  });
  it("mismo monto y fecha, comercio distinto, misma fuente -> no es duplicado", () => {
    expect(findDuplicate({ date: "2026-11-12", amount: 85, merchant: "Taxi", source: "email" }, existing)).toBeNull();
  });
  it("prefiere un 'sure' aunque haya un 'maybe' antes en la lista", () => {
    const list = [
      { id: 9, date: "2026-11-12", amount: 85, merchant: "Otro", source: "email" },
      ...existing,
    ];
    const r = findDuplicate({ date: "2026-11-12", amount: 85, merchant: "Uber", source: "whatsapp" }, list);
    expect(r).toMatchObject({ certainty: "sure", match: { id: 2 } });
  });
});
