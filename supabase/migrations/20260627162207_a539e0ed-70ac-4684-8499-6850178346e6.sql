
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_role text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'normal',
  created_by uuid NOT NULL,
  created_by_nick text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks auth all" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nick text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignees auth all" ON public.task_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;

INSERT INTO public.custom_roles (name, color, permissions)
SELECT v.name, v.color, v.perms::jsonb FROM (VALUES
  ('Hlavní Helper', '#06b6d4', '{"ownTaskBoard": true}'),
  ('Hlavní Builder', '#22c55e', '{"ownTaskBoard": true}'),
  ('Hlavní Technik', '#eab308', '{"ownTaskBoard": true}'),
  ('Hlavní Developer', '#3b82f6', '{"ownTaskBoard": true}')
) AS v(name, color, perms)
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE lower(name) = lower(v.name));

UPDATE public.custom_roles
SET permissions = jsonb_build_object('ownTaskBoard', true, 'manageAllTasks', true, 'manageAll', true)
WHERE lower(name) IN ('vedení','admin');
