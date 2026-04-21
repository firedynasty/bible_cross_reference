#!/usr/bin/env python3
"""Generate prompts.json from .txt files in the prompts directory.

Usage:
    python process_prompts.py
    # Output: ../public/prompts.json
"""

import json
import os
import glob

# Map filenames (without .txt) to canonical book names
FILENAME_TO_BOOK = {
    "2Corinthians": "2 Corinthians",
    "ecclesiastes": "Ecclesiastes",
    "Esther": "Esther",
    "exodus": "Exodus",
    "genesis": "Genesis",
    "hebrews_part_1": "Hebrews Part 1",
    "hebrews_part_2": "Hebrews Part 2",
    "isaiah_part_1": "Isaiah Part 1",
    "isaiah_part_2": "Isaiah Part 2",
    "leviticus": "Leviticus",
    "luke": "Luke",
    "proverbs": "Proverbs",
    "psalms_1_89_": "Psalms 1-89",
    "psalms90_150": "Psalms 90-150",
    "romans": "Romans",
    "solomon": "Song of Solomon",
    "joshua": "Joshua",
    "judges": "Judges",
    "1_samuel": "1 Samuel",
    "2_samuel": "2 Samuel",
    "1_kings": "1 Kings",
    "2_kings": "2 Kings",
    "1_chronicles": "1 Chronicles",
    "2_chronicles": "2 Chronicles",
}


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    txt_files = sorted(glob.glob(os.path.join(script_dir, "*.txt")))

    prompts = {}
    for filepath in txt_files:
        name = os.path.splitext(os.path.basename(filepath))[0]
        book_name = FILENAME_TO_BOOK.get(name)

        if book_name is None:
            print(f"Warning: No mapping for '{name}', skipping")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()

        prompts[book_name] = content

    output_path = os.path.join(script_dir, "..", "public", "prompts.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(prompts, f, ensure_ascii=False, indent=2)

    print(f"Generated {output_path}")
    print(f"Entries: {len(prompts)}")
    for book, content in sorted(prompts.items()):
        print(f"  {book}: {len(content):,} chars")


if __name__ == "__main__":
    main()
