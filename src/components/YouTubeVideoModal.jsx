import React, { useState, useEffect, useRef } from 'react';

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
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function YouTubeVideoModal({ open, onClose, bookAbbrev }) {
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);
  const bookAbbrevRef = useRef(bookAbbrev);

  useEffect(() => { bookAbbrevRef.current = bookAbbrev; }, [bookAbbrev]);

  // Press 0 to reset video to beginning while modal is open
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === '0' && playerRef.current) {
        try {
          playerRef.current.seekTo(0, true);
          setCurrentTime(0);
          saveTime(bookAbbrevRef.current, 0);
        } catch {}
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (!open || !bookAbbrev) return;

    const videoId = getYouTubeVideoId(bookAbbrev);
    if (!videoId) return;

    const savedTime = getSavedTime(bookAbbrev);
    setCurrentTime(savedTime);

    let player = null;
    let destroyed = false;

    loadYTApi().then((YT) => {
      if (destroyed) return;
      if (!containerRef.current) return;

      player = new YT.Player(containerRef.current, {
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
            intervalRef.current = setInterval(() => {
              if (destroyed) return;
              try {
                const t = player.getCurrentTime();
                if (t > 0) {
                  setCurrentTime(t);
                  saveTime(bookAbbrevRef.current, t);
                }
              } catch {}
            }, 5000);
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              saveTime(bookAbbrevRef.current, 0);
              setCurrentTime(0);
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime();
          if (t > 0) saveTime(bookAbbrevRef.current, t);
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [open, bookAbbrev]);

  if (!open) return null;

  const videoId = getYouTubeVideoId(bookAbbrev);
  const bookName = bookFullNames[bookAbbrev] || bookAbbrev;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bible Overview Video"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-200 shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold flex items-center flex-wrap gap-2">
            <span>{bookName} — Overview</span>
            <span className="text-sm text-gray-400 font-mono">{formatTime(currentTime)}</span>
            {videoId && (
              <>
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
                  +1 minute
                </button>
                &nbsp;&nbsp;
                <button
                  onClick={() => {
                    if (playerRef.current) {
                      try {
                        const t = playerRef.current.getCurrentTime() + 300;
                        playerRef.current.seekTo(t, true);
                        setCurrentTime(t);
                        saveTime(bookAbbrev, t);
                      } catch {}
                    }
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                >
                  +5 minutes
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
        <div className="p-4">
          {videoId ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <div
                key={bookAbbrev}
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
  );
}
