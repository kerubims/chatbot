import { prisma } from "@/lib/prisma";
import { UIMessage } from "ai";
import { 
  getTier, 
  getTierDirective, 
  getTierName,
  calculateNewLevel,
  SUMMARY_TRIGGER_COUNT 
} from "@/lib/affinity";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";
import { generateAutoSummary } from "./summarize";

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

    // 1. Fetch character and session data concurrently
    const [character, session, userProfile] = await Promise.all([
      prisma.character.findUnique({ where: { id: characterId } }),
      prisma.chatSession.findUnique({ where: { id: sessionId } }),
      prisma.userProfile.findUnique({ where: { id: SINGLETON_USER_ID } }),
    ]);

    if (!character || !session || !userProfile) {
      return new Response(JSON.stringify({ error: "Data not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // --- Initialize Affinity Data Early ---
    const currentLevel = session.affinity_level ?? 1;
    const currentExp = session.affinity_exp ?? 0;
    const tier = getTier(session.affinity_level);
    const tierDirective = getTierDirective(tier);

    // 3. Build the enriched multi-layer system prompt
    const systemPromptParts: string[] = [];

    // --- Character Identity & Backstory ---
    systemPromptParts.push(`You are ${character.name}.`);
    if (character.gender && character.gender !== "Not specified") {
      systemPromptParts.push(`Your gender is ${character.gender}.`);
    }
    if (character.backstory) {
      systemPromptParts.push(`\n[Backstory]\n${character.backstory}`);
    } else if (character.persona) {
      systemPromptParts.push(`\n[Backstory]\n${character.persona}`);
    }
    if (character.key_memories) {
      systemPromptParts.push(`\n[Key Memories]\n${character.key_memories}`);
    }
    if (character.scenario) {
      systemPromptParts.push(`\n[Current Scenario]\n${character.scenario}`);
    }
    if (character.response_directives) {
      systemPromptParts.push(`\n[Response Directives]\n${character.response_directives}`);
    }

    // --- Dynamic Context: Affinity & Summary ---
    systemPromptParts.push(`\n${tierDirective}`);

    if (session.story_summary) {
      systemPromptParts.push(`\n[Previous Story Summary]\n${session.story_summary}`);
    }

    // --- User Profile Info ---
    const userInfoParts: string[] = [];
    if (userProfile) {
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
      if (userProfile.response_style) {
        systemPromptParts.push(`\n[Global Response Style]\n${userProfile.response_style}`);
      }
    }

    // --- Force JSON Output ---
    const responseInstructions = `
[Response Format]
Respond ONLY with this JSON:
{"reply": "your response", "exp_change": 0}
Keep "reply" under 500 chars.`;

    systemPromptParts.push(responseInstructions);

    // --- Consolidate into exactly 4 blocks to satisfy Colab backend expectations ---
    const block1 = `Identity:\nYou are ${character.name}.\n${character.backstory || ""}\n${character.key_memories || ""}`.trim();
    
    const block2 = `Context & History:\n${character.scenario || ""}\n[Relationship: ${getTierName(tier)} (Level ${currentLevel})]\n${session.story_summary ? `[Previous Summary: ${session.story_summary}]` : ""}`.trim();
    
    const block3 = `User Profile:\n${userInfoParts.join(" ")}\nStyle: ${userProfile?.response_style || "Normal"}`.trim();
    
    const block4 = `Directives:\n${character.response_directives || ""}\n${character.example_dialogue || ""}\n${responseInstructions}`.trim();

    const systemPrompt = [block1, block2, block3, block4].join("\n\n");

    // 4. Save user message to DB
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    let userText = "";
    if (lastUserMessage) {
      userText = (lastUserMessage as any).content || 
        (lastUserMessage.parts?.find((p: any) => p.type === "text") as any)?.text;
        
      if (userText) {
        await prisma.message.create({
          data: { session_id: sessionId, role: "user", content: userText },
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

    // 6. Send to Novita Serverless API
    const novitaKey = process.env.NOVITA_API_KEY;
    if (!novitaKey) throw new Error("NOVITA_API_KEY belum disetel di .env");

    const endpointUrl = `${NOVITA_SERVERLESS_BASE_URL}/chat/completions`;

    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages
      ],
      max_tokens: 200,
      temperature: temperature || 0.8,
    };

    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${novitaKey}`
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Novita error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    let rawReply = data.choices?.[0]?.message?.content || "";
    let aiReply = "";
    let expChange = 0;

    try {
      rawReply = rawReply.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(rawReply);
      aiReply = parsed.reply || "";
      expChange = typeof parsed.exp_change === "number" ? parsed.exp_change : 0;
    } catch (e) {
      console.warn("Failed to parse JSON from AI, falling back to raw text.");
      aiReply = rawReply;
      expChange = 2;
    }

    // 8. Save AI reply to DB
    if (aiReply) {
      await prisma.message.create({
        data: { 
          session_id: sessionId, 
          role: "assistant", 
          content: aiReply,
        },
      });
    }

    // 9. Process Affinity and Summary
    // Guard against NULL values for sessions created before schema migration
    const currentMsgCount = session.msg_since_summary ?? 0;

    const { newLevel, newExp, leveledUp } = calculateNewLevel(
      currentLevel,
      currentExp,
      expChange
    );

    const newMsgCount = currentMsgCount + 2; // +1 user, +1 assistant

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        affinity_level: newLevel,
        affinity_exp: newExp,
        msg_since_summary: newMsgCount,
      },
    });

    // Fire auto-summary in background if threshold reached
    if (newMsgCount >= SUMMARY_TRIGGER_COUNT) {
      generateAutoSummary(sessionId, character.name, session.story_summary).catch(console.error);
    }

    // 10. Return rich JSON response
    return new Response(JSON.stringify({
      reply: aiReply,
      exp_change: expChange,
      affinity_level: newLevel,
      affinity_exp: newExp,
      leveledUp: leveledUp
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(error.message || "Internal server error", { status: 500 });
  }
}
