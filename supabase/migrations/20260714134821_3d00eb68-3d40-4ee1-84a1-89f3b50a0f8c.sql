
-- Fix block filtering on profile_videos (table + storage)
DROP POLICY IF EXISTS "Profile videos readable by authenticated" ON public.profile_videos;

CREATE POLICY "Profile videos readable by authenticated"
ON public.profile_videos
FOR SELECT
TO authenticated
USING (
  NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = profile_videos.user_id)
  AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = profile_videos.user_id AND b.blocked_id = auth.uid())
);

-- Storage: drop the open duplicate SELECT policy on profile-videos bucket
DROP POLICY IF EXISTS "Profile videos readable by authenticated" ON storage.objects;

-- Recreate the restricted storage read policy with block filtering
DROP POLICY IF EXISTS "Profile videos storage readable" ON storage.objects;
CREATE POLICY "Profile videos storage readable"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-videos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profile_videos pv
      WHERE pv.storage_path = objects.name
        AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = pv.user_id)
        AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = pv.user_id AND b.blocked_id = auth.uid())
    )
  )
);
