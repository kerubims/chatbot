import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";
import { fetchWithRetry } from "@/lib/retry";
import * as fs from "fs";

export async function updateStateAsync(
  sessionId: string,
  currentState: string | null,
  recentContext: string
) {
  try {
    const novitaKey = process.env.NOVITA_API_KEY;
    if (!novitaKey) return;

    const endpointUrl = `${NOVITA_SERVERLESS_BASE_URL}/chat/completions`;

    const systemPrompt = `You are a strict State Tracker for a roleplay. Output a JSON object with one key: "state" (string).

[Current State]
${currentState || "Not established"}

RULES:
1. Analyze the recent exchange for CLEAR, EXPLICIT changes in the scene. This includes: changing location, time skips, changes in clothing/posture, or NEW CHARACTERS arriving/leaving (e.g., a 3rd party enters the scene).
2. If YES, update the [Current State] to reflect the new reality. Keep it under 40 words. Focus on: Location, Time, Actors Present, and major physical states.
3. If NO (they are just talking or doing minor actions), you MUST output the EXACT SAME [Current State] string. 
4. DO NOT guess, infer, or hallucinate details that are not explicitly stated in the recent exchange.
5. Return ONLY valid JSON. No markdown blocks, no extra text.`;

    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: recentContext }
      ],
      max_tokens: 100,
      temperature: 0.1, // Very low temperature for factual consistency
    };

    const res = await fetchWithRetry(endpointUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${novitaKey}`
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("State tracker API failed:", await res.text());
      return;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    fs.appendFileSync('debug_logs.txt', `\n[STATE TRACKER RAW]\n${content}\n`);

    let parsed: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : content;
      parsed = JSON.parse(cleanJson);
      fs.appendFileSync('debug_logs.txt', `[STATE TRACKER PARSED] Success: ${parsed.state}\n`);
    } catch (e: any) {
      fs.appendFileSync('debug_logs.txt', `[STATE TRACKER ERROR] Parse failed: ${e.message}\n`);
      console.error("[State Tracker] Failed to parse JSON:", content);
      return;
    }

    const newState = parsed.state;
    
    // Only update if it actually changed and isn't empty, or just update it anyway.
    // We update it anyway so the DB holds the latest state string.
    if (newState && typeof newState === "string" && newState.trim().length > 0) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { current_state: newState }
      });
      console.log(`[State Tracker] Updated state for session ${sessionId}`);
    }

  } catch (error) {
    console.error("[State Tracker] Failed to update state:", error);
  }
}
