-- Nova RP Pedia: синхронизация профилей, достижений и общего списка аккаунтов.
-- Выполните весь этот скрипт в Supabase Dashboard -> SQL Editor (после forum-setup.sql).
-- Скрипт ничего не удаляет: он добавляет поля достижений в pedia_profiles и переносит уже созданные аккаунты.

begin;

-- 1. Переносим все существующие аккаунты из auth.users в публичный реестр pedia_profiles (если каких-то там ещё не было)
insert into public.pedia_profiles (id, display_name, created_at)
select
  u.id,
  case
    when char_length(btrim(coalesce(u.raw_user_meta_data->>'display_name', ''))) between 2 and 40
      then btrim(u.raw_user_meta_data->>'display_name')
    else 'Участник'
  end,
  coalesce(u.created_at, now())
from auth.users u
on conflict (id) do nothing;

-- 2. Автоматически добавляем каждый новый зарегистрированный аккаунт в pedia_profiles
create or replace function public.pedia_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := btrim(coalesce(new.raw_user_meta_data->>'display_name', ''));
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    v_name := 'Участник';
  end if;
  insert into public.pedia_profiles (id, display_name, created_at)
  values (new.id, v_name, coalesce(new.created_at, now()))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.pedia_handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_pedia on auth.users;
create trigger on_auth_user_created_pedia
  after insert on auth.users
  for each row execute function public.pedia_handle_new_user();

-- 3. Расширяем pedia_profiles полями досье, опыта (XP) и открытых достижений для общего списка игроков
alter table public.pedia_profiles
  add column if not exists avatar text not null default '◈' check (char_length(avatar) between 1 and 12),
  add column if not exists faction text not null default 'civilian' check (char_length(faction) between 1 and 32),
  add column if not exists equipped_title text not null default 'Гражданин штата' check (char_length(equipped_title) between 1 and 60),
  add column if not exists motto text not null default '' check (char_length(motto) <= 160),
  add column if not exists xp integer not null default 0 check (xp between 0 and 100000),
  add column if not exists achievements_count integer not null default 0 check (achievements_count between 0 and 200),
  add column if not exists unlocked_achievements jsonb not null default '{}'::jsonb check (jsonb_typeof(unlocked_achievements) = 'object'),
  add column if not exists updated_at timestamptz not null default now();

grant select on public.pedia_profiles to anon, authenticated;
grant insert (
  id, display_name, avatar, faction, equipped_title, motto, xp, achievements_count, unlocked_achievements
), update (
  display_name, avatar, faction, equipped_title, motto, xp, achievements_count, unlocked_achievements, updated_at
) on public.pedia_profiles to authenticated;

drop policy if exists pedia_profiles_read on public.pedia_profiles;
create policy pedia_profiles_read on public.pedia_profiles
  for select using (true);

drop policy if exists pedia_profiles_create on public.pedia_profiles;
create policy pedia_profiles_create on public.pedia_profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists pedia_profiles_edit on public.pedia_profiles;
create policy pedia_profiles_edit on public.pedia_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create index if not exists pedia_profiles_xp_idx on public.pedia_profiles (xp desc, created_at asc);

-- 4. Личная таблица прогресса аккаунта (серии /try, посещённые вкладки и флаги синхронизируются между устройствами)
create table if not exists public.pedia_user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.pedia_user_progress enable row level security;
revoke all on public.pedia_user_progress from public, anon, authenticated;
grant select, insert, update on public.pedia_user_progress to authenticated;

drop policy if exists pedia_user_progress_own on public.pedia_user_progress;
create policy pedia_user_progress_own on public.pedia_user_progress
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
