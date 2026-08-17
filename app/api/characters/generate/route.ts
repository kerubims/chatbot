import { NextResponse } from "next/server";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";
import { fetchWithRetry } from "@/lib/retry";

export async function POST(req: Request) {
  try {
    const { role, age, background, personality } = await req.json();

    const systemPrompt = `You are an expert creative writer and character designer specializing in deep, complex characters suitable for uncensored and immersive roleplay.
Your task is to generate a comprehensive character profile based on the user's provided (and possibly incomplete) inputs.
You must creatively fill in any missing details to create a compelling, fully fleshed-out character.

Return the profile as a valid JSON object strictly matching this schema:
{
  "name": "Character Name",
  "gender": "Male/Female/Non-binary/Other",
  "backstory": "Detailed backstory and history.",
  "greeting": "The first message the character sends to start a chat. STRICT FORMAT: Must be short, clear, and start with dialog, followed by a little action, then dialog again. Example: \\\"Hello there.\\\" *smiles warmly* \\\"What brings you here?\\\"",
  "key_memories": "Bullet points of important facts or memories. MUST BE A SINGLE STRING.",
  "scenario": "The current setting or situation the roleplay starts in.",
  "response_directives": "Rules for how the AI should format its responses and act. MUST BE A SINGLE STRING.",
  "example_dialogue": "A short sample dialogue between User and Character. MUST BE A SINGLE STRING."
}

CRITICAL INSTRUCTIONS:
1. The output MUST be valid JSON.
2. ALL fields MUST be a single string. Do not use arrays or nested objects.
3. You MUST properly escape all double quotes inside your strings using a backslash (e.g. \\\"like this\\\"). Do not break the JSON format.
4. Do not include any other text or markdown block formatting. Only output the JSON object.`;

    const userPrompt = `Please generate a character with the following details (if provided):
- Role/Occupation: ${role || "Surprise me"}
- Age: ${age || "Appropriate for the role"}
- Background/Concept: ${background || "Creative and engaging"}
- Personality Traits: ${personality || "Multi-dimensional and interesting"}`;

    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.85,
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
    let content = data.choices[0]?.message?.content || "{}";
    const usage = data.usage || { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
    
    // Clean up potential markdown formatting
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let characterData = {};
    try {
      if (!content.endsWith("}")) {
        content += "\n}";
      }
      characterData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse character JSON:", content);
      
      // Fallback: try one more time by adding quotes and brace if it stopped mid-string
      try {
        characterData = JSON.parse(content + "\"}");
      } catch (e2) {
        return NextResponse.json({ error: "Failed to parse AI output into JSON. The AI generated incomplete data." }, { status: 500 });
      }
    }

    return NextResponse.json({ characterData, usage });
  } catch (error: any) {
    console.error("Generate Character API error:", error);
    return NextResponse.json(
      { error: "Failed to generate character" },
      { status: 500 }
    );
  }
}
