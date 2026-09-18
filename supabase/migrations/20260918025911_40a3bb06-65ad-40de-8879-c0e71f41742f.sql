CREATE OR REPLACE FUNCTION public.refresh_my_study_plan(p_plan_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  PERFORM public.ensure_my_subject_targets();

  DELETE FROM public.daily_study_plan_items
  WHERE user_id = v_user_id
    AND plan_date = p_plan_date
    AND status = 'pending'
    AND pinned = false
    AND completed_at IS NULL;

  INSERT INTO public.daily_study_plan_items (
    user_id,
    plan_date,
    subject_id,
    subject_name,
    chapter_id,
    chapter_name,
    session_kind,
    target_minutes,
    priority,
    source,
    pinned,
    review_stage,
    next_review_at,
    status,
    rank_score
  )
  SELECT
    v_user_id,
    p_plan_date,
    s.id,
    s.name,
    due.chapter_id,
    due.chapter_name,
    CASE WHEN due.chapter_id IS NOT NULL THEN 'revision' ELSE 'reading' END,
    LEAST(180, GREATEST(15, COALESCE(st.daily_minutes, ROUND(s.weekly_target_hours * 60 / 7)::integer, 30))),
    CASE
      WHEN due.next_review_at IS NOT NULL AND due.next_review_at::date <= p_plan_date THEN 1
      ELSE 2
    END,
    CASE WHEN due.chapter_id IS NOT NULL THEN 'spaced_review' ELSE 'daily_target' END,
    false,
    due.review_stage,
    due.next_review_at,
    'pending',
    CASE
      WHEN due.next_review_at IS NOT NULL AND due.next_review_at::date <= p_plan_date
        THEN 1000 - EXTRACT(EPOCH FROM (due.next_review_at - now())) / 86400
      ELSE COALESCE(st.daily_minutes, 30)
    END
  FROM public.subjects s
  LEFT JOIN public.subject_targets st
    ON st.user_id = v_user_id AND st.subject_id = s.id
  LEFT JOIN LATERAL (
    SELECT cls.chapter_id, cls.chapter_name, cls.review_stage, cls.next_review_at
    FROM public.chapter_learning_state cls
    WHERE cls.user_id = v_user_id
      AND cls.subject_id = s.id
      AND cls.next_review_at::date <= p_plan_date
    ORDER BY cls.next_review_at ASC
    LIMIT 1
  ) due ON true
  WHERE s.user_id = v_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_study_plan_items existing
      WHERE existing.user_id = v_user_id
        AND existing.plan_date = p_plan_date
        AND existing.subject_id = s.id
        AND existing.status <> 'cancelled'
    )
  ORDER BY
    CASE WHEN due.next_review_at IS NOT NULL THEN 0 ELSE 1 END,
    due.next_review_at NULLS LAST,
    s.created_at
  LIMIT 8;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_study_plan(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_my_study_plan(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_study_plan(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_study_plan(date) TO service_role;