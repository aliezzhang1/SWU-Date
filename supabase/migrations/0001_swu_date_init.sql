create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text unique not null,
  nickname text not null default '新同学',
  avatar_url text,
  gender text not null default 'prefer_not_say' check (gender in ('male', 'female', 'other', 'prefer_not_say')),
  grade text,
  college text,
  bio text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz
);

create or replace function public.is_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = target_user and role = 'admin'
  );
$$;


create table if not exists public.profile_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  question_id text not null,
  answer jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, question_id)
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('like', 'skip')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, target_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.users(id) on delete cascade,
  user_b uuid not null references public.users(id) on delete cascade,
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'matched' check (status in ('matched', 'unmatched')),
  created_at timestamptz not null default timezone('utc', now()),
  matched_at timestamptz,
  unique(user_a, user_b),
  check (user_a <> user_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  is_read boolean not null default false
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (reason in ('harassment', 'fake', 'spam', 'nsfw', 'other')),
  detail text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  unique(reporter_id, reported_id)
);

create table if not exists public.blocklist (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_profile_answers_user_id on public.profile_answers(user_id);
create index if not exists idx_interactions_user_id on public.interactions(user_id);
create index if not exists idx_matches_user_a on public.matches(user_a);
create index if not exists idx_matches_user_b on public.matches(user_b);
create index if not exists idx_messages_match_id_created_at on public.messages(match_id, created_at desc);
create index if not exists idx_reports_status_created_at on public.reports(status, created_at desc);
create index if not exists idx_blocklist_blocker_id on public.blocklist(blocker_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, student_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'student_id', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  current_user uuid := auth.uid();
begin
  if current_user is null then
    raise exception 'Not authenticated';
  end if;

  delete from storage.objects
  where bucket_id = 'avatars'
    and owner = current_user;

  delete from auth.users where id = current_user;
end;
$$;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.profile_answers enable row level security;
alter table public.interactions enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocklist enable row level security;

drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated" on public.users
  for select to authenticated
  using (not is_banned or id = auth.uid());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profile_answers_select_authenticated" on public.profile_answers;
create policy "profile_answers_select_authenticated" on public.profile_answers
  for select to authenticated
  using (true);

drop policy if exists "profile_answers_insert_self" on public.profile_answers;
create policy "profile_answers_insert_self" on public.profile_answers
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profile_answers_update_self" on public.profile_answers;
create policy "profile_answers_update_self" on public.profile_answers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "interactions_select_self" on public.interactions;
create policy "interactions_select_self" on public.interactions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "interactions_insert_self" on public.interactions;
create policy "interactions_insert_self" on public.interactions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "interactions_update_self" on public.interactions;
create policy "interactions_update_self" on public.interactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "matches_select_participants" on public.matches;
create policy "matches_select_participants" on public.matches
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "matches_insert_participants" on public.matches;
create policy "matches_insert_participants" on public.matches
  for insert to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "matches_update_participants" on public.matches;
create policy "matches_update_participants" on public.matches
  for update to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.matches
      where matches.id = messages.match_id
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches
      where matches.id = messages.match_id
        and matches.status = 'matched'
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

drop policy if exists "messages_update_participants" on public.messages;
create policy "messages_update_participants" on public.messages
  for update to authenticated
  using (
    exists (
      select 1 from public.matches
      where matches.id = messages.match_id
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches
      where matches.id = messages.match_id
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reports_select_self_or_admin" on public.reports;
create policy "reports_select_self_or_admin" on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "blocklist_select_self" on public.blocklist;
create policy "blocklist_select_self" on public.blocklist
  for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "blocklist_insert_self" on public.blocklist;
create policy "blocklist_insert_self" on public.blocklist
  for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "blocklist_delete_self" on public.blocklist;
create policy "blocklist_delete_self" on public.blocklist
  for delete to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_owner" on storage.objects;
create policy "avatars_insert_owner" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_update_owner" on storage.objects;
create policy "avatars_update_owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_delete_owner" on storage.objects;
create policy "avatars_delete_owner" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

