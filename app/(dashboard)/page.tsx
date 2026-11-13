import { Suspense } from "react";
import TrendChart from "@/components/TrendChart";
import { fmt, fmtDate, fmtExact } from "@/lib/format";
import { getDashboard } from "@/lib/get-dashboard";

const sourceLabel: Record<string, string> = { whatsapp: "WhatsApp", email: "Correo", manual: "Manual" };

export default function Page() {
  return (
    <Suspense fallback={<p className="panel-title animate-pulse py-10 text-center">Cargando la Baticueva…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const d = await getDashboard();
  const pct = d.totalBudget > 0 ? Math.round((d.totalSpent / d.totalBudget) * 100) : 0;
  const saved = d.income - d.totalSpent;

  return (
    <>
      {d.demo && (
        <p className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2 text-xs text-amber">
          DATOS DE EJEMPLO. Escríbele un gasto al bot de WhatsApp (por ejemplo «tacos 120») y aquí aparecerán tus datos reales.
        </p>
      )}
      {d.needsReview > 0 && (
        <p className="rounded-lg border border-warn/30 bg-warn/5 px-4 py-2 text-xs text-warn">
          {d.needsReview} movimiento{d.needsReview > 1 ? "s" : ""} del mes marcado{d.needsReview > 1 ? "s" : ""} para revisar.
        </p>
      )}
      {d.otherCurrency > 0 && (
        <p className="rounded-lg border border-line px-4 py-2 text-xs text-muted">
          {d.otherCurrency} movimiento{d.otherCurrency > 1 ? "s" : ""} en otra moneda no se suma{d.otherCurrency > 1 ? "n" : ""} a los totales.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gastado este mes" value={fmt(d.totalSpent)} sub={d.totalBudget > 0 ? `${pct} % del presupuesto` : "Sin presupuesto"} />
        <Stat label="Presupuesto" value={fmt(d.totalBudget)} sub={`Quedan ${fmt(Math.max(d.totalBudget - d.totalSpent, 0))}`} />
        <Stat label="Ingresos" value={d.income > 0 ? fmt(d.income) : "—"} sub={d.income > 0 ? "Del mes" : "Aún sin ingresos registrados"} />
        <Stat
          label="Ahorro proyectado"
          value={d.income > 0 ? fmt(saved) : "—"}
          sub={d.income > 0 ? `${Math.round((saved / d.income) * 100)} % de tus ingresos` : "Necesita ingresos"}
          tone={d.income > 0 ? (saved > 0 ? "ok" : "bad") : undefined}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="panel-title mb-3">Gasto acumulado del mes</h2>
          <TrendChart data={d.trend} budget={d.totalBudget} />
        </div>

        <div className="panel p-5">
          <h2 className="panel-title mb-4">Presupuesto por categoría</h2>
          <ul className="flex flex-col gap-4">
            {d.categories.map((c) => {
              const ratio = c.budget > 0 ? c.spent / c.budget : 0;
              const over = c.budget > 0 && ratio > 1;
              return (
                <li key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className={`num ${over ? "text-bad" : "text-muted"}`}>
                      {fmt(c.spent)}
                      {c.budget > 0 ? ` / ${fmt(c.budget)}` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(ratio, 1) * 100}%`, background: over ? "var(--bad)" : c.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="panel-title mb-3">Últimos movimientos (registrados automáticamente)</h2>
        {d.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Todavía no hay movimientos este mes.</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {t.merchant}
                    {t.needsReview && <span className="ml-2 text-[10px] uppercase tracking-wider text-warn">revisar</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDate(t.date)} · {t.category} · {sourceLabel[t.source] ?? t.source}
                  </p>
                </div>
                <span
                  className={`num text-sm ${t.kind === "income" ? "text-ok" : t.kind === "transfer" ? "text-muted" : "text-amber"}`}
                >
                  {t.kind === "income" ? "+" : t.kind === "transfer" ? "↔ " : "-"}
                  {fmtExact(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {d.transfers > 0 && (
          <p className="mt-3 text-xs text-muted">
            Transferencias entre tus cuentas este mes: {fmt(d.transfers)} (no cuentan como gasto).
          </p>
        )}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "bad";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-fg";
  return (
    <div className="panel p-5">
      <p className="panel-title">{label}</p>
      <p className={`num mt-2 text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}
