create or replace function public.close_stale_sessions()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  with stale as (
    select s.id,
           s.started_at + make_interval(hours => coalesce(us.auto_stop_hours, 6)) as ends_at
    from public.study_sessions s
    left join public.user_settings us on us.user_id = s.user_id
    where s.is_running
      and s.started_at + make_interval(hours => coalesce(us.auto_stop_hours, 6)) < now()
  ), closed as (
    update public.study_sessions s
    set is_running = false,
        auto_closed = true,
        ended_at = st.ends_at,
        duration_minutes = greatest(0,
          ceil(extract(epoch from (st.ends_at - s.started_at)) / 60)::int - coalesce(s.break_minutes, 0)),
        duration_seconds = greatest(0,
          extract(epoch from (st.ends_at - s.started_at))::int - coalesce(s.break_minutes, 0) * 60)
    from stale st
    where s.id = st.id
    returning s.id
  )
  update public.session_breaks b
  set ended_at = st.ends_at,
      duration_minutes = greatest(0, ceil(extract(epoch from (st.ends_at - b.started_at)) / 60)::int)
  from stale st
  join closed c on c.id = st.id
  where b.session_id = st.id and b.ended_at is null;
end;
$$;

revoke all on function public.close_stale_sessions() from public, anon, authenticated;
grant execute on function public.close_stale_sessions() to service_role;

drop function if exists public.admin_export_user(uuid);
drop function if exists public.admin_user_detail(uuid);
drop function if exists public.admin_import_user(uuid, jsonb);
