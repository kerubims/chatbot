import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";
import { fetchWithRetry } from "@/lib/retry";

export async function generateAutoSummary(
  sessionId: string,
  characterName: string,
  existingGlobalSummary: string | null
) {
  try {
    // 1. Fetch recent messages that haven't been summarized
    const recentMessages = await prisma.message.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "desc" },
      take: 20, // Should match SUMMARY_TRIGGER_COUNT
    });
    
    recentMessages.reverse(); // Chronological order for the AI to summarize

    if (recentMessages.length === 0) return;

    // 2. Format the chat history for the prompt
    const chatHistory = recentMessages
      .map((msg) => `${msg.role === "assistant" ? characterName : "User"}: ${msg.content}`)
      .join("\n\n");

    // 3. Build the summarization prompt (JSON Forced)
    const systemPrompt = `You are an expert narrative journalist and state tracker analyzing a roleplay chat session.
You MUST output your response as a valid JSON object with EXACTLY these 3 keys:
1. "chapter_summary": A detailed narrative summary of ONLY the provided chat history (1-2 paragraphs). Focus on key events, actions, emotional turning points, and dialogue.
2. "global_summary": A highly condensed, rolling summary of the ENTIRE story from the beginning.
3. "state": A short string detailing the current physical state at the END of the chat history. Include location, time/weather, character's clothing, user's clothing (if known), and physical posture/status.

${existingGlobalSummary ? `[Previous Global Summary]\n${existingGlobalSummary}\n\nCombine this with the new events to form the new global_summary.` : "Since there is no previous global summary, the global_summary will just summarize the current events."}

Example JSON format:
{
  "chapter_summary": "User and Character went to the park and talked about their past. Character revealed a secret.",
  "global_summary": "User and Character met at the cafe, then went to the park where Character revealed a secret about their past.",
  "state": "Location: Park bench. Time: Afternoon. Character: Wearing a red coat, sitting closely. User: Wearing a blue shirt."
}
Do NOT wrap the JSON in markdown blocks. Output raw JSON only.`;

    const novitaKey = process.env.NOVITA_API_KEY;
    if (!novitaKey) throw new Error("NOVITA_API_KEY not set");

    const endpointUrl = `${NOVITA_SERVERLESS_BASE_URL}/chat/completions`;

    // 4. Send to Novita Serverless API for summarization
    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: chatHistory }
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: "json_object" }, // Force JSON output
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
      const errText = await res.text();
      throw new Error(`Novita API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // 5. Parse JSON Response
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[Auto-Summary] Failed to parse JSON:", content);
      return;
    }

    const chapterSummary = parsed.chapter_summary || "No chapter summary generated.";
    const globalSummary = parsed.global_summary || existingGlobalSummary;
    const currentState = parsed.state || "";

    // 6. Update the database
    // Get current chapter count to determine the next chapter number
    const chapterCount = await prisma.storyChapter.count({
      where: { session_id: sessionId }
    });
    
    // Use transaction to ensure both records are saved safely
    await prisma.$transaction([
      prisma.storyChapter.create({
        data: {
          session_id: sessionId,
          chapter: chapterCount + 1,
          content: chapterSummary,
        }
      }),
      prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          global_summary: globalSummary,
          current_state: currentState,
          msg_since_summary: 0, // Reset counter
        },
      })
    ]);

    console.log(`[Auto-Summary] Generated Chapter ${chapterCount + 1} and updated global state for session ${sessionId}`);
  } catch (error) {
    console.error("[Auto-Summary] Failed to generate summary:", error);
  }
}
