import React, { useEffect, useRef } from 'react';
import { useRadio } from '../context/RadioContext';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : `http://${window.location.hostname}:3001`;

export default function Player() {
  const { currentSong, playbackState } = useRadio();
  const audioRef = useRef(null);
  const currentSongIdRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  // Resume playback on any user interaction if audio is paused but should be playing
  useEffect(() => {
    const tryResume = () => {
      const audio = audioRef.current;
      if (audio && audio.src && audio.paused && currentSong && !playbackState.isAnnouncing) {
        audio.play().catch(() => {});
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
    const audio = audioRef.current;
    if (!audio) return;

    if (playbackState.isAnnouncing || !currentSong) {
      audio.pause();
      audio.src = '';
      currentSongIdRef.current = null;
      return;
    }

    if (currentSongIdRef.current === currentSong.id) return;
    currentSongIdRef.current = currentSong.id;

    if (currentSong.type === 'youtube') {
      audio.src = `${API_BASE}/api/stream/${currentSong.source}`;
    } else {
      audio.src = `${API_BASE}${currentSong.source}`;
    }

    audio.play().catch((err) => {
      console.warn('Autoplay blocked:', err.message);
      // Browser blocked autoplay — the interaction listeners above will retry
    });
  }, [currentSong, playbackState.isAnnouncing]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return null;
}
