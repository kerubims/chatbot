import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/characters/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        sessions: { orderBy: { created_at: "desc" } },
      },
    });
    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(character);
  } catch (error) {
    console.error("Failed to fetch character:", error);
    return NextResponse.json(
      { error: "Failed to fetch character" },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const character = await prisma.character.update({
      where: { id },
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

    return NextResponse.json(character);
  } catch (error) {
    console.error("Failed to update character:", error);
    return NextResponse.json(
      { error: "Failed to update character" },
      { status: 500 }
    );
  }
}

// DELETE /api/characters/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.character.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete character:", error);
    return NextResponse.json(
      { error: "Failed to delete character" },
      { status: 500 }
    );
  }
}
