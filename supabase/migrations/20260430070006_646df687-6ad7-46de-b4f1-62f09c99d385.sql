-- 1. REPORTS
CREATE TYPE public.report_reason AS ENUM (
  'inappropriate_photos','fake_profile','harassment','spam','underage','offensive_behavior','other'
);
CREATE TYPE public.report_status AS ENUM ('pending','reviewed','dismissed','action_taken');

CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason public.report_reason NOT NULL,
  comment TEXT,
  status public.report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id)
);
CREATE INDEX idx_reports_reported ON public.reports(reported_user_id);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_status ON public.reports(status);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete reports" ON public.reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. BLOCKS
CREATE TABLE public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users view own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users delete own blocks" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- 3. PHOTO MODERATION
CREATE TYPE public.moderation_status AS ENUM ('pending','approved','rejected');

ALTER TABLE public.profile_photos
  ADD COLUMN moderation_status public.moderation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN moderation_reason TEXT;

CREATE TABLE public.photo_moderation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  ai_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_photo_moderation_user ON public.photo_moderation(user_id);
CREATE INDEX idx_photo_moderation_status ON public.photo_moderation(status);
ALTER TABLE public.photo_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own photo moderation" ON public.photo_moderation FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage photo moderation" ON public.photo_moderation FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. SELFIE VERIFICATIONS
CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');

ALTER TABLE public.profiles
  ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE TABLE public.selfie_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  selfie_url TEXT NOT NULL,
  challenge_gesture TEXT NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  ai_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_selfie_verif_user ON public.selfie_verifications(user_id);
ALTER TABLE public.selfie_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verifications" ON public.selfie_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own verifications" ON public.selfie_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update verifications" ON public.selfie_verifications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. ACCOUNT DELETIONS
CREATE TABLE public.account_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  reason TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view deletions" ON public.account_deletions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Storage bucket для селфи (приватный)
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-selfies', 'verification-selfies', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own selfies" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own selfies" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-selfies' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins delete selfies" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'verification-selfies' AND public.has_role(auth.uid(), 'admin'));

-- 7. DROP + RECREATE search_profiles (меняется return type)
DROP FUNCTION IF EXISTS public.search_profiles(uuid[], integer, integer, text, text);

CREATE FUNCTION public.search_profiles(
  exclude_ids uuid[], min_age integer, max_age integer, gender_filter text, city_query text
)
RETURNS TABLE(
  id uuid, user_id uuid, name text, bio text, age integer,
  gender text, avatar_url text, interests text[], city text,
  created_at timestamptz, updated_at timestamptz, is_verified boolean
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p.id, p.user_id, p.name, p.bio, p.age, p.gender, p.avatar_url,
         p.interests, p.city, p.created_at, p.updated_at, p.is_verified
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

-- 8. count_search_profiles — добавим тот же фильтр блокировок
CREATE OR REPLACE FUNCTION public.count_search_profiles(
  exclude_ids uuid[], min_age integer, max_age integer, gender_filter text, city_query text
)
RETURNS integer
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT count(*)::int
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

-- 9. Запрет сообщений между заблокированными
DROP POLICY IF EXISTS "Users can send messages in their matches" ON public.messages;
CREATE POLICY "Users can send messages in their matches" ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = m.user1_id AND b.blocked_id = m.user2_id)
           OR (b.blocker_id = m.user2_id AND b.blocked_id = m.user1_id)
      )
  )
);