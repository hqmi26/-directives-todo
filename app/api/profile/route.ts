import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, name: true, email: true, image: true, bio: true, avatarColor: true },
        });
        return NextResponse.json(user);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.bio !== undefined && { bio: body.bio }),
                ...(body.avatarColor !== undefined && { avatarColor: body.avatarColor }),
            },
            select: { id: true, name: true, email: true, image: true, bio: true, avatarColor: true },
        });
        return NextResponse.json(user);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
