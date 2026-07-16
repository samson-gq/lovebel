CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  event_type text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an event; if authenticated, the user_id must match their auth.uid()
-- (prevents spoofing someone else's user_id). Anonymous events (user_id IS NULL) are OK.
CREATE POLICY "insert own or anonymous events"
ON public.analytics_events FOR INSERT TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- No SELECT/UPDATE/DELETE for clients. service_role bypasses RLS for admin queries.

CREATE INDEX idx_analytics_events_type_time ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX idx_analytics_events_user_time ON public.analytics_events (user_id, created_at DESC);