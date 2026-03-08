import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// POST — sync a task to Google Calendar
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { taskId, calendarId } = await req.json();

        if (!taskId || !calendarId) {
            return NextResponse.json({ error: "taskId and calendarId are required." }, { status: 400 });
        }

        const task = await prisma.task.findFirst({ where: { id: taskId, userId: session.user.id } });
        if (!task) {
            return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        if (task.googleEventId) {
            return NextResponse.json({ error: "Task is already synced to Google Calendar." }, { status: 400 });
        }

        const eventId = await createCalendarEvent(session.user.id, calendarId, {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
        });

        const updated = await prisma.task.update({
            where: { id: taskId },
            data: {
                googleEventId: eventId,
                googleCalendarId: calendarId,
                syncedAt: new Date(),
            },
        });

        return NextResponse.json({
            ...updated,
            dueDate: updated.dueDate?.toISOString() ?? null,
            syncedAt: updated.syncedAt?.toISOString() ?? null,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE — unsync a task from Google Calendar (removes the event)
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { taskId } = await req.json();

        if (!taskId) {
            return NextResponse.json({ error: "taskId is required." }, { status: 400 });
        }

        const task = await prisma.task.findFirst({ where: { id: taskId, userId: session.user.id } });
        if (!task) {
            return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        // Remove the Google Calendar event if it exists
        if (task.googleEventId && task.googleCalendarId) {
            try {
                await deleteCalendarEvent(session.user.id, task.googleCalendarId, task.googleEventId);
            } catch {
                // Best-effort — event may have been manually deleted
            }
        }

        const updated = await prisma.task.update({
            where: { id: taskId },
            data: {
                googleEventId: null,
                googleCalendarId: null,
                syncedAt: null,
            },
        });

        return NextResponse.json({
            ...updated,
            dueDate: updated.dueDate?.toISOString() ?? null,
            syncedAt: null,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
