import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/sessions — Create a new chat session for a character
export async function POST(req: Request) {
  try {
    const { characterId, title } = await req.json();

    if (!characterId) {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 }
      );
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const session = await prisma.chatSession.create({
      data: {
        character_id: characterId,
        title: title || `Chat with ${character.name}`,
      },
    });

    // Insert the greeting message as the first assistant message
    if (character.greeting) {
      await prisma.message.create({
        data: {
          session_id: session.id,
          role: "assistant",
          content: character.greeting,
        },
      });
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
