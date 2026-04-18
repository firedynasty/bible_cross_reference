#!/Users/stanleytan/anaconda3/bin/python3
"""
Generate Bible Rap Rhymes from bible_web chapters into bible_rhyme using GPT-4o.
Skips files that already have content. Run again to resume from where you left off.
"""

import os
import time
from pathlib import Path
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

BIBLE_WEB = Path("./bible_web")
BIBLE_RHYME = Path("./bible_rhyme")

SYSTEM_PROMPT = """You are a Bible Rap / Rhyme writer. Convert Bible chapters into rap/rhyme using these rules:

STYLE:
- Rhyme scheme: couplets (AA BB CC) — each pair of lines rhymes
- Accept slant rhymes ("created/related", "alone/bone")
- Pace: conversational, natural when spoken aloud
- Mix short punchy lines with longer narrative lines
- Build momentum toward the climactic moment
- Use repetition for rhythm: "He created... He made..."

CONTENT:
- Stay faithful to the biblical text — don't add theology
- Use modern, accessible language
- Action-focused: emphasize what happened
- Put God's direct words in quotation marks
- Use concrete imagery

STRUCTURE:
1. Strong opening hook — set the scene immediately
2. Sequential narrative — clear beginning, middle, end
3. Direct speech — make God's (or key figures') words stand out
4. Climactic moment — build tension, then resolve
5. Closing summary — wrap with the main point

OUTPUT: Return only the rap/rhyme text. No titles, no labels, no explanation."""


def generate_rhyme(chapter_text: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": chapter_text},
        ],
        temperature=0.8,
    )
    return response.choices[0].message.content.strip()


def main():
    # Collect all source files
    source_files = sorted(BIBLE_WEB.rglob("*.txt"))
    total = len(source_files)
    done = 0
    skipped = 0
    errors = 0

    print(f"Found {total} chapters to process.\n")

    for src_path in source_files:
        # Mirror path in bible_rhyme
        relative = src_path.relative_to(BIBLE_WEB)
        dest_path = BIBLE_RHYME / relative

        # Skip if already has content
        if dest_path.exists() and dest_path.stat().st_size > 0:
            skipped += 1
            continue

        chapter_text = src_path.read_text(encoding="utf-8").strip()
        if not chapter_text:
            skipped += 1
            continue

        dest_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            print(f"[{done + skipped + errors + 1}/{total}] {relative} ...", end=" ", flush=True)
            rhyme = generate_rhyme(chapter_text)
            dest_path.write_text(rhyme + "\n", encoding="utf-8")
            print("done")
            done += 1
            time.sleep(0.3)  # gentle rate limiting
        except Exception as e:
            print(f"ERROR: {e}")
            errors += 1
            time.sleep(2)

    print(f"\nFinished. Generated: {done} | Skipped: {skipped} | Errors: {errors}")


if __name__ == "__main__":
    main()
