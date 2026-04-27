-- Drop precise coordinates entirely (not used by the app)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS longitude;

-- Re-grant SELECT on remaining columns (column grants reset after column drop)
GRANT SELECT ON public.profiles TO authenticated;