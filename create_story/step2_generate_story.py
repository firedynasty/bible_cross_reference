#!/Users/stanleytan/anaconda3/bin/python3
"""
Step 2: Generate Story Time narratives with OpenAI GPT-4o.

Reads summaries from ./storytime_summaries/<book>/ch001.txt
Outputs narratives to ./storytime_output/<book>/<book>_01.md

Resumable — skips chapters that already have .md files.

Usage:
    python step2_generate_story.py 06                  # by MHC number
    python step2_generate_story.py Joshua               # by book name
    python step2_generate_story.py                      # next unchecked book

Requires: OPENAI_API_KEY env var
"""

import os
import re
import sys
import time

from shared import SUMMARIES_DIR, STORYTIME_OUT, BOOK_MAP, find_next_book


# ── Story Time prompt ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a gifted Bible teacher and storyteller. Your job is to bring
Scripture alive with the "Story Time" format: narrative, accessible, theologically rich,
and deeply human.

You will receive the chapter reference AND a summary of Matthew Henry's Commentary
for that chapter. Use the commentary insights to enrich your narrative — weave in
Henry's theological observations, typological connections, and practical applications
naturally into the storytelling. Don't just repeat the commentary; let it deepen the
narrative.

For each chapter, you will:
1. Set the scene — what just happened, what's the mood, who's there
2. Walk through the chapter's key moments with vivid narrative prose
3. Slow down on the most important verse or moment and let it breathe
4. Weave in Matthew Henry's key insights where they illuminate the story
5. Close with a short reflection: what this chapter is REALLY about

Rules:
- Write in present tense for narrative sections to create immediacy
- Use short punchy paragraphs. White space is your friend.
- Bold key phrases sparingly for emphasis
- Ask rhetorical questions to pull the reader in
- End with a thematic summary of 2-4 sentences
- Do not use academic jargon or commentary-speak
- Keep the tone warm, honest, and alive — like a friend who loves this book
- Format in clean Markdown with a title, section breaks, and a closing line
- When drawing from the commentary, make it feel organic — not quoted or cited"""


def run(mhc_num, book_name, num_chapters):
    from openai import OpenAI

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        print("ERROR: Set OPENAI_API_KEY env var")
        sys.exit(1)

    client = OpenAI(api_key=openai_key)
    book_slug = book_name.lower().replace(' ', '_')

    # Load summaries from step 1
    summary_dir = SUMMARIES_DIR / book_slug
    summaries = {}
    if summary_dir.exists():
        for ch in range(1, num_chapters + 1):
            f = summary_dir / f"ch{ch:03d}.txt"
            if f.exists() and f.stat().st_size > 0:
                summaries[ch] = f.read_text(encoding='utf-8')
    print(f"\n== Step 2: Generate Story Time for {book_name} (MHC{mhc_num}) ==")
    print(f"  Loaded {len(summaries)} summaries from step 1")

    book_dir = STORYTIME_OUT / book_slug
    book_dir.mkdir(parents=True, exist_ok=True)

    done_count = 0
    for ch in range(1, num_chapters + 1):
        md_file = book_dir / f"{book_slug}_{ch:02d}.md"

        if md_file.exists() and md_file.stat().st_size > 0:
            print(f"  Chapter {ch}/{num_chapters}: already generated, skipping")
            done_count += 1
            continue

        commentary = summaries.get(ch)
        user_prompt = f"Story Time — {book_name} chapter {ch}. Walk me through it."
        if commentary:
            user_prompt += f"\n\nHere is Matthew Henry's Commentary summary for this chapter to draw from:\n\n{commentary}"

        print(f"  Chapter {ch}/{num_chapters}: generating...", end=" ", flush=True)
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.85,
            )
            story = response.choices[0].message.content
            md_file.write_text(story, encoding='utf-8')
            done_count += 1
            print("done")
            time.sleep(1)
        except Exception as e:
            print(f"ERROR: {e}")
            time.sleep(3)

    print(f"\n  Stories: {done_count}/{num_chapters} in {book_dir}/")


# ── Main ─────────────────────────────────────────────────────────────────────

def resolve_book(arg):
    if arg is None:
        return find_next_book()
    if re.match(r'^\d{2}$', arg):
        return find_next_book(specific_mhc=arg)
    for mhc_num, (name, chapters, _) in BOOK_MAP.items():
        if name.lower() == arg.lower():
            return find_next_book(specific_mhc=mhc_num)
    print(f"ERROR: Unknown book '{arg}'")
    sys.exit(1)


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    book = resolve_book(arg)
    if book:
        run(*book)
