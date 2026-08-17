import { NextResponse } from "next/server";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL } from "@/lib/novita";
import { fetchWithRetry } from "@/lib/retry";

export async function POST(req: Request) {
  try {
    const { field, context } = await req.json();

    let instruction = "";
    switch (field) {
      case "backstory":
        instruction = "Write a compelling, detailed backstory (2-3 paragraphs) for the character. It should explain their history, core personality, and motivations.";
        break;
      case "greeting":
        instruction = "Write the first greeting message the character sends to start a chat. STRICT FORMAT: Must be short, clear, and start with dialog, followed by a little action, then dialog again. Example: \"Hello there.\" *smiles warmly* \"What brings you here?\"";
        break;
      case "key_memories":
        instruction = "Write a bulleted list of 3-5 important facts, secrets, or memories the character must always remember.";
        break;
      case "scenario":
        instruction = "Write a short paragraph describing the current setting, situation, or scene where the roleplay begins.";
        break;
      case "response_directives":
        instruction = "Write a bulleted list of 4-6 rules for how the AI should write responses. E.g., tone, style, formatting rules like using asterisks for actions.";
        break;
      case "example_dialogue":
        instruction = "Write 1 or 2 short sample dialogues between User and Character showing the character's tone and speech patterns.";
        break;
      default:
        instruction = `Write the content for the ${field} field.`;
    }

    const systemPrompt = `You are an expert creative writer and character designer specializing in deep, complex characters suitable for uncensored and immersive roleplay.
Your task is to generate ONLY the content for the requested character field: "${field}".

Here is the existing context of the character so far:
${JSON.stringify(context, null, 2)}

INSTRUCTIONS FOR THE FIELD:
${instruction}

CRITICAL RULES:
1. ONLY return the plain text content for the field.
2. DO NOT wrap the output in quotes or JSON.
3. DO NOT output Markdown code blocks (like \`\`\`text).
4. Make sure it logically connects with the provided character context.`;

    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate the ${field} content now.` }
      ],
      max_tokens: 800,
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
    let content = data.choices[0]?.message?.content || "";
    const usage = data.usage || { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
    
    // Clean up potential markdown formatting block if the AI ignored instructions
    content = content.replace(/^```[\s\S]*?\n/, "").replace(/```$/, "").trim();

    return NextResponse.json({ content, usage });
  } catch (error: any) {
    console.error(`Generate Field API error:`, error);
    return NextResponse.json(
      { error: "Failed to generate field content" },
      { status: 500 }
    );
  }
}
