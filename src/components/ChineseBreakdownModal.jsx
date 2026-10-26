import React, { useState, useEffect, useRef } from 'react';

// Minimal quote-aware CSV parser (glosses like "empty, void" contain commas)
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// "Verse N,," header -> sentence row -> word rows, as produced by generate_chinese_breakdown_cli.py
function rowsToVerses(rows) {
  const verses = [];
  let current = null;
  rows.slice(1).forEach(([zh, pinyin, en]) => {
    if (/^Verse \d+$/.test(zh)) {
      current = { number: parseInt(zh.slice(6), 10), sentence: null, words: [] };
      verses.push(current);
    } else if (current && current.sentence === null) {
      current.sentence = zh;
    } else if (current) {
      current.words.push({ zh, pinyin, en });
    }
  });
  return verses;
}

// Speak Chinese text: lang 'zh-CN' = Mandarin, 'zh-HK' = Cantonese.
// Voice picking mirrors BibleApp.speakSelectedText (Google > Enhanced/Premium > exact lang > yue > any zh).
function speakChinese(text, lang, rate = 0.75) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    let v = voices.find(vv => vv.lang === lang && vv.name.includes('Google'));
    if (!v) v = voices.find(vv => vv.lang === lang && (vv.name.includes('Enhanced') || vv.name.includes('Premium')));
    if (!v) v = voices.find(vv => vv.lang === lang);
    if (!v && lang === 'zh-HK') v = voices.find(vv => vv.lang.startsWith('yue'));
    if (!v) v = voices.find(vv => vv.lang.startsWith('zh'));
    if (v) utt.voice = v;
  }
  // Chrome bug: speechSynthesis can get stuck in "speaking" state; delay after cancel() to clear it
  setTimeout(() => window.speechSynthesis.speak(utt), 50);
}

