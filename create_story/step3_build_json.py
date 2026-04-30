#!/Users/stanleytan/anaconda3/bin/python3
"""
Step 3: Merge all storytime_output/ books into public/storytime.json.

Scans ./storytime_output/ for .md files, merges with existing storytime.json.

Usage:
    python step3_build_json.py
"""

import json
import re

from shared import STORYTIME_OUT, PUBLIC_JSON, BOOK_MAP


def run():
    print(f"\n== Step 3: Rebuilding {PUBLIC_JSON} ==")

    # Load existing to preserve books not in storytime_output/
    existing = {}
    if PUBLIC_JSON.exists():
        existing = json.loads(PUBLIC_JSON.read_text(encoding='utf-8'))
        print(f"  Loaded {len(existing)} existing entries")

    # Folder name → display name
    folder_to_display = {}
    for mhc_num, (name, chapters, abbrev) in BOOK_MAP.items():
        folder_to_display[name.lower().replace(' ', '_')] = name

    if not STORYTIME_OUT.exists():
        print("  No storytime_output/ found")
        return

    new_count = 0
    for book_dir in sorted(STORYTIME_OUT.iterdir()):
        if not book_dir.is_dir():
            continue
        folder_name = book_dir.name
        display_name = folder_to_display.get(folder_name, folder_name.replace('_', ' ').title())

        files = sorted(book_dir.glob("*.md"),
                       key=lambda f: int(re.findall(r'(\d+)', f.stem)[-1])
                       if re.findall(r'(\d+)', f.stem) else 0)

        for filepath in files:
            nums = re.findall(r'(\d+)', filepath.stem)
            if not nums:
                continue
            chapter = int(nums[-1])
            key = f"{display_name} {chapter}"
            content = filepath.read_text(encoding='utf-8').strip()
            if content:
                existing[key] = content
                new_count += 1

    PUBLIC_JSON.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    total = len(existing)
    books = set(k.rsplit(' ', 1)[0] for k in existing.keys())
    print(f"  Written {total} chapters ({len(books)} books) to {PUBLIC_JSON}")
    print(f"  ({new_count} from storytime_output/)")


if __name__ == "__main__":
    run()
