"use client";

import { useEffect, useState } from "react";
import { getTier, getTierName } from "@/lib/affinity";

interface LevelUpOverlayProps {
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpOverlay({ newLevel, onClose }: LevelUpOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay to allow the DOM to render before triggering animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const tier = getTier(newLevel);
  const tierName = getTierName(tier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className={`glass-card p-8 flex flex-col items-center max-w-md w-full text-center
          transform transition-all duration-500 animate-level-up animate-glow-pulse
          ${visible ? "scale-100 opacity-100" : "scale-90 opacity-0"}
        `}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-pink rounded-full flex items-center justify-center mb-6 shadow-glow">
          <span className="text-4xl">♥</span>
        </div>
        
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-cyan mb-2">
          Level Up!
        </h2>
        
        <p className="text-xl text-text-primary mb-1">
          Affinity Level reached <span className="font-bold text-accent-pink">{newLevel}</span>
        </p>
        
        <p className="text-text-secondary mb-6">
          Relationship Status: <span className="font-semibold text-white">{tierName}</span>
        </p>

        <button 
          onClick={onClose}
          className="btn-primary w-full py-3 text-lg"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
