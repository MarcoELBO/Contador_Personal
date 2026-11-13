-- Esquema de Baticueva. Ejecutar en el SQL Editor de Supabase.
-- Uso personal: cada fila pertenece a un usuario (auth.uid()) y RLS bloquea el resto.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  monthly_budget numeric(12,2) not null default 0,
  color text not null default '#ffc83d',
  unique (user_id, name)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'MXN',
  merchant text,
  category text,
  -- expense: cuenta como gasto. income: ingreso. transfer: movimiento entre tus cuentas
  -- (p. ej. pagar tu tarjeta); NO cuenta como gasto para no duplicar. El dashboard suma solo 'expense'.
  kind text not null default 'expense' check (kind in ('expense', 'income', 'transfer')),
  method text,
  source text not null check (source in ('whatsapp', 'email', 'manual')),
  raw_text text,
  confidence real,
  dedupe_key text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date on transactions (user_id, date desc);
create unique index if not exists transactions_dedupe on transactions (user_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  category text,
  auto_detected boolean not null default false
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('alerta', 'ahorro', 'info')),
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  currency text not null default 'MXN',
  monthly_income numeric(12,2),
  whatsapp_number text unique
);

-- Row Level Security: cada usuario solo ve y modifica sus filas.
alter table categories enable row level security;
alter table transactions enable row level security;
alter table recurring_payments enable row level security;
alter table insights enable row level security;
alter table settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','transactions','recurring_payments','insights','settings']
  loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
