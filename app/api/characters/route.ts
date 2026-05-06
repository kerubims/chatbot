import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/characters — List all characters
export async function GET() {
  try {
    const characters = await prisma.character.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { sessions: true } },
      },
    });
    return NextResponse.json(characters);
  } catch (error) {
    console.error("Failed to fetch characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}

// POST /api/characters — Create a new character
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      avatar_url,
      persona,
      greeting,
      gender,
      backstory,
      key_memories,
      scenario,
      response_directives,
      example_dialogue,
    } = body;

    if (!name || !greeting) {
      return NextResponse.json(
        { error: "Name and greeting are required" },
        { status: 400 }
      );
    }

    const character = await prisma.character.create({
      data: {
        name,
        avatar_url: avatar_url || null,
        persona: persona || backstory || "",
        greeting,
        gender: gender || "Not specified",
        backstory: backstory || persona || "",
        key_memories: key_memories || "",
        scenario: scenario || "",
        response_directives: response_directives || "",
        example_dialogue: example_dialogue || "",
      },
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("Failed to create character:", error);
    return NextResponse.json(
      { error: "Failed to create character" },
      { status: 500 }
    );
  }
}
