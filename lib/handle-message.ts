// Lógica del bot: texto recibido -> acción sobre el almacén -> texto de respuesta.
// Sin dependencias de red para poder probarla.

import { addDays, diffDays } from "./dates";
import { findDuplicate } from "./dedupe";
import { parseExpense } from "./parse-expense";
import type { Store } from "./store";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: process.env.NEXT_PUBLIC_CURRENCY ?? "MXN" });

const HELP =
  "Escríbeme tus gastos como hablas:\n" +
  "• tacos 120\n• uber $85 ayer\n• super 1,240.50\n• gasolina 500 el lunes\n\n" +
  "Comandos: *deshacer* borra el último registro.";

function when(date: string, today: string) {
  const d = diffDays(today, date);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  return date;
}

export async function handleMessage(
  text: string,
  messageId: string,
  store: Store,
  today: string,
): Promise<string> {
  const cmd = text.trim().toLowerCase();

  if (["ayuda", "help", "?", "hola"].includes(cmd)) return HELP;

  if (["deshacer", "undo", "borrar"].includes(cmd)) {
    const removed = await store.removeLast("whatsapp");
    return removed
      ? `↩️ Borré: ${removed.merchant} · ${money.format(removed.amount)}`
      : "No hay nada que deshacer.";
  }

  const parsed = parseExpense(text, today);
  if (!parsed) return "No encontré un monto 🤔\n\n" + HELP;

  const recent = await store.recent(addDays(today, -3));
  const dup = findDuplicate(
    { ...parsed, source: "whatsapp" },
    recent.filter((t) => t.kind === "expense"),
  );

  if (dup?.certainty === "sure") {
    return `Ya lo tenía registrado (${dup.match.merchant} · ${money.format(dup.match.amount)}), no lo dupliqué.`;
  }

  const row = await store.insert({
    kind: "expense",
    date: parsed.date,
    amount: parsed.amount,
    merchant: parsed.merchant,
    category: parsed.category,
    source: "whatsapp",
    raw_text: text,
    confidence: parsed.confidence,
    needs_review: parsed.needsReview || dup?.certainty === "maybe",
    dedupe_key: `wa:${messageId}`,
  });
  if (!row) return "Ese mensaje ya estaba procesado."; // reintento de Meta

  let reply = `✅ ${parsed.merchant} · ${money.format(parsed.amount)} · ${parsed.category} · ${when(parsed.date, today)}`;
  if (dup?.certainty === "maybe") {
    reply += `\n⚠️ Se parece a ${dup.match.merchant} (${dup.match.source}); lo dejé marcado para revisar.`;
  } else if (parsed.needsReview) {
    reply += "\n⚠️ No estoy seguro de la categoría; quedó marcado para revisar.";
  }
  return reply;
}
