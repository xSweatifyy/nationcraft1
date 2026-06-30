import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Trash2, Plus, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, RoleBadge } from "@/components/site/RoleBadge";


type Msg = {
  id: string;
  user_id: string;
  nick: string;
  content: string;
  created_at: string;
};

export function ChatSection({ me, canModerate }: { me: any; canModerate: boolean }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      return (data ?? []) as Msg[];
    },
  });

  // role map: user_id -> role name
  const { data: userRoles = [] } = useQuery({
    queryKey: ["admin-chat-user-roles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("id, minecraft_nick");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.minecraft_nick]));
      return (roles ?? []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        nick: profileMap.get(r.user_id) ?? "?",
      }));
    },
    staleTime: 30_000,
  });

  // realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => qc.invalidateQueries({ queryKey: ["admin-chat"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const roleByUser = new Map(userRoles.map((u) => [u.user_id, u.role]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    const nick = me.user_metadata?.minecraft_nick || me.email?.split("@")[0] || "Admin";
    const { error } = await supabase.from("chat_messages").insert({
      user_id: me.id,
      nick,
      content,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
  };

  const logDeletion = async (m: Msg) => {
    const myNick = me.user_metadata?.minecraft_nick || me.email?.split("@")[0] || "Admin";
    await supabase.from("chat_deletion_log").insert({
      deleted_by: me.id,
      deleted_by_nick: myNick,
      original_user_id: m.user_id,
      original_nick: m.nick,
      original_content: m.content,
      original_created_at: m.created_at,
    });
  };

  const del = async (id: string) => {
    const target = messages.find((x) => x.id === id);
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (target) await logDeletion(target);
  };

  const bulkDeleteByRole = async (roleName: string) => {
    if (!canModerate) return;
    const userIds = userRoles
      .filter((u) => {
        const display =
          u.role === "vedeni" ? "Vedení" : u.role === "admin" ? "Admin" : u.role === "developer" ? "Developer" : u.role;
        return display.toLowerCase() === roleName.toLowerCase();
      })
      .map((u) => u.user_id);
    const targets = messages.filter((m) => userIds.includes(m.user_id));
    if (targets.length === 0) { toast.info(`Žádné zprávy pro roli ${roleName}.`); return; }
    if (!confirm(`Smazat ${targets.length} zpráv od role "${roleName}"?`)) return;
    const ids = targets.map((t) => t.id);
    const { error } = await supabase.from("chat_messages").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    for (const t of targets) await logDeletion(t);
    toast.success(`Smazáno ${targets.length} zpráv.`);
  };

  const { data: roles = [] } = useRoles();

  return (
    <div className="mc-card rounded-xl overflow-hidden flex flex-col h-[640px]">
      <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display text-base text-foreground">Team chat</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {canModerate && roles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Smazat dle role:</span>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => bulkDeleteByRole(r.name)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold border hover:opacity-80 transition"
                  style={{ backgroundColor: `${r.color}22`, borderColor: `${r.color}66`, color: r.color }}
                  title={`Smazat všechny zprávy od role ${r.name}`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
          <span className="text-xs text-muted-foreground">{messages.length} zpráv</span>
        </div>
      </div>


      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-10">
            Zatím tu nikdo nic nenapsal. Buď první.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === me.id;
          const role = roleByUser.get(m.user_id) ?? "Admin";
          // Map app_role enum to display name
          const roleDisplay =
            role === "vedeni" ? "Vedení" : role === "admin" ? "Admin" : role === "developer" ? "Developer" : role;
          return (
            <div
              key={m.id}
              className={`flex gap-3 group ${mine ? "flex-row-reverse" : ""}`}
            >
              <img
                src={`https://mc-heads.net/head/${encodeURIComponent(m.nick)}/96`}
                alt={m.nick}
                width={44}
                height={44}
                className="h-11 w-11 rounded-md shrink-0 ring-2 ring-border/60 shadow-md"
                style={{ imageRendering: "pixelated" }}
                loading="lazy"
              />
              <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <span className="text-sm font-semibold text-foreground">{m.nick}</span>
                  <RoleBadge roleName={roleDisplay} />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm leading-relaxed border ${
                    mine
                      ? "bg-primary/15 border-primary/30 text-foreground rounded-tr-sm"
                      : "bg-card border-border/60 rounded-tl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
              {(mine || canModerate) && (
                <button
                  onClick={() => del(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-muted-foreground hover:text-destructive"
                  title="Smazat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-border/60 p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napiš zprávu týmu…"
          maxLength={1000}
          className="flex-1 px-4 py-2.5 rounded-full bg-input border border-border focus:border-primary focus:outline-none text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

/* ---------- ROLES MANAGEMENT ---------- */
const PRESETS = ["#7f1d1d", "#dc2626", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#6b7280"];

export const PERMISSIONS: { key: string; label: string; hint: string }[] = [
  { key: "manageAll", label: "Full access", hint: "Vidí a edituje úplně všechno (jako Vedení)." },
  { key: "ownTaskBoard", label: "Vlastní nástěnka úkolů", hint: "Tato role má svou nástěnku v sekci Nástěnka." },
  { key: "manageAllTasks", label: "Spravovat všechny nástěnky", hint: "Smí psát/mazat úkoly na všech nástěnkách." },
  { key: "viewChat", label: "Vidět team chat", hint: "Smí číst i psát do chatu." },
  { key: "manageUsers", label: "Spravovat uživatele", hint: "Vytvářet, mazat, měnit hesla a role účtů." },
  { key: "manageRoles", label: "Spravovat role", hint: "Přidávat, mazat a měnit role a jejich oprávnění." },
  { key: "manageTeam", label: "Spravovat tým", hint: "Upravovat členy v podstránce Tým." },
  { key: "manageContent", label: "Editovat obsah webu", hint: "Texty na úvodu i podstránkách." },
  { key: "manageRecruits", label: "Spravovat nábory", hint: "Přidávat a mazat pozice." },
  { key: "manageVotes", label: "Spravovat hlasovací odkazy", hint: "Přidávat a mazat odkazy." },
  { key: "manageBranding", label: "Spravovat branding", hint: "Logo a banner." },
  { key: "viewLogs", label: "Vidět logy", hint: "Přihlášení a smazané zprávy." },
];

type Perms = Record<string, boolean>;

function PermissionsEditor({ value, onChange }: { value: Perms; onChange: (p: Perms) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {PERMISSIONS.map((p) => (
        <label
          key={p.key}
          className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 hover:border-primary/40 cursor-pointer transition"
        >
          <input
            type="checkbox"
            checked={!!value[p.key]}
            onChange={(e) => onChange({ ...value, [p.key]: e.target.checked })}
            className="mt-0.5"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground">{p.label}</div>
            <div className="text-[10px] text-muted-foreground leading-snug">{p.hint}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

export function RolesSection() {
  const qc = useQueryClient();
  const { data: roles = [] } = useRoles();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [perms, setPerms] = useState<Perms>({ ownTaskBoard: true });
  const [showPerms, setShowPerms] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!showPerms) {
      setShowPerms(true);
      toast.info("Vyber, co tato role uvidí a smí dělat.");
      return;
    }
    const { error } = await supabase.from("custom_roles").insert({ name: name.trim(), color, permissions: perms as any });
    if (error) { toast.error(error.message); return; }
    toast.success("Role přidána.");
    setName(""); setPerms({ ownTaskBoard: true }); setShowPerms(false);
    qc.invalidateQueries({ queryKey: ["custom_roles"] });
  };

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("custom_roles").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["custom_roles"] });
    toast.success("Uloženo.");
  };

  const del = async (id: string, n: string) => {
    if (!confirm(`Smazat roli "${n}"?`)) return;
    const { error } = await supabase.from("custom_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["custom_roles"] });
  };

  return (
    <div className="space-y-6">
      <div className="mc-card rounded-xl p-6">
        <h3 className="font-display text-sm text-foreground mb-4">Přidat novou roli</h3>
        <form onSubmit={add} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Název role</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Hlavní Builder"
                className="w-full px-3 py-2 rounded-md bg-input border border-border"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Barva</label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer" />
                <input value={color} onChange={(e) => setColor(e.target.value)} className="w-24 px-2 py-2 rounded-md bg-input border border-border font-mono text-xs" />
              </div>
            </div>
            <button className="mc-btn rounded-md h-10">
              <Plus className="h-4 w-4 inline mr-1" /> {showPerms ? "Vytvořit" : "Pokračovat"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setColor(p)} className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: p }} title={p} />
            ))}
          </div>
          {showPerms && (
            <div className="pt-3 border-t border-border/60">
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-foreground">Oprávnění pro tuto roli</h4>
                <p className="text-[10px] text-muted-foreground">Vyber, co bude tato role v admin panelu vidět a smět dělat.</p>
              </div>
              <PermissionsEditor value={perms} onChange={setPerms} />
            </div>
          )}
        </form>
      </div>

      <div className="grid gap-3">
        {roles.map((r) => (
          <RoleRow key={r.id} role={r} onSave={(patch: any) => update(r.id, patch)} onDel={() => del(r.id, r.name)} />
        ))}
      </div>
    </div>
  );
}

function RoleRow({ role, onSave, onDel }: any) {
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [perms, setPerms] = useState<Perms>((role.permissions ?? {}) as Perms);
  const [open, setOpen] = useState(false);
  const dirty = name !== role.name || color !== role.color || JSON.stringify(perms) !== JSON.stringify(role.permissions ?? {});
  const activeCount = Object.values(perms).filter(Boolean).length;

  return (
    <div className="mc-card rounded-xl p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center">
        <RoleBadge roleName={name} size="md" />
        <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 rounded-md bg-input border border-border text-sm" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer" />
        <button onClick={() => setOpen((o) => !o)} className="px-3 py-2 rounded-md border border-border text-xs">
          Oprávnění ({activeCount})
        </button>
        <button onClick={() => onSave({ name, color, permissions: perms })} disabled={!dirty} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-40">
          Uložit
        </button>
        <button onClick={onDel} className="px-2 py-2 rounded-md border border-destructive text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="pt-3 border-t border-border/60">
          <PermissionsEditor value={perms} onChange={setPerms} />
        </div>
      )}
    </div>
  );
}

