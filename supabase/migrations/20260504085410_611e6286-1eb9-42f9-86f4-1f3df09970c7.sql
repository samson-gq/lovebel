DROP POLICY IF EXISTS "Users can view likes sent to them" ON public.swipes;
CREATE POLICY "Users can view likes sent to them"
ON public.swipes
FOR SELECT
TO authenticated
USING (auth.uid() = swiped_id AND direction IN ('like', 'superlike'));