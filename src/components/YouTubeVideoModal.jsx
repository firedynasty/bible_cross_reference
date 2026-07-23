import React, { useState, useEffect, useRef } from 'react';
import youtubeChapterTimestamps from '../data/youtubeChapterTimestamps';

// Map book abbreviations to YouTube playlist video IDs
// Playlist: https://www.youtube.com/playlist?list=PLyH3jcNYnj_vee7HfFWgGmcW2E3qdsHLi
// index=2 is Genesis, index=67 is Revelation
const bookVideoIds = {
  'gn': 'OgFT_IxwJJY', 'ge': 'OgFT_IxwJJY',
  'ex': 'sdQHiRtzCg8',
  'lv': 'SUmk8OCjlqQ',
  'nm': 'G-4ukdNJERw',
  'dt': 'dlIpwsb9hNY',
  'js': '6Oza6-YNN4o',
  'jud': '38wEZJfHhY8',
  'rt': 'KzZFteHKudE',
  '1sm': '9yiTuqhwbyM',
  '2sm': 'CnffHJCDZPM',
  '1kgs': 'ZJyRYTvrGCg',
  '2kgs': '0w32hHs4CwY',
  '1ch': '5lw_e0hLH2U',
  '2ch': 'bWpL1q45VqY',
  'ezr': '3McAVeaPZhw',
  'ne': 'nnbAsyF3LfA',
  'et': 'WVtz1yaj1AU',
  'job': '3xjKCAPjxpg',
  'ps': 'YeKppPL-Emo',
  'prv': 'lMLCM9ULM14',
  'ec': '4me89GgHM6Y',
  'so': 'hsIQO6Ctzg8',
  'is': 'XyFpmO3IMHM',
  'jr': 'iF77Ea1rIAI',
  'lm': 'QDlxE1p70_4',
  'ez': 'kdJGnhGas1E',
  'dn': 'FPHy934L-5w',
  'ho': 'P65WjjJMFac',
  'jl': 'LZXTRvwJA9o',
  'am': 'dJaAxIQJ_tU',
  'ob': '9Ta9q7KZIEE',
  'jn': 'wc6KSJPG65s',
  'mi': '7N04imaXvWg',
  'na': 'svD3XgEdnts',
  'hk': 'BNEbM7W8zHM',
  'zp': '3K2-Pjh5G3U',
  'hg': 'ViNrre6UEAc',
  'zc': '7aGCrAWCsc4',
  'ml': 'UTbbxqp02pA',
  'mt': 'iHvCzDGgvuQ',
  'mk': 'KHr4ieXipLM',
  'lk': 'ytMSvm58CTY',
  'jo': 'az3iXhXglfY',
  'act': 'vDQXqeylVfM',
  'rm': 'o91Jp1JENtw',
  '1co': 'R9aK4Rkw7rk',
  '2co': 'XQa4K2Iwrfo',
  'gl': 'R1mZN4ZBoUQ',
  'eph': 'XFV4HeoFi7E',
  'ph': 'a41E5a_yVKs',
  'cl': 'Q-lSo0p1FZc',
  '1ts': 'aUSm_NdbQmI',
  '2ts': 'OANdoaZiLx8',
  '1tm': 'hBFsKx31DCY',
  '2tm': '50LE1CCqL30',
  'tt': '-q-jj_zq6tM',
  'phm': 'MQ8zkcBMUYY',
  'hb': 'TUfi0s3XV48',
  'jm': 'nl8walYshqc',
  '1pe': 'kEIlIB7Lqlk',
  '2pe': 'k68QL_h8h94',
  '1jo': 'I896_FOzFQw',
  '2jo': 'G_zfXhuZLKg',
  '3jo': 'uCkHp_88Sqk',
  'jd': 'GP8sGeUsPvA',
  're': '_MwOTnyQ0XA',
};

