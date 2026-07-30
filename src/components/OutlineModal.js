import React, { useMemo, useState, useRef, useEffect } from 'react';

// ── Sentence machinery ──────────────────────────────────────────────────────
const ABBR_MARK = '\x01';

function protectAbbrevs(text) {
  let t = text.replace(
    /\b(Mr|Mrs|Dr|St|etc|vs|No|Jr|Sr|Messrs|Inc|Corp|Ltd|Co|Bros|Sen|Rep|Gov|Gen|Rev|Hon|Prof|Ave|Dept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./g,
    (_, g) => g + ABBR_MARK
  );
  t = t.replace(/\b([ie])\. ?([ge])\./gi, (_, g1, g2) => g1 + ABBR_MARK + g2 + ABBR_MARK);
  t = t.replace(/\b([A-Z])\./g, (_, g) => g + ABBR_MARK);
  return t;
}

function splitSentences(para) {
  const t = protectAbbrevs(para);
  const RE = /[.?!]+["\u2019\u201d')\]]*\s+/g;
  const out = [];
  let pos = 0, m;
  while ((m = RE.exec(t)) !== null) {
    const end = m.index + m[0].length;
    const seg = t.slice(pos, end).trim();
    const nxt = t[end] || '';
    if (seg && (!nxt || /[A-Z]/.test(nxt) || '"\u2018\u2019\u201c\u201d\'(0123456789'.includes(nxt))) {
      out.push(seg);
      pos = end;
    }
  }
  const last = t.slice(pos).trim();
  if (last) out.push(last);
  return out.map(s => s.replace(/\x01/g, '.')).filter(s => s.trim());
}

const STOPWORDS = new Set(['their','there','which','would','could','should','about',
  'these','those','thing','things','people','every','being','because','before',
  'after','other','another','between','that','this','with','from','have','been',
  'were','what','when','where','they','them','then','than','some','into']);

function contentWords(text) {
  const ws = new Set();
  for (const w of (text.toLowerCase().match(/[a-z]{4,}/g) || [])) {
    if (!STOPWORDS.has(w)) ws.add(w);
  }
  return ws;
}

function setIntersects(a, b) {
  for (const v of a) if (b.has(v)) return true;
  return false;
}

const ANAPHORA_RE = /^(?:sometimes|often|usually|always|now|here|there|also|still|even|yes|no)?\s*(this|that|these|those|it|its|he|she|they|and|indeed|nor|neither|either|the same|such|so much|at any rate|in fact|anyway|none of us|we all|all of us|you and i)\b/i;

function stripOpener(sent) {
  return sent.replace(/^["\u2018\u2019\u201c\u201d(\[\]… ]+/, '');
}

const Q = '"\'\u2018\u2019\u201c\u201d';
const _HEDGE = '(?:\\s+(?:now|then|here|also|again|really|simply|just|merely|usually|normally|generally|originally|properly|strictly|literally|roughly|nowadays|today|[a-z]+ly)){0,3}';
const _DEF_MEANS_RE = new RegExp(
  '^\\s*(?<subj>[' + Q + '][^' + Q + ']{1,40}[' + Q + ']' +
  '|the\\s+(?:word|term|name|phrase|expression)\\s+[' + Q + ']?[\\w-]{1,30}[' + Q + ']?' +
  '|[A-Za-z][\\w-]{1,30}[' + Q + ']' +
  '|[A-Za-z][A-Za-z-]{1,30})' +
  _HEDGE +
  '\\s+mean(?:s|t)\\b\\s*(?<obj>.*)$', 'i'
);
const BAD_SUBJ = new Set(['i','he','she','we','they','you','who','one','someone','somebody',
  'anyone','everyone','everybody','nobody','that','this','these','those','there','what',
  'which','god','christ','jesus','man','people','no']);
const BAD_OBJ_RE = /^(?:that\b|to\b|of\b|as\b|for\b|in\b|with\b|by\b|from\b|(?:i|he|she|we|they|you|it|there|one)\b|(?:both|well|business|mischief|harm|so|otherwise|nothing|everything|anything)\b)/i;

function isDefinition(sentence) {
  const m = _DEF_MEANS_RE.exec(sentence.trim());
  if (!m) return false;
  const subj = m.groups.subj.trim();
  const core = subj.replace(new RegExp('[' + Q + ']', 'g'), '').toLowerCase();
  const mentioned = Q.includes(subj[0]) || Q.includes(subj[subj.length - 1]) || core.includes(' ');
  if (!mentioned && BAD_SUBJ.has(core)) return false;
  const obj = (m.groups.obj || '').replace(/^[\s,;:\u2014-]+/, '');
  if (BAD_OBJ_RE.test(obj)) return false;
  return true;
}

// ── Theology tagger ─────────────────────────────────────────────────────────
const TAG_RULES = [
  ['concession', /^(of course|no doubt|doubtless|admittedly|it is true|certainly|to be sure|i know|i admit|you may (?:say|think|ask|object|feel)|some (?:people|one|of you) (?:may |might |will )?(?:say|think|ask|object|feel)|it may be (?:said|thought|urged|objected)|we (?:may|might) be told|it is (?:often|sometimes) (?:said|thought))/i],
  ['example', /^(for example|for instance|take |think of |consider |suppose, for example)/i],
  ['analogy', /^(just as|it is as if|as if|imagine|suppose|like |similarly|in the same way)/i],
  ['contrast', /^((?:so )?far from|but|however|yet\b|nevertheless|none the less|nonetheless|still\b|on the other hand|on the contrary|whereas|while\b(?!\s+it\s+is\s+true)|conversely|in contrast|at the same time)/i],
  ['evidence', /^(because|for\b|since\b|after all|the reason|in fact|as a matter of fact|the fact (?:is|remains)|we know|it is a fact|that is (?:the reason|why we know))/i],
  ['qualification', /^(?:now\s+)?(if\b|unless|provided|although|though\b|even if|even though|when\b|whenever|as long as|so long as|as far as|so far as|while it is true|only\b)/i],
  ['consequence', /^(therefore|thus|hence|consequently|accordingly|so\b(?!\s+(?:long|far|much|many|great|be\b))|then\b|it follows|which means|that is why|the result is|and so|in that case)/i],
  ['restatement', /^(that is\b|in other words|i mean|or rather|namely|again\b|to put it (?:another way|differently)|put another way|(?:first|firstly|second|secondly|third|thirdly|fourth|fourthly|fifth|finally|lastly|next\b)[,.\)])/i],
  ['definition', /^(by .{1,40} i mean|what (?:do )?(?:we|i) mean|let me (?:define|explain)|i am using|we mean by|i mean by)/i],
];

function tagSentence(sent) {
  const s = stripOpener(sent);
  for (const [tag, rx] of TAG_RULES) {
    if (rx.test(s)) return tag;
  }
  return null;
}

// ── Tree node ────────────────────────────────────────────────────────────────
class OutlineNode {
  constructor(text, tag = null) {
    this.text = text;
    this.tag = tag;
    this.children = [];
  }
}

// ── Outliner ─────────────────────────────────────────────────────────────────
function outlineChapter(paragraphs) {
  const roots = [];
  for (const para of paragraphs) {
    const sents = splitSentences(para);
    if (!sents.length) continue;
    const claim = new OutlineNode(sents[0]);
    roots.push(claim);
    let prev = claim, prevDepth = 1;
    const deferredDefs = [];
    const heavyQuote = sents.filter(s => s[0] === '"' || s[0] === '\u201c').length >= Math.max(2, sents.length >> 1);
    for (const s of sents.slice(1)) {
      const stripped = stripOpener(s);
      let tag = tagSentence(s);
      if (heavyQuote && !tag) tag = 'example';
      if (tag) {
        const node = new OutlineNode(s, tag);
        claim.children.push(node);
        prev = node; prevDepth = 2;
        continue;
      }
      const ow = contentWords(s);
      const prevText = prev.text.trimEnd();
      if (prevText[prevText.length - 1] === ':') {
        const node = new OutlineNode(s, 'example');
        const parent = prevDepth < 4 ? prev : claim;
        parent.children.push(node);
        prev = node; prevDepth = Math.min(prevDepth + 1, 4);
      } else if (isDefinition(stripped)) {
        const node = new OutlineNode(s, 'definition');
        deferredDefs.push(node);
        prev = node; prevDepth = 2;
      } else if (ANAPHORA_RE.test(stripped) || setIntersects(ow, contentWords(prev.text)) || setIntersects(ow, contentWords(claim.text))) {
        const node = new OutlineNode(s, 'restatement');
        const parent = (prev !== claim && prevDepth < 4) ? prev : claim;
        parent.children.push(node);
        prev = node; prevDepth = Math.min((parent === prev ? prevDepth : 1) + 1, 4);
      } else {
        roots.push(new OutlineNode(s, null));
        prev = claim; prevDepth = 1;
      }
    }
    claim.children.push(...deferredDefs);
  }
  return roots;
}

// ── Tag colours ──────────────────────────────────────────────────────────────
const TAG_STYLES = {
  evidence:      { bg: '#e2efe0', color: '#3c7a3c' },
  definition:    { bg: '#ece2f0', color: '#6d4a8a' },
  qualification: { bg: '#f7e8d4', color: '#a05a16' },
  example:       { bg: '#dcefee', color: '#2c7a76' },
  analogy:       { bg: '#ddeaf5', color: '#2e6da4' },
  concession:    { bg: '#f5dddd', color: '#a03a3a' },
  consequence:   { bg: '#dfe3f5', color: '#3a4aa0' },
  contrast:      { bg: '#fbe9d5', color: '#b3641a' },
  restatement:   { bg: '#eceae4', color: '#6b675c' },
};

const INDENT_TAGS = new Set(['qualification', 'consequence', 'contrast']);

// ── React tree renderer ──────────────────────────────────────────────────────
function OutlineNodeEl({ node, showTags }) {
  const ts = node.tag ? TAG_STYLES[node.tag] : null;
  const extraIndent = node.tag && INDENT_TAGS.has(node.tag) ? 16 : 0;
  return (
    <li style={{ margin: '4px 0', lineHeight: 1.55, position: 'relative', paddingLeft: 16, marginLeft: extraIndent }}>
      <span style={{ position: 'absolute', left: 0, top: '0.65em', width: 5, height: 5, borderRadius: '50%', background: '#b9b2a2', display: 'inline-block' }} />
      {node.text}
      {showTags && node.tag && ts && (
        <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '1px 5px', borderRadius: 9, marginLeft: 6, background: ts.bg, color: ts.color, whiteSpace: 'nowrap' }}>
          [{node.tag}]
        </span>
      )}
      {node.children.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, paddingLeft: 22 }}>
          {node.children.map((child, i) => (
            <OutlineNodeEl key={i} node={child} showTags={showTags} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── AI outline parser ────────────────────────────────────────────────────────
function parseAIOutline(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const roots = [];
  const stack = []; // [{node, depth}]

  for (const line of lines) {
    const spaces = (line.match(/^(\s*)/) || ['', ''])[1].length;
    const depth = Math.floor(spaces / 2);
    const m = line.trim().match(/^-\s+(\S+)\s+\[([^\]]+)\]\s+(.*)/);
    if (!m) continue;
    const [, addr, rawTag, text] = m;
    // strip compound claim prefix for display tag
    const tag = rawTag === '--' ? null : rawTag.replace(/^claim\+/, '');
    const node = new OutlineNode(`${addr}  ${text}`, tag);

    if (depth === 0) {
      roots.push(node);
      stack.length = 0;
      stack.push({ node, depth: 0 });
    } else {
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
      const parent = stack.length > 0 ? stack[stack.length - 1].node : null;
      if (parent) parent.children.push(node); else roots.push(node);
      stack.push({ node, depth });
    }
  }
  return roots;
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function OutlineModal({ verses, bookName, chapter, totalChapters, onPrevChapter, onNextChapter, onClose, isDarkMode, kjvContentRef, precomputedOutline, suppressEscape }) {
  const [showTags, setShowTags] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [fz, setFz] = useState(() => {
    try { return parseFloat(localStorage.getItem('outline-fz')) || 1.0; } catch (e) { return 1.0; }
  });
  const [writeValue, setWriteValue] = useState('');
  const [copied, setCopied] = useState(false);
  const treeRef = useRef(null);

  // Keyboard navigation: Escape closes, ArrowLeft/Right navigate chapters
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !suppressEscape) {
        e.preventDefault();
        onClose();
        return;
      }
      // Arrow chapter nav — skip when the write input has focus (it handles its own)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        if (chapter > 1) { e.preventDefault(); onPrevChapter(); if (treeRef.current) treeRef.current.scrollTop = 0; }
      } else if (e.key === 'ArrowRight') {
        if (chapter < totalChapters) { e.preventDefault(); onNextChapter(); if (treeRef.current) treeRef.current.scrollTop = 0; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, suppressEscape, chapter, totalChapters, onPrevChapter, onNextChapter]);

  // Build one "paragraph" per verse — no verse numbers
  const paragraphs = useMemo(() => {
    if (!verses || !verses.length) return [];
    return verses
      .map(v => {
        const text = typeof v === 'string' ? v : (v.text || v.verse || String(v));
        return text.trim();
      })
      .filter(p => p);
  }, [verses]);

  const aiRoots = useMemo(() => {
    if (!precomputedOutline?.outline) return null;
    return parseAIOutline(precomputedOutline.outline);
  }, [precomputedOutline]);

  const autoRoots = useMemo(() => outlineChapter(paragraphs), [paragraphs]);

  const roots = (useAI && aiRoots) ? aiRoots : autoRoots;

  const bg = isDarkMode ? '#1a1c20' : '#faf8f3';
  const textColor = isDarkMode ? '#e8e4db' : '#2b2b2b';
  const borderColor = isDarkMode ? '#3a3a4a' : '#e3e0d8';
  const accentColor = isDarkMode ? '#a08060' : '#7a5c2e';
  const overlayBg = isDarkMode ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.6)';
  const navBtnStyle = (disabled) => ({
    fontFamily: 'inherit', fontSize: 13, background: 'none', border: `1px solid ${borderColor}`,
    borderRadius: 4, padding: '2px 10px', cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#aaa' : accentColor, opacity: disabled ? 0.4 : 1,
  });

  function handleWriteKeyDown(e) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (chapter < totalChapters) { onNextChapter(); if (treeRef.current) treeRef.current.scrollTop = 0; }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (chapter > 1) { onPrevChapter(); if (treeRef.current) treeRef.current.scrollTop = 0; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const el = treeRef.current;
      if (!el) return;
      el.scrollBy({ top: el.clientHeight - 60, behavior: 'smooth' });
    }
  }

  function handleModalKeyDown(e) {
    if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (!text) return;
      e.preventDefault();
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en-US') && (v.name.includes('Enhanced') || v.name.includes('Premium'))) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en')) || null;
      if (voice) utt.voice = voice;
      window.speechSynthesis.speak(utt);
    }
  }

  function handleCopy() {
    if (!writeValue) return;
    try {
      navigator.clipboard.writeText(writeValue).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch (e) {}
  }

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: overlayBg, zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16, overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: bg, color: textColor, borderRadius: 10, width: '92%', maxWidth: 820, maxHeight: '96vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', fontFamily: "Georgia, 'Times New Roman', serif", overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: accentColor, fontWeight: 700, letterSpacing: '0.05em' }}>OUTLINE</span>
          {aiRoots && (
            <button
              onClick={() => setUseAI(v => !v)}
              style={{ fontFamily: 'monospace', fontSize: 10, padding: '2px 7px', borderRadius: 9, border: 'none', cursor: 'pointer', background: useAI ? accentColor : (isDarkMode ? '#3a3a4a' : '#e3e0d8'), color: useAI ? '#fff' : (isDarkMode ? '#aaa' : '#666'), fontWeight: 700, letterSpacing: '0.04em' }}
              title={useAI ? 'Showing AI outline — click for auto' : 'Showing auto outline — click for AI'}
            >{useAI ? 'AI' : 'AUTO'}</button>
          )}
          {/* Prev / chapter title / Next */}
          <button onClick={() => { onPrevChapter(); if (treeRef.current) treeRef.current.scrollTop = 0; }} disabled={chapter <= 1} style={navBtnStyle(chapter <= 1)}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{bookName} {chapter}</span>
          <button onClick={() => { onNextChapter(); if (treeRef.current) treeRef.current.scrollTop = 0; }} disabled={chapter >= totalChapters} style={navBtnStyle(chapter >= totalChapters)}>›</button>

          {/* Write input — ← → navigate chapters, Tab scrolls pane */}
          <input
            type="text"
            value={writeValue}
            onChange={(e) => setWriteValue(e.target.value)}
            onKeyDown={handleWriteKeyDown}
            placeholder="write… ←→ chapter · tab scroll"
            style={{
              flex: 1, minWidth: 160, fontFamily: 'inherit', fontSize: 20,
              padding: '4px 10px', border: `1px solid ${borderColor}`, borderRadius: 4,
              background: isDarkMode ? '#0d0f12' : '#2b2b2b', color: isDarkMode ? '#e8e4db' : '#f0ece3',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCopy}
            style={{ fontFamily: 'inherit', fontSize: 12, background: 'none', border: `1px solid ${borderColor}`, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: copied ? '#3c7a3c' : accentColor, whiteSpace: 'nowrap' }}
          >
            {copied ? '✓ copied' : 'Copy'}
          </button>

          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setFz(f => { const n = Math.max(0.7, +(f - 0.1).toFixed(2)); try { localStorage.setItem('outline-fz', n); } catch (e) {} return n; })} style={{ fontFamily: 'inherit', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: accentColor, padding: '2px 2px' }}>A−</button>
            <button onClick={() => setFz(f => { const n = Math.min(2.0, +(f + 0.1).toFixed(2)); try { localStorage.setItem('outline-fz', n); } catch (e) {} return n; })} style={{ fontFamily: 'inherit', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: accentColor, padding: '2px 2px' }}>A+</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
          </span>
        </div>

        {/* Tree */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div ref={treeRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 28px 32px', fontSize: `${fz}rem`, textAlign: 'left' }}>
            {roots.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>No verses to outline.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {roots.map((node, i) => (
                  <OutlineNodeEl key={i} node={node} showTags={showTags} />
                ))}
              </ul>
            )}
          </div>
          <button
            title="Page down"
            onClick={() => treeRef.current?.scrollBy({ top: treeRef.current.clientHeight - 60, behavior: 'smooth' })}
            style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgb(0,0,0)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.15'}
          >
            <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
