import Nav from "@/components/Nav";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-amber/10 text-amber ring-1 ring-amber/40">
            ◈
          </span>
          <div>
            <h1 className="glow text-lg font-semibold tracking-wide text-amber">BATICUEVA</h1>
            <p className="panel-title">Centro de mando financiero</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Nav />
          <form action="/api/logout" method="POST">
            <button type="submit" className="whitespace-nowrap text-xs text-muted hover:text-fg">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
      <footer className="panel-title pb-2 text-center">
        Los registros llegan solos por WhatsApp y correo del banco
      </footer>
    </div>
  );
}
