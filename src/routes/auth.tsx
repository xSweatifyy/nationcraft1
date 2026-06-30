import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAndilek } from "@/lib/admin.functions";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Přihlášení — NationCraft" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const bootstrap = useServerFn(bootstrapAndilek);
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // jednorázový bootstrap účtu Itz_Andilek (idempotentní)
    bootstrap().catch(() => {});
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [bootstrap, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nick.trim() || !password) { toast.error("Vyplň nick i heslo."); return; }
    setLoading(true);
    const email = `${nick.toLowerCase().replace(/[^a-z0-9_]/g, "")}@nationcraft.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error("Špatný nick nebo heslo."); return; }
    toast.success("Přihlášeno");
    router.invalidate();
    navigate({ to: "/admin" });
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] grid place-items-center px-4 py-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="mc-card rounded-2xl p-8 sm:p-10">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Logo size={56} />
            <div className="text-center">
              <h1 className="font-display text-2xl text-gradient">Administrace</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Přihlas se do panelu</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="nick" className="block text-xs font-medium text-muted-foreground mb-1.5">Nick</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="nick"
                  type="text"
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Admin"
                  autoComplete="off"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-input border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pwd" className="block text-xs font-medium text-muted-foreground mb-1.5">Heslo</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-input border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="mc-btn rounded-lg w-full">
              {loading ? "Přihlašuji…" : "Přihlásit se"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
