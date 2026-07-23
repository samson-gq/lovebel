
-- 1) last_seen_at on profiles + touch RPC
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at);

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- 2) reactivation push log
CREATE TABLE IF NOT EXISTS public.reactivation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL DEFAULT 'inactive_7d'
);

CREATE INDEX IF NOT EXISTS idx_reactivation_log_user_time
  ON public.reactivation_log(user_id, sent_at DESC);

GRANT ALL ON public.reactivation_log TO service_role;
ALTER TABLE public.reactivation_log ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (bypasses RLS) reads/writes.

-- 3) Admin analytics RPC — SECURITY DEFINER, admin-only
CREATE OR REPLACE FUNCTION public.admin_analytics(days_back INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  since TIMESTAMPTZ := now() - (days_back || ' days')::INTERVAL;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT jsonb_build_object(
    'range_days', days_back,
    'totals', (
      SELECT jsonb_build_object(
        'users_total', (SELECT count(*) FROM public.profiles),
        'users_active_7d', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - INTERVAL '7 days'),
        'users_active_30d', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - INTERVAL '30 days'),
        'premium_users', (SELECT count(*) FROM public.profiles WHERE is_premium = true),
        'matches_total', (SELECT count(*) FROM public.matches),
        'messages_total', (SELECT count(*) FROM public.messages),
        'events_range', (SELECT count(*) FROM public.analytics_events WHERE created_at > since)
      )
    ),
    'dau', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'users', users) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date AS d,
               count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS users
        FROM public.analytics_events
        WHERE created_at > since
        GROUP BY 1
      ) x
    ),
    'top_events', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('event', event_type, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT event_type, count(*) AS c
        FROM public.analytics_events
        WHERE created_at > since
        GROUP BY event_type
        ORDER BY c DESC
        LIMIT 15
      ) y
    ),
    'onboarding_funnel', (
      SELECT jsonb_build_object(
        'signups', (SELECT count(*) FROM public.profiles WHERE created_at > since),
        'with_name', (SELECT count(*) FROM public.profiles WHERE created_at > since AND coalesce(name,'') <> ''),
        'with_photo', (SELECT count(*) FROM public.profiles WHERE created_at > since AND coalesce(photo_url,'') <> ''),
        'onboarding_complete', (SELECT count(*) FROM public.profiles WHERE created_at > since AND onboarding_completed = true)
      )
    ),
    'revenue_proxy', (
      SELECT jsonb_build_object(
        'premium_conversions_range', (
          SELECT count(*) FROM public.profiles
          WHERE is_premium = true AND premium_since > since
        )
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_analytics(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics(INT) TO authenticated;
