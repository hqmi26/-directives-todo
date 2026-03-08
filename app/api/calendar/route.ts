import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listCalendars } from "@/lib/google-calendar";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const calendars = await listCalendars(session.user.id);
        return NextResponse.json(calendars);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
