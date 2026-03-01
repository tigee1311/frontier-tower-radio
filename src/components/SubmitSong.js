import React, { useState, useRef } from 'react';
import { useRadio } from '../context/RadioContext';

export default function SubmitSong() {
  const { searchSongs, submitYouTube, submitFile, user, queue } = useRadio();
  const [mode, setMode] = useState('search'); // 'search' or 'upload'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [file, setFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Type a song name or artist');
      return;
    }
    setError('');
    setResults([]);
    setSearching(true);
    try {
      const data = await searchSongs(query.trim());
      if (data.length === 0) {
        setError('No results found. Try a different search.');
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handlePickResult = async (result) => {
    setError('');
    setSubmitting(true);
    try {
      await submitYouTube(result.videoId, result.title, result.durationSeconds || 0);
      setSuccess(`"${result.title}" added to the queue!`);
      setQuery('');
      setResults([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an audio file');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await submitFile(file, fileTitle.trim() || file.name);
      setSuccess('Song added to the queue!');
      setFile(null);
      setFileTitle('');
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-tower-panel border border-tower-border rounded-lg p-6 glow-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-tower-green" />
          <span className="text-tower-muted text-xs tracking-widest uppercase">Submit a Song</span>
        </div>
        <span className="text-xs text-tower-muted">
          {queue.length} in queue
        </span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('search'); setError(''); setSuccess(''); }}
          className={`flex-1 py-2 text-xs tracking-wider uppercase rounded border transition-all ${
            mode === 'search'
              ? 'bg-tower-accent/10 border-tower-accent/40 text-tower-accent'
              : 'bg-transparent border-tower-border text-tower-muted hover:border-tower-border/80'
          }`}
        >
          Search Song
        </button>
        <button
          onClick={() => { setMode('upload'); setError(''); setSuccess(''); setResults([]); }}
          className={`flex-1 py-2 text-xs tracking-wider uppercase rounded border transition-all ${
            mode === 'upload'
              ? 'bg-tower-accent/10 border-tower-accent/40 text-tower-accent'
              : 'bg-transparent border-tower-border text-tower-muted hover:border-tower-border/80'
          }`}
        >
          Upload File
        </button>
      </div>

      {mode === 'search' ? (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song name, artist..."
              className="flex-1 bg-tower-dark border border-tower-border rounded px-3 py-2.5 text-sm text-tower-text
                placeholder-tower-muted/40 focus:outline-none focus:border-tower-accent/50 transition-all"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={searching || submitting}
              className="bg-tower-accent/10 border border-tower-accent/40 text-tower-accent
                rounded px-4 py-2.5 text-xs font-display tracking-widest uppercase
                hover:bg-tower-accent/20 hover:border-tower-accent/60 transition-all
                disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {searching ? '...' : 'Search'}
            </button>
          </form>

          {/* Search results */}
          {results.length > 0 && (
            <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
              <p className="text-tower-muted/50 text-xs mb-1">Pick a result to add to queue:</p>
              {results.map((r) => (
                <button
                  key={r.videoId}
                  onClick={() => handlePickResult(r)}
                  disabled={submitting}
                  className="w-full flex items-center gap-3 bg-tower-dark/50 border border-tower-border/50 rounded p-2.5
                    hover:border-tower-accent/30 hover:bg-tower-dark transition-all text-left
                    disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {r.thumbnail && (
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="w-16 h-10 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-tower-text truncate group-hover:text-tower-accent transition-colors">
                      {r.title}
                    </p>
                    <p className="text-xs text-tower-muted/60 truncate">
                      {r.channel}{r.duration ? ` · ${r.duration}` : ''}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-tower-muted/30 group-hover:text-tower-accent flex-shrink-0 transition-colors" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 8h8M9 5l3 3-3 3" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            type="text"
            value={fileTitle}
            onChange={(e) => setFileTitle(e.target.value)}
            placeholder="Song title (optional)..."
            className="w-full bg-tower-dark border border-tower-border rounded px-3 py-2.5 text-sm text-tower-text
              placeholder-tower-muted/40 focus:outline-none focus:border-tower-accent/50 transition-all"
            maxLength={100}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,.flac,.aac"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="w-full bg-tower-dark border border-tower-border rounded px-3 py-2.5 text-sm text-tower-text
              file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs
              file:bg-tower-accent/10 file:text-tower-accent file:cursor-pointer
              focus:outline-none focus:border-tower-accent/50 transition-all"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-tower-accent/10 border border-tower-accent/40 text-tower-accent
              rounded py-2.5 text-xs font-display tracking-widest uppercase
              hover:bg-tower-accent/20 hover:border-tower-accent/60 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Uploading...' : 'Upload & Queue'}
          </button>
        </form>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {success && <p className="text-tower-green text-xs mt-2">{success}</p>}

      <p className="text-tower-muted/30 text-xs text-center mt-3">
        Broadcasting as {user.name} from Floor {user.floor}
      </p>
    </div>
  );
}
