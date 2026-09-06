import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import youtubeChapterTimestamps from '../data/youtubeChapterTimestamps';
import dramatizedChapterTimestamps from '../data/dramatizedChapterTimestamps';

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

// Dramatized NKJV audio video IDs (one per book)
const dramatizedBookVideoIds = {
  'gn': 'rzZMD9DGFik', 'ge': 'rzZMD9DGFik',
  'ex': 'jykSZuVgVgM',
  'lv': 'Z8GG5ULjaSo',
  'nm': 'Y2yjAhRfsl0',
  'dt': 'CbU1b8AQB2w',
  'js': 'RUnT_xMzxKw',
  'jud': 'tynF9rwHnGE',
  'rt': '7zArUEmxkuM',
  '1sm': 'boXKa-aEoBM',
  '2sm': 'O-6lHBOOZPc',
  '1kgs': 'pu_m74aTY2s',
  '2kgs': 'zlM_nGPeSS8',
  '1ch': '2uEsQ3ny6vU',
  '2ch': 'zr-qtkwphJ4',
  'ezr': 'ruqmepz2BcI',
  'ne': 'z3vSY5Q73T4',
  'et': '-oM-YtW9Odg',
  'job': 'F36gLSvCycg',
  'ps': 'NCX8Z_lpcqs',
  'prv': 'NfdS7jOMNpk',
  'ec': 'iU4MkVC0hRQ',
  'so': 'HbA0uibnzVo',
  'is': '14Mv5O6dWlE',
  'jr': 'DdqKQq91Ci8',
  'lm': '8ES_PeP0Zn0',
  'ez': '-vUiUQKaJa0',
  'dn': 'nZy0j7iHDVQ',
  'ho': 'NFKTOszV9pE',
  'jl': 'pO5WONPQkFE',
  'am': 'zaGZyZ5wZsA',
  'ob': 'Vzvr8d868cY',
  'jn': 'Dq0XZrTn1qs',
  'mi': '9zh_14bb-Qo',
  'na': 'zPzB6dk6xtA',
  'hk': 'f74F0T-dELA',
  'zp': '91ZgdqW55zI',
  'hg': 'jYKR1ndBspg',
  'zc': 'SlI22bU6nxE',
  'ml': 'g4zokwrffSc',
  'mt': 'fDhuHunaTRM',
  'mk': 'mY66M9mkNmg',
  'lk': '6TZ5Pz4HT-A',
  'jo': 'cNtVcooYKb4',
  'act': 'qjNpW6tUh8c',
  'rm': 'e2qa2XeVtPs',
  '1co': 'ygOiOrfuyMw',
  '2co': 'JVgYhR6U1_8',
  'gl': '85oixsXb6xU',
  'eph': 'D30bKhL7nZw',
  'ph': '0jk75xUFx9U',
  'cl': 'FqhI_bxPgFo',
  '1ts': '895TGhOfr0Y',
  '2ts': 'yq2MAJcuH2w',
  '1tm': '3kBUrm6QXdQ',
  '2tm': 'E-FCL7hImmo',
  'tt': 'Oq4cVPKWVF4',
  'phm': 'xbu1ZFbrIds',
  'hb': '_cMSDTAXpNI',
  'jm': 'TOHhMWgW90g',
  '1pe': 'K1yiy8IeUWA',
  '2pe': 'mRRBsmI6mqo',
  '1jo': 'Ed4s8VOKnrQ',
  '2jo': '7vb5jJsfpkc',
  '3jo': '5ewI9UCLxpo',
  'jd': 'ZV6e2oK_pxk',
  're': 'DEa-a1JTccc',
};

