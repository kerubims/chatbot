import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Aggregate usage across all sessions
    const sessionStats = await prisma.chatSession.aggregate({
      _sum: {
        total_prompt_tokens: true,
        total_completion_tokens: true,
        total_cost_usd: true,
      },
      _count: true,
    });

    const totalPromptTokens = sessionStats._sum.total_prompt_tokens || 0;
    const totalCompletionTokens = sessionStats._sum.total_completion_tokens || 0;
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const totalCost = sessionStats._sum.total_cost_usd || 0;
    const sessionCount = sessionStats._count;

    // Count total messages
    const messageCount = await prisma.message.count();
    const avgTokensPerMessage = messageCount > 0 
      ? Math.round(totalTokens / messageCount) 
      : 0;

    // Recent usage logs (last 10)
    const recentLogs = await prisma.usageLog.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        prompt_tokens: true,
        completion_tokens: true,
        total_tokens: true,
        cost_usd: true,
        model: true,
        created_at: true,
      },
    });

    return new Response(JSON.stringify({
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCost,
      sessionCount,
      messageCount,
      avgTokensPerMessage,
      recentLogs,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Stats API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
