// Simula un mensaje de WhatsApp firmado como lo haría Meta.
// Uso: node scripts/simulate-whatsapp.mjs "tacos 120" [messageId] [urlBase]
// Requiere WHATSAPP_APP_SECRET y WHATSAPP_ALLOWED_NUMBER (las lee de .env.local o del entorno).

import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const [text, id = `wamid.${randomUUID()}`, base = "http://localhost:3000"] = process.argv.slice(2);
const secret = process.env.WHATSAPP_APP_SECRET;
const from = process.env.WHATSAPP_ALLOWED_NUMBER;

if (!text) {
  console.error('Uso: node scripts/simulate-whatsapp.mjs "tacos 120" [messageId] [urlBase]');
  process.exit(1);
}
if (!secret || !from) {
  console.error("Faltan WHATSAPP_APP_SECRET o WHATSAPP_ALLOWED_NUMBER en .env.local");
  process.exit(1);
}

const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ value: { messages: [{ id, from, type: "text", text: { body: text } }] } }] }],
});
const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

const res = await fetch(`${base}/api/whatsapp`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
  body,
});
console.log(`HTTP ${res.status} ${await res.text()}  (id: ${id})`);