const bookFullNames = {
  'gn': 'Genesis', 'ge': 'Genesis', 'ex': 'Exodus', 'lv': 'Leviticus', 'nm': 'Numbers', 'dt': 'Deuteronomy',
  'js': 'Joshua', 'jud': 'Judges', 'rt': 'Ruth', '1sm': '1 Samuel', '2sm': '2 Samuel',
  '1kgs': '1 Kings', '2kgs': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
  'ezr': 'Ezra', 'ne': 'Nehemiah', 'et': 'Esther', 'job': 'Job', 'ps': 'Psalms',
  'prv': 'Proverbs', 'ec': 'Ecclesiastes', 'so': 'Song of Solomon', 'is': 'Isaiah',
  'jr': 'Jeremiah', 'lm': 'Lamentations', 'ez': 'Ezekiel', 'dn': 'Daniel',
  'ho': 'Hosea', 'jl': 'Joel', 'am': 'Amos', 'ob': 'Obadiah', 'jn': 'Jonah',
  'mi': 'Micah', 'na': 'Nahum', 'hk': 'Habakkuk', 'zp': 'Zephaniah', 'hg': 'Haggai',
  'zc': 'Zechariah', 'ml': 'Malachi', 'mt': 'Matthew', 'mk': 'Mark', 'lk': 'Luke',
  'jo': 'John', 'act': 'Acts', 'rm': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
  'gl': 'Galatians', 'eph': 'Ephesians', 'ph': 'Philippians', 'cl': 'Colossians',
  '1ts': '1 Thessalonians', '2ts': '2 Thessalonians', '1tm': '1 Timothy', '2tm': '2 Timothy',
  'tt': 'Titus', 'phm': 'Philemon', 'hb': 'Hebrews', 'jm': 'James', '1pe': '1 Peter',
  '2pe': '2 Peter', '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', 'jd': 'Jude',
  're': 'Revelation',
};

export function getYouTubeVideoId(bookAbbrev) {
  return bookVideoIds[bookAbbrev] || null;
}

// --- YouTube IFrame API loader ---
let ytApiPromise = null;
function loadYTApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// --- localStorage helpers ---
const STORAGE_KEY = 'youtube-video-times';

function getSavedTime(bookAbbrev) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data[bookAbbrev] || 0;
  } catch { return 0; }
}

