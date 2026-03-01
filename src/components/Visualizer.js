import React, { useState, useEffect, useCallback } from 'react';
import { useRadio } from '../context/RadioContext';

const BAR_COUNT = 32;

export default function Visualizer() {
  const { currentSong } = useRadio();
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(4));

  const animate = useCallback(() => {
    if (!currentSong) {
      setBars(Array(BAR_COUNT).fill(4));
      return;
    }
    setBars(prev => prev.map(() => {
      const base = 4 + Math.random() * 28;
      return base;
    }));
  }, [currentSong]);

  useEffect(() => {
    if (!currentSong) {
      setBars(Array(BAR_COUNT).fill(4));
      return;
    }
    const interval = setInterval(animate, 120);
    return () => clearInterval(interval);
  }, [currentSong, animate]);

  return (
    <div className="bg-tower-panel border border-tower-border rounded-lg p-4 glow-border">
      <div className="flex items-end justify-center gap-[3px] h-10">
        {bars.map((height, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t-sm transition-all duration-100"
            style={{
              height: `${height}px`,
              background: currentSong
                ? `linear-gradient(to top, #ff6b35, #ff8c5a${height > 20 ? ', #ffaa80' : ''})`
                : '#1e1e2e',
              opacity: currentSong ? 0.6 + (height / 32) * 0.4 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
