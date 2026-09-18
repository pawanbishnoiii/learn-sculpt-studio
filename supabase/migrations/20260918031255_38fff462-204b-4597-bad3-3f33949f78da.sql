insert into public.profiles (id, email, display_name, timezone, onboarded, onboarded_at)
values ('984c3007-36da-4b40-abce-b95566c246a6', 'a@a.a', 'A', 'Asia/Kolkata', true, now())
on conflict (id) do update set email = excluded.email, onboarded = true, updated_at = now();

insert into public.user_roles (user_id, role) values ('984c3007-36da-4b40-abce-b95566c246a6', 'admin')
on conflict (user_id, role) do nothing;

insert into public.user_settings (user_id, daily_goal_hours, weekly_goal_hours, auto_stop_hours)
values ('984c3007-36da-4b40-abce-b95566c246a6', 4, 26, 6)
on conflict (user_id) do update set updated_at = now();

insert into public.user_xp (user_id, total_xp, level)
values ('984c3007-36da-4b40-abce-b95566c246a6', 1319, 3)
on conflict (user_id) do update set total_xp = excluded.total_xp, level = excluded.level, updated_at = now();