ALTER PUBLICATION supabase_realtime ADD TABLE public.popular_cities;
ALTER TABLE public.popular_cities REPLICA IDENTITY FULL;