export default function ChineseBreakdownModal({
  open, onClose,
  bookName, chapter, startVerseNumber,
  isDarkMode, isSepiaMode,
  data, // preloaded chinese_breakdown.json: { "Genesis": { "1": [verses] } }
}) {
  const [chap, setChap] = useState(chapter);
  const [verses, setVerses] = useState([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | missing
  const [speechRate, setSpeechRate] = useState(0.75);
  const [fontScale, setFontScale] = useState(() => {
    try { return parseFloat(localStorage.getItem('chinese-breakdown-font-scale')) || 1; } catch { return 1; }
  });
  const scrollRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('chinese-breakdown-font-scale', String(fontScale)); } catch {}
  }, [fontScale]);

  // Chapter changes (←/→) jump back to the top of the scroll area
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [chap]);

  // Reset to the opening chapter/verse each time the modal opens
  useEffect(() => {
    if (open) { setChap(chapter); setIdx(Math.max(0, (startVerseNumber || 1) - 1)); }
  }, [open, chapter, startVerseNumber]);

  useEffect(() => {
    if (!open || !bookName || !chap) return;
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        let parsed;
        if (data) {
          parsed = data[bookName]?.[String(chap)] || [];
        } else {
          const slug = bookName.toLowerCase().replace(/\s+/g, '_');
          const res = await fetch(`/chinese_breakdown/${slug}/${slug}_${chap}.csv`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          parsed = rowsToVerses(parseCsv(await res.text()));
        }
        if (cancelled) return;
        if (!parsed.length) throw new Error('no verses for chapter');
        setVerses(parsed);
        setIdx(i => Math.min(i, parsed.length - 1));
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error(`Chinese breakdown not available for ${bookName} ${chap}:`, err);
        setVerses([]);
        setStatus('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [open, bookName, chap, data]);

  // ↑/↓ = verse, ←/→ = chapter, / = read verse in Mandarin, . = Cantonese, Esc = close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(verses.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setChap(c => c + 1); setIdx(0); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setChap(c => Math.max(1, c - 1)); setIdx(0); }
      else if (e.key === '/') { e.preventDefault(); speakChinese(verses[idx]?.sentence, 'zh-CN', speechRate); }
      else if (e.key === '.') { e.preventDefault(); speakChinese(verses[idx]?.sentence, 'zh-HK', speechRate); }
      else if (e.key === 'Escape') { e.preventDefault(); window.speechSynthesis?.cancel(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, verses, idx, speechRate, onClose]);

  // Stop any in-flight speech when the modal closes
  useEffect(() => {
    if (!open) window.speechSynthesis?.cancel();
  }, [open]);

  if (!open) return null;

  const bg = isDarkMode ? '#1e2235' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a4a2a' : '#1a1a1a';
  const border = isDarkMode ? '#3a3f5c' : isSepiaMode ? '#c9b99a' : '#e5e7eb';
  const subText = isDarkMode ? '#9ca3af' : isSepiaMode ? '#8a7a5a' : '#6b7280';
  const accent = isDarkMode ? '#60a5fa' : '#2563eb';
  const btnBg = isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e5e7eb';

  const verse = verses[idx];

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ background: bg, color: textColor }}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="font-semibold">
          {bookName} {chap}{verse ? `:${verse.number}` : ''}
          <span className="ml-2 text-xs font-normal" style={{ color: subText }}>
            ↑↓ verse · ←→ chapter · / 普 · . 粵
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontScale(s => Math.max(0.6, +(s - 0.1).toFixed(2)))}
            className="px-2 py-1 rounded text-sm font-semibold"
            style={{ background: btnBg, color: textColor }}
            title="Smaller text"
          >
            A−
          </button>
          <button
            onClick={() => setFontScale(s => Math.min(2, +(s + 0.1).toFixed(2)))}
            className="px-2 py-1 rounded text-sm font-semibold"
            style={{ background: btnBg, color: textColor }}
            title="Larger text"
          >
            A+
          </button>
          <select
            value={speechRate}
            onChange={e => setSpeechRate(parseFloat(e.target.value))}
            className="px-2 py-1 rounded text-sm"
            style={{ background: btnBg, color: textColor, border: `1px solid ${border}` }}
            title="Speech speed"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
          </select>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-sm font-semibold"
            style={{ background: btnBg, color: textColor }}
          >
            Close
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ zoom: fontScale }}>
        {status === 'loading' ? (
          <div style={{ color: subText }}>Loading...</div>
        ) : status === 'missing' ? (
          <div style={{ color: subText }}>
            No breakdown for {bookName} {chap} yet. Generate it with
            {' '}<code>python3 generate_chinese_breakdown_cli.py &quot;{bookName.replace(/\s+/g, '_')}&quot; {chap}</code>.
          </div>
        ) : (
          <>
            <div className="text-2xl leading-relaxed mb-4" style={{ color: accent }}>{verse.sentence}</div>
            <table className="w-full text-left">
              <tbody>
                {verse.words.map((w, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${border}` }}>
                    <td className="py-2 pr-3 text-xl whitespace-nowrap">{w.zh}</td>
                    <td
                      className="py-2 pr-3 whitespace-nowrap"
                      style={{ color: accent, cursor: 'pointer' }}
                      title={`Read aloud: ${w.zh}`}
                      onClick={() => speakChinese(w.zh, 'zh-CN', speechRate)}
                    >{w.pinyin}</td>
                    <td className="py-2" style={{ color: subText }}>{w.en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="px-3 py-1 rounded text-sm disabled:opacity-40"
                style={{ background: btnBg, color: textColor }}
              >
                ↑ Prev verse
              </button>
              <button
                onClick={() => setIdx(i => Math.min(verses.length - 1, i + 1))}
                disabled={idx === verses.length - 1}
                className="px-3 py-1 rounded text-sm disabled:opacity-40"
                style={{ background: btnBg, color: textColor }}
              >
                ↓ Next verse
              </button>
              <span className="ml-auto self-center text-xs" style={{ color: subText }}>
                {idx + 1} / {verses.length}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
