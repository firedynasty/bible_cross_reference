#!/usr/bin/env python3
"""
Extract chapter timestamps from a dramatized Bible YouTube transcript by
matching structural anchor phrases against the transcript text.

Unlike extract_chapters.py (which looks for "chapter X" announcements), this
script works with dramatized readings that go straight into the verse text.

Strategy
--------
1. Fetch the opening verses of each chapter from bible-api.com (WEB translation —
   modern public-domain, close to NKJV wording).
2. Extract high-signal anchor tokens: proper nouns, numbers, and distinctive
   content words that appear consistently across translations.
3. Slide a window through the timestamped transcript looking for the greatest
   concentration of those anchor tokens.
4. Assign the nearest preceding timestamp to each match.

This approach is translation-agnostic: proper nouns (Noah, Pharaoh, Babylon),
ordinal numbers (second, seventh, forty), and key narrative phrases survive
across KJV / NKJV / WEB / dramatized narration without needing copyrighted text.

Usage
-----
  python extract_chapters_dramatized.py <transcript.vtt|.txt> <book_abbrev>

Examples
--------
  python extract_chapters_dramatized.py genesis.vtt gn
  python extract_chapters_dramatized.py matthew.vtt mt

Output
------
Writes / updates dramatized_chapter_timestamps.json in the same directory.
Same format as youtube_chapter_timestamps.json so it can drop straight into
the app as dramatizedChapterTimestamps.js.
"""

import re
import json
import sys
import os

# ---------------------------------------------------------------------------
# Book metadata: abbreviation → (bible-api.com slug, total chapters)
# ---------------------------------------------------------------------------
BOOK_META = {
    'gn':   ('genesis',              50), 'ge':  ('genesis',              50),
    'ex':   ('exodus',               40),
    'lv':   ('leviticus',            27),
    'nm':   ('numbers',              36),
    'dt':   ('deuteronomy',          34),
    'js':   ('joshua',               24),
    'jud':  ('judges',               21),
    'rt':   ('ruth',                  4),
    '1sm':  ('1+samuel',             31),
    '2sm':  ('2+samuel',             24),
    '1kgs': ('1+kings',              22),
    '2kgs': ('2+kings',              25),
    '1ch':  ('1+chronicles',         29),
    '2ch':  ('2+chronicles',         36),
    'ezr':  ('ezra',                 10),
    'ne':   ('nehemiah',             13),
    'et':   ('esther',               10),
    'job':  ('job',                  42),
    'ps':   ('psalms',              150),
    'prv':  ('proverbs',             31),
    'ec':   ('ecclesiastes',         12),
    'so':   ('song+of+solomon',       8),
    'is':   ('isaiah',               66),
    'jr':   ('jeremiah',             52),
    'lm':   ('lamentations',          5),
    'ez':   ('ezekiel',              48),
    'dn':   ('daniel',               12),
    'ho':   ('hosea',                14),
    'jl':   ('joel',                  3),
    'am':   ('amos',                  9),
    'ob':   ('obadiah',               1),
    'jn':   ('jonah',                 4),
    'mi':   ('micah',                 7),
    'na':   ('nahum',                 3),
    'hk':   ('habakkuk',              3),
    'zp':   ('zephaniah',             3),
    'hg':   ('haggai',                2),
    'zc':   ('zechariah',            14),
    'ml':   ('malachi',               4),
    'mt':   ('matthew',              28),
    'mk':   ('mark',                 16),
    'lk':   ('luke',                 24),
    'jo':   ('john',                 21),
    'act':  ('acts',                 28),
    'rm':   ('romans',               16),
    '1co':  ('1+corinthians',        16),
    '2co':  ('2+corinthians',        13),
    'gl':   ('galatians',             6),
    'eph':  ('ephesians',             6),
    'ph':   ('philippians',           4),
    'cl':   ('colossians',            4),
    '1ts':  ('1+thessalonians',       5),
    '2ts':  ('2+thessalonians',       3),
    '1tm':  ('1+timothy',             6),
    '2tm':  ('2+timothy',             4),
    'tt':   ('titus',                 3),
    'phm':  ('philemon',              1),
    'hb':   ('hebrews',              13),
    'jm':   ('james',                 5),
    '1pe':  ('1+peter',               5),
    '2pe':  ('2+peter',               3),
    '1jo':  ('1+john',                5),
    '2jo':  ('2+john',                1),
    '3jo':  ('3+john',                1),
    'jd':   ('jude',                  1),
    're':   ('revelation',           22),
}

