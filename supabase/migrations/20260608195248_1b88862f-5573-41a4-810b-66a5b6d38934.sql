
-- Allow 'hide' as a swipe direction (anti-déjà-vu)
ALTER TABLE public.swipes DROP CONSTRAINT IF EXISTS swipes_direction_check;
ALTER TABLE public.swipes ADD CONSTRAINT swipes_direction_check
  CHECK (direction = ANY (ARRAY['like'::text, 'dislike'::text, 'superlike'::text, 'hide'::text]));

-- Boost activation RPC: 30 minutes, max 1 per day (free tier for now)
CREATE OR REPLACE FUNCTION public.activate_boost()
RETURNS TABLE(boost_until timestamptz, boost_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  prof record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.boost_until, p.boost_count, p.updated_at
    INTO prof
  FROM public.profiles p WHERE p.user_id = uid;

  IF prof.boost_until IS NOT NULL AND prof.boost_until > now() THEN
    -- Already boosted: just return current state, do not stack.
    RETURN QUERY SELECT prof.boost_until, COALESCE(prof.boost_count, 0);
    RETURN;
  END IF;

  -- Rate-limit: 1 free boost per rolling 24h, tracked via boost_count + updated_at.
  -- Simpler: count boosts from swipes_audit? We just compare last activation timestamp.
  IF prof.boost_until IS NOT NULL AND prof.boost_until > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Boost cooldown: try again later';
  END IF;

  UPDATE public.profiles
     SET boost_until = now() + interval '30 minutes',
         boost_count = COALESCE(boost_count, 0) + 1
   WHERE user_id = uid
   RETURNING profiles.boost_until, profiles.boost_count INTO prof;

  RETURN QUERY SELECT prof.boost_until, prof.boost_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_boost() TO authenticated;
