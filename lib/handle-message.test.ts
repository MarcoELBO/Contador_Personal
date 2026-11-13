import { beforeEach, describe, expect, it } from "vitest";
import { handleMessage } from "./handle-message";
import { getStore, resetMemoryStore } from "./store";
import { samePhone, verifySignature } from "./whatsapp";
import { createHmac } from "node:crypto";

const TODAY = "2026-11-13";
const store = () => getStore();

beforeEach(() => resetMemoryStore());

describe("handleMessage", () => {
  it("registra un gasto y confirma", async () => {
    const r = await handleMessage("tacos 120", "m1", store(), TODAY);
    expect(r).toContain("✅");
    expect(r).toContain("Comida");
    expect((await store().recent("2026-01-01")).length).toBe(1);
  });

  it("el mismo id de mensaje (reintento de Meta) no duplica", async () => {
    await handleMessage("tacos 120", "m1", store(), TODAY);
    const r = await handleMessage("tacos 120", "m1", store(), TODAY);
    expect(r).toMatch(/ya (estaba|lo ten)/i);
    expect((await store().recent("2026-01-01")).length).toBe(1);
  });

  it("mismo gasto con otro id y mismo comercio se detecta como duplicado", async () => {
    await handleMessage("walmart 1240.50", "m1", store(), TODAY);
    const r = await handleMessage("walmart 1,240.50", "m2", store(), TODAY);
    expect(r).toContain("Ya lo tenía");
    expect((await store().recent("2026-01-01")).length).toBe(1);
  });

  it("deshacer borra el último", async () => {
    await handleMessage("tacos 120", "m1", store(), TODAY);
    await handleMessage("uber 85", "m2", store(), TODAY);
    const r = await handleMessage("deshacer", "m3", store(), TODAY);
    expect(r).toContain("Uber");
    const left = await store().recent("2026-01-01");
    expect(left.map((t) => t.merchant)).toEqual(["Tacos"]);
  });

  it("deshacer sin nada responde con gracia", async () => {
    expect(await handleMessage("deshacer", "m1", store(), TODAY)).toContain("nada que deshacer");
  });

  it("sin monto muestra la ayuda y no guarda nada", async () => {
    const r = await handleMessage("buenas tardes", "m1", store(), TODAY);
    expect(r).toContain("No encontré un monto");
    expect((await store().recent("2026-01-01")).length).toBe(0);
  });

  it("categoría desconocida queda marcada para revisión", async () => {
    const r = await handleMessage("regalo mamá 500", "m1", store(), TODAY);
    expect(r).toContain("⚠️");
    expect((await store().recent("2026-01-01"))[0].needs_review).toBe(true);
  });

  it("coincidencia dudosa con un gasto de otra fuente se guarda pero se marca", async () => {
    await store().insert({
      kind: "expense", date: "2026-11-13", amount: 85, merchant: "DIDI RIDES", category: "Transporte", source: "email",
      raw_text: null, confidence: 1, needs_review: false, dedupe_key: "em:1",
    });
    const r = await handleMessage("taxi 85", "m1", store(), TODAY);
    expect(r).toContain("marcado para revisar");
    expect((await store().recent("2026-01-01")).length).toBe(2);
  });
});

describe("whatsapp helpers", () => {
  const secret = "s3cret";
  const body = '{"a":1}';
  const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

  it("acepta una firma válida", () => {
    expect(verifySignature(body, sig, secret)).toBe(true);
  });
  it("rechaza firma alterada, cuerpo alterado, sin cabecera y sin secreto", () => {
    expect(verifySignature(body, sig.replace(/.$/, "0"), secret)).toBe(false);
    expect(verifySignature('{"a":2}', sig, secret)).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, sig, "")).toBe(false);
  });
  it("samePhone ignora el prefijo 52/521", () => {
    expect(samePhone("5215512345678", "525512345678")).toBe(true);
    expect(samePhone("5215512345678", "+52 55 1234 5678")).toBe(true);
    expect(samePhone("5215512345678", "5215512345679")).toBe(false);
    expect(samePhone(undefined, undefined)).toBe(false);
  });
});
