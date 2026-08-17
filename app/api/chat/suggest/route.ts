import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL, AVAILABLE_MODELS, ModelKey } from "@/lib/novita";
import { fetchWithRetry } from "@/lib/retry";

export async function POST(req: Request) {
  try {
    const { sessionId, characterId, model } = await req.json();

    if (!sessionId || !characterId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [session, character, dbMessages] = await Promise.all([
      prisma.chatSession.findUnique({ where: { id: sessionId } }),
      prisma.character.findUnique({ where: { id: characterId } }),
      prisma.message.findMany({
        where: { session_id: sessionId },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
    ]);

    if (!session || !character) {
      return NextResponse.json({ error: "Session or character not found" }, { status: 404 });
    }

    // Prepare context
    dbMessages.reverse();
    const chatHistory = dbMessages.map(
      (m) => `${m.role === "assistant" ? character.name : "User"}: ${m.content}`
    ).join("\n");

    const systemPrompt = `You are an AI assistant helping a user roleplay with a character named ${character.name}.
Based on the following recent conversation history, suggest 3 natural and relevant responses the User could say next.
Make the suggestions brief, distinct from each other, and fitting the tone of the conversation.
Format your output ONLY as a valid JSON array of strings. Do not include markdown formatting or explanations.
Example: ["What do you mean by that?", "*nods slowly* I understand.", "Let's go then."]`;

    const resolvedModel = AVAILABLE_MODELS[(model as ModelKey)] || DEFAULT_MODEL;

    const payload = {
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Recent conversation:\n${chatHistory}\n\nProvide 3 suggestions for the User:` }
      ],
      max_tokens: 150,
      temperature: 0.7,
      stream: false,
    };

    const novitaKey = process.env.NOVITA_API_KEY;
    if (!novitaKey) throw new Error("NOVITA_API_KEY is not set");

    const endpointUrl = `${NOVITA_SERVERLESS_BASE_URL}/chat/completions`;

    const novitaRes = await fetchWithRetry(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${novitaKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!novitaRes.ok) {
      const errText = await novitaRes.text();
      throw new Error(`Novita API error: ${novitaRes.status} - ${errText}`);
    }

    const data = await novitaRes.json();
    let suggestionsContent = data.choices[0]?.message?.content || "[]";
    const usageData = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    // Clean up potential markdown formatting if the model disobeys
    suggestionsContent = suggestionsContent.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let suggestions = [];
    try {
      suggestions = JSON.parse(suggestionsContent);
    } catch (e) {
      console.error("Failed to parse JSON suggestions:", suggestionsContent);
      suggestions = ["(Error parsing suggestions)"];
    }

    // Save token usage to DB
    const COST_PER_TOKEN = 0.05 / 1_000_000;
    const cost = (usageData.prompt_tokens + usageData.completion_tokens) * COST_PER_TOKEN;

    if (usageData.total_tokens > 0) {
      await prisma.$transaction([
        prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            total_prompt_tokens: { increment: usageData.prompt_tokens },
            total_completion_tokens: { increment: usageData.completion_tokens },
            total_cost_usd: { increment: cost },
          },
        }),
        prisma.usageLog.create({
          data: {
            session_id: sessionId,
            prompt_tokens: usageData.prompt_tokens,
            completion_tokens: usageData.completion_tokens,
            total_tokens: usageData.total_tokens,
            cost_usd: cost,
            model: resolvedModel,
          },
        })
      ]);
    }

    return NextResponse.json({ suggestions, usage: usageData, cost });
  } catch (error: any) {
    console.error("Suggest API error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
