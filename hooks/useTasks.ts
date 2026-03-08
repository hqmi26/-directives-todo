"use client";
import { useState, useEffect, useCallback } from "react";

export type TaskInput = {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string | null;
    tags?: string[];
    recurrence?: string | null;
    recurrenceEnd?: string | null;
    reminderMinutes?: number | null;
};

export type Subtask = {
    id: string;
    taskId: string;
    title: string;
    completed: boolean;
    sortOrder: number;
    createdAt: string;
};

export type Task = {
    id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: "low" | "medium" | "high";
    dueDate: string | null;
    tags: string[];
    subtasks: Subtask[];
    recurrence: string | null;
    recurrenceEnd: string | null;
    reminderMinutes: number | null;
    googleEventId: string | null;
    googleCalendarId: string | null;
    syncedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch("/api/tasks");
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            setTasks(data);
        } catch (e) {
            console.error("Error fetching tasks:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const addTask = useCallback(async (input: TaskInput) => {
        const res = await fetch("/api/tasks", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create task"); }
        const task = await res.json();
        setTasks((prev) => [task, ...prev]);
        return task;
    }, []);

    const updateTask = useCallback(async (id: string, changes: Partial<TaskInput> & { completed?: boolean }) => {
        const res = await fetch(`/api/tasks/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to update task"); }
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
        return updated;
    }, []);

    const deleteTask = useCallback(async (id: string) => {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete task"); }
        setTasks((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toggleComplete = useCallback(async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        try {
            await updateTask(id, { completed: !task.completed });
            // If completing a recurring task, refetch to get the new occurrence
            if (!task.completed && task.recurrence) {
                await fetchTasks();
            }
        } catch (e: any) {
            if (e.message?.includes("not found")) {
                setTasks((prev) => prev.filter((t) => t.id !== id));
                fetchTasks();
            } else { throw e; }
        }
    }, [tasks, updateTask, fetchTasks]);

    // ── Subtask operations ──
    const addSubtask = useCallback(async (taskId: string, title: string) => {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add subtask"); }
        const subtask = await res.json();
        setTasks((prev) => prev.map((t) => t.id === taskId
            ? { ...t, subtasks: [...t.subtasks, subtask] }
            : t
        ));
        return subtask;
    }, []);

    const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        const subtask = task?.subtasks.find((s) => s.id === subtaskId);
        if (!subtask) return;

        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subtaskId, completed: !subtask.completed }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to toggle subtask"); }
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => s.id === subtaskId ? { ...s, ...updated } : s) }
            : t
        ));
    }, [tasks]);

    const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
        const res = await fetch(`/api/tasks/${taskId}/subtasks?subtaskId=${subtaskId}`, { method: "DELETE" });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete subtask"); }
        setTasks((prev) => prev.map((t) => t.id === taskId
            ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
            : t
        ));
    }, []);

    // Calendar sync
    const syncToCalendar = useCallback(async (taskId: string, calendarId: string) => {
        const res = await fetch("/api/calendar/sync", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, calendarId }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to sync to calendar"); }
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated, tags: t.tags, subtasks: t.subtasks } : t)));
        return updated;
    }, []);

    const unsyncFromCalendar = useCallback(async (taskId: string) => {
        const res = await fetch("/api/calendar/sync", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to unsync from calendar"); }
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated, tags: t.tags, subtasks: t.subtasks } : t)));
        return updated;
    }, []);

    return {
        tasks, loading,
        addTask, updateTask, deleteTask, toggleComplete,
        addSubtask, toggleSubtask, deleteSubtask,
        syncToCalendar, unsyncFromCalendar,
    };
}
