import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoleBadge } from "@/components/site/RoleBadge";

export const Route = createFileRoute("/tym")({
  head: () => ({
    meta: [
      { title: "Tým — NationCraft" },
      { name: "description", content: "Seznam členů týmu NationCraft serveru." },
      { property: "og:title", content: "Tým — NationCraft" },
      { property: "og:description", content: "Seznam členů týmu NationCraft." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("*").order("sort_order", { ascending: true });
      return data ?? [];
    },
  });
  const { data: header } = useQuery({
    queryKey: ["site_content", "page_tym"],
    queryFn: async () => (await supabase.from("site_content").select("value").eq("key", "page_tym").maybeSingle()).data?.value as any,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
      <header className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-5xl text-gradient">{header?.title ?? "Náš tým"}</h1>
        <p className="mt-4 text-muted-foreground">{header?.subtitle ?? "Lidé, kteří NationCraft tvoří a starají se o něj."}</p>
      </header>


      {isLoading ? (
        <div className="text-center text-muted-foreground">Načítám…</div>
      ) : members && members.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m: any) => (
            <article key={m.id} className="mc-card rounded-xl p-6 text-center">
              <div className="mx-auto mb-4 relative">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(m.minecraft_nick)}/160`}
                  alt={m.minecraft_nick}
                  width={120}
                  height={120}
                  className="mx-auto rounded-md"
                  style={{ imageRendering: "pixelated" }}
                  loading="lazy"
                />
              </div>
              <h3 className="font-display text-lg text-foreground">{m.minecraft_nick}</h3>
              <div className="mt-2 flex justify-center"><RoleBadge roleName={m.role_name} size="md" /></div>

              <div className="mt-5 flex flex-col gap-2 text-sm">
                {m.email && (
                  <a href={`mailto:${m.email}`} className="inline-flex items-center justify-center gap-2 hover:text-primary">
                    <Mail className="h-4 w-4" /> {m.email}
                  </a>
                )}
                {m.instagram && (
                  <a href={`https://instagram.com/${m.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 hover:text-primary">
                    <Instagram className="h-4 w-4" /> @{m.instagram}
                  </a>
                )}
                {m.discord && (
                  <div className="inline-flex items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-primary">Discord:</span> {m.discord}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Zatím žádní členové.</p>
      )}
    </div>
  );
}
