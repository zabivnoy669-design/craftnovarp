-- Editable Nova RP Pedia sections and articles.
-- Run once in Supabase SQL Editor. Existing forum moderation is unchanged.
begin;
create table if not exists public.pedia_sections (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  title text not null check (char_length(btrim(title)) between 2 and 100),
  description text not null default '' check (char_length(description) <= 500),
  icon text not null default '◇' check (char_length(icon) <= 12),
  href text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_tool boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.pedia_sections enable row level security;
revoke all on public.pedia_sections from public, anon, authenticated;
grant select on public.pedia_sections to anon, authenticated;
grant insert, update, delete on public.pedia_sections to authenticated;
drop policy if exists pedia_sections_public_read on public.pedia_sections;
create policy pedia_sections_public_read on public.pedia_sections for select to anon, authenticated using (is_active or public.pedia_is_moderator());
drop policy if exists pedia_sections_mod_insert on public.pedia_sections;
create policy pedia_sections_mod_insert on public.pedia_sections for insert to authenticated with check (public.pedia_is_moderator());
drop policy if exists pedia_sections_mod_update on public.pedia_sections;
create policy pedia_sections_mod_update on public.pedia_sections for update to authenticated using (public.pedia_is_moderator()) with check (public.pedia_is_moderator());
drop policy if exists pedia_sections_mod_delete on public.pedia_sections;
create policy pedia_sections_mod_delete on public.pedia_sections for delete to authenticated using (public.pedia_is_moderator());

create table if not exists public.pedia_articles (
  id uuid primary key default gen_random_uuid(),
  section_slug text not null references public.pedia_sections(slug) on update cascade on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  body text not null default '' check (char_length(body) <= 50000),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.pedia_articles enable row level security;
revoke all on public.pedia_articles from public, anon, authenticated;
grant select on public.pedia_articles to anon, authenticated;
grant insert, update, delete on public.pedia_articles to authenticated;
create index if not exists pedia_articles_section_sort on public.pedia_articles(section_slug, sort_order, updated_at desc);
drop policy if exists pedia_articles_public_read on public.pedia_articles;
create policy pedia_articles_public_read on public.pedia_articles for select to anon, authenticated using (is_published or public.pedia_is_moderator());
drop policy if exists pedia_articles_mod_insert on public.pedia_articles;
create policy pedia_articles_mod_insert on public.pedia_articles for insert to authenticated with check (public.pedia_is_moderator());
drop policy if exists pedia_articles_mod_update on public.pedia_articles;
create policy pedia_articles_mod_update on public.pedia_articles for update to authenticated using (public.pedia_is_moderator()) with check (public.pedia_is_moderator());
drop policy if exists pedia_articles_mod_delete on public.pedia_articles;
create policy pedia_articles_mod_delete on public.pedia_articles for delete to authenticated using (public.pedia_is_moderator());

insert into public.pedia_sections(slug,title,description,icon,href,sort_order,is_active,is_tool) values
('start','Начало игры','Первые шаги, интерфейс и полезные советы.','◎','article.html?section=start',10,true,false),
('organizations','Организации','Государственные структуры и другие объединения.','⚑','article.html?section=organizations',20,true,false),
('jobs','Работа и профессии','Занятия, условия и способы заработка.','▤','article.html?section=jobs',30,true,false),
('transport','Транспорт','Автомобили и всё, что связано с передвижением.','↗','article.html?section=transport',40,true,false),
('items','Предметы','Снаряжение, расходники и их применение.','◇','article.html?section=items',50,true,false),
('crafts','Крафты и материалы','Рецепты, планирование и два режима расчёта.','▦','catalogs.html',60,true,true),
('weapons','Оружие','Каталог оружия Nova RP: названия, типы и проверенные значения урона.','⚔','weapons.html',70,true,true)
on conflict (slug) do nothing;


commit;
