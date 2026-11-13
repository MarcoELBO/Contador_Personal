import { Suspense } from "react";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="mx-auto grid min-h-screen max-w-sm place-items-center px-4">
      <form action="/api/login" method="POST" className="panel flex w-full flex-col gap-4 p-6">
        <div className="text-center">
          <span className="glow text-2xl text-amber">◈</span>
          <h1 className="glow text-lg font-semibold tracking-wide text-amber">BATICUEVA</h1>
          <p className="panel-title mt-1">Acceso restringido</p>
        </div>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Contraseña"
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-amber/60"
        />
        <Suspense fallback={null}>
          <LoginError searchParams={props.searchParams} />
        </Suspense>
        <button
          type="submit"
          className="rounded-lg bg-amber/10 px-3 py-2 text-sm text-amber ring-1 ring-amber/40 transition-colors hover:bg-amber/20"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

async function LoginError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="text-center text-xs text-bad">
      {error === "espera" ? "Demasiados intentos. Espera unos minutos." : "Contraseña incorrecta."}
    </p>
  );
}
