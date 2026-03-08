"use client";
import { useState } from "react";
import { useCalendars } from "@/hooks/useCalendars";
import { Task } from "@/hooks/useTasks";

type Props = {
  task:     Task;
  onSync:   (taskId: string, calendarId: string) => Promise<any>;
  onUnsync: (taskId: string) => Promise<any>;
};

export function CalendarSyncButton({ task, onSync, onUnsync }: Props) {
  const { calendars } = useCalendars();
  const [busy, setBusy]       = useState(false);
  const [showPicker, setPicker] = useState(false);
  const [error, setError]     = useState("");

  const handleSync = async (calId: string) => {
    setBusy(true); setError("");
    try { await onSync(task.id, calId); setPicker(false); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleUnsync = async () => {
    setBusy(true); setError("");
    try { await onUnsync(task.id); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-mono), monospace",
    fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase",
    cursor: "pointer", border: "none", borderRadius: 2, padding: "3px 8px",
    transition: "all 0.15s",
  };

  if (task.googleEventId) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ ...btnBase, background: "var(--glass)", color: "var(--acid)", cursor: "default", border: "1px solid var(--frost)" }}>SYNCED</span>
        <button onClick={handleUnsync} disabled={busy} style={{ ...btnBase, background: "none", color: "var(--ash)", padding: "3px 4px" }}>{busy ? "…" : "✕"}</button>
      </span>
    );
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button onClick={() => setPicker(!showPicker)} disabled={busy} style={{ ...btnBase, background: "none", color: "var(--ash)", border: "1px solid var(--frost)" }}>
        {busy ? "SYNCING…" : "📅 SYNC"}
      </button>
      {showPicker && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0,
          marginBottom: 4, minWidth: 200, zIndex: 30,
          background: "var(--surface-solid)", backdropFilter: "blur(16px)",
          border: "1px solid var(--frost)", borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", padding: 8,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 6px", marginBottom: 4 }}>Select Calendar</div>
          {calendars.length === 0 ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ash)", padding: "8px 6px" }}>No calendars found</div>
          ) : (
            calendars.map((cal) => (
              <button key={cal.id} onClick={() => handleSync(cal.id)} style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 8px", background: "transparent",
                border: "none", color: "var(--ash)", fontSize: 11,
                fontFamily: "var(--font-mono)", cursor: "pointer",
                borderRadius: 2, transition: "all 0.1s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass)"; e.currentTarget.style.color = "var(--acid)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ash)"; }}
              >{cal.summary}</button>
            ))
          )}
        </div>
      )}
      {error && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)", whiteSpace: "nowrap" }}>{error}</div>
      )}
    </span>
  );
}
