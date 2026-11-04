import { useEffect, useRef, useState } from "react";

const MODEL = 'gpt-4.1-mini';
const CODE_KEY = 'tutor-access-code';
// On localhost the React dev server (3000) has no API, so use the Express server on 3001 (npm run server)
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api/tutor' : '/api/tutor';
const readCode = () => { try { return (localStorage.getItem(CODE_KEY) || '').trim(); } catch (e) { return ''; } };
const STARTERS = [
  'What is this verse saying?',
  'Help me sit with this verse',
  'What question should I ask God about it?',
  'How might I pray this?',
];

function systemPrompt(verseLabel, verseText, commentaryText) {
  return [
    'You are a gentle devotional companion helping the reader engage with Scripture.',
    'Stay close to the text: point to words and phrases in the verse, and cite verse numbers when you draw on other verses.',
    'Keep answers short (two or three brief paragraphs). Offer one reflective question or a short prayer prompt at the end, not a lecture.',
    'Clearly separate what the text says from your reflection, and say so when Christians disagree. Never invent verses or quotations.',
    `The reader is on ${verseLabel}:\n"${verseText}"`,
    commentaryText ? `A commentary note the reader has open (may help, may be skipped):\n${commentaryText.slice(0, 3000)}` : '',
  ].filter(Boolean).join('\n\n');
}

export default function DevotionalChat({
  open, onClose, verseLabel, verseText, commentaryText,
  bg, textColor, border, subText, selectBg,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codeDraft, setCodeDraft] = useState('');
  const [hasCode, setHasCode] = useState(() => !!readCode());
  const feedRef = useRef(null);

  // A new verse starts a fresh conversation
  useEffect(() => { setMessages([]); setError(''); }, [verseLabel]);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [messages]);

  if (!open) return null;

  const saveCode = () => {
    const k = codeDraft.trim();
    if (!k) return;
    try { localStorage.setItem(CODE_KEY, k); } catch (e) { /* ignore */ }
    setHasCode(true); setCodeDraft(''); setError('');
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    const accessCode = readCode();
    if (!accessCode) { setHasCode(false); return; }
    setError(''); setInput(''); setBusy(true);
    const history = [...messages, { role: 'user', content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode, model: MODEL,
          system: systemPrompt(verseLabel, verseText, commentaryText),
          messages: history.slice(-10).map((m) => ({ role: m.role, text: m.content })),
        }),
      });
      if (resp.status === 401) {
        try { localStorage.removeItem(CODE_KEY); } catch (e) { /* ignore */ }
        setHasCode(false); setMessages(messages);
        setError('Invalid access code. Enter it again.');
        return;
      }
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e?.error || `HTTP ${resp.status}`);
      }
      // The proxy streams the reply as plain text
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: acc }]);
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
      setMessages(history);
    } finally {
      setBusy(false);
    }
  };

  const pill = { background: selectBg, color: textColor, border: `1px solid ${border}`, borderRadius: 999, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: bg, color: textColor, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <strong style={{ fontSize: '0.9rem' }}>Devotional chat · {verseLabel}</strong>
        <button onClick={onClose} style={{ ...pill, borderRadius: 6 }}>Back to commentary</button>
      </div>

      {!hasCode ? (
        <div style={{ padding: 16 }}>
          <p style={{ marginTop: 0, fontSize: '0.9rem' }}>Enter the access code to chat. It is remembered in this browser.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveCode(); }}
              placeholder="Access code"
              style={{ flex: 1, background: selectBg, color: textColor, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 8px' }}
            />
            <button onClick={saveCode} style={pill}>Save</button>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
        </div>
      ) : (
        <>
          <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {messages.length === 0 && (
              <div>
                <p style={{ marginTop: 0, color: subText, fontSize: '0.9rem' }}>Slow down with this verse. Ask anything, or start here:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STARTERS.map((s) => <button key={s} onClick={() => send(s)} style={pill}>{s}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ margin: '0 0 12px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <span style={{ display: 'inline-block', maxWidth: '90%', textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '8px 12px', borderRadius: 10, background: m.role === 'user' ? selectBg : 'transparent', border: m.role === 'user' ? 'none' : `1px solid ${border}` }}>
                  {m.content || '…'}
                </span>
              </div>
            ))}
            {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <textarea
              value={input}
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              placeholder="Ask or reflect… (Enter to send)"
              style={{ flex: 1, resize: 'none', background: selectBg, color: textColor, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 8px', fontFamily: 'inherit' }}
            />
            <button onClick={() => send()} disabled={busy} style={{ ...pill, borderRadius: 6, opacity: busy ? 0.5 : 1 }}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}
