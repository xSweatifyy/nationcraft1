import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branding").select("*").eq("id", 1).maybeSingle();
      if (error) return { logo_url: null, banner_url: null };
      return data ?? { logo_url: null, banner_url: null };
    },
    staleTime: 60_000,
  });
}

function DefaultLogo({ size }: { size: number }) {
  return (
    <div
      className="mc-block grid place-items-center font-display font-bold text-primary-foreground shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.34, borderRadius: Math.max(8, size * 0.16) }}
      aria-label="NationCraft logo"
    >
      NC
    </div>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  const { data } = useBranding();
  const src = data?.logo_url?.trim();
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt="NationCraft logo"
        width={size}
        height={size}
        className="rounded-md shadow-lg bg-card/70 border border-border/60"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "cover" }}
      />
    );
  }
  return <DefaultLogo size={size} />;
}
