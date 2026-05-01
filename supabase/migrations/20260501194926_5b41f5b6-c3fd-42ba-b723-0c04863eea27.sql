ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS zodiac text,
  ADD COLUMN IF NOT EXISTS children text,
  ADD COLUMN IF NOT EXISTS smoking text,
  ADD COLUMN IF NOT EXISTS drinking text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_height_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_height_range CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250));
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.profile_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prompts readable by authenticated" ON public.profile_prompts;
CREATE POLICY "Prompts readable by authenticated"
  ON public.profile_prompts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own prompts" ON public.profile_prompts;
CREATE POLICY "Users insert own prompts"
  ON public.profile_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own prompts" ON public.profile_prompts;
CREATE POLICY "Users update own prompts"
  ON public.profile_prompts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own prompts" ON public.profile_prompts;
CREATE POLICY "Users delete own prompts"
  ON public.profile_prompts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_prompts_user ON public.profile_prompts(user_id, position);

CREATE OR REPLACE FUNCTION public.enforce_prompt_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.profile_prompts WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 prompts per user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_prompts_limit ON public.profile_prompts;
CREATE TRIGGER profile_prompts_limit
  BEFORE INSERT ON public.profile_prompts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prompt_limit();

DROP TRIGGER IF EXISTS profile_prompts_updated_at ON public.profile_prompts;
CREATE TRIGGER profile_prompts_updated_at
  BEFORE UPDATE ON public.profile_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP FUNCTION IF EXISTS public.search_profiles(uuid[], integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.search_profiles(exclude_ids uuid[], min_age integer, max_age integer, gender_filter text, city_query text)
 RETURNS TABLE(id uuid, user_id uuid, name text, bio text, age integer, gender text, avatar_url text, interests text[], city text, created_at timestamptz, updated_at timestamptz, is_verified boolean, height_cm integer, education text, occupation text, zodiac text, children text, smoking text, drinking text)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p.id, p.user_id, p.name, p.bio, p.age, p.gender, p.avatar_url,
         p.interests, p.city, p.created_at, p.updated_at, p.is_verified,
         p.height_cm, p.education, p.occupation, p.zodiac, p.children, p.smoking, p.drinking
  FROM public.profiles p
  WHERE (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND p.name <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (city_query IS NULL OR city_query = '' OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%')
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.user_id AND b.blocked_id = auth.uid());
$function$;