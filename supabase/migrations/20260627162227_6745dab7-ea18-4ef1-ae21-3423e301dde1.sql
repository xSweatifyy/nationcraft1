
DROP POLICY IF EXISTS "tasks auth all" ON public.tasks;
DROP POLICY IF EXISTS "task_assignees auth all" ON public.task_assignees;

CREATE POLICY "tasks team read" ON public.tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
         OR public.has_full_access(auth.uid()));

CREATE POLICY "tasks team insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
              OR public.has_full_access(auth.uid()));

CREATE POLICY "tasks team update" ON public.tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
         OR public.has_full_access(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
              OR public.has_full_access(auth.uid()));

CREATE POLICY "tasks team delete" ON public.tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
         OR public.has_full_access(auth.uid()));

CREATE POLICY "assignees team read" ON public.task_assignees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
         OR public.has_full_access(auth.uid()));

CREATE POLICY "assignees team insert" ON public.task_assignees FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
              OR public.has_full_access(auth.uid()));

CREATE POLICY "assignees team update" ON public.task_assignees FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
         OR public.has_full_access(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
              OR public.has_full_access(auth.uid()));

CREATE POLICY "assignees team delete" ON public.task_assignees FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
         OR public.has_full_access(auth.uid()));
