"use client";

import { getTierName, getExpToNextLevel } from "@/lib/affinity";

interface AffinityBarProps {
  level: number;
  exp: number;
}

export default function AffinityBar({ level, exp }: AffinityBarProps) {
  const nextLevelExp = getExpToNextLevel(level);
  const tierName = getTierName(getTierName as any); // Just using getTier internally
  
  // Actually we need `getTier`
  const tier = (level <= 1) ? "stranger" : 
               (level <= 3) ? "acquaintance" : 
               (level <= 5) ? "close" : 
               (level <= 7) ? "intimate" : "devoted";
               
  const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1);
  const progressPercent = nextLevelExp > 0 ? Math.min(100, Math.max(0, (exp / nextLevelExp) * 100)) : 100;

  return (
    <div className="flex flex-col gap-1 w-full max-w-xs">
      <div className="flex justify-between items-end text-xs font-semibold text-text-secondary">
        <div className="flex items-center gap-1">
          <span className="text-accent-pink">♥</span>
          <span>Lvl {level}</span>
          <span className="text-text-muted">({displayTier})</span>
        </div>
        <div className="text-text-muted">
          {nextLevelExp > 0 ? `${exp} / ${nextLevelExp} XP` : "MAX"}
        </div>
      </div>
      
      <div className="h-2 w-full bg-bg-input rounded-full overflow-hidden border border-border-subtle relative">
        <div 
          className="h-full bg-gradient-to-r from-accent-primary to-accent-pink transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 w-[200%] animate-[pulse_2s_infinite_linear] pointer-events-none" />
      </div>
    </div>
  );
}
