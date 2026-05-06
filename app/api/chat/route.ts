import { prisma } from "@/lib/prisma";
import { UIMessage } from "ai";

export const maxDuration = 60;

const SINGLETON_USER_ID = "default-user";

export async function POST(req: Request) {
  try {
    const { messages, sessionId, characterId, temperature } = (await req.json()) as {
      messages: UIMessage[];
      sessionId: string;
      characterId: string;
      temperature?: number;
    };

    // 1. Fetch character data
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return new Response("Character not found", { status: 404 });
    }

    // 2. Fetch user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: SINGLETON_USER_ID },
    });

    // 3. Build the enriched multi-layer system prompt (Kindroid-style)
    const systemPromptParts: string[] = [];

    // --- Character Identity ---
    systemPromptParts.push(`You are ${character.name}.`);
    if (character.gender && character.gender !== "Not specified") {
      systemPromptParts.push(`Your gender is ${character.gender}.`);
    }

    // --- Backstory (core personality + history) ---
    if (character.backstory) {
      systemPromptParts.push(`\n[Backstory]\n${character.backstory}`);
    } else if (character.persona) {
      // Fallback to old persona field
      systemPromptParts.push(`\n[Backstory]\n${character.persona}`);
    }

    // --- Key Memories ---
    if (character.key_memories) {
      systemPromptParts.push(`\n[Key Memories]\n${character.key_memories}`);
    }

    // --- Current Scenario ---
    if (character.scenario) {
      systemPromptParts.push(`\n[Current Scenario]\n${character.scenario}`);
    }

    // --- Response Directives ---
    if (character.response_directives) {
      systemPromptParts.push(`\n[Response Directives]\n${character.response_directives}`);
    }

    // --- Example Dialogue ---
    if (character.example_dialogue) {
      systemPromptParts.push(`\n[Example Dialogue]\n${character.example_dialogue}`);
    }

    // --- User Profile Info ---
    if (userProfile) {
      const userInfoParts: string[] = [];
      if (userProfile.display_name && userProfile.display_name !== "User") {
        userInfoParts.push(`The user's name is ${userProfile.display_name}.`);
      }
      if (userProfile.gender && userProfile.gender !== "Not specified") {
        userInfoParts.push(`The user's gender is ${userProfile.gender}.`);
      }
      if (userProfile.persona) {
        userInfoParts.push(`About the user: ${userProfile.persona}`);
      }
      if (userInfoParts.length > 0) {
        systemPromptParts.push(`\n[User Information]\n${userInfoParts.join(" ")}`);
      }

      // --- Global Response Style (from user preferences) ---
      if (userProfile.response_style) {
        systemPromptParts.push(`\n[Global Response Style]\n${userProfile.response_style}`);
      }
    }

    const systemPrompt = systemPromptParts.join("\n");

    // 4. Save user message to DB
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    if (lastUserMessage) {
      const text = (lastUserMessage as any).content || 
        (lastUserMessage.parts?.find((p: any) => p.type === "text") as any)?.text;
        
      if (text) {
        await prisma.message.create({
          data: {
            session_id: sessionId,
            role: "user",
            content: text,
          },
        });
      }
    }

    // 5. Fetch last 20 messages from DB for context
    const dbMessages = await prisma.message.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
      take: 20,
    });

    const contextMessages = dbMessages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    // 6. Send to Colab LLM
    const colabUrl = process.env.COLAB_API_URL;
    if (!colabUrl) {
      throw new Error("COLAB_API_URL belum disetel di .env");
    }

    const payload = {
      system_prompt: systemPrompt,
      messages: contextMessages,
      max_tokens: 1000,
      temperature: temperature || 0.8,
    };

    const res = await fetch(`${colabUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Colab error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const reply = data.reply;

    // 7. Save AI reply to DB
    if (reply) {
      await prisma.message.create({
        data: {
          session_id: sessionId,
          role: "assistant",
          content: reply,
        },
      });
    }

    // 8. Return plain text response
    return new Response(reply, {
      status: 200,
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(error.message || "Internal server error", { status: 500 });
  }
}
