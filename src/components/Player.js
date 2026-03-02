import React, { useEffect, useRef, useCallback } from 'react';
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
  const ytContainerRef = useRef(null);
  const currentSongIdRef = useRef(null);

  // Create HTML Audio element for file uploads
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  // Create YouTube player container
  useEffect(() => {
    if (!ytContainerRef.current) {
      const div = document.createElement('div');
      div.id = 'yt-player';
      div.style.position = 'fixed';
      div.style.top = '-9999px';
      div.style.left = '-9999px';
      div.style.width = '1px';
      div.style.height = '1px';
      document.body.appendChild(div);
      ytContainerRef.current = div;
    }
  }, []);

  const destroyYTPlayer = useCallback(() => {
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }
  }, []);

  // Resume playback on user interaction if paused
  useEffect(() => {
    const tryResume = () => {
      if (!currentSong || playbackState.isAnnouncing) return;
      if (currentSong.type === 'youtube' && ytPlayerRef.current) {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state !== 1) ytPlayerRef.current.playVideo();
        } catch {}
      } else if (audioRef.current?.src && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('click', tryResume);
    document.addEventListener('keydown', tryResume);
    return () => {
      document.removeEventListener('click', tryResume);
      document.removeEventListener('keydown', tryResume);
    };
  }, [currentSong, playbackState.isAnnouncing]);

  useEffect(() => {
    if (playbackState.isAnnouncing || !currentSong) {
      // Stop everything during announcement or when nothing is playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      destroyYTPlayer();
      currentSongIdRef.current = null;
      return;
    }

    if (currentSongIdRef.current === currentSong.id) return;
    currentSongIdRef.current = currentSong.id;

    if (currentSong.type === 'youtube') {
      // Use YouTube IFrame player for instant streaming
      audioRef.current.pause();
      audioRef.current.src = '';
      destroyYTPlayer();

      // Calculate how far into the song we should start (for late joiners)
      const elapsed = playbackState.startedAt
        ? Math.floor((Date.now() - playbackState.startedAt) / 1000)
        : 0;

      onYTReady(() => {
        // Recreate container div if destroyed
        if (!document.getElementById('yt-player')) {
          const div = document.createElement('div');
          div.id = 'yt-player';
          div.style.position = 'fixed';
          div.style.top = '-9999px';
          div.style.left = '-9999px';
          div.style.width = '1px';
          div.style.height = '1px';
          document.body.appendChild(div);
          ytContainerRef.current = div;
        }

        ytPlayerRef.current = new window.YT.Player('yt-player', {
          videoId: currentSong.source,
          playerVars: {
            autoplay: 1,
            start: elapsed,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              event.target.playVideo();
            },
            onError: (event) => {
              console.warn('YouTube player error:', event.data);
              // Fallback to server stream
              const audio = audioRef.current;
              audio.src = `${API_BASE}/api/stream/${currentSong.source}`;
              audio.play().catch(() => {});
            },
          },
        });
      });
    } else {
      // File upload — use HTML Audio element
      destroyYTPlayer();
      const audio = audioRef.current;
      audio.src = `${API_BASE}${currentSong.source}`;
      audio.play().catch((err) => {
        console.warn('Autoplay blocked:', err.message);
      });
    }
  }, [currentSong, playbackState.isAnnouncing, playbackState.startedAt, destroyYTPlayer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      destroyYTPlayer();
    };
  }, [destroyYTPlayer]);

  return null;
}
