import React, { useState, useEffect } from 'react';

function splitIntoChunks(verseText) {
  if (!verseText) return [];
  const raw = verseText.split(/(?<=[,;:.])/).map(s => s.trim()).filter(s => s.length > 0);
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
  // null = show verse picker; number = 0-based index of selected verse
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeChunk, setActiveChunk] = useState(null);

  const bg        = isDarkMode ? '#1e2235' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a4a2a' : '#1a1a1a';
  const border    = isDarkMode ? '#3a3f5c' : isSepiaMode ? '#c9b99a' : '#e5e7eb';
  const verseBg   = isDarkMode ? '#252840' : isSepiaMode ? '#ede0c8' : '#f9fafb';
  const closeBg   = isDarkMode ? '#444'    : isSepiaMode ? '#d4c9a8' : '#e5e7eb';
  const subText   = isDarkMode ? '#9ca3af' : isSepiaMode ? '#8a7a5a' : '#6b7280';
  const accent    = isDarkMode ? '#60a5fa' : '#2563eb';
  const hoverBg   = isDarkMode ? '#2d3148' : isSepiaMode ? '#e8ddc8' : '#f3f4f6';
  const activeBg  = isDarkMode ? '#1e3a5f' : '#dbeafe';

  const hasChapterVerses = chapterVerses && chapterVerses.length > 0;

  // Resolve the active verse text and label
  const activeVerseText = selectedIdx !== null && hasChapterVerses
    ? verseToString(chapterVerses[selectedIdx])
    : verseText;
  const activeVerseLabel = selectedIdx !== null && hasChapterVerses && bookName && chapter
    ? `${bookName} ${chapter}:${selectedIdx + 1}`
    : verseLabel;

  const chunks = splitIntoChunks(activeVerseText);

  const goToPrev = () => setSelectedIdx(i => Math.max(0, i - 1));
  const goToNext = () => setSelectedIdx(i => Math.min((chapterVerses?.length ?? 1) - 1, i + 1));

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      // If chapterVerses, start at picker; else go straight to verse view
      if (hasChapterVerses) {
        const idx = startVerseNumber ? startVerseNumber - 1 : null;
        setSelectedIdx(idx !== null ? Math.max(0, idx) : null);
      } else {
        setSelectedIdx(null);
      }
      setActiveChunk(null);
    }
  }, [open, startVerseNumber, hasChapterVerses]);

  // Reset chunk highlight when verse changes
  useEffect(() => { setActiveChunk(null); }, [selectedIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedIdx !== null && hasChapterVerses) { setSelectedIdx(null); } else { onClose(); }
        return;
      }
      if (selectedIdx !== null) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); return; }
        if (/^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (chunks[idx] !== undefined) {
            e.preventDefault();
            setActiveChunk(idx);
            speakText(chunks[idx]);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selectedIdx, hasChapterVerses, chunks, onClose]);

  if (!open) return null;

  const showPicker = selectedIdx === null && hasChapterVerses;

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
          padding: '12px 18px', borderBottom: `1px solid ${border}`, flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {selectedIdx !== null && hasChapterVerses && (
              <button
                onClick={goToPrev}
                disabled={selectedIdx <= 0}
                style={{
                  padding: '3px 8px', fontSize: '0.82rem', fontWeight: 700,
                  border: `1px solid ${border}`, borderRadius: 6,
                  background: hoverBg, color: selectedIdx <= 0 ? subText : textColor,
                  cursor: selectedIdx <= 0 ? 'default' : 'pointer', flexShrink: 0,
                  opacity: selectedIdx <= 0 ? 0.4 : 1,
                }}
                aria-label="Previous verse"
              >←</button>
            )}
            <h2 style={{
              margin: 0, fontSize: '0.98rem', fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {showPicker ? (bookName && chapter ? `${bookName} ${chapter}` : (verseLabel || 'Verses')) : activeVerseLabel}
            </h2>
            {selectedIdx !== null && hasChapterVerses && (
              <button
                onClick={goToNext}
                disabled={selectedIdx >= (chapterVerses?.length ?? 1) - 1}
                style={{
                  padding: '3px 8px', fontSize: '0.82rem', fontWeight: 700,
                  border: `1px solid ${border}`, borderRadius: 6,
                  background: hoverBg,
                  color: selectedIdx >= (chapterVerses?.length ?? 1) - 1 ? subText : textColor,
                  cursor: selectedIdx >= (chapterVerses?.length ?? 1) - 1 ? 'default' : 'pointer', flexShrink: 0,
                  opacity: selectedIdx >= (chapterVerses?.length ?? 1) - 1 ? 0.4 : 1,
                }}
                aria-label="Next verse"
              >→</button>
            )}
            {onOpenCommentary && selectedIdx !== null && (
              <button
                onClick={() => { onClose(); onOpenCommentary(); }}
                style={{
                  padding: '3px 9px', fontSize: '0.82rem', fontWeight: 600,
                  border: `1px solid ${border}`, borderRadius: 6,
                  background: hoverBg, color: textColor,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >Commentary</button>
            )}
          </div>

          {selectedIdx !== null ? (
            <button
              onClick={() => speakText(chunks.join(' '))}
              style={{
                padding: '3px 10px', fontSize: '0.82rem', fontWeight: 700,
                border: `1px solid ${border}`, borderRadius: 6,
                background: hoverBg, color: accent,
                cursor: 'pointer', flexShrink: 0,
              }}
              aria-label="Speak all chunks"
            >▶ All</button>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: 'none', borderRadius: 6,
                cursor: 'pointer', background: closeBg, color: textColor,
                fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}
              aria-label="Close"
            >✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 18px' }}>
          {showPicker ? (
            /* ── Verse picker ── */
            <>
              <p style={{
                margin: '0 0 10px', fontSize: '0.72rem', color: subText,
                textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
              }}>
                Choose a verse to memorize
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {chapterVerses.map((v, i) => {
                  const text = verseToString(v);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedIdx(i)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${border}`,
                        background: verseBg, color: textColor,
                        textAlign: 'left', width: '100%',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = verseBg; }}
                    >
                      <span style={{
                        fontWeight: 700, color: accent, fontSize: '0.82rem',
                        minWidth: 22, flexShrink: 0, paddingTop: 2,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ lineHeight: 1.5, fontSize: '0.88rem', textAlign: 'left', color: subText }}>
                        {text.slice(0, 70)}{text.length > 70 ? '…' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── Chunks view ── */
            <>
              <p style={{
                margin: '0 0 10px', fontSize: '0.72rem', color: subText,
                textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
              }}>
                Click or press 1–{Math.min(chunks.length, 9)} to hear a chunk · ←/→ for verses
              </p>
              {chunks.slice(0, 9).map((chunk, i) => (
                <div
                  key={i}
                  onClick={() => { setActiveChunk(i); speakText(chunk); }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
                    marginBottom: 4,
                    background: activeChunk === i ? activeBg : 'transparent',
                    border: activeChunk === i ? `1px solid ${accent}40` : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (activeChunk !== i) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeChunk === i ? activeBg : 'transparent'; }}
                >
                  <span style={{
                    fontWeight: 700, color: accent, minWidth: 18,
                    fontSize: '0.92rem', lineHeight: 1.7, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ lineHeight: 1.65, fontSize: '0.97rem' }}>{chunk}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
