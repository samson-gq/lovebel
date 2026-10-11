INSERT INTO public.swipes (swiper_id, swiped_id, direction)
SELECT s.swiped_id, s.swiper_id, 'right'
FROM public.swipes s
WHERE s.swiper_id = '384cd5ae-c13a-418d-ad1e-6215e173c8f8'
  AND s.direction IN ('right','super')
  AND s.created_at > now() - interval '2 hours'
  AND NOT EXISTS (SELECT 1 FROM public.swipes x WHERE x.swiper_id = s.swiped_id AND x.swiped_id = s.swiper_id);