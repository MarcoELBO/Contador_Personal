import { Suspense } from "react";
import { fmt } from "@/lib/format";
import { getDashboard } from "@/lib/get-dashboard";

export default function PagosPage() {
  return (
    <Suspense fallback={<p className="panel-title animate-pulse py-10 text-center">Cargando pagos…</p>}>
      <PagosContent />
    </Suspense>
  );
}

async function PagosContent() {
  const { recurring, demo } = await getDashboard();
  const total = recurring.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      {demo && (
        <p className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2 text-xs text-amber">DATOS DE EJEMPLO.</p>
      )}

      <section className="panel p-5">
        <p className="panel-title">Compromisos fijos al mes</p>
        <p className="num glow mt-2 text-3xl font-semibold text-amber">{fmt(total)}</p>
        <p className="mt-1 text-xs text-muted">
          {recurring.length} pago{recurring.length === 1 ? "" : "s"} recurrente{recurring.length === 1 ? "" : "s"}, detectados solos:
          mismo comercio en al menos dos meses con monto parecido.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="panel-title mb-3">Próximos vencimientos</h2>
        {recurring.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aún no hay pagos recurrentes. Aparecerán cuando un mismo gasto se repita en dos meses distintos.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recurring.map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="num grid h-10 w-10 place-items-center rounded-lg bg-panel2 text-sm text-amber ring-1 ring-line">
                    {String(r.day).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm">{r.name}</p>
                    <p className="text-xs text-muted">
                      {r.category} · {r.nextInDays === 0 ? "hoy" : r.nextInDays === 1 ? "mañana" : `en ${r.nextInDays} días`}
                    </p>
                  </div>
                </div>
                <span className="num text-sm">{fmt(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
