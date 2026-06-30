import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, UserMinus, Pencil, Check, X, Flame, ListTodo, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, RoleBadge } from "@/components/site/RoleBadge";

type Task = {
  id: string;
  board_role: string;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "normal" | "high";
  created_by: string;
  created_by_nick: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type Assignee = { id: string; task_id: string; user_id: string; nick: string };

const COLUMNS: { key: Task["status"]; label: string; accent: string }[] = [
  { key: "todo", label: "To Do", accent: "from-slate-500/40 to-slate-500/0" },
  { key: "doing", label: "Probíhá", accent: "from-amber-500/40 to-amber-500/0" },
  { key: "done", label: "Hotovo", accent: "from-emerald-500/40 to-emerald-500/0" },
];

const PRIO_STYLE: Record<Task["priority"], string> = {
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  normal: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  high: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function TasksBoard({
  me,
  myRoleName,
  fullAccess,
  myPerms,
}: {
  me: any;
  myRoleName: string | null;
  fullAccess: boolean;
  myPerms: Record<string, boolean>;
}) {
  const qc = useQueryClient();
  const { data: roles = [] } = useRoles();

  // Boards = role-y, které mají ownTaskBoard. Vidí je všichni s rolí.
  const boardRoles = useMemo(
    () => roles.filter((r: any) => r.permissions?.ownTaskBoard).map((r: any) => r.name),
    [roles],
  );

  const [board, setBoard] = useState<string | null>(null);
  useEffect(() => {
    if (board || boardRoles.length === 0) return;
    if (myRoleName && boardRoles.includes(myRoleName)) setBoard(myRoleName);
    else setBoard(boardRoles[0]);
  }, [boardRoles, myRoleName, board]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", board],
    enabled: !!board,
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("board_role", board!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []) as Task[];
    },
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ["task_assignees", board, tasks.length],
    enabled: !!board && tasks.length > 0,
    queryFn: async () => {
      const ids = tasks.map((t) => t.id);
      if (ids.length === 0) return [] as Assignee[];
      const { data } = await supabase.from("task_assignees").select("*").in("task_id", ids);
      return (data ?? []) as Assignee[];
    },
  });

  // realtime
  useEffect(() => {
    if (!board) return;
    const ch = supabase
      .channel(`tasks-${board}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        qc.invalidateQueries({ queryKey: ["tasks", board] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, () => {
        qc.invalidateQueries({ queryKey: ["task_assignees", board] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [board, qc]);

  // "Hlavní" rola dané nástěnky = může zadávat a editovat. Ostatní jen vidí, mění status, hlásí se.
  const isMainOfBoard = !!myRoleName && !!board && myRoleName.toLowerCase() === board.toLowerCase();
  const canManageAll = fullAccess || !!myPerms.manageAllTasks || myRoleName?.toLowerCase() === "admin" || myRoleName?.toLowerCase() === "vedení";
  const canCreate = canManageAll || isMainOfBoard;
  // Status & self-assign smí všichni team členové
  const canMoveStatus = true;

  const [newTitle, setNewTitle] = useState("");
  const [newPrio, setNewPrio] = useState<Task["priority"]>("normal");
  const myNick = me?.user_metadata?.minecraft_nick || me?.email?.split("@")[0] || "Admin";

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!board || !newTitle.trim()) return;
    if (!canCreate) { toast.error("Pouze hlavní role smí zadávat úkoly."); return; }
    const { error } = await supabase.from("tasks").insert({
      board_role: board,
      title: newTitle.trim(),
      priority: newPrio,
      created_by: me.id,
      created_by_nick: myNick,
    });
    if (error) { toast.error(error.message); return; }
    setNewTitle("");
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Smazat úkol?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const joinTask = async (taskId: string) => {
    const { error } = await supabase.from("task_assignees").insert({
      task_id: taskId, user_id: me.id, nick: myNick,
    });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
  };
  const leaveTask = async (taskId: string) => {
    const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("user_id", me.id);
    if (error) toast.error(error.message);
  };

  const byCol = (s: Task["status"]) => tasks.filter((t) => t.status === s);
  const assOf = (taskId: string) => assignees.filter((a) => a.task_id === taskId);

  // ---- Drag & drop ----
  const [dragId, setDragId] = useState<string | null>(null);
  const onDropCol = (status: Task["status"]) => async (e: React.DragEvent) => {
    e.preventDefault();
    const id = dragId || e.dataTransfer.getData("text/plain");
    setDragId(null);
    if (!id) return;
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === status) return;
    // Optimistic
    qc.setQueryData<Task[]>(["tasks", board], (old) =>
      (old ?? []).map((x) => (x.id === id ? { ...x, status } : x)),
    );
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["tasks", board] });
    }
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  if (boardRoles.length === 0) {
    return (
      <div className="mc-card rounded-xl p-10 text-center">
        <ListTodo className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Žádná role nemá vlastní nástěnku. V sekci <strong>Role</strong> zapni u role „Vlastní nástěnka úkolů".
        </p>
      </div>
    );
  }

  const activeRole: any = roles.find((r: any) => r.name === board);

  return (
    <div className="space-y-5">
      {/* board switcher */}
      <div className="mc-card rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground px-2">Nástěnka:</span>
        <div className="flex flex-wrap gap-2 min-w-0">
          {boardRoles.map((rn) => {
            const r: any = roles.find((x: any) => x.name === rn);
            const active = board === rn;
            return (
              <button
                key={rn}
                onClick={() => setBoard(rn)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                style={{
                  backgroundColor: active ? r.color : `${r.color}1f`,
                  borderColor: `${r.color}66`,
                  color: active ? (isLight(r.color) ? "#0b0b0f" : "#ffffff") : r.color,
                  boxShadow: active ? `0 0 0 1px ${r.color}55, 0 4px 18px -4px ${r.color}99` : "none",
                }}
              >
                {rn}
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground">
          {canCreate ? "✓ smíš zadávat úkoly" : "👀 přesouvání + přihlášení povoleno"}
        </div>
      </div>

      {/* header */}
      {activeRole && (
        <div
          className="rounded-xl p-4 sm:p-5 border relative overflow-hidden"
          style={{
            borderColor: `${activeRole.color}55`,
            background: `linear-gradient(135deg, ${activeRole.color}1a, transparent 60%)`,
          }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Nástěnka</div>
              <h2 className="font-display text-xl sm:text-2xl text-foreground flex items-center gap-3 flex-wrap min-w-0">
                <RoleBadge roleName={activeRole.name} size="md" />
                <span className="text-sm text-muted-foreground">· {tasks.length} úkolů</span>
              </h2>
            </div>
            {canCreate && (
              <form onSubmit={addTask} className="flex gap-2 flex-wrap items-center w-full sm:w-auto">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nový úkol…"
                  className="px-3 py-2 rounded-md bg-input border border-border text-sm flex-1 sm:flex-none sm:min-w-[220px] min-w-0"
                />
                <select
                  value={newPrio}
                  onChange={(e) => setNewPrio(e.target.value as Task["priority"])}
                  className="px-3 py-2 rounded-md bg-input border border-border text-xs"
                >
                  <option value="low">Nízká</option>
                  <option value="normal">Normální</option>
                  <option value="high">Vysoká</option>
                </select>
                <button className="mc-btn rounded-md text-xs">
                  <Plus className="h-4 w-4 inline mr-1" /> Přidat
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* kanban — drag & drop */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`mc-card rounded-xl flex flex-col min-h-[300px] transition ${
              dragId ? "ring-1 ring-primary/30" : ""
            }`}
            onDragOver={onDragOver}
            onDrop={onDropCol(col.key)}
          >
            <div className={`px-4 py-3 border-b border-border/60 flex items-center justify-between bg-gradient-to-r ${col.accent}`}>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm text-foreground">{col.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {byCol(col.key).length}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-2.5 flex-1">
              {byCol(col.key).map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  assignees={assOf(t.id)}
                  meId={me.id}
                  canEdit={canCreate}
                  canMoveStatus={canMoveStatus}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  onJoin={() => joinTask(t.id)}
                  onLeave={() => leaveTask(t.id)}
                  onUpdate={(p) => updateTask(t.id, p)}
                  onDelete={() => deleteTask(t.id)}
                />
              ))}
              {byCol(col.key).length === 0 && (
                <div className="text-[11px] text-muted-foreground text-center py-10 opacity-60 border border-dashed border-border/40 rounded-lg">
                  přetáhni úkol sem
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task, assignees, meId, canEdit, canMoveStatus, onJoin, onLeave, onUpdate, onDelete, onDragStart, onDragEnd,
}: {
  task: Task;
  assignees: Assignee[];
  meId: string;
  canEdit: boolean;
  canMoveStatus: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onUpdate: (p: Partial<Task>) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [prio, setPrio] = useState<Task["priority"]>(task.priority);
  const mine = assignees.some((a) => a.user_id === meId);

  const save = () => {
    onUpdate({ title: title.trim() || task.title, description: desc, priority: prio });
    setEdit(false);
  };

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const roleMap = new Map((userRoles as any[]).map((u) => [u.user_id, u.role]));

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      className="group rounded-lg border border-border/60 bg-card/60 p-3 hover:border-primary/40 transition relative cursor-grab active:cursor-grabbing"
    >
      {/* priority + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${PRIO_STYLE[task.priority]} inline-flex items-center gap-1`}>
            {task.priority === "high" && <Flame className="h-3 w-3" />}
            {task.priority === "high" ? "Vysoká" : task.priority === "low" ? "Nízká" : "Normální"}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <select
            value={task.status}
            onChange={(e) => onUpdate({ status: e.target.value as Task["status"] })}
            disabled={!canMoveStatus}
            className="text-[10px] px-1.5 py-0.5 rounded bg-input border border-border"
            title="Změnit stav"
          >
            <option value="todo">To Do</option>
            <option value="doing">Probíhá</option>
            <option value="done">Hotovo</option>
          </select>
          {canEdit && (
            <>
              <button onClick={() => setEdit((e) => !e)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
              <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </>
          )}
        </div>
      </div>

      {edit ? (
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-1.5 rounded bg-input border border-border text-sm" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Popis…" className="w-full px-2 py-1.5 rounded bg-input border border-border text-xs min-h-[60px]" />
          <select value={prio} onChange={(e) => setPrio(e.target.value as Task["priority"])} className="px-2 py-1 rounded bg-input border border-border text-xs">
            <option value="low">Nízká</option>
            <option value="normal">Normální</option>
            <option value="high">Vysoká</option>
          </select>
          <div className="flex gap-1">
            <button onClick={save} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs inline-flex items-center gap-1"><Check className="h-3 w-3" /> Uložit</button>
            <button onClick={() => setEdit(false)} className="px-2 py-1 rounded border border-border text-xs inline-flex items-center gap-1"><X className="h-3 w-3" /> Zrušit</button>
          </div>
        </div>
      ) : (
        <>
          <h4 className="text-sm font-semibold text-foreground leading-snug break-words">{task.title}</h4>
          {task.description && <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-words">{task.description}</p>}
        </>
      )}

      {/* assignees */}
      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex -space-x-2">
          {assignees.map((a) => (
            <img
              key={a.id}
              src={`https://mc-heads.net/head/${encodeURIComponent(a.nick)}/64`}
              alt={a.nick}
              title={a.nick}
              className="h-8 w-8 rounded-md border-2 border-card"
              style={{ imageRendering: "pixelated" }}
              loading="lazy"
            />
          ))}
          {assignees.length === 0 && <span className="text-[10px] text-muted-foreground">nikdo</span>}
        </div>
        <button
          onClick={mine ? onLeave : onJoin}
          className={`text-[10px] px-2 py-1 rounded-full border inline-flex items-center gap-1 transition ${
            mine
              ? "border-destructive/50 text-destructive hover:bg-destructive/10"
              : "border-primary/50 text-primary hover:bg-primary/10"
          }`}
        >
          {mine ? <><UserMinus className="h-3 w-3" /> Odebrat</> : <><UserPlus className="h-3 w-3" /> Přihlásit se</>}
        </button>
      </div>

      {assignees.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {assignees.map((a) => {
            const role = roleMap.get(a.user_id);
            const display = role === "vedeni" ? "Vedení" : role === "admin" ? "Admin" : role === "developer" ? "Developer" : (role ?? null);
            return (
              <div key={a.id} className="inline-flex items-center gap-1.5 text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">
                <span className="text-foreground/90 font-medium">{a.nick}</span>
                {display && <RoleBadge roleName={display} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}
