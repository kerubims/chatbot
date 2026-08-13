"use client";

import { useEffect, useState } from "react";

interface ExpToastProps {
  expChange: number;
  onComplete: () => void;
}

export default function ExpToast({ expChange, onComplete }: ExpToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible && expChange === 0) return null; // Optionally don't show +0

  const isPositive = expChange > 0;
  const isNegative = expChange < 0;
  const prefix = isPositive ? "+" : "";
  
  return (
    <div 
      className={`absolute top-0 right-4 animate-float-up pointer-events-none z-50 flex items-center gap-1 font-bold text-lg drop-shadow-md
        ${isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-gray-400"}
      `}
    >
      <span className="text-xl">{isPositive ? "♥" : isNegative ? "💔" : "💬"}</span>
      <span>{prefix}{expChange} XP</span>
    </div>
  );
}
