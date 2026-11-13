import { todayISO } from "@/lib/dates";
import { handleMessage } from "@/lib/handle-message";
import { getStore } from "@/lib/store";
import { samePhone, sendText, verifySignature } from "@/lib/whatsapp";

// Verificación del webhook (Meta llama una vez al registrarlo).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === expected) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type WaMessage = { id: string; from: string; type: string; text?: { body: string } };
type WaPayload = {
  entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[];
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: WaPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const store = getStore();
  const today = todayISO();
  const messages = (payload.entry ?? []).flatMap((e) => (e.changes ?? []).flatMap((c) => c.value?.messages ?? []));

  for (const msg of messages) {
    // Solo texto y solo del número autorizado: lo demás se ignora en silencio.
    if (msg.type !== "text" || !msg.text?.body) continue;
    if (!samePhone(msg.from, process.env.WHATSAPP_ALLOWED_NUMBER)) continue;
    try {
      const reply = await handleMessage(msg.text.body, msg.id, store, today);
      await sendText(msg.from, reply);
    } catch (err) {
      console.error("Error procesando mensaje de WhatsApp:", err instanceof Error ? err.message : "desconocido");
      await sendText(msg.from, "Algo falló al guardar tu gasto. Intenta de nuevo en un momento.");
    }
  }

  // Siempre 200 con firma válida: si no, Meta reintenta durante horas.
  return new Response("OK", { status: 200 });
}
