create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create index if not exists idx_daily_match_results_match_date_status on public.daily_match_results(match_date, status);

create or replace function public.install_daily_match_scheduler(project_url text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  job_name constant text := 'swu-date-daily-match-batch-2100-cst';
  schedule_expr constant text := '0 13 * * *';
  existing_job_id bigint;
  cron_secret text;
begin
  if project_url is null or btrim(project_url) = '' then
    raise exception 'project_url is required';
  end if;

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'daily_match_cron_secret'
   limit 1;

  if cron_secret is null then
    perform vault.create_secret(
      encode(gen_random_bytes(24), 'hex'),
      'daily_match_cron_secret',
      'SWU Date daily match batch Edge Function secret'
    );

    select decrypted_secret
      into cron_secret
      from vault.decrypted_secrets
     where name = 'daily_match_cron_secret'
     limit 1;
  end if;

  select jobid
    into existing_job_id
    from cron.job
   where jobname = job_name
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    job_name,
    schedule_expr,
    format(
      $job$
        select
          net.http_post(
            url := %L,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_match_cron_secret' limit 1)
            ),
            body := jsonb_build_object('source', 'pg_cron')
          ) as request_id;
      $job$,
      rtrim(project_url, '/') || '/functions/v1/daily-match-batch'
    )
  );

  return jsonb_build_object(
    'job_name', job_name,
    'cron', schedule_expr,
    'edge_function', 'daily-match-batch',
    'cron_secret', cron_secret,
    'next_step', 'Set DAILY_MATCH_CRON_SECRET in Edge Function secrets to the returned cron_secret value.'
  );
end;
$$;

create or replace function public.invoke_daily_match_batch_now(project_url text, round_date date default null)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  request_id bigint;
begin
  if project_url is null or btrim(project_url) = '' then
    raise exception 'project_url is required';
  end if;

  select
    net.http_post(
      url := rtrim(project_url, '/') || '/functions/v1/daily-match-batch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_match_cron_secret' limit 1)
      ),
      body := jsonb_strip_nulls(jsonb_build_object('source', 'manual_sql', 'roundDate', round_date::text))
    )
    into request_id;

  return request_id;
end;
$$;

create or replace function public.remove_daily_match_scheduler()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'swu-date-daily-match-batch-2100-cst'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

revoke all on function public.install_daily_match_scheduler(text) from public;
revoke all on function public.invoke_daily_match_batch_now(text, date) from public;
revoke all on function public.remove_daily_match_scheduler() from public;

drop policy if exists "match_preferences_select_self" on public.match_preferences;
create policy "match_preferences_select_self" on public.match_preferences
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "daily_match_results_select_self" on public.daily_match_results;
create policy "daily_match_results_select_self" on public.daily_match_results
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "daily_match_results_insert_self" on public.daily_match_results;
drop policy if exists "daily_match_results_update_self" on public.daily_match_results;
