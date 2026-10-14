DO $do$
DECLARE d text; f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.search_profiles_v2','public.search_profiles','public.count_search_profiles'] LOOP
    d := pg_get_functiondef(f::regproc);
    d := replace(d, $x$AND btrim(coalesce(p.name, '')) <> ''$x$,
                    $x$AND btrim(coalesce(p.name, '')) <> '' AND NOT private.is_seeded_user(p.user_id)$x$);
    d := replace(d, $x$s2.direction = 'right'$x$, $x$s2.direction IN ('like','superlike')$x$);
    EXECUTE d;
  END LOOP;
END $do$;

CREATE OR REPLACE FUNCTION private.seeded_like_back()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$ BEGIN RETURN NEW; END $f$;
COMMENT ON FUNCTION private.seeded_like_back() IS 'DEPRECATED: demo profiles hidden; no-op';
COMMENT ON FUNCTION private.seeded_organic_likes() IS 'DEPRECATED: demo profiles hidden; cron unscheduled';

SELECT cron.unschedule('seeded-organic-likes');