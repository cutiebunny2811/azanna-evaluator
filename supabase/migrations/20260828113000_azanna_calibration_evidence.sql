create extension if not exists pgcrypto with schema extensions;

create table if not exists public.azanna_ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.azanna_calibration_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  summary jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, installation_id)
);

create table if not exists public.azanna_calibration_candidates (
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  signal_id bigint not null,
  episode_key text not null,
  candidate_at timestamptz not null,
  payload jsonb not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, installation_id, signal_id)
);

create index if not exists azanna_calibration_candidates_recent_idx
  on public.azanna_calibration_candidates(user_id, installation_id, candidate_at desc);
create index if not exists azanna_calibration_candidates_episode_idx
  on public.azanna_calibration_candidates(user_id, installation_id, episode_key);

alter table public.azanna_ingest_tokens enable row level security;
alter table public.azanna_calibration_state enable row level security;
alter table public.azanna_calibration_candidates enable row level security;

drop policy if exists "Users read their Azanna calibration state"
  on public.azanna_calibration_state;
create policy "Users read their Azanna calibration state"
  on public.azanna_calibration_state for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read their Azanna calibration candidates"
  on public.azanna_calibration_candidates;
create policy "Users read their Azanna calibration candidates"
  on public.azanna_calibration_candidates for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.azanna_ingest_tokens from anon, authenticated;
revoke all on public.azanna_calibration_state from anon;
revoke all on public.azanna_calibration_candidates from anon;
grant select on public.azanna_calibration_state to authenticated;
grant select on public.azanna_calibration_candidates to authenticated;

create or replace function public.azanna_ingest_calibration(
  p_token text,
  p_installation_id text,
  p_snapshot jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_count integer;
begin
  if p_token is null or char_length(p_token) < 32 then
    raise insufficient_privilege using message = 'Invalid Azanna ingest token';
  end if;
  if p_installation_id is null
     or char_length(p_installation_id) not between 1 and 80
     or p_installation_id !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'Invalid installation id';
  end if;
  if jsonb_typeof(p_snapshot -> 'candidates') is distinct from 'array'
     or jsonb_typeof(p_snapshot -> 'summary') is distinct from 'object' then
    raise exception 'Invalid calibration snapshot';
  end if;

  select user_id into v_user_id
  from public.azanna_ingest_tokens
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and revoked_at is null;

  if v_user_id is null then
    raise insufficient_privilege using message = 'Invalid Azanna ingest token';
  end if;

  update public.azanna_ingest_tokens
  set last_used_at = now()
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  insert into public.azanna_calibration_state(
    user_id, installation_id, summary, generated_at, synced_at
  ) values (
    v_user_id,
    p_installation_id,
    p_snapshot -> 'summary',
    (p_snapshot ->> 'generated_at')::timestamptz,
    now()
  )
  on conflict (user_id, installation_id) do update set
    summary = excluded.summary,
    generated_at = excluded.generated_at,
    synced_at = excluded.synced_at;

  insert into public.azanna_calibration_candidates(
    user_id, installation_id, signal_id, episode_key,
    candidate_at, payload, synced_at
  )
  select
    v_user_id,
    p_installation_id,
    (item ->> 'signal_id')::bigint,
    item ->> 'episode_key',
    (item ->> 'created_at')::timestamptz,
    item,
    now()
  from jsonb_array_elements(p_snapshot -> 'candidates') item
  on conflict (user_id, installation_id, signal_id) do update set
    episode_key = excluded.episode_key,
    candidate_at = excluded.candidate_at,
    payload = excluded.payload,
    synced_at = excluded.synced_at;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'candidates', v_count);
end;
$$;

revoke all on function public.azanna_ingest_calibration(text, text, jsonb)
  from public;
grant execute on function public.azanna_ingest_calibration(text, text, jsonb)
  to anon, authenticated;
