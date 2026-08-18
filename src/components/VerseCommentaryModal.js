import { useEffect, useState, useCallback, useRef } from "react";

// Maps app book abbreviations → HelloAO API book IDs
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
};

const MHC_SLUGS = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers', DEU: 'deuteronomy',
  JOS: 'joshua', JDG: 'judges', RUT: 'ruth',
  '1SA': '1_samuel', '2SA': '2_samuel', '1KI': '1_kings', '2KI': '2_kings',
  '1CH': '1_chronicles', '2CH': '2_chronicles',
  EZR: 'ezra', NEH: 'nehemiah', EST: 'esther', JOB: 'job', PSA: 'psalms',
  PRO: 'proverbs', ECC: 'ecclesiastes', SNG: 'songs', ISA: 'isaiah',
  JER: 'jeremiah', LAM: 'lamentations', EZK: 'ezekiel', DAN: 'daniel',
  HOS: 'hosea', JOL: 'joel', AMO: 'amos', OBA: 'obadiah', JON: 'jonah',
  MIC: 'micah', NAM: 'nahum', HAB: 'habakkuk', ZEP: 'zephaniah',
  HAG: 'haggai', ZEC: 'zechariah', MAL: 'malachi',
  MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john', ACT: 'acts',
  ROM: 'romans', '1CO': '1_corinthians', '2CO': '2_corinthians',
  GAL: 'galatians', EPH: 'ephesians', PHP: 'philippians', COL: 'colossians',
  '1TH': '1_thessalonians', '2TH': '2_thessalonians',
  '1TI': '1_timothy', '2TI': '2_timothy', TIT: 'titus', PHM: 'philemon',
  HEB: 'hebrews', JAS: 'james', '1PE': '1_peter', '2PE': '2_peter',
  '1JN': '1_john', '2JN': '2_john', '3JN': '3_john', JUD: 'jude',
  REV: 'revelation',
};

const COMMENTARIES = [
  { id: 'john-gill',            name: 'John Gill' },
  { id: 'jamieson-fausset-brown', name: 'JFB' },
  { id: 'adam-clarke',          name: 'Adam Clarke' },
  { id: 'tyndale',              name: 'Tyndale' },
  { id: 'john-calvin',          name: 'John Calvin' },
  { id: 'keil-delitzsch',       name: 'Keil-Delitzsch (OT)' },
  { id: 'matthew-henry',        name: 'Matthew Henry' },
];

