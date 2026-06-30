import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LogOut, RefreshCw, Trash2, Plus, Upload, Edit, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminChangeRole,
} from "@/lib/admin.functions";
import { Logo } from "@/components/site/Logo";
import { useRoles } from "@/components/site/RoleBadge";
import { ChatSection, RolesSection } from "@/components/admin/ChatAndRoles";
import { LogsSection } from "@/components/admin/LogsSection";
import { TasksBoard } from "@/components/admin/TasksBoard";
import { VoiceChat } from "@/components/admin/VoiceChat";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — NationCraft" }] }),
  component: AdminPanel,
});

type Tab = "dashboard" | "chat" | "voice" | "tasks" | "users" | "roles" | "team" | "content" | "recruits" | "votes" | "branding" | "logs";

function AdminPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [me, setMe] = useState<any>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [fullAccess, setFullAccess] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      setMe(data.user);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
      setFullAccess(profile?.full_access ?? false);
      setMustChange(profile?.must_change_password ?? false);
      setMyRole(role?.role ?? null);
    })();
  }, [navigate]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!me) return <div className="p-10 text-center">Načítám…</div>;

  if (mustChange) return <ForcePasswordChange onDone={() => setMustChange(false)} />;

  const canWrite = fullAccess || myRole === "vedeni";
  const isDev = myRole === "developer";

  // Map enum role -> display name used in custom_roles
  const myRoleDisplay =
    myRole === "vedeni" ? "Vedení" : myRole === "admin" ? "Admin" : myRole === "developer" ? "Developer" : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-8 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={56} />
          <div className="min-w-0">
            <h1 className="font-pixel text-base sm:text-lg text-primary truncate">Admin panel</h1>
            <p className="text-xs text-muted-foreground truncate">
              {me.user_metadata?.minecraft_nick || me.email} · {myRole ?? "—"} {fullAccess && "· full access"}
            </p>
          </div>
        </div>
        <button onClick={signOut} className="mc-btn rounded-md inline-flex items-center gap-2 text-xs">
          <LogOut className="h-4 w-4" /> Odhlásit
        </button>
      </header>

      <nav className="mc-card rounded-xl p-1.5 mb-6 flex flex-wrap gap-1 overflow-x-auto">
        {[
          { k: "dashboard", l: "Dashboard" },
          { k: "chat", l: "Chat" },
          { k: "voice", l: "Voice" },
          { k: "tasks", l: "Nástěnka" },
          { k: "users", l: "Uživatelé", needsWrite: true },
          { k: "roles", l: "Role", needsWrite: true },
          { k: "team", l: "Tým" },
          { k: "content", l: "Obsah webu" },
          { k: "recruits", l: "Nábory" },
          { k: "votes", l: "Hlasování" },
          { k: "branding", l: "Branding", needsWrite: true },
          { k: "logs", l: "Logy", needsFull: true },
        ].map((t: any) => {
          if (t.needsWrite && !canWrite) return null;
          if (t.needsFull && !fullAccess) return null;

          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`px-3 py-2 rounded-md text-xs font-pixel cursor-pointer ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              {t.l}
            </button>
          );
        })}
      </nav>

      <div className="space-y-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "chat" && <ChatSection me={me} canModerate={canWrite} />}
        {tab === "voice" && <VoiceChat me={me} fullAccess={fullAccess} />}
        {tab === "tasks" && (
          <TasksBoard me={me} myRoleName={myRoleDisplay} fullAccess={fullAccess} myPerms={{}} />
        )}
        {tab === "users" && canWrite && <UsersSection />}
        {tab === "roles" && canWrite && <RolesSection />}
        {tab === "team" && <TeamSection canWrite={canWrite} readOnly={isDev || !canWrite} />}
        {tab === "content" && <ContentSection canWrite={canWrite} />}
        {tab === "recruits" && <RecruitsSection canWrite={canWrite} />}
        {tab === "votes" && <VotesSection canWrite={canWrite} />}
        {tab === "branding" && canWrite && <BrandingSection />}
        {tab === "logs" && fullAccess && <LogsSection />}

      </div>
    </div>
  );
}

function ForcePasswordChange({ onDone }: { onDone: () => void }) {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Heslo má aspoň 6 znaků."); return; }
    if (pwd !== pwd2) { toast.error("Hesla se neshodují."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const { data: user } = await supabase.auth.getUser();
    if (user.user) await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.user.id);
    toast.success("Heslo změněno.");
    setLoading(false);
    onDone();
  };
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="mc-card rounded-xl p-8">
        <h1 className="font-pixel text-lg text-primary text-center mb-2">Změň si heslo</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Používáš jednorázové heslo. Nastav si nové.</p>
        <form onSubmit={submit} className="space-y-4">
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Nové heslo" className="w-full px-3 py-2.5 rounded-md bg-input border border-border focus:border-primary focus:outline-none" />
          <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Potvrdit heslo" className="w-full px-3 py-2.5 rounded-md bg-input border border-border focus:border-primary focus:outline-none" />
          <button disabled={loading} className="mc-btn rounded-md w-full">Uložit</button>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="mc-card rounded-xl p-6">
        <h3 className="font-pixel text-sm text-primary mb-2">Vítej</h3>
        <p className="text-sm text-muted-foreground">Spravuj NationCraft web odsud — obsah, tým, nábory, hlasování i uživatele.</p>
      </div>
      <div className="mc-card rounded-xl p-6">
        <h3 className="font-pixel text-sm text-primary mb-2">Server</h3>
        <p className="text-sm">IP: <code className="px-2 py-0.5 bg-muted rounded">mc.nationcraft.cz</code></p>
      </div>
      <div className="mc-card rounded-xl p-6">
        <h3 className="font-pixel text-sm text-primary mb-2">Discord</h3>
        <a href="https://discord.gg/DDd9y5Xkts" target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">discord.gg/DDd9y5Xkts</a>
      </div>
    </div>
  );
}

/* ---------- USERS ---------- */
function UsersSection() {
  const listFn = useServerFn(adminListUsers);
  const createFn = useServerFn(adminCreateUser);
  const delFn = useServerFn(adminDeleteUser);
  const resetFn = useServerFn(adminResetPassword);
  const roleFn = useServerFn(adminChangeRole);
  const { data: rawData, refetch, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
    retry: 1,
  });
  // Defensive unwrap: server fn may return array directly or wrapped envelope.
  const data: any[] = Array.isArray(rawData) ? rawData : Array.isArray((rawData as any)?.result) ? (rawData as any).result : [];

  // All custom roles (Vedení, Admin, Developer + Hlavní…, atd.) — live aktualizace přes useRoles().
  const { data: roles = [] } = useRoles();

  const [nick, setNick] = useState("");
  const [pwd, setPwd] = useState("");
  const [displayRole, setDisplayRole] = useState<string>("Admin");
  const [full, setFull] = useState(false);

  // Když načteme role poprvé a default "Admin" tam není, vyber první.
  useEffect(() => {
    if (roles.length && !roles.find((r) => r.name === displayRole)) {
      setDisplayRole(roles[0].name);
    }
  }, [roles]); // eslint-disable-line react-hooks/exhaustive-deps

  const gen = () => setPwd(Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFn({ data: { nick, password: pwd, display_role: displayRole, full_access: full } });
      toast.success(`Vytvořen ${nick}. Email: ${nick.toLowerCase()}@nationcraft.local · heslo: ${pwd}`);
      setNick(""); setPwd(""); setFull(false);
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="mc-card rounded-xl p-6">
        <h3 className="font-pixel text-sm text-primary mb-4">Nový uživatel</h3>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-5">
          <input value={nick} onChange={(e) => setNick(e.target.value)} required placeholder="Minecraft nick" className="sm:col-span-2 px-3 py-2 rounded-md bg-input border border-border" />
          <div className="flex gap-2 sm:col-span-2">
            <input value={pwd} onChange={(e) => setPwd(e.target.value)} required placeholder="Heslo" className="flex-1 px-3 py-2 rounded-md bg-input border border-border" />
            <button type="button" onClick={gen} className="px-3 py-2 rounded-md border border-border hover:bg-accent text-xs">Generovat</button>
          </div>
          <select value={displayRole} onChange={(e) => setDisplayRole(e.target.value)} className="px-3 py-2 rounded-md bg-input border border-border">
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <label className="sm:col-span-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Full access (přepíše roli)
          </label>
          <button className="mc-btn rounded-md sm:col-span-2"><Plus className="h-4 w-4 inline mr-1" /> Vytvořit</button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">Role se načítají z karty <strong>Role</strong>. Nové role tu spadnou automaticky.</p>
      </div>

      <div className="mc-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-pixel text-xs text-primary">Nick</th>
                <th className="px-4 py-3 font-pixel text-xs text-primary">Role</th>
                <th className="px-4 py-3 font-pixel text-xs text-primary">Full</th>
                <th className="px-4 py-3 font-pixel text-xs text-primary">Akce</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center">Načítám…</td></tr>}
              {!isLoading && error && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-destructive">
                  Chyba: {(error as any)?.message ?? "neznámá"} <button onClick={() => refetch()} className="ml-2 underline">Zkusit znovu</button>
                </td></tr>
              )}
              {!isLoading && !error && data.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Žádní uživatelé.</td></tr>}
              {data.map((u: any) => (
                <UserRow key={u.id} u={u} roles={roles} onDel={async () => {
                  if (!confirm(`Smazat ${u.minecraft_nick}?`)) return;
                  try { await delFn({ data: { user_id: u.id } }); toast.success("Smazáno."); refetch(); }
                  catch (e: any) { toast.error(e.message); }
                }} onReset={async (np: string) => {
                  try { await resetFn({ data: { user_id: u.id, password: np } }); toast.success("Heslo resetováno: " + np); }
                  catch (e: any) { toast.error(e.message); }
                }} onRole={async (display_role: string, fa: boolean) => {
                  try { await roleFn({ data: { user_id: u.id, display_role, full_access: fa } }); toast.success("Role změněna."); refetch(); }
                  catch (e: any) { toast.error(e.message); }
                }} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, roles, onDel, onReset, onRole }: any) {
  const [editing, setEditing] = useState(false);
  const [displayRole, setDisplayRole] = useState<string>(u.display_role ?? "Admin");
  const [full, setFull] = useState(!!u.full_access);
  const reset = () => {
    const np = Math.random().toString(36).slice(2, 10);
    if (confirm(`Reset hesla na: ${np}?`)) onReset(np);
  };
  const currentRole = roles?.find((r: any) => r.name?.toLowerCase() === (u.display_role ?? "").toLowerCase());
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 font-medium">{u.minecraft_nick}</td>
      <td className="px-4 py-3">
        {editing ? (
          <select value={displayRole} onChange={(e) => setDisplayRole(e.target.value)} className="px-2 py-1 rounded bg-input border border-border text-xs">
            {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        ) : (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={currentRole ? { backgroundColor: `${currentRole.color}22`, color: currentRole.color, border: `1px solid ${currentRole.color}66` } : {}}
          >
            {u.display_role ?? u.role ?? "—"}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> :
          (u.full_access ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground" />)}
      </td>
      <td className="px-4 py-3 flex gap-2 flex-wrap">
        {editing ? (
          <>
            <button onClick={() => { onRole(displayRole, full); setEditing(false); }} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">Uložit</button>
            <button onClick={() => setEditing(false)} className="px-2 py-1 rounded border border-border text-xs">Zrušit</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="px-2 py-1 rounded border border-border text-xs inline-flex items-center gap-1"><Edit className="h-3 w-3" /> Role</button>
            <button onClick={reset} className="px-2 py-1 rounded border border-border text-xs inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Reset</button>
            <button onClick={onDel} className="px-2 py-1 rounded border border-destructive text-destructive text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Smazat</button>
          </>
        )}
      </td>
    </tr>
  );
}


/* ---------- TEAM ---------- */
function TeamSection({ canWrite, readOnly }: { canWrite: boolean; readOnly: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => (await supabase.from("team_members").select("*").order("sort_order")).data ?? [],
  });
  const [form, setForm] = useState({ minecraft_nick: "", role_name: "", email: "", instagram: "", discord: "", sort_order: 0 });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("team_members").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Přidán."); setForm({ minecraft_nick: "", role_name: "", email: "", instagram: "", discord: "", sort_order: 0 });
    qc.invalidateQueries({ queryKey: ["admin-team"] });
    qc.invalidateQueries({ queryKey: ["team_members"] });
  };
  const del = async (id: string) => {
    if (!confirm("Smazat?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-team"] });
    qc.invalidateQueries({ queryKey: ["team_members"] });
  };
  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("team_members").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-team"] });
    qc.invalidateQueries({ queryKey: ["team_members"] });
    toast.success("Uloženo.");
  };

  return (
    <div className="space-y-6">
      {canWrite && (
        <div className="mc-card rounded-xl p-6">
          <h3 className="font-pixel text-sm text-primary mb-4">Přidat člena</h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
            <input required placeholder="MC nick" value={form.minecraft_nick} onChange={(e) => setForm({ ...form, minecraft_nick: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
            <RoleSelect value={form.role_name} onChange={(v: string) => setForm({ ...form, role_name: v })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
            <input placeholder="Instagram (bez @)" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
            <input placeholder="Discord username" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
            <input type="number" placeholder="Pořadí" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
            <button className="mc-btn rounded-md sm:col-span-3">Přidat</button>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((m: any) => (
          <TeamCardEdit key={m.id} m={m} canWrite={canWrite && !readOnly} onDel={() => del(m.id)} onSave={(p: any) => update(m.id, p)} />
        ))}
      </div>
    </div>
  );
}

function TeamCardEdit({ m, canWrite, onDel, onSave }: any) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(m);
  return (
    <div className="mc-card rounded-xl p-4">
      <div className="flex items-center gap-3">
        <img src={`https://mc-heads.net/avatar/${m.minecraft_nick}/64`} alt="" width={48} height={48} className="rounded" style={{ imageRendering: "pixelated" }} />
        <div className="min-w-0 flex-1">
          {edit ? <input value={f.minecraft_nick} onChange={(e) => setF({ ...f, minecraft_nick: e.target.value })} className="w-full px-2 py-1 rounded bg-input border border-border text-sm" /> :
            <p className="font-medium truncate">{m.minecraft_nick}</p>}
          {edit ? <div className="mt-1"><RoleSelect value={f.role_name} onChange={(v: string) => setF({ ...f, role_name: v })} /></div> :
            <p className="text-xs text-muted-foreground font-pixel">{m.role_name}</p>}
        </div>
      </div>
      {edit && (
        <div className="mt-3 space-y-2">
          <input placeholder="Email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} className="w-full px-2 py-1 rounded bg-input border border-border text-sm" />
          <input placeholder="Instagram" value={f.instagram ?? ""} onChange={(e) => setF({ ...f, instagram: e.target.value })} className="w-full px-2 py-1 rounded bg-input border border-border text-sm" />
          <input placeholder="Discord" value={f.discord ?? ""} onChange={(e) => setF({ ...f, discord: e.target.value })} className="w-full px-2 py-1 rounded bg-input border border-border text-sm" />
          <input type="number" placeholder="Pořadí" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: +e.target.value })} className="w-full px-2 py-1 rounded bg-input border border-border text-sm" />
        </div>
      )}
      {canWrite && (
        <div className="mt-4 flex gap-2">
          {edit ? (
            <>
              <button onClick={() => { onSave(f); setEdit(false); }} className="flex-1 px-2 py-1.5 rounded bg-primary text-primary-foreground text-xs">Uložit</button>
              <button onClick={() => { setF(m); setEdit(false); }} className="px-2 py-1.5 rounded border border-border text-xs">Zrušit</button>
            </>
          ) : (
            <>
              <button onClick={() => setEdit(true)} className="flex-1 px-2 py-1.5 rounded border border-border text-xs inline-flex items-center justify-center gap-1"><Edit className="h-3 w-3" /> Upravit</button>
              <button onClick={onDel} className="px-2 py-1.5 rounded border border-destructive text-destructive text-xs"><Trash2 className="h-3 w-3" /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- ROLE SELECT (dropdown z custom_roles) ---------- */
function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: roles = [] } = useRoles();
  return (
    <select
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm"
    >
      <option value="">— Vyber roli —</option>
      {roles.map((r) => (
        <option key={r.id} value={r.name}>{r.name}</option>
      ))}
    </select>
  );
}

/* ---------- CONTENT ---------- */
const CONTENT_LABELS: Record<string, string> = {
  hero: "Úvod — Hero (hlavní nadpis)",
  about: "Úvod — O serveru",
  features: "Úvod — Vlastnosti (3 karty)",
  page_tym: "Stránka Tým — záhlaví",
  page_nabory: "Stránka Nábory — záhlaví",
  page_hlasovani: "Stránka Hlasování — záhlaví",
  page_banlist: "Stránka BanList — záhlaví",
};

function ContentSection({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => (await supabase.from("site_content").select("*").order("key")).data ?? [],
  });
  const save = async (key: string, value: any) => {
    const { error } = await supabase.from("site_content").upsert({ key, value });
    if (error) { toast.error(error.message); return; }
    toast.success("Uloženo.");
    qc.invalidateQueries({ queryKey: ["site_content"] });
    qc.invalidateQueries({ queryKey: ["admin-content"] });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Uprav obsah jednotlivých stránek. Změny se na webu projeví okamžitě.
      </p>
      {(data ?? []).map((row: any) => (
        <ContentEditor key={row.key} k={row.key} v={row.value} canWrite={canWrite} onSave={(nv: any) => save(row.key, nv)} />
      ))}
    </div>
  );
}

function ContentEditor({ k, v, canWrite, onSave }: any) {
  const label = CONTENT_LABELS[k] ?? k;
  // Friendly editor pro známé klíče
  if (k === "features" && v?.items) return <FeaturesEditor label={label} v={v} canWrite={canWrite} onSave={onSave} />;
  if (v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string")) {
    return <FieldsEditor label={label} v={v} canWrite={canWrite} onSave={onSave} />;
  }
  // Fallback: JSON
  return <JsonEditor label={label} v={v} canWrite={canWrite} onSave={onSave} />;
}

function FieldsEditor({ label, v, canWrite, onSave }: any) {
  const [f, setF] = useState<Record<string, string>>(v);
  const FIELD_LABELS: Record<string, string> = {
    title: "Nadpis", subtitle: "Podtitulek", text: "Text", cta: "Tlačítko (CTA)",
  };
  return (
    <div className="mc-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="font-display text-sm text-foreground">{label}</h4>
        {canWrite && <button onClick={() => onSave(f)} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Uložit</button>}
      </div>
      <div className="grid gap-3">
        {Object.keys(f).map((k) => (
          <div key={k}>
            <label className="block text-xs text-muted-foreground mb-1">{FIELD_LABELS[k] ?? k}</label>
            {(f[k]?.length ?? 0) > 80 ? (
              <textarea value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} disabled={!canWrite} rows={3} className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm" />
            ) : (
              <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} disabled={!canWrite} className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesEditor({ label, v, canWrite, onSave }: any) {
  const [items, setItems] = useState<{ title: string; text: string }[]>(v.items ?? []);
  const set = (i: number, patch: any) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const add = () => setItems([...items, { title: "", text: "" }]);
  const del = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  return (
    <div className="mc-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="font-display text-sm text-foreground">{label}</h4>
        {canWrite && <button onClick={() => onSave({ items })} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Uložit</button>}
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] items-start p-3 rounded-lg bg-input/50 border border-border/60">
            <input placeholder="Nadpis" value={it.title} onChange={(e) => set(i, { title: e.target.value })} disabled={!canWrite} className="px-3 py-2 rounded-md bg-input border border-border text-sm" />
            <input placeholder="Text" value={it.text} onChange={(e) => set(i, { text: e.target.value })} disabled={!canWrite} className="px-3 py-2 rounded-md bg-input border border-border text-sm" />
            {canWrite && <button onClick={() => del(i)} className="px-2 py-2 rounded border border-destructive text-destructive text-xs"><Trash2 className="h-3 w-3" /></button>}
          </div>
        ))}
        {canWrite && <button onClick={add} className="px-3 py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary"><Plus className="h-3 w-3 inline mr-1" /> Přidat položku</button>}
      </div>
    </div>
  );
}

function JsonEditor({ label, v, canWrite, onSave }: any) {
  const [txt, setTxt] = useState(JSON.stringify(v, null, 2));
  return (
    <div className="mc-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h4 className="font-display text-sm text-foreground">{label} <span className="text-xs text-muted-foreground font-sans font-normal">(JSON)</span></h4>
        {canWrite && <button onClick={() => { try { onSave(JSON.parse(txt)); } catch { toast.error("Neplatný JSON"); } }} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Uložit</button>}
      </div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} disabled={!canWrite} rows={8} className="w-full font-mono text-xs px-3 py-2 rounded-md bg-input border border-border" />
    </div>
  );
}


/* ---------- RECRUITS ---------- */
function RecruitsSection({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-recruits"],
    queryFn: async () => (await supabase.from("recruitments").select("*").order("sort_order")).data ?? [],
  });
  const [f, setF] = useState({ title: "", description: "", requirements: "", active: true, sort_order: 0 });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("recruitments").insert(f);
    if (error) { toast.error(error.message); return; }
    setF({ title: "", description: "", requirements: "", active: true, sort_order: 0 });
    qc.invalidateQueries({ queryKey: ["admin-recruits"] });
    qc.invalidateQueries({ queryKey: ["recruitments"] });
  };
  const del = async (id: string) => {
    if (!confirm("Smazat?")) return;
    await supabase.from("recruitments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-recruits"] });
    qc.invalidateQueries({ queryKey: ["recruitments"] });
  };
  const toggle = async (r: any) => {
    await supabase.from("recruitments").update({ active: !r.active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["admin-recruits"] });
    qc.invalidateQueries({ queryKey: ["recruitments"] });
  };
  return (
    <div className="space-y-6">
      {canWrite && (
        <form onSubmit={add} className="mc-card rounded-xl p-6 grid gap-3">
          <input required placeholder="Název pozice" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
          <textarea required placeholder="Popis" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="px-3 py-2 rounded-md bg-input border border-border" />
          <textarea placeholder="Požadavky" value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} rows={2} className="px-3 py-2 rounded-md bg-input border border-border" />
          <button className="mc-btn rounded-md">Přidat nábor</button>
        </form>
      )}
      <div className="grid gap-3">
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="mc-card rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-pixel text-sm text-primary">{r.title} {!r.active && <span className="text-muted-foreground text-xs">(neaktivní)</span>}</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{r.description}</p>
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <button onClick={() => toggle(r)} className="px-2 py-1 rounded border border-border text-xs">{r.active ? "Deaktivovat" : "Aktivovat"}</button>
                <button onClick={() => del(r.id)} className="px-2 py-1 rounded border border-destructive text-destructive text-xs"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- VOTES ---------- */
