"use client";
import { useState } from "react";
import { Task, TaskInput } from "@/hooks/useTasks";
import { CalendarSyncButton } from "./CalendarSyncButton";
import { SubtaskList } from "./SubtaskList";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PRI_BAR: Record<string, { bar: string; glow: boolean }> = {
  high:   { bar: "var(--acid)",  glow: true },
  medium: { bar: "var(--ash)",   glow: false },
  low:    { bar: "var(--frost)", glow: false },
};

function isOverdue(t: Task) {
  if (!t.dueDate || t.completed) return false;
  return new Date(t.dueDate) < new Date();
}

type Props = {
  task:     Task;
  idx:      number;
  onToggle: (id: string) => void;
  onUpdate: (id: string, changes: Partial<TaskInput> & { completed?: boolean }) => Promise<any>;
  onDelete: (id: string) => void;
  onSync:   (taskId: string, calendarId: string) => Promise<any>;
  onUnsync: (taskId: string) => Promise<any>;
  onAddSubtask:    (taskId: string, title: string) => Promise<any>;
  onToggleSubtask: (taskId: string, subtaskId: string) => Promise<any>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<any>;
};

export function TaskItem({ task, idx, onToggle, onUpdate, onDelete, onSync, onUnsync, onAddSubtask, onToggleSubtask, onDeleteSubtask }: Props) {
  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle]   = useState(task.title);
  const [eDesc, setEDesc]     = useState(task.description ?? "");
  const [ePri, setEPri]       = useState(task.priority);
  const [eDue, setEDue]       = useState(task.dueDate?.split("T")[0] ?? "");
  const [eTime, setETime]     = useState(() => {
    if (!task.dueDate) return "";
    const d = new Date(task.dueDate);
    if (isNaN(d.getTime())) return "";
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return h === "00" && m === "00" ? "" : `${h}:${m}`;
  });
  const [eTags, setETags]     = useState(task.tags.join(", "));
  const [eErr, setEErr]       = useState("");
  const [busy, setBusy]       = useState(false);
  const [hovered, setHovered] = useState(false);

  const overdue = isOverdue(task);
  const pri     = PRI_BAR[task.priority] ?? PRI_BAR.medium;

  const iStyle: React.CSSProperties = {
    width: "100%", background: "var(--glass)", border: "1px solid var(--frost)",
    borderRadius: 2, color: "var(--carbon)", padding: "8px 10px", fontSize: 12,
    fontFamily: "var(--font-mono), monospace",
  };
  const focus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = "var(--acid)");
  const blur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = "var(--frost)");

  const saveEdit = async () => {
    setBusy(true);
    try {
      const combinedDate = eDue ? (eTime ? `${eDue}T${eTime}` : eDue) : null;
      await onUpdate(task.id, { title: eTitle, description: eDesc, priority: ePri, dueDate: combinedDate, tags: eTags ? eTags.split(",").map((s) => s.trim()).filter(Boolean) : [] });
      setEditing(false); setEErr("");
    } catch (e: any) { setEErr(e.message); }
    finally { setBusy(false); }
  };
  const cancelEdit = () => {
    setETitle(task.title); setEDesc(task.description ?? ""); setEPri(task.priority);
    setEDue(task.dueDate?.split("T")[0] ?? "");
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      setETime(h === "00" && m === "00" ? "" : `${h}:${m}`);
    } else { setETime(""); }
    setETags(task.tags.join(", "));
    setEditing(false); setEErr("");
  };

  const fmtDue = (d: string) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    const timePart = hasTime ? ` ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}` : "";
    const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}D AGO`;
    if (diff === 0) return `TODAY${timePart}`;
    if (diff <= 7) return `${diff}D${timePart}`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase() + timePart;
  };

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id });

  const sortStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : (task.completed ? 0.5 : 1),
  };

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...sortStyle,
        position: "relative", width: "100%",
        background: "var(--glass)",
        border: `1px solid ${editing ? "var(--acid)" : "var(--frost)"}`,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRadius: 2, overflow: "hidden",
        animation: isDragging ? undefined : `fadeSlideIn 0.25s ease ${idx * 0.04}s both`,
        transition: "background 0.15s, border-color 0.15s, opacity 0.15s",
      }}
    >
      {/* Left priority bar + drag handle */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: hovered || task.priority === "high" ? "var(--acid)" : pri.bar,
        transition: "all 0.2s",
      }} />
      {/* Drag handle */}
      {hovered && !editing && (
        <div
          {...listeners}
          style={{
            position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
            cursor: "grab", color: "var(--ash)", fontSize: 10,
            opacity: 0.5, userSelect: "none", zIndex: 2, padding: "4px 2px",
          }}
          title="Drag to reorder"
        >
          ⠿
        </div>
      )}

      {editing ? (
        <div style={{ padding: 16, paddingLeft: 20 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Edit Directive</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input autoFocus value={eTitle} onChange={(e) => setETitle(e.target.value)} onFocus={focus} onBlur={blur} style={iStyle} />
            {eErr && <div style={{ color: "var(--red)", fontSize: 10, fontFamily: "var(--font-mono)" }}>{eErr}</div>}
            <textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} onFocus={focus} onBlur={blur} rows={2} style={{ ...iStyle, resize: "vertical", minHeight: 44 }} placeholder="Description" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select value={ePri} onChange={(e) => setEPri(e.target.value as any)} onFocus={focus} onBlur={blur} style={{ ...iStyle, cursor: "pointer" }}>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
              <input type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...iStyle, colorScheme: "dark" }} />
            </div>
            {eDue && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Time</div>
                  <input type="time" value={eTime} onChange={(e) => setETime(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...iStyle, colorScheme: "dark" }} />
                </div>
                <div />
              </div>
            )}
            <input value={eTags} onChange={(e) => setETags(e.target.value)} onFocus={focus} onBlur={blur} placeholder="Tags (comma-separated)" style={iStyle} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button onClick={cancelEdit} style={{ padding: "5px 14px", borderRadius: 2, fontSize: 10, border: "1px solid var(--frost)", background: "transparent", color: "var(--ash)", cursor: "pointer", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cancel</button>
              <button onClick={saveEdit} disabled={busy} style={{ padding: "5px 14px", borderRadius: 2, fontSize: 10, fontWeight: 600, border: "none", background: "var(--acid)", color: "var(--void)", cursor: "pointer", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {busy ? "SAVING…" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 72, padding: "12px 16px 12px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", textTransform: "uppercase",
              color: hovered ? "var(--acid)" : (task.completed ? "var(--ash)" : "var(--text-primary)"),
              textDecoration: task.completed ? "line-through" : "none",
              transition: "color 0.15s", cursor: "pointer", wordBreak: "break-word",
            }}
              onClick={() => onToggle(task.id)}
            >
              {task.title}
            </h3>
            {task.description && (
              <div style={{ fontSize: 11, color: "var(--ash)", marginTop: 2, fontFamily: "var(--font-mono)", lineHeight: 1.4 }}>{task.description}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {task.priority === "high" && (
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "var(--acid)", letterSpacing: "0.05em" }}>URGENT</span>
              )}
              {task.recurrence && (
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "var(--acid)", letterSpacing: "0.05em", background: "var(--glass)", padding: "2px 6px", borderRadius: 2 }}>
                  🔄 {task.recurrence.toUpperCase()}
                </span>
              )}
              {task.reminderMinutes && (
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "var(--ash)", background: "var(--glass)", padding: "2px 6px", borderRadius: 2 }}>
                  🔔 {task.reminderMinutes >= 60 ? `${task.reminderMinutes / 60}H` : `${task.reminderMinutes}M`}
                </span>
              )}
              {task.tags.map((tag) => (
                <span key={tag} style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 9,
                  color: "var(--ash)", background: "var(--glass)",
                  padding: "2px 6px", borderRadius: 2,
                }}>#{tag}</span>
              ))}
              {task.dueDate && (
                <CalendarSyncButton task={task} onSync={onSync} onUnsync={onUnsync} />
              )}
            </div>

            {/* Subtask checklist */}
            {(task.subtasks.length > 0 || hovered) && (
              <SubtaskList
                taskId={task.id}
                subtasks={task.subtasks}
                onAdd={onAddSubtask}
                onToggle={onToggleSubtask}
                onDelete={onDeleteSubtask}
              />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0, marginLeft: 12, gap: 6 }}>
            {task.dueDate && (
              <span style={{
                fontFamily: "var(--font-mono), monospace", fontSize: 11,
                color: overdue ? "var(--red)" : "var(--ash)", letterSpacing: "0.03em",
              }}>
                {overdue ? "⚠ " : ""}{fmtDue(task.dueDate)}
              </span>
            )}
            <div style={{ display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>
              <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", fontSize: 12, padding: "2px 4px" }} title="Edit">✎</button>
              <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 12, padding: "2px 4px", opacity: 0.6 }} title="Delete">✕</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
