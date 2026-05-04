DROP POLICY IF EXISTS "Profile videos storage readable" ON storage.objects;
CREATE POLICY "Profile videos storage readable"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-videos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.profile_videos pv
      WHERE pv.storage_path = storage.objects.name
    )
  )
);

REVOKE EXECUTE ON FUNCTION public.record_profile_view(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid) TO authenticated;