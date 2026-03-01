import React from 'react';

export default function Announcement({ data }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-tower-darker/90 backdrop-blur-sm" />
      <div className="relative z-10 text-center animate-announcement px-4">
        {/* Glowing radio signal rings */}
        <div className="relative inline-block mb-6">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute border border-tower-accent/30 rounded-full"
              style={{
                width: `${60 + i * 50}px`,
                height: `${60 + i * 50}px`,
                top: `${-(60 + i * 50) / 2 + 20}px`,
                left: `${-(60 + i * 50) / 2 + 20}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
          <div className="w-10 h-10 bg-tower-accent/20 border-2 border-tower-accent rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-tower-accent rounded-full animate-pulse" />
          </div>
        </div>

        <p className="text-tower-muted text-xs tracking-[0.4em] uppercase mb-3 font-display">
          Coming Up Next
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-tower-accent glow-text mb-3 max-w-lg mx-auto">
          {data.title}
        </h2>
        <p className="text-tower-text/80 text-sm font-mono">
          Requested by{' '}
          <span className="text-tower-accent font-medium">{data.name}</span>
          {' '}from{' '}
          <span className="text-tower-blue font-medium">Floor {data.floor}</span>
        </p>
      </div>
    </div>
  );
}
