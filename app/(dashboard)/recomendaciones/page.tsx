import { fmtDate } from "@/lib/format";
import { insights } from "@/lib/sample-data";

const tone = {
  alerta: { label: "Alerta", cls: "text-bad ring-bad/30 bg-bad/10" },
  ahorro: { label: "Ahorro", cls: "text-ok ring-ok/30 bg-ok/10" },
  info: { label: "Dato", cls: "text-amber ring-amber/30 bg-amber/10" },
} as const;

export default function RecomendacionesPage() {
  return (
    <section className="flex flex-col gap-4">
      <p className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2 text-xs text-amber">
        EJEMPLOS. Las recomendaciones calculadas con tus gastos reales llegan en la siguiente fase.
      </p>
      {insights.map((i) => (
        <article key={i.id} className="panel flex gap-4 p-5">
          <span
            className={`h-fit rounded-md px-2 py-1 text-[10px] uppercase tracking-wider ring-1 ${tone[i.kind].cls}`}
          >
            {tone[i.kind].label}
          </span>
          <div>
            <p className="text-sm leading-relaxed">{i.text}</p>
            <p className="mt-2 text-xs text-muted">{fmtDate(i.date)}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
