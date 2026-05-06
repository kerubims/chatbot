import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SINGLETON_ID = "default-user";

// GET /api/profile — fetch user profile (create if not exists)
export async function GET() {
  try {
    let profile = await prisma.userProfile.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          id: SINGLETON_ID,
          display_name: "User",
          gender: "Not specified",
          persona: "",
          response_style: "",
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/profile — update user profile
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const profile = await prisma.userProfile.upsert({
      where: { id: SINGLETON_ID },
      update: {
        display_name: body.display_name,
        gender: body.gender,
        persona: body.persona || "",
        response_style: body.response_style || "",
      },
      create: {
        id: SINGLETON_ID,
        display_name: body.display_name || "User",
        gender: body.gender || "Not specified",
        persona: body.persona || "",
        response_style: body.response_style || "",
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
