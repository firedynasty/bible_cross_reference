#!/usr/bin/env python3
"""
Generate fill-in-the-blank (FITB) JSON for every Bible chapter.
Pure local processing — no API calls needed.

Picks 2 memorable words per verse to blank out (1 for short verses).
Skips common KJV words, targets nouns/verbs/names/theological terms.

Usage:
    python generate_fitb.py                          # defaults: en_kjv.json -> en_kjv_fitb.json
    python generate_fitb.py -i public/en_kjv.json -o public/en_kjv_fitb.json
    python generate_fitb.py --book gn               # process only Genesis
    python generate_fitb.py --book gn --chapter 6   # process only Genesis chapter 6
    python generate_fitb.py --blanks 3              # 3 blanks per verse instead of 2
"""

import argparse
import json
import re
import sys
from pathlib import Path


STOPWORDS = {
    "the", "and", "of", "to", "that", "unto", "shall", "was", "is", "in",
    "for", "with", "a", "an", "his", "he", "she", "they", "them", "it",
    "are", "were", "be", "not", "but", "from", "by", "on", "at", "this",
    "which", "their", "thy", "thee", "thou", "him", "her", "my", "upon",
    "into", "out", "said", "shalt", "also", "had", "have", "hath", "there",
    "so", "did", "do", "up", "then", "when", "came", "come", "went",
    "every", "all", "will", "even", "i", "me", "ye", "us", "we", "or",
    "nor", "if", "as", "am", "has", "may", "let", "no", "than", "these",
    "those", "been", "being", "would", "could", "should", "might", "after",
    "before", "how", "what", "who", "whom", "where", "why", "its", "own",
    "such", "both", "each", "other", "some", "any", "because", "yet",
    "our", "your", "you", "o", "oh", "lo", "yea", "nay", "now", "thereof", "therein", "therefore",
    "wherefore", "wherein", "hereby", "thereby", "thus", "hence",
    "saying", "say", "according", "things", "thing", "make", "made",
    "over", "under", "more", "very", "again", "among", "between",
    "about", "through", "set", "put", "take", "taken", "gave", "give",
    "given", "can", "one", "two", "same", "another", "away", "down",
    "brought", "bring", "called", "went", "gone", "go", "see", "seen",
    "saw", "knew", "know", "known", "hear", "heard", "speak", "spoke",
    "spoken", "tell", "told", "sent", "send", "left", "turned",
}


def strip_punct(word: str) -> str:
    return re.sub(r"[.,;:!?'\"\-\(\)\[\]]+", "", word).lower()


def is_good_word(word: str) -> bool:
    clean = strip_punct(word)
    return len(clean) > 2 and clean not in STOPWORDS


def pick_words(verse: str, n: int = 2) -> list[int]:
    """Pick n evenly-spaced meaningful words to blank out."""
    words = verse.split()
    word_count = len(words)

    # Fewer blanks for short verses
    if word_count < 8:
        n = 1
    if word_count < 4:
        n = 0

    candidates = [(i, w) for i, w in enumerate(words) if is_good_word(w)]

    if not candidates or n == 0:
        return []
    if len(candidates) <= n:
        return [i for i, _ in candidates]

    # Spread picks evenly across the verse
    step = len(candidates) / n
    return [candidates[int(step * k + step / 2)][0] for k in range(n)]


def apply_blanks(verse: str, indices: list[int]) -> tuple[str, list[str]]:
    """Replace words at indices with ________ and return (blanked_verse, answers)."""
    words = verse.split()
    answers = []
    for idx in sorted(indices):
        if 0 <= idx < len(words):
            # Store clean word as answer, keep punctuation in the blank placeholder
            raw = words[idx]
            clean = re.sub(r"^[.,;:!?'\"\-\(\)\[\]]+|[.,;:!?'\"\-\(\)\[\]]+$", "", raw)
            answers.append(clean)
            # Preserve surrounding punctuation: "wood;" -> "________;"
            prefix = re.match(r"^([.,;:!?'\"\-\(\)\[\]]*)", raw).group(1)
            suffix = re.search(r"([.,;:!?'\"\-\(\)\[\]]*)$", raw).group(1)
            words[idx] = prefix + "________" + suffix
    return " ".join(words), answers


def process_chapter(verses: list[str], blanks_per_verse: int) -> dict:
    """Process one chapter into FITB format."""
    blanked_verses = []
    answers = []
    for verse in verses:
        indices = pick_words(verse, blanks_per_verse)
        bv, ans = apply_blanks(verse, indices)
        blanked_verses.append(bv)
        answers.append(ans)
    return {"verses": blanked_verses, "answers": answers}


def main():
    parser = argparse.ArgumentParser(description="Generate fill-in-the-blank Bible JSON")
    parser.add_argument("-i", "--input", default="public/en_kjv.json", help="Input Bible JSON")
    parser.add_argument("-o", "--output", default=None, help="Output FITB JSON")
    parser.add_argument("--book", default=None, help="Process only this book abbreviation (e.g. gn)")
    parser.add_argument("--chapter", type=int, default=None, help="Process only this chapter (1-indexed)")
    parser.add_argument("--blanks", type=int, default=2, help="Blanks per verse (default 2)")
    args = parser.parse_args()

    if args.output is None:
        stem = Path(args.input).stem
        args.output = str(Path(args.input).parent / f"{stem}_fitb.json")

    with open(args.input, "r", encoding="utf-8-sig") as f:
        bible = json.load(f)

    print(f"Loaded {len(bible)} books from {args.input}")

    if args.book:
        bible = [b for b in bible if b["abbrev"] == args.book]
        if not bible:
            print(f"Error: book '{args.book}' not found")
            sys.exit(1)

    output = []
    total_chapters = 0

    for book in bible:
        abbrev = book["abbrev"]
        chapters_out = []

        for ch_idx, verses in enumerate(book["chapters"]):
            ch_num = ch_idx + 1

            if args.chapter and args.book and ch_num != args.chapter:
                continue

            chapters_out.append(process_chapter(verses, args.blanks))
            total_chapters += 1

        output.append({"abbrev": abbrev, "chapters": chapters_out})

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Done! {total_chapters} chapters -> {args.output}")


if __name__ == "__main__":
    main()
