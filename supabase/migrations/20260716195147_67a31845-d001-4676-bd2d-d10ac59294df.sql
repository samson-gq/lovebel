CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  is_super boolean := NEW.direction = 'superlike';
  reciprocal_exists boolean;
BEGIN
  IF NEW.direction NOT IN ('like', 'superlike') THEN
    RETURN NEW;
  END IF;

  -- Skip if this like created a mutual match — the match trigger sends its own push
  SELECT EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('like', 'superlike')
  ) INTO reciprocal_exists;

  IF reciprocal_exists THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ewaqzopyktesowylwtod.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_id', NEW.swiped_id,
      'title', CASE WHEN is_super THEN '⭐ Кто-то отправил Super Like!' ELSE '❤️ Вас лайкнули!' END,
      'body', 'Загляните — возможно, это ваш новый матч',
      'url', '/likes-me',
      'tag', 'like-' || NEW.swiper_id::text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_like ON public.swipes;
CREATE TRIGGER trg_notify_new_like
AFTER INSERT ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_like();