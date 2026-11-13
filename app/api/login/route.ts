import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, passwordMatches } from "@/lib/auth";

// Freno básico contra fuerza bruta: 8 fallos por IP cada 15 minutos (por instancia).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const g = globalThis as unknown as { __loginFails?: Map<string, number[]> };
const fails: Map<string, number[]> = (g.__loginFails ??= new Map<string, number[]>());

function tooMany(ip: string, now: number): boolean {
  const recent = (fails.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(ip, recent);
  return recent.length >= MAX_FAILS;
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, request.url), 303);

  if (tooMany(ip, now)) return back("espera");

  const form = await request.formData().catch(() => null);
  const password = form?.get("password");
  if (typeof password !== "string" || !(await passwordMatches(password))) {
    fails.set(ip, [...(fails.get(ip) ?? []), now]);
    await new Promise((r) => setTimeout(r, 400));
    return back("1");
  }

  fails.delete(ip);
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
