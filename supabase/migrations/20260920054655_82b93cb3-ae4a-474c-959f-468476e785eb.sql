CREATE OR REPLACE FUNCTION public.refresh_user_study_plan(p_user_id uuid, p_plan_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
#variable_conflict use_variable
DECLARE
  v_inserted integer := 0;
  v_min smallint;
  v_max smallint;
  v_intervals integer[];
  v_default_mode text;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User required'; END IF;

  SELECT COALESCE(urs.min_passes, aps.revision_min_passes, 5),
    COALESCE(urs.max_passes, aps.revision_max_passes, 10),
    COALESCE(urs.intervals, aps.revision_intervals, ARRAY[1,3,7,15,30]),
    COALESCE(urs.default_day_mode, 'all')
  INTO v_min, v_max, v_intervals, v_default_mode
  FROM public.app_settings aps
  LEFT JOIN public.user_revision_settings urs ON urs.user_id = p_user_id
  WHERE aps.id = true;

  DELETE FROM public.daily_study_plan_items dpi
  WHERE dpi.user_id = p_user_id AND dpi.plan_date = p_plan_date
    AND dpi.status = 'pending' AND dpi.pinned = false AND dpi.completed_at IS NULL;

  INSERT INTO public.daily_study_plan_items (
    user_id, plan_date, subject_id, subject_name, chapter_id, chapter_name,
    session_kind, target_minutes, priority, source, pinned, review_stage,
    next_review_at, status, rank_score, class_id
  )
  SELECT * FROM (
    SELECT p_user_id, p_plan_date, s.id, s.name, cls.chapter_id, cls.chapter_name,
      'revision'::text, LEAST(180, GREATEST(15, COALESCE(st.daily_minutes, 30))),
      1::smallint, 'spaced_review'::text, false, cls.review_stage, cls.next_review_at,
      'pending'::text,
      (1200 + LEAST(500, GREATEST(0, EXTRACT(EPOCH FROM (now() - cls.next_review_at)) / 86400 * 30))
        + COALESCE((100 - cls.last_recall) * 2, 0))::numeric,
      NULL::uuid
    FROM public.chapter_learning_state cls
    JOIN public.subjects s ON s.id = cls.subject_id AND s.user_id = p_user_id
    LEFT JOIN public.subject_targets st ON st.user_id = p_user_id AND st.subject_id = s.id
    WHERE cls.user_id = p_user_id AND cls.first_pass_completed_at IS NOT NULL
      AND cls.review_stage < v_max AND cls.next_review_at::date <= p_plan_date
      AND CASE COALESCE(st.revision_day_mode, v_default_mode)
        WHEN 'odd' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 1
        WHEN 'even' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 0 ELSE true END
    UNION ALL
    SELECT p_user_id, p_plan_date, c.subject_id, COALESCE(s.name, 'Online class'), c.chapter_id,
      COALESCE(c.chapter_name, c.title), 'notes_revision'::text,
      LEAST(180, GREATEST(15, COALESCE(c.duration_minutes, 30))), 1::smallint,
      'class_notes_revision'::text, false, cr.review_stage, cr.next_review_at,
      'pending'::text,
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
        WHEN 'even' THEN EXTRACT(ISODOW FROM p_plan_date)::int % 2 = 0 ELSE true END
    UNION ALL
    SELECT p_user_id, p_plan_date, s.id, s.name, NULL::uuid, NULL::text, 'reading'::text,
      LEAST(180, GREATEST(15, COALESCE(st.daily_minutes, ROUND(s.weekly_target_hours * 60 / 7)::integer, 30))),
      2::smallint, 'daily_target'::text, false, NULL::smallint, NULL::timestamptz,
      'pending'::text, COALESCE(st.daily_minutes, 30)::numeric, NULL::uuid
    FROM public.subjects s
    LEFT JOIN public.subject_targets st ON st.user_id = p_user_id AND st.subject_id = s.id
    WHERE s.user_id = p_user_id
  ) candidates
  WHERE NOT EXISTS (
    SELECT 1 FROM public.daily_study_plan_items e
    WHERE e.user_id = p_user_id AND e.plan_date = p_plan_date AND e.status <> 'cancelled'
      AND COALESCE(e.subject_id::text, '') = COALESCE(candidates.id::text, '')
      AND e.session_kind = candidates.session_kind
      AND COALESCE(e.chapter_id::text, '') = COALESCE(candidates.chapter_id::text, '')
      AND COALESCE(e.class_id::text, '') = COALESCE(candidates.class_id::text, '')
  )
  ORDER BY rank_score DESC LIMIT 10;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;