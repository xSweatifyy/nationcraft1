
-- Voice chat moderation columns
ALTER TABLE public.voice_rooms
  ADD COLUMN IF NOT EXISTS max_users int,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.voice_participants
  ADD COLUMN IF NOT EXISTS force_muted boolean NOT NULL DEFAULT false;

-- Ensure real-time payloads include full row state
ALTER TABLE public.voice_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.voice_participants REPLICA IDENTITY FULL;

-- Display role (custom role name) shown in UI; separate from app_role enum which controls auth tier
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_role text;

-- Backfill display_role from current app_role enum mapping
UPDATE public.profiles p
SET display_role = CASE ur.role
  WHEN 'vedeni' THEN 'Vedení'
  WHEN 'admin' THEN 'Admin'
  WHEN 'developer' THEN 'Developer'
END
FROM public.user_roles ur
WHERE ur.user_id = p.id AND p.display_role IS NULL;
