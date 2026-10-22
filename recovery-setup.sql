-- Run AFTER forum-setup.sql in Supabase SQL Editor.
-- Recovery secrets are hashed by the Edge Function, never by a browser-only check.
begin;
create table if not exists public.pedia_recovery_secrets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 login_hash text unique not null,
 salt text not null,
 digest text not null,
 iterations integer not null default 210000 check (iterations >= 210000),
 updated_at timestamptz not null default now()
);
alter table public.pedia_recovery_secrets enable row level security;
revoke all on public.pedia_recovery_secrets from public, anon, authenticated;
grant select, insert, update, delete on public.pedia_recovery_secrets to service_role;

create table if not exists public.pedia_recovery_limits (
 bucket text primary key,
 started_at timestamptz not null default now(),
 attempts integer not null default 1
);
alter table public.pedia_recovery_limits enable row level security;
revoke all on public.pedia_recovery_limits from public, anon, authenticated;
grant select, insert, update, delete on public.pedia_recovery_limits to service_role;

create or replace function public.pedia_recovery_take_attempt(p_bucket text, p_max integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if p_max < 1 or p_max > 100 then return false; end if;
 insert into public.pedia_recovery_limits as lim (bucket, started_at, attempts)
 values (p_bucket, now(), 1)
 on conflict (bucket) do update set
  attempts = case when lim.started_at < now() - interval '15 minutes' then 1 else lim.attempts + 1 end,
  started_at = case when lim.started_at < now() - interval '15 minutes' then now() else lim.started_at end
 returning attempts into n;
 return n <= p_max;
end;
$$;
revoke all on function public.pedia_recovery_take_attempt(text,integer) from public, anon, authenticated;
grant execute on function public.pedia_recovery_take_attempt(text,integer) to service_role;
commit;
