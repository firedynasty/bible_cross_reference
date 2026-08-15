#!/bin/bash
#
# Story Time Pipeline — run all remaining books in checklist order
#
# Usage:
#   ./run_all.sh              # run all unchecked books
#   ./run_all.sh --dry-run    # show what would run without doing it
#
# Requires env vars:
#   OPENAI_API_KEY   — for step 1 (MHC summarization) and step 2 (story generation)
#
# Books already marked [x] in storytime_checklist.txt are skipped automatically.

set -e
cd "$(dirname "$0")"

DRY_RUN=0
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=1
fi

if [[ $DRY_RUN -eq 0 && -z "$OPENAI_API_KEY" ]]; then
    echo "ERROR: Set OPENAI_API_KEY env var"
    exit 1
fi

# Parse checklist and collect unchecked books
BOOKS=()
while IFS= read -r line; do
    if [[ "$line" =~ ^\[\ \]\ MHC[0-9]+\ \|\ (.+)\ \|\ +[0-9]+ ]]; then
        book="${BASH_REMATCH[1]}"
        book="$(echo "$book" | xargs)"   # trim whitespace
        BOOKS+=("$book")
    fi
done < storytime_checklist.txt

TOTAL=${#BOOKS[@]}

if [[ $TOTAL -eq 0 ]]; then
    echo "All books are already done!"
    exit 0
fi

echo ""
echo "========================================"
echo "  Books remaining: $TOTAL"
for b in "${BOOKS[@]}"; do echo "    - $b"; done
echo "========================================"

if [[ $DRY_RUN -eq 1 ]]; then
    echo ""
    echo "(dry-run — not running anything)"
    exit 0
fi

COUNT=0
for BOOK in "${BOOKS[@]}"; do
    COUNT=$((COUNT + 1))
    echo ""
    echo "###################################################"
    echo "  [$COUNT/$TOTAL] Starting: $BOOK"
    echo "###################################################"

    ./run.sh "$BOOK"

    echo ""
    echo "  ✓ $BOOK complete"
done

echo ""
echo "========================================"
echo "  All $TOTAL books done!"
echo "========================================"
