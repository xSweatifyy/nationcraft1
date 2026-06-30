# Plán: NationCraft web

Postavím kompletní web na TanStack Start + Lovable Cloud (databáze, auth, storage, server functions). Minecraft tématika přes CSS efekty (pixelové borders, blocky shadows, animované partikly, "dirt/stone" textury generované CSS), žádné obrázky.

## Stránky (routes)

- `/` Úvod — hero s logem/bannerem (z DB), live počet hráčů na `mc.nationcraft.cz` (vlevo nahoře), Discord tlačítko + počet členů (dole), featured info, sekce komunity
- `/tym` Tým — karty členů ve stylu skyplex.cz/tym (avatar z `https://mc-heads.net/avatar/<nick>/200`, nick, role, kontakty: email/instagram/discord)
- `/nabory` Nábory — editovatelné pozice s formulářem / odkazem
- `/hlasovani` Hlasování — karty s odkazy na hlasovací servery (czech-craft, craftlist, minecraft-server-list…)
- `/banlist` BanList — taby: Bany / Varování / Mute / Kick + sekce Statistiky; data přímo z MySQL databáze pluginu **LiteBans** (vyžaduje DB credentials — viz poznámka níž)
- `/auth` Přihlášení do admin panelu
- `/admin` Admin panel (gated, role-based)
- `/store` Připraveno, ale skryté (404/coming soon)

Footer všude: `NationCraft.cz | Všechna práva vyhrazena. Nejsme nijak spojeni s Mojang AB.` + email `podpora@nationcraft.cz` + Discord odkaz + skrytý odkaz na `/auth` (malá tečka/ikona).

Logo (z DB/storage) v navigaci i ve footeru. Navigace: desktop horizontální menu, mobil hamburger (sheet).

## Design

- Dark mode default, light mode přepínač (uloženo v localStorage)
- Minecraft efekty: pixel-perfect borders (`image-rendering: pixelated`), "blocky" stíny (multi-layer box-shadow imitující 3D kostku), animované zelené/emerald glow, subtle particle canvas na pozadí hera, Minecraft-style tlačítka (3D push efekt)
- Font: Press Start 2P (akcenty) + Inter (body)
- Paleta: emerald/grass green primary, stone gray, dark slate background; semantic tokens v `src/styles.css`
- Plně responzivní (grid + min-w-0 patterns)

## Admin panel

Role v DB tabulce `app_role` enum: `vedeni`, `admin`, `developer` + tabulka `user_roles`. Plus boolean `full_access` na `profiles` pro override (účet `Itz_Andilek`).

Permissions matrix:
- **Vedení** + **Itz_Andilek (full_access)**: vše — CRUD uživatelů, rolí, členů týmu, editace všech textů/obrázků webu, upload loga/banneru, generování hesel, reset hesel
- **Admin**: čtení + omezené editace (např. nábory, ban-related notes), nemůže měnit uživatele/role/obsah webu
- **Developer**: pouze read-only přístup do admin panelu

Admin sekce:
- Dashboard (přehled)
- Uživatelé (create, delete, reset password, generate random password, change role)
- Tým (CRUD členů — nick, role, email, instagram, discord; avatar auto z mc-heads.net)
- Obsah webu (editor pro každou stránku — texty, sekce, CTA)
- Nábory (CRUD pozic)
- Hlasování (CRUD odkazů)
- Branding (upload loga + banneru do Lovable Cloud Storage)
- Role (CRUD vlastních rolí — pouze Vedení/Itz_Andilek)

Účet `Itz_Andilek` seedem: jednorázové heslo `123456`, role `admin`, `full_access=true`, flag `must_change_password=true` — při prvním loginu vynucená změna hesla.

## Datový model (Lovable Cloud)

- `profiles` (id, minecraft_nick, full_access, must_change_password, created_at)
- `app_role` enum + `user_roles` (user_id, role)
- `custom_roles` (name, permissions jsonb)
- `team_members` (nick, role, email, instagram, discord, order)
- `recruitments` (title, description, requirements, active)
- `vote_links` (name, url, description, order)
- `site_content` (key, value jsonb) — pro editovatelné texty
- `branding` (logo_url, banner_url)
- Storage bucket `branding` (public)

RLS: čtení veřejné u `team_members`, `recruitments`, `vote_links`, `site_content`, `branding`; zápis pouze přes server functions s kontrolou role (`has_role` + `full_access`).

## Server functions

- `getServerStatus` — fetch `https://api.mcsrvstat.us/3/mc.nationcraft.cz` (player count)
- `getDiscordStats` — fetch `https://discord.com/api/v9/invites/DDd9y5Xkts?with_counts=true` (member count)
- `getLitebans*` — viz poznámka níž
- Admin CRUD server functions (`requireSupabaseAuth` + role check)
- `adminCreateUser`, `adminResetPassword`, `adminGeneratePassword` (service role)

## LiteBans napojení — DŮLEŽITÉ

LiteBans ukládá data do externí MySQL databáze tvého serveru. Aby web mohl zobrazit Bany/Mute/Kick/Warn, potřebuju MySQL přístup k té databázi (host, port, db, user, password, prefix tabulek — typicky `litebans_`). 

**Nyní:** postavím BanList UI s mock daty + server function připravenou na MySQL dotazy. Až mi pošleš credentials, přidám je jako secrets a aktivuju reálné napojení. Bez nich nemůžu data tahat (a přímý JS přístup k MySQL z prohlížeče by byl bezpečnostní díra).

Alternativa: pokud máš LiteBans webové rozhraní (např. litebans-php), můžu na něj jen linkovat.

## Co potřebuju potvrdit/dodat od tebe

1. **LiteBans MySQL credentials** (nebo URL existujícího litebans webu) — bez toho BanList = mock data
2. **Členové týmu** — seznam: nick (pro avatar), role, email, instagram, discord. Pokud teď nepošleš, naseeduju 2-3 placeholder záznamy (vč. Itz_Andilek jako Vedení) a budeš si je editovat v admin panelu
3. **Hlasovací odkazy** — které servery (czech-craft.eu, craftlist.org, …)? Pokud nedodáš, dám 3 nejběžnější CZ vote sites jako placeholder, můžeš editovat
4. **Logo/banner** — nahraješ až přes admin panel, nebo mám použít placeholder

## Pořadí implementace

1. Enable Lovable Cloud + migrace (tabulky, enum, RLS, GRANTy, storage bucket, seed Itz_Andilek)
2. Design system v `styles.css` (Minecraft tokeny, fonty, dark/light)
3. Layout: root s navigací, hamburger, footer, theme toggle, server status widget, Discord widget
4. Veřejné stránky: /, /tym, /nabory, /hlasovani, /banlist (s mocky)
5. Auth flow (/auth) + force password change
6. Admin panel (všechny sekce, role gating)
7. Server functions (status, discord, admin CRUD)
8. Polishing, responsivita, ověření

Plán je velký — po schválení jedu krok za krokem. Dej vědět hlavně k LiteBans (bod 1), zbytek umím rozjet hned s placeholdery.