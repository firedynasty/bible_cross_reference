import React, { useState, useEffect, useRef, useCallback } from 'react';

const BOOK_ID_MAP = {
  gn: 'GEN', ex: 'EXO', lv: 'LEV', nm: 'NUM', dt: 'DEU',
  js: 'JOS', jud: 'JDG', rt: 'RUT', '1sm': '1SA', '2sm': '2SA',
  '1kgs': '1KI', '2kgs': '2KI', '1ch': '1CH', '2ch': '2CH',
  ezr: 'EZR', ne: 'NEH', et: 'EST', job: 'JOB', ps: 'PSA',
  prv: 'PRO', ec: 'ECC', so: 'SNG', is: 'ISA', jr: 'JER',
  lm: 'LAM', ez: 'EZK', dn: 'DAN', ho: 'HOS', jl: 'JOL',
  am: 'AMO', ob: 'OBA', jn: 'JON', mi: 'MIC', na: 'NAM',
  hk: 'HAB', zp: 'ZEP', hg: 'HAG', zc: 'ZEC', ml: 'MAL',
  mt: 'MAT', mk: 'MRK', lk: 'LUK', jo: 'JHN', act: 'ACT',
  rm: 'ROM', '1co': '1CO', '2co': '2CO', gl: 'GAL', eph: 'EPH',
  ph: 'PHP', cl: 'COL', '1ts': '1TH', '2ts': '2TH',
  '1tm': '1TI', '2tm': '2TI', tt: 'TIT', phm: 'PHM',
  hb: 'HEB', jm: 'JAS', '1pe': '1PE', '2pe': '2PE',
  '1jo': '1JN', '2jo': '2JN', '3jo': '3JN', jd: 'JUD', re: 'REV',
  ge: 'GEN',
};

const COMMENTARIES = [
  { id: 'john-gill',              name: 'John Gill' },
  { id: 'jamieson-fausset-brown', name: 'JFB' },
  { id: 'adam-clarke',            name: 'Adam Clarke' },
  { id: 'tyndale',                name: 'Tyndale' },
  { id: 'john-calvin',            name: 'John Calvin' },
  { id: 'keil-delitzsch',         name: 'Keil-Delitzsch (OT)' },
  { id: 'matthew-henry',          name: 'Matthew Henry' },
];

