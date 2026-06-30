import { useQuery } from "@tanstack/react-query";
import { Server } from "lucide-react";

export function ServerStatus() {
  const { data } = useQuery({
    queryKey: ["mc-status"],
    queryFn: async () => {
      const r = await fetch("https://api.mcsrvstat.us/3/mc.nationcraft.cz");
      return r.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const online = data?.online;
  const players = data?.players?.online ?? 0;
  const max = data?.players?.max ?? 0;
  return (
    <div className="mc-card rounded-md px-3 py-2 flex items-center gap-2 text-xs font-pixel">
      <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-primary mc-pulse" : "bg-destructive"}`} />
      <Server className="h-3.5 w-3.5 text-primary" />
      <span className="truncate">mc.nationcraft.cz</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-primary">
        {online ? `${players}/${max}` : "offline"}
      </span>
    </div>
  );
}
