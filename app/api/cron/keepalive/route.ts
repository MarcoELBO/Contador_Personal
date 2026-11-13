import { timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/supabase";

// Vercel Cron (1 vez al día, gratis en Hobby). Sirve para que Supabase gratis no se pause
// por 7 días sin actividad. Vercel envía "Authorization: Bearer <CRON_SECRET>" automáticamente.
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false; // falla cerrado
  const a = Buffer.from(`Bearer ${secret}`);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { error } = await adminClient().from("settings").select("user_id", { head: true, count: "exact" });
    if (error) throw new Error(error.code);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("keepalive falló:", err instanceof Error ? err.message : "desconocido");
    return new Response("Error", { status: 500 });
  }
}
