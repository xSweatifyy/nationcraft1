
CREATE TABLE public.chat_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_by_nick text NOT NULL,
  original_user_id uuid,
  original_nick text NOT NULL,
  original_content text NOT NULL,
  original_created_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_deletion_log TO authenticated;
GRANT ALL ON public.chat_deletion_log TO service_role;
ALTER TABLE public.chat_deletion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read deletion log" ON public.chat_deletion_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins insert deletion log" ON public.chat_deletion_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = deleted_by);

CREATE TABLE public.login_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nick text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_log TO authenticated;
GRANT ALL ON public.login_log TO service_role;
ALTER TABLE public.login_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert their own login" ON public.login_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Full access reads login log" ON public.login_log FOR SELECT TO authenticated
  USING (public.has_full_access(auth.uid()));
