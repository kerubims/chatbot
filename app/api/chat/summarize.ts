import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";
import { fetchWithRetry } from "@/lib/retry";
import * as fs from "fs";

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
    const systemPrompt = `You are an expert narrative journalist analyzing a roleplay chat session.
You MUST output your response as a valid JSON object with EXACTLY these 3 keys:
1. "chapter_summary": A detailed narrative summary of ONLY the provided chat history (1-2 paragraphs). Focus on key events, actions, emotional turning points, and dialogue.
2. "global_summary": A highly condensed, rolling summary of the ENTIRE story from the beginning.
3. "new_facts": An array of strings containing ONLY permanent NEW facts established in this chat history (e.g. items obtained/lost, secrets revealed, promises made, specific new locations discovered). If there are none, return an empty array []. Keep facts concise.

${existingGlobalSummary ? `[Previous Global Summary]\n${existingGlobalSummary}\n\nCombine this with the new events to form the new global_summary.` : "Since there is no previous global summary, the global_summary will just summarize the current events."}

Example JSON format:
{
  "chapter_summary": "User and Character went to the park and talked about their past. Character revealed a secret.",
  "global_summary": "User and Character met at the cafe, then went to the park where Character revealed a secret about their past.",
  "new_facts": ["User and Character agreed to go to the park", "Character revealed they have a fear of dogs"]
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
    
    fs.appendFileSync('debug_logs.txt', `\n[SUMMARIZE RAW]\n${content}\n`);

    // 5. Parse JSON Response
    let parsed: any = {};
    try {
      // Extract just the JSON object in case it's wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : content;
      parsed = JSON.parse(cleanJson);
      fs.appendFileSync('debug_logs.txt', `[SUMMARIZE PARSED] Success\n`);
    } catch (e: any) {
      fs.appendFileSync('debug_logs.txt', `[SUMMARIZE ERROR] Parse failed: ${e.message}\n`);
      console.error("[Auto-Summary] Failed to parse JSON:", content);
      return;
    }

    const chapterSummary = parsed.chapter_summary || "No chapter summary generated.";
    const globalSummary = parsed.global_summary || existingGlobalSummary;
    const newFacts: string[] = Array.isArray(parsed.new_facts) ? parsed.new_facts : [];

    // 6. Update the database
    // Get current chapter count to determine the next chapter number
    const chapterCount = await prisma.storyChapter.count({
      where: { session_id: sessionId }
    });
    
    // Prepare the transactions
    const transactions: any[] = [
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
          msg_since_summary: 0, // Reset counter
        },
      })
    ];

    // Add facts creation to the transaction if there are new facts
    if (newFacts.length > 0) {
      const factRecords = newFacts.map(fact => ({
        session_id: sessionId,
        fact: fact
      }));
      transactions.push(
        prisma.characterFact.createMany({
          data: factRecords
        })
      );
    }

    // Use transaction to ensure all records are saved safely
    await prisma.$transaction(transactions);

    console.log(`[Auto-Summary] Generated Chapter ${chapterCount + 1} and updated global state for session ${sessionId}`);
  } catch (error) {
    console.error("[Auto-Summary] Failed to generate summary:", error);
  }
}
