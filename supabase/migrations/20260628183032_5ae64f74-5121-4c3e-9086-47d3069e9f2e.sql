
-- Voice chat rooms (Discord-like persistent voice channels)
CREATE TABLE public.voice_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_rooms TO authenticated;
GRANT ALL ON public.voice_rooms TO service_role;
ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_rooms team read" ON public.voice_rooms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) OR public.has_full_access(auth.uid()));
CREATE POLICY "voice_rooms full insert" ON public.voice_rooms FOR INSERT TO authenticated
  WITH CHECK (public.has_full_access(auth.uid()));
CREATE POLICY "voice_rooms full update" ON public.voice_rooms FOR UPDATE TO authenticated
  USING (public.has_full_access(auth.uid())) WITH CHECK (public.has_full_access(auth.uid()));
CREATE POLICY "voice_rooms full delete" ON public.voice_rooms FOR DELETE TO authenticated
  USING (public.has_full_access(auth.uid()));

CREATE TRIGGER voice_rooms_updated_at BEFORE UPDATE ON public.voice_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Live participants (presence-tracked but persisted for visibility)
CREATE TABLE public.voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.voice_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nick text NOT NULL,
  muted boolean NOT NULL DEFAULT false,
  deafened boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_participants TO authenticated;
GRANT ALL ON public.voice_participants TO service_role;
ALTER TABLE public.voice_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_participants team read" ON public.voice_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) OR public.has_full_access(auth.uid()));
CREATE POLICY "voice_participants self insert" ON public.voice_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "voice_participants self update" ON public.voice_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_full_access(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.has_full_access(auth.uid()));
CREATE POLICY "voice_participants self delete" ON public.voice_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_full_access(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_participants;

-- Seed default voice rooms
INSERT INTO public.voice_rooms (name, position, created_by)
SELECT v.name, v.pos, (SELECT id FROM public.profiles WHERE minecraft_nick = 'Itz_Andilek' LIMIT 1)
FROM (VALUES ('General', 0), ('Vedení', 1), ('Stavění', 2)) AS v(name, pos)
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE minecraft_nick = 'Itz_Andilek')
  AND NOT EXISTS (SELECT 1 FROM public.voice_rooms WHERE name = v.name);
