import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useRadio } from '../context/RadioContext';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : `http://${window.location.hostname}:3001`;

// Load YouTube IFrame API once
let ytApiReady = false;
let ytApiCallbacks = [];
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytApiCallbacks.forEach(cb => cb());
    ytApiCallbacks = [];
  };
} else {
  ytApiReady = true;
}

function onYTReady(cb) {
  if (ytApiReady) cb();
  else ytApiCallbacks.push(cb);
}

export default function Player() {
  const { currentSong, playbackState } = useRadio();
  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const currentSongIdRef = useRef(null);
  const [useYT, setUseYT] = useState(true);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  const destroyYTPlayer = useCallback(() => {
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }
  }, []);

  // Resume on user interaction
  useEffect(() => {
    const tryResume = () => {
      if (!currentSong || playbackState.isAnnouncing) return;
      if (useYT && ytPlayerRef.current) {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state !== 1) ytPlayerRef.current.playVideo();
        } catch {}
      } else if (audioRef.current?.src && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('click', tryResume);
    return () => document.removeEventListener('click', tryResume);
  }, [currentSong, playbackState.isAnnouncing, useYT]);

  useEffect(() => {
    if (playbackState.isAnnouncing || !currentSong) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      destroyYTPlayer();
      currentSongIdRef.current = null;
      return;
    }

    if (currentSongIdRef.current === currentSong.id) return;
    currentSongIdRef.current = currentSong.id;

    if (currentSong.type === 'youtube') {
      audioRef.current.pause();
      audioRef.current.src = '';
      destroyYTPlayer();

      const elapsed = playbackState.startedAt
        ? Math.floor((Date.now() - playbackState.startedAt) / 1000)
        : 0;

      // Ensure container div exists
      let container = document.getElementById('yt-player-wrap');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-player-wrap';
        container.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1;';
        document.body.appendChild(container);
      }
      let playerDiv = document.getElementById('yt-player');
      if (!playerDiv) {
        playerDiv = document.createElement('div');
        playerDiv.id = 'yt-player';
        container.appendChild(playerDiv);
      }

      onYTReady(() => {
        // Re-check in case song changed during API load
        if (currentSongIdRef.current !== currentSong.id) return;

        try {
          ytPlayerRef.current = new window.YT.Player('yt-player', {
            width: '320',
            height: '180',
            videoId: currentSong.source,
            playerVars: {
              autoplay: 1,
              start: elapsed,
              playsinline: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
            },
            events: {
              onReady: (event) => {
                event.target.setVolume(100);
                event.target.playVideo();
              },
              onStateChange: (event) => {
                // If unstarted (-1) for too long, fall back
                if (event.data === -1) {
                  setTimeout(() => {
                    if (ytPlayerRef.current) {
                      try {
                        const state = ytPlayerRef.current.getPlayerState();
                        if (state === -1 || state === 5) {
                          console.warn('YT player stuck, falling back to audio stream');
                          fallbackToStream();
                        }
                      } catch {}
                    }
                  }, 5000);
                }
              },
              onError: () => {
                console.warn('YT player error, falling back to audio stream');
                fallbackToStream();
              },
            },
          });
        } catch {
          fallbackToStream();
        }
      });

      const fallbackToStream = () => {
        destroyYTPlayer();
        setUseYT(false);
        const audio = audioRef.current;
        audio.src = `${API_BASE}/api/stream/${currentSong.source}`;
        audio.play().catch(() => {});
      };
    } else {
      destroyYTPlayer();
      const audio = audioRef.current;
      audio.src = `${API_BASE}${currentSong.source}`;
      audio.play().catch(() => {});
    }
  }, [currentSong, playbackState.isAnnouncing, playbackState.startedAt, destroyYTPlayer]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      destroyYTPlayer();
    };
  }, [destroyYTPlayer]);

  return null;
}
