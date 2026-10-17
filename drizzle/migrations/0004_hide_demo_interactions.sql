CREATE OR REPLACE FUNCTION public.is_real_interaction(_first uuid, _second uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
 SELECT auth.uid() IS NOT NULL
 AND auth.uid() IN (_first, _second)
 AND NOT private.is_seeded_user(_first)
 AND NOT private.is_seeded_user(_second);
$$;
REVOKE ALL ON FUNCTION public.is_real_interaction(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_real_interaction(uuid, uuid) TO authenticated, service_role;
CREATE POLICY "Hide demo matches" ON public.matches AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_real_interaction(user1_id, user2_id));
CREATE POLICY "Hide demo swipes" ON public.swipes AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_real_interaction(swiper_id, swiped_id));