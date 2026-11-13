import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, authConfigured, verifySessionToken } from "@/lib/auth";

// Protege el panel. Las rutas de webhooks y cron no pasan por aquí porque
// se autentican solas (firma de Meta, secreto compartido, CRON_SECRET).
export async function proxy(request: NextRequest) {
  if (!authConfigured()) {
    // En producción sin contraseña configurada, se bloquea todo (falla cerrado).
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Configura DASHBOARD_PASSWORD y SESSION_SECRET (mínimo 32 caracteres).", {
        status: 503,
      });
    }
    return NextResponse.next(); // desarrollo local sin contraseña
  }

  if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/whatsapp|api/inbound-email|api/cron|api/login|login|_next/static|_next/image|favicon.ico).*)"],
};
