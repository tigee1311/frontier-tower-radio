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

    audio.play().catch(() => {});
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
