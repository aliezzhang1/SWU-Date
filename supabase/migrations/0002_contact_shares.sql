create table if not exists public.contact_shares (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  contact_type text not null check (contact_type in ('wechat', 'qq', 'phone', 'xiaohongshu', 'other')),
  contact_value text not null check (char_length(trim(contact_value)) between 2 and 60),
  is_shared boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(match_id, user_id)
);

create index if not exists idx_contact_shares_match_id on public.contact_shares(match_id);
create index if not exists idx_contact_shares_user_id on public.contact_shares(user_id);

create or replace function public.touch_contact_share_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists contact_shares_touch_updated_at on public.contact_shares;
create trigger contact_shares_touch_updated_at
  before update on public.contact_shares
  for each row execute procedure public.touch_contact_share_updated_at();

alter table public.contact_shares enable row level security;

drop policy if exists "contact_shares_select_self" on public.contact_shares;
create policy "contact_shares_select_self" on public.contact_shares
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "contact_shares_insert_self" on public.contact_shares;
create policy "contact_shares_insert_self" on public.contact_shares
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches
      where matches.id = contact_shares.match_id
        and matches.status = 'matched'
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

drop policy if exists "contact_shares_update_self" on public.contact_shares;
create policy "contact_shares_update_self" on public.contact_shares
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches
      where matches.id = contact_shares.match_id
        and matches.status = 'matched'
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches
      where matches.id = contact_shares.match_id
        and matches.status = 'matched'
        and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

create or replace function public.get_my_contact_share_summaries()
returns table (
  match_id uuid,
  my_contact_type text,
  my_contact_value text,
  my_is_shared boolean,
  partner_is_shared boolean,
  partner_contact_type text,
  partner_contact_value text
)
language sql
stable
security definer
set search_path = public
as $$
  with my_matches as (
    select
      matches.id,
      matches.user_a,
      matches.user_b,
      case when matches.user_a = auth.uid() then matches.user_b else matches.user_a end as partner_id
    from public.matches
    where matches.status = 'matched'
      and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
  )
  select
    my_matches.id as match_id,
    my_share.contact_type as my_contact_type,
    my_share.contact_value as my_contact_value,
    coalesce(my_share.is_shared, false) as my_is_shared,
    coalesce(partner_share.is_shared, false) as partner_is_shared,
    case
      when coalesce(my_share.is_shared, false) and coalesce(partner_share.is_shared, false)
        then partner_share.contact_type
      else null
    end as partner_contact_type,
    case
      when coalesce(my_share.is_shared, false) and coalesce(partner_share.is_shared, false)
        then partner_share.contact_value
      else null
    end as partner_contact_value
  from my_matches
  left join public.contact_shares as my_share
    on my_share.match_id = my_matches.id and my_share.user_id = auth.uid()
  left join public.contact_shares as partner_share
    on partner_share.match_id = my_matches.id and partner_share.user_id = my_matches.partner_id;
$$;

revoke all on function public.get_my_contact_share_summaries() from public;
grant execute on function public.get_my_contact_share_summaries() to authenticated;
