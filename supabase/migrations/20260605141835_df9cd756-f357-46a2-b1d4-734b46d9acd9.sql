
-- Edit/delete support
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages" ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members of match can view reactions" ON public.message_reactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.matches mt ON mt.id = m.match_id
    WHERE m.id = message_reactions.message_id
      AND (mt.user1_id = auth.uid() OR mt.user2_id = auth.uid())
  ));

CREATE POLICY "Members of match can add own reactions" ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.matches mt ON mt.id = m.match_id
      WHERE m.id = message_reactions.message_id
        AND (mt.user1_id = auth.uid() OR mt.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own reactions" ON public.message_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