export default function VerseCommentaryModal({
  open, onClose,
  verseLabel, verseText,
  bookAbbrev, chapter, verseNumber,
  totalVerses, onNavigateVerse,
  isDarkMode, isSepiaMode,
}) {
  const [selectedCommentary, setSelectedCommentary] = useState('john-gill');
  const [fontSize, setFontSize] = useState(0.93);
  const [commentary, setCommentary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Cache: "bookId-chapter-commentaryId" → chapter content array
  const cacheRef = useRef({});
  const bodyRef = useRef(null);

  const fetchCommentary = useCallback(async (abbrev, ch, verse, commentaryId) => {
    const bookId = BOOK_ID_MAP[abbrev];
    if (!bookId) {
      setError('Book not mapped to HelloAO API.');
      return;
    }

    const cacheKey = `${bookId}-${ch}-${commentaryId}`;
    let chapterContent = cacheRef.current[cacheKey];

    if (!chapterContent) {
      setLoading(true);
      setError(null);
      setCommentary(null);
      try {
        const url = `https://bible.helloao.org/api/c/${commentaryId}/${bookId}/${ch}.json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        chapterContent = json.chapter.content;
        cacheRef.current[cacheKey] = chapterContent;
      } catch (e) {
        setError(`Commentary not available for this passage. (${e.message})`);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    // Find the verse entry — some commentaries group ranges under first verse
    let best = null;
    for (const item of chapterContent) {
      if (item.type === 'verse' && item.number <= verse) {
        best = item;
      } else if (item.type === 'verse' && item.number > verse) {
        break;
      }
    }

    if (!best) {
      setError('No entry found for this verse in the selected commentary.');
      setCommentary(null);
    } else {
      setError(null);
      setCommentary({ paragraphs: best.content, startVerse: best.number });
    }
  }, []);

  useEffect(() => {
    if (open && bookAbbrev && chapter && verseNumber) {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      fetchCommentary(bookAbbrev, chapter, verseNumber, selectedCommentary);
    }
  }, [open, bookAbbrev, chapter, verseNumber, selectedCommentary, fetchCommentary]);

  useEffect(() => {
    if (!open) {
      setCommentary(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bg          = isDarkMode ? '#1e2235' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor   = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a4a2a' : '#1a1a1a';
  const border      = isDarkMode ? '#3a3f5c' : isSepiaMode ? '#c9b99a' : '#e5e7eb';
  const subText     = isDarkMode ? '#9ca3af' : isSepiaMode ? '#8a7a5a' : '#6b7280';
  const verseBg     = isDarkMode ? '#252840' : isSepiaMode ? '#ede0c8' : '#f9fafb';
  const closeBg     = isDarkMode ? '#444'    : isSepiaMode ? '#d4c9a8' : '#e5e7eb';
  const selectBg    = isDarkMode ? '#2d3148' : isSepiaMode ? '#e8ddc8' : '#f3f4f6';

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
      aria-label={verseLabel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg, color: textColor,
          borderRadius: 12, border: `1px solid ${border}`,
          width: '100%', maxWidth: 640,
          maxHeight: '84vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onNavigateVerse?.(verseNumber - 1)}
              disabled={!verseNumber || verseNumber <= 1}
              style={{
                width: 28, height: 28, border: `1px solid ${border}`, borderRadius: 6,
                cursor: verseNumber > 1 ? 'pointer' : 'default',
                background: closeBg, color: verseNumber > 1 ? textColor : subText,
                fontWeight: 700, fontSize: 14, opacity: verseNumber > 1 ? 1 : 0.4,
              }}
              aria-label="Previous verse"
            >‹</button>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{verseLabel}</h2>
            <button
              onClick={() => onNavigateVerse?.(verseNumber + 1)}
              disabled={!totalVerses || verseNumber >= totalVerses}
              style={{
                width: 28, height: 28, border: `1px solid ${border}`, borderRadius: 6,
                cursor: (totalVerses && verseNumber < totalVerses) ? 'pointer' : 'default',
                background: closeBg, color: (totalVerses && verseNumber < totalVerses) ? textColor : subText,
                fontWeight: 700, fontSize: 14, opacity: (totalVerses && verseNumber < totalVerses) ? 1 : 0.4,
              }}
              aria-label="Next verse"
            >›</button>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              cursor: 'pointer', background: closeBg, color: textColor,
              fontWeight: 700, fontSize: 14,
            }}
            aria-label="Close"
          >✕</button>
        </div>

        {/* Verse text */}
        <div style={{
          padding: '12px 20px', borderBottom: `1px solid ${border}`,
          background: verseBg, flexShrink: 0,
        }}>
          <p style={{ margin: 0, lineHeight: 1.7, fontSize: '0.95rem', fontStyle: 'italic' }}>
            {verseText}
          </p>
        </div>

        {/* Commentary selector + font size */}
        <div style={{
          padding: '8px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', color: subText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Commentary
            </span>
            <select
              value={selectedCommentary}
              onChange={(e) => setSelectedCommentary(e.target.value)}
              style={{
                background: selectBg, color: textColor, border: `1px solid ${border}`,
                borderRadius: 6, padding: '4px 8px', fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              {COMMENTARIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(() => {
              const bookId = BOOK_ID_MAP[bookAbbrev];
              const slug = bookId && MHC_SLUGS[bookId];
              if (!slug) return null;
              const href = `https://biblehub.com/commentaries/mhc/${slug}/${chapter}.htm`;
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: selectBg, color: textColor, border: `1px solid ${border}`,
                    borderRadius: 6, padding: '4px 9px', fontSize: '0.82rem',
                    fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  MHC ↗
                </a>
              );
            })()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setFontSize(s => Math.max(0.6, +(s - 0.1).toFixed(2)))}
              style={{
                background: closeBg, color: textColor, border: 'none', borderRadius: 6,
                padding: '3px 9px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}
              aria-label="Decrease font size"
            >A−</button>
            <button
              onClick={() => setFontSize(s => Math.min(2.0, +(s + 0.1).toFixed(2)))}
              style={{
                background: closeBg, color: textColor, border: 'none', borderRadius: 6,
                padding: '3px 9px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              }}
              aria-label="Increase font size"
            >A+</button>
          </div>
        </div>

        {/* Scrollable commentary body */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => { if (bodyRef.current) bodyRef.current.scrollBy({ top: bodyRef.current.clientHeight * 0.8, behavior: 'smooth' }); }}
            style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 10, fontFamily: 'inherit', fontSize: 18, background: isDarkMode ? '#2a2c30' : isSepiaMode ? '#f5efe0' : '#fff', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: isDarkMode ? '#93c5fd' : isSepiaMode ? '#7a5a2a' : '#2563eb', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', opacity: 0.35 }}
          >↓</button>
          <button
            onClick={() => { if (bodyRef.current) bodyRef.current.scrollBy({ top: -56, behavior: 'smooth' }); }}
            style={{ position: 'absolute', bottom: 60, left: 14, zIndex: 10, fontFamily: 'inherit', fontSize: 18, background: isDarkMode ? '#2a2c30' : isSepiaMode ? '#f5efe0' : '#fff', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: isDarkMode ? '#93c5fd' : isSepiaMode ? '#7a5a2a' : '#2563eb', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', opacity: 0.35 }}
          >↑</button>
        <div ref={bodyRef} style={{ overflowY: 'auto', padding: '16px 20px', flexGrow: 1 }}>
          {loading && (
            <p style={{ color: subText, fontSize: '0.9rem' }}>Loading...</p>
          )}
          {error && !loading && (
            <p style={{ color: isDarkMode ? '#f87171' : '#dc2626', fontSize: '0.9rem' }}>{error}</p>
          )}
          {commentary && !loading && (
            <>
              {commentary.startVerse !== verseNumber && (
                <p style={{ color: subText, fontSize: '0.78rem', marginTop: 0, marginBottom: 12 }}>
                  (Entry covers from verse {commentary.startVerse})
                </p>
              )}
              {commentary.paragraphs.map((para, i) => (
                <p key={i} style={{ marginTop: 0, marginBottom: 14, lineHeight: 1.8, fontSize: `${fontSize}rem` }}>
                  {para}
                </p>
              ))}
            </>
          )}
          {totalVerses > 0 && verseNumber < totalVerses && (
            <button
              onClick={() => onNavigateVerse?.(verseNumber + 1)}
              style={{
                display: 'block', marginTop: 24, marginBottom: 8,
                marginLeft: -6,
                fontFamily: 'inherit', fontSize: 17, background: 'none',
                border: `1px solid ${border}`, borderRadius: 4,
                padding: '6px 18px', cursor: 'pointer',
                color: isDarkMode ? '#9ca3af' : isSepiaMode ? '#7a5a2a' : '#6b7280',
              }}
            >Next Verse ›</button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
