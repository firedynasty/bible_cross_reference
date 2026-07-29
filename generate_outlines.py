#!/usr/bin/env python3
"""
Generate verbatim chapter outlines for Romans, Hebrews, Galatians, and 1 John.

You are a re-arranger, not a writer: no word in the output may appear
that is not in the source text.

Usage:
    python generate_outlines.py

Requires:
    - OPENAI_API_KEY environment variable
    - public/en_kjv.json

Output:
    public/outlines.json
    Structure: { "rm": { "1": { "breaks": "1, 5, 12", "outline": "..." }, ... }, ... }
"""

import json
import os
import time
from openai import OpenAI

# --- Configuration ---
KJV_PATH = os.path.join(os.path.dirname(__file__), "public", "en_kjv.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "outlines.json")
MODEL = "gpt-4o"

TARGET_BOOKS = {
    "rm":  ("Romans",  "argument"),
    "hb":  ("Hebrews", "argument"),
    "gl":  ("Galatians", "argument"),
    "1jo": ("1 John",  "argument"),
}

# --- Outline prompt (verbatim re-arranger) ---
OUTLINE_PROMPT = """\
Restructure the passage below into a verbatim outline. You are a re-arranger, not a writer: no word may appear in your output that is not in the source.

INPUT
  TRANSLATION: KJV
  GENRE:       {genre}
  UNIT:        clause
  PASSAGE:     {passage_ref}
  BREAKS:      {breaks}

SEGMENTATION
- UNIT = clause: units end at . ? ! ; : \u2014 AND before a clause-initial
  conjunction (for, because, but, and, wherefore, therefore, that, so
  that, which, who, if, though, seeing that) when it heads a finite
  clause. Do not split before a conjunction joining a bare list
  ("murder, debate, deceit").
- Never split after an abbreviation (Mr. Dr. e.g. i.e. etc. vs. U.S.)
  or after a numeral.
- Address every unit by verse. Several units in one verse: suffix
  a/b/c ("1:20a"). One unit spanning verses: use a range ("1:1\u20137").
- Reproduce each unit exactly: wording, punctuation, capitalization,
  internal quotes, italics. No ellipses, no trimming, no merging.
- Omit chapter headings and editorial section titles entirely.

STRUCTURE
- The first unit of the passage, and the first unit of every verse
  listed in BREAKS, is a top-level bullet tagged [claim]. No others.
- Every other unit attaches to the NEAREST PRECEDING unit it
  modifies, at parent depth + 1. If the target is unclear, attach to
  the governing [claim].
- PARALLELISM: if a unit carries the same tag as an existing sibling
  under the same parent AND repeats three or more content words from
  that sibling's first eight words, attach it as a SIBLING of that
  unit, not as its child.
- Exactly one tag per line, except that a [claim] which also carries
  an opener cue takes a compound tag: [claim+evidence],
  [claim+consequence], etc. If no cue applies, use [--].

TAGS \u2014 a cue counts ONLY in the first five words of the unit.
Mid-unit cues are ignored. If two cues appear, the leftmost wins.

  ALWAYS LIVE
  [evidence]      for / because / since / seeing that / in fact /
                  because that
  [consequence]   therefore / wherefore / thus / hence / so / so then /
                  for this cause / it follows
  [contrast]      but / however / yet / nevertheless / notwithstanding
  [qualification] if / unless / although / though / except / save that
  [purpose]       that / so that / to the end that / lest
  [example]       for example / consider / behold / take
  [analogy]       just as / even as / likewise / like / as if /
                  even so / how much more
  [restatement]   that is / in other words / namely / first, second,
                  finally
  [definition]    by X I mean / which is to say / which is, being
                  interpreted
  [concession]    of course / indeed / it is true / verily
  [citation]      as it is written / saith the scripture / that it
                  might be fulfilled / as he saith
  [objection]     what shall we say then / God forbid / shall we /
                  nay / someone will say
  [speech]        opens with a speech frame (And God said / Thus saith
                  the LORD / He answered and said)
  [address]       opens with a vocative (Brethren / O LORD / My son)

GUARDS
- "for" is [evidence] only as a conjunction. Heading a noun phrase
  ("for a memorial", "for his name") it is not a cue.
- "that" is [purpose] only heading a subordinate clause of intent. As
  a relative, demonstrative, or complementizer after a verb of saying
  or knowing, not a cue.
- "but" and "now" are weak transitions as often as adversatives. Tag
  [contrast] only when the unit denies or reverses the preceding one.
  Otherwise [--], or [sequence] in narrative.
- "since" / "as": causal only, never temporal.
- "so": [consequence] only when drawing an inference. Introducing
  degree or manner ("so loved", "so that") it is not a cue.
- "like" / "as": [analogy] across domains; same-class members are
  [example].
- "first / second / finally": [restatement] only when enumerating
  parts of the claim just stated; narrating events, [--].
- Translators' supplied words (italics in KJV) are part of the text;
  reproduce them, do not treat them as cues.
- When two readings are plausible, output [--]. A missing tag is
  acceptable; a wrong tag is not.

FORMAT
- "- 1:20a [tag] Unit text." Two spaces of indent per level.
- No blank lines, no headers, no commentary before or after.

<passage>
{text}
</passage>"""

# --- Helpers ---

def load_target_books():
    with open(KJV_PATH, encoding="utf-8-sig") as f:
        bible = json.load(f)
    books = {}
    for book in bible:
        if book["abbrev"] in TARGET_BOOKS:
            books[book["abbrev"]] = book["chapters"]
    return books


def chapter_to_text(verses, chapter_num):
    """Format chapter verses as '1:1 text\\n1:2 text\\n...'"""
    return "\n".join(f"{chapter_num}:{i + 1} {v}" for i, v in enumerate(verses))


def get_breaks(client, book_name, chapter_num, chapter_text):
    """
    Ask GPT for the verse numbers where new paragraphs begin.
    Returns a comma-separated string like "1, 5, 12, 18".
    """
    prompt = (
        f"For {book_name} chapter {chapter_num} (KJV), list the verse numbers "
        f"where new paragraphs begin, starting with verse 1.\n\n"
        f"Return ONLY a comma-separated list of integers (e.g. \"1, 5, 12\") "
        f"with no other text.\n\n"
        f"{chapter_text}"
    )
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=80,
    )
    return resp.choices[0].message.content.strip()


