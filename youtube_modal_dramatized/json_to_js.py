#!/usr/bin/env python3
"""
Convert a chapter-timestamps JSON file into a JS module.

Usage:
  python json_to_js.py <input.json> <output.js> <varName>

Example:
  python json_to_js.py dramatized_chapter_timestamps.json \
      ../src/data/dramatizedChapterTimestamps.js \
      dramatizedChapterTimestamps
"""

import json
import sys
import os


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    input_file, output_file, var_name = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(input_file) as f:
        data = json.load(f)

    lines = [f"const {var_name} = {{"]
    for book, chapters in sorted(data.items()):
        # Convert string keys back to ints and sort
        int_chapters = {int(k): v for k, v in chapters.items()}
        pairs = ', '.join(f"{ch}: {secs}" for ch, secs in sorted(int_chapters.items()))
        lines.append(f"  '{book}': {{ {pairs} }},")
    lines.append("};")
    lines.append(f"\nexport default {var_name};")

    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
    with open(output_file, 'w') as f:
        f.write('\n'.join(lines) + '\n')

    print(f"Wrote {output_file}  ({len(data)} books)")


if __name__ == '__main__':
    main()
