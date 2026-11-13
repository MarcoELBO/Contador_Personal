const currency = process.env.NEXT_PUBLIC_CURRENCY ?? "MXN";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
});

const moneyExact = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency,
  minimumFractionDigits: 2,
});

export const fmt = (n: number) => money.format(n);
export const fmtExact = (n: number) => moneyExact.format(n);

export const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
