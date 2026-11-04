import { useEffect } from "react";

const HINTS = [
  ['Navigation', [
    ['p / Space / PageDown / ↓', 'Page down (advances chapter at the bottom)'],
    ['o / PageUp', 'Page up'],
    ['x', 'Scroll down one line in pane 2'],
    ['z', 'Previous chapter'],
    [';', 'Next chapter'],
    ['q', 'Previous book'],
    ['[ / ]', 'Previous / next verse'],
    ['e', 'Go to a Bible reference'],
    ['v', 'Go to the chapter:verse on the clipboard'],
  ]],
  ['Modals', [
    ['m / c', 'Commentary for the top verse in pane 2'],
    ['u', 'Outline'],
    ['i', 'Intro'],
    ['w', 'Words'],
    ['y', 'YouTube'],
    ['Esc', 'Close the open modal'],
  ]],
  ['Audio & reading', [
    ['r', 'Play / pause the YouTube video'],
    ['t', 'Jump the video to the start of the chapter'],
    ['j', 'Read highlighted text aloud'],
    ['/', 'Toggle Read to End'],
    ["'", 'Speak the current book and chapter'],
  ]],
  ['Display', [
    ['d', 'Toggle dark mode'],
  ]],
];

export default function HintsModal({ open, onClose, isDarkMode, isSepiaMode }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const bg = isDarkMode ? '#1f2023' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const text = isDarkMode ? '#e5e7eb' : isSepiaMode ? '#4a3a1e' : '#1f2937';
  const sub = isDarkMode ? '#9ca3af' : isSepiaMode ? '#7a5a2a' : '#6b7280';
  const border = isDarkMode ? '#3a3c40' : isSepiaMode ? '#d9cba8' : '#e5e7eb';
  const keyBg = isDarkMode ? '#2a2c30' : isSepiaMode ? '#eadfc3' : '#f3f4f6';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: bg, color: text, border: `1px solid ${border}`, borderRadius: 10, width: 'min(520px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${border}` }}>
          <strong>Keyboard hints</strong>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: keyBg, color: text, fontWeight: 700 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 16px 16px' }}>
          {HINTS.map(([section, rows]) => (
            <div key={section} style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: sub, marginBottom: 4 }}>{section}</div>
              {rows.map(([k, d]) => (
                <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0', fontSize: '0.9rem' }}>
                  <code style={{ background: keyBg, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>{k}</code>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
