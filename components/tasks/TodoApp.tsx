"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTasks } from "@/hooks/useTasks";
import { useTheme } from "@/hooks/useTheme";
import { TaskItem } from "./TaskItem";
import { AddTaskForm } from "./AddTaskForm";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { registerServiceWorker, requestNotificationPermission, scheduleLocalReminder } from "@/lib/notifications";

type Filter  = "all" | "active" | "completed" | "overdue";
type SortKey = "createdAt" | "dueDate" | "priority" | "title";

const PRI_ORDER = { high: 0, medium: 1, low: 2 } as const;

function isOverdue(task: { dueDate: string | null; completed: boolean }) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < new Date();
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function TodoApp() {
  const { data: session }  = useSession();
  const { theme, toggle: toggleTheme } = useTheme();
  const { tasks, loading, addTask, updateTask, deleteTask, toggleComplete, addSubtask, toggleSubtask, deleteSubtask, syncToCalendar, unsyncFromCalendar } = useTasks();
  const now = useCurrentTime();

  const [filter,      setFilter]      = useState<Filter>("all");
  const [sortBy,      setSortBy]      = useState<SortKey>("createdAt");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDrawer,  setShowDrawer]  = useState(false);

  // Register service worker on mount
  useEffect(() => { registerServiceWorker(); }, []);

  // Schedule reminders for tasks with reminderMinutes set
  useEffect(() => {
    if (!tasks.length) return;
    requestNotificationPermission().then((granted) => {
      if (!granted) return;
      tasks.forEach((task) => {
        if (task.dueDate && task.reminderMinutes && !task.completed) {
          scheduleLocalReminder(task.title, task.dueDate, task.reminderMinutes);
        }
      });
    });
  }, [tasks]);

  const stats = useMemo(() => {
    const total = tasks.length, done = tasks.filter((t) => t.completed).length;
    return { total, done, active: total - done, overdue: tasks.filter(isOverdue).length };
  }, [tasks]);

  const velocity = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const visible = useMemo(() => {
    let r = [...tasks];
    if (filter === "active")    r = r.filter((t) => !t.completed);
    if (filter === "completed") r = r.filter((t) => t.completed);
    if (filter === "overdue")   r = r.filter(isOverdue);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (sortBy === "priority") return r.sort((a, b) => PRI_ORDER[a.priority] - PRI_ORDER[b.priority]);
    if (sortBy === "dueDate")  return r.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    if (sortBy === "title") return r.sort((a, b) => a.title.localeCompare(b.title));
    return r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, filter, sortBy, searchQuery]);

  const name     = session?.user?.name ?? "";
  const userName = name.trim().split(" ").filter(Boolean).map(p => p.toLowerCase()).join("_") || "operator";
  const dateStr  = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
  const timeStr  = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const iStyle: React.CSSProperties = {
    background: "var(--glass)", border: "1px solid var(--frost)", borderRadius: 2,
    color: "var(--carbon)", padding: "9px 12px", fontSize: 12,
    fontFamily: "var(--font-mono), monospace",
    transition: "border-color 0.15s",
  };

  // ── Drag-and-drop ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visible.findIndex((t) => t.id === active.id);
    const newIndex = visible.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(visible, oldIndex, newIndex);
    // Persist to server
    try {
      await fetch("/api/tasks/reorder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
      });
    } catch (e) { console.error("Reorder failed:", e); }
  }, [visible]);

  return (
    <div style={{ fontFamily: "var(--font-display), sans-serif", minHeight: "100vh", position: "relative", zIndex: 10 }}>

      {/* ── Sticky Glass Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50, width: "100%",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--frost)",
        background: "var(--surface)",
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setShowDrawer(true)}
                title="Profile"
                style={{
                  position: "relative", width: 32, height: 32, borderRadius: 2,
                  overflow: "hidden", border: "1px solid var(--frost)",
                  cursor: "pointer", background: "none", padding: 0,
                }}
              >
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: theme === "dark" ? "grayscale(1) contrast(1.25)" : "none" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--acid)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--void)", fontWeight: 700 }}>
                    {name.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, background: "var(--acid)", borderRadius: "50%", border: "2px solid var(--void)" }} />
              </button>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, letterSpacing: "0.12em", color: "var(--ash)", textTransform: "uppercase", opacity: 0.8 }}>
                {userName.toUpperCase()}_TASKS_V2
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Theme toggle */}
              <button onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} style={{
                background: "none", border: "1px solid var(--frost)", borderRadius: 2,
                cursor: "pointer", padding: "4px 8px", fontSize: 14,
                color: "var(--acid)", transition: "all 0.15s",
              }}>
                {theme === "dark" ? "☀" : "☾"}
              </button>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 700, color: "var(--acid)", letterSpacing: "0.1em" }}>
                {dateStr} <span style={{ color: "var(--ash)", margin: "0 4px" }}>/</span> {timeStr}
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ padding: "8px 16px 24px" }}>
            <h1 style={{
              fontSize: 42, lineHeight: 0.85, fontWeight: 700, letterSpacing: "-0.03em",
              color: "var(--acid)", textTransform: "uppercase",
              filter: theme === "dark" ? "drop-shadow(0 0 15px rgba(200,249,6,0.3))" : "none",
            }}>
              Directives
            </h1>
          </div>

          {/* Decorative line */}
          <div style={{ height: 1, width: "100%", background: `linear-gradient(90deg, var(--acid), transparent)`, opacity: 0.5 }} />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 140px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
          <div style={{ background: "var(--glass)", border: "1px solid var(--frost)", padding: 14, backdropFilter: "blur(8px)", borderRadius: 2 }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", textTransform: "uppercase", marginBottom: 4 }}>Pending</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{String(stats.active).padStart(2, "0")}</p>
          </div>
          <div style={{ background: "var(--glass)", border: "1px solid var(--frost)", padding: 14, backdropFilter: "blur(8px)", borderRadius: 2 }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", textTransform: "uppercase", marginBottom: 4 }}>Velocity</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--acid)" }}>{velocity}</p>
              <span style={{ fontSize: 10, color: "var(--ash)" }}>%</span>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
          {(["all", "active", "completed", "overdue"] as Filter[]).map((f) => {
            const count = { all: stats.total, active: stats.active, completed: stats.done, overdue: stats.overdue }[f];
            const active = filter === f;
            const warn   = f === "overdue" && stats.overdue > 0;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 14px", borderRadius: 2, fontSize: 10, fontWeight: 500,
                fontFamily: "var(--font-mono), monospace", textTransform: "uppercase",
                letterSpacing: "0.05em", cursor: "pointer",
                border: `1px solid ${active ? (warn ? "var(--red)" : "var(--acid)") : "var(--frost)"}`,
                background: active ? (warn ? "rgba(248,113,113,0.1)" : "rgba(200,249,6,0.08)") : "transparent",
                color: active ? (warn ? "var(--red)" : "var(--acid)") : "var(--ash)",
                transition: "all 0.15s", opacity: active ? 1 : 0.8,
              }}>
                {f.toUpperCase()}
                <span style={{ marginLeft: 6, fontWeight: 700 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + sort */}
        <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 2, minWidth: 140 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ash)", fontSize: 12, pointerEvents: "none", fontFamily: "var(--font-mono)" }}>⌕</span>
            <input
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH..."
              style={{ ...iStyle, width: "100%", paddingLeft: 30 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--acid)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--frost)")}
            />
          </div>
          <select
            value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
            style={{ ...iStyle, cursor: "pointer" }}
          >
            <option value="createdAt">NEWEST</option>
            <option value="dueDate">DUE DATE</option>
            <option value="priority">PRIORITY</option>
            <option value="title">A → Z</option>
          </select>
          {stats.done > 0 && (
            <button
              onClick={async () => {
                const done = tasks.filter((t) => t.completed);
                await Promise.all(done.map((t) => deleteTask(t.id)));
              }}
              style={{
                padding: "9px 14px", borderRadius: 2, fontSize: 10, cursor: "pointer",
                fontFamily: "var(--font-mono), monospace", textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: "1px solid var(--red)", background: "transparent", color: "var(--red)", opacity: 0.7,
              }}
            >
              CLEAR ({stats.done})
            </button>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                position: "relative", height: 72, background: "var(--glass)",
                border: "1px solid var(--frost)", borderRadius: 2, overflow: "hidden",
              }}>
                <div className="animate-scanline" style={{
                  position: "absolute", inset: 0, width: "200%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
                }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 24px", opacity: 0.4 }}>
                  <div style={{ height: 16, width: "75%", background: "var(--frost)", borderRadius: 2 }} />
                  <div style={{ height: 12, width: "25%", background: "var(--frost)", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              {searchQuery ? `No matches for "${searchQuery}"` : filter === "all" ? "No Directives Pending" : `No ${filter} directives`}
            </p>
            <div className="animate-blink" style={{ width: 8, height: 16, background: "var(--acid)" }} />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visible.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {visible.map((task, i) => (
                  <TaskItem
                    key={task.id} task={task} idx={i}
                    onToggle={toggleComplete} onUpdate={updateTask}
                    onDelete={deleteTask} onSync={syncToCalendar}
                    onUnsync={unsyncFromCalendar}
                    onAddSubtask={addSubtask}
                    onToggleSubtask={toggleSubtask}
                    onDeleteSubtask={deleteSubtask}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* ── Floating Add Button ── */}
      <AddTaskForm onAdd={addTask} />

      {/* Profile Drawer */}
      {showDrawer && (
        <ProfileDrawer
          stats={stats}
          velocity={velocity}
          theme={theme}
          user={{ name: session?.user?.name ?? "", email: session?.user?.email ?? "", image: session?.user?.image ?? null }}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}

/* ── Inline Profile Drawer ── */
function ProfileDrawer({
  stats, velocity, theme, user, onClose,
}: {
  stats: { total: number; done: number; active: number; overdue: number };
  velocity: number;
  theme: string;
  user:  { name: string; email: string; image: string | null };
  onClose: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 1000, animation: "fadeIn 0.15s ease" }} />
      <div className="animate-slide-right" style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: 360, maxWidth: "100%",
        background: "var(--surface-solid)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid var(--frost)",
        overflowY: "auto", zIndex: 1001, boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
      }}>
        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, background: "var(--surface-solid)", zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1px solid var(--frost)",
        }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.1em" }}>OPERATOR_PROFILE</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", fontSize: 16, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: "24px 24px 32px" }}>
          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24 }}>
            {user.image ? (
              <img src={user.image} alt={user.name} style={{ width: 72, height: 72, borderRadius: 2, objectFit: "cover", filter: theme === "dark" ? "grayscale(1) contrast(1.25)" : "none", border: "1px solid var(--frost)" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 2, background: "var(--acid)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "var(--void)", fontWeight: 700 }}>
                {user.name.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{user.name || "Operator"}</div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", marginTop: 4 }}>{user.email}</div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--frost)", marginBottom: 24 }} />

          {/* Stats */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 500 }}>Mission Stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Total",   value: stats.total,   color: "var(--carbon)" },
                { label: "Done",    value: stats.done,    color: "var(--green)"  },
                { label: "Overdue", value: stats.overdue, color: stats.overdue > 0 ? "var(--red)" : "var(--ash)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--glass)", border: "1px solid var(--frost)", borderRadius: 2, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "var(--ash)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "var(--glass)", border: "1px solid var(--frost)", borderRadius: 2, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", textTransform: "uppercase" }}>Velocity</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--acid)", fontWeight: 700 }}>{velocity}%</span>
              </div>
              <div style={{ height: 4, background: "var(--frost)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${velocity}%`, background: "var(--acid)", borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--frost)", marginBottom: 24 }} />

          {/* Calendar note */}
          <div style={{ background: "var(--glass)", border: "1px solid var(--frost)", borderRadius: 2, padding: "12px 14px", marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--acid)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>📅 Calendar Sync</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ash)", lineHeight: 1.6 }}>
              Account connected. Use task sync to push directives as calendar events.
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              width: "100%", padding: 11, borderRadius: 2,
              border: "1px solid var(--frost)", background: "transparent",
              color: "var(--ash)", fontSize: 10, cursor: "pointer",
              fontFamily: "var(--font-mono), monospace",
              textTransform: "uppercase", letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--frost)"; e.currentTarget.style.color = "var(--ash)"; }}
          >
            Disconnect
          </button>
        </div>
      </div>
    </>
  );
}