# Common function words to strip out — these carry no structural signal
STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to',
    'for', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'is',
    'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'shall', 'can', 'not', 'no', 'so', 'it', 'its', 'he', 'she', 'they',
    'we', 'you', 'i', 'his', 'her', 'their', 'our', 'your', 'my', 'this',
    'that', 'these', 'those', 'who', 'which', 'what', 'when', 'where',
    'how', 'then', 'than', 'as', 'if', 'there', 'here', 'also', 'very',
    'said', 'say', 'says', 'came', 'come', 'went', 'go', 'made', 'make',
    'all', 'some', 'one', 'two', 'him', 'them', 'us', 'me', 'now', 'out',
}


# ---------------------------------------------------------------------------
# Text normalisation
# ---------------------------------------------------------------------------

def normalize(text):
    """Lowercase, strip punctuation (keep apostrophes), collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^\w\s']", ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_anchors(raw_text, min_anchors=6, extra_verses=None):
    """
    Extract structural anchor tokens from verse text.

    Priority tokens (always kept if present):
      - Proper nouns: any word starting with an uppercase letter in the raw text
      - Numbers spelled out: first, second, ..., forty, hundred, thousand, etc.
      - Numbers as digits

    Secondary tokens: content words not in STOPWORDS.

    Returns a list of normalized anchor strings.
    """
    # Proper nouns — detect from raw (capitalised) text before lowercasing
    proper = set()
    for word in re.findall(r"\b[A-Z][a-z]{1,}\b", raw_text):
        w = word.lower()
        if w not in STOPWORDS and len(w) > 2:
            proper.add(w)

    # Number words
    number_words = {
        'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
        'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth',
        'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth',
        'nineteenth', 'twentieth', 'thirtieth', 'fortieth', 'fiftieth',
        'sixtieth', 'seventieth', 'eightieth', 'ninetieth', 'hundredth',
        'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
        'ninety', 'hundred', 'thousand', 'ten', 'eleven', 'twelve', 'thirteen',
        'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    }

    norm = normalize(raw_text)
    tokens = norm.split()

    content = []
    for tok in tokens:
        if re.match(r'^\d+$', tok):           # bare digit
            content.append(tok)
        elif tok in number_words:              # number word
            content.append(tok)
        elif tok not in STOPWORDS and len(tok) > 3:
            content.append(tok)

    # Merge: proper nouns first, then other content words
    anchors = list(proper) + [t for t in content if t not in proper]

    # De-duplicate, preserve order
    seen = set()
    deduped = []
    for a in anchors:
        if a not in seen:
            seen.add(a)
            deduped.append(a)

    # If we have extra verse texts (verse 2, 3) to supplement short verses
    if len(deduped) < min_anchors and extra_verses:
        for ev in extra_verses:
            extra_anchors = extract_anchors(ev, min_anchors=0)
            for a in extra_anchors:
                if a not in seen:
                    seen.add(a)
                    deduped.append(a)
            if len(deduped) >= min_anchors:
                break

    return deduped[:20]  # cap to avoid very long query sets


# ---------------------------------------------------------------------------
# Local WEB Bible loader (public/en_web.json)
# No network calls, no rate limits.
# ---------------------------------------------------------------------------

# Path relative to this script: ../../public/en_web.json
_WEB_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         '..', 'public', 'en_web.json')

def _load_web_bible():
    with open(_WEB_JSON, encoding='utf-8') as f:
        books = json.load(f)
    # Build index: abbrev -> chapters list (each chapter = list of verse strings)
    return {b['abbrev']: b['chapters'] for b in books}

_WEB_BIBLE = _load_web_bible()


def get_verse(book_abbrev, chapter, verse):
    """
    Return a verse string from the local WEB JSON.
    chapter and verse are 1-based. Returns '' if out of range.
    """
    chapters = _WEB_BIBLE.get(book_abbrev, [])
    if chapter < 1 or chapter > len(chapters):
        return ''
    verses = chapters[chapter - 1]
    if verse < 1 or verse > len(verses):
        return ''
    return verses[verse - 1]


def fetch_chapter_anchors(book_abbrev, chapter, translation='web'):
    """
    Build anchor token set from verses 1-3 of a chapter using local WEB data.
    'translation' parameter kept for API compatibility but ignored (always WEB).
    """
    raw1 = get_verse(book_abbrev, chapter, 1)
    if not raw1:
        return []

    anchors = extract_anchors(raw1, min_anchors=6)

    if len(anchors) < 6:
        raw2 = get_verse(book_abbrev, chapter, 2)
        raw3 = get_verse(book_abbrev, chapter, 3)
        anchors = extract_anchors(raw1, min_anchors=6, extra_verses=[raw2, raw3])

    return anchors


def fetch_boundary_anchors(book_abbrev, chapter):
    """
    Build a boundary anchor set for chapter N by combining:
      - Last 2 verses of chapter N-1 (tail context — where the previous chapter ends)
      - Verses 1-3 of chapter N (head context — where this chapter starts)

    The resulting set is unique to the transition point between chapters,
    which makes it much easier to locate in ASR/auto-caption transcripts.

    Returns (head_anchors, tail_anchors) separately so the caller can weight them.
    """
    # Head: verses 1-3 of the current chapter
    head_anchors = fetch_chapter_anchors(book_abbrev, chapter)

    # Tail: last 2 verses of the previous chapter
    tail_anchors = []
    if chapter > 1:
        chapters_data = _WEB_BIBLE.get(book_abbrev, [])
        if chapter - 1 <= len(chapters_data):
            prev_verses = chapters_data[chapter - 2]  # 0-indexed
            # Take the last 2 verses
            tail_verses = prev_verses[-2:] if len(prev_verses) >= 2 else prev_verses
            tail_raw = ' '.join(tail_verses)
            tail_anchors = extract_anchors(tail_raw, min_anchors=4)

    return head_anchors, tail_anchors


# ---------------------------------------------------------------------------
# Transcript parsers → list of (start_seconds, normalised_text)
# ---------------------------------------------------------------------------

def parse_vtt(text):
    """Parse a WebVTT file into (seconds, normalised_text) cues."""
    cues = []
    lines = text.split('\n')
    current_ts = None
    current_lines = []

    def flush():
        if current_ts is not None and current_lines:
            raw = ' '.join(current_lines)
            clean = re.sub(r'<[^>]+>', ' ', raw)
            clean = normalize(clean)
            if clean:
                cues.append((current_ts, clean))

    for line in lines:
        line = line.strip()
        ts_match = re.match(r'(\d{2}):(\d{2}):(\d{2})\.\d+\s*-->', line)
        if ts_match:
            flush()
            current_lines = []
            h, m, s = int(ts_match.group(1)), int(ts_match.group(2)), int(ts_match.group(3))
            current_ts = h * 3600 + m * 60 + s
            continue
        if (not line or line.startswith('WEBVTT') or line.startswith('Kind:')
                or line.startswith('Language:') or re.match(r'^\d+$', line)):
            continue
        current_lines.append(line)

    flush()
    return cues


def parse_pasted(text):
    """
    Parse YouTube copy-pasted transcript.
    Handles three formats:

    Format A (bare inline):
      0:09  the beginning god created...
      1:02:30  and god said...

    Format B (bracketed timestamp on its own line):
      [00:00]
      the first book of moses...

    Format C (bookmarklet — bracketed timestamp + text on same line):
      [0:09] the beginning god created...
      [1:02:30] and god said...
    """
    # Detect format B: timestamps appear as [MM:SS] or [H:MM:SS] on their own line
    if re.search(r'^\s*\[\d+:\d{2}(?::\d{2})?\]\s*$', text, re.MULTILINE):
        return _parse_bracketed(text)

    # Detect format C: [M:SS] text or [H:MM:SS] text on the same line (bookmarklet)
    if re.search(r'^\s*\[\d+:\d{2}(?::\d{2})?\]\s+\S', text, re.MULTILINE):
        cues = []
        pattern = re.compile(r'^\s*\[(\d+:\d{2}(?::\d{2})?)\]\s+(.+)$', re.MULTILINE)
        for m in pattern.finditer(text):
            parts = m.group(1).split(':')
            secs = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    if len(parts) == 3
                    else int(parts[0]) * 60 + int(parts[1]))
            cues.append((secs, normalize(m.group(2))))
        return cues

    # Format A: timestamp + text on same line (no brackets)
    cues = []
    pattern = re.compile(r'^\s*(\d+:\d{2}(?::\d{2})?)\s+(.+)$', re.MULTILINE)
    for m in pattern.finditer(text):
        parts = m.group(1).split(':')
        secs = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                if len(parts) == 3
                else int(parts[0]) * 60 + int(parts[1]))
        cues.append((secs, normalize(m.group(2))))
    return cues


def _parse_bracketed(text):
    """
    Parse bracketed-timestamp format:
      [MM:SS] or [H:MM:SS] on its own line, followed by text lines until the next timestamp.
    """
    cues = []
    current_ts = None
    current_lines = []

    def flush():
        if current_ts is not None and current_lines:
            combined = normalize(' '.join(current_lines))
            if combined:
                cues.append((current_ts, combined))

    for line in text.split('\n'):
        stripped = line.strip()
        ts_match = re.match(r'^\[(\d+:\d{2}(?::\d{2})?)\]$', stripped)
        if ts_match:
            flush()
            current_lines = []
            parts = ts_match.group(1).split(':')
            current_ts = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                          if len(parts) == 3
                          else int(parts[0]) * 60 + int(parts[1]))
        elif stripped:
            current_lines.append(stripped)

    flush()
    return cues


# ---------------------------------------------------------------------------
# Anchor matching
# ---------------------------------------------------------------------------

def score_window(flat_words, start_idx, window_size, anchor_set):
    """
    Score a window of flat_words[start_idx : start_idx+window_size]
    against anchor_set.  Returns fraction of anchors present in window.
    """
    window = set(flat_words[start_idx:start_idx + window_size])
    hits = len(anchor_set & window)
    return hits / len(anchor_set) if anchor_set else 0.0


def find_best_match(cues, anchors, window_words=60, min_score=0.20):
    """
    Slide a word window across all cues and return (best_seconds, best_score).
    window_words: how many transcript words to consider per window.
    """
    if not anchors or not cues:
        return None, 0.0

    anchor_set = set(anchors)

    # Build flat word list with associated timestamps
    flat = []          # list of (seconds, word)
    for secs, text in cues:
        for word in text.split():
            flat.append((secs, word))

    if len(flat) < window_words:
        window_words = len(flat)

    best_score = 0.0
    best_secs = None
    words_only = [w for _, w in flat]

    for i in range(len(flat) - window_words + 1):
        window = set(words_only[i:i + window_words])
        hits = len(anchor_set & window)
        score = hits / len(anchor_set)
        if score > best_score:
            best_score = score
            best_secs = flat[i][0]

    if best_score >= min_score:
        return best_secs, best_score
    return None, best_score


def find_best_match_boundary(flat, start_word_idx, head_anchors, tail_anchors,
                             window_words=60, tail_window_words=40,
                             min_score=0.20, tail_weight=0.3):
    """
    Cursor-aware, boundary-context version of find_best_match.

    Searches flat[start_word_idx:] only (monotonic — no going backwards).

    Score = head_score * (1 - tail_weight) + tail_score * tail_weight

    head_score: fraction of head_anchors found in the forward window.
    tail_score: fraction of tail_anchors found in the preceding window
                (the tail_window_words words just before position i).

    Returns (best_seconds, best_score, best_word_idx).
    """
    head_set = set(head_anchors)
    tail_set = set(tail_anchors)

    if not head_set:
        sec = flat[start_word_idx][0] if start_word_idx < len(flat) else 0
        return sec, 0.0, start_word_idx

    words_only = [w for _, w in flat]
    total = len(flat)

    best_score = 0.0
    best_secs = flat[start_word_idx][0] if start_word_idx < total else 0
    best_idx = start_word_idx

    for i in range(start_word_idx, total - window_words + 1):
        # Forward window: chapter N head
        fwd = set(words_only[i: i + window_words])
        head_score = len(head_set & fwd) / len(head_set)

        # Backward window: chapter N-1 tail (only if tail anchors provided)
        tail_score = 0.0
        if tail_set and i > start_word_idx:
            back_start = max(start_word_idx, i - tail_window_words)
            back = set(words_only[back_start: i])
            tail_score = len(tail_set & back) / len(tail_set)

        score = head_score * (1 - tail_weight) + tail_score * tail_weight

        if score > best_score:
            best_score = score
            best_secs = flat[i][0]
            best_idx = i

    if best_score >= min_score:
        return best_secs, best_score, best_idx
    return None, best_score, best_idx


# ---------------------------------------------------------------------------
# Deduplication: if two consecutive chapters map to same timestamp, flag it
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    transcript_file = sys.argv[1]
    book_abbrev = sys.argv[2].lower()
    # WEB = modern public-domain, close to NKJV wording; change if needed
    translation = sys.argv[3] if len(sys.argv) > 3 else 'web'

    if book_abbrev not in BOOK_META:
        print(f"ERROR: Unknown book abbreviation '{book_abbrev}'")
        print(f"Valid: {', '.join(sorted(BOOK_META))}")
        sys.exit(1)

    book_slug, total_chapters = BOOK_META[book_abbrev]

    # Single-chapter books
    if total_chapters == 1:
        print(f"'{book_abbrev}' is a single-chapter book — timestamp is 0.")
        _save({'1': 0}, book_abbrev)
        return

    # Parse transcript
    with open(transcript_file, 'r', encoding='utf-8') as f:
        text = f.read()

    if transcript_file.endswith('.vtt'):
        cues = parse_vtt(text)
    else:
        cues = parse_pasted(text)

    if not cues:
        print("ERROR: No timestamped cues found in transcript file.")
        sys.exit(1)

    print(f"\nParsed {len(cues)} cues  |  {book_abbrev.upper()}  |  "
          f"{total_chapters} chapters  |  translation: {translation.upper()}\n")

    # Build flat word timeline once; cursor advances monotonically chapter by chapter
    flat = []
    for secs, text in cues:
        for word in text.split():
            flat.append((secs, word))

    chapters = {}
    low_confidence = []
    cursor = 0  # word index — never goes backwards

    for ch in range(1, total_chapters + 1):
        head_anchors, tail_anchors = fetch_boundary_anchors(book_abbrev, ch)

        if not head_anchors:
            print(f"  Ch {ch:3d}: [skip — no anchor text fetched]")
            continue

        secs, score, new_cursor = find_best_match_boundary(
            flat, cursor, head_anchors, tail_anchors
        )

        if secs is not None:
            m, s = divmod(secs, 60)
            h, m2 = divmod(m, 60)
            ts = f"{h}:{m2:02d}:{s:02d}" if h else f"{m}:{s:02d}"
            flag = '  LOW' if score < 0.55 else '   OK'
            tail_info = f" tail={len(tail_anchors)}tok" if tail_anchors else ""
            print(f"  Ch {ch:3d}: {ts:>9s}  ({secs:5d}s)  score={score:.2f}{flag}{tail_info}"
                  f"  head=[{', '.join(head_anchors[:4])}{'...' if len(head_anchors) > 4 else ''}]")
            chapters[ch] = secs
            cursor = new_cursor  # advance past where we just matched
            if score < 0.55:
                low_confidence.append((ch, score, secs))
        else:
            print(f"  Ch {ch:3d}: [no match]  best={score:.2f}"
                  f"  head=[{', '.join(head_anchors[:4])}]")

    if not chapters:
        print("\nNo chapters matched. Try a different --window size or lower --min-score.")
        sys.exit(1)

    if low_confidence:
        print(f"\n[!] Low-confidence matches (score < 0.55) — verify manually:")
        for ch, sc, secs in low_confidence:
            if ch in chapters:
                m, s = divmod(secs, 60)
                h, m2 = divmod(m, 60)
                ts = f"{h}:{m2:02d}:{s:02d}" if h else f"{m}:{s:02d}"
                print(f"    Chapter {ch}: {ts} (score={sc:.2f})")

    print(f"\nResult: {len(chapters)}/{total_chapters} chapters matched.")

    # Save
    entry = {str(k): v for k, v in sorted(chapters.items())}
    _save(entry, book_abbrev)


def _save(entry, book_abbrev):
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               'dramatized_chapter_timestamps.json')
    data = {}
    if os.path.exists(output_file):
        with open(output_file) as f:
            data = json.load(f)

    data[book_abbrev] = entry

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Saved to {output_file}  ({len(data)} book(s) total)")
    print(f"\nOnce all books are done, convert to JS:")
    print(f"  python json_to_js.py dramatized_chapter_timestamps.json "
          f"../src/data/dramatizedChapterTimestamps.js dramatizedChapterTimestamps")


if __name__ == '__main__':
    main()
