import { describe, expect, it } from "vitest";
import { parseRevolutEmail } from "./parse-revolut";

// Réplica de la estructura de un correo real de Revolut, con nombres inventados.
const transferEmail = (over: Partial<Record<"Sender" | "Recipient" | "Amount" | "Sent on", string>> = {}) => {
  const f = { Sender: "Ana Pérez", Recipient: "Cuenta Ejemplo", Amount: "MX$12", "Sent on": "October 19, 2026", ...over };
  return {
    from: "Revolut <no-reply@revolut.com>",
    subject: `You've been sent ${f.Amount}`,
    body: [
      "Ana Pérez has sent you a transfer",
      "Hi Cuenta Ejemplo,",
      `Ana Pérez sent you ${f.Amount} via a bank transfer from Revolut. You can find the details below:`,
      "Sender", f.Sender,
      "Recipient", f.Recipient,
      "Reference", "Sent from Revolut",
      "Amount", f.Amount,
      "Sent on", f["Sent on"],
      "Expected by", "Today",
    ].join("\n"),
  };
};

describe("parseRevolutEmail: transferencia recibida", () => {
  it("de otra persona es un ingreso", () => {
    expect(parseRevolutEmail(transferEmail(), [])).toMatchObject({
      kind: "income", amount: 12, currency: "MXN", date: "2026-10-19", category: "Ingreso",
      merchant: "Transferencia de Ana Pérez", needsReview: false,
    });
  });

  it("del propio usuario es transferencia (no gasto), ignorando acentos y mayúsculas", () => {
    const r = parseRevolutEmail(transferEmail(), ["ana perez"]);
    expect(r).toMatchObject({ kind: "transfer", category: "Transferencia", merchant: "Transferencia a Cuenta Ejemplo" });
  });

  it("miles con coma y decimales", () => {
    expect(parseRevolutEmail(transferEmail({ Amount: "MX$1,250.75" }))?.amount).toBe(1250.75);
  });

  it("otra moneda por prefijo", () => {
    expect(parseRevolutEmail(transferEmail({ Amount: "US$30" }))).toMatchObject({ amount: 30, currency: "USD" });
  });

  it("moneda desconocida -> asume MXN pero pide revisión", () => {
    expect(parseRevolutEmail(transferEmail({ Amount: "12" }))).toMatchObject({ currency: "MXN", needsReview: true });
  });

  it("fecha o monto ilegibles -> null (no se adivina)", () => {
    expect(parseRevolutEmail(transferEmail({ "Sent on": "mañana" }))).toBeNull();
    expect(parseRevolutEmail(transferEmail({ Amount: "mucho" }))).toBeNull();
  });

  it("monto cero -> null", () => {
    expect(parseRevolutEmail(transferEmail({ Amount: "MX$0" }))).toBeNull();
  });
});

describe("parseRevolutEmail: seguridad y formatos no soportados", () => {
  it("remitente que no es revolut.com -> null", () => {
    expect(parseRevolutEmail({ ...transferEmail(), from: "Revolut <no-reply@revolut.com.evil.io>" })).toBeNull();
    expect(parseRevolutEmail({ ...transferEmail(), from: "x@gmail.com" })).toBeNull();
  });

  it("correo de Revolut de otro tipo -> null", () => {
    expect(parseRevolutEmail({ from: "no-reply@revolut.com", subject: "Welcome", body: "Hola" })).toBeNull();
  });
});
