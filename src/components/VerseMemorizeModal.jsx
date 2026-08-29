import React, { useState, useEffect, useRef } from 'react';

function splitIntoChunks(verseText) {
  if (!verseText) return [];
  const raw = verseText.split(/(?<=[,;:])/).map(s => s.trim()).filter(s => s.length > 0);
  return raw.length > 1 ? raw : [verseText];
}

function speakText(text) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Enhanced') || v.name.includes('Premium'))) ||
    voices.find(v => v.lang.startsWith('en-US')) ||
    voices.find(v => v.lang.startsWith('en'));
  if (voice) utt.voice = voice;
  window.speechSynthesis.speak(utt);
}

function verseToString(v) {
  if (!v) return '';
  return typeof v === 'string' ? v : (v.text || v.verse || String(v));
}

export default function VerseMemorizeModal({
  open, onClose,
  verseLabel, verseText,
  bookName, chapter, startVerseNumber,
  chapterVerses,
  onOpenCommentary,
  isDarkMode, isSepiaMode,
}) {
  const [activeIdx, setActiveIdx] = useState(0);   // 0-based index into chapterVerses
  const [showPicker, setShowPicker] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [activeChunk, setActiveChunk] = useState(null);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Derive active verse text & label
  const hasChapterVerses = chapterVerses && chapterVerses.length > 0;
  const activeVerseText = hasChapterVerses
    ? verseToString(chapterVerses[activeIdx])
    : verseText;
  const activeVerseLabel = hasChapterVerses && bookName && chapter
    ? `${bookName} ${chapter}:${activeIdx + 1}`
    : verseLabel;

  const chunks = splitIntoChunks(activeVerseText);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      const idx = startVerseNumber ? startVerseNumber - 1 : 0;
      setActiveIdx(idx);
      setShowPicker(false);
      setInputVal('');
      setActiveChunk(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, startVerseNumber]);

  // Scroll picker to active verse
  useEffect(() => {
    if (showPicker && pickerRef.current) {
      const el = pickerRef.current.querySelector(`[data-idx="${activeIdx}"]`);
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, [showPicker, activeIdx]);

  // Reset chunks when verse changes
  useEffect(() => {
    setActiveChunk(null);
  }, [activeIdx]);

  // Keyboard: 1-9 speaks chunks, Escape closes
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.target === inputRef.current) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (!showPicker && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (chunks[idx]) {
          e.preventDefault();
          setActiveChunk(idx);
          speakText(chunks[idx]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, chunks, onClose, showPicker]);

  if (!open) return null;

  const bg         = isDarkMode ? '#1e2235' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor  = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a4a2a' : '#1a1a1a';
  const border     = isDarkMode ? '#3a3f5c' : isSepiaMode ? '#c9b99a' : '#e5e7eb';
  const verseBg    = isDarkMode ? '#252840' : isSepiaMode ? '#ede0c8' : '#f9fafb';
  const closeBg    = isDarkMode ? '#444'    : isSepiaMode ? '#d4c9a8' : '#e5e7eb';
  const subText    = isDarkMode ? '#9ca3af' : isSepiaMode ? '#8a7a5a' : '#6b7280';
  const accentBlue = isDarkMode ? '#60a5fa' : '#2563eb';
  const chunkActiveBg = isDarkMode ? '#1e3a5f' : '#dbeafe';
  const hoverBg    = isDarkMode ? '#2d3148' : isSepiaMode ? '#e8ddc8' : '#f3f4f6';

  const btnBase = {
    display: 'inline-flex', alignItems: 'center',
    border: `1px solid ${border}`, borderRadius: 6,
    padding: '4px 9px', fontSize: '0.82rem',
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  };

  const handleChunkClick = (chunk, i) => {
    setActiveChunk(i);
    speakText(chunk);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputVal.trim();
      if (!val) return;
      const n = parseInt(val);
      if (!isNaN(n) && n >= 1 && n <= chunks.length) {
        setActiveChunk(n - 1);
        speakText(chunks[n - 1]);
      } else {
        setActiveChunk(null);
        speakText(val);
      }
      setInputVal('');
    }
  };

  const selectVerse = (i) => {
    setActiveIdx(i);
    setShowPicker(false);
    setInputVal('');
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={activeVerseLabel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bg, color: textColor,
          borderRadius: 12, border: `1px solid ${border}`,
          width: '100%', maxWidth: 540,
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{activeVerseLabel}</h2>
            {onOpenCommentary && (
              <button
                onClick={() => { onClose(); onOpenCommentary(); }}
                style={{ ...btnBase, background: hoverBg, color: textColor }}
              >
                Commentary
              </button>
            )}
            {hasChapterVerses && (
              <button
                onClick={() => setShowPicker(v => !v)}
                style={{
                  ...btnBase,
                  background: showPicker
                    ? (isDarkMode ? '#1e3a5f' : '#dbeafe')
                    : (isDarkMode ? '#2d3148' : isSepiaMode ? '#dde8c8' : '#dbeafe'),
                  color: isDarkMode ? '#93c5fd' : isSepiaMode ? '#3a5a2a' : '#1d4ed8',
                  border: `1px solid ${isDarkMode ? '#2d5a8f' : isSepiaMode ? '#b9c9a8' : '#bfdbfe'}`,
                }}
              >
                {showPicker ? 'Back' : 'Full Chapter'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              cursor: 'pointer', background: closeBg, color: textColor,
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}
            aria-label="Close"
          >✕</button>
        </div>

        {showPicker ? (
          /* ── Verse picker ── */
          <div
            ref={pickerRef}
            style={{ overflowY: 'auto', flex: 1, padding: '8px 12px' }}
          >
            <p style={{
              margin: '4px 8px 8px', fontSize: '0.72rem', color: subText,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>
              {bookName} {chapter} — {chapterVerses.length} verses
            </p>
            {chapterVerses.map((v, i) => {
              const text = verseToString(v);
              const isActive = i === activeIdx;
              return (
                <div
                  key={i}
                  data-idx={i}
                  onClick={() => selectVerse(i)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                    marginBottom: 2,
                    background: isActive ? chunkActiveBg : 'transparent',
                    border: isActive ? `1px solid ${accentBlue}40` : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? chunkActiveBg : 'transparent'; }}
                >
                  <span style={{ fontWeight: 700, color: accentBlue, minWidth: 22, fontSize: '0.88em', lineHeight: 1.7, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ lineHeight: 1.6, fontSize: '0.88em', color: isActive ? textColor : subText }}>
                    {text.length > 80 ? text.slice(0, 80) + '…' : text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Full verse text */}
            <div style={{
              padding: '12px 20px', borderBottom: `1px solid ${border}`,
              background: verseBg, flexShrink: 0,
            }}>
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: '0.97em', fontStyle: 'italic', fontWeight: 600 }}>
                {activeVerseText}
              </p>
            </div>

            {/* Chunks list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 20px' }}>
              <p style={{
                margin: '0 0 8px', fontSize: '0.72rem', color: subText,
                textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
              }}>
                Click or press 1–{Math.min(chunks.length, 9)} to hear a chunk
              </p>
              {chunks.slice(0, 9).map((chunk, i) => (
                <div
                  key={i}
                  onClick={() => handleChunkClick(chunk, i)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                    marginBottom: 3,
                    background: activeChunk === i ? chunkActiveBg : 'transparent',
                    border: activeChunk === i ? `1px solid ${accentBlue}30` : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (activeChunk !== i) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeChunk === i ? chunkActiveBg : 'transparent'; }}
                >
                  <span style={{ fontWeight: 700, color: accentBlue, minWidth: 16, fontSize: '0.92em', lineHeight: 1.7 }}>
                    {i + 1}
                  </span>
                  <span style={{ lineHeight: 1.65, fontSize: '0.95em' }}>{chunk}</span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type 1–9 + Enter for a chunk, or any text + Enter to speak"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: '0.88rem',
                  border: `1px solid ${border}`, borderRadius: 8,
                  background: verseBg, color: textColor,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
