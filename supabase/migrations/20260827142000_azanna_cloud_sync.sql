create table if not exists public.azanna_trade_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text not null check (char_length(source_name) between 1 and 240),
  trade_count integer not null check (trade_count >= 0),
  issue_count integer not null default 0 check (issue_count >= 0),
  issues jsonb not null default '[]'::jsonb,
  config jsonb not null,
  verdict text not null,
  net_profit double precision not null,
  max_drawdown_percent double precision not null,
  profit_factor double precision,
  oos_expectancy double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.azanna_trades (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  order_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint azanna_trades_run_owner_fk
    foreign key (run_id, user_id)
    references public.azanna_trade_runs(id, user_id)
    on delete cascade,
  unique (run_id, sequence),
  unique (run_id, order_id)
);

create table if not exists public.azanna_evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null,
  verdict text not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  constraint azanna_evaluations_run_owner_fk
    foreign key (run_id, user_id)
    references public.azanna_trade_runs(id, user_id)
    on delete cascade
);

create index if not exists azanna_trade_runs_user_created_idx
  on public.azanna_trade_runs(user_id, created_at desc);
create index if not exists azanna_trades_run_sequence_idx
  on public.azanna_trades(run_id, sequence);

alter table public.azanna_trade_runs enable row level security;
alter table public.azanna_trades enable row level security;
alter table public.azanna_evaluations enable row level security;

drop policy if exists "Users manage their Azanna trade runs" on public.azanna_trade_runs;
create policy "Users manage their Azanna trade runs"
  on public.azanna_trade_runs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their Azanna trades" on public.azanna_trades;
create policy "Users manage their Azanna trades"
  on public.azanna_trades
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their Azanna evaluations" on public.azanna_evaluations;
create policy "Users manage their Azanna evaluations"
  on public.azanna_evaluations
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.azanna_trade_runs from anon;
revoke all on public.azanna_trades from anon;
revoke all on public.azanna_evaluations from anon;
grant select, insert, update, delete on public.azanna_trade_runs to authenticated;
grant select, insert, update, delete on public.azanna_trades to authenticated;
grant select, insert, update, delete on public.azanna_evaluations to authenticated;
grant usage, select on sequence public.azanna_trades_id_seq to authenticated;