def generate_outline(client, book_name, chapter_num, chapter_text, genre, breaks):
    """Generate a verbatim outline for one chapter."""
    passage_ref = f"{book_name} {chapter_num}"
    prompt = OUTLINE_PROMPT.format(
        genre=genre,
        passage_ref=passage_ref,
        breaks=breaks,
        text=chapter_text,
    )
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=8000,
    )
    return resp.choices[0].message.content.strip()


# --- Main ---

def main():
    print("Loading KJV...")
    books = load_target_books()
    print(f"  Loaded: {', '.join(books.keys())}")

    # Resume support
    result = {}
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, encoding="utf-8") as f:
                result = json.load(f)
            done = sum(len(v) for v in result.values())
            print(f"  Resuming: {done} chapters already processed")
        except (json.JSONDecodeError, IOError):
            result = {}

    client = OpenAI()

    total_chapters = sum(len(books[a]) for a in TARGET_BOOKS if a in books)
    processed = sum(len(v) for v in result.values())

    for abbrev, (book_name, genre) in TARGET_BOOKS.items():
        if abbrev not in books:
            print(f"  WARNING: {book_name} ({abbrev}) not found in KJV")
            continue

        chapters = books[abbrev]
        if abbrev not in result:
            result[abbrev] = {}

        for i, verses in enumerate(chapters):
            ch_num = i + 1
            key = str(ch_num)

            if key in result[abbrev]:
                print(f"  Skipping {book_name} {ch_num} (already done)")
                continue

            chapter_text = chapter_to_text(verses, ch_num)
            print(f"  [{processed + 1}/{total_chapters}] {book_name} {ch_num}...")

            try:
                # Step 1: paragraph breaks
                breaks = get_breaks(client, book_name, ch_num, chapter_text)
                print(f"    breaks: {breaks}")
                time.sleep(0.5)

                # Step 2: verbatim outline
                outline = generate_outline(
                    client, book_name, ch_num, chapter_text, genre, breaks
                )

                result[abbrev][key] = {"breaks": breaks, "outline": outline}
                processed += 1

                # Save after every chapter (resume support)
                with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                print(f"    saved ({processed}/{total_chapters} total)")

            except Exception as e:
                print(f"    ERROR for {book_name} {ch_num}: {e}")
                # Save whatever we have so far
                with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

            time.sleep(1)

    print(f"\nDone. {processed}/{total_chapters} chapters outlined.")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
