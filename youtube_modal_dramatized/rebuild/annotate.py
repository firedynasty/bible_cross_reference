#!/usr/bin/env python3
"""
annotate.py — mark chapter boundaries in a transcript using en_web.json verse text.

Reads:
  en_web.json        — WEB Bible (verse 1 of each chapter + last-verse tail context)
  <transcript>.txt   — bookmarklet transcript  (lines: [M:SS] text)

For each chapter N boundary, scores a sliding window of transcript lines by:
  - Primary (70%): how many of chapter N's verse-1 tokens appear in the window
  - Bonus  (30%): how many of chapter N-1's last-verse tokens appear just before

Writes an annotated copy where the best-matching line for each chapter gets
a @N marker prepended, e.g.:

  [0:10] @01 In the beginning God created the heavens and the earth...
  [6:55] @02 Thus the heavens and the earth, and all the host of them...

Usage:
    python annotate.py <transcript.txt> <book_abbrev>
    python annotate.py transcripts/nm.txt nm
    python annotate.py transcripts/nm.txt nm --output nm_annotated.txt
"""

import re
import json
import sys
import argparse
from pathlib import Path

# en_web.json lives at repo_root/public/en_web.json
# This script is at repo_root/youtube_modal_dramatized/rebuild/annotate.py
_REPO_ROOT = Path(__file__).parent.parent.parent
WEB_JSON = _REPO_ROOT / "public" / "en_web.json"

STOPWORDS = set(
    "the a an and or of to in is was were be been being have has had "
    "do does did will would could should may might shall this that these "
    "those it its he she they we you i me him her them us his their our "
    "your my with for from by on at as into upon unto also but not nor "
    "so yet both either neither one two three four five six said then "
    "now when where who which what how all no more than if".split()
)


def tokenize(text):
    words = re.findall(r"[a-z']+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def parse_transcript(path):
    """Return list of (seconds, original_line) for each [M:SS] line."""
    lines = []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            m = re.match(r"^\[(\d+):(\d+):(\d+)\]", line)
            if m:
                sec = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
                lines.append((sec, line))
                continue
            m = re.match(r"^\[(\d+):(\d+)\]", line)
            if m:
                sec = int(m.group(1)) * 60 + int(m.group(2))
                lines.append((sec, line))
    return lines


def load_web_book(book_abbrev):
    """
    Return list of chapters, each chapter a list of verse strings.
    Raises if book not found.
    """
    data = json.loads(WEB_JSON.read_text(encoding="utf-8"))
    for book in data:
        if book["abbrev"] == book_abbrev:
            return book["chapters"]
    raise ValueError(f"Book '{book_abbrev}' not found in en_web.json")


def strip_ts(line_text):
    return re.sub(r"^\[\d+:\d+(?::\d+)?\]\s*", "", line_text)


def window_words(tlines, start, size):
    words = set()
    for j in range(start, min(start + size, len(tlines))):
        words |= set(tokenize(strip_ts(tlines[j][1])))
    return words


def find_best_window(head_toks, tail_toks, tlines, start_idx,
                     lookahead=200, win=5, tail_weight=0.3):
    """
    Slide a window of `win` transcript lines through tlines[start_idx:start_idx+lookahead].

    Score = head_score * (1 - tail_weight) + tail_score * tail_weight

    head_score: fraction of chapter-N verse-1 tokens found in the window.
    tail_score: fraction of chapter-(N-1) last-verse tokens found in the
                `win` lines just before the window.

    Returns (best_start_idx, best_score).
    """
    head_set = set(head_toks)
    tail_set = set(tail_toks)

    if not head_set:
        return start_idx, 0.0

    end = min(start_idx + lookahead, len(tlines))
    best_score = -1.0
    best_idx = start_idx

    for i in range(start_idx, end):
        cur_words = window_words(tlines, i, win)
        head_score = len(head_set & cur_words) / len(head_set)

        tail_score = 0.0
        if tail_set and i > start_idx:
            prev_start = max(start_idx, i - win)
            prev_words = window_words(tlines, prev_start, i - prev_start)
            tail_score = len(tail_set & prev_words) / len(tail_set)

        score = head_score * (1 - tail_weight) + tail_score * tail_weight

        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx, best_score


def annotate(transcript_path, book_abbrev, output_path=None,
             lookahead=200, win=5, tail_weight=0.3):
    tlines = parse_transcript(transcript_path)
    if not tlines:
        print("ERROR: no [M:SS] lines found in transcript.")
        sys.exit(1)

    chapters_data = load_web_book(book_abbrev)
    total = len(chapters_data)
    print(f"  Loaded {total} chapters for '{book_abbrev}' from en_web.json")

    markers = {}
    cursor = 0

    for ch_idx, verses in enumerate(chapters_data):
        ch_num = ch_idx + 1

        # Head: verse 1 (+ verse 2 if short) of this chapter
        head_text = verses[0] if verses else ""
        if len(tokenize(head_text)) < 6 and len(verses) > 1:
            head_text += " " + verses[1]
        head_toks = tokenize(head_text)

        # Tail: last 2 verses of previous chapter
        tail_toks = []
        if ch_idx > 0:
            prev_verses = chapters_data[ch_idx - 1]
            tail_text = " ".join(prev_verses[-2:] if len(prev_verses) >= 2 else prev_verses)
            tail_toks = tokenize(tail_text)

        best_idx, score = find_best_window(
            head_toks, tail_toks, tlines, cursor,
            lookahead=lookahead, win=win, tail_weight=tail_weight
        )
        markers.setdefault(best_idx, []).append(ch_num)
        tail_info = f"  tail={len(tail_toks)}tok" if tail_toks else ""
        print(f"  Ch {ch_num:>3}  score={score:.2f}  line {best_idx:>4}{tail_info}  "
              f"{tlines[best_idx][1][:70]}")
        cursor = max(cursor, best_idx)

    # Zero-pad width
    pad = len(str(total))

    out_lines = []
    for idx, (sec, line) in enumerate(tlines):
        if idx in markers:
            for ch in markers[idx]:
                annotated_line = re.sub(
                    r"^(\[\d+:\d+(?::\d+)?\]\s*)",
                    rf"\1@{str(ch).zfill(pad)} ",
                    line
                )
                out_lines.append(annotated_line)
        else:
            out_lines.append(line)

    result = "\n".join(out_lines) + "\n"

    if output_path is None:
        p = Path(transcript_path)
        output_path = p.with_stem(p.stem + "_annotated")

    Path(output_path).write_text(result, encoding="utf-8")
    print(f"\nAnnotated transcript → {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Annotate transcript with chapter markers")
    parser.add_argument("transcript", help="Bookmarklet transcript .txt file")
    parser.add_argument("book", help="Book abbreviation (e.g. gn, nm, jr)")
    parser.add_argument("--output", "-o", help="Output path (default: <transcript>_annotated.txt)")
    parser.add_argument("--lookahead", type=int, default=200,
                        help="Max lines to scan per chapter (default: 200)")
    parser.add_argument("--win", type=int, default=5,
                        help="Window size in transcript lines (default: 5)")
    parser.add_argument("--tail-weight", type=float, default=0.3,
                        help="Weight for prev-chapter tail context 0-1 (default: 0.3)")
    args = parser.parse_args()

    annotate(args.transcript, args.book, args.output,
             lookahead=args.lookahead, win=args.win, tail_weight=args.tail_weight)
