ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS revision_min_passes smallint NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS revision_max_passes smallint NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS revision_intervals integer[] NOT NULL DEFAULT ARRAY[1,3,7,15,30];

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS background_style text NOT NULL DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS timer_background_effects boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_show_details boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_sounds_haptics boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_keep_awake boolean NOT NULL DEFAULT false;

ALTER TABLE public.subject_targets
  ADD COLUMN IF NOT EXISTS revision_day_mode text NOT NULL DEFAULT 'all';

CREATE TABLE IF NOT EXISTS public.user_revision_settings (
  user_id uuid PRIMARY KEY,
  min_passes smallint,
  max_passes smallint,
  intervals integer[],
  default_day_mode text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_revision_settings_min CHECK (min_passes IS NULL OR min_passes BETWEEN 5 AND 10),
  CONSTRAINT user_revision_settings_max CHECK (max_passes IS NULL OR max_passes BETWEEN 5 AND 10),
  CONSTRAINT user_revision_settings_order CHECK (min_passes IS NULL OR max_passes IS NULL OR min_passes <= max_passes),
  CONSTRAINT user_revision_settings_mode CHECK (default_day_mode IS NULL OR default_day_mode IN ('all','odd','even'))
);
GRANT SELECT ON public.user_revision_settings TO authenticated;
GRANT ALL ON public.user_revision_settings TO service_role;
ALTER TABLE public.user_revision_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own revision settings" ON public.user_revision_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_revision_settings_set_updated_at BEFORE UPDATE ON public.user_revision_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  user_ids uuid[] NOT NULL DEFAULT '{}',
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_emails_audience CHECK (audience IN ('all','active','picked')),
  CONSTRAINT scheduled_emails_status CHECK (status IN ('pending','sending','sent','failed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_emails TO authenticated;
GRANT ALL ON public.scheduled_emails TO service_role;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scheduled emails" ON public.scheduled_emails FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS scheduled_emails_due_idx ON public.scheduled_emails(status, send_at);
CREATE TRIGGER scheduled_emails_set_updated_at BEFORE UPDATE ON public.scheduled_emails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text,
  size_bytes bigint NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT export_history_status CHECK (status IN ('creating','ready','failed','expired'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_history TO authenticated;
GRANT ALL ON public.export_history TO service_role;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own export history" ON public.export_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS export_history_owner_idx ON public.export_history(user_id, created_at DESC);
CREATE TRIGGER export_history_set_updated_at BEFORE UPDATE ON public.export_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.transfer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfer_audit_action CHECK (action IN ('export','import')),
  CONSTRAINT transfer_audit_status CHECK (status IN ('completed','failed'))
);
GRANT SELECT ON public.transfer_audit TO authenticated;
GRANT ALL ON public.transfer_audit TO service_role;
ALTER TABLE public.transfer_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transfer activity" ON public.transfer_audit FOR SELECT TO authenticated USING (auth.uid() = target_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS transfer_audit_target_idx ON public.transfer_audit(target_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.refresh_user_study_plan(p_user_id uuid, p_plan_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_min smallint;
  v_max smallint;
  v_intervals integer[];
  v_default_mode text;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User required'; END IF;

  SELECT
    COALESCE(urs.min_passes, aps.revision_min_passes, 5),
    COALESCE(urs.max_passes, aps.revision_max_passes, 10),
    COALESCE(urs.intervals, aps.revision_intervals, ARRAY[1,3,7,15,30]),
    COALESCE(urs.default_day_mode, 'all')
  INTO v_min, v_max, v_intervals, v_default_mode
  FROM public.app_settings aps
  LEFT JOIN public.user_revision_settings urs ON urs.user_id = p_user_id
  WHERE aps.id = true;

  DELETE FROM public.daily_study_plan_items
  WHERE user_id = p_user_id AND plan_date = p_plan_date
    AND status = 'pending' AND pinned = false AND completed_at IS NULL;

  INSERT INTO public.daily_study_plan_items (
    user_id, plan_date, subject_id, subject_name, chapter_id, chapter_name,
    session_kind, target_minutes, priority, source, pinned, review_stage,
    next_review_at, status, rank_score, class_id
  )
  SELECT * FROM (
    SELECT
      p_user_id, p_plan_date, s.id, s.name, cls.chapter_id, cls.chapter_name,
      'revision'::text, LEAST(180, GREATEST(15, COALESCE(st.daily_minutes, 30))),
      1::smallint, 'spaced_review'::text, false, cls.review_stage,
      cls.next_review_at, 'pending'::text,
      (1200 + LEAST(500, GREATEST(0, EXTRACT(EPOCH FROM (now() - cls.next_review_at)) / 86400 * 30))
        + COALESCE((100 - cls.last_recall) * 2, 0))::numeric,
      NULL::uuid
    FROM public.chapter_learning_state cls
    JOIN public.subjects s ON s.id = cls.subject_id AND s.user_id = p_user_id
    LEFT JOIN public.subject_targets st ON st.user_id = p_user_id AND st.subject_id = s.id
    WHERE cls.user_id = p_user_id
      AND cls.first_pass_completed_at IS NOT NULL
      AND cls.review_stage < v_max
      AND cls.next_review_at::date <= p_plan_date
      AND CASE COALESCE(st.revision_day_mode, v_default_mode)
        WHEN 'odd' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 1
        WHEN 'even' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 0
        ELSE true END

    UNION ALL

    SELECT
      p_user_id, p_plan_date, c.subject_id, COALESCE(s.name, 'Online class'), c.chapter_id,
      COALESCE(c.chapter_name, c.title), 'notes_revision'::text,
      LEAST(180, GREATEST(15, COALESCE(c.duration_minutes, 30))),
      1::smallint, 'class_notes_revision'::text, false, cr.review_stage,
      cr.next_review_at, 'pending'::text,
      (1150 + LEAST(500, GREATEST(0, EXTRACT(EPOCH FROM (now() - cr.next_review_at)) / 86400 * 30)))::numeric,
      c.id
    FROM public.class_note_revision_state cr
    JOIN public.online_classes c ON c.id = cr.class_id AND c.user_id = p_user_id
    LEFT JOIN public.subjects s ON s.id = c.subject_id
    LEFT JOIN public.subject_targets st ON st.user_id = p_user_id AND st.subject_id = c.subject_id
    WHERE cr.user_id = p_user_id
      AND cr.revisions_done < LEAST(v_max, GREATEST(v_min, cr.target_revisions))
      AND cr.next_review_at::date <= p_plan_date
      AND CASE COALESCE(st.revision_day_mode, v_default_mode)
        WHEN 'odd' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 1
        WHEN 'even' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 0
        ELSE true END

    UNION ALL

    SELECT
      p_user_id, p_plan_date, s.id, s.name, NULL::uuid, NULL::text,
      'reading'::text, LEAST(180, GREATEST(15, COALESCE(st.daily_minutes, ROUND(s.weekly_target_hours * 60 / 7)::integer, 30))),
      2::smallint, 'daily_target'::text, false, NULL::smallint, NULL::timestamptz,
      'pending'::text, COALESCE(st.daily_minutes, 30)::numeric, NULL::uuid
    FROM public.subjects s
    LEFT JOIN public.subject_targets st ON st.user_id = p_user_id AND st.subject_id = s.id
    WHERE s.user_id = p_user_id
  ) candidates
  WHERE NOT EXISTS (
    SELECT 1 FROM public.daily_study_plan_items e
    WHERE e.user_id = p_user_id AND e.plan_date = p_plan_date
      AND e.status <> 'cancelled'
      AND COALESCE(e.subject_id::text, '') = COALESCE(candidates.id::text, '')
      AND e.session_kind = candidates.session_kind
      AND COALESCE(e.chapter_id::text, '') = COALESCE(candidates.chapter_id::text, '')
      AND COALESCE(e.class_id::text, '') = COALESCE(candidates.class_id::text, '')
  )
  ORDER BY rank_score DESC
  LIMIT 10;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_user_study_plan(uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_user_study_plan(uuid,date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_my_study_plan(p_plan_date date DEFAULT CURRENT_DATE)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  RETURN public.refresh_user_study_plan(auth.uid(), p_plan_date);
END;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_my_study_plan(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_my_revision(p_state_id uuid, p_kind text, p_minutes integer DEFAULT 15)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_stage integer;
  v_intervals integer[];
  v_next timestamptz;
BEGIN
  SELECT COALESCE(urs.intervals, aps.revision_intervals, ARRAY[1,3,7,15,30])
  INTO v_intervals
  FROM public.app_settings aps
  LEFT JOIN public.user_revision_settings urs ON urs.user_id = auth.uid()
  WHERE aps.id = true;

  IF p_kind = 'class' THEN
    UPDATE public.class_note_revision_state
    SET review_stage = LEAST(review_stage + 1, COALESCE(array_length(v_intervals,1),5) - 1),
        revisions_done = revisions_done + 1,
        total_minutes = total_minutes + GREATEST(1,p_minutes),
        last_revised_at = now(), updated_at = now()
    WHERE id = p_state_id AND user_id = auth.uid()
    RETURNING review_stage INTO v_stage;
    IF NOT FOUND THEN RAISE EXCEPTION 'Revision not found'; END IF;
    v_next := now() + make_interval(days => COALESCE(v_intervals[v_stage + 1], v_intervals[array_length(v_intervals,1)], 30));
    UPDATE public.class_note_revision_state SET next_review_at = v_next WHERE id = p_state_id AND user_id = auth.uid();
  ELSE
    UPDATE public.chapter_learning_state
    SET review_stage = LEAST(review_stage + 1, COALESCE(array_length(v_intervals,1),5) - 1),
        revision_minutes = revision_minutes + GREATEST(1,p_minutes),
        revision_sessions = revision_sessions + 1,
        last_studied_at = now(), updated_at = now()
    WHERE id = p_state_id AND user_id = auth.uid()
    RETURNING review_stage INTO v_stage;
    IF NOT FOUND THEN RAISE EXCEPTION 'Revision not found'; END IF;
    v_next := now() + make_interval(days => COALESCE(v_intervals[v_stage + 1], v_intervals[array_length(v_intervals,1)], 30));
    UPDATE public.chapter_learning_state SET next_review_at = v_next WHERE id = p_state_id AND user_id = auth.uid();
  END IF;
  RETURN v_next;
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_my_revision(uuid,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_all_daily_plans(p_plan_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; total integer := 0; n integer;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    n := public.refresh_user_study_plan(r.id, p_plan_date);
    total := total + COALESCE(n,0);
  END LOOP;
  RETURN total;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_all_daily_plans(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_all_daily_plans(date) TO service_role;