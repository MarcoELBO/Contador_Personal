// Datos de ejemplo para la Fase 1. Se reemplazan por consultas a Supabase en la Fase 4.

export type Source = "whatsapp" | "email" | "manual";

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  amount: number;
  source: Source;
};

export type Category = { name: string; budget: number; spent: number; color: string };

export type Recurring = {
  id: string;
  name: string;
  amount: number;
  day: number;
  category: string;
  auto: boolean;
};

export type Insight = {
  id: string;
  kind: "alerta" | "ahorro" | "info";
  text: string;
  date: string;
};

export const categories: Category[] = [
  { name: "Comida", budget: 4500, spent: 3720, color: "#ffc83d" },
  { name: "Transporte", budget: 1800, spent: 1240, color: "#3ddc97" },
  { name: "Vivienda", budget: 8000, spent: 8000, color: "#5b9dff" },
  { name: "Suscripciones", budget: 900, spent: 1015, color: "#ff5d5d" },
  { name: "Ocio", budget: 1500, spent: 640, color: "#b583ff" },
  { name: "Salud", budget: 1000, spent: 320, color: "#ff9f43" },
];

export const transactions: Transaction[] = [
  { id: "t1", date: "2026-11-12", merchant: "Oxxo", category: "Comida", amount: 96, source: "email" },
  { id: "t2", date: "2026-11-12", merchant: "Uber", category: "Transporte", amount: 85, source: "whatsapp" },
  { id: "t3", date: "2026-11-11", merchant: "Walmart", category: "Comida", amount: 1240.5, source: "email" },
  { id: "t4", date: "2026-11-10", merchant: "Spotify", category: "Suscripciones", amount: 129, source: "email" },
  { id: "t5", date: "2026-11-09", merchant: "Tacos El Güero", category: "Comida", amount: 120, source: "whatsapp" },
  { id: "t6", date: "2026-11-08", merchant: "Cinépolis", category: "Ocio", amount: 240, source: "email" },
  { id: "t7", date: "2026-11-07", merchant: "Farmacia del Ahorro", category: "Salud", amount: 320, source: "email" },
];

// Gasto diario acumulado del mes (muestra)
export const trend = Array.from({ length: 12 }, (_, i) => {
  const daily = [420, 180, 960, 140, 310, 90, 1240, 260, 520, 129, 1325, 181][i];
  return { day: i + 1, daily };
}).reduce<{ day: number; daily: number; total: number }[]>((acc, cur) => {
  const prev = acc.at(-1)?.total ?? 0;
  acc.push({ ...cur, total: prev + cur.daily });
  return acc;
}, []);

export const recurring: Recurring[] = [
  { id: "r1", name: "Renta", amount: 8000, day: 1, category: "Vivienda", auto: false },
  { id: "r2", name: "Netflix", amount: 219, day: 14, category: "Suscripciones", auto: true },
  { id: "r3", name: "Spotify", amount: 129, day: 10, category: "Suscripciones", auto: true },
  { id: "r4", name: "iCloud", amount: 59, day: 18, category: "Suscripciones", auto: true },
  { id: "r5", name: "Internet", amount: 599, day: 20, category: "Vivienda", auto: true },
  { id: "r6", name: "Gimnasio", amount: 609, day: 25, category: "Salud", auto: true },
];

export const insights: Insight[] = [
  {
    id: "i1",
    kind: "alerta",
    text: "Suscripciones va 13 % arriba del presupuesto. Netflix, Spotify, iCloud y el gimnasio suman 1,016 al mes.",
    date: "2026-11-12",
  },
  {
    id: "i2",
    kind: "ahorro",
    text: "Llevas 83 % del presupuesto de comida y faltan 17 días del mes. Si bajas a 3 comidas fuera por semana, cierras dentro de presupuesto.",
    date: "2026-11-12",
  },
  {
    id: "i3",
    kind: "info",
    text: "Tus gastos hormiga (menos de 150 por compra) suman 1,430 este mes, 12 % del total.",
    date: "2026-11-10",
  },
];

export const income = 28000;
