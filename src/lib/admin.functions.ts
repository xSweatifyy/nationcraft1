import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_SUPABASE_URL = "https://xogcbgdxdvwekdsjsrhk.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ObJjr0j_xeA7Yu9Wv7imcg_w_i2P2MV";

function readProcessEnv(name: string) {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

function getSupabaseUrl() {
  return readProcessEnv("SUPABASE_URL") ?? readProcessEnv("VITE_SUPABASE_URL") ?? FALLBACK_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return readProcessEnv("SUPABASE_PUBLISHABLE_KEY") ?? readProcessEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? FALLBACK_SUPABASE_PUBLISHABLE_KEY;
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function getSupabaseAdmin() {
  const SUPABASE_URL = getSupabaseUrl();
  const SUPABASE_SERVICE_ROLE_KEY = readProcessEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Backend administrace není správně dostupný. Zkus obnovit stránku, případně backend restartovat.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const requireAdminSession = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = getSupabaseUrl();
  const SUPABASE_PUBLISHABLE_KEY = getSupabasePublishableKey();

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Backend přihlášení není správně dostupný. Zkus obnovit stránku, případně backend restartovat.");
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: přihlas se znovu.");

  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: přihlas se znovu.");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized: přihlas se znovu.");

  return next({
    context: {
      supabase,
      userId: data.user.id,
      claims: data.user,
    },
  });
});

// Bootstrap: vytvoří účet Itz_Andilek (admin + full_access + must_change_password)
// Idempotentní — pokud profil s tímhle nickem existuje, nic nedělá.
export const bootstrapAndilek = createServerFn({ method: "POST" }).handler(async () => {
  const supabaseAdmin = getSupabaseAdmin();
  const email = "itz_andilek@nationcraft.local";

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, must_change_password")
    .eq("minecraft_nick", "Itz_Andilek")
    .maybeSingle();
  if (existing) return { ok: true, already: true };

  const password = "123456";

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = users.users.find((u) => u.email?.toLowerCase() === email);

  if (existingAuthUser) {
    await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        minecraft_nick: "Itz_Andilek",
        full_access: true,
        must_change_password: true,
      },
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", existingAuthUser.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: existingAuthUser.id, role: "vedeni" });
    await supabaseAdmin.from("profiles").upsert({
      id: existingAuthUser.id,
      minecraft_nick: "Itz_Andilek",
      full_access: true,
      must_change_password: true,
      display_role: "Admin",
    });
    return { ok: true, repaired: true, email };
  }

  // try create
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      minecraft_nick: "Itz_Andilek",
      full_access: true,
      must_change_password: true,
    },
  });
  if (error || !created.user) return { ok: false, error: error?.message ?? "create failed" };

  // přiřaď roli admin
  await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });

  // ujisti se, že profil je správně (trigger by to měl udělat)
  await supabaseAdmin
    .from("profiles")
    .upsert({
      id: created.user.id,
      minecraft_nick: "Itz_Andilek",
      full_access: true,
      must_change_password: true,
      display_role: "Admin",
    });

  return { ok: true, created: true, email };
});

// Helper kontroly full_access
async function assertFullAccess(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_full_access", { _user_id: userId });
  if (!data) throw new Error("Forbidden: vyžaduje Vedení nebo full access");
}

// Heuristic: map a custom role to an app_role enum tier from its permissions.
// "manageAll" => vedeni + full_access; explicit "Admin" name or manageUsers => admin; else developer.
function deriveTier(name: string, perms: any): { role: "vedeni" | "admin" | "developer"; full_access: boolean } {
  const p = perms ?? {};
  if (p.manageAll) return { role: "vedeni", full_access: true };
  if (name.toLowerCase() === "admin" || p.manageUsers || p.manageRoles) return { role: "admin", full_access: false };
  return { role: "developer", full_access: false };
}

async function resolveRole(displayRole: string): Promise<{ role: "vedeni" | "admin" | "developer"; full_access: boolean }> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: cr } = await supabaseAdmin
    .from("custom_roles")
    .select("name, permissions")
    .ilike("name", displayRole)
    .maybeSingle();
  if (cr) return deriveTier(cr.name, cr.permissions);
  // fallback for legacy names
  const lower = displayRole.toLowerCase();
  if (lower === "vedení" || lower === "vedeni") return { role: "vedeni", full_access: true };
  if (lower === "admin") return { role: "admin", full_access: false };
  return { role: "developer", full_access: false };
}

// Admin: vytvořit uživatele (nick + display role + jednorázové heslo)
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireAdminSession])
  .inputValidator((d: { nick: string; password: string; display_role: string; full_access?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertFullAccess(context.supabase, context.userId);
    const supabaseAdmin = getSupabaseAdmin();
    const tier = await resolveRole(data.display_role);
    const fa = typeof data.full_access === "boolean" ? data.full_access : tier.full_access;
    const email = `${data.nick.toLowerCase().replace(/[^a-z0-9_]/g, "")}@nationcraft.local`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        minecraft_nick: data.nick,
        full_access: fa,
        must_change_password: true,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "create failed");
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: tier.role });
    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      minecraft_nick: data.nick,
      full_access: fa,
      must_change_password: true,
      display_role: data.display_role,
    });
    return { ok: true, email };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdminSession])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertFullAccess(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Nemůžeš smazat sám sebe.");
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireAdminSession])
  .inputValidator((d: { user_id: string; password: string }) => d)
  .handler(async ({ data, context }) => {
    await assertFullAccess(context.supabase, context.userId);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", data.user_id);
    return { ok: true };
  });

export const adminChangeRole = createServerFn({ method: "POST" })
  .middleware([requireAdminSession])
  .inputValidator((d: { user_id: string; display_role: string; full_access?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertFullAccess(context.supabase, context.userId);
    const supabaseAdmin = getSupabaseAdmin();
    const tier = await resolveRole(data.display_role);
    const fa = typeof data.full_access === "boolean" ? data.full_access : tier.full_access;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: tier.role });
    await supabaseAdmin.from("profiles").update({ full_access: fa, display_role: data.display_role }).eq("id", data.user_id);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAdminSession])
  .handler(async ({ context }) => {
    await assertFullAccess(context.supabase, context.userId);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, minecraft_nick, full_access, must_change_password, created_at, display_role")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    return (profiles ?? []).map((p: any) => ({
      ...p,
      role: roleMap.get(p.id) ?? null,
      display_role: p.display_role ?? (roleMap.get(p.id) === "vedeni" ? "Vedení" : roleMap.get(p.id) === "admin" ? "Admin" : roleMap.get(p.id) === "developer" ? "Developer" : null),
    }));
  });

