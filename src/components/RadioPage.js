import React from 'react';
import { useRadio } from '../context/RadioContext';
import NowPlaying from './NowPlaying';
import Queue from './Queue';
import SubmitSong from './SubmitSong';
import ActivityFeed from './ActivityFeed';
import Announcement from './Announcement';
import Visualizer from './Visualizer';
import Player from './Player';
import AdminPanel from './AdminPanel';

export default function RadioPage() {
  const { user, logout, listenerCount, isConnected, announcement, isAdmin } = useRadio();

  return (
    <div className="min-h-screen radio-static">
      {announcement && <Announcement data={announcement} />}
      <Player />
      {!isAdmin && <AdminPanel />}

      {/* Header */}
      <header className="border-b border-tower-border bg-tower-darker/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-tower-accent flex items-center justify-center">
                <span className="text-white text-xs font-display font-bold">FT</span>
              </div>
              <h1 className="font-display text-sm font-semibold text-tower-text tracking-wide hidden sm:block">
                Frontier Tower <span className="text-tower-accent">Radio</span>
              </h1>
              <h1 className="font-display text-sm font-semibold text-tower-accent sm:hidden">
                FTR
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Listener count */}
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-tower-green animate-pulse' : 'bg-red-500'}`} />
              <span className="text-tower-muted">
                <span className="text-tower-text font-medium">{listenerCount}</span> listening
              </span>
            </div>

            {/* User info */}
            <div className="flex items-center gap-2 bg-tower-panel border border-tower-border rounded px-3 py-1.5">
              <span className="text-xs text-tower-muted">FL {user.floor}</span>
              <span className="text-xs text-tower-accent">{user.name}</span>
            </div>

            <button
              onClick={logout}
              className="text-tower-muted hover:text-tower-text text-xs transition-colors"
              title="Sign off"
            >
              Sign Off
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Now Playing + Submit */}
          <div className="lg:col-span-2 space-y-6">
            <NowPlaying />
            <Visualizer />
            <SubmitSong />
          </div>

          {/* Right column: Queue + Activity */}
          <div className="space-y-6">
            {isAdmin && <AdminPanel />}
            <Queue />
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
