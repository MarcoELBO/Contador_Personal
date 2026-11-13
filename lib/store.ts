// Almacén de movimientos. Usa Supabase si hay credenciales y, si no, una copia en memoria
// (solo para simular en local sin cuentas; se pierde al reiniciar).

import { adminClient } from "./supabase";

export type Source = "whatsapp" | "email" | "manual";

export type Kind = "expense" | "income" | "transfer";

export type NewTx = {
  date: string;
  amount: number;
  currency?: string;
  kind: Kind;
  merchant: string;
  category: string;
  source: Source;
  raw_text: string | null;
  confidence: number;
  needs_review: boolean;
  /** Clave de idempotencia: "wa:<id del mensaje>", "em:<id del correo>". */
  dedupe_key: string | null;
};

export type Tx = NewTx & { id: string; created_at: string };

export interface Store {
  /** Devuelve null si ya existía una fila con el mismo dedupe_key. */
  insert(tx: NewTx): Promise<Tx | null>;
  recent(sinceDate: string): Promise<Tx[]>;
  /** Borra y devuelve el último movimiento de esa fuente. */
  removeLast(source: Source): Promise<Tx | null>;
}

// ---------- Memoria ----------
class MemoryStore implements Store {
  private rows: Tx[] = [];
  private seq = 0;

  async insert(tx: NewTx) {
    if (tx.dedupe_key && this.rows.some((r) => r.dedupe_key === tx.dedupe_key)) return null;
    const row: Tx = { ...tx, id: `mem-${++this.seq}`, created_at: new Date().toISOString() };
    this.rows.push(row);
    return row;
  }
  async recent(sinceDate: string) {
    return this.rows.filter((r) => r.date >= sinceDate);
  }
  async removeLast(source: Source) {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.rows[i].source === source) return this.rows.splice(i, 1)[0];
    }
    return null;
  }
  clear() {
    this.rows = [];
    this.seq = 0;
  }
}

// ---------- Supabase ----------
class SupabaseStore implements Store {
  constructor(private owner: string) {}

  async insert(tx: NewTx) {
    const { data, error } = await adminClient()
      .from("transactions")
      .insert({ ...tx, user_id: this.owner })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return null; // unique_violation en dedupe_key
      throw new Error(`No se pudo guardar el movimiento (${error.code})`);
    }
    return data as Tx;
  }
  async recent(sinceDate: string) {
    const { data, error } = await adminClient()
      .from("transactions")
      .select("*")
      .eq("user_id", this.owner)
      .gte("date", sinceDate);
    if (error) throw new Error(`No se pudo leer movimientos (${error.code})`);
    return (data ?? []) as Tx[];
  }
  async removeLast(source: Source) {
    const db = adminClient();
    const { data } = await db
      .from("transactions")
      .select("*")
      .eq("user_id", this.owner)
      .eq("source", source)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const { error } = await db.from("transactions").delete().eq("id", data.id).eq("user_id", this.owner);
    if (error) throw new Error(`No se pudo borrar el movimiento (${error.code})`);
    return data as Tx;
  }
}

const g = globalThis as unknown as { __batiMemory?: MemoryStore };

/** true si hay Supabase configurado (los datos sobreviven a reinicios). */
export function storeIsPersistent(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OWNER_USER_ID,
  );
}

export function getStore(): Store {
  if (storeIsPersistent()) return new SupabaseStore(process.env.OWNER_USER_ID!);
  // En producción la memoria se borra en cada arranque del servidor: mejor fallar que perder gastos en silencio.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase no está configurado (faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY u OWNER_USER_ID)");
  }
  return (g.__batiMemory ??= new MemoryStore());
}

/** Solo para tests. */
export function resetMemoryStore() {
  g.__batiMemory?.clear();
}
