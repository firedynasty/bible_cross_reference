import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getKjvAudioUrl } from '../data/kjvAudio';
import { getStorytimeAudioUrl } from '../data/storytimeAudio';

// Swipe order: down = next source (KJV -> Story Time), up = previous source.
const SOURCES = [
  { key: 'kjv', label: 'KJV', getUrl: getKjvAudioUrl },
  { key: 'story', label: 'Story Time', getUrl: getStorytimeAudioUrl },
];

const SWIPE_MIN_PX = 40;
const SKIP_SECONDS = 10;
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
const MOBILE_MAX_WIDTH = 640;
const SLEEP_OPTIONS_MIN = [15, 30];

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function ChapterAudioModal({
  open,
  onClose,
  bookAbbrev,
  bookName,
  currentChapter,
  chapterCount,
  onChapterChange,
  isDarkMode,
  isSepiaMode,
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [flash, setFlash] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [sleepEndsAt, setSleepEndsAt] = useState(null);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_MAX_WIDTH);

  const audioRef = useRef(null);
  const pointerStart = useRef(null);
  const wantPlayRef = useRef(true);
  const flashTimerRef = useRef(null);
  const sleepChoiceRef = useRef(-1);

  const source = SOURCES[sourceIndex];
  const url = source.getUrl(bookAbbrev, currentChapter);

  const showFlash = useCallback((text) => {
    setFlash(text);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(''), 1200);
  }, []);

  // Start a track synchronously so play() runs inside the user's gesture
  // (mobile browsers reject play() calls made later from an effect).
  const startTrack = useCallback((nextUrl) => {
    const audio = audioRef.current;
    if (!audio || !nextUrl) return;
    setLoadError(false);
    audio.src = nextUrl;
    audio.playbackRate = SPEEDS[speedIndex];
    wantPlayRef.current = true;
    audio.play().catch(err => console.warn('Chapter audio play failed:', err));
  }, [speedIndex]);

  // Load the track whenever the source, book or chapter changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!open || !audio) return;
    if (!url) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    setLoadError(false);
    if (audio.getAttribute('src') === url) return; // already started from a gesture handler
    audio.src = url;
    audio.playbackRate = SPEEDS[speedIndex];
    if (wantPlayRef.current) {
      audio.play().catch(err => {
        console.warn('Chapter audio play failed:', err);
        showFlash('Tap to play');
      });
    }
    // speedIndex intentionally omitted: speed changes are applied directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_MAX_WIDTH);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sleep timer: pause playback when the countdown reaches zero
  useEffect(() => {
    if (!sleepEndsAt) return undefined;
    const tick = () => {
      const remaining = Math.max(0, sleepEndsAt - Date.now());
      setSleepRemaining(remaining);
      if (remaining === 0) {
        wantPlayRef.current = false;
        if (audioRef.current) audioRef.current.pause();
        sleepChoiceRef.current = -1;
        setSleepEndsAt(null);
        showFlash('Sleep timer ended');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepEndsAt, showFlash]);

  // Cycle: Off -> 15 -> 30 -> Off
  const cycleSleepTimer = useCallback(() => {
    const nextIdx = sleepChoiceRef.current + 1;
    if (nextIdx >= SLEEP_OPTIONS_MIN.length) {
      sleepChoiceRef.current = -1;
      setSleepEndsAt(null);
      setSleepRemaining(0);
      showFlash('Sleep timer off');
      return;
    }
    sleepChoiceRef.current = nextIdx;
    setSleepEndsAt(Date.now() + SLEEP_OPTIONS_MIN[nextIdx] * 60000);
    showFlash(`Stops in ${SLEEP_OPTIONS_MIN[nextIdx]} min`);
  }, [showFlash]);

  // Pause when the modal closes
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      wantPlayRef.current = true;
    }
    if (!open) {
      sleepChoiceRef.current = -1;
      setSleepEndsAt(null);
    }
  }, [open]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (audio.paused) {
      wantPlayRef.current = true;
      audio.play().catch(err => console.warn('Chapter audio play failed:', err));
    } else {
      wantPlayRef.current = false;
      audio.pause();
    }
  }, [url]);

  const skip = useCallback((delta) => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + delta));
  }, [url]);

  const changeChapter = useCallback((delta) => {
    const next = currentChapter + delta;
    if (next < 1 || next > chapterCount) {
      showFlash(delta > 0 ? 'Last chapter' : 'First chapter');
      return;
    }
    showFlash(delta > 0 ? `Chapter ${next} →` : `← Chapter ${next}`);
    startTrack(SOURCES[sourceIndex].getUrl(bookAbbrev, next));
    onChapterChange(next);
  }, [currentChapter, chapterCount, onChapterChange, showFlash, startTrack, sourceIndex, bookAbbrev]);

  // Move to the next/previous source that has audio for this chapter
  const changeSource = useCallback((direction) => {
    for (let i = sourceIndex + direction; i >= 0 && i < SOURCES.length; i += direction) {
      const nextUrl = SOURCES[i].getUrl(bookAbbrev, currentChapter);
      if (nextUrl) {
        startTrack(nextUrl);
        setSourceIndex(i);
        showFlash(SOURCES[i].label);
        return;
      }
    }
    showFlash(direction > 0 ? 'No more sources below' : 'No more sources above');
  }, [sourceIndex, bookAbbrev, currentChapter, showFlash, startTrack]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }, [speedIndex]);

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < SWIPE_MIN_PX && absY < SWIPE_MIN_PX) {
      togglePlay();
    } else if (absX > absY) {
      changeChapter(dx < 0 ? 1 : -1); // swipe left = next chapter
    } else {
      changeSource(dy > 0 ? 1 : -1); // swipe down = next source
    }
  };

  // Keyboard equivalents for desktop
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') changeChapter(-1);
      else if (e.key === 'ArrowRight') changeChapter(1);
      else if (e.key === 'ArrowDown') { e.preventDefault(); changeSource(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); changeSource(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, togglePlay, changeChapter, changeSource]);

  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  if (!open) return null;

  const bg = isDarkMode ? '#2a2a2a' : isSepiaMode ? '#f4ecd8' : 'white';
  const fg = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333';
  const muted = isDarkMode ? '#aaa' : isSepiaMode ? '#7a6a4a' : '#666';
  const surface = isDarkMode ? '#1f1f1f' : isSepiaMode ? '#e9dfc4' : '#f3f4f6';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={isMobile
          ? { background: bg, color: fg, padding: 16, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }
          : { background: bg, color: fg, borderRadius: 16, padding: 20, width: '92%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.1em' }}>{bookName} {currentChapter}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: muted, padding: '0 4px' }}
          >×</button>
        </div>

        {/* Swipe surface */}
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStart.current = null; }}
          style={{ touchAction: 'none', userSelect: 'none', background: surface, borderRadius: 12, ...(isMobile ? { flex: 1, minHeight: 0 } : { height: 220 }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', top: 6, fontSize: 12, color: muted }}>▲ swipe up: previous source</div>
          <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: muted }}>← prev ch</div>
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: muted }}>next ch →</div>
          <div style={{ position: 'absolute', bottom: 6, fontSize: 12, color: muted }}>▼ swipe down: next source</div>

          <div style={{ fontSize: 44 }}>{isPlaying ? '⏸' : '▶'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{source.label}</div>
          {loadError ? <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Couldn't load this audio file</div> : null}
          {!url ? <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>No {source.label} audio for this chapter</div> : null}
          {flash ? (
            <div style={{ position: 'absolute', top: '22%', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 12px', borderRadius: 999, fontSize: 13 }}>{flash}</div>
          ) : null}
        </div>

        {/* Source chips */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '12px 0' }}>
          {SOURCES.map((s, i) => {
            const available = !!s.getUrl(bookAbbrev, currentChapter);
            return (
              <button
                key={s.key}
                disabled={!available}
                onClick={() => { startTrack(s.getUrl(bookAbbrev, currentChapter)); setSourceIndex(i); }}
                style={{ padding: '3px 10px', borderRadius: 999, border: 'none', fontSize: 12, fontWeight: 600, cursor: available ? 'pointer' : 'default', opacity: available ? 1 : 0.35, background: i === sourceIndex ? '#ec4899' : surface, color: i === sourceIndex ? 'white' : fg }}
              >{s.label}</button>
            );
          })}
        </div>

        {/* Seek bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
          style={{ width: '100%' }}
        />

        {/* Fine controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          <button onClick={() => skip(-SKIP_SECONDS)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: surface, color: fg, cursor: 'pointer' }}>⟲ {SKIP_SECONDS}s</button>
          <button onClick={cycleSpeed} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: surface, color: fg, cursor: 'pointer', minWidth: 52 }}>{SPEEDS[speedIndex]}x</button>
          <button onClick={cycleSleepTimer} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: sleepEndsAt ? '#ec4899' : surface, color: sleepEndsAt ? 'white' : fg, cursor: 'pointer', minWidth: 72 }} title="Sleep timer: tap to cycle 15 / 30 min / off">😴 {sleepEndsAt ? formatTime(sleepRemaining / 1000) : 'Off'}</button>
          <button onClick={() => skip(SKIP_SECONDS)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: surface, color: fg, cursor: 'pointer' }}>{SKIP_SECONDS}s ⟳</button>
        </div>

        <audio
          ref={audioRef}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => { if (audioRef.current && audioRef.current.getAttribute('src')) setLoadError(true); }}
          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          onLoadedMetadata={(e) => { setDuration(e.target.duration); setCurrentTime(e.target.currentTime); }}
          onEnded={() => {
            setIsPlaying(false);
            if (currentChapter < chapterCount) onChapterChange(currentChapter + 1);
          }}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default ChapterAudioModal;
