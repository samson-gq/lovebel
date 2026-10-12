CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_seeded_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _uid AND email LIKE '%@lovebel.test');
$$;

CREATE OR REPLACE FUNCTION private.seeded_like_back()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction IN ('like','superlike')
     AND NOT private.is_seeded_user(NEW.swiper_id)
     AND private.is_seeded_user(NEW.swiped_id)
     AND random() < 0.2
     AND NOT EXISTS (SELECT 1 FROM public.swipes WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id)
  THEN
    INSERT INTO public.swipes (swiper_id, swiped_id, direction) VALUES (NEW.swiped_id, NEW.swiper_id, 'like');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seeded_like_back ON public.swipes;
CREATE TRIGGER trg_seeded_like_back AFTER INSERT ON public.swipes
FOR EACH ROW EXECUTE FUNCTION private.seeded_like_back();

CREATE OR REPLACE FUNCTION private.seeded_organic_likes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record; s uuid;
BEGIN
  FOR u IN
    SELECT p.user_id, p.gender FROM public.profiles p
    WHERE p.last_seen_at > now() - interval '3 days'
      AND NOT private.is_seeded_user(p.user_id)
  LOOP
    CONTINUE WHEN random() > 0.5;
    CONTINUE WHEN (SELECT count(*) FROM public.swipes WHERE swiped_id = u.user_id
                   AND created_at > now() - interval '1 day' AND private.is_seeded_user(swiper_id)) >= 8;
    s := NULL;
    SELECT sp.user_id INTO s FROM public.profiles sp
    WHERE private.is_seeded_user(sp.user_id)
      AND (u.gender IS NULL OR sp.gender IS NULL OR sp.gender <> u.gender)
      AND NOT EXISTS (SELECT 1 FROM public.swipes w WHERE w.swiper_id = sp.user_id AND w.swiped_id = u.user_id)
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id = u.user_id AND b.blocked_id = sp.user_id) OR (b.blocker_id = sp.user_id AND b.blocked_id = u.user_id))
    ORDER BY random() LIMIT 1;
    IF s IS NOT NULL THEN
      INSERT INTO public.swipes (swiper_id, swiped_id, direction)
      VALUES (s, u.user_id, CASE WHEN random() < 0.1 THEN 'superlike' ELSE 'like' END);
    END IF;
  END LOOP;
END $$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'seeded-organic-likes';
SELECT cron.schedule('seeded-organic-likes', '0 * * * *', 'SELECT private.seeded_organic_likes()');