import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateTask, deleteTask } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const updated = await updateTask(session.user.id, params.id, body);

        // If this task is synced to Google Calendar, update the event too
        const task = await prisma.task.findUnique({ where: { id: params.id } });
        if (task?.googleEventId && task?.googleCalendarId) {
            try {
                await updateCalendarEvent(session.user.id, task.googleCalendarId, task.googleEventId, {
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    completed: task.completed,
                });
            } catch {
                // Calendar sync is best-effort; don't fail the task update
            }
        }

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // If synced to Google Calendar, delete the event first
        const task = await prisma.task.findFirst({ where: { id: params.id, userId: session.user.id } });
        if (task?.googleEventId && task?.googleCalendarId) {
            try {
                await deleteCalendarEvent(session.user.id, task.googleCalendarId, task.googleEventId);
            } catch {
                // Best-effort deletion
            }
        }

        const result = await deleteTask(session.user.id, params.id);
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
