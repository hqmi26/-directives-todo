import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) throw new Error("orderedIds must be an array");

    // Batch update sort orders in a transaction
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.task.updateMany({
          where: { id, userId: session.user!.id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
