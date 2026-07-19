
-- Bumble mode: female sends the first message, matches expire in 24h if silent

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bumble_mode boolean NOT NULL DEFAULT true;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_message_sender uuid;

CREATE INDEX IF NOT EXISTS matches_expires_at_idx ON public.matches (expires_at)
  WHERE expires_at IS NOT NULL;

-- Trigger: set expiry when a hetero opposite-sex match is created and the female has bumble_mode on
CREATE OR REPLACE FUNCTION public.bumble_set_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g1 text; g2 text;
  bumble1 boolean; bumble2 boolean;
  female_id uuid;
BEGIN
  SELECT gender, bumble_mode INTO g1, bumble1 FROM public.profiles WHERE user_id = NEW.user1_id;
  SELECT gender, bumble_mode INTO g2, bumble2 FROM public.profiles WHERE user_id = NEW.user2_id;

  IF (g1 = 'female' AND g2 = 'male') THEN
    female_id := NEW.user1_id;
    IF bumble1 THEN NEW.expires_at := now() + interval '24 hours'; END IF;
  ELSIF (g1 = 'male' AND g2 = 'female') THEN
    female_id := NEW.user2_id;
    IF bumble2 THEN NEW.expires_at := now() + interval '24 hours'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bumble_set_expiry ON public.matches;
CREATE TRIGGER trg_bumble_set_expiry
BEFORE INSERT ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.bumble_set_expiry();

-- Trigger: enforce first-message rule + clear expiry after first message
CREATE OR REPLACE FUNCTION public.bumble_first_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  g_sender text;
  g_other text;
  other_id uuid;
  had_prior boolean;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = NEW.match_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Expired match cannot receive messages
  IF m.expires_at IS NOT NULL AND m.expires_at < now() THEN
    RAISE EXCEPTION 'Матч истёк — сообщение отправить нельзя' USING ERRCODE = 'check_violation';
  END IF;

  other_id := CASE WHEN m.user1_id = NEW.sender_id THEN m.user2_id ELSE m.user1_id END;
  SELECT gender INTO g_sender FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT gender INTO g_other FROM public.profiles WHERE user_id = other_id;

  SELECT EXISTS (
    SELECT 1 FROM public.messages
    WHERE match_id = NEW.match_id AND deleted_at IS NULL
  ) INTO had_prior;

  -- Enforce: in an active bumble window, only the female may send the FIRST message
  IF m.expires_at IS NOT NULL AND NOT had_prior THEN
    IF g_sender = 'male' AND g_other = 'female' THEN
      RAISE EXCEPTION 'Bumble: первое сообщение должна написать девушка' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Clear expiry & record first sender on the first message
  IF NOT had_prior THEN
    UPDATE public.matches
       SET expires_at = NULL,
           first_message_sender = NEW.sender_id
     WHERE id = NEW.match_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bumble_first_message ON public.messages;
CREATE TRIGGER trg_bumble_first_message
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bumble_first_message();
