
CREATE TABLE public.profile_voice_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  audio_url text NOT NULL,
  duration_sec integer NOT NULL CHECK (duration_sec > 0 AND duration_sec <= 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_voice_prompts TO authenticated;
GRANT ALL ON public.profile_voice_prompts TO service_role;

ALTER TABLE public.profile_voice_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voice prompts readable by non-blocked authenticated"
  ON public.profile_voice_prompts FOR SELECT TO authenticated
  USING (
    NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = user_id AND b.blocked_id = auth.uid())
  );

CREATE POLICY "Users can insert own voice prompt"
  ON public.profile_voice_prompts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice prompt"
  ON public.profile_voice_prompts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice prompt"
  ON public.profile_voice_prompts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_voice_prompts_updated_at
  BEFORE UPDATE ON public.profile_voice_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for voice-prompts bucket
CREATE POLICY "Voice prompts: owner can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-prompts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Voice prompts: owner can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'voice-prompts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Voice prompts: owner can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice-prompts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Voice prompts: non-blocked users can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-prompts'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = auth.uid()
        AND b.blocked_id::text = (storage.foldername(name))[1]
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id::text = (storage.foldername(name))[1]
        AND b.blocked_id = auth.uid()
    )
  );
