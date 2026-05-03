-- Enable pg_net for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subs" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own subs" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- Trigger: notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  recipient_id uuid;
  match_row record;
  sender_name text;
  body_text text;
BEGIN
  SELECT * INTO match_row FROM public.matches WHERE id = NEW.match_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  recipient_id := CASE WHEN match_row.user1_id = NEW.sender_id THEN match_row.user2_id ELSE match_row.user1_id END;
  SELECT name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

  body_text := CASE
    WHEN NEW.content_type = 'image' THEN '📷 Изображение'
    WHEN NEW.content_type = 'gif' THEN '🎞️ GIF'
    ELSE NEW.content
  END;

  PERFORM net.http_post(
    url := 'https://ewaqzopyktesowylwtod.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_id', recipient_id,
      'title', COALESCE(sender_name, 'Новое сообщение'),
      'body', LEFT(body_text, 120),
      'url', '/chat/' || NEW.match_id::text,
      'tag', 'msg-' || NEW.match_id::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Trigger: notify on new match (both users)
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ewaqzopyktesowylwtod.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_id', NEW.user1_id,
      'title', '💘 Новый матч!',
      'body', 'У вас новое совпадение в LoveBel',
      'url', '/matches',
      'tag', 'match-' || NEW.id::text
    )
  );
  PERFORM net.http_post(
    url := 'https://ewaqzopyktesowylwtod.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_id', NEW.user2_id,
      'title', '💘 Новый матч!',
      'body', 'У вас новое совпадение в LoveBel',
      'url', '/matches',
      'tag', 'match-' || NEW.id::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_match ON public.matches;
CREATE TRIGGER trg_notify_new_match
AFTER INSERT ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.notify_new_match();