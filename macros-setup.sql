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

-- 7. Готовый профиль макросов SAHP (GRM1)
insert into public.pedia_macros (
  id,
  macro_uuid,
  author_name,
  category,
  title,
  description,
  hotkey,
  file_name,
  macro_code,
  tags
) values (
  '00000000-0000-4000-8000-000000005a48',
  'GRM1 · SAHP (8 макросов)',
  'SAHP',
  'government',
  'SAHP — Профиль макросов',
  'Готовый профиль SAHP (8 макросов): Жетон, Обыск, Арест, Розыск, incar/out, Миринда, Мегафон и Штраф',
  'HUD меню',
  'sahp-profile.grm.txt',
  'GRM1.eyJ2IjoxLCJraW5kIjoicHJvZmlsZSIsIm5hbWUiOiJTQUhQIiwibWFjcm9zIjpbeyJuYW1lIjoi0JbQtdGC0L7QvSIsImh1ZCI6dHJ1ZSwic3RlcHMiOlt7InR5cGUiOiJtZSIsInRleHQiOiLQu9C10LPQutC40Lwg0LTQstC40LbQtdC90LjQtdC8INC_0YDQsNCy0L7QuSDRgNGD0LrQuCDQv9C-0YLRj9C90YPQu9GB0Y8g0Log0YLQsNC60YLQuNGH0LXRgdC60L7QvNGDINC20LjQu9C10YLRgyJ9LHsidHlwZSI6Im1lIiwidGV4dCI6ItC-0YLQutC40L3Rg9C7INC60L7QttCw0L3Ri9C5INGH0LXRhdC-0Lsg0YEg0LbQtdGC0L7QvdC-0LwsINC00LXQvNC-0L3RgdGC0YDQuNGA0YPRjyDQtdCz0L4g0YfQtdC70L7QstC10LrRgyDQvdCw0L_RgNC-0YLQuNCyIn0seyJ0eXBlIjoiZG8iLCJ0ZXh0Ijoi0J3QsCDQs9GA0YPQtNC4INC30LDQutGA0LXQv9C70LXQvSDQttC10YLQvtC9IFNBSFAgLyDQktC70LDQtNC10LvQtdGGOiBOaWNrIE5hbWUuIn1dfSx7Im5hbWUiOiLQntCx0YvRgdC6IiwiaHVkIjp0cnVlLCJzdGVwcyI6W3sidHlwZSI6Im1lIiwidGV4dCI6ItC90LDQtNC10Lsg0YDQtdC30LjQvdC-0LLRi9C1INC_0LXRgNGH0LDRgtC60LgsINC_0L7RgdC70LUg0YfQtdCz0L4g0YLRidCw0YLQtdC70YzQvdC-INC-0LHRi9GB0LrQsNC7INCy0LXRgNGF0L3QuNC1INC4INC90LjQttC90LjQtSDQutCw0YDQvNCw0L3RiyDQt9Cw0LTQtdGA0LbQsNC90L3QvtCz0L4ifSx7InR5cGUiOiJtZSIsInRleHQiOiLQv9GA0L7RhdC70L7Qv9Cw0Lsg0L_QviDRjdC70LXQvNC10L3RgtCw0Lwg0L7QtNC10LbQtNGLLCDQv9GA0L7QstC10YDRj9GPINGB0LrRgNGL0YLRi9C1INC_0L7Qu9C-0YHRgtC4INC4INC_0L7Rj9GB0L3QvtC5INC-0YLQtNC10LsifSx7InR5cGUiOiJzZWFyY2gifV19LHsibmFtZSI6ItCQ0YDQtdGB0YIiLCJodWQiOnRydWUsInN0ZXBzIjpbeyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0LTQvtGB0YLQsNC7INC_0LDQutC10YIg0LTQvtC60YPQvNC10L3RgtC-0LIg0LfQsNC00LXRgNC20LDQvdC90L7Qs9C-INC4INCy0L3QtdGBINGE0LjQvdCw0LvRjNC90YvQtSDQtNCw0L3QvdGL0LUg0LIg0LHQsNC30YMg0L_RgNCw0LLQvtC-0YXRgNCw0L3QuNGC0LXQu9GM0L3Ri9GFINC-0YDQs9Cw0L3QvtCyIn0seyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0L_QtdGA0LXQtNCw0Lsg0LfQsNC00LXRgNC20LDQvdC90L7Qs9C-INC_0L7QtCDRgdGC0YDQsNC20YMg0LTQtdC20YPRgNC90L7QvNGDINGB0L7RgtGA0YPQtNC90LjQutGDINC4INC30LDRhNC40LrRgdC40YDQvtCy0LDQuyDQv9C10YDQtdC00LDRh9GDINCyINC20YPRgNC90LDQu9C1In0seyJ0eXBlIjoiZG8iLCJ0ZXh0Ijoi0JfQsNC00LXRgNC20LDQvdC90YvQuSDQvtGE0LjRhtC40LDQu9GM0L3QviDQstC30Y_RgiDQv9C-0LQg0YHRgtGA0LDQttGDINC4INC_0YDQtdC_0YDQvtCy0L7QttC00LXQvSDQsiDQvNC10YHRgtC-INC-0YLQsdGL0LLQsNC90LjRjyDQvdCw0LrQsNC30LDQvdC40Y8uIn0seyJ0eXBlIjoiYXJyZXN0In1dfSx7Im5hbWUiOiLQoNC-0LfRi9GB0LoiLCJodWQiOnRydWUsInN0ZXBzIjpbeyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0LTQvtGB0YLQsNC7INGC0LDQutGC0LjRh9C10YHQutC40Lkg0L_Qu9Cw0L3RiNC10YIg0LjQtyDQutGA0LXQv9C70LXQvdC40Y8g0L3QsCDQsdGA0L7QvdC10LbQuNC70LXRgtC1INC4INCw0LrRgtC40LLQuNGA0L7QstCw0Lsg0LHQsNC30YMg0LTQsNC90L3Ri9GFIFNBSFAifSx7InR5cGUiOiJtZSIsInRleHQiOiLQvtGC0LrRgNGL0Lsg0LLQutC70LDQtNC60YMg0YDQvtC30YvRgdC60LAsINCy0LLQtdC7INC_0YDQuNC80LXRgtGLINC_0L7QtNC-0LfRgNC10LLQsNC10LzQvtCz0L4g0Lgg0YPQutCw0LfQsNC7INC40L3QutGA0LjQvNC40L3QuNGA0YPQtdC80YvQtSDRgdGC0LDRgtGM0Lgg0KPQmiJ9LHsidHlwZSI6ImRvIiwidGV4dCI6ItCU0LDQvdC90YvQtSDRg9GB0L_QtdGI0L3QviDQvtCx0L3QvtCy0LvQtdC90YssINC_0YDQsNCy0L7QvdCw0YDRg9GI0LjRgtC10LvRjCDQvtCx0YrRj9Cy0LvQtdC9INCyINGA0L7Qt9GL0YHQui4ifV19LHsibmFtZSI6ImluY2FyL291dCIsImh1ZCI6dHJ1ZSwic3RlcHMiOlt7InR5cGUiOiJtZSIsInRleHQiOiLQvtGC0LrRgNGL0Lsg0LfQsNC00L3RjtGOINC00LLQtdGA0Ywg0L_QsNGC0YDRg9C70YzQvdC-0LPQviDQsNCy0YLQvtC80L7QsdC40LvRjyBTQUhQINC4INC_0YDQuNC00LXRgNC20LDQuyDQtdGRINGA0YPQutC-0LkifSx7InR5cGUiOiJtZSIsInRleHQiOiLQv9C-0LzQvtCzINC30LDQtNC10YDQttCw0L3QvdC-0LzRgyDQuNC30LzQtdC90LjRgtGMINC_0L7Qu9C-0LbQtdC90LjQtSwg0L_QtdGA0LXQvNC10YnQsNGPINC10LPQviDQvtGC0L3QvtGB0LjRgtC10LvRjNC90L4g0YHQsNC70L7QvdCwINC60YDRg9C30LXRgNCwIn0seyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0LfQsNGF0LvQvtC_0L3Rg9C7INC30LDQtNC90Y7RjiDQtNCy0LXRgNGMINCw0LLRgtC-0LzQvtCx0LjQu9GPLCDQt9Cw0LHQu9C-0LrQuNGA0L7QstCw0LIg0LfQsNC80LrQuCJ9XX0seyJuYW1lIjoi0JzQuNGA0LjQvdC00LAiLCJodWQiOnRydWUsInN0ZXBzIjpbeyJ0eXBlIjoic2F5IiwidGV4dCI6ItCS0Ysg0LjQvNC10LXRgtC1INC_0YDQsNCy0L4g0YXRgNCw0L3QuNGC0Ywg0LzQvtC70YfQsNC90LjQtS4g0JLRgdGRLCDRh9GC0L4g0LLRiyDRgdC60LDQttC10YLQtSwg0LzQvtC20LXRgiDQuCDQsdGD0LTQtdGCINC40YHQv9C-0LvRjNC30L7QstCw0L3QviDQv9GA0L7RgtC40LIg0LLQsNGBINCyINGB0YPQtNC1LiJ9LHsidHlwZSI6InNheSIsInRleHQiOiLQktGLINC40LzQtdC10YLQtSDQv9GA0LDQstC-INC90LAg0LDQtNCy0L7QutCw0YLQsC4g0JXRgdC70Lgg0LLRiyDQvdC1INC80L7QttC10YLQtSDQvtC_0LvQsNGC0LjRgtGMINC10LPQviDRg9GB0LvRg9Cz0LgsINC-0L0g0LHRg9C00LXRgiDQv9GA0LXQtNC-0YHRgtCw0LLQu9C10L0g0LPQvtGB0YPQtNCw0YDRgdGC0LLQvtC8LiJ9LHsidHlwZSI6InNheSIsInRleHQiOiLQktGLINC40LzQtdC10YLQtSDQv9GA0LDQstC-INC90LAg0L7QtNC40L0g0YLQtdC70LXRhNC-0L3QvdGL0Lkg0LfQstC-0L3QvtC6INC00LvQuNGC0LXQu9GM0L3QvtGB0YLRjNGOINC00L4gNSDQvNC40L3Rg9GCLiDQktCw0Lwg0L_QvtC90Y_RgtC90Ysg0LLQsNGI0Lgg0L_RgNCw0LLQsD8ifV19LHsibmFtZSI6ItCc0LXQs9Cw0YTQvtC9IiwiaHVkIjp0cnVlLCJzdGVwcyI6W3sidHlwZSI6Im1lZ2FwaG9uZSIsInRleHQiOiJTQUhQOiDQktC-0LTQuNGC0LXQu9GMINGC0YDQsNC90YHQv9C-0YDRgtC90L7Qs9C-INGB0YDQtdC00YHRgtCy0LAhINCf0YDQuNC20LzQuNGC0LXRgdGMINC6INC-0LHQvtGH0LjQvdC1INC4INC-0YHRgtCw0L3QvtCy0LjRgtC10YHRjCEifSx7InR5cGUiOiJtZWdhcGhvbmUiLCJ0ZXh0IjoiU0FIUDog0JIg0YHQu9GD0YfQsNC1INC90LXQv9C-0LTRh9C40L3QtdC90LjRjywg0L_RgNC-0YLQuNCyINCy0LDRgSDQsdGD0LTQtdGCINC_0YDQuNC80LXQvdC10L3QsCDRhNC40LfQuNGH0LXRgdC60LDRjyDRgdC40LvQsCDQuCDQvtGA0YPQttC40LUhIn1dfSx7Im5hbWUiOiLQqNGC0YDQsNGEIiwiaHVkIjp0cnVlLCJzdGVwcyI6W3sidHlwZSI6Im1lIiwidGV4dCI6ItC00L7RgdGC0LDQuyDRgdC70YPQttC10LHQvdGL0Lkg0L_Qu9Cw0L3RiNC10YIgU0FIUCwg0L_QvtGB0LvQtSDRh9C10LPQviDQsNC60YLQuNCy0LjRgNC-0LLQsNC7INCx0LDQt9GDINC00LDQvdC90YvRhSDQlNC-0YDQvtC20L3QvtCz0L4g0JrQvtC00LXQutGB0LAifSx7InR5cGUiOiJtZSIsInRleHQiOiLQstCy0LXQuyDQu9C40YfQvdGL0LUg0LTQsNC90L3Ri9C1INC90LDRgNGD0YjQuNGC0LXQu9GPLCDRg9C60LDQt9Cw0Lsg0YHRg9C80LzRgyDRiNGC0YDQsNGE0LAg0Lgg0YHRgtCw0YLRjNC4INCU0JosINC30LDRgtC10Lwg0L_QvtC00YLQstC10YDQtNC40Lsg0L7RgtC_0YDQsNCy0LrRgyJ9LHsidHlwZSI6ImRvIiwidGV4dCI6ItCt0LvQtdC60YLRgNC-0L3QvdC-0LUg0YPQstC10LTQvtC80LvQtdC90LjQtSDQviDRiNGC0YDQsNGE0LUg0LHRi9C70L4g0LDQstGC0L7QvNCw0YLQuNGH0LXRgdC60Lgg0L7RgtC_0YDQsNCy0LvQtdC90L4g0L3QsCDRgtC10LvQtdGE0L7QvSDQvdCw0YDRg9GI0LjRgtC10LvRjy4ifSx7InR5cGUiOiJmaW5lIn1dfV19',
  'SAHP, Жетон, Обыск, Арест, Розыск, incar/out, Миринда, Мегафон, Штраф, гос'
) on conflict (id) do nothing;

commit;
