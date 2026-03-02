import React, { useState } from 'react';
import { useRadio } from '../context/RadioContext';

export default function AdminPanel() {
  const {
    isAdmin, adminLogin, adminLogout, adminSkip, adminRemove, adminSetVolume,
    volume, queue, currentSong,
  } = useRadio();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await adminLogin(pin);
      setPin('');
      setError('');
      setShowLogin(false);
    } catch {
      setError('Invalid PIN');
    }
  };

  const handleSkip = async () => {
    try { await adminSkip(); } catch {}
  };

  const handleVolume = async (val) => {
    try { await adminSetVolume(val); } catch {}
  };

  const handleRemove = async (songId) => {
    try { await adminRemove(songId); } catch {}
  };

  // Not admin — show small button to open login
  if (!isAdmin) {
    if (!showLogin) {
      return (
        <button
          onClick={() => setShowLogin(true)}
          className="fixed bottom-4 right-4 w-8 h-8 rounded-full bg-tower-panel border border-tower-border
            text-tower-muted/30 hover:text-tower-muted hover:border-tower-accent/30 transition-all text-xs z-50"
          title="Admin"
        >
          A
        </button>
      );
    }

    return (
      <div className="fixed bottom-4 right-4 bg-tower-panel border border-tower-border rounded-lg p-4 z-50 w-64 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-tower-muted text-xs tracking-widest uppercase">Admin Login</span>
          <button onClick={() => { setShowLogin(false); setError(''); setPin(''); }} className="text-tower-muted hover:text-tower-text text-xs">
            X
          </button>
        </div>
        <form onSubmit={handleLogin} className="space-y-2">
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="Enter admin PIN"
            className="w-full bg-tower-dark border border-tower-border rounded px-3 py-2 text-tower-text
              placeholder-tower-muted/40 focus:outline-none focus:border-tower-accent/50 font-mono text-sm"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-tower-accent/10 border border-tower-accent/40 text-tower-accent
              rounded py-2 text-xs tracking-widest uppercase hover:bg-tower-accent/20 transition-all"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="bg-tower-panel border border-red-500/20 rounded-lg p-4 glow-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-400 text-xs tracking-widest uppercase font-medium">Admin Controls</span>
        </div>
        <button
          onClick={adminLogout}
          className="text-tower-muted hover:text-tower-text text-xs transition-colors"
        >
          Lock
        </button>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        disabled={!currentSong}
        className="w-full mb-3 bg-tower-dark border border-tower-border text-tower-text
          rounded py-2 text-xs tracking-wider uppercase
          hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400
          disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12.5 4a.5.5 0 00-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.008 1.233.696L11.5 8.752V12a.5.5 0 001 0V4z"/>
        </svg>
        Skip Current Song
      </button>

      {/* Volume slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-tower-muted text-xs tracking-wider uppercase">Volume</span>
          <span className="text-tower-text text-xs font-mono">{volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
          className="w-full h-1 bg-tower-dark rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tower-accent
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          {[0, 25, 50, 75, 100].map(v => (
            <button
              key={v}
              onClick={() => handleVolume(v)}
              className={`text-xs px-1.5 py-0.5 rounded transition-all ${
                volume === v
                  ? 'text-tower-accent bg-tower-accent/10'
                  : 'text-tower-muted/50 hover:text-tower-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Queue management */}
      {queue.length > 0 && (
        <div>
          <span className="text-tower-muted text-xs tracking-wider uppercase block mb-2">Remove from Queue</span>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {queue.map(song => (
              <div key={song.id} className="flex items-center justify-between bg-tower-dark/50 rounded px-2 py-1.5">
                <span className="text-tower-text text-xs truncate flex-1 mr-2">{song.title}</span>
                <button
                  onClick={() => handleRemove(song.id)}
                  className="text-tower-muted hover:text-red-400 text-xs transition-colors shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
