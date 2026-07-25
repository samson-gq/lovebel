ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS duration_sec integer;

CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    WHEN NEW.content_type = 'voice' THEN '🎤 Голосовое сообщение'
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
$function$;