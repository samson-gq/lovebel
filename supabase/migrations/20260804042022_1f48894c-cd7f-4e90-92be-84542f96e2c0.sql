CREATE OR REPLACE FUNCTION public.unmatch(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id AND (m.user1_id = _uid OR m.user2_id = _uid)
  ) THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  DELETE FROM public.message_reactions r
  USING public.messages msg
  WHERE r.message_id = msg.id AND msg.match_id = _match_id;

  DELETE FROM public.messages WHERE match_id = _match_id;
  DELETE FROM public.matches WHERE id = _match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.unmatch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unmatch(uuid) TO authenticated;