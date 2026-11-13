import { createHmac, timingSafeEqual } from "node:crypto";

/** Valida X-Hub-Signature-256 sobre el cuerpo crudo. Falla cerrado si no hay secreto. */
export function verifySignature(rawBody: string, header: string | null, secret = process.env.WHATSAPP_APP_SECRET): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(given, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Compara teléfonos por los últimos 10 dígitos (México usa 52 o 521 según el origen). */
export function samePhone(a: string | undefined, b: string | undefined): boolean {
  const da = (a ?? "").replace(/\D/g, "").slice(-10);
  const db = (b ?? "").replace(/\D/g, "").slice(-10);
  return da.length === 10 && da === db;
}

/** Envía un texto por la Cloud API. Si faltan credenciales no hace nada (modo simulación). */
export async function sendText(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return false;
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!res.ok) console.error(`WhatsApp sendText falló: HTTP ${res.status}`);
  return res.ok;
}