function VotesSection({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-votes"],
    queryFn: async () => (await supabase.from("vote_links").select("*").order("sort_order")).data ?? [],
  });
  const [f, setF] = useState({ name: "", url: "", description: "", sort_order: 0 });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("vote_links").insert(f);
    if (error) { toast.error(error.message); return; }
    setF({ name: "", url: "", description: "", sort_order: 0 });
    qc.invalidateQueries({ queryKey: ["admin-votes"] });
    qc.invalidateQueries({ queryKey: ["vote_links"] });
  };
  const del = async (id: string) => {
    if (!confirm("Smazat?")) return;
    await supabase.from("vote_links").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-votes"] });
    qc.invalidateQueries({ queryKey: ["vote_links"] });
  };
  return (
    <div className="space-y-6">
      {canWrite && (
        <form onSubmit={add} className="mc-card rounded-xl p-6 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Název" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
          <input required placeholder="URL" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className="px-3 py-2 rounded-md bg-input border border-border" />
          <input placeholder="Popis" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded-md bg-input border border-border" />
          <button className="mc-btn rounded-md sm:col-span-2">Přidat odkaz</button>
        </form>
      )}
      <div className="grid gap-3">
        {(data ?? []).map((v: any) => (
          <div key={v.id} className="mc-card rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-pixel text-sm text-primary">{v.name}</p>
              <a href={v.url} className="text-xs text-muted-foreground truncate block" target="_blank" rel="noreferrer">{v.url}</a>
            </div>
            {canWrite && <button onClick={() => del(v.id)} className="px-2 py-1 rounded border border-destructive text-destructive text-xs"><Trash2 className="h-3 w-3" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- BRANDING ---------- */
function BrandingSection() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-branding"],
    queryFn: async () => (await supabase.from("branding").select("*").eq("id", 1).maybeSingle()).data,
  });
  const onUpload = async (field: "logo_url" | "banner_url", file: File) => {
    if (file.size > 1_000_000) { toast.error("Max 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const payload: any = { id: 1, [field]: dataUrl };
      const { error } = await supabase.from("branding").upsert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Nahráno.");
      qc.invalidateQueries({ queryKey: ["branding"] });
      qc.invalidateQueries({ queryKey: ["admin-branding"] });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <BrandingItem label="Logo" preview={data?.logo_url} onFile={(f: File) => onUpload("logo_url", f)} square />
      <BrandingItem label="Banner" preview={data?.banner_url} onFile={(f: File) => onUpload("banner_url", f)} />
    </div>
  );
}
function BrandingItem({ label, preview, onFile, square }: any) {
  return (
    <div className="mc-card rounded-xl p-6">
      <h3 className="font-pixel text-sm text-primary mb-4">{label}</h3>
      {preview ? (
        <img src={preview} alt={label} className={`mb-4 rounded border border-border ${square ? "h-32 w-32 object-cover" : "w-full h-32 object-cover"}`} style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className={`mb-4 grid place-items-center rounded border border-dashed border-border text-muted-foreground text-xs ${square ? "h-32 w-32" : "w-full h-32"}`}>žádný obrázek</div>
      )}
      <label className="mc-btn rounded-md inline-flex items-center gap-2 cursor-pointer">
        <Upload className="h-4 w-4" /> Nahrát
        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files && onFile(e.target.files[0])} />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">Max 1 MB. Ukládá se jako data URL.</p>
    </div>
  );
}