function saveTime(bookAbbrev, seconds) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    data[bookAbbrev] = seconds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function YouTubeVideoModal({ open, onClose, bookAbbrev, currentChapter, onPlayingChange, onChapterChange }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(100);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const bookAbbrevRef = useRef(bookAbbrev);
  const activeBookRef = useRef(null);
  const chapterSeekDone = useRef(null); // track which chapter we already seeked to
  const currentChapterRef = useRef(currentChapter);
  const onChapterChangeRef = useRef(onChapterChange);

  useEffect(() => { bookAbbrevRef.current = bookAbbrev; }, [bookAbbrev]);
  useEffect(() => { currentChapterRef.current = currentChapter; }, [currentChapter]);
  useEffect(() => { onChapterChangeRef.current = onChapterChange; }, [onChapterChange]);

  // Seek to chapter timestamp when modal opens with a chapter that has timestamp data
  // If exact chapter is missing, decrement until we find one
  useEffect(() => {
    if (!open || !playerRef.current || !bookAbbrev || !currentChapter) return;
    const seekKey = `${bookAbbrev}-${currentChapter}`;
    if (chapterSeekDone.current === seekKey) return;
    const bookTimestamps = youtubeChapterTimestamps[bookAbbrev];
    if (!bookTimestamps) return;
    let ch = currentChapter;
    while (ch >= 1 && bookTimestamps[ch] == null) { ch--; }
    if (ch < 1) return;
    const ts = bookTimestamps[ch];
    try {
      // Skip the seek if the video is already inside this chapter's time range
      // (avoids rewinding when the reading pane auto-followed the video here)
      const curT = playerRef.current.getCurrentTime();
      const later = Object.keys(bookTimestamps).map(Number)
        .filter(n => n > ch && bookTimestamps[n] != null)
        .sort((a, b) => a - b);
      const rangeEnd = later.length > 0 ? bookTimestamps[later[0]] : Infinity;
      if (curT >= ts && curT < rangeEnd) {
        chapterSeekDone.current = seekKey;
        return;
      }
    } catch {}
    try {
      playerRef.current.seekTo(ts, true);
      setCurrentTime(ts);
      saveTime(bookAbbrev, ts);
      chapterSeekDone.current = seekKey;
    } catch {}
  }, [open, playerReady, bookAbbrev, currentChapter]);

  // Reset chapter seek tracking when modal closes
  useEffect(() => {
    if (!open) { chapterSeekDone.current = null; }
  }, [open]);

  // Focus the header when the modal opens so the window-level keyboard
  // shortcuts (volume/speed) work immediately without clicking
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (headerRef.current) headerRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // Press 0 to reset video to beginning while modal is open
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === ' ' && playerRef.current) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const state = playerRef.current.getPlayerState();
          if (state === 1) playerRef.current.pauseVideo();
          else playerRef.current.playVideo();
        } catch {}
      }
      if (e.key === '0' && playerRef.current) {
        try {
          playerRef.current.seekTo(0, true);
          setCurrentTime(0);
          saveTime(bookAbbrevRef.current, 0);
        } catch {}
      }
      if (e.key === '1' && playerRef.current) {
        try {
          const t = Math.max(0, playerRef.current.getCurrentTime() - 180);
          playerRef.current.seekTo(t, true);
          setCurrentTime(t);
          saveTime(bookAbbrevRef.current, t);
        } catch {}
      }
      if (e.key === '2' && playerRef.current) {
        try {
          const t = Math.max(0, playerRef.current.getCurrentTime() - 60);
          playerRef.current.seekTo(t, true);
          setCurrentTime(t);
          saveTime(bookAbbrevRef.current, t);
        } catch {}
      }
      if (e.key === '3' && playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime() + 60;
          playerRef.current.seekTo(t, true);
          setCurrentTime(t);
          saveTime(bookAbbrevRef.current, t);
        } catch {}
      }
      if (e.key === ',' && playerRef.current) {
        try {
          const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          const cur = playerRef.current.getPlaybackRate();
          const idx = rates.indexOf(cur);
          const next = rates[Math.max(0, idx - 1)];
          playerRef.current.setPlaybackRate(next);
          setPlaybackRate(next);
        } catch {}
      }
      if (e.key === '.' && playerRef.current) {
        try {
          const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          const cur = playerRef.current.getPlaybackRate();
          const idx = rates.indexOf(cur);
          const next = rates[Math.min(rates.length - 1, idx + 1)];
          playerRef.current.setPlaybackRate(next);
          setPlaybackRate(next);
        } catch {}
      }
      if (e.key === '-' && playerRef.current) {
        try {
          const cur = playerRef.current.getVolume();
          const next = Math.max(0, cur - 10);
          playerRef.current.setVolume(next);
          setVolume(next);
        } catch {}
      }
      if ((e.key === '+' || e.key === '=') && playerRef.current) {
        try {
          const cur = playerRef.current.getVolume();
          const next = Math.min(100, cur + 10);
          playerRef.current.setVolume(next);
          setVolume(next);
        } catch {}
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  // Destroy player and create new one when book changes
  useEffect(() => {
    if (!bookAbbrev) return;
    if (activeBookRef.current === bookAbbrev) return;

    // Destroy old player
    if (playerRef.current) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      try {
        const t = playerRef.current.getCurrentTime();
        if (t > 0) saveTime(activeBookRef.current, t);
        playerRef.current.destroy();
      } catch {}
      playerRef.current = null;
      setPlayerReady(false);
      if (onPlayingChange) onPlayingChange(false);
    }

    activeBookRef.current = bookAbbrev;
  }, [bookAbbrev]);

  // Create player when modal first opens (and player doesn't exist yet)
  useEffect(() => {
    if (!open || !bookAbbrev) return;
    if (playerRef.current) return; // already have a player

    const videoId = getYouTubeVideoId(bookAbbrev);
    if (!videoId) return;
    if (!containerRef.current) return;

    const savedTime = getSavedTime(bookAbbrev);
    setCurrentTime(savedTime);

    let destroyed = false;

    loadYTApi().then((YT) => {
      if (destroyed) return;
      if (!containerRef.current) return;

      const player = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          start: Math.floor(savedTime),
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            playerRef.current = player;
            setPlayerReady(true);
            intervalRef.current = setInterval(() => {
              if (destroyed) return;
              try {
                // Do nothing while paused — the timer wakes 1x/sec but performs
                // zero work unless the video is actually playing
                if (player.getPlayerState() !== YT.PlayerState.PLAYING) return;
                const t = player.getCurrentTime();
                if (t > 0) {
                  setCurrentTime(t);
                  saveTime(bookAbbrevRef.current, t);
                }
                // Auto-follow: when the video time crosses a chapter
                // timestamp, tell the parent to navigate the reading
                // pane to that chapter.
                const tsMap = youtubeChapterTimestamps[bookAbbrevRef.current];
                if (tsMap) {
                  const chapters = Object.keys(tsMap).map(Number)
                    .filter(n => tsMap[n] != null)
                    .sort((a, b) => a - b);
                  let chapterAtTime = 1;
                  for (const c of chapters) {
                    if (t >= tsMap[c]) chapterAtTime = c;
                    else break;
                  }
                  if (chapterAtTime !== currentChapterRef.current) {
                    // Mark as already-seeked so the seek effect doesn't
                    // rewind the video when the parent's chapter prop updates
                    chapterSeekDone.current = `${bookAbbrevRef.current}-${chapterAtTime}`;
                    if (onChapterChangeRef.current) onChapterChangeRef.current(chapterAtTime);
                  }
                }
              } catch {}
            }, 1000);
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (onPlayingChange) onPlayingChange(true);
            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.BUFFERING) {
              if (onPlayingChange) onPlayingChange(false);
            } else if (event.data === YT.PlayerState.ENDED) {
              saveTime(bookAbbrevRef.current, 0);
              setCurrentTime(0);
              if (onPlayingChange) onPlayingChange(false);
            }
          },
        },
      });
    });

    return () => { destroyed = true; };
  }, [open, bookAbbrev]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime();
          if (t > 0) saveTime(bookAbbrevRef.current, t);
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  const videoId = getYouTubeVideoId(bookAbbrev);
  const bookName = bookFullNames[bookAbbrev] || bookAbbrev;

  // The player container is always rendered so the iframe stays alive.
  // When modal is closed, we move it offscreen via CSS.
  // When modal is open, it's positioned normally inside the modal layout.
  return (
    <>
      {/* Modal overlay — only visible when open */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Bible Overview Video"
        style={{ display: open ? '' : 'none' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-200 shadow-2xl flex flex-col"
          style={{ width: '98vw', height: '96vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h2 ref={headerRef} tabIndex={-1} className="text-lg font-semibold flex items-center flex-wrap gap-2 focus:outline-none">
              <span>{bookName}{currentChapter ? ` Ch.${currentChapter}` : ''} — Audio</span>
              <span className="text-sm text-gray-400 font-mono">{formatTime(currentTime)}</span>
              {videoId && (
                <>
                  {(() => {
                    const bookTimestamps = youtubeChapterTimestamps[bookAbbrev];
                    if (!bookTimestamps) return null;
                    const chapters = Object.keys(bookTimestamps).map(Number).sort((a, b) => a - b);
                    return (
                      <select
                        className="border border-gray-600 bg-gray-800 text-gray-200 rounded px-1 py-0 text-sm"
                        style={{minWidth: '40px'}}
                        value=""
                        onChange={(e) => {
                          const ch = parseInt(e.target.value, 10);
                          if (!ch || !playerRef.current) return;
                          let targetCh = ch;
                          while (targetCh >= 1 && bookTimestamps[targetCh] == null) { targetCh--; }
                          if (targetCh < 1) return;
                          const ts = bookTimestamps[targetCh];
                          try {
                            playerRef.current.seekTo(ts, true);
                            setCurrentTime(ts);
                            saveTime(bookAbbrev, ts);
                            chapterSeekDone.current = `${bookAbbrev}-${ch}`;
                          } catch {}
                        }}
                        title="Jump to chapter timestamp"
                      >
                        <option value="" disabled>ch</option>
                        {chapters.map(ch => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    );
                  })()}
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const t = Math.max(0, playerRef.current.getCurrentTime() - 60);
                          playerRef.current.seekTo(t, true);
                          setCurrentTime(t);
                          saveTime(bookAbbrev, t);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    -1min(2)
                  </button>
                  &nbsp;&nbsp;
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const t = playerRef.current.getCurrentTime() + 60;
                          playerRef.current.seekTo(t, true);
                          setCurrentTime(t);
                          saveTime(bookAbbrev, t);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    +1min(3)
                  </button>
                  &nbsp;&nbsp;
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const cur = playerRef.current.getVolume();
                          const next = Math.max(0, cur - 10);
                          playerRef.current.setVolume(next);
                          setVolume(next);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Volume down (-)"
                  >
                    vol-
                  </button>
                  <span className="text-xs text-gray-400 px-1">{volume}%</span>
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const cur = playerRef.current.getVolume();
                          const next = Math.min(100, cur + 10);
                          playerRef.current.setVolume(next);
                          setVolume(next);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Volume up (+)"
                  >
                    vol+
                  </button>
                  &nbsp;&nbsp;
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
                          const cur = playerRef.current.getPlaybackRate();
                          const idx = rates.indexOf(cur);
                          const next = rates[Math.max(0, idx - 1)];
                          playerRef.current.setPlaybackRate(next);
                          setPlaybackRate(next);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Speed down (,)"
                  >
                    &lt;spd
                  </button>
                  <span className="text-xs text-gray-400 px-1">{playbackRate}x</span>
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
                          const cur = playerRef.current.getPlaybackRate();
                          const idx = rates.indexOf(cur);
                          const next = rates[Math.min(rates.length - 1, idx + 1)];
                          playerRef.current.setPlaybackRate(next);
                          setPlaybackRate(next);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Speed up (.)"
                  >
                    spd&gt;
                  </button>
                </>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl font-bold leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Video */}
          <div className="p-2 flex-1 min-h-0">
            {videoId ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div
                  ref={containerRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No overview video available for {bookName}.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
