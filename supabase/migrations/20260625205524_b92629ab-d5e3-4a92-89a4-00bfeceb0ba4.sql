
-- Enum rolí
CREATE TYPE public.app_role AS ENUM ('vedeni', 'admin', 'developer');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  minecraft_nick TEXT UNIQUE NOT NULL,
  full_access BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role function (SECURITY DEFINER aby se obešlo RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- has_full_access (Vedení role NEBO full_access flag)
CREATE OR REPLACE FUNCTION public.has_full_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'vedeni'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND full_access = true
  )
$$;

-- team_members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minecraft_nick TEXT NOT NULL,
  role_name TEXT NOT NULL,
  email TEXT,
  instagram TEXT,
  discord TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team public read" ON public.team_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team full-access write" ON public.team_members FOR ALL TO authenticated
  USING (public.has_full_access(auth.uid()))
  WITH CHECK (public.has_full_access(auth.uid()));

-- recruitments
CREATE TABLE public.recruitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitments TO authenticated;
GRANT ALL ON public.recruitments TO service_role;
ALTER TABLE public.recruitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruitments public read" ON public.recruitments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "recruitments full-access write" ON public.recruitments FOR ALL TO authenticated
  USING (public.has_full_access(auth.uid()))
  WITH CHECK (public.has_full_access(auth.uid()));

-- vote_links
CREATE TABLE public.vote_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vote_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vote_links TO authenticated;
GRANT ALL ON public.vote_links TO service_role;
ALTER TABLE public.vote_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vote public read" ON public.vote_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "vote full-access write" ON public.vote_links FOR ALL TO authenticated
  USING (public.has_full_access(auth.uid()))
  WITH CHECK (public.has_full_access(auth.uid()));

-- site_content (key/value)
CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content public read" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "content full-access write" ON public.site_content FOR ALL TO authenticated
  USING (public.has_full_access(auth.uid()))
  WITH CHECK (public.has_full_access(auth.uid()));

-- branding (singleton row)
CREATE TABLE public.branding (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo_url TEXT,
  banner_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.branding (id) VALUES (1);
GRANT SELECT ON public.branding TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding TO authenticated;
GRANT ALL ON public.branding TO service_role;
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branding public read" ON public.branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "branding full-access write" ON public.branding FOR ALL TO authenticated
  USING (public.has_full_access(auth.uid()))
  WITH CHECK (public.has_full_access(auth.uid()));

-- custom_roles (volitelné vlastní role pro admin panel)
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_roles read authenticated" ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_roles full-access write" ON public.custom_roles FOR ALL TO authenticated
  USING (public.has_full_access(auth.uid()))
  WITH CHECK (public.has_full_access(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_team_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recruit_updated BEFORE UPDATE ON public.recruitments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_branding_updated BEFORE UPDATE ON public.branding FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user trigger -> profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, minecraft_nick, full_access, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'minecraft_nick', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'full_access')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default contents
INSERT INTO public.site_content (key, value) VALUES
  ('hero', '{"title":"NationCraft","subtitle":"Český Minecraft server, kde tvoje hra začíná.","cta":"Připoj se: mc.nationcraft.cz"}'),
  ('about', '{"title":"O serveru","text":"NationCraft je komunitní český Minecraft server zaměřený na zábavu, férovost a kvalitní zážitek. Připoj se k nám a buduj svou nation!"}'),
  ('features', '{"items":[{"title":"Stabilní server","text":"24/7 online s minimálním lagem."},{"title":"Aktivní komunita","text":"Discord plný hráčů a eventů."},{"title":"Férová pravidla","text":"Tým, kterému záleží na hráčích."}]}')
ON CONFLICT (key) DO NOTHING;

-- Seed vote links
INSERT INTO public.vote_links (name, url, description, sort_order) VALUES
  ('Czech-Craft', 'https://czech-craft.eu/server/nationcraft/vote/', 'Hlasuj denně na Czech-Craft', 1),
  ('Craftlist', 'https://craftlist.org/nationcraft', 'Hlasuj na Craftlist', 2),
  ('Minecraft-Server-List', 'https://minecraft-server-list.com/server/nationcraft/vote/', 'Hlasuj na MSL', 3)
ON CONFLICT DO NOTHING;

-- Seed default team members
INSERT INTO public.team_members (minecraft_nick, role_name, email, instagram, discord, sort_order) VALUES
  ('Itz_Andilek', 'Vedení', 'podpora@nationcraft.cz', NULL, 'itz_andilek', 1)
ON CONFLICT DO NOTHING;
