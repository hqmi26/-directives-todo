import { prisma } from "./prisma";

export type TaskInput = {
  title:       string;
  description?: string;
  priority?:   "low" | "medium" | "high";
  dueDate?:    string | null;
  tags?:       string[];
  recurrence?: string | null;      // "daily" | "weekly" | "monthly" | null
  recurrenceEnd?: string | null;
  reminderMinutes?: number | null;
};

export type SubtaskInput = {
  title: string;
};

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function getNextDueDate(current: Date, recurrence: string): Date {
  const next = new Date(current);
  switch (recurrence) {
    case "daily":   next.setDate(next.getDate() + 1); break;
    case "weekly":  next.setDate(next.getDate() + 7); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
  }
  return next;
}

function mapTask(t: any) {
  return {
    ...t,
    tags:          parseTags(t.tags),
    dueDate:       t.dueDate?.toISOString() ?? null,
    recurrenceEnd: t.recurrenceEnd?.toISOString() ?? null,
    syncedAt:      t.syncedAt?.toISOString() ?? null,
    subtasks:      t.subtasks?.map((s: any) => ({ ...s, createdAt: s.createdAt?.toISOString() })) ?? [],
  };
}

export async function getTasksForUser(userId: string) {
  const tasks = await prisma.task.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });
  return tasks.map(mapTask);
}

export async function createTask(userId: string, input: TaskInput) {
  if (!input.title?.trim()) throw new Error("Title is required.");
  const task = await prisma.task.create({
    data: {
      userId,
      title:           input.title.trim(),
      description:     input.description?.trim() ?? "",
      priority:        input.priority ?? "medium",
      dueDate:         input.dueDate ? new Date(input.dueDate) : null,
      tags:            JSON.stringify(input.tags ?? []),
      recurrence:      input.recurrence ?? null,
      recurrenceEnd:   input.recurrenceEnd ? new Date(input.recurrenceEnd) : null,
      reminderMinutes: input.reminderMinutes ?? null,
    },
    include: { subtasks: true },
  });
  return mapTask(task);
}

export async function updateTask(userId: string, taskId: string, changes: Partial<TaskInput> & { completed?: boolean }) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) throw new Error("Task not found.");

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(changes.title           !== undefined && { title:           changes.title.trim() }),
      ...(changes.description     !== undefined && { description:     changes.description }),
      ...(changes.priority        !== undefined && { priority:        changes.priority }),
      ...(changes.completed       !== undefined && { completed:       changes.completed }),
      ...(changes.dueDate         !== undefined && { dueDate:         changes.dueDate ? new Date(changes.dueDate) : null }),
      ...(changes.tags            !== undefined && { tags:            JSON.stringify(changes.tags) }),
      ...(changes.recurrence      !== undefined && { recurrence:      changes.recurrence }),
      ...(changes.recurrenceEnd   !== undefined && { recurrenceEnd:   changes.recurrenceEnd ? new Date(changes.recurrenceEnd) : null }),
      ...(changes.reminderMinutes !== undefined && { reminderMinutes: changes.reminderMinutes }),
    },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });

  // If task is being completed and has recurrence, create the next occurrence
  if (changes.completed === true && existing.recurrence && existing.dueDate) {
    const nextDue = getNextDueDate(existing.dueDate, existing.recurrence);
    if (!existing.recurrenceEnd || nextDue <= existing.recurrenceEnd) {
      await prisma.task.create({
        data: {
          userId,
          title:           existing.title,
          description:     existing.description ?? "",
          priority:        existing.priority,
          dueDate:         nextDue,
          tags:            existing.tags,
          recurrence:      existing.recurrence,
          recurrenceEnd:   existing.recurrenceEnd,
          reminderMinutes: existing.reminderMinutes,
        },
      });
    }
  }

  return mapTask(updated);
}

export async function deleteTask(userId: string, taskId: string) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) throw new Error("Task not found.");
  await prisma.task.delete({ where: { id: taskId } });
  return { id: taskId };
}

// ── Subtask operations ──
export async function addSubtask(userId: string, taskId: string, input: SubtaskInput) {
  if (!input.title?.trim()) throw new Error("Subtask title is required.");
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new Error("Task not found.");

  const maxOrder = await prisma.subtask.aggregate({
    where: { taskId },
    _max: { sortOrder: true },
  });

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: input.title.trim(),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return subtask;
}

export async function updateSubtask(userId: string, subtaskId: string, changes: { title?: string; completed?: boolean }) {
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId },
    include: { task: { select: { userId: true } } },
  });
  if (!subtask || subtask.task.userId !== userId) throw new Error("Subtask not found.");

  return prisma.subtask.update({
    where: { id: subtaskId },
    data: {
      ...(changes.title     !== undefined && { title: changes.title.trim() }),
      ...(changes.completed !== undefined && { completed: changes.completed }),
    },
  });
}

export async function deleteSubtask(userId: string, subtaskId: string) {
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId },
    include: { task: { select: { userId: true } } },
  });
  if (!subtask || subtask.task.userId !== userId) throw new Error("Subtask not found.");
  await prisma.subtask.delete({ where: { id: subtaskId } });
  return { id: subtaskId };
}
