import React, { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Parse all Bible chapter:verse references out of a line of text.
 * Returns array of { start, end, chapter, verse, displayText, refInner }
 *
 * Recognises (inside parens):
 *   (1:1–2:3)   → chapter 1, verse 1,  display "1:1–2:3"
 *   (3:1–4:17)  → chapter 3, verse 1,  display "3:1–4:17"
 *   (11:10–26)  → chapter 11, verse 10, display "11:10–26"
 *   (1:1)       → chapter 1, verse 1,  display "1:1"
 */
function parseLineRefs(line) {
  // Matches (ch:v–ch:v), (ch:v–v), (ch:v)
  const RE = /\((\d+):(\d+)(?:[–\-]\d+(?::\d+)?)?\)/g;
  const refs = [];
  let m;
  while ((m = RE.exec(line)) !== null) {
    const inner = m[0].slice(1, -1); // strip outer parens
    refs.push({
      start: m.index,
      end: m.index + m[0].length,
      chapter: parseInt(m[1], 10),
      verse: parseInt(m[2], 10),
      displayText: m[0],     // "(1:1–2:3)"
      refInner: inner,       // "1:1–2:3"  — shown in toast
    });
  }
  return refs;
}

/**
 * Render a single line of intro text, turning chapter refs into clickable spans.
 */
function IntroLine({ line, bookAbbrev, bookName, onNavigate, isDarkMode }) {
  if (!line.trim()) return <div style={{ height: 8 }} />;

  const refs = parseLineRefs(line);
  if (refs.length === 0) {
    return (
      <div style={{ marginBottom: 2, lineHeight: 1.6 }}>
        {line}
      </div>
    );
  }

  // Build interleaved text + clickable spans
  const parts = [];
  let pos = 0;
  for (const ref of refs) {
    if (ref.start > pos) {
      parts.push(<span key={`t${pos}`}>{line.slice(pos, ref.start)}</span>);
    }
    // Full ref string like "Genesis 1:1" so navigateToRefWithHighlight can scroll to the verse
    const fullRef = `${bookName} ${ref.chapter}:${ref.verse}`;
    parts.push(
      <span
        key={`r${ref.start}`}
        onClick={() => onNavigate(fullRef, ref.refInner)}
        style={{
          color: isDarkMode ? '#93c5fd' : '#1d4ed8',
          cursor: 'pointer',
          fontWeight: 600,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          padding: '0 1px',
          borderRadius: 2,
        }}
        title={`Go to ${ref.refInner}`}
      >
        {ref.displayText}
      </span>
    );
    pos = ref.end;
  }
  if (pos < line.length) {
    parts.push(<span key={`t${pos}`}>{line.slice(pos)}</span>);
  }

  // Indent detection: leading spaces/tabs
  const indent = line.match(/^(\s+)/)?.[1]?.length ?? 0;

  return (
    <div style={{ marginBottom: 2, lineHeight: 1.6, paddingLeft: indent * 6 }}>
      {parts}
    </div>
  );
}

export default function BibleIntroModal({
  bookAbbrev,
  bookName,
  introText,
  isDarkMode,
  isSepiaMode,
  onClose,
  // onNavigate(fullRef, refInner)
  //   fullRef  = "Genesis 2:4"  → passed to navigateToRefWithHighlight
  //   refInner = "2:4–25"       → shown in toast
  onNavigate,
  scrollRef,
  initialScrollTop,
}) {
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(13);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Restore scroll position and focus on mount
  useEffect(() => {
    containerRef.current?.focus();
    if (initialScrollTop && containerRef.current) {
      containerRef.current.scrollTop = initialScrollTop;
    }
  }, [initialScrollTop]);

  const bg = isDarkMode ? '#1e1e1e' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor = isDarkMode ? '#e0e0e0' : '#222';
  const borderColor = isDarkMode ? '#444' : '#d1d5db';

  const lines = (introText || '').split('\n');

  const handleNavigate = useCallback((fullRef, refInner) => {
    onNavigate(fullRef, refInner);
    onClose();
  }, [onNavigate, onClose]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.55)', zIndex: 10000,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={(el) => { containerRef.current = el; if (scrollRef) scrollRef.current = el; }}
        tabIndex={-1}
        style={{
          background: bg,
          borderRadius: 16,
          padding: '20px 24px',
          width: '90%',
          maxWidth: 560,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          color: textColor,
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#111', flexShrink: 0 }}>
            {bookName} — Introduction
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setFontSize(s => Math.max(9, s - 1))}
              style={{ background: isDarkMode ? '#444' : '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: isDarkMode ? '#e0e0e0' : '#333', padding: '2px 6px', fontWeight: 'bold' }}
              title="Decrease font size"
            >A−</button>
            <button
              onClick={() => setFontSize(s => Math.min(24, s + 1))}
              style={{ background: isDarkMode ? '#444' : '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: isDarkMode ? '#e0e0e0' : '#333', padding: '2px 6px', fontWeight: 'bold' }}
              title="Increase font size"
            >A+</button>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: isDarkMode ? '#aaa' : '#666', lineHeight: 1,
                padding: '2px 6px', borderRadius: 4,
              }}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Hint */}
        <div style={{
          fontSize: 11, color: isDarkMode ? '#666' : '#aaa',
          marginBottom: 12, fontStyle: 'italic',
          borderBottom: `1px solid ${borderColor}`, paddingBottom: 8,
        }}>
          Click a reference <span style={{ color: isDarkMode ? '#93c5fd' : '#1d4ed8', fontWeight: 600 }}>(1:1–2:3)</span> to navigate to that chapter
        </div>

        {/* Content */}
        {introText === null ? (
          <div style={{ color: isDarkMode ? '#888' : '#999', fontStyle: 'italic', fontSize: 13 }}>
            Loading…
          </div>
        ) : introText ? (
          <div style={{ fontSize: fontSize, lineHeight: 1.7 }}>
            {lines.map((line, i) => (
              <IntroLine
                key={i}
                line={line}
                bookAbbrev={bookAbbrev}
                bookName={bookName}
                onNavigate={handleNavigate}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: isDarkMode ? '#888' : '#999', fontStyle: 'italic', fontSize: 13 }}>
            No introduction available for this book.
          </div>
        )}
      </div>
    </div>
  );
}
