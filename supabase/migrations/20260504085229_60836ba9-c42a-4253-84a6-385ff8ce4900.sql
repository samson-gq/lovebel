-- Profile expansion for GPS, onboarding, Premium and Boost
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_plan text,
  ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS boost_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_until timestamp with time zone;

UPDATE public.profiles p
SET onboarding_completed = true
WHERE btrim(coalesce(p.name, '')) <> ''
  AND (
    p.avatar_url IS NOT NULL AND p.avatar_url <> ''
    OR EXISTS (
      SELECT 1 FROM public.profile_photos pp WHERE pp.user_id = p.user_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_boost_until ON public.profiles (boost_until);

-- Short profile videos: one active video per user
CREATE TABLE IF NOT EXISTS public.profile_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  video_url text NOT NULL,
  storage_path text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  thumbnail_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profile videos readable by authenticated" ON public.profile_videos;
CREATE POLICY "Profile videos readable by authenticated"
ON public.profile_videos
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users insert own profile video" ON public.profile_videos;
CREATE POLICY "Users insert own profile video"
ON public.profile_videos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own profile video" ON public.profile_videos;
CREATE POLICY "Users update own profile video"
ON public.profile_videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own profile video" ON public.profile_videos;
CREATE POLICY "Users delete own profile video"
ON public.profile_videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profile_videos_updated_at ON public.profile_videos;
CREATE TRIGGER update_profile_videos_updated_at
BEFORE UPDATE ON public.profile_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Profile views for "who viewed me"
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  viewed_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, viewed_id)
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view visits to their profile" ON public.profile_views;
CREATE POLICY "Users view visits to their profile"
ON public.profile_views
FOR SELECT
TO authenticated
USING (auth.uid() = viewed_id);

DROP POLICY IF EXISTS "Users record own profile views" ON public.profile_views;
CREATE POLICY "Users record own profile views"
ON public.profile_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id AND viewer_id <> viewed_id);

DROP POLICY IF EXISTS "Users update own profile views" ON public.profile_views;
CREATE POLICY "Users update own profile views"
ON public.profile_views
FOR UPDATE
TO authenticated
USING (auth.uid() = viewer_id)
WITH CHECK (auth.uid() = viewer_id AND viewer_id <> viewed_id);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views (viewed_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON public.profile_views (viewer_id);

CREATE OR REPLACE FUNCTION public.record_profile_view(_viewed_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL OR _viewed_id IS NULL OR auth.uid() = _viewed_id THEN
    RETURN;
  END IF;

  INSERT INTO public.profile_views (viewer_id, viewed_id, viewed_at)
  VALUES (auth.uid(), _viewed_id, now())
  ON CONFLICT (viewer_id, viewed_id)
  DO UPDATE SET viewed_at = excluded.viewed_at;
END;
$$;

-- Create public video storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-videos', 'profile-videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE
SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Profile videos storage readable" ON storage.objects;
CREATE POLICY "Profile videos storage readable"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-videos');

DROP POLICY IF EXISTS "Users upload own profile videos" ON storage.objects;
CREATE POLICY "Users upload own profile videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own profile videos" ON storage.objects;
CREATE POLICY "Users update own profile videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own profile videos" ON storage.objects;
CREATE POLICY "Users delete own profile videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Replace search/count RPCs with GPS-aware versions while keeping city filtering
DROP FUNCTION IF EXISTS public.search_profiles(uuid[], integer, integer, text, text);
CREATE OR REPLACE FUNCTION public.search_profiles(
  exclude_ids uuid[],
  min_age integer,
  max_age integer,
  gender_filter text,
  city_query text,
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  radius_km integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  bio text,
  age integer,
  gender text,
  avatar_url text,
  interests text[],
  city text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_verified boolean,
  height_cm integer,
  education text,
  occupation text,
  zodiac text,
  children text,
  smoking text,
  drinking text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  boost_until timestamp with time zone
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    p.id, p.user_id, p.name, p.bio, p.age, p.gender, p.avatar_url,
    p.interests, p.city, p.created_at, p.updated_at, p.is_verified,
    p.height_cm, p.education, p.occupation, p.zodiac, p.children, p.smoking, p.drinking,
    p.latitude, p.longitude,
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        6371 * acos(least(1, greatest(-1,
          cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
          + sin(radians(user_lat)) * sin(radians(p.latitude))
        )))
      ELSE NULL
    END AS distance_km,
    p.boost_until
  FROM public.profiles p
  WHERE (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND btrim(coalesce(p.name, '')) <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (city_query IS NULL OR city_query = '' OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%')
    AND (
      radius_km IS NULL OR user_lat IS NULL OR user_lng IS NULL OR p.latitude IS NULL OR p.longitude IS NULL OR
      6371 * acos(least(1, greatest(-1,
        cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(p.latitude))
      ))) <= radius_km
    )
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
  ORDER BY (p.boost_until IS NOT NULL AND p.boost_until > now()) DESC, distance_km NULLS LAST, p.created_at DESC;
$$;

DROP FUNCTION IF EXISTS public.count_search_profiles(uuid[], integer, integer, text, text);
CREATE OR REPLACE FUNCTION public.count_search_profiles(
  exclude_ids uuid[],
  min_age integer,
  max_age integer,
  gender_filter text,
  city_query text,
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  radius_km integer DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT count(*)::int
  FROM public.profiles p
  WHERE (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND btrim(coalesce(p.name, '')) <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (city_query IS NULL OR city_query = '' OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%')
    AND (
      radius_km IS NULL OR user_lat IS NULL OR user_lng IS NULL OR p.latitude IS NULL OR p.longitude IS NULL OR
      6371 * acos(least(1, greatest(-1,
        cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(p.latitude))
      ))) <= radius_km
    )
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.user_id AND b.blocked_id = auth.uid());
$$;