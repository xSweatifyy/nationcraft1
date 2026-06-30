INSERT INTO public.site_content (key, value) VALUES
  ('page_tym', '{"title":"Náš tým","subtitle":"Lidé, kteří NationCraft tvoří a starají se o něj."}'),
  ('page_nabory', '{"title":"Nábory","subtitle":"Hledáme nové lidi do týmu. Mrkni na otevřené pozice."}'),
  ('page_hlasovani', '{"title":"Hlasování","subtitle":"Klikni na server, hlasuj a získej odměny ve hře."}'),
  ('page_banlist', '{"title":"BanList","subtitle":"Přehled trestů ze serveru. Data přes plugin LiteBans."}')
ON CONFLICT (key) DO NOTHING;