// Verse counts per chapter per book (derived from KJV, 0-indexed chapters)
const VERSE_COUNTS = {"gn":[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],"ex":[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],"lv":[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],"nm":[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],"dt":[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],"js":[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],"jud":[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],"rt":[22,23,18,22],"1sm":[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,43,15,23,29,22,44,25,12,25,11,31,13],"2sm":[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],"1kgs":[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,54],"2kgs":[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],"1ch":[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],"2ch":[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],"ezr":[11,70,13,24,17,22,28,36,15,44],"ne":[11,20,32,23,19,19,73,18,38,39,36,47,31],"et":[22,23,15,17,14,14,10,17,32,3],"job":[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],"ps":[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],"prv":[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],"ec":[18,26,22,16,20,12,29,17,18,20,10,14],"so":[17,17,11,16,16,13,13,14],"is":[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],"jr":[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],"lm":[22,22,66,22,22],"ez":[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],"dn":[21,49,30,37,31,28,28,27,27,21,45,13],"ho":[11,23,5,19,15,11,16,14,17,15,12,14,16,9],"jl":[20,32,21],"am":[15,16,15,13,27,14,17,14,15],"ob":[21],"jn":[17,10,10,11],"mi":[16,13,12,13,15,16,20],"na":[15,13,19],"hk":[17,20,19],"zp":[18,15,20],"hg":[15,23],"zc":[21,13,10,14,11,15,14,23,17,12,17,14,9,21],"ml":[14,17,18,6],"mt":[25,22,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,45,39,51,46,74,66,20],"mk":[45,28,35,40,43,56,36,37,50,52,33,44,37,72,47,20],"lk":[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],"jo":[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],"act":[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],"rm":[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],"1co":[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],"2co":[24,17,18,18,21,18,16,24,15,18,33,21,14],"gl":[24,21,29,31,26,18],"eph":[23,22,21,32,33,24],"ph":[30,30,21,23],"cl":[29,23,25,18],"1ts":[10,20,13,18,28],"2ts":[12,17,18],"1tm":[20,15,16,16,25,21],"2tm":[18,26,17,22],"tt":[16,15,15],"phm":[25],"hb":[14,18,19,16,14,20,28,13,28,39,40,29,25],"jm":[27,26,18,17,20],"1pe":[25,25,22,19,14],"2pe":[21,22,18],"1jo":[10,29,24,21,21],"2jo":[13],"3jo":[15],"jd":[25],"re":[20,29,22,11,14,17,17,13,21,11,19,18,18,20,8,21,18,24,21,15,27,21]};

// Some dramatized videos contain multiple books; these offsets mark where
// the book starts within the video (from the &t= parameter in the source URL).
const dramatizedBookOffsets = {
  '1kgs': 7282, '1ch': 143, 'so': 42, 'dn': 981,
  'ho': 29, 'jl': 109, 'am': 141, 'ob': 12, 'zp': 13,
};

export function getDramatizedYouTubeVideoId(bookAbbrev) {
  return dramatizedBookVideoIds[bookAbbrev] || null;
}

export function getDramatizedBookOffset(bookAbbrev) {
  return dramatizedBookOffsets[bookAbbrev] || 0;
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
const DRAMATIZED_STORAGE_KEY = 'youtube-dramatized-video-times';

function getSavedTime(bookAbbrev, storageKey = STORAGE_KEY) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return data[bookAbbrev] || 0;
  } catch { return 0; }
}

function saveTime(bookAbbrev, seconds, storageKey = STORAGE_KEY) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    data[bookAbbrev] = seconds;
    localStorage.setItem(storageKey, JSON.stringify(data));
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

