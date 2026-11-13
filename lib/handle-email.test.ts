import { beforeEach, describe, expect, it } from "vitest";
import { handleEmail } from "./handle-email";
import { getStore, resetMemoryStore } from "./store";

const TODAY = "2026-11-13";
const mail = (id: string, from = "Revolut <no-reply@revolut.com>") => ({
  id,
  from,
  subject: "You've been sent MX$12",
  body: [
    "Ana Pérez has sent you a transfer",
    "Sender", "Ana Pérez",
    "Recipient", "Cuenta Ejemplo",
    "Amount", "MX$12",
    "Sent on", "November 12, 2026",
  ].join("\n"),
});

beforeEach(() => resetMemoryStore());

describe("handleEmail", () => {
  it("guarda una transferencia propia como transfer, no como gasto", async () => {
    const r = await handleEmail(mail("e1"), getStore(), { ownNames: ["Ana Pérez"], today: TODAY });
    expect(r).toEqual({ status: "saved", kind: "transfer" });
    const rows = await getStore().recent("2026-01-01");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "transfer", source: "email", raw_text: null, date: "2026-11-12" });
  });

  it("el mismo correo reenviado por el script no se duplica", async () => {
    await handleEmail(mail("e1"), getStore(), { today: TODAY });
    const r = await handleEmail(mail("e1"), getStore(), { today: TODAY });
    expect(r).toEqual({ status: "duplicate" });
    expect(await getStore().recent("2026-01-01")).toHaveLength(1);
  });

  it("un correo que no se reconoce se ignora y no guarda nada", async () => {
    const r = await handleEmail(mail("e2", "spam@example.com"), getStore(), { today: TODAY });
    expect(r).toEqual({ status: "ignored" });
    expect(await getStore().recent("2026-01-01")).toHaveLength(0);
  });

  it("un ingreso con el mismo monto que un gasto de WhatsApp no se toma por duplicado", async () => {
    await getStore().insert({
      kind: "expense", date: "2026-11-12", amount: 12, merchant: "Dulces", category: "Comida",
      source: "whatsapp", raw_text: "dulces 12", confidence: 1, needs_review: false, dedupe_key: "wa:1",
    });
    const r = await handleEmail(mail("e3"), getStore(), { today: TODAY });
    expect(r).toMatchObject({ status: "saved" });
    expect(await getStore().recent("2026-01-01")).toHaveLength(2);
  });
});
