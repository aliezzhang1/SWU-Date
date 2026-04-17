create or replace function public.install_daily_match_scheduler(project_url text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  job_name constant text := 'swu-date-daily-match-batch-2100-cst';
  schedule_expr constant text := '0 13 * * 5';
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
      'SWU Date weekly match batch Edge Function secret'
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
    'next_step', 'Set DAILY_MATCH_CRON_SECRET in Edge Function secrets to the returned cron_secret value if needed.'
  );
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

do $$
declare
  existing_command text;
  existing_project_url text;
begin
  select command
    into existing_command
    from cron.job
   where jobname = 'swu-date-daily-match-batch-2100-cst'
   limit 1;

  if existing_command is null then
    return;
  end if;

  existing_project_url := substring(existing_command from 'url := ''([^'']+)/functions/v1/daily-match-batch''');

  if existing_project_url is not null and btrim(existing_project_url) <> '' then
    perform public.install_daily_match_scheduler(existing_project_url);
  end if;
end;
$$;