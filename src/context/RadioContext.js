import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const RadioContext = createContext();

const API_BASE = process.env.NODE_ENV === 'production' ? '' : `http://${window.location.hostname}:3001`;

export function useRadio() {
  return useContext(RadioContext);
}

export function RadioProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tower-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [playbackState, setPlaybackState] = useState({});
  const [listenerCount, setListenerCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myVotes, setMyVotes] = useState({});
  const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem('admin-pin'));
  const [adminPin, setAdminPin] = useState(() => sessionStorage.getItem('admin-pin') || '');
  const [volume, setVolume] = useState(100);
  const socketRef = useRef(null);

  const login = useCallback((name, floor) => {
    const userData = { name, floor, userId: uuidv4() };
    localStorage.setItem('tower-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tower-user');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setUser(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join', { name: user.name, floor: user.floor, userId: user.userId });
      socket.emit('requestState');
      // Fetch existing votes
      fetch(`${API_BASE}/api/votes/${user.userId}`)
        .then(r => r.json()).then(v => setMyVotes(v)).catch(() => {});
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('state', (state) => {
      setQueue(state.queue || []);
      setCurrentSong(state.currentSong || null);
      setPlaybackState(state.playbackState || {});
      setListenerCount(state.listenerCount || 0);
      if (state.volume !== undefined) setVolume(state.volume);
      if (state.recentActivity) {
        setActivities(state.recentActivity);
      }
    });

    socket.on('volume', (vol) => {
      setVolume(vol);
    });

    socket.on('activity', (activity) => {
      setActivities(prev => [...prev.slice(-19), activity]);
    });

    socket.on('announcement', (data) => {
      setAnnouncement(data);
      setTimeout(() => setAnnouncement(null), 3500);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const searchSongs = useCallback(async (query) => {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, []);

  const submitYouTube = useCallback(async (videoId, title, duration) => {
    const res = await fetch(`${API_BASE}/api/songs/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        title,
        duration,
        userId: user.userId,
        userName: user.name,
        userFloor: user.floor,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [user]);

  const submitFile = useCallback(async (file, title) => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title || file.name);
    formData.append('userId', user.userId);
    formData.append('userName', user.name);
    formData.append('userFloor', user.floor);

    const res = await fetch(`${API_BASE}/api/songs/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [user]);

  const removeSong = useCallback(async (songId) => {
    const res = await fetch(`${API_BASE}/api/songs/${songId}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [user]);

  const adminLogin = useCallback(async (pin) => {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    sessionStorage.setItem('admin-pin', pin);
    setAdminPin(pin);
    setIsAdmin(true);
    return data;
  }, []);

  const adminLogout = useCallback(() => {
    sessionStorage.removeItem('admin-pin');
    setAdminPin('');
    setIsAdmin(false);
  }, []);

  const adminSkip = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: adminPin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [adminPin]);

  const adminRemove = useCallback(async (songId) => {
    const res = await fetch(`${API_BASE}/api/admin/remove/${songId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: adminPin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [adminPin]);

  const adminSetVolume = useCallback(async (vol) => {
    const res = await fetch(`${API_BASE}/api/admin/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: adminPin, volume: vol }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [adminPin]);

  const voteSong = useCallback(async (songId, direction) => {
    const res = await fetch(`${API_BASE}/api/songs/${songId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.userId, direction }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setMyVotes(prev => {
      const next = { ...prev };
      if (data.vote === null) {
        delete next[songId];
      } else {
        next[songId] = data.vote;
      }
      return next;
    });
    return data;
  }, [user]);

  return (
    <RadioContext.Provider value={{
      user, login, logout,
      queue, currentSong, playbackState,
      listenerCount, activities, announcement,
      isConnected,
      searchSongs, submitYouTube, submitFile, removeSong, voteSong, myVotes,
      isAdmin, adminLogin, adminLogout, adminSkip, adminRemove, volume, adminSetVolume,
    }}>
      {children}
    </RadioContext.Provider>
  );
}
