"use client";
import { useState } from "react";
import { TaskInput } from "@/hooks/useTasks";

const iStyle: React.CSSProperties = {
  width: "100%", background: "var(--glass)", border: "1px solid var(--frost)",
  borderRadius: 2, color: "var(--carbon)", padding: "9px 12px", fontSize: 12,
  fontFamily: "var(--font-mono), monospace",
  transition: "border-color 0.15s",
};
const focus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = "var(--acid)");
const blur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = "var(--frost)");

type Props = { onAdd: (input: TaskInput) => Promise<any> };

export function AddTaskForm({ onAdd }: Props) {
  const [open, setOpen]         = useState(false);
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priority, setPriority] = useState<"low"|"medium"|"high">("medium");
  const [due, setDue]           = useState("");
  const [dueTime, setDueTime]   = useState("");
  const [tags, setTags]         = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [reminder, setReminder]     = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const reset  = () => { setTitle(""); setDesc(""); setPriority("medium"); setDue(""); setDueTime(""); setTags(""); setRecurrence(""); setReminder(""); setError(""); };
  const submit = async () => {
    setBusy(true);
    try {
      const combinedDate = due ? (dueTime ? `${due}T${dueTime}` : due) : null;
      await onAdd({
        title, description: desc, priority, dueDate: combinedDate,
        tags: tags ? tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        recurrence: recurrence || null,
        reminderMinutes: reminder ? parseInt(reminder) : null,
      });
      reset(); setOpen(false);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!open) return (
    <div style={{ position: "fixed", bottom: 32, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          pointerEvents: "auto", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 64, height: 64,
          background: "var(--glass)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--acid)", borderRadius: 2,
          cursor: "pointer", transition: "transform 0.15s, background 0.15s",
          boxShadow: "0 0 20px rgba(0,0,0,0.5)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <span style={{ fontSize: 32, color: "var(--acid)", fontWeight: 700 }}>+</span>
      </button>
    </div>
  );

  return (
    <>
      <div onClick={() => { reset(); setOpen(false); }} style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 100, animation: "fadeIn 0.15s ease" }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
        maxWidth: 520, margin: "0 auto", padding: 16,
        animation: "fadeSlideIn 0.2s ease",
      }}>
        <div style={{
          background: "var(--surface-solid)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--acid)", borderRadius: 4, padding: 24,
          borderColor: "var(--acid)", borderWidth: 1,
        }}>
          <div style={{ height: 2, background: "var(--acid)", marginBottom: 20, opacity: 0.5 }} />
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
            New Directive
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
                onFocus={focus} onBlur={blur}
                placeholder="DIRECTIVE TITLE *" style={iStyle} />
              {error && <div style={{ color: "var(--red)", fontSize: 10, marginTop: 4, fontFamily: "var(--font-mono)" }}>{error}</div>}
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
              onFocus={focus} onBlur={blur}
              placeholder="Description (optional)" rows={2}
              style={{ ...iStyle, resize: "vertical", minHeight: 50 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Priority</div>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} onFocus={focus} onBlur={blur} style={{ ...iStyle, cursor: "pointer" }}>
                  <option value="high">HIGH</option>
                  <option value="medium">MEDIUM</option>
                  <option value="low">LOW</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Due Date</div>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...iStyle, colorScheme: "dark" }} />
              </div>
            </div>
            {due && (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Time</div>
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...iStyle, colorScheme: "dark" }} />
              </div>
            )}
            {due && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Repeat</div>
                  <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...iStyle, cursor: "pointer" }}>
                    <option value="">NONE</option>
                    <option value="daily">DAILY</option>
                    <option value="weekly">WEEKLY</option>
                    <option value="monthly">MONTHLY</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Reminder</div>
                  <select value={reminder} onChange={(e) => setReminder(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...iStyle, cursor: "pointer" }}>
                    <option value="">NONE</option>
                    <option value="5">5 MIN</option>
                    <option value="15">15 MIN</option>
                    <option value="30">30 MIN</option>
                    <option value="60">1 HR</option>
                  </select>
                </div>
              </div>
            )}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Tags</div>
              <input value={tags} onChange={(e) => setTags(e.target.value)} onFocus={focus} onBlur={blur} placeholder="work, urgent, q4…" style={iStyle} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              <button onClick={() => { reset(); setOpen(false); }} style={{
                padding: "7px 18px", borderRadius: 2, fontSize: 10,
                fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em",
                border: "1px solid var(--frost)", background: "transparent", color: "var(--ash)", cursor: "pointer",
              }}>Cancel</button>
              <button onClick={submit} disabled={busy} style={{
                padding: "7px 18px", borderRadius: 2, fontSize: 10, fontWeight: 600,
                fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em",
                border: "none", background: "var(--acid)", color: "var(--void)", cursor: "pointer",
                opacity: busy ? 0.7 : 1,
              }}>
                {busy ? "ADDING…" : "DEPLOY"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
