import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/nabory")({
  head: () => ({
    meta: [
      { title: "Nábory — NationCraft" },
      { name: "description", content: "Otevřené pozice v týmu NationCraft." },
      { property: "og:title", content: "Nábory — NationCraft" },
      { property: "og:description", content: "Otevřené pozice v týmu NationCraft." },
    ],
  }),
  component: RecruitsPage,
});

function RecruitsPage() {
  const { data: items } = useQuery({
    queryKey: ["recruitments"],
    queryFn: async () => {
      const { data } = await supabase.from("recruitments").select("*").eq("active", true).order("sort_order");
      return data ?? [];
    },
  });
  const { data: header } = useQuery({
    queryKey: ["site_content", "page_nabory"],
    queryFn: async () => (await supabase.from("site_content").select("value").eq("key", "page_nabory").maybeSingle()).data?.value as any,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
      <header className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-5xl text-gradient">{header?.title ?? "Nábory"}</h1>
        <p className="mt-4 text-muted-foreground">{header?.subtitle ?? "Hledáme nové lidi do týmu. Mrkni na otevřené pozice."}</p>
      </header>


      {items && items.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((r: any) => (
            <article key={r.id} className="mc-card rounded-xl p-6">
              <h3 className="font-pixel text-lg text-primary">{r.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{r.description}</p>
              {r.requirements && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-pixel text-xs text-primary mb-2">Požadavky</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{r.requirements}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mc-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Aktuálně nemáme otevřené žádné nábory.</p>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-muted-foreground">
        Máš zájem? Napiš na <a className="text-primary hover:underline inline-flex items-center gap-1" href="mailto:nabory@nationcraft.cz"><Mail className="h-4 w-4" /> nabory@nationcraft.cz</a> nebo na Discord.
      </div>
    </div>
  );
}
