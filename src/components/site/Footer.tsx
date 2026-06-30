import { Link } from "@tanstack/react-router";
import { Mail, Lock } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/30 backdrop-blur-md">
      <div className="grass-stripe" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <Logo size={64} />
            <span className="font-display text-2xl text-gradient">NationCraft</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
            Český komunitní Minecraft server, kde tvoje hra začíná.
            Připoj se k tisícům hráčů a buduj svou nation.
          </p>
          <p className="mt-4 text-sm">
            <span className="text-muted-foreground">IP: </span>
            <code className="px-2 py-1 rounded-md bg-muted/70 text-primary text-xs">mc.nationcraft.cz</code>
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm text-foreground mb-4">Podpora</h4>
          <a
            href="mailto:podpora@nationcraft.cz"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4" /> podpora@nationcraft.cz
          </a>
          <p className="mt-3 text-sm text-muted-foreground">
            Nebo na{" "}
            <a href="https://discord.gg/DDd9y5Xkts" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Discordu
            </a>
            .
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm text-foreground mb-4">Stránky</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/tym" className="text-muted-foreground hover:text-primary transition-colors">Tým</Link></li>
            <li><Link to="/nabory" className="text-muted-foreground hover:text-primary transition-colors">Nábory</Link></li>
            <li><Link to="/hlasovani" className="text-muted-foreground hover:text-primary transition-colors">Hlasování</Link></li>
            <li><Link to="/banlist" className="text-muted-foreground hover:text-primary transition-colors">BanList</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} NationCraft.cz | Všechna práva vyhrazena. Nejsme nijak spojeni s Mojang AB.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
          >
            <Lock className="h-3 w-3" /> Přihlášení do administrace
          </Link>
        </div>
      </div>
    </footer>
  );
}
