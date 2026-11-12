import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Bible Rhymes — the rhyme-pipeline chapters rendered as tracks.
 *
 * Ported from the published "Bible Rhymes" artifact
 * (https://claude.ai/artifact/4K1uaaVqtbiSzFmiCZFByo) so the same list -> track
 * sheet -> play/pause flow works inside the app.
 *
 * Data: public/rhyme_songs.json, audio: public/rhyme_songs/*.mp3.
 * Fetched the first time the modal opens, then cached in module scope.
 */

const PlayIcon = ({ size = 17 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ size = 17 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
  </svg>
);

let songsCache = null;

const fmt = (t) => {
  if (!isFinite(t) || t < 0) return '--:--';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const isSpoken = (label) => /bridge|spoken/i.test(label || '');

// Lyric size, remembered per browser. The lyric body is the only thing that
// scales — labels, the player and the source footer stay put.
const FONT_KEY = 'bible-rhyme-lyric-font';
const FONT_MIN = 12;
const FONT_MAX = 30;
const FONT_DEFAULT = 15;

const readFont = () => {
  try {
    const v = parseInt(localStorage.getItem(FONT_KEY), 10);
    return v >= FONT_MIN && v <= FONT_MAX ? v : FONT_DEFAULT;
  } catch {
    return FONT_DEFAULT;
  }
};

// Audio is Dropbox-hosted (see src/data/rhymeAudio.js for the same pattern), but a
// song may also name a file served from public/ — support both.
const audioUrl = (song, baseUrl) =>
  /^https?:\/\//.test(song.audio) ? song.audio : `${baseUrl}/${song.audio}`;

export default function RhymeSongsModal({
  open,
  onClose,
  baseUrl = '',
  isDarkMode = false,
  isSepiaMode = false,
  onOpenChapter,
}) {
  const [songs, setSongs] = useState(songsCache);
  const [loadError, setLoadError] = useState('');
  const [current, setCurrent] = useState(null);     // the song whose sheet is showing
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [seekPos, setSeekPos] = useState(0);        // 0..1000, only while dragging
  const [lyricFont, setLyricFont] = useState(readFont);

  const audioRef = useRef(null);
  const draggingRef = useRef(false);
  const bodyRef = useRef(null);

  // Palette — the artifact's paper/ink feel, mapped onto the app's three themes.
  const paper = isDarkMode ? '#111218' : isSepiaMode ? '#f5efe0' : '#f3f3ef';
  const sheet = isDarkMode ? '#1a1c23' : isSepiaMode ? '#fdf8ec' : '#fbfbf9';
  const ink = isDarkMode ? '#eceef3' : isSepiaMode ? '#4a3a1e' : '#15161b';
  const soft = isDarkMode ? '#9499a8' : isSepiaMode ? '#7a5a2a' : '#5e616d';
  const rule = isDarkMode ? '#2a2d37' : isSepiaMode ? '#d9cba8' : '#dedcd4';
  const accent = isDarkMode ? '#e8637a' : isSepiaMode ? '#9c5b2a' : '#9c1b31';
  const wash = isDarkMode ? 'rgba(232,99,122,.13)' : isSepiaMode ? 'rgba(156,91,42,.10)' : 'rgba(156,27,49,.09)';
  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const serif = 'Georgia, "Source Serif 4", serif';
  const display = 'system-ui, -apple-system, "Archivo", sans-serif';
  const fontBtn = {
    width: 32, height: 32, borderRadius: '50%', border: `1px solid ${rule}`,
    background: 'none', color: soft, fontSize: 13, fontWeight: 600, lineHeight: 1,
    // flex, not grid: a grid would drop the +/- span onto its own row
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, padding: 0,
  };

  // Load the catalogue the first time the modal is opened.
  useEffect(() => {
    if (!open || songs) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/rhyme_songs.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        songsCache = data;
        setSongs(data);
        setLoadError('');
      } catch (err) {
        if (!cancelled) setLoadError(`Could not load rhyme_songs.json (${err.message})`);
      }
    })();
    return () => { cancelled = true; };
  }, [open, songs, baseUrl]);

  const bumpFont = useCallback((delta) => {
    setLyricFont((prev) => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, prev + delta));
      try { localStorage.setItem(FONT_KEY, String(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); }
    setPlaying(false);
  }, []);

  const closeSheet = useCallback(() => {
    stop();
    setCurrent(null);
    setCurTime(0);
    setDuration(NaN);
  }, [stop]);

  const closeAll = useCallback(() => {
    stop();
    setCurrent(null);
    onClose?.();
  }, [stop, onClose]);

  // Reset when the modal is closed from outside.
  useEffect(() => {
    if (!open) { stop(); setCurrent(null); }
  }, [open, stop]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); } else { a.pause(); }
  }, []);

  // Esc closes the sheet (then the list); Space toggles playback.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        if (current) closeSheet(); else closeAll();
        return;
      }
      if (e.key === ' ' && current) {
        e.stopPropagation();
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, current, closeSheet, closeAll, toggle]);

  const openSong = (song) => {
    const a = audioRef.current;
    const next = audioUrl(song, baseUrl);
    setCurrent(song);
    setCurTime(0);
    setDuration(NaN);
    setSeekPos(0);
    setPlaying(false);
    if (a && a.getAttribute('src') !== next) {
      a.pause();
      a.setAttribute('src', next);
      a.load();
    }
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  if (!open) return null;

  const progress = draggingRef.current
    ? seekPos
    : (duration ? Math.round((curTime / duration) * 1000) || 0 : 0);
  const shownTime = draggingRef.current && duration ? (seekPos / 1000) * duration : curTime;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeAll(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: isDarkMode ? 'rgba(8,9,12,.72)' : 'rgba(30,30,34,.45)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
      }}
    >
      {/* Track list */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: paper, color: ink, fontFamily: serif, textAlign: 'left',
          border: `1px solid ${rule}`, borderRadius: 14,
          width: 'min(46rem, 100%)', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,.42)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${rule}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: accent }}>
              {songs ? `${songs.length} tracks · ${[...new Set(songs.map((s) => s.book))].join(', ')}` : 'Loading…'}
            </div>
            <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', lineHeight: 1.1, margin: '6px 0 0' }}>
              Bible Rhymes
            </h2>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: soft, margin: '7px 0 0', maxWidth: '34rem' }}>
              Chapters put through the rhyme pipeline, drafted into lyric sheets, and rendered as tracks.
              Pick one to play it and read what is being rapped.
            </p>
          </div>
          <button
            onClick={closeAll}
            aria-label="Close"
            style={{ flex: 'none', width: 32, height: 32, borderRadius: '50%', border: `1px solid ${rule}`, background: 'none', color: soft, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
          {loadError && (
            <p style={{ padding: '18px 20px', fontSize: 12.5, color: accent, margin: 0 }}>{loadError}</p>
          )}
          {!songs && !loadError && (
            <p style={{ padding: '18px 20px', fontSize: 12.5, color: soft, margin: 0 }}>Loading tracks…</p>
          )}
          {songs && songs.map((s) => {
            const active = current && current.n === s.n;
            return (
              <button
                key={s.n}
                onClick={() => openSong(s)}
                title={`Play ${s.title}`}
                style={{
                  width: '100%', display: 'grid', gridTemplateColumns: '2.2rem 1fr auto',
                  gap: '0 12px', alignItems: 'center', padding: '13px 20px',
                  background: active ? wash : 'none', border: 0, borderBottom: `1px solid ${rule}`,
                  textAlign: 'left', color: 'inherit', font: 'inherit', cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 12, color: active ? accent : soft, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                  {active ? '▶' : String(s.n).padStart(2, '0')}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: display, fontWeight: 700, fontSize: 17, letterSpacing: '-.012em', lineHeight: 1.2 }}>
                    {s.title}
                  </span>
                  <span style={{ display: 'block', fontFamily: mono, fontSize: 10.5, color: soft, marginTop: 4 }}>
                    {s.book} {s.ch} · {s.genre} · {s.beat} · {s.bars} lines
                  </span>
                </span>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: accent, background: wash, padding: '4px 7px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                  {s.ref}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Track sheet: lyrics + player */}
      {current && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeSheet(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            background: isDarkMode ? 'rgba(8,9,12,.6)' : 'rgba(30,30,34,.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={current.title}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: sheet, color: ink, fontFamily: serif, textAlign: 'left',
              border: `1px solid ${rule}`, borderRadius: 14,
              width: 'min(44rem, 100%)', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 14px 56px rgba(0,0,0,.5)', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 20px 12px', borderBottom: `1px solid ${rule}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: soft }}>
                  {`Track ${String(current.n).padStart(2, '0')} · ${current.ref} · ${current.dynamic}`}
                </span>
                <h3 style={{ fontFamily: display, fontWeight: 800, fontSize: 23, letterSpacing: '-.02em', lineHeight: 1.12, margin: '6px 0 0' }}>
                  {current.title}
                </h3>
              </div>
              <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => bumpFont(-1)}
                  disabled={lyricFont <= FONT_MIN}
                  aria-label="Smaller lyrics"
                  title={`Smaller lyrics (${lyricFont}px)`}
                  style={{ ...fontBtn, opacity: lyricFont <= FONT_MIN ? 0.4 : 1, cursor: lyricFont <= FONT_MIN ? 'default' : 'pointer' }}
                >
                  A<span style={{ fontSize: 11 }}>−</span>
                </button>
                <button
                  onClick={() => bumpFont(1)}
                  disabled={lyricFont >= FONT_MAX}
                  aria-label="Bigger lyrics"
                  title={`Bigger lyrics (${lyricFont}px)`}
                  style={{ ...fontBtn, opacity: lyricFont >= FONT_MAX ? 0.4 : 1, cursor: lyricFont >= FONT_MAX ? 'default' : 'pointer' }}
                >
                  A<span style={{ fontSize: 11 }}>+</span>
                </button>
                <button
                  onClick={closeSheet}
                  aria-label="Back to the track list"
                  style={{ marginLeft: 4, width: 32, height: 32, borderRadius: '50%', border: `1px solid ${rule}`, background: 'none', color: soft, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${rule}` }}>
              <button
                onClick={toggle}
                aria-label={playing ? 'Pause' : 'Play'}
                style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', border: 0, background: accent, color: sheet, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <input
                type="range"
                min="0"
                max="1000"
                value={progress}
                aria-label="Seek"
                onChange={(e) => { draggingRef.current = true; setSeekPos(Number(e.target.value)); }}
                onMouseUp={(e) => {
                  const a = audioRef.current;
                  if (a && duration) a.currentTime = (Number(e.target.value) / 1000) * duration;
                  draggingRef.current = false;
                }}
                onTouchEnd={(e) => {
                  const a = audioRef.current;
                  if (a && duration) a.currentTime = (seekPos / 1000) * duration;
                  draggingRef.current = false;
                }}
                style={{ flex: 1, minWidth: 0, accentColor: accent, height: 18 }}
              />
              <span style={{ fontFamily: mono, fontSize: 11, color: soft, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {fmt(shownTime)} / {fmt(duration)}
              </span>
            </div>

            <div ref={bodyRef} style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px 24px', WebkitOverflowScrolling: 'touch' }}>
              {current.why && (
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: soft, borderLeft: `2px solid ${accent}`, paddingLeft: 11, margin: '0 0 20px' }}>
                  <span style={{ display: 'block', fontFamily: mono, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: accent, marginBottom: 5 }}>
                    Why this arrangement
                  </span>
                  {current.why}
                </p>
              )}

              {current.sections.map((sec, i) => {
                const spoken = isSpoken(sec.label);
                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: 18,
                      ...(spoken ? { borderLeft: `2px solid ${rule}`, paddingLeft: 12 } : null),
                    }}
                  >
                    {sec.label && (
                      <h4 style={{ fontFamily: mono, fontWeight: 500, fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: accent, margin: '0 0 6px' }}>
                        {sec.label}
                      </h4>
                    )}
                    <p style={{ margin: 0, fontSize: lyricFont, lineHeight: 1.62, ...(spoken ? { fontStyle: 'italic', color: soft } : null) }}>
                      {sec.lines.map((ln, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <br />}
                          {ln}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                );
              })}

              {onOpenChapter && current.abbrev && (
                <button
                  onClick={() => { closeAll(); onOpenChapter(current.abbrev, current.ch); }}
                  style={{ fontFamily: mono, fontSize: 11, color: accent, background: wash, border: `1px solid ${accent}`, borderRadius: 4, padding: '7px 10px', cursor: 'pointer', marginTop: 4 }}
                >
                  Read {current.book} {current.ch} in Bible Rhyme →
                </button>
              )}

              <p style={{ fontFamily: mono, fontSize: 10, lineHeight: 1.6, color: soft, borderTop: `1px solid ${rule}`, paddingTop: 12, marginTop: 22, wordBreak: 'break-word' }}>
                Rhyme source: {current.source}{current.note ? `  —  ${current.note}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => { if (!draggingRef.current) setCurTime(e.currentTarget.currentTime); }}
        onEnded={() => { setPlaying(false); setCurTime(0); }}
      />
    </div>
  );
}
