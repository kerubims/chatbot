import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";

export async function generateAutoSummary(
  sessionId: string,
  characterName: string,
  existingSummary: string | null
) {
  try {
    // 1. Fetch recent messages that haven't been summarized
    const recentMessages = await prisma.message.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
      take: 20, // Should match SUMMARY_TRIGGER_COUNT
    });

    if (recentMessages.length === 0) return;

    // 2. Format the chat history for the prompt
    const chatHistory = recentMessages
      .map((msg) => `${msg.role === "assistant" ? characterName : "User"}: ${msg.content}`)
      .join("\n\n");

    // 3. Build the summarization prompt
    const systemPrompt = `You are an expert narrative journalist analyzing a roleplay chat session.
Summarize the following chat history into 1-2 concise paragraphs. 
Focus on:
- Key events, actions, and emotional turning points
- How the relationship between the characters evolved
- Any important promises, secrets, or revelations made

${existingSummary ? `[Previous Summary Context]\n${existingSummary}\n\n` : ""}
Write in third person, past tense. Be concise but capture the essence. Do not include meta-commentary, just the summary.`;

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
      max_tokens: 300,
      temperature: 0.3, // Lower temperature for more factual summaries
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
      throw new Error(`Novita API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    let newSummary = data.choices?.[0]?.message?.content || "";

    // 5. Combine with existing summary if needed (or replace if it gets too long, 
    // but for now we append or replace. The prompt already instructed it to consider the previous summary).
    // Actually, asking the LLM to write a new cohesive summary incorporating the previous one is better.
    // So the newSummary *is* the combined summary.

    // 6. Update the session in the database
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        story_summary: newSummary,
        msg_since_summary: 0, // Reset counter
      },
    });

    console.log(`[Auto-Summary] Generated summary for session ${sessionId}`);
  } catch (error) {
    console.error("[Auto-Summary] Failed to generate summary:", error);
  }
}
