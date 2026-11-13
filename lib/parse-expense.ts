// Parser por reglas (sin IA, sin costo) de gastos escritos en texto libre.
// Ejemplos: "tacos 120", "uber $85 ayer", "super 1,240.50", "gasolina 500 el lunes", "netflix 219 12/11"

import { addDays, isValidDate, pad, weekday } from "./dates";

export type ParsedExpense = {
  amount: number;
  merchant: string;
  category: string;
  date: string; // YYYY-MM-DD
  confidence: number; // 0..1
  needsReview: boolean;
};

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};

// Orden importa: la primera categoría que coincida gana.
const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["Suscripciones", ["netflix", "spotify", "icloud", "disney", "hbo", "max", "prime", "youtube", "suscripcion", "chatgpt", "apple music", "gimnasio", "gym"]],
  ["Transporte", ["uber", "didi", "cabify", "taxi", "gasolina", "gas", "metro", "metrobus", "camion", "autobus", "caseta", "estacionamiento", "parking", "pasaje", "combustible"]],
  ["Salud", ["farmacia", "doctor", "medico", "dentista", "consulta", "medicina", "medicinas", "hospital", "laboratorio", "optica", "lentes"]],
  ["Vivienda", ["renta", "luz", "cfe", "agua", "internet", "telmex", "izzi", "totalplay", "mantenimiento", "predial", "hipoteca"]],
  ["Ocio", ["cine", "cinepolis", "cinemex", "bar", "antro", "concierto", "boleto", "juego", "steam", "playstation", "xbox", "fiesta", "viaje", "hotel", "cerveza", "chelas"]],
  ["Comida", ["tacos", "taco", "comida", "cena", "desayuno", "almuerzo", "super", "supermercado", "walmart", "soriana", "chedraui", "costco", "oxxo", "7eleven", "cafe", "starbucks", "restaurante", "pizza", "hamburguesa", "mcdonalds", "burger", "sushi", "tortas", "pan", "panaderia", "mercado", "despensa", "tienda", "rappi", "ubereats", "agua", "refresco", "botana", "snack"]],
];

const FILLER = new Set([
  "gaste", "gasto", "gastos", "pague", "pago", "pagos", "compre", "compra", "en", "de", "del", "la", "el",
  "los", "las", "por", "un", "una", "unos", "unas", "mi", "mis", "con", "a", "al", "para", "pesos", "peso",
  "mxn", "y", "fue", "fueron", "costo", "cuesta", "me", "se",
]);

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "1,240.50" -> 1240.5 · "1.240,50" -> 1240.5 · "12.50" -> 12.5 · "1,240" -> 1240 · "120.000" -> 120000 */
export function parseNumber(raw: string): number {
  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");
  let s = raw;
  if (hasDot && hasComma) {
    const dec = raw.lastIndexOf(".") > raw.lastIndexOf(",") ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = raw.split(thou).join("").replace(dec, ".");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const parts = raw.split(sep);
    const last = parts[parts.length - 1];
    const isThousands = parts.length > 2 || (last.length === 3 && parts[0].length <= 3);
    s = isThousands ? parts.join("") : parts.join(".");
  }
  return Number(s);
}

function categorize(normText: string): string | null {
  for (const [category, words] of CATEGORY_KEYWORDS) {
    for (const w of words) {
      const re = new RegExp(`(^|[^a-z0-9])${w}($|[^a-z0-9])`);
      if (re.test(normText)) return category;
    }
  }
  return null;
}

export function parseExpense(text: string, today: string): ParsedExpense | null {
  let o = text.normalize("NFC");
  let n = strip(o.toLowerCase());
  const blank = (start: number, len: number) => {
    const sp = " ".repeat(len);
    o = o.slice(0, start) + sp + o.slice(start + len);
    n = n.slice(0, start) + sp + n.slice(start + len);
  };

  // ---- Fecha ----
  let date = today;
  let dateFound = false;
  const year = Number(today.slice(0, 4));

  let m = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(n);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    let y = m[3] ? Number(m[3]) : year;
    if (y < 100) y += 2000;
    if (isValidDate(y, mo, d)) {
      date = `${y}-${pad(mo)}-${pad(d)}`;
      // sin año y en el futuro -> año anterior
      if (!m[3] && date > today) date = `${y - 1}-${pad(mo)}-${pad(d)}`;
      dateFound = true;
      blank(m.index, m[0].length);
    }
  }
  if (!dateFound) {
    m = /\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/.exec(n);
    if (m && MONTHS[m[2]]) {
      const d = Number(m[1]);
      const mo = MONTHS[m[2]];
      const y = m[3] ? Number(m[3]) : year;
      if (isValidDate(y, mo, d)) {
        date = `${y}-${pad(mo)}-${pad(d)}`;
        if (!m[3] && date > today) date = `${y - 1}-${pad(mo)}-${pad(d)}`;
        dateFound = true;
        blank(m.index, m[0].length);
      }
    }
  }
  if (!dateFound) {
    m = /\b(hoy|ayer|anteayer|antier|antes de ayer)\b/.exec(n);
    if (m) {
      date = m[1] === "hoy" ? today : m[1] === "ayer" ? addDays(today, -1) : addDays(today, -2);
      dateFound = true;
      blank(m.index, m[0].length);
    }
  }
  if (!dateFound) {
    m = /\b(?:el\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/.exec(n);
    if (m) {
      const back = (weekday(today) - WEEKDAYS[m[1]] + 7) % 7;
      date = addDays(today, -back);
      dateFound = true;
      blank(m.index, m[0].length);
    }
  }

  // ---- Monto ----
  const amountRe =
    /(?<![\w.,])(\$\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*k\b)?(\s*(?:pesos|peso|mxn|varos|baros))?/g;
  type Cand = { start: number; len: number; value: number; marked: boolean };
  const cands: Cand[] = [];
  for (const a of n.matchAll(amountRe)) {
    let value = parseNumber(a[2]);
    if (!Number.isFinite(value)) continue;
    if (a[3]) value *= 1000;
    cands.push({ start: a.index, len: a[0].length, value, marked: Boolean(a[1] || a[4]) });
  }
  if (cands.length === 0) return null;
  const chosen = cands.filter((c) => c.marked).at(-1) ?? cands.at(-1)!;
  if (chosen.value <= 0) return null;
  blank(chosen.start, chosen.len);

  // ---- Comercio ----
  const tokens = o.split(/\s+/).filter(Boolean);
  const isFiller = (t: string) => FILLER.has(strip(t.toLowerCase()).replace(/[^a-z0-9]/g, ""));
  while (tokens.length && isFiller(tokens[0])) tokens.shift();
  while (tokens.length && isFiller(tokens[tokens.length - 1])) tokens.pop();
  let merchant = tokens.join(" ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
  if (merchant && merchant === merchant.toLowerCase()) {
    // \b de JS solo conoce letras ASCII (convertiría "mamá" en "mamÁ"); se usa lookbehind Unicode.
    merchant = merchant.replace(/(?<![\p{L}\p{N}])\p{L}/gu, (c) => c.toUpperCase());
  }

  // ---- Categoría ----
  const category = categorize(strip(merchant.toLowerCase()));
  const hasMerchant = merchant.length > 0;

  let confidence = 0.5;
  if (category) confidence += 0.3;
  if (hasMerchant) confidence += 0.2;
  const needsReview = !category || !hasMerchant || date > today;

  return {
    amount: Math.round(chosen.value * 100) / 100,
    merchant: hasMerchant ? merchant : "Sin descripción",
    category: category ?? "Otros",
    date,
    confidence: Math.round(confidence * 100) / 100,
    needsReview,
  };
}
