import { prisma } from "@/lib/prisma";
import { UIMessage } from "ai";
import { 
  getTier, 
  getTierDirective, 
  getTierName,
  calculateNewLevel,
  SUMMARY_TRIGGER_COUNT 
} from "@/lib/affinity";
import { DEFAULT_MODEL, NOVITA_SERVERLESS_BASE_URL, AVAILABLE_MODELS, ModelKey } from "@/lib/novita";
import { generateAutoSummary } from "./summarize";
import { rateLimit } from "@/lib/rate-limit";
import { fetchWithRetry } from "@/lib/retry";
import { updateStateAsync } from "@/lib/state-tracker";
import { generateEmbedding } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";
import * as fs from "fs";

export const maxDuration = 60;

const SINGLETON_USER_ID = "default-user";

// Novita pricing: $0.05 per 1M tokens (both input and output)
const COST_PER_TOKEN = 0.05 / 1_000_000;

// Simple EXP calculation based on reply length (approach B — no JSON from model)
function calculateExpFromReply(reply: string): number {
  const len = reply.length;
  if (len < 20) return 1;
  if (len < 100) return 2;
  if (len < 300) return 3;
  return 5;
}

export async function POST(req: Request) {
  try {
    // ── Rate Limiting ───────────────────────────────────────
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimitResult = rateLimit(ip);

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded", 
          retryAfter,
          message: `Terlalu banyak pesan. Coba lagi dalam ${retryAfter} detik.`
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          } 
        }
      );
    }

    const { messages, sessionId, characterId, temperature, model, isRegenerate, isEdit, messageIdToReplace } = (await req.json()) as {
      messages: UIMessage[];
      sessionId: string;
      characterId: string;
      temperature?: number;
      model?: string;
      isRegenerate?: boolean;
      isEdit?: boolean;
      messageIdToReplace?: string;
    };

    // 1. Fetch character and session data concurrently
    const [character, session, userProfile] = await Promise.all([
      prisma.character.findUnique({ where: { id: characterId } }),
      prisma.chatSession.findUnique({ 
        where: { id: sessionId }
      }),
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

    // --- RAG: Vector Search for Facts & Lore ---
    // Extract the last 3 messages for context (the "sweet spot")
    const recentContextMessages = messages.slice(-3).map(m => `${m.role === 'user' ? 'User' : character.name}: ${m.content || (m.parts?.find(p => p.type === 'text') as any)?.text || ''}`).join('\n');
    let ragFacts: string[] = [];
    
    if (recentContextMessages) {
      try {
        const queryEmbedding = await generateEmbedding(recentContextMessages);
        
        // Match facts
        const { data: matchedFacts, error: factsError } = await supabase.rpc('match_facts', {
          query_embedding: queryEmbedding,
          match_threshold: 0.2,
          match_count: 5,
          p_session_id: sessionId
        });
        
        if (!factsError && matchedFacts) {
          ragFacts = matchedFacts.map((f: any) => f.fact);
        }

        // Match lore
        const { data: matchedLore, error: loreError } = await supabase.rpc('match_lore', {
          query_embedding: queryEmbedding,
          match_threshold: 0.2,
          match_count: 5,
          p_character_id: characterId
        });

        if (!loreError && matchedLore) {
          ragFacts = [...ragFacts, ...matchedLore.map((l: any) => l.lore_text)];
        }
      } catch (err) {
        console.error("RAG Error:", err);
      }
    }

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

    if (session.global_summary) {
      systemPromptParts.push(`\n[Previous Story Summary]\n${session.global_summary}`);
    }
    
    if (session.current_state) {
      systemPromptParts.push(`\n[Current State]\n${session.current_state}`);
    }

    // --- User Profile Info ---
    const userInfoParts: string[] = [];
    if (userProfile) {
      if (userProfile.display_name && userProfile.display_name !== "User") {
        userInfoParts.push(`The human you are talking to is named ${userProfile.display_name}.`);
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
    const responseInstructions = `
[CRITICAL FORMATTING RULES]
1. You MUST enclose ALL non-spoken actions, thoughts, and narration inside *asterisks*. Example: *smiles warmly and steps closer*
2. ONLY spoken dialogue should be outside asterisks, wrapped in quotes. Example: "Hello there."
3. NEVER write plain text narration like a novel. If it is an action, it MUST have asterisks!
4. STRICT LENGTH RULE: You MUST mirror the length of the User's message. If the User writes a short 1-line message, you MUST reply with a short 1-2 line message. NEVER write long paragraphs unless the User does.
5. Keep *action narration* extremely brief (1 short sentence max). Focus heavily on dialogue.
6. Let the User drive the action. Do not fast-forward or speak for the User.
7. Avoid purple prose, repetitive actions, and overly poetic descriptions. Be concise and natural.
8. Multi-Character Awareness & User Roleplay: The User may introduce third-party characters or roleplay as them directly (e.g., "*her husband.* where are you honey..."). You MUST recognize when the User is acting as someone else and respond to that specific persona appropriately in context. Do not confuse these assumed personas with the original main User.
9. Clarification over Hallucination: If the User's input is ambiguous, unclear, or lacks sufficient context, you MUST ask the User for clarification in-character. Do NOT hallucinate, guess, or invent details to fill the gap.
10. Plain text output only. No JSON.`;

    let finalResponseInstructions = responseInstructions;
    if (isRegenerate) {
      finalResponseInstructions += `\n11. STRICT RULE: You MUST keep your reply under 2 sentences! Be extremely concise and straight to the point.`;
    }

    systemPromptParts.push(finalResponseInstructions);

    // --- Dynamic Placeholder Replacement ---
    let charBackstory = character.backstory || character.persona || "";
    let charMemories = character.key_memories || "";
    let charScenario = character.scenario || "";
    let charDirectives = character.response_directives || "";
    let charExample = character.example_dialogue || "";

    if (userProfile && userProfile.display_name && userProfile.display_name !== "User") {
      const replaceUser = (text: string) => text.replace(/\bUser\b/g, userProfile.display_name as string);
      charBackstory = replaceUser(charBackstory);
      charMemories = replaceUser(charMemories);
      charScenario = replaceUser(charScenario);
      charDirectives = replaceUser(charDirectives);
      charExample = replaceUser(charExample);
    }

    const factsList = ragFacts.length > 0 
      ? "\n[Relevant Memories / World Lore]\n" + ragFacts.map((f: any) => `- ${f}`).join("\n")
      : "";
    const genderStr = character.gender && character.gender !== "Not specified" ? `\nGender: ${character.gender}` : "";

    // --- Consolidate system prompt ---
    const block1 = `Identity:\nYou are ${character.name}.${genderStr}\n${charBackstory}\n${charMemories}${factsList}`.trim();
    
    const block2 = `Context & History:\n${charScenario}\n[Relationship: ${getTierName(tier)} (Level ${currentLevel})]\n${tierDirective}\n${session.global_summary ? `[Previous Summary: ${session.global_summary}]` : ""}\n${session.current_state ? `[Current State: ${session.current_state}]` : ""}`.trim();
    
    const block3 = `User Profile:\n${userInfoParts.join(" ")}\nStyle: ${userProfile?.response_style || "Normal"}`.trim();
    
    const block4 = `Directives:\n${charDirectives}\n${charExample}\n${finalResponseInstructions}`.trim();

    const systemPrompt = [block1, block2, block3, block4].join("\n\n");

    // 4. Save user message to DB or handle regeneration cleanup
    let userText = "";
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (lastUserMessage) {
      userText = (lastUserMessage as any).content || 
        (lastUserMessage.parts?.find((p: any) => p.type === "text") as any)?.text || "";
    }

    let deletedCount = 0;
    if ((isRegenerate || isEdit) && messageIdToReplace) {
      const targetMessage = await prisma.message.findUnique({
        where: { id: messageIdToReplace }
      });
      if (targetMessage) {
        // Delete messages from target onwards
        const deleted = await prisma.message.deleteMany({
          where: {
            session_id: sessionId,
            created_at: {
              gte: targetMessage.created_at
            }
          }
        });
        deletedCount = deleted.count;

        // Delete any Long-term memory (StoryChapter, CharacterFact) generated after target
        await prisma.storyChapter.deleteMany({
          where: {
            session_id: sessionId,
            created_at: {
              gte: targetMessage.created_at
            }
          }
        });
        await prisma.characterFact.deleteMany({
          where: {
            session_id: sessionId,
            created_at: {
              gte: targetMessage.created_at
            }
          }
        });
      }
    }

    if (!isRegenerate) {
      if (userText) {
        await prisma.message.create({
          data: { session_id: sessionId, role: "user", content: userText },
        });
      }
    }

    // 5. Fetch last 14 messages from DB for context
    const dbMessages = await prisma.message.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "desc" },
      take: 14,
    });
    
    // Reverse so they are in chronological order (oldest -> newest) for the AI prompt
    dbMessages.reverse();

    const contextMessages = dbMessages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    // 6. Send to Novita Serverless API (STREAMING)
    const novitaKey = process.env.NOVITA_API_KEY;
    if (!novitaKey) throw new Error("NOVITA_API_KEY belum disetel di .env");

    const endpointUrl = `${NOVITA_SERVERLESS_BASE_URL}/chat/completions`;

    const resolvedModel = AVAILABLE_MODELS[(model as ModelKey)] || DEFAULT_MODEL;

    const payload = {
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages
      ],
      max_tokens: 400,
      temperature: temperature || 0.8,
      stream: true,
      include_usage: true,
    };

    // --- DEBUG LOG: Save raw prompt to file ---
    try {
      const logContent = `\n================ [MAIN CHAT PROMPT LOG] ================\nTIMESTAMP: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\nCHARACTER: ${character.name}\nPAYLOAD MESSAGES:\n${JSON.stringify(payload.messages, null, 2)}\n========================================================\n`;
      fs.appendFileSync('debug_logs.txt', logContent);
    } catch (e) {
      console.error("Failed to write debug log", e);
    }

    const novitaRes = await fetchWithRetry(endpointUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${novitaKey}`
      },
      body: JSON.stringify(payload),
    });

    if (!novitaRes.ok) {
      const errText = await novitaRes.text();
      throw new Error(`API Novita error: ${novitaRes.status} - ${errText}`);
    }

    // ── Stream SSE from Novita → Client ──────────────────────
    const encoder = new TextEncoder();
    let fullReply = "";
    let usageData = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = novitaRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                
                // Extract token content
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  fullReply += delta.content;
                  // Forward token to client
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "token", content: delta.content })}\n\n`)
                  );
                }

                // Extract usage data (sent in the last chunk before [DONE])
                if (parsed.usage) {
                  usageData = {
                    prompt_tokens: parsed.usage.prompt_tokens || 0,
                    completion_tokens: parsed.usage.completion_tokens || 0,
                    total_tokens: parsed.usage.total_tokens || 0,
                  };
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }

          // ── Post-stream processing ──────────────────────────
          const aiReply = fullReply.trim();
          const expChange = calculateExpFromReply(aiReply);

          // Save AI reply to DB
          let aiDbMessage = null;
          if (aiReply) {
            aiDbMessage = await prisma.message.create({
              data: { 
                session_id: sessionId, 
                role: "assistant", 
                content: aiReply,
              },
            });
          }

          // Process Affinity
          const currentMsgCount = session.msg_since_summary ?? 0;
          const { newLevel, newExp, leveledUp } = calculateNewLevel(
            currentLevel,
            currentExp,
            expChange
          );
          
          let netChange = 2; // Normal chat adds 1 user + 1 assistant
          if (isRegenerate) {
            netChange = 1 - deletedCount; // +1 assistant, -deleted
          } else if (isEdit) {
            netChange = 2 - deletedCount; // +1 user, +1 assistant, -deleted
          }
          const newMsgCount = Math.max(0, currentMsgCount + netChange);

          // Calculate cost
          const cost = (usageData.prompt_tokens + usageData.completion_tokens) * COST_PER_TOKEN;

          // Update session (affinity + usage stats)
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: {
              affinity_level: newLevel,
              affinity_exp: newExp,
              msg_since_summary: newMsgCount,
              total_prompt_tokens: { increment: usageData.prompt_tokens },
              total_completion_tokens: { increment: usageData.completion_tokens },
              total_cost_usd: { increment: cost },
            },
          });

          // Save usage log
          if (usageData.total_tokens > 0) {
            await prisma.usageLog.create({
              data: {
                session_id: sessionId,
                prompt_tokens: usageData.prompt_tokens,
                completion_tokens: usageData.completion_tokens,
                total_tokens: usageData.total_tokens,
                cost_usd: cost,
                model: resolvedModel,
              },
            });
          }

          // Fire auto-summary in background if threshold reached
          if (newMsgCount >= SUMMARY_TRIGGER_COUNT) {
            generateAutoSummary(sessionId, character.name, session.global_summary).catch(console.error);
          }

          // Real-time Async State Tracking (fire and forget, throttled every 4 messages)
          if (userText && aiReply) {
            const shouldTriggerTracker = Math.floor(currentMsgCount / 4) < Math.floor(newMsgCount / 4);
            if (shouldTriggerTracker) {
              const lastExchanges = contextMessages.slice(-7).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
              const trackingContext = `${lastExchanges}\nAssistant: ${aiReply}`;
              updateStateAsync(sessionId, session.current_state, trackingContext).catch(console.error);
            }
          }

          // Send final "done" event with metadata
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "done",
              reply: aiReply,
              db_id: aiDbMessage?.id,
              exp_change: expChange,
              affinity_level: newLevel,
              affinity_exp: newExp,
              leveledUp,
              usage: usageData,
              cost,
            })}\n\n`)
          );

          controller.close();
        } catch (err: any) {
          console.error("Stream processing error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
