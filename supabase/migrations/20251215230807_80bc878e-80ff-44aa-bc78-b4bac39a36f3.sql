-- Fix security definer view issue by recreating with security invoker
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;