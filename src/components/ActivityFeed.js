import React, { useRef, useEffect } from 'react';
import { useRadio } from '../context/RadioContext';

export default function ActivityFeed() {
  const { activities } = useRadio();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="bg-tower-panel border border-tower-border rounded-lg p-4 glow-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-tower-glow animate-pulse" />
        <span className="text-tower-muted text-xs tracking-widest uppercase">Live Feed</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-tower-muted/30 text-xs text-center py-4">No activity yet...</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 text-xs animate-fade-in"
            >
              <span className="text-tower-muted/30 whitespace-nowrap min-w-[48px] text-right">
                {timeAgo(activity.timestamp)}
              </span>
              <span className="text-tower-text/70 leading-relaxed">
                {activity.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
