#!/bin/bash
#
# Story Time Pipeline — run one book at a time
#
# Usage:
#   ./run.sh                  # next unchecked book from checklist
#   ./run.sh 06               # specific book by MHC number (Joshua)
#   ./run.sh Joshua           # specific book by name
#   ./run.sh --dry-run        # show which book is next without running
#
# Requires env vars:
#   OPENAI_API_KEY      — for step 1 (MHC summarization) and step 2 (story generation)
#
# Steps:
#   1. Extract MHC HTML + summarize with Anthropic  → storytime_summaries/
#   2. Generate Story Time narrative with OpenAI     → storytime_output/
#   3. Merge into public/storytime.json
#   4. Concatenate chapter .md files → prompts/{book}.txt → prompts.json
#   5. Mark [x] in storytime_checklist.txt

set -e
cd "$(dirname "$0")"

# ── Check env vars ───────────────────────────────────────────────────────────

if [[ "$1" == "--dry-run" ]]; then
    python3 -c "
from shared import find_next_book
book = find_next_book()
if book:
    print(f'Next book: MHC{book[0]} | {book[1]} | {book[2]} chapters')
"
    exit 0
fi

if [[ -z "$OPENAI_API_KEY" ]]; then
    echo "ERROR: Set OPENAI_API_KEY env var"
    exit 1
fi

BOOK_ARG="${1:-}"

# ── Step 1: Extract MHC + Summarize with Anthropic ──────────────────────────

echo ""
echo "========================================"
echo "  STEP 1: Extract & Summarize MHC"
echo "========================================"
python3 step1_extract_and_summarize.py "$BOOK_ARG"

# ── Step 2: Generate Story Time with OpenAI ──────────────────────────────────

echo ""
echo "========================================"
echo "  STEP 2: Generate Story Time"
echo "========================================"
python3 step2_generate_story.py "$BOOK_ARG"

# ── Step 3: Build storytime.json ─────────────────────────────────────────────

echo ""
echo "========================================"
echo "  STEP 3: Build storytime.json"
echo "========================================"
python3 step3_build_json.py

# ── Step 4: Build prompt .txt and regenerate prompts.json ────────────────────

echo ""
echo "========================================"
echo "  STEP 4: Build Prompt File"
echo "========================================"
python3 step4_build_prompt.py "$BOOK_ARG"

# ── Step 5: Mark done in checklist ───────────────────────────────────────────

python3 -c "
from shared import find_next_book, mark_done
# Re-read to find the book we just processed (same logic as steps above)
import sys
arg = '$BOOK_ARG' or None
if arg:
    import re
    from shared import BOOK_MAP
    if re.match(r'^\d{2}$', arg):
        mark_done(arg)
    else:
        for mhc_num, (name, ch, _) in BOOK_MAP.items():
            if name.lower() == arg.lower():
                mark_done(mhc_num)
                break
else:
    from shared import read_checklist
    for e in read_checklist():
        if not e[3]:
            mark_done(e[0])
            break
"

echo ""
echo "========================================"
echo "  DONE — run again for the next book"
echo "========================================"
