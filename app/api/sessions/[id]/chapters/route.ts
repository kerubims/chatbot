import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const chapters = await prisma.storyChapter.findMany({
      where: { session_id: id },
      orderBy: { chapter: "asc" },
    });

    const session = await prisma.chatSession.findUnique({
      where: { id },
      select: { current_state: true }
    });

    return NextResponse.json({
      chapters,
      currentState: session?.current_state || null
    });
  } catch (error) {
    console.error("Failed to fetch chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