export default function FullChapterCommentaryModal({
  open, onClose,
  bookAbbrev, chapter, bookName,
  isDarkMode, isSepiaMode,
}) {
  const [selectedCommentary, setSelectedCommentary] = useState('john-gill');
  const [chapterContent, setChapterContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const saved = parseFloat(localStorage.getItem('fullChapterCommentaryFontSize'));
    return isNaN(saved) ? 0.93 : saved;
  });
  const bodyRef = useRef(null);
  const cacheRef = useRef({});

  const fetchChapter = useCallback(async () => {
    if (!bookAbbrev || !chapter) return;
    const bookId = BOOK_ID_MAP[bookAbbrev];
    if (!bookId) { setError('Book not mapped to commentary API.'); return; }

    const cacheKey = `${bookId}-${chapter}-${selectedCommentary}`;
    if (cacheRef.current[cacheKey]) {
      setChapterContent(cacheRef.current[cacheKey]);
      return;
    }

    setLoading(true);
    setError(null);
    setChapterContent(null);

    try {
      const url = `https://bible.helloao.org/api/c/${selectedCommentary}/${bookId}/${chapter}.json`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const content = json.chapter.content;
      cacheRef.current[cacheKey] = content;
      setChapterContent(content);
    } catch (e) {
      setError(`Commentary not available for this chapter. (${e.message})`);
    }
    setLoading(false);
  }, [bookAbbrev, chapter, selectedCommentary]);

  useEffect(() => {
    if (open) {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      fetchChapter();
    }
    if (!open) { setChapterContent(null); setError(null); }
  }, [open, fetchChapter]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'ArrowDown' || e.key === 's') && bodyRef.current) {
        e.preventDefault();
        bodyRef.current.scrollBy({ top: bodyRef.current.clientHeight * 0.8, behavior: 'smooth' });
      }
      if ((e.key === 'ArrowUp' || e.key === 'a') && bodyRef.current) {
        e.preventDefault();
        bodyRef.current.scrollBy({ top: -bodyRef.current.clientHeight * 0.8, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const verseEntries = chapterContent
    ? chapterContent.filter(item => item.type === 'verse')
    : [];

  const bg        = isDarkMode ? '#1e2235' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a4a2a' : '#1a1a1a';
  const border    = isDarkMode ? '#3a3f5c' : isSepiaMode ? '#c9b99a' : '#e5e7eb';
  const subText   = isDarkMode ? '#9ca3af' : isSepiaMode ? '#8a7a5a' : '#6b7280';
  const closeBg   = isDarkMode ? '#444'    : isSepiaMode ? '#d4c9a8' : '#e5e7eb';
  const selectBg  = isDarkMode ? '#2d3148' : isSepiaMode ? '#e8ddc8' : '#f3f4f6';
  const verseDivBg = isDarkMode ? '#252840' : isSepiaMode ? '#ede0c8' : '#f9fafb';
  const verseNumColor = isDarkMode ? '#60a5fa' : '#2563eb';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bg, color: textColor,
          borderRadius: 12, border: `1px solid ${border}`,
          width: '100%', maxWidth: 680,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0,
          gap: 8, flexWrap: 'wrap',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
            {bookName} {chapter} — Full Chapter Commentary
          </h2>
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

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', color: subText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Commentary
            </span>
            <select
              value={selectedCommentary}
              onChange={e => setSelectedCommentary(e.target.value)}
              style={{
                background: selectBg, color: textColor, border: `1px solid ${border}`,
                borderRadius: 6, padding: '4px 8px', fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              {COMMENTARIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setFontSize(s => { const n = Math.max(0.6, +(s - 0.1).toFixed(2)); localStorage.setItem('fullChapterCommentaryFontSize', n); return n; })}
              style={{ background: closeBg, color: textColor, border: 'none', borderRadius: 6, padding: '3px 9px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >A−</button>
            <button
              onClick={() => setFontSize(s => { const n = Math.min(2.0, +(s + 0.1).toFixed(2)); localStorage.setItem('fullChapterCommentaryFontSize', n); return n; })}
              style={{ background: closeBg, color: textColor, border: 'none', borderRadius: 6, padding: '3px 9px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
            >A+</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => bodyRef.current?.scrollBy({ top: bodyRef.current.clientHeight * 0.8, behavior: 'smooth' })}
            style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 10, fontSize: 18, background: isDarkMode ? '#2a2c30' : isSepiaMode ? '#f5efe0' : '#fff', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: isDarkMode ? '#93c5fd' : isSepiaMode ? '#7a5a2a' : '#2563eb', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', opacity: 0.35 }}
          >↓</button>
          <div ref={bodyRef} style={{ overflowY: 'auto', padding: '16px 20px 40px', flex: 1 }}>
            {loading && <p style={{ color: subText, fontSize: '0.9rem' }}>Loading...</p>}
            {error && !loading && <p style={{ color: isDarkMode ? '#f87171' : '#dc2626', fontSize: '0.9rem' }}>{error}</p>}
            {!loading && !error && verseEntries.length === 0 && chapterContent && (
              <p style={{ color: subText, fontSize: '0.9rem' }}>No commentary entries found for this chapter.</p>
            )}
            {verseEntries.map((entry, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <div style={{
                  display: 'inline-block', background: verseDivBg,
                  border: `1px solid ${border}`, borderRadius: 6,
                  padding: '2px 10px', marginBottom: 10,
                  fontSize: '0.82rem', fontWeight: 700, color: verseNumColor,
                }}>
                  Verse {entry.number}
                </div>
                {(entry.content || []).map((para, j) => (
                  <p key={j} style={{ margin: '0 0 12px', lineHeight: 1.8, fontSize: `${fontSize}rem` }}>
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
