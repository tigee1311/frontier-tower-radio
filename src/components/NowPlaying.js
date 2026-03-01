import React, { useState, useEffect } from 'react';
import { useRadio } from '../context/RadioContext';

export default function NowPlaying() {
  const { currentSong, playbackState } = useRadio();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playbackState.startedAt) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - playbackState.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [playbackState.startedAt]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentSong) {
    return (
      <div className="bg-tower-panel border border-tower-border rounded-lg p-6 glow-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-tower-muted" />
          <span className="text-tower-muted text-xs tracking-widest uppercase">Now Playing</span>
        </div>
        <div className="text-center py-8">
          <div className="text-tower-muted/40 text-4xl mb-3 font-display">~ ~ ~</div>
          <p className="text-tower-muted text-sm">Dead air... Submit a song to start the broadcast!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-tower-panel border border-tower-accent/20 rounded-lg p-6 glow-border relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-tower-accent/5 via-transparent to-tower-accent/5 animate-pulse-glow" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-tower-accent animate-pulse" />
          <span className="text-tower-accent text-xs tracking-widest uppercase font-medium">On Air — Now Playing</span>
        </div>

        <h2 className="text-xl font-display font-bold text-tower-text mb-2 truncate">
          {currentSong.title}
        </h2>

        <p className="text-tower-muted text-sm mb-4">
          Requested by{' '}
          <span className="text-tower-accent">{currentSong.user_name}</span>
          {' '}from{' '}
          <span className="text-tower-blue">Floor {currentSong.user_floor}</span>
        </p>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1 bg-tower-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-tower-accent to-tower-glow rounded-full transition-all duration-1000"
              style={{ width: currentSong.duration > 0 ? `${Math.min((elapsed / currentSong.duration) * 100, 100)}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-tower-muted">
            <span>{formatTime(elapsed)}</span>
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-tower-accent animate-pulse" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.5.5 0 01.5.5v11a.5.5 0 01-1 0v-11A.5.5 0 018 2zm3 2a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7a.5.5 0 01.5-.5zm-6 1a.5.5 0 01.5.5v5a.5.5 0 01-1 0v-5A.5.5 0 015 5zm9 1a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5zm-12 1a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 012 7z"/>
              </svg>
              {currentSong.duration > 0 && (
                <span className="text-tower-muted/50">{formatTime(currentSong.duration)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
