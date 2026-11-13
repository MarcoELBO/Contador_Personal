// Presupuestos mensuales por categoría. Ajusta estos valores a tu realidad.
// (En una fase futura podrán editarse desde la tabla `categories`.)

export const DEFAULT_BUDGETS: Record<string, number> = {
  Comida: 4500,
  Transporte: 1800,
  Vivienda: 8000,
  Suscripciones: 900,
  Ocio: 1500,
  Salud: 1000,
};

export const CATEGORY_COLORS: Record<string, string> = {
  Comida: "#ffc83d",
  Transporte: "#3ddc97",
  Vivienda: "#5b9dff",
  Suscripciones: "#ff5d5d",
  Ocio: "#b583ff",
  Salud: "#ff9f43",
  Otros: "#7d8696",
};

export const colorFor = (category: string) => CATEGORY_COLORS[category] ?? "#7d8696";
