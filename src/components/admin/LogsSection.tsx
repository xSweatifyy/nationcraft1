import { useQuery } from "@tanstack/react-query";
import { LogIn, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function fmt(d: string) {
  return new Date(d).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LogsSection() {
  const { data: logins = [] } = useQuery({
    queryKey: ["login_log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("login_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as { id: string; nick: string; created_at: string }[];
    },
    refetchInterval: 15_000,
  });

  const { data: deletions = [] } = useQuery({
    queryKey: ["chat_deletion_log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_deletion_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as any[];
    },
    refetchInterval: 15_000,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="mc-card rounded-xl overflow-hidden">
        <header className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
          <LogIn className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm">Přihlášení do administrace</h3>
          <span className="ml-auto text-xs text-muted-foreground">{logins.length}</span>
        </header>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-border/40">
          {logins.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Zatím žádné záznamy.</p>}
          {logins.map((l) => (
            <div key={l.id} className="px-4 py-3 flex items-center gap-3">
              <img
                src={`https://mc-heads.net/avatar/${encodeURIComponent(l.nick)}/48`}
                alt={l.nick}
                className="h-8 w-8 rounded"
                style={{ imageRendering: "pixelated" }}
                loading="lazy"
              />
              <span className="font-semibold text-sm flex-1 truncate">{l.nick}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{fmt(l.created_at)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mc-card rounded-xl overflow-hidden">
        <header className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          <h3 className="font-display text-sm">Smazané zprávy v chatu</h3>
          <span className="ml-auto text-xs text-muted-foreground">{deletions.length}</span>
        </header>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-border/40">
          {deletions.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Zatím žádné záznamy.</p>}
          {deletions.map((d) => (
            <div key={d.id} className="px-4 py-3 text-sm space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{d.deleted_by_nick}</span>
                <span className="text-muted-foreground text-xs">smazal/a zprávu od</span>
                <span className="font-semibold">{d.original_nick}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{fmt(d.created_at)}</span>
              </div>
              <blockquote className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 line-clamp-2">
                "{d.original_content}"
              </blockquote>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
