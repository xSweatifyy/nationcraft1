
-- 1) custom_roles: add color
ALTER TABLE public.custom_roles ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#10b981';

-- Seed default roles (idempotent)
INSERT INTO public.custom_roles (name, color, permissions)
VALUES
  ('Vedení', '#7f1d1d', '{}'::jsonb),
  ('Admin', '#ef4444', '{}'::jsonb),
  ('Developer', '#a855f7', '{}'::jsonb)
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;

-- Make sure name is unique
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_roles_name_key') THEN
    ALTER TABLE public.custom_roles ADD CONSTRAINT custom_roles_name_key UNIQUE (name);
  END IF;
END $$;

-- Allow authenticated to read roles (already there?) ensure
GRANT SELECT ON public.custom_roles TO anon, authenticated;

-- 2) chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nick TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Only users with any role (i.e. admin panel access) can read/post
CREATE POLICY "admin users read chat"
ON public.chat_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "admin users insert chat"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

CREATE POLICY "delete own or full access"
ON public.chat_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_full_access(auth.uid()));

-- Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
