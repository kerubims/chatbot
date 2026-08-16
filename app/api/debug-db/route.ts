import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.chatSession.findMany({
    include: {
      messages: { select: { id: true } },
      chapters: true
    }
  });

  const report = sessions.map(s => ({
    id: s.id,
    messageCount: s.messages.length,
    msg_since_summary: s.msg_since_summary,
    current_state: s.current_state,
    has_global_summary: !!s.global_summary,
    chapterCount: s.chapters.length
  }));

  return NextResponse.json(report);
}
