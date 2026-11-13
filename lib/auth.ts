// Acceso al panel con una contraseña única y cookie firmada (HMAC). Gratis y sin cuentas.
// Usa Web Crypto para funcionar igual en proxy.ts y en route handlers.

export const SESSION_COOKIE = "bati_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días, en segundos

type Config = { password?: string; secret?: string };

const readConfig = (): Config => ({
  password: process.env.DASHBOARD_PASSWORD,
  secret: process.env.SESSION_SECRET,
});

/** Hay contraseña y un secreto de al menos 32 caracteres. */
export function authConfigured(cfg: Config = readConfig()): boolean {
  return Boolean(cfg.password && cfg.secret && cfg.secret.length >= 32);
}

const enc = new TextEncoder();

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Compara la contraseña sin filtrar su longitud ni el tiempo de comparación. */
export async function passwordMatches(given: string, cfg: Config = readConfig()): Promise<boolean> {
  if (!authConfigured(cfg)) return false;
  const [a, b] = await Promise.all([sign(given, cfg.secret!), sign(cfg.password!, cfg.secret!)]);
  return safeEqual(a, b);
}

export async function createSessionToken(now = Date.now(), cfg: Config = readConfig()): Promise<string> {
  if (!authConfigured(cfg)) throw new Error("Auth no configurada");
  const exp = now + SESSION_MAX_AGE * 1000;
  return `${exp}.${await sign(String(exp), cfg.secret!)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
  cfg: Config = readConfig(),
): Promise<boolean> {
  if (!token || !authConfigured(cfg)) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  if (!/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(token.slice(dot + 1), await sign(exp, cfg.secret!));
}
