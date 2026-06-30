import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/hlasovani")({
  head: () => ({
    meta: [
      { title: "Hlasování — NationCraft" },
      { name: "description", content: "Hlasuj pro NationCraft a získej odměny ve hře." },
      { property: "og:title", content: "Hlasování — NationCraft" },
      { property: "og:description", content: "Hlasuj pro NationCraft." },
    ],
  }),
  component: VotePage,
});

function VotePage() {
  const { data: items } = useQuery({
    queryKey: ["vote_links"],
    queryFn: async () => {
      const { data } = await supabase.from("vote_links").select("*").order("sort_order");
      return data ?? [];
    },
  });
  const { data: header } = useQuery({
    queryKey: ["site_content", "page_hlasovani"],
    queryFn: async () => (await supabase.from("site_content").select("value").eq("key", "page_hlasovani").maybeSingle()).data?.value as any,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
      <header className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-5xl text-gradient">{header?.title ?? "Hlasování"}</h1>
        <p className="mt-4 text-muted-foreground">{header?.subtitle ?? "Klikni na server, hlasuj a získej odměny ve hře."}</p>
      </header>


      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(items ?? []).map((v: any) => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="mc-card rounded-xl p-6 group hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-pixel text-base text-primary group-hover:text-glow">{v.name}</h3>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            {v.description && <p className="text-sm text-muted-foreground">{v.description}</p>}
            <div className="mt-5 inline-block mc-btn rounded-md text-[10px]">Hlasovat →</div>
          </a>
        ))}
      </div>
    </div>
  );
}
