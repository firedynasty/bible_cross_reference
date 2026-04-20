#!/usr/bin/env python3
"""Concatenate storytime_output .md files into a single prompts/*.txt file
and regenerate prompts.json.

Usage:
    python step4_build_prompt.py              # uses next unchecked book
    python step4_build_prompt.py 06           # specific MHC number
    python step4_build_prompt.py Joshua       # specific book name
"""

import re
import subprocess
import sys
from pathlib import Path

from shared import BOOK_MAP, SCRIPT_DIR, STORYTIME_OUT, find_next_book

PROMPTS_DIR = SCRIPT_DIR.parent / "prompts"
PROCESS_PROMPTS = PROMPTS_DIR / "process_prompts.py"


def resolve_book(arg):
    """Resolve CLI arg to (mhc_num, book_name, chapters)."""
    if arg:
        if re.match(r"^\d{2}$", arg):
            entry = BOOK_MAP.get(arg)
            if entry:
                return (arg, entry[0], entry[1])
        else:
            for mhc_num, (name, ch, _) in BOOK_MAP.items():
                if name.lower() == arg.lower():
                    return (mhc_num, name, ch)
        print(f"ERROR: Could not resolve '{arg}'")
        sys.exit(1)
    book = find_next_book()
    if not book:
        print("ERROR: No book found")
        sys.exit(1)
    return book


def build_prompt_txt(book_name):
    """Concatenate all .md files for a book into prompts/{book}.txt."""
    folder_name = book_name.lower().replace(" ", "_")
    md_dir = STORYTIME_OUT / folder_name

    if not md_dir.exists():
        # Try without underscores (e.g. "1samuel")
        folder_name = book_name.lower().replace(" ", "")
        md_dir = STORYTIME_OUT / folder_name

    if not md_dir.exists():
        print(f"  No storytime_output folder found for {book_name}")
        return None

    md_files = sorted(md_dir.glob("*.md"))
    if not md_files:
        print(f"  No .md files in {md_dir}")
        return None

    # Concatenate all chapter .md files
    parts = []
    for md_file in md_files:
        parts.append(md_file.read_text(encoding="utf-8").strip())

    content = "\n\n---\n\n".join(parts)

    # Write to prompts directory
    txt_filename = folder_name + ".txt"
    txt_path = PROMPTS_DIR / txt_filename
    txt_path.write_text(content, encoding="utf-8")
    print(f"  Written {txt_path} ({len(md_files)} chapters, {len(content):,} chars)")
    return txt_filename


def ensure_mapping(txt_filename, book_name):
    """Add entry to FILENAME_TO_BOOK in process_prompts.py if missing."""
    key = txt_filename.replace(".txt", "")
    source = PROCESS_PROMPTS.read_text(encoding="utf-8")

    # Check if mapping already exists
    if f'"{key}"' in source:
        print(f"  Mapping for '{key}' already exists in process_prompts.py")
        return

    # Find the closing brace of FILENAME_TO_BOOK dict and insert before it
    pattern = r"(FILENAME_TO_BOOK\s*=\s*\{.*?)(^\})"
    match = re.search(pattern, source, re.DOTALL | re.MULTILINE)
    if not match:
        print(f"  WARNING: Could not find FILENAME_TO_BOOK dict, add manually:")
        print(f'    "{key}": "{book_name}",')
        return

    new_entry = f'    "{key}": "{book_name}",\n'
    source = source[: match.start(2)] + new_entry + source[match.start(2) :]
    PROCESS_PROMPTS.write_text(source, encoding="utf-8")
    print(f"  Added mapping: '{key}' -> '{book_name}'")


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    mhc_num, book_name, chapters = resolve_book(arg)

    print(f"  Book: {book_name}")

    txt_filename = build_prompt_txt(book_name)
    if not txt_filename:
        return

    ensure_mapping(txt_filename, book_name)

    # Regenerate prompts.json
    print("  Regenerating prompts.json...")
    subprocess.run(
        [sys.executable, str(PROCESS_PROMPTS)],
        check=True,
        cwd=str(PROMPTS_DIR),
    )


if __name__ == "__main__":
    main()
