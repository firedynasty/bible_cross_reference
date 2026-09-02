import React, { useState, useEffect, useRef } from 'react';

/**
 * Parse a song .txt file into sections.
 * Sections are separated by one or more blank lines.
 * The first line of a section is used as the title if it ends with ':' or is wrapped in [].
 * Otherwise sections are auto-numbered.
 */
export function parseSongTxt(text) {
  if (!text) return [];
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const firstLine = lines[0];
    const isHeader = /:\s*$/.test(firstLine) || /^\[.+\]$/.test(firstLine);
    if (isHeader) {
      return {
        title: firstLine.replace(/:\s*$/, '').replace(/^\[|\]$/g, ''),
        lines: lines.slice(1),
      };
    }
    return {
      title: `Section ${i + 1}`,
      lines,
    };
  }).filter(Boolean);
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

export default function SongMemorizeModal({
  open, onClose,
  sections, songTitle,
  isDarkMode, isSepiaMode,
}) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeLineIdx, setActiveLineIdx] = useState(null);
  const inputRef = useRef(null);
  const [inputVal, setInputVal] = useState('');

  const bg        = isDarkMode ? '#1e2235' : isSepiaMode ? '#f5efe0' : '#ffffff';
  const textColor = isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a4a2a' : '#1a1a1a';
  const border    = isDarkMode ? '#3a3f5c' : isSepiaMode ? '#c9b99a' : '#e5e7eb';
  const verseBg   = isDarkMode ? '#252840' : isSepiaMode ? '#ede0c8' : '#f9fafb';
  const closeBg   = isDarkMode ? '#444'    : isSepiaMode ? '#d4c9a8' : '#e5e7eb';
  const subText   = isDarkMode ? '#9ca3af' : isSepiaMode ? '#8a7a5a' : '#6b7280';
  const accentBlue = isDarkMode ? '#60a5fa' : '#2563eb';
  const activeLineBg = isDarkMode ? '#1e3a5f' : '#dbeafe';
  const hoverBg   = isDarkMode ? '#2d3148' : isSepiaMode ? '#e8ddc8' : '#f3f4f6';
  const sidebarBg = isDarkMode ? '#16192a' : isSepiaMode ? '#ede5d0' : '#f3f4f6';
  const activeSectionBg = isDarkMode ? '#2a2f4a' : isSepiaMode ? '#ddd0b8' : '#e0e7ff';

  const activeSection = sections[activeSectionIdx] || { title: '', lines: [] };

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setActiveSectionIdx(0);
      setActiveLineIdx(null);
      setInputVal('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Reset active line when section changes
  useEffect(() => {
    setActiveLineIdx(null);
  }, [activeSectionIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.target === inputRef.current) return;
      if (e.key === 'Escape') { onClose(); return; }
      // 1-9 speak lines
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key) - 1;
        const line = activeSection.lines[idx];
        if (line) {
          e.preventDefault();
          setActiveLineIdx(idx);
          speakText(line);
        }
      }
      // ArrowRight / ArrowDown — next section
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSectionIdx(i => Math.min(i + 1, sections.length - 1));
      }
      // ArrowLeft / ArrowUp — prev section
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSectionIdx(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, activeSection, sections, onClose]);

  if (!open) return null;

  const handleLineClick = (line, i) => {
    setActiveLineIdx(i);
    speakText(line);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputVal.trim();
      if (!val) return;
      const n = parseInt(val);
      if (!isNaN(n) && n >= 1 && n <= activeSection.lines.length) {
        setActiveLineIdx(n - 1);
        speakText(activeSection.lines[n - 1]);
      } else {
        setActiveLineIdx(null);
        speakText(val);
      }
      setInputVal('');
    }
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
      aria-label={songTitle}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bg, color: textColor,
          borderRadius: 12, border: `1px solid ${border}`,
          width: '100%', maxWidth: 680,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0, gap: 8,
        }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>♪ {songTitle}</h2>
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

        {/* Body: sidebar + content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Section sidebar */}
          <div style={{
            width: 150, flexShrink: 0,
            background: sidebarBg,
            borderRight: `1px solid ${border}`,
            overflowY: 'auto',
            padding: '8px 0',
          }}>
            <p style={{
              margin: '0 10px 6px', fontSize: '0.68rem', color: subText,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>Sections</p>
            {sections.map((sec, i) => (
              <div
                key={i}
                onClick={() => setActiveSectionIdx(i)}
                style={{
                  padding: '7px 12px', cursor: 'pointer', fontSize: '0.82rem',
                  fontWeight: activeSectionIdx === i ? 700 : 400,
                  background: activeSectionIdx === i ? activeSectionBg : 'transparent',
                  color: activeSectionIdx === i ? (isDarkMode ? '#93c5fd' : '#1d4ed8') : textColor,
                  borderLeft: activeSectionIdx === i ? `3px solid ${accentBlue}` : '3px solid transparent',
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => { if (activeSectionIdx !== i) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { e.currentTarget.style.background = activeSectionIdx === i ? activeSectionBg : 'transparent'; }}
              >
                {sec.title}
              </div>
            ))}
          </div>

          {/* Active section content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Section title */}
            <div style={{
              padding: '10px 18px', borderBottom: `1px solid ${border}`,
              background: verseBg, flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeSection.title}</span>
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: subText }}>
                {activeSection.lines.length} line{activeSection.lines.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Lines */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 18px' }}>
              <p style={{
                margin: '0 0 8px', fontSize: '0.72rem', color: subText,
                textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
              }}>
                Click or press 1–{Math.min(activeSection.lines.length, 9)} to hear a line · ←/→ for sections
              </p>
              {activeSection.lines.map((line, i) => (
                <div
                  key={i}
                  onClick={() => handleLineClick(line, i)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                    marginBottom: 3,
                    background: activeLineIdx === i ? activeLineBg : 'transparent',
                    border: activeLineIdx === i ? `1px solid ${accentBlue}30` : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (activeLineIdx !== i) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeLineIdx === i ? activeLineBg : 'transparent'; }}
                >
                  {i < 9 && (
                    <span style={{ fontWeight: 700, color: accentBlue, minWidth: 16, fontSize: '0.88em', lineHeight: 1.7, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                  )}
                  <span style={{ lineHeight: 1.65, fontSize: '0.95em' }}>{line}</span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 18px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type 1–9 + Enter to speak a line, or any text + Enter"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: '0.88rem',
                  border: `1px solid ${border}`, borderRadius: 8,
                  background: verseBg, color: textColor,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
