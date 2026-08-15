#!/Users/stanleytan/anaconda3/bin/python3
"""
Step 1: Extract MHC HTML → plain text, then summarize each chapter with Anthropic.

Reads MHC HTML files from /Users/stanleytan/matthew_henry/
Outputs summaries to ./storytime_summaries/<book>/ch001.txt

Resumable — skips chapters that already have summary files.

Usage:
    python step1_extract_and_summarize.py 06          # by MHC number
    python step1_extract_and_summarize.py Joshua       # by book name
    python step1_extract_and_summarize.py              # next unchecked book

Requires: OPENAI_API_KEY env var
"""

import os
import re
import sys
import time

from shared import MHC_DIR, SUMMARIES_DIR, BOOK_MAP, find_next_book


# ── MHC summarization prompt ────────────────────────────────────────────────

MHC_SUMMARIZE_PROMPT = """Summarize this Matthew Henry Commentary on {book} Chapter {chapter}.

Focus on:
1. Main theological themes and interpretations
2. Key practical applications Matthew Henry draws
3. Notable verse-by-verse insights
4. Cross-references to other scripture

Keep the summary concise but comprehensive (300-500 words). Use clear paragraphs.
Preserve important quotes or memorable phrases from the original.

COMMENTARY TEXT:
{text}"""


# ── HTML extraction ──────────────────────────────────────────────────────────

def html_to_text(html_content):
    text = html_content
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?p[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?div[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?h\d[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    for old, new in [('&nbsp;', ' '), ('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
                     ('&quot;', '"'), ('&#39;', "'"), ('&mdash;', '—'), ('&ndash;', '–'),
                     ('&ldquo;', '\u201c'), ('&rdquo;', '\u201d'),
                     ('&lsquo;', '\u2018'), ('&rsquo;', '\u2019')]:
        text = text.replace(old, new)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_mhc_chapters(mhc_num):
    """Extract MHC HTML files for a book, return {chapter_int: plain_text}."""
    chapters = {}
    pattern = re.compile(rf'^MHC{mhc_num}(\d{{3}})\.HTM$', re.IGNORECASE)
    for fname in sorted(os.listdir(MHC_DIR)):
        m = pattern.match(fname)
        if m:
            ch = int(m.group(1))
            if ch == 0:
                continue  # skip book intro
            path = MHC_DIR / fname
            try:
                html = path.read_text(encoding='utf-8', errors='replace')
                chapters[ch] = html_to_text(html)
            except Exception as e:
                print(f"  WARNING: Failed to read {fname}: {e}")
    return chapters


# ── Summarize ────────────────────────────────────────────────────────────────

def summarize_chapter(text, book_name, chapter):
    from openai import OpenAI
    client = OpenAI()

    prompt = MHC_SUMMARIZE_PROMPT.format(
        book=book_name, chapter=chapter, text=text[:15000]
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def run(mhc_num, book_name, num_chapters):
    summary_dir = SUMMARIES_DIR / book_name.lower().replace(' ', '_')
    summary_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n== Step 1: Extract & Summarize MHC for {book_name} (MHC{mhc_num}) ==")
    raw_chapters = extract_mhc_chapters(mhc_num)
    print(f"  Found {len(raw_chapters)} MHC chapter files")

    done_count = 0
    for ch in range(1, num_chapters + 1):
        summary_file = summary_dir / f"ch{ch:03d}.txt"

        if summary_file.exists() and summary_file.stat().st_size > 0:
            print(f"  Chapter {ch}/{num_chapters}: already done, skipping")
            done_count += 1
            continue

        raw = raw_chapters.get(ch)
        if not raw:
            print(f"  Chapter {ch}/{num_chapters}: no MHC source, skipping")
            continue

        print(f"  Chapter {ch}/{num_chapters}: summarizing...", end=" ", flush=True)
        try:
            summary = summarize_chapter(raw, book_name, ch)
            summary_file.write_text(summary, encoding='utf-8')
            done_count += 1
            print("done")
            time.sleep(0.5)
        except Exception as e:
            print(f"ERROR: {e}")
            time.sleep(2)

    print(f"\n  Summaries: {done_count}/{num_chapters} in {summary_dir}/")


# ── Main ─────────────────────────────────────────────────────────────────────

def resolve_book(arg):
    """Resolve a CLI arg to (mhc_num, book_name, chapters). Accepts MHC number or book name."""
    if arg is None:
        return find_next_book()

    # Try as MHC number (e.g. "06")
    if re.match(r'^\d{2}$', arg):
        return find_next_book(specific_mhc=arg)

    # Try as book name
    for mhc_num, (name, chapters, _) in BOOK_MAP.items():
        if name.lower() == arg.lower():
            return find_next_book(specific_mhc=mhc_num)

    print(f"ERROR: Unknown book '{arg}'")
    sys.exit(1)


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    book = resolve_book(arg)
    if book:
        mhc_num, book_name, num_chapters = book
        if not os.environ.get("OPENAI_API_KEY"):
            print("ERROR: Set OPENAI_API_KEY env var")
            sys.exit(1)
        run(mhc_num, book_name, num_chapters)
