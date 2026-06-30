import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Server, Shield, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ServerStatus } from "@/components/site/ServerStatus";
import { DiscordWidget } from "@/components/site/DiscordWidget";
import { useBranding } from "@/components/site/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NationCraft — Český Minecraft server" },
      { name: "description", content: "Připoj se na mc.nationcraft.cz — český komunitní Minecraft server." },
      { property: "og:title", content: "NationCraft" },
      { property: "og:description", content: "Český komunitní Minecraft server. mc.nationcraft.cz" },
    ],
  }),
  component: Index,
});

function Index() {
  const branding = useBranding();
  const { data: content } = useQuery({
    queryKey: ["site_content"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*");
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
  });

  const hero = content?.hero ?? { title: "NationCraft", subtitle: "Český Minecraft server, kde tvoje hra začíná.", cta: "Připoj se: mc.nationcraft.cz" };
  const about = content?.about;
  const features = content?.features?.items ?? [];

  const copyIp = () => {
    navigator.clipboard.writeText("mc.nationcraft.cz");
    toast.success("IP zkopírována");
  };

  return (
    <div>
      {/* Server status — vlevo nahoře */}
      <div className="absolute left-3 top-20 sm:top-24 z-20">
        <ServerStatus />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden pt-24 sm:pt-32 pb-20">
        {/* particles */}
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="mc-particle"
            style={{
              left: `${(i * 73) % 95 + 2}%`,
              top: `${(i * 41) % 60 + 10}%`,
              animationDelay: `${(i * 0.4) % 3}s`,
              animationDuration: `${3 + (i % 4)}s`,
            }}
          />
        ))}

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          {branding.data?.banner_url && (
            <img
              src={branding.data.banner_url}
              alt="NationCraft banner"
              className="mx-auto mb-8 rounded-xl border border-border max-h-64 object-cover w-full"
              style={{ imageRendering: "pixelated" }}
            />
          )}
          <div className="inline-block mc-card rounded-md px-3 py-1.5 font-pixel text-[10px] text-primary mb-6">
            v1.20.x · Survival · Komunita
          </div>
          <h1 className="font-pixel text-3xl sm:text-5xl md:text-6xl text-primary text-glow leading-tight">
            {hero.title}
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {hero.subtitle}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={copyIp} className="mc-btn rounded-md inline-flex items-center gap-2">
              <Copy className="h-4 w-4" /> mc.nationcraft.cz
            </button>
            <Link
              to="/hlasovani"
              className="mc-btn rounded-md"
              style={{ background: "linear-gradient(180deg, var(--accent), var(--secondary))", color: "var(--foreground)" }}
            >
              Hlasovat
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-5 md:grid-cols-3">
        {(features as { title: string; text: string }[]).map((f, i) => {
          const Icon = [Shield, Users, Sparkles][i % 3];
          return (
            <div key={f.title} className="mc-card rounded-lg p-6">
              <div className="mc-block h-12 w-12 grid place-items-center rounded-md mb-4">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-pixel text-sm text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          );
        })}
      </section>

      {/* About */}
      {about && (
        <section className="mx-auto max-w-4xl px-4 sm:px-6 mt-20 text-center">
          <h2 className="font-pixel text-xl sm:text-2xl text-primary">{about.title}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{about.text}</p>
        </section>
      )}

      {/* Discord */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 mt-20 mb-12">
        <div className="mc-card rounded-xl p-8 text-center">
          <h2 className="font-pixel text-lg text-primary mb-3">Naše komunita na Discordu</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Připoj se k hráčům, eventům a buď první u všech novinek.
          </p>
          <div className="flex justify-center">
            <DiscordWidget />
          </div>
        </div>
      </section>
    </div>
  );
}
