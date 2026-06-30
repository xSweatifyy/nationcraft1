import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Ban, AlertTriangle, MicOff, LogOut, BarChart3 } from "lucide-react";


export const Route = createFileRoute("/banlist")({
  head: () => ({
    meta: [
      { title: "BanList — NationCraft" },
      { name: "description", content: "Přehled banů, varování, mutů a kicků na NationCraft serveru." },
      { property: "og:title", content: "BanList — NationCraft" },
      { property: "og:description", content: "Přehled trestů na NationCraft." },
    ],
  }),
  component: BanlistPage,
});

const TABS = [
  { key: "bans", label: "Bany", icon: Ban },
  { key: "warns", label: "Varování", icon: AlertTriangle },
  { key: "mutes", label: "Mute", icon: MicOff },
  { key: "kicks", label: "Kick", icon: LogOut },
  { key: "stats", label: "Statistiky", icon: BarChart3 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Mock data — připraveno k napojení na LiteBans MySQL přes server function
const MOCK: Record<TabKey, any[]> = {
  bans: [
    { player: "Griefer123", reason: "Griefing", by: "Itz_Andilek", date: "2026-06-20", until: "Permanent" },
    { player: "HackerX", reason: "Hacked client", by: "Itz_Andilek", date: "2026-06-12", until: "Permanent" },
  ],
  warns: [
    { player: "PlayerOne", reason: "Spam v chatu", by: "Itz_Andilek", date: "2026-06-22", until: "—" },
  ],
  mutes: [
    { player: "Toxic_Guy", reason: "Toxicita", by: "Itz_Andilek", date: "2026-06-21", until: "2026-06-28" },
  ],
  kicks: [
    { player: "AFK_Player", reason: "AFK", by: "Itz_Andilek", date: "2026-06-23", until: "—" },
  ],
  stats: [],
};

function BanlistPage() {
  const [tab, setTab] = useState<TabKey>("bans");
  const rows = MOCK[tab];
  const { data: header } = useQuery({
    queryKey: ["site_content", "page_banlist"],
    queryFn: async () => (await supabase.from("site_content").select("value").eq("key", "page_banlist").maybeSingle()).data?.value as any,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
      <header className="text-center mb-10">
        <h1 className="font-display text-4xl sm:text-5xl text-gradient">{header?.title ?? "BanList"}</h1>
        <p className="mt-4 text-muted-foreground text-sm">
          {header?.subtitle ?? "Přehled trestů ze serveru. Data přes plugin LiteBans."}
        </p>
      </header>


      <div className="mc-card rounded-xl p-2 mb-6 flex flex-wrap gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-pixel transition-colors cursor-pointer ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "stats" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Bany", value: MOCK.bans.length, icon: Ban },
            { label: "Varování", value: MOCK.warns.length, icon: AlertTriangle },
            { label: "Mute", value: MOCK.mutes.length, icon: MicOff },
            { label: "Kick", value: MOCK.kicks.length, icon: LogOut },
          ].map((s) => {
            const I = s.icon;
            return (
              <div key={s.label} className="mc-card rounded-xl p-6 text-center">
                <I className="h-6 w-6 text-primary mx-auto" />
                <p className="mt-3 font-pixel text-3xl text-primary">{s.value}</p>
                <p className="mt-1 text-xs font-pixel uppercase text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mc-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-pixel text-xs text-primary">Hráč</th>
                  <th className="px-4 py-3 font-pixel text-xs text-primary">Důvod</th>
                  <th className="px-4 py-3 font-pixel text-xs text-primary">Udělil</th>
                  <th className="px-4 py-3 font-pixel text-xs text-primary">Datum</th>
                  <th className="px-4 py-3 font-pixel text-xs text-primary">Do</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Žádné záznamy.</td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <img src={`https://mc-heads.net/avatar/${r.player}/24`} alt="" width={24} height={24} className="rounded" style={{ imageRendering: "pixelated" }} loading="lazy" />
                        <span className="font-medium">{r.player}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.by}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.until}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
