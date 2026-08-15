import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import classicalAlbums from '../data/classicalAlbums';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getCurrentTrackIndex(tracks, currentTime) {
  let idx = 0;
  for (let i = tracks.length - 1; i >= 0; i--) {
    if (currentTime >= tracks[i][0]) { idx = i; break; }
  }
  return idx;
}

const ClassicalMusicModal = forwardRef(function ClassicalMusicModal({ open, onClose, onPlayingChange }, ref) {
  const [albumIndex, setAlbumIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const [volume, setVolume] = useState(0.4);

  // Loop timer state
  const [loopActive, setLoopActive] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopDurationSec, setLoopDurationSec] = useState(30);
  const [loopRepeats, setLoopRepeats] = useState(50);
  const [loopCurrentRepeat, setLoopCurrentRepeat] = useState(0);

  const audioRef = useRef(null);
  const loopTimeoutRef = useRef(null);
  const isProgrammaticSeekRef = useRef(false);
  const tracklistScrollRef = useRef(null);
  const activeTrackRef = useRef(null);
  const audioInitialized = useRef(false);

  // Expose togglePlay and isPlaying to parent via ref
  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) { a.play().catch(() => {}); }
      else { a.pause(); }
    },
    get isPlaying() { return isPlaying; }
  }), [isPlaying]);

  // Notify parent of playing state changes
  useEffect(() => {
    if (onPlayingChange) onPlayingChange(isPlaying);
  }, [isPlaying, onPlayingChange]);

  const album = classicalAlbums[albumIndex];
  const tracks = useMemo(() => album?.tracks || [], [album]);

  // Initialize audio element once (persists across open/close)
  useEffect(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = 'auto';
      a.volume = 0.4;
      a.src = classicalAlbums[0].url;
      a.addEventListener('play', () => setIsPlaying(true));
      a.addEventListener('pause', () => setIsPlaying(false));
      a.addEventListener('ended', () => { setIsPlaying(false); });
      audioRef.current = a;
      audioInitialized.current = true;
    }
    return () => {
      // Only clean up on full unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Escape key to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keyboard: space/backtick to toggle play (only when modal is open)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'Backquote') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Time update interval — runs always (even when modal is closed) so state stays synced
  useEffect(() => {
    const interval = setInterval(() => {
      const a = audioRef.current;
      if (a && !a.paused) {
        setCurrentTime(a.currentTime);
        setDuration(a.duration || 0);
        const idx = getCurrentTrackIndex(tracks, a.currentTime);
        setActiveTrackIndex(idx);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [tracks]);

  // Scroll active track into view
  useEffect(() => {
    if (open && tracklistOpen && activeTrackRef.current) {
      activeTrackRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTrackIndex, tracklistOpen, open]);

  // Handle seeked event for loop
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onSeeked = () => {
      if (loopActive && !isProgrammaticSeekRef.current) {
        const newStart = a.currentTime;
        setLoopStart(newStart);
        if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
        setLoopCurrentRepeat((prev) => Math.max(0, prev - 1));
        let repeat = loopCurrentRepeat;
        const totalRepeats = loopRepeats;
        const runCycle = () => {
          repeat++;
          setLoopCurrentRepeat(repeat);
          loopTimeoutRef.current = setTimeout(() => {
            if (repeat < totalRepeats) {
              isProgrammaticSeekRef.current = true;
              a.currentTime = newStart;
              runCycle();
            } else {
              isProgrammaticSeekRef.current = true;
              a.currentTime = newStart;
              a.pause();
              setIsPlaying(false);
              cancelLoop();
            }
          }, loopDurationSec * 1000);
        };
        runCycle();
      }
      isProgrammaticSeekRef.current = false;
    };
    a.addEventListener('seeked', onSeeked);
    return () => a.removeEventListener('seeked', onSeeked);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopActive, loopCurrentRepeat, loopRepeats, loopDurationSec]);

  const loadAlbum = useCallback((idx) => {
    setAlbumIndex(idx);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setActiveTrackIndex(0);
    cancelLoop();
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = classicalAlbums[idx].url;
      a.load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    const a = audioRef.current;
    if (!a) return;
    if (a.readyState >= 1) {
      a.currentTime = seconds;
      if (a.paused) { a.play().catch(() => {}); }
    } else {
      const handler = () => {
        a.removeEventListener('loadedmetadata', handler);
        a.currentTime = seconds;
        a.play().catch(() => {});
      };
      a.addEventListener('loadedmetadata', handler);
    }
  }, []);

  const skip = useCallback((delta) => {
    const a = audioRef.current;
    if (a) a.currentTime = Math.max(0, a.currentTime + delta);
  }, []);

  // ---- Loop timer ----
  const cancelLoop = useCallback(() => {
    if (loopTimeoutRef.current) { clearTimeout(loopTimeoutRef.current); loopTimeoutRef.current = null; }
    setLoopActive(false);
    setLoopCurrentRepeat(0);
  }, []);

  const startLoop = useCallback((durationSec) => {
    const a = audioRef.current;
    if (!a) return;
    cancelLoop();
    const start = a.currentTime || 0;
    setLoopStart(start);
    setLoopDurationSec(durationSec);
    setLoopActive(true);
    setLoopCurrentRepeat(0);
    if (a.paused) { a.play().catch(() => {}); }

    let repeat = 0;
    const totalRepeats = loopRepeats;

    const runCycle = () => {
      repeat++;
      setLoopCurrentRepeat(repeat);
      loopTimeoutRef.current = setTimeout(() => {
        if (repeat < totalRepeats) {
          isProgrammaticSeekRef.current = true;
          a.currentTime = start;
          runCycle();
        } else {
          isProgrammaticSeekRef.current = true;
          a.currentTime = start;
          a.pause();
          cancelLoop();
        }
      }, durationSec * 1000);
    };
    runCycle();
  }, [loopRepeats, cancelLoop]);

  // Don't render modal UI when closed, but component stays mounted
  if (!open) return null;

  const currentTrack = tracks[activeTrackIndex];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Classical Music Player"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-200 shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-indigo-400">Classical Music</h2>
            {isPlaying && (
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Playing" />
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Album Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-emerald-400 whitespace-nowrap">Album</label>
            <select
              value={albumIndex}
              onChange={(e) => loadAlbum(parseInt(e.target.value))}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none"
            >
              {classicalAlbums.map((a, i) => (
                <option key={i} value={i}>{a.title}</option>
              ))}
            </select>
          </div>

          {/* Now Playing */}
          <div className="rounded-lg bg-gray-800 px-4 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Now Playing</p>
            <p className="text-sm text-purple-300 font-medium">
              {currentTrack ? currentTrack[1] : album.title}
            </p>
            {currentTrack && currentTrack[2] && (
              <p className="text-xs text-gray-500 italic mt-1">{currentTrack[2]}</p>
            )}
          </div>

          {/* Play/Pause + Time + Skip */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white transition-all ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              {/* Progress bar */}
              <div
                className="h-2 rounded-full bg-gray-700 cursor-pointer relative overflow-hidden"
                onClick={(e) => {
                  if (!duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  seekTo(pct * duration);
                }}
              >
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Skip buttons */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-blue-400 font-medium mr-1">Skip</span>
            {[[-30, '-30s'], [-15, '-15s'], [15, '+15s'], [30, '+30s']].map(([delta, label]) => (
              <button
                key={delta}
                onClick={() => skip(delta)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 ${
                  delta < 0
                    ? 'bg-indigo-700 hover:bg-indigo-600'
                    : 'bg-blue-700 hover:bg-blue-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Loop Timer Controls */}
          <div className="rounded-lg border border-purple-800 bg-purple-900/30 px-4 py-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs text-purple-300 font-medium">Loop</span>
              {[[15, '15s'], [30, '30s'], [60, '1m'], [180, '3m']].map(([sec, label]) => (
                <button
                  key={sec}
                  onClick={() => loopActive && loopDurationSec === sec ? cancelLoop() : startLoop(sec)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all ${
                    loopActive && loopDurationSec === sec
                      ? 'bg-red-600 animate-pulse'
                      : sec === 60
                        ? 'bg-green-700 hover:bg-green-600'
                        : sec === 180
                          ? 'bg-orange-600 hover:bg-orange-500'
                          : 'bg-cyan-700 hover:bg-cyan-600'
                  }`}
                >
                  {loopActive && loopDurationSec === sec ? 'Stop' : label}
                </button>
              ))}

              <span className="text-xs text-purple-400 font-medium ml-2">Repeat</span>
              {[1, 8, 50].map((n) => (
                <label key={n} className="inline-flex items-center gap-1 text-xs text-purple-300 cursor-pointer">
                  <input
                    type="radio"
                    name="loopRepeatModal"
                    value={n}
                    checked={loopRepeats === n}
                    onChange={() => setLoopRepeats(n)}
                    className="accent-purple-600"
                  />
                  {n}x
                </label>
              ))}
            </div>

            {loopActive && (
              <div className="mt-2 text-center text-xs font-mono text-purple-300 bg-purple-900/50 rounded-md py-1.5">
                Loop: {formatTime(loopStart)} &rarr; {formatTime(loopStart + loopDurationSec)} | Repeat: {loopCurrentRepeat}/{loopRepeats}
              </div>
            )}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-gray-500 w-8 text-right">{Math.round(volume * 100)}%</span>
          </div>

          {/* Tracklist - window within a window */}
          <div className="rounded-lg border border-indigo-800 bg-gray-800/60 overflow-hidden">
            <button
              onClick={() => setTracklistOpen(!tracklistOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-indigo-400 font-medium hover:bg-gray-800 transition-colors"
            >
              <span>Tracklist ({tracks.length} tracks)</span>
              <span className="text-lg">{tracklistOpen ? '\u25B2' : '\u25BC'}</span>
            </button>

            {tracklistOpen && (
              <div
                ref={tracklistScrollRef}
                className="max-h-64 overflow-y-auto border-t border-indigo-900"
              >
                {tracks.map((track, i) => {
                  const isActive = i === activeTrackIndex;
                  return (
                    <div
                      key={i}
                      ref={isActive ? activeTrackRef : null}
                      onClick={() => { seekTo(track[0]); setActiveTrackIndex(i); }}
                      className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-800/50 ${
                        isActive
                          ? 'bg-indigo-900/40 border-l-2 border-l-indigo-500'
                          : 'hover:bg-gray-800/80'
                      }`}
                    >
                      <span className="font-mono text-xs text-indigo-400 pt-0.5 min-w-[55px] flex-shrink-0">
                        {formatTime(track[0])}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm leading-snug ${isActive ? 'text-white' : 'text-gray-300'}`}>
                          {track[1]}
                        </p>
                        {track[2] && (
                          <p className="text-xs text-gray-500 italic mt-0.5">{track[2]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ClassicalMusicModal;
