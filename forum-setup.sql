-- Nova RP Pedia: forum database, version 1.
-- Run the entire file in Supabase Dashboard -> SQL Editor.
-- Does not delete existing content. Uses dedicated pedia_* tables.
begin;

create table if not exists public.pedia_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pedia_moderators enable row level security;
revoke all on public.pedia_moderators from anon, authenticated;

create or replace function public.pedia_is_moderator()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists(select 1 from public.pedia_moderators where user_id = (select auth.uid()));
$$;
revoke all on function public.pedia_is_moderator() from public;
grant execute on function public.pedia_is_moderator() to anon, authenticated;

create table if not exists public.pedia_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  created_at timestamptz not null default now()
);
alter table public.pedia_profiles enable row level security;
revoke all on public.pedia_profiles from anon, authenticated;
grant select on public.pedia_profiles to anon, authenticated;
grant insert (id, display_name), update (display_name) on public.pedia_profiles to authenticated;
drop policy if exists pedia_profiles_read on public.pedia_profiles;
create policy pedia_profiles_read on public.pedia_profiles for select using (true);
drop policy if exists pedia_profiles_create on public.pedia_profiles;
create policy pedia_profiles_create on public.pedia_profiles for insert to authenticated
  with check (id = (select auth.uid()));
drop policy if exists pedia_profiles_edit on public.pedia_profiles;
create policy pedia_profiles_edit on public.pedia_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create table if not exists public.pedia_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.pedia_profiles(id),
  category text not null check (category in ('general','guides','government','ems','questions','suggestions')),
  title text not null check (char_length(btrim(title)) between 5 and 160),
  body text not null check (char_length(btrim(body)) between 10 and 30000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pedia_topics enable row level security;
revoke all on public.pedia_topics from anon, authenticated;
grant select on public.pedia_topics to anon, authenticated;
grant insert (author_id, category, title, body, status),
  update (category, title, body, status) on public.pedia_topics to authenticated;
grant delete on public.pedia_topics to authenticated;
create index if not exists pedia_topics_status_created on public.pedia_topics(status, created_at desc);
create index if not exists pedia_topics_author on public.pedia_topics(author_id);

drop policy if exists pedia_topics_read on public.pedia_topics;
create policy pedia_topics_read on public.pedia_topics for select
  using (status = 'approved' or author_id = (select auth.uid()) or public.pedia_is_moderator());
drop policy if exists pedia_topics_submit on public.pedia_topics;
create policy pedia_topics_submit on public.pedia_topics for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');
-- Only moderators can change a submitted topic. Authors cannot self-publish.
drop policy if exists pedia_topics_moderate on public.pedia_topics;
create policy pedia_topics_moderate on public.pedia_topics for update to authenticated
  using (public.pedia_is_moderator()) with check (public.pedia_is_moderator());
drop policy if exists pedia_topics_delete on public.pedia_topics;
create policy pedia_topics_delete on public.pedia_topics for delete to authenticated
  using (public.pedia_is_moderator());

create table if not exists public.pedia_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.pedia_topics(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.pedia_profiles(id),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pedia_comments enable row level security;
revoke all on public.pedia_comments from anon, authenticated;
grant select on public.pedia_comments to anon, authenticated;
grant insert (topic_id, author_id, body, status), update (body, status) on public.pedia_comments to authenticated;
grant delete on public.pedia_comments to authenticated;
create index if not exists pedia_comments_topic on public.pedia_comments(topic_id, created_at);
create index if not exists pedia_comments_status on public.pedia_comments(status);

drop policy if exists pedia_comments_read on public.pedia_comments;
create policy pedia_comments_read on public.pedia_comments for select using (
  public.pedia_is_moderator() or author_id = (select auth.uid()) or (
    status = 'approved' and exists (
      select 1 from public.pedia_topics t where t.id = topic_id and t.status = 'approved'
    )
  )
);
drop policy if exists pedia_comments_submit on public.pedia_comments;
create policy pedia_comments_submit on public.pedia_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and status = 'pending' and exists (
    select 1 from public.pedia_topics t where t.id = topic_id and t.status = 'approved'
  )
);
drop policy if exists pedia_comments_moderate on public.pedia_comments;
create policy pedia_comments_moderate on public.pedia_comments for update to authenticated
  using (public.pedia_is_moderator()) with check (public.pedia_is_moderator());
drop policy if exists pedia_comments_delete on public.pedia_comments;
create policy pedia_comments_delete on public.pedia_comments for delete to authenticated
  using (public.pedia_is_moderator());

create or replace function public.pedia_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.pedia_touch_updated_at() from public;
drop trigger if exists pedia_topics_updated on public.pedia_topics;
create trigger pedia_topics_updated before update on public.pedia_topics
  for each row execute function public.pedia_touch_updated_at();
drop trigger if exists pedia_comments_updated on public.pedia_comments;
create trigger pedia_comments_updated before update on public.pedia_comments
  for each row execute function public.pedia_touch_updated_at();

commit;
-- Moderator assignment is intentionally NOT automatic.
-- After registration, assign the verified owner's auth.users UUID using SQL Editor.
