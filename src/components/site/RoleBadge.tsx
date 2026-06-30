import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRoles() {
  return useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data } = await supabase.from("custom_roles").select("*").order("name");
      return (data ?? []) as { id: string; name: string; color: string }[];
    },
    staleTime: 60_000,
  });
}

// Compute a high-contrast text color (black/white) for a given hex bg.
function readableText(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // perceived luminance
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? "#0b0b0f" : "#ffffff";
}

export function RoleBadge({ roleName, size = "sm" }: { roleName: string; size?: "sm" | "md" }) {
  const { data: roles } = useRoles();
  const role = roles?.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
  const color = role?.color ?? "#6b7280";
  const text = readableText(color);
  const cls =
    size === "md"
      ? "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
      : "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase";
  return (
    <span
      className={cls}
      style={{
        backgroundColor: color,
        color: text,
        boxShadow: `0 0 0 1px ${color}55, 0 4px 14px -4px ${color}80`,
      }}
    >
      {roleName}
    </span>
  );
}
