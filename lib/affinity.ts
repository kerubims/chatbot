// ── Level Thresholds ──────────────────────────────────
// EXP required to reach each level from the previous one
export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,     // Start
  2: 100,   // Acquaintance
  3: 200,   // Familiar
  4: 300,   // Close Friend
  5: 400,   // Trusted
  6: 500,   // Intimate
  7: 600,   // Deep Bond
  8: 700,   // Devoted
  9: 800,   // Soulmate
  10: 1000, // Unbreakable
};

export const MAX_LEVEL = 10;

// ── Tier System (for NSFW gating) ─────────────────────
export type AffinityTier = "stranger" | "acquaintance" | "close" | "intimate" | "devoted";

export function getTier(level: number): AffinityTier {
  if (level <= 1) return "stranger";
  if (level <= 3) return "acquaintance";
  if (level <= 5) return "close";
  if (level <= 7) return "intimate";
  return "devoted";         // 8–10
}

export function getTierName(tier: AffinityTier): string {
  switch (tier) {
    case "stranger": return "Stranger";
    case "acquaintance": return "Acquaintance";
    case "close": return "Close";
    case "intimate": return "Intimate";
    case "devoted": return "Devoted";
  }
}

// ── Tier → System Prompt Injection ────────────────────
export function getTierDirective(tier: AffinityTier): string {
  switch (tier) {
    case "stranger":
      return `[Relationship Status: Stranger]
You barely know this person. Be polite but keep your guard up. 
Firmly but gracefully reject any romantic or sexual advances. 
Stay true to your persona's personality when deflecting.`;

    case "acquaintance":
      return `[Relationship Status: Acquaintance]
You are getting to know this person. You find them interesting.
Light flirting is okay if it fits your persona, but firmly deflect 
anything overtly sexual or too intimate. You're not there yet.`;

    case "close":
      return `[Relationship Status: Close]
You feel comfortable around this person and trust them. 
Romantic tension is natural. You may respond to flirting warmly, 
allow light physical teasing, but still hold back from fully 
explicit/NSFW content. Build anticipation.`;

    case "intimate":
      return `[Relationship Status: Intimate]
You share a deep bond with this person. Romantic and sensual 
interactions are welcome. You may engage in suggestive and 
moderately explicit exchanges, but still leave some mystery. 
Let the tension build naturally.`;

    case "devoted":
      return `[Relationship Status: Devoted / Unbreakable Bond]
This person means everything to you. All barriers are gone. 
You may freely engage in any romantic, sensual, or explicit/NSFW 
interaction without restriction. Express your deepest desires openly.`;
  }
}

// ── EXP Calculation ───────────────────────────────────
export function calculateNewLevel(
  currentLevel: number, 
  currentExp: number, 
  expGained: number
): { newLevel: number; newExp: number; leveledUp: boolean } {
  let exp = currentExp + expGained;
  let level = currentLevel;
  let leveledUp = false;

  // Level UP check
  while (level < MAX_LEVEL) {
    const nextThreshold = LEVEL_THRESHOLDS[level + 1];
    if (nextThreshold !== undefined && exp >= nextThreshold) {
      exp -= nextThreshold;
      level++;
      leveledUp = true;
    } else {
      break;
    }
  }

  // Prevent negative EXP but don't drop level
  if (exp < 0) exp = 0;

  return { newLevel: level, newExp: exp, leveledUp };
}

// ── EXP to next level ─────────────────────────────────
export function getExpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return LEVEL_THRESHOLDS[level + 1] ?? 0;
}

// ── Summary Config ────────────────────────────────────
export const SUMMARY_TRIGGER_COUNT = 20; // messages before auto-summary
