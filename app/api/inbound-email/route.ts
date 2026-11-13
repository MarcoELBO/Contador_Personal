import { timingSafeEqual } from "node:crypto";
import { handleEmail } from "@/lib/handle-email";
import { getStore } from "@/lib/store";

const MAX_BODY = 200_000; // caracteres; un correo normal pesa mucho menos

function secretOk(given: string | null): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || !given) return false; // falla cerrado
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Lo llama el script de Google Apps Script (scripts/gmail-forwarder.gs) por cada correo nuevo.
export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-inbound-secret"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let data: { id?: unknown; from?: unknown; subject?: unknown; body?: unknown };
  try {
    data = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const { id, from, subject, body } = data;
  if (
    typeof id !== "string" || !id ||
    typeof from !== "string" ||
    typeof subject !== "string" ||
    typeof body !== "string" || body.length > MAX_BODY
  ) {
    return new Response("Bad request", { status: 400 });
  }

  const ownNames = (process.env.OWN_NAMES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const result = await handleEmail({ id, from, subject, body }, getStore(), { ownNames });
    return Response.json(result);
  } catch (err) {
    console.error("Error procesando correo:", err instanceof Error ? err.message : "desconocido");
    // 500 para que el script reintente en la siguiente ejecución
    return new Response("Error", { status: 500 });
  }
}
