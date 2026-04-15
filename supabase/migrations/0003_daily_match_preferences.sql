create table if not exists public.match_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  max_grade_diff smallint default 1 check (max_grade_diff is null or max_grade_diff between 0 and 6),
  reminder_enabled boolean not null default true,
  reminder_hour smallint not null default 20 check (reminder_hour between 0 and 23),
  reminder_minute smallint not null default 55 check (reminder_minute between 0 and 59),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_date date not null,
  partner_id uuid references public.users(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'unmatched' check (status in ('matched', 'unmatched')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, match_date)
);

create index if not exists idx_daily_match_results_match_date on public.daily_match_results(match_date);
create index if not exists idx_daily_match_results_user_id on public.daily_match_results(user_id);

alter table public.match_preferences enable row level security;
alter table public.daily_match_results enable row level security;

drop policy if exists "match_preferences_select_self" on public.match_preferences;
create policy "match_preferences_select_self" on public.match_preferences
  for select to authenticated
  using (true);

drop policy if exists "match_preferences_insert_self" on public.match_preferences;
create policy "match_preferences_insert_self" on public.match_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "match_preferences_update_self" on public.match_preferences;
create policy "match_preferences_update_self" on public.match_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "daily_match_results_select_self" on public.daily_match_results;
create policy "daily_match_results_select_self" on public.daily_match_results
  for select to authenticated
  using (true);

drop policy if exists "daily_match_results_insert_self" on public.daily_match_results;
create policy "daily_match_results_insert_self" on public.daily_match_results
  for insert to authenticated
  with check (user_id = auth.uid() or partner_id = auth.uid());

drop policy if exists "daily_match_results_update_self" on public.daily_match_results;
create policy "daily_match_results_update_self" on public.daily_match_results
  for update to authenticated
  using (user_id = auth.uid() or partner_id = auth.uid())
  with check (user_id = auth.uid() or partner_id = auth.uid());
