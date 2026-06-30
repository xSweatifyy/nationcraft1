import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const { data } = await supabase.from("branding").select("*").eq("id", 1).maybeSingle();
      return data ?? { logo_url: null, banner_url: null };
    },
    staleTime: 60_000,
  });
}

export function Logo({ size = 36 }: { size?: number }) {
  const { data } = useBranding();
  if (data?.logo_url) {
    return (
      <img
        src={data.logo_url}
        alt="NationCraft logo"
        width={size}
        height={size}
        className="rounded-md"
        style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      className="mc-block grid place-items-center font-pixel text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      NC
    </div>
  );
}
