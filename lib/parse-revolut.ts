// Parser de correos de Revolut. Solo reconoce formatos que hemos visto de verdad.
// Formatos soportados:
//   - "<Nombre> has sent you a transfer" (transferencia recibida) -> income o transfer entre cuentas propias.
// Pendiente (falta un correo de ejemplo real): avisos de compra con tarjeta.
// Lo que no se reconoce devuelve null: nunca se adivina un monto.

import type { Kind } from "./store";

export type ParsedEmail = {
  kind: Kind;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  needsReview: boolean;
};

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};

const CURRENCY_PREFIX: Record<string, string> = { "MX$": "MXN", "US$": "USD", "CA$": "CAD", "€": "EUR", "£": "GBP" };

/** Valor de un campo tipo "Label\nValor" en el cuerpo en texto plano. */
function field(body: string, label: string): string | null {
  const m = new RegExp(`^\\s*${label}\\s*\\r?\\n\\s*(.+?)\\s*$`, "im").exec(body);
  return m ? m[1].trim() : null;
}

function parseAmount(raw: string): { amount: number; currency: string | null } | null {
  const m = /^(MX\$|US\$|CA\$|€|£|\$)?\s*([\d.,]+)\s*([A-Z]{3})?$/.exec(raw.trim());
  if (!m) return null;
  const digits = m[2];
  // En estos correos "." es decimal y "," miles (formato inglés).
  const amount = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = m[3] ?? (m[1] ? (CURRENCY_PREFIX[m[1]] ?? null) : null);
  return { amount, currency };
}

function parseEnglishDate(raw: string): string | null {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

const sameName = (a: string, b: string) =>
  a.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim() ===
  b.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type EmailInput = { from: string; subject: string; body: string };

/**
 * @param ownNames nombres con los que tú apareces como remitente (para distinguir
 *                 una transferencia entre tus cuentas de un ingreso de otra persona).
 */
export function parseRevolutEmail(email: EmailInput, ownNames: string[] = []): ParsedEmail | null {
  if (!/@revolut\.com>?\s*$/i.test(email.from.trim())) return null;

  // Transferencia recibida
  if (/has sent you a transfer/i.test(email.body) || /you've been sent/i.test(email.subject)) {
    const sender = field(email.body, "Sender");
    const recipient = field(email.body, "Recipient");
    const amountRaw = field(email.body, "Amount");
    const sentOn = field(email.body, "Sent on");
    if (!sender || !amountRaw || !sentOn) return null;

    const amt = parseAmount(amountRaw);
    const date = parseEnglishDate(sentOn);
    if (!amt || !date) return null;

    const own = ownNames.some((n) => sameName(n, sender));
    return {
      kind: own ? "transfer" : "income",
      amount: amt.amount,
      currency: amt.currency ?? "MXN",
      date,
      merchant: own ? `Transferencia a ${recipient ?? "otra cuenta"}` : `Transferencia de ${sender}`,
      category: own ? "Transferencia" : "Ingreso",
      // si no conocemos la moneda con certeza, que lo revise una persona
      needsReview: amt.currency === null,
    };
  }

  return null;
}
