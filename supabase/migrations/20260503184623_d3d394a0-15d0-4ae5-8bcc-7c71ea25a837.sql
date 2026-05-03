-- Extend messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_content_type_check
  CHECK (content_type IN ('text', 'image', 'gif', 'sticker'));

-- Allow recipients to mark messages as read
CREATE POLICY "Recipients can mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() <> sender_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() <> sender_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

-- Realtime for messages (and matches for read receipts)
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: is user member of match
CREATE OR REPLACE FUNCTION public.is_match_member(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id AND (m.user1_id = _user_id OR m.user2_id = _user_id)
  );
$$;

-- Storage policies: path is "{match_id}/{filename}"
CREATE POLICY "Match members can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND public.is_match_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Match members can view chat images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND public.is_match_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Match members can delete own chat images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-images'
  AND owner = auth.uid()
);