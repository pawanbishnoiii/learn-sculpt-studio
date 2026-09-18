grant select, update on public.email_settings to authenticated;
grant all on public.email_settings to service_role;
grant select, insert, update, delete on public.scheduled_notifications to authenticated;
grant all on public.scheduled_notifications to service_role;