const YouTubeVideoModal = forwardRef(function YouTubeVideoModal({ open, onClose, onOpen, bookAbbrev, currentChapter, onPlayingChange, onChapterChange, isDramatized = false, ytMode, onYtModeChange }, ref) {
  const [currentTime, setCurrentTime] = useState(0);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [calcVerse, setCalcVerse] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(100);
  const [autoInit] = useState(false);
  const [timerLoops, setTimerLoops] = useState(40);
  const [timerTimestamp, setTimerTimestamp] = useState('00:00:00');
  const timerTimestampRef = useRef('00:00:00');
  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerRef = useRef(null);
  const timerLoopsRef = useRef(0);
  const timerPausedRef = useRef(false);
  const timerStuckRef = useRef(false); // fired while paused, waiting to resume
  const timerStuckLoopsRef = useRef(0);
  const playerRef = useRef(null);
  const pendingPlayRef = useRef(false);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const bookAbbrevRef = useRef(bookAbbrev);
  const activeBookRef = useRef(null);
  const chapterSeekDone = useRef(null); // track which chapter we already seeked to
  const currentChapterRef = useRef(currentChapter);
  const onChapterChangeRef = useRef(onChapterChange);
  const isDramatizedRef = useRef(isDramatized);
  const storageKeyRef = useRef(isDramatized ? DRAMATIZED_STORAGE_KEY : STORAGE_KEY);
  const onPlayingChangeRef = useRef(onPlayingChange);
  // Offset (seconds) for books that start partway into their video
  const bookOffset = isDramatized ? getDramatizedBookOffset(bookAbbrev) : 0;
  const bookOffsetRef = useRef(bookOffset);

  useEffect(() => { bookAbbrevRef.current = bookAbbrev; }, [bookAbbrev]);
  useEffect(() => { currentChapterRef.current = currentChapter; }, [currentChapter]);
  useEffect(() => { onChapterChangeRef.current = onChapterChange; }, [onChapterChange]);
  useEffect(() => {
    isDramatizedRef.current = isDramatized;
    storageKeyRef.current = isDramatized ? DRAMATIZED_STORAGE_KEY : STORAGE_KEY;
  }, [isDramatized]);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => {
    bookOffsetRef.current = isDramatized ? getDramatizedBookOffset(bookAbbrev) : 0;
  }, [isDramatized, bookAbbrev]);

  // Seek to chapter timestamp when modal opens with a chapter that has timestamp data
  // If exact chapter is missing, decrement until we find one
  useEffect(() => {
    if (!open || !playerRef.current || !bookAbbrev || !currentChapter) return;
    const seekKey = `${bookAbbrev}-${currentChapter}`;
    if (chapterSeekDone.current === seekKey) return;
    const tsData = isDramatized ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
    const bookTimestamps = tsData[bookAbbrev];
    if (!bookTimestamps) return;
    let ch = currentChapter;
    while (ch >= 1 && bookTimestamps[ch] == null) { ch--; }
    if (ch < 1) return;
    const offset = bookOffsetRef.current;
    const ts = bookTimestamps[ch] + offset;
    try {
      // If the video is currently playing, don't seek — just mark as done
      // so re-opening the modal while playing never disrupts playback position
      if (playerRef.current.getPlayerState() === 1) {
        chapterSeekDone.current = seekKey;
        return;
      }
    } catch {}
    try {
      // Skip the seek if the video is already inside this chapter's time range
      // (avoids rewinding when the reading pane auto-followed the video here)
      const curT = playerRef.current.getCurrentTime();
      const later = Object.keys(bookTimestamps).map(Number)
        .filter(n => n > ch && bookTimestamps[n] != null)
        .sort((a, b) => a - b);
      const rangeEnd = later.length > 0 ? bookTimestamps[later[0]] + offset : Infinity;
      if (curT >= ts && curT < rangeEnd) {
        chapterSeekDone.current = seekKey;
        return;
      }
    } catch {}
    try {
      playerRef.current.seekTo(ts, true);
      setCurrentTime(ts);
      saveTime(bookAbbrev, ts, storageKeyRef.current);
      chapterSeekDone.current = seekKey;
    } catch {}
  }, [open, playerReady, bookAbbrev, currentChapter, isDramatized]);

  // Reset chapter seek tracking when modal closes
  useEffect(() => {
    if (!open) { chapterSeekDone.current = null; setSessionSecs(0); }
  }, [open]);

  // Session timer — ticks every second while modal is open
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(id);
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
          saveTime(bookAbbrevRef.current, 0, storageKeyRef.current);
        } catch {}
      }
      if (e.key === '[') {
        e.preventDefault();
        e.stopPropagation();
        if (playerRef.current) {
          try {
            const t = Math.max(0, playerRef.current.getCurrentTime() - 10);
            playerRef.current.seekTo(t, true);
            setCurrentTime(t);
            saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
          } catch {}
        }
      }
      if (e.key === ']') {
        e.preventDefault();
        e.stopPropagation();
        if (playerRef.current) {
          try {
            const t = playerRef.current.getCurrentTime() + 10;
            playerRef.current.seekTo(t, true);
            setCurrentTime(t);
            saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
          } catch {}
        }
      }
      if (e.key === '1' && playerRef.current) {
        try {
          const t = Math.max(0, playerRef.current.getCurrentTime() - 180);
          playerRef.current.seekTo(t, true);
          setCurrentTime(t);
          saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
        } catch {}
      }
      if (e.key === '2' && playerRef.current) {
        try {
          const t = Math.max(0, playerRef.current.getCurrentTime() - 60);
          playerRef.current.seekTo(t, true);
          setCurrentTime(t);
          saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
        } catch {}
      }
      if (e.key === '3' && playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime() + 60;
          playerRef.current.seekTo(t, true);
          setCurrentTime(t);
          saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
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
      if (e.key === 'r' && playerRef.current && currentChapterRef.current) {
        e.preventDefault();
        const tsData = isDramatizedRef.current ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
        const bookTimestamps = tsData[bookAbbrevRef.current];
        if (bookTimestamps) {
          let ch = currentChapterRef.current;
          while (ch >= 1 && bookTimestamps[ch] == null) { ch--; }
          if (ch >= 1) {
            const ts = bookTimestamps[ch] + bookOffsetRef.current;
            try {
              playerRef.current.seekTo(ts, true);
              setCurrentTime(ts);
              saveTime(bookAbbrevRef.current, ts, storageKeyRef.current);
              chapterSeekDone.current = `${bookAbbrevRef.current}-${currentChapterRef.current}`;
            } catch {}
          }
        }
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
        if (t > 0) saveTime(activeBookRef.current, t, storageKeyRef.current);
        playerRef.current.destroy();
      } catch {}
      playerRef.current = null;
      setPlayerReady(false);
      if (onPlayingChangeRef.current) onPlayingChangeRef.current(false);
    }

    activeBookRef.current = bookAbbrev;
  }, [bookAbbrev]);

  // Create player when modal first opens (and player doesn't exist yet),
  // or when autoInit is triggered by the external play button.
  useEffect(() => {
    if ((!open && !autoInit) || !bookAbbrev) return;
    if (playerRef.current) return; // already have a player

    const videoId = isDramatizedRef.current ? getDramatizedYouTubeVideoId(bookAbbrev) : getYouTubeVideoId(bookAbbrev);
    if (!videoId) return;
    if (!containerRef.current) return;

    const savedTime = getSavedTime(bookAbbrev, storageKeyRef.current) || bookOffsetRef.current;
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
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              // Seek to the current chapter's timestamp before playing,
              // so the external play button starts at the right chapter.
              const tsData = isDramatizedRef.current ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
              const bookTimestamps = tsData[bookAbbrevRef.current];
              if (bookTimestamps && currentChapterRef.current) {
                let ch = currentChapterRef.current;
                while (ch >= 1 && bookTimestamps[ch] == null) { ch--; }
                if (ch >= 1) {
                  const ts = bookTimestamps[ch] + bookOffsetRef.current;
                  try {
                    player.seekTo(ts, true);
                    setCurrentTime(ts);
                    saveTime(bookAbbrevRef.current, ts, storageKeyRef.current);
                    chapterSeekDone.current = `${bookAbbrevRef.current}-${currentChapterRef.current}`;
                  } catch {}
                }
              }
              try { player.playVideo(); } catch {}
            }
            intervalRef.current = setInterval(() => {
              if (destroyed) return;
              try {
                const t = player.getCurrentTime();
                if (t > 0) {
                  setCurrentTime(t);
                  saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
                }
                // Auto-follow: when the video time crosses a chapter
                // timestamp, tell the parent to navigate the reading
                // pane to that chapter.
                const tsData = isDramatizedRef.current ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
                const tsMap = tsData[bookAbbrevRef.current];
                if (tsMap) {
                  const off = bookOffsetRef.current;
                  const tAdj = t - off; // compare against offset-relative timestamps
                  const chapters = Object.keys(tsMap).map(Number)
                    .filter(n => tsMap[n] != null)
                    .sort((a, b) => a - b);
                  let chapterAtTime = 1;
                  for (const c of chapters) {
                    if (tAdj >= tsMap[c]) chapterAtTime = c;
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
              if (onPlayingChangeRef.current) onPlayingChangeRef.current(true);
            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.BUFFERING) {
              if (onPlayingChangeRef.current) onPlayingChangeRef.current(false);
            } else if (event.data === YT.PlayerState.ENDED) {
              saveTime(bookAbbrevRef.current, 0, storageKeyRef.current);
              setCurrentTime(0);
              if (onPlayingChangeRef.current) onPlayingChangeRef.current(false);
            }
          },
        },
      });
    });

    return () => { destroyed = true; };
  }, [open, autoInit, bookAbbrev]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime();
          if (t > 0) saveTime(bookAbbrevRef.current, t, storageKeyRef.current);
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    togglePlayPause: () => {
      if (!playerRef.current) {
        // No player yet — open the modal so the iframe can load, then auto-play
        pendingPlayRef.current = true;
        if (onOpen) onOpen();
        return;
      }
      try {
        const state = playerRef.current.getPlayerState();
        if (state === 1) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      } catch {}
    },
  }));

  const videoId = isDramatized ? getDramatizedYouTubeVideoId(bookAbbrev) : getYouTubeVideoId(bookAbbrev);
  const bookName = bookFullNames[bookAbbrev] || bookAbbrev;

  const cancelTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    timerPausedRef.current = false;
    timerStuckRef.current = false;
    setTimerActive(false);
    setTimerPaused(false);
    setTimerRemaining(0);
  };

  const parseTimestamp = (ts) => {
    const parts = ts.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  };

  const secsToHMS = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const runTimerLoop = (loopsLeft) => {
    if (loopsLeft <= 0) {
      timerRef.current = null;
      setTimerActive(false);
      setTimerRemaining(0);
      return;
    }
    setTimerRemaining(loopsLeft);
    timerRef.current = setTimeout(() => {
      const seekTo = parseTimestamp(timerTimestampRef.current);
      if (playerRef.current) {
        try { playerRef.current.seekTo(seekTo, true); } catch {}
      }
      runTimerLoop(loopsLeft - 1);
    }, 30000);
  };

  const toggleTimerPause = () => {
    const nowPaused = !timerPausedRef.current;
    timerPausedRef.current = nowPaused;
    setTimerPaused(nowPaused);
    if (nowPaused) {
      // Cancel the pending timeout immediately so no rewind fires while paused
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    } else {
      // Resume: capture current player time as new loop-back point
      let nowSecs = 0;
      try { nowSecs = playerRef.current.getCurrentTime(); } catch {}
      const hms = secsToHMS(nowSecs);
      timerTimestampRef.current = hms;
      setTimerTimestamp(hms);
      runTimerLoop(timerRemaining);
    }
  };

  const startTimer = () => {
    if (timerActive) { cancelTimer(); return; }
    if (!playerRef.current) return;
    let t = 0;
    try { t = playerRef.current.getCurrentTime(); } catch {}
    const hms = secsToHMS(t);
    timerTimestampRef.current = hms;
    setTimerTimestamp(hms);
    const loops = Math.max(1, parseInt(timerLoops, 10) || 1);
    setTimerActive(true);
    runTimerLoop(loops);
  };

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
              <span>{bookName}{currentChapter ? ` Ch.${currentChapter}` : ''}{(() => {
                if (!currentChapter) return '';
                const tsData = isDramatized ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
                const tsMap = tsData[bookAbbrev];
                const totalVerses = (VERSE_COUNTS[bookAbbrev] || [])[currentChapter - 1];
                if (!tsMap || !totalVerses) return totalVerses ? ` · ${totalVerses}v` : '';
                const chStart = tsMap[currentChapter];
                if (chStart == null) return ` · ${totalVerses}v`;
                const chapters = Object.keys(tsMap).map(Number).sort((a, b) => a - b);
                const nextCh = chapters.find(c => c > currentChapter);
                const chEnd = nextCh != null ? tsMap[nextCh] : null;
                if (chEnd == null) return ` · ${totalVerses}v`;
                const tAdj = currentTime - bookOffset;
                const pct = Math.min(100, Math.max(0, Math.round((tAdj - chStart) / (chEnd - chStart) * 100)));
                return ` · ${pct}% of ${totalVerses}v`;
              })()} — {isDramatized ? 'Dramatized' : 'Audio'}</span>
              {currentChapter && (
                <button
                  onClick={() => {
                    const tsData = isDramatized ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
                    const tsMap = tsData[bookAbbrev];
                    const totalVerses = (VERSE_COUNTS[bookAbbrev] || [])[currentChapter - 1];
                    if (!tsMap || !totalVerses) { setCalcVerse(null); return; }
                    const chStart = tsMap[currentChapter];
                    if (chStart == null) { setCalcVerse(null); return; }
                    const chapters = Object.keys(tsMap).map(Number).sort((a, b) => a - b);
                    const nextCh = chapters.find(c => c > currentChapter);
                    const chEnd = nextCh != null ? tsMap[nextCh] : null;
                    if (chEnd == null) { setCalcVerse(null); return; }
                    const t = playerRef.current ? (() => { try { return playerRef.current.getCurrentTime(); } catch { return currentTime; } })() : currentTime;
                    const tAdj = t - bookOffsetRef.current;
                    const pct = Math.min(1, Math.max(0, (tAdj - chStart) / (chEnd - chStart)));
                    const verse = Math.max(1, Math.round(pct * totalVerses));
                    setCalcVerse(`~v.${verse}`);
                  }}
                  style={{padding:'2px 6px',background:'#444',color:'#ccc',cursor:'pointer',border:'none',borderRadius:3,fontSize:10}}
                  title="Calculate approximate verse from current position"
                >calc</button>
              )}
              {calcVerse && (
                <span className="text-xs text-yellow-400 font-mono">{calcVerse}</span>
              )}
              {onYtModeChange && (
                <span className="flex rounded overflow-hidden" style={{fontSize:10,border:'1px solid #555'}}>
                  {['kjv','drm'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => onYtModeChange(mode)}
                      style={{padding:'2px 6px',background: ytMode === mode ? (mode === 'drm' ? '#5a5' : '#666') : '#333',color: ytMode === mode ? '#fff' : '#999',cursor:'pointer',border:'none'}}
                    >{mode}</button>
                  ))}
                </span>
              )}
              <span className="text-sm text-gray-400 font-mono">{formatTime(currentTime)} · {Math.floor(currentTime)}s</span>
              <span className="text-sm text-gray-500 font-mono">⏱ {formatTime(sessionSecs)}</span>
              <button
                onClick={() => navigator.clipboard.writeText(String(Math.floor(currentTime))).catch(() => {})}
                className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                title={`Copy current position as seconds (${Math.floor(currentTime)}s)`}
              >
                copy s
              </button>
              {currentChapter && (
                <a
                  href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(bookName + ' ' + currentChapter)}&version=NKJV`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                  title={`Open ${bookName} ${currentChapter} in BibleGateway NKJV`}
                >
                  BG NKJV
                </a>
              )}
              {videoId && (
                <>
                  {(() => {
                    const tsData = isDramatized ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
                    const bookTimestamps = tsData[bookAbbrev];
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
                          const ts = bookTimestamps[targetCh] + bookOffsetRef.current;
                          try {
                            playerRef.current.seekTo(ts, true);
                            setCurrentTime(ts);
                            saveTime(bookAbbrev, ts, storageKeyRef.current);
                            chapterSeekDone.current = `${bookAbbrev}-${ch}`;
                            if (onChapterChangeRef.current) onChapterChangeRef.current(ch);
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
                  {currentChapter && (() => {
                    const tsData = isDramatized ? dramatizedChapterTimestamps : youtubeChapterTimestamps;
                    const bookTimestamps = tsData[bookAbbrev];
                    if (!bookTimestamps) return null;
                    return (
                      <button
                        onClick={() => {
                          if (!playerRef.current) return;
                          let ch = currentChapter;
                          while (ch >= 1 && bookTimestamps[ch] == null) { ch--; }
                          if (ch < 1) return;
                          const ts = bookTimestamps[ch] + bookOffsetRef.current;
                          try {
                            playerRef.current.seekTo(ts, true);
                            setCurrentTime(ts);
                            saveTime(bookAbbrev, ts, storageKeyRef.current);
                            chapterSeekDone.current = `${bookAbbrev}-${currentChapter}`;
                          } catch {}
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                        title={`Restart chapter ${currentChapter} (r)`}
                      >
                        ↻ ch(r)
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const t = Math.max(0, playerRef.current.getCurrentTime() - 25);
                          playerRef.current.seekTo(t, true);
                          setCurrentTime(t);
                          saveTime(bookAbbrev, t, storageKeyRef.current);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    -25s(2)
                  </button>
                  &nbsp;&nbsp;
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        try {
                          const t = playerRef.current.getCurrentTime() + 25;
                          playerRef.current.seekTo(t, true);
                          setCurrentTime(t);
                          saveTime(bookAbbrev, t, storageKeyRef.current);
                        } catch {}
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    +25s(3)
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
                  <input
                    type="text"
                    value={timerTimestamp}
                    onChange={(e) => { timerTimestampRef.current = e.target.value; setTimerTimestamp(e.target.value); }}
                    className="border border-gray-600 bg-gray-800 text-gray-200 rounded px-1 py-0 text-xs font-mono"
                    style={{ width: '72px' }}
                    title="Loop back to this timestamp (HH:MM:SS)"
                    placeholder="00:00:00"
                  />
                  <button
                    onClick={startTimer}
                    className={`text-xs px-2 py-0.5 rounded text-white font-bold ${timerActive ? 'bg-red-700 hover:bg-red-600' : 'bg-orange-600 hover:bg-orange-500'}`}
                    title={timerActive ? `Cancel timer (${timerRemaining} loops left)` : 'Play 30s, rewind, repeat'}
                  >
                    {timerActive ? `⏹ ${timerRemaining}/${timerLoops}` : '⏱ 30s'}
                  </button>
                  {timerActive && (
                    <button
                      onClick={toggleTimerPause}
                      className={`text-xs px-2 py-0.5 rounded text-white font-bold ${timerPaused ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                      title={timerPaused ? 'Resume loop' : 'Pause loop (let current 30s run out, then hold)'}
                    >
                      {timerPaused ? '▶ resume' : '⏸ pause'}
                    </button>
                  )}
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
});

export default YouTubeVideoModal;
