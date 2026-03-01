import React from 'react';
import { useRadio } from '../context/RadioContext';

export default function Queue() {
  const { queue, voteSong, removeSong, myVotes, user } = useRadio();

  const handleVote = async (songId, direction) => {
    try {
      await voteSong(songId, direction);
    } catch {}
  };

  const handleRemove = async (songId) => {
    try {
      await removeSong(songId);
    } catch {}
  };

  const estimateWait = (index) => {
    const minutes = (index + 1) * 3.5;
    if (minutes < 1) return 'Up next';
    if (minutes < 60) return `~${Math.round(minutes)} min`;
    return `~${Math.round(minutes / 60 * 10) / 10} hr`;
  };

  return (
    <div className="bg-tower-panel border border-tower-border rounded-lg p-4 glow-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-tower-blue" />
          <span className="text-tower-muted text-xs tracking-widest uppercase">Queue</span>
        </div>
        <span className="text-tower-muted text-xs">{queue.length} songs</span>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-tower-muted/50 text-sm">Queue is empty</p>
          <p className="text-tower-muted/30 text-xs mt-1">Be the first to submit a song!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {queue.map((song, index) => {
            const myVote = myVotes[song.id] || null;
            const isOwn = song.user_id === user.userId;

            return (
              <div
                key={song.id}
                className="bg-tower-dark/50 border border-tower-border/50 rounded p-3 animate-slide-up
                  hover:border-tower-border transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-tower-muted/40 text-xs font-mono">#{index + 1}</span>
                      <h4 className="text-sm text-tower-text truncate font-medium">{song.title}</h4>
                      {isOwn && (
                        <button
                          onClick={() => handleRemove(song.id)}
                          className="text-tower-muted/30 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Remove from queue"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 3l6 6M9 3l-6 6" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-tower-muted">
                      <span className="text-tower-accent">{song.user_name}</span>
                      {' · '}
                      <span className="text-tower-blue">FL {song.user_floor}</span>
                      {' · '}
                      <span className="text-tower-muted/50">{estimateWait(index)}</span>
                    </p>
                  </div>

                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleVote(song.id, 'up')}
                      className={`p-1 rounded transition-all ${
                        myVote === 'up'
                          ? 'text-tower-green'
                          : 'text-tower-muted hover:text-tower-green'
                      }`}
                      title="Upvote"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill={myVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 9V3M3 5.5L6 2.5L9 5.5" />
                      </svg>
                    </button>
                    <span className={`text-xs font-bold leading-none ${
                      song.upvotes > 0 ? 'text-tower-green' : song.upvotes < 0 ? 'text-red-400' : 'text-tower-muted/40'
                    }`}>
                      {song.upvotes}
                    </span>
                    <button
                      onClick={() => handleVote(song.id, 'down')}
                      className={`p-1 rounded transition-all ${
                        myVote === 'down'
                          ? 'text-red-400'
                          : 'text-tower-muted hover:text-red-400'
                      }`}
                      title="Downvote"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill={myVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 3V9M3 6.5L6 9.5L9 6.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
