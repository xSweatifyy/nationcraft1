import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Logo } from "./Logo";
import { useTheme } from "@/lib/theme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { to: "/", label: "Úvod" },
  { to: "/tym", label: "Tým" },
  { to: "/nabory", label: "Nábory" },
  { to: "/hlasovani", label: "Hlasování" },
  { to: "/banlist", label: "BanList" },
];

export function Navbar() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 min-w-0 group">
          <Logo size={56} />
          <span className="font-display text-lg sm:text-xl truncate text-gradient">NationCraft</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full border border-border/60 bg-card/40">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Přepnout téma"
            onClick={toggle}
            className="h-9 w-9 grid place-items-center rounded-full border border-border/60 hover:border-primary/60 hover:text-primary transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Menu"
                className="md:hidden h-9 w-9 grid place-items-center rounded-full border border-border/60 cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-card/95 backdrop-blur-xl border-l border-border/60">
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-2">
                  <Logo size={44} />
                  <span className="font-display text-gradient">NationCraft</span>
                </div>
                <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-2">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-lg font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "px-4 py-3 rounded-lg font-medium bg-primary text-primary-foreground" }}
                    activeOptions={{ exact: l.to === "/" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
