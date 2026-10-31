-- Nova RP Pedia: раздел «Макросы игроков» со счётчиком скачиваний и лайками.
-- Выполните весь этот скрипт в Supabase Dashboard -> SQL Editor.
-- Скрипт безопасен для повторного запуска (idempotent) и не добавляет шаблонных макросов.

begin;

-- 1. Основная таблица пользовательских макросов (заполняется самими игроками)
create table if not exists public.pedia_macros (
  id uuid primary key default gen_random_uuid(),
  macro_uuid text not null default '' check (char_length(macro_uuid) <= 200),
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Аноним' check (char_length(btrim(author_name)) between 2 and 40),
  category text not null default 'other' check (category in ('government', 'crime', 'family', 'rp', 'other')),
  title text not null check (char_length(btrim(title)) between 2 and 100),
  description text not null check (char_length(btrim(description)) between 2 and 400),
  hotkey text not null default '' check (char_length(hotkey) <= 80),
  file_name text not null default '' check (char_length(file_name) <= 120),
  macro_code text not null default '' check (char_length(macro_code) <= 250000),
  tags text not null default '' check (char_length(tags) <= 200),
  downloads_count integer not null default 0 check (downloads_count >= 0),
  likes_count integer not null default 0 check (likes_count >= 0),
  reports_count integer not null default 0 check (reports_count >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedia_macros_has_payload check (
    char_length(btrim(macro_uuid)) > 0 or char_length(btrim(macro_code)) > 0
  )
);

alter table public.pedia_macros
  add column if not exists file_name text not null default '' check (char_length(file_name) <= 120);

create index if not exists pedia_macros_downloads_idx
  on public.pedia_macros (is_published, downloads_count desc, created_at desc);

create index if not exists pedia_macros_category_idx
  on public.pedia_macros (category, downloads_count desc);

create index if not exists pedia_macros_author_idx
  on public.pedia_macros (author_id);

-- Автообновление поля updated_at при редактировании макроса
create or replace function public.pedia_macros_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.category is distinct from old.category
     or new.hotkey is distinct from old.hotkey
     or new.file_name is distinct from old.file_name
     or new.macro_uuid is distinct from old.macro_uuid
     or new.macro_code is distinct from old.macro_code
     or new.tags is distinct from old.tags then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.pedia_macros_touch_updated_at() from public;

drop trigger if exists trg_pedia_macros_updated_at on public.pedia_macros;
create trigger trg_pedia_macros_updated_at
  before update on public.pedia_macros
  for each row execute function public.pedia_macros_touch_updated_at();

-- 2. Таблица лайков авторизованных пользователей
create table if not exists public.pedia_macro_likes (
  macro_id uuid not null references public.pedia_macros(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (macro_id, user_id)
);

alter table public.pedia_macro_likes enable row level security;
revoke all on public.pedia_macro_likes from anon, authenticated;
grant select, insert, delete on public.pedia_macro_likes to authenticated;

drop policy if exists pedia_macro_likes_read on public.pedia_macro_likes;
create policy pedia_macro_likes_read on public.pedia_macro_likes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 3. Права доступа (RLS) для pedia_macros
alter table public.pedia_macros enable row level security;
revoke all on public.pedia_macros from anon, authenticated;

grant select on public.pedia_macros to anon, authenticated;
grant insert (
  macro_uuid, author_id, author_name, category, title, description, hotkey, file_name, macro_code, tags
) on public.pedia_macros to anon, authenticated;
grant update (
  macro_uuid, author_name, category, title, description, hotkey, file_name, macro_code, tags, is_published
) on public.pedia_macros to authenticated;
grant delete on public.pedia_macros to authenticated;

drop policy if exists pedia_macros_read on public.pedia_macros;
create policy pedia_macros_read on public.pedia_macros
  for select
  using (
    is_published = true
    or author_id = (select auth.uid())
    or public.pedia_is_moderator()
  );

drop policy if exists pedia_macros_insert_anon on public.pedia_macros;
create policy pedia_macros_insert_anon on public.pedia_macros
  for insert to anon
  with check (
    author_id is null
    and downloads_count = 0
    and likes_count = 0
    and reports_count = 0
    and is_published = true
  );

drop policy if exists pedia_macros_insert_auth on public.pedia_macros;
create policy pedia_macros_insert_auth on public.pedia_macros
  for insert to authenticated
  with check (
    (author_id is null or author_id = (select auth.uid()))
    and downloads_count = 0
    and likes_count = 0
    and reports_count = 0
    and is_published = true
  );

drop policy if exists pedia_macros_update on public.pedia_macros;
create policy pedia_macros_update on public.pedia_macros
  for update to authenticated
  using (
    author_id = (select auth.uid())
    or public.pedia_is_moderator()
  )
  with check (
    author_id = (select auth.uid())
    or public.pedia_is_moderator()
  );

drop policy if exists pedia_macros_delete on public.pedia_macros;
create policy pedia_macros_delete on public.pedia_macros
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or public.pedia_is_moderator()
  );

-- 4. Атомарное увеличение счётчика скачиваний
create or replace function public.pedia_increment_macro_download(p_macro_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.pedia_macros
  set downloads_count = downloads_count + 1
  where id = p_macro_id and is_published = true
  returning downloads_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.pedia_increment_macro_download(uuid) from public;
grant execute on function public.pedia_increment_macro_download(uuid) to anon, authenticated;

-- 5. Переключение лайка на макросе
create or replace function public.pedia_toggle_macro_like(p_macro_id uuid, p_guest_delta integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean := false;
  v_likes integer := 0;
begin
  if v_uid is not null then
    if exists (
      select 1 from public.pedia_macro_likes
      where macro_id = p_macro_id and user_id = v_uid
    ) then
      delete from public.pedia_macro_likes
      where macro_id = p_macro_id and user_id = v_uid;

      update public.pedia_macros
      set likes_count = greatest(0, likes_count - 1)
      where id = p_macro_id
      returning likes_count into v_likes;

      v_liked := false;
    else
      insert into public.pedia_macro_likes (macro_id, user_id)
      values (p_macro_id, v_uid)
      on conflict do nothing;

      update public.pedia_macros
      set likes_count = likes_count + 1
      where id = p_macro_id
      returning likes_count into v_likes;

      v_liked := true;
    end if;
  else
    update public.pedia_macros
    set likes_count = greatest(0, likes_count + case when p_guest_delta < 0 then -1 else 1 end)
    where id = p_macro_id
    returning likes_count into v_likes;

    v_liked := (p_guest_delta >= 0);
  end if;

  return jsonb_build_object(
    'liked', v_liked,
    'likes_count', coalesce(v_likes, 0)
  );
end;
$$;

revoke all on function public.pedia_toggle_macro_like(uuid, integer) from public;
grant execute on function public.pedia_toggle_macro_like(uuid, integer) to anon, authenticated;

-- 6. Жалоба на макрос
create or replace function public.pedia_report_macro(p_macro_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reports integer;
begin
  update public.pedia_macros
  set reports_count = reports_count + 1
  where id = p_macro_id
  returning reports_count into v_reports;

  return coalesce(v_reports, 0);
end;
$$;

revoke all on function public.pedia_report_macro(uuid) from public;
grant execute on function public.pedia_report_macro(uuid) to anon, authenticated;

commit;
