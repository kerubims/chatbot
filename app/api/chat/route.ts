import { prisma } from "@/lib/prisma";
import { UIMessage } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, sessionId, characterId, temperature, maxTokens } = (await req.json()) as {
      messages: UIMessage[];
      sessionId: string;
      characterId: string;
      temperature?: number;
      maxTokens?: number;
    };

    // 1. Ambil persona karakter dari database
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return new Response("Character not found", { status: 404 });
    }

    // Ambil pesan user terakhir
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    // Simpan pesan user ke DB
    if (lastUserMessage) {
      const text = lastUserMessage.content || 
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

    // Ambil maksimal 20 history pesan terakhir dari DB
    const dbMessages = await prisma.message.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
      take: 20,
    });

    // Format ulang pesan agar sesuai dengan format yang diminta FastAPI Colab
    const contextMessages = dbMessages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    // 2. Hubungi endpoint Google Colab
    // Pastikan Anda sudah menyimpan link ngrok di file .env dengan nama COLAB_API_URL
    const colabUrl = process.env.COLAB_API_URL;
    if (!colabUrl) {
      throw new Error("COLAB_API_URL belum disetel di .env");
    }

    const payload = {
      // 3. Masukkan aturan/persona ke system_prompt
      system_prompt: character.persona, 
      messages: contextMessages,
      max_tokens: maxTokens || 500,
      temperature: temperature || 0.8
    };

    const res = await fetch(`${colabUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Colab error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const reply = data.reply;

    // Simpan balasan AI ke database
    if (reply) {
      await prisma.message.create({
        data: {
          session_id: sessionId,
          role: "assistant",
          content: reply,
        },
      });
    }

    // 4. Kembalikan balasan ke frontend Vercel AI SDK
    // Kembalikan teks mentah agar useChat menangani sebagai plain text stream
    return new Response(reply, {
      status: 200,
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    require('fs').writeFileSync('scratch_error.txt', String(error?.stack || error));
    return new Response(error.message || "Internal server error", { status: 500 });
  }
}
