import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/lib/theme";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="font-pixel text-5xl text-primary text-glow">404</h1>
      <p className="mt-4 text-muted-foreground">Tato stránka neexistuje.</p>
      <Link to="/" className="mt-6 mc-btn rounded-md inline-block">Zpět domů</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-pixel text-2xl text-primary">Něco se pokazilo</h1>
        <p className="mt-3 text-sm text-muted-foreground">Zkus znovu nebo se vrať na úvod.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button onClick={() => { router.invalidate(); reset(); }} className="mc-btn rounded-md">Zkusit znovu</button>
          <a href="/" className="mc-btn rounded-md" style={{ background: "linear-gradient(180deg, var(--muted), var(--secondary))", color: "var(--foreground)" }}>Domů</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NationCraft — Český Minecraft server" },
      { name: "description", content: "NationCraft.cz — český Minecraft server. Připoj se: mc.nationcraft.cz" },
      { property: "og:title", content: "NationCraft" },
      { property: "og:description", content: "Český Minecraft server. mc.nationcraft.cz" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_IN" && session?.user) {
        const nick =
          (session.user.user_metadata as any)?.minecraft_nick ||
          session.user.email?.split("@")[0] ||
          "Unknown";
        try {
          await supabase.from("login_log").insert({ user_id: session.user.id, nick });
        } catch {}
      }
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);


  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
