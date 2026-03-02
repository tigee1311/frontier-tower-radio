import React, { useState } from 'react';
import { useRadio } from '../context/RadioContext';

export default function EntryPage() {
  const { login } = useRadio();
  const [name, setName] = useState('');
  const [floor, setFloor] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const floorNum = parseInt(floor, 10);
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!floorNum || floorNum < 1 || floorNum > 16) {
      setError('Floor must be between 1 and 16');
      return;
    }
    // Unlock audio on this user gesture so autoplay works later
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.resume();
      window.__audioCtx = ctx;
    } catch {}
    login(name.trim(), floorNum);
  };

  return (
    <div className="min-h-screen flex items-center justify-center radio-static relative overflow-hidden">
      {/* Background tower silhouette */}
      <div className="absolute inset-0 flex items-end justify-center opacity-5 pointer-events-none">
        <div className="w-32 bg-gradient-to-t from-tower-accent to-transparent" style={{ height: '80vh' }} />
        <div className="w-2 bg-tower-accent absolute" style={{ height: '90vh', bottom: 0 }} />
      </div>

      {/* Floating signal waves */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="absolute border border-tower-accent/20 rounded-full animate-pulse-glow"
            style={{
              width: `${80 + i * 60}px`,
              height: `${80 + i * 60}px`,
              top: `-${i * 30}px`,
              left: `${-(80 + i * 60) / 2}px`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Frontier Tower branding */}
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <svg viewBox="0 0 64 80" className="w-14 h-18 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
              {/* Building outline */}
              <rect x="14" y="16" width="36" height="58" rx="2" className="stroke-tower-accent" strokeWidth="1.5" />
              {/* Floors */}
              {[26, 36, 46, 56, 66].map((y, i) => (
                <line key={i} x1="14" y1={y} x2="50" y2={y} className="stroke-tower-accent/30" strokeWidth="0.75" />
              ))}
              {/* Windows */}
              {[22, 32, 42, 52, 62].map((y, i) => (
                <g key={i}>
                  <rect x="20" y={y} width="5" height="4" rx="0.5" className="fill-tower-accent/40" />
                  <rect x="30" y={y} width="5" height="4" rx="0.5" className="fill-tower-accent/20" />
                  <rect x="40" y={y} width="5" height="4" rx="0.5" className="fill-tower-accent/40" />
                </g>
              ))}
              {/* Antenna */}
              <line x1="32" y1="4" x2="32" y2="16" className="stroke-tower-accent" />
              <circle cx="32" cy="4" r="2.5" className="fill-tower-accent stroke-tower-accent" />
              {/* Signal waves */}
              <path d="M 38 8 Q 42 4 38 0" className="stroke-tower-glow/50" fill="none" strokeWidth="1" />
              <path d="M 26 8 Q 22 4 26 0" className="stroke-tower-glow/50" fill="none" strokeWidth="1" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-tower-text tracking-wide">
            Frontier Tower
          </h1>
          <h2 className="font-display text-lg text-tower-accent tracking-[0.2em] mt-1 font-medium">
            RADIO
          </h2>
          <p className="text-tower-muted text-sm mt-4 font-light">
            Broadcasting from 16 floors of sound
          </p>
        </div>

        {/* Intercom panel */}
        <form onSubmit={handleSubmit} className="bg-tower-panel border border-tower-border rounded-lg p-8 glow-border">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-tower-border">
            <div className="w-2 h-2 rounded-full bg-tower-green animate-pulse" />
            <span className="text-tower-muted text-xs tracking-widest uppercase">Tower Intercom — Check In</span>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-tower-muted text-xs tracking-wider uppercase mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Enter your name..."
                className="w-full bg-tower-dark border border-tower-border rounded px-4 py-3 text-tower-text
                  placeholder-tower-muted/40 focus:outline-none focus:border-tower-accent/50 focus:ring-1
                  focus:ring-tower-accent/20 transition-all text-sm"
                maxLength={30}
              />
            </div>

            <div>
              <label className="block text-tower-muted text-xs tracking-wider uppercase mb-2">
                Floor Number
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => { setFloor(e.target.value); setError(''); }}
                  placeholder="1 - 16"
                  min="1"
                  max="16"
                  className="w-full bg-tower-dark border border-tower-border rounded px-4 py-3 text-tower-text
                    placeholder-tower-muted/40 focus:outline-none focus:border-tower-accent/50 focus:ring-1
                    focus:ring-tower-accent/20 transition-all text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-tower-muted/30 text-xs">
                  FL
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs mt-3">{error}</p>
          )}

          <button
            type="submit"
            className="w-full mt-6 bg-tower-accent/10 border border-tower-accent/40 text-tower-accent
              rounded py-3 font-display text-sm tracking-widest uppercase
              hover:bg-tower-accent/20 hover:border-tower-accent/60 hover:shadow-lg
              hover:shadow-tower-accent/10 transition-all duration-300 active:scale-[0.98]"
          >
            Tune In
          </button>

          <p className="text-center text-tower-muted/40 text-xs mt-4">
            Press to join the broadcast
          </p>
        </form>
      </div>
    </div>
  );
}
