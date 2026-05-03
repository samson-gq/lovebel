-- Allow superlike direction
ALTER TABLE public.swipes DROP CONSTRAINT IF EXISTS swipes_direction_check;
ALTER TABLE public.swipes ADD CONSTRAINT swipes_direction_check
  CHECK (direction IN ('like', 'dislike', 'superlike'));

-- Update match trigger to include superlikes
CREATE OR REPLACE FUNCTION public.check_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.direction IN ('like', 'superlike') THEN
    IF EXISTS (
      SELECT 1 FROM public.swipes
      WHERE swiper_id = NEW.swiped_id
        AND swiped_id = NEW.swiper_id
        AND direction IN ('like', 'superlike')
    ) THEN
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Index for fast daily superlike count and rewind lookup
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_created
  ON public.swipes (swiper_id, created_at DESC);