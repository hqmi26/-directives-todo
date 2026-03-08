"use client";
import { useState } from "react";
import { Subtask } from "@/hooks/useTasks";

type Props = {
  taskId: string;
  subtasks: Subtask[];
  onAdd:    (taskId: string, title: string) => Promise<any>;
  onToggle: (taskId: string, subtaskId: string) => Promise<any>;
  onDelete: (taskId: string, subtaskId: string) => Promise<any>;
};

export function SubtaskList({ taskId, subtasks, onAdd, onToggle, onDelete }: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding]     = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await onAdd(taskId, newTitle.trim());
      setNewTitle("");
    } catch (e) { console.error(e); }
    finally { setAdding(false); }
  };

  const done  = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Progress bar */}
      {total > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, height: 3, background: "var(--frost)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(done / total) * 100}%`,
              background: "var(--acid)", borderRadius: 2,
              transition: "width 0.3s ease",
            }} />
          </div>
          <span style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 9,
            color: "var(--ash)", letterSpacing: "0.05em",
          }}>
            {done}/{total}
          </span>
        </div>
      )}

      {/* Subtask items */}
      {subtasks.map((sub) => (
        <div key={sub.id} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 0", borderBottom: "1px solid var(--frost)",
        }}>
          <button
            onClick={() => onToggle(taskId, sub.id)}
            style={{
              width: 14, height: 14, borderRadius: 2, flexShrink: 0,
              border: `1px solid ${sub.completed ? "var(--acid)" : "var(--frost)"}`,
              background: sub.completed ? "var(--acid)" : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {sub.completed && (
              <span style={{ fontSize: 9, color: "var(--void)", fontWeight: 700, lineHeight: 1 }}>✓</span>
            )}
          </button>
          <span style={{
            flex: 1, fontSize: 11, fontFamily: "var(--font-mono), monospace",
            color: sub.completed ? "var(--ash)" : "var(--carbon)",
            textDecoration: sub.completed ? "line-through" : "none",
            transition: "color 0.15s",
          }}>
            {sub.title}
          </span>
          <button
            onClick={() => onDelete(taskId, sub.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--ash)", fontSize: 10, padding: "2px 4px",
              opacity: 0.5, transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = "var(--ash)"; }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add subtask input */}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="+ Add step..."
          style={{
            flex: 1, background: "transparent", border: "none",
            borderBottom: "1px solid var(--frost)",
            color: "var(--carbon)", padding: "4px 0", fontSize: 11,
            fontFamily: "var(--font-mono), monospace",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--acid)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--frost)")}
        />
        {newTitle.trim() && (
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--acid)", fontSize: 10, fontFamily: "var(--font-mono)",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}
          >
            {adding ? "…" : "ADD"}
          </button>
        )}
      </div>
    </div>
  );
}
