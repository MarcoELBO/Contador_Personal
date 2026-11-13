// Correo del banco -> movimiento guardado. Sin red, para poder probarlo.

import { addDays, todayISO } from "./dates";
import { findDuplicate } from "./dedupe";
import { parseRevolutEmail, type EmailInput } from "./parse-revolut";
import type { Store } from "./store";

export type EmailResult =
  | { status: "saved"; kind: string }
  | { status: "duplicate" } // mismo correo reenviado, o mismo gasto que ya llegó por otra vía
  | { status: "ignored" }; // correo que no reconocemos: no se guarda nada

export async function handleEmail(
  email: EmailInput & { id: string },
  store: Store,
  opts: { ownNames?: string[]; today?: string } = {},
): Promise<EmailResult> {
  const parsed = parseRevolutEmail(email, opts.ownNames ?? []);
  if (!parsed) return { status: "ignored" };

  // Solo los gastos se comparan contra WhatsApp; ingresos y transferencias no.
  if (parsed.kind === "expense") {
    const today = opts.today ?? todayISO();
    const recent = (await store.recent(addDays(today, -3))).filter((t) => t.kind === "expense");
    const dup = findDuplicate({ ...parsed, source: "email" }, recent);
    if (dup?.certainty === "sure") return { status: "duplicate" };
  }

  const row = await store.insert({
    kind: parsed.kind,
    date: parsed.date,
    amount: parsed.amount,
    currency: parsed.currency,
    merchant: parsed.merchant,
    category: parsed.category,
    source: "email",
    raw_text: null, // no se guarda el correo completo: trae datos personales
    confidence: 1,
    needs_review: parsed.needsReview,
    dedupe_key: `em:${email.id}`,
  });
  return row ? { status: "saved", kind: parsed.kind } : { status: "duplicate" };
}
