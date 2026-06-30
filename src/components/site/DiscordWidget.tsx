import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

export function DiscordWidget() {
  const { data } = useQuery({
    queryKey: ["discord-invite"],
    queryFn: async () => {
      const r = await fetch("https://discord.com/api/v9/invites/DDd9y5Xkts?with_counts=true");
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const total = data?.approximate_member_count;
  const online = data?.approximate_presence_count;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <a
        href="https://discord.gg/DDd9y5Xkts"
        target="_blank"
        rel="noreferrer"
        className="mc-btn rounded-md inline-flex items-center gap-2"
        style={{ background: "linear-gradient(180deg, var(--discord), color-mix(in oklab, var(--discord) 60%, black))" }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.073.035c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.074-.035A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Připojit se na Discord
      </a>
      <div className="mc-card rounded-md px-4 py-2 inline-flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-primary" />
        <span className="font-pixel text-xs text-muted-foreground">členů:</span>
        <span className="font-pixel text-primary">{total ?? "…"}</span>
        {online != null && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="h-2 w-2 rounded-full bg-primary mc-pulse" />
            <span className="text-xs text-muted-foreground">{online} online</span>
          </>
        )}
      </div>
    </div>
  );
}
