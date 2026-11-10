#!/Users/stanleytan/anaconda3/bin/python3
"""
Generate concise, reference-style chapter summaries for all 66 books.

Source text is the Berean Standard Bible already in the app
(public/en_bsb.json, public domain). Where a Matthew Henry chapter summary
already exists from the storytime pipeline
(create_story/storytime_summaries/<book>/ch###.txt), it is passed in as
background so the model has the traditional reading in view -- but the output
voice is deliberately neutral and structural, not devotional.

Each chapter is written to its own JSON file so the run is resumable, then
combined into public/chapter_summaries.json keyed "Genesis 1", matching the
shape storytime.json uses.

Usage:
    python generate_chapter_summaries.py "1 John"              # one book
    python generate_chapter_summaries.py "1 John" 3            # one chapter
    python generate_chapter_summaries.py all --limit 5         # try 5 chapters
    python generate_chapter_summaries.py all                   # whole Bible
    python generate_chapter_summaries.py all --dry-run         # no API calls
    python generate_chapter_summaries.py --combine-only        # rebuild JSON

Requires: OPENAI_API_KEY env var
"""

import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_DIR = Path(__file__).resolve().parent
BSB_JSON = REPO_DIR / "public" / "en_bsb.json"
MHC_SUMMARIES = REPO_DIR / "create_story" / "storytime_summaries"
WORK_DIR = REPO_DIR / "create_story" / "chapter_summaries"
PUBLIC_JSON = REPO_DIR / "public" / "chapter_summaries.json"
FAILURE_REPORT = REPO_DIR / "chapter_summaries_failures.txt"

DEFAULT_MODEL = "gpt-6-luna"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# Same rates generate_chinese_breakdown_openai.py reports with. Update if the
# published price for this model changes.
INPUT_USD_PER_MILLION = 0.10
OUTPUT_USD_PER_MILLION = 0.50

# (display name, chapter count, app abbreviation) in canonical order.
BOOKS = [
    ("Genesis", 50, "gn"), ("Exodus", 40, "ex"), ("Leviticus", 27, "lv"),
    ("Numbers", 36, "nm"), ("Deuteronomy", 34, "dt"), ("Joshua", 24, "js"),
    ("Judges", 21, "jud"), ("Ruth", 4, "rt"), ("1 Samuel", 31, "1sm"),
    ("2 Samuel", 24, "2sm"), ("1 Kings", 22, "1kgs"), ("2 Kings", 25, "2kgs"),
    ("1 Chronicles", 29, "1ch"), ("2 Chronicles", 36, "2ch"), ("Ezra", 10, "ezr"),
    ("Nehemiah", 13, "ne"), ("Esther", 10, "et"), ("Job", 42, "job"),
    ("Psalms", 150, "ps"), ("Proverbs", 31, "prv"), ("Ecclesiastes", 12, "ec"),
    ("Song of Solomon", 8, "so"), ("Isaiah", 66, "is"), ("Jeremiah", 52, "jr"),
    ("Lamentations", 5, "lm"), ("Ezekiel", 48, "ez"), ("Daniel", 12, "dn"),
    ("Hosea", 14, "ho"), ("Joel", 3, "jl"), ("Amos", 9, "am"),
    ("Obadiah", 1, "ob"), ("Jonah", 4, "jn"), ("Micah", 7, "mi"),
    ("Nahum", 3, "na"), ("Habakkuk", 3, "hk"), ("Zephaniah", 3, "zp"),
    ("Haggai", 2, "hg"), ("Zechariah", 14, "zc"), ("Malachi", 4, "ml"),
    ("Matthew", 28, "mt"), ("Mark", 16, "mk"), ("Luke", 24, "lk"),
    ("John", 21, "jo"), ("Acts", 28, "act"), ("Romans", 16, "rm"),
    ("1 Corinthians", 16, "1co"), ("2 Corinthians", 13, "2co"),
    ("Galatians", 6, "gl"), ("Ephesians", 6, "eph"), ("Philippians", 4, "ph"),
    ("Colossians", 4, "cl"), ("1 Thessalonians", 5, "1ts"),
    ("2 Thessalonians", 3, "2ts"), ("1 Timothy", 6, "1tm"),
    ("2 Timothy", 4, "2tm"), ("Titus", 3, "tt"), ("Philemon", 1, "phm"),
    ("Hebrews", 13, "hb"), ("James", 5, "jm"), ("1 Peter", 5, "1pe"),
    ("2 Peter", 3, "2pe"), ("1 John", 5, "1jo"), ("2 John", 1, "2jo"),
    ("3 John", 1, "3jo"), ("Jude", 1, "jd"), ("Revelation", 22, "re"),
]

NAME_BY_ABBREV = {abbrev: name for name, _, abbrev in BOOKS}
ABBREV_BY_NAME = {name: abbrev for name, _, abbrev in BOOKS}
BOOK_NAMES = [name for name, _, _ in BOOKS]


def slug_of(book_name: str) -> str:
    """"1 John" -> "1_john", matching the storytime_summaries folder names."""
    return book_name.lower().replace(" ", "_")


# ---------------------------------------------------------------------------
# Prompt and schema
# ---------------------------------------------------------------------------

SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "overview": {
            "type": "string",
            "description": (
                "Two sentences stating what happens or what is argued in this "
                "chapter. Present tense, third person, neutral."
            ),
        },
        "sections": {
            "type": "array",
            "description": (
                "Two to five contiguous verse blocks that together cover the "
                "whole chapter, in verse order."
            ),
            "items": {
                "type": "object",
                "properties": {
                    "start_verse": {"type": "integer"},
                    "end_verse": {"type": "integer"},
                    "heading": {
                        "type": "string",
                        "description": "Three to ten words, a noun phrase or short clause.",
                    },
                },
                "required": ["start_verse", "end_verse", "heading"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["overview", "sections"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You write chapter overviews for a Bible reference app, in the
register of a study-Bible chapter header: compact, neutral, and structural.

Rules for the overview:
- Exactly two sentences. Present tense, third person.
- State what happens (narrative) or what is argued (epistle, prophecy, poetry).
- Name the people, places and claims that actually carry the chapter.
- No application, no exhortation, no second person, no rhetorical questions.
- Do not address the reader. Do not moralize. Do not preach.
- No archaic diction. Write plain contemporary English.

Rules for the sections:
- Two to five blocks, in verse order, contiguous, with no gaps and no overlaps.
- The first block starts at verse 1; the last block ends at the chapter's final verse.
- Each heading is a short descriptive label, not a sentence and not a summary.

Return only the requested JSON object."""


def build_user_prompt(book: str, chapter: int, verses: list[str], commentary: str | None) -> str:
    numbered = "\n".join(f"{i}. {verse}" for i, verse in enumerate(verses, start=1))
    parts = [
        f"{book} chapter {chapter}, {len(verses)} verses, Berean Standard Bible.\n",
        "Write the overview and the section breakdown for this chapter. "
        f"Section verse numbers must fall between 1 and {len(verses)}.\n",
        f"Text:\n{numbered}",
    ]
    if commentary:
        parts.append(
            "\nBackground -- a summary of Matthew Henry's commentary on this "
            "chapter, for reference on how the chapter has traditionally been "
            "divided and read. Use it to get the structure right. Do NOT adopt "
            "its devotional voice, its applications, or its archaic phrasing, "
            "and do not mention Henry:\n"
            f"{commentary}"
        )
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Source data
# ---------------------------------------------------------------------------

def load_bsb() -> dict[str, list[list[str]]]:
    """abbrev -> list of chapters, each a list of verse strings."""
    if not BSB_JSON.is_file():
        raise RuntimeError(f"Could not find the BSB text at {BSB_JSON}")
    raw = json.loads(BSB_JSON.read_text(encoding="utf-8"))
    books = {}
    for entry in raw:
        abbrev = entry.get("abbrev")
        if abbrev:
            books[abbrev] = entry.get("chapters", [])
    missing = [name for name, _, abbrev in BOOKS if abbrev not in books]
    if missing:
        raise RuntimeError(f"BSB JSON is missing book(s): {', '.join(missing)}")
    return books


def read_commentary(book_name: str, chapter: int) -> str | None:
    path = MHC_SUMMARIES / slug_of(book_name) / f"ch{chapter:03d}.txt"
    if not path.is_file():
        return None
    text = path.read_text(encoding="utf-8").strip()
    return text or None


def clean_verse(text: str) -> str:
    # BSB entries occasionally carry bracketed footnote markers; drop them so
    # the model is not tempted to quote them in a heading.
    return re.sub(r"\s+", " ", re.sub(r"\[\d+\]", "", str(text))).strip()


# ---------------------------------------------------------------------------
# API call
# ---------------------------------------------------------------------------

def ask_openai(
    book: str,
    chapter: int,
    verses: list[str],
    commentary: str | None,
    model: str,
    reasoning_effort: str,
    timeout: int,
) -> tuple[dict, dict]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in this terminal.")

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(book, chapter, verses, commentary)},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "bible_chapter_summary",
                "strict": True,
                "schema": SUMMARY_SCHEMA,
            },
        },
        "max_completion_tokens": 4000,
    }
    if reasoning_effort != "default":
        body["reasoning_effort"] = reasoning_effort

    request = urllib.request.Request(
        OPENAI_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API returned HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach the OpenAI API: {exc}") from exc
    try:
        result = json.loads(payload["choices"][0]["message"]["content"])
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"OpenAI returned invalid JSON content: {exc}") from exc
    return result, payload.get("usage", {})


def validate_summary(result: dict, verse_count: int) -> dict:
    """Check the model's ranges against the real chapter, then normalise."""
    overview = str(result.get("overview", "")).strip()
    if not overview:
        raise ValueError("overview came back empty")

    sections = result.get("sections") or []
    if not isinstance(sections, list) or not sections:
        raise ValueError("sections came back empty")

    cleaned = []
    for section in sections:
        try:
            start = int(section["start_verse"])
            end = int(section["end_verse"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"section has unusable verse numbers: {section!r}") from exc
        heading = str(section.get("heading", "")).strip()
        if not heading:
            raise ValueError(f"section {start}-{end} has no heading")
        if not 1 <= start <= end <= verse_count:
            raise ValueError(
                f"section {start}-{end} falls outside verses 1-{verse_count}"
            )
        cleaned.append({"start_verse": start, "end_verse": end, "heading": heading})

    cleaned.sort(key=lambda item: (item["start_verse"], item["end_verse"]))
    if cleaned[0]["start_verse"] != 1:
        raise ValueError(f"sections start at verse {cleaned[0]['start_verse']}, not 1")
    if cleaned[-1]["end_verse"] != verse_count:
        raise ValueError(
            f"sections end at verse {cleaned[-1]['end_verse']}, not {verse_count}"
        )
    for earlier, later in zip(cleaned, cleaned[1:]):
        if later["start_verse"] != earlier["end_verse"] + 1:
            raise ValueError(
                f"sections are not contiguous: {earlier['end_verse']} then "
                f"{later['start_verse']}"
            )
    return {"overview": overview, "sections": cleaned}


def summarize_with_retries(
    book: str,
    chapter: int,
    verses: list[str],
    commentary: str | None,
    args: argparse.Namespace,
) -> tuple[dict, int, int]:
    last_error: Exception | None = None
    input_tokens = output_tokens = 0
    for attempt in range(args.retries + 1):
        try:
            result, usage = ask_openai(
                book, chapter, verses, commentary, args.model,
                args.reasoning_effort, args.timeout,
            )
            input_tokens += int(usage.get("prompt_tokens", 0))
            output_tokens += int(usage.get("completion_tokens", 0))
            return validate_summary(result, len(verses)), input_tokens, output_tokens
        except (ValueError, RuntimeError) as exc:
            last_error = exc
            if attempt < args.retries:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"could not get a usable summary: {last_error}")


# ---------------------------------------------------------------------------
# Paths, targets
# ---------------------------------------------------------------------------

def output_path(book_name: str, chapter: int) -> Path:
    return WORK_DIR / slug_of(book_name) / f"ch{chapter:03d}.json"


def resolve_book(name: str) -> str:
    wanted = name.strip().lower().replace("_", " ")
    for book in BOOK_NAMES:
        if book.lower() == wanted:
            return book
    if wanted in NAME_BY_ABBREV:
        return NAME_BY_ABBREV[wanted]
    raise RuntimeError(
        f"Unknown book {name!r}. Use a name like Genesis, '1 Samuel', "
        "'Song of Solomon', an abbreviation like 1sm, or 'all'."
    )


def plan_targets(
    book_argument: str | None,
    chapter_argument: int | None,
    bsb: dict[str, list[list[str]]],
) -> list[tuple[str, int]]:
    if book_argument is None or book_argument.lower() in {"all", "bible"}:
        if chapter_argument is not None:
            raise RuntimeError("A chapter number needs a book name.")
        return [
            (name, chapter)
            for name, _, abbrev in BOOKS
            for chapter in range(1, len(bsb[abbrev]) + 1)
        ]
    book = resolve_book(book_argument)
    available = len(bsb[ABBREV_BY_NAME[book]])
    if chapter_argument is not None:
        if not 1 <= chapter_argument <= available:
            raise RuntimeError(f"{book} has {available} chapters in the BSB text.")
        return [(book, chapter_argument)]
    return [(book, chapter) for chapter in range(1, available + 1)]


# ---------------------------------------------------------------------------
# Per-chapter work
# ---------------------------------------------------------------------------

class ChapterResult:
    def __init__(self, book: str, chapter: int):
        self.book = book
        self.chapter = chapter
        self.status = "ok"          # ok | skipped | failed | dry-run
        self.verses = 0
        self.sections = 0
        self.grounded = False
        self.input_tokens = 0
        self.output_tokens = 0
        self.error: str | None = None
        self.seconds = 0.0

    @property
    def cost(self) -> float:
        return (
            self.input_tokens * INPUT_USD_PER_MILLION
            + self.output_tokens * OUTPUT_USD_PER_MILLION
        ) / 1_000_000


def generate_chapter(
    book: str,
    chapter: int,
    bsb: dict[str, list[list[str]]],
    args: argparse.Namespace,
) -> ChapterResult:
    result = ChapterResult(book, chapter)
    started = time.monotonic()
    destination = output_path(book, chapter)
    if destination.exists() and not args.overwrite:
        result.status = "skipped"
        return result

    try:
        chapters = bsb[ABBREV_BY_NAME[book]]
        verses = [clean_verse(v) for v in chapters[chapter - 1]]
        verses = [v for v in verses if v]
        if not verses:
            raise RuntimeError("no verse text in the BSB source for this chapter")
        result.verses = len(verses)

        commentary = None if args.no_commentary else read_commentary(book, chapter)
        result.grounded = commentary is not None

        if args.dry_run:
            result.status = "dry-run"
            return result

        summary, input_tokens, output_tokens = summarize_with_retries(
            book, chapter, verses, commentary, args
        )
        result.input_tokens = input_tokens
        result.output_tokens = output_tokens
        result.sections = len(summary["sections"])

        payload = {
            "book": book,
            "chapter": chapter,
            "abbrev": ABBREV_BY_NAME[book],
            "verse_count": len(verses),
            "model": args.model,
            "grounded_in_commentary": result.grounded,
            **summary,
        }
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    except Exception as exc:  # one bad chapter must not stop the run
        result.status = "failed"
        result.error = str(exc)
    finally:
        result.seconds = time.monotonic() - started
    return result


# ---------------------------------------------------------------------------
# Combine
# ---------------------------------------------------------------------------

def run_combiner() -> None:
    print(f"\n== Rebuilding {PUBLIC_JSON.relative_to(REPO_DIR)} ==")
    combined = {}
    if PUBLIC_JSON.exists():
        try:
            combined = json.loads(PUBLIC_JSON.read_text(encoding="utf-8"))
            print(f"  Loaded {len(combined)} existing entries")
        except json.JSONDecodeError:
            print("  Existing file was not valid JSON; starting fresh")
            combined = {}

    if not WORK_DIR.exists():
        print(f"  No {WORK_DIR.relative_to(REPO_DIR)} yet; nothing to combine")
        return

    slug_to_name = {slug_of(name): name for name, _, _ in BOOKS}
    added = 0
    for path in sorted(WORK_DIR.rglob("ch*.json")):
        book = slug_to_name.get(path.parent.name)
        if not book:
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"  Skipping unreadable {path.name} in {path.parent.name}", file=sys.stderr)
            continue
        key = f"{book} {payload.get('chapter', int(path.stem[2:]))}"
        if key not in combined:
            added += 1
        combined[key] = {
            "overview": payload["overview"],
            "sections": payload["sections"],
        }

    ordered = {}
    for name, _, _ in BOOKS:
        for key in sorted(
            (k for k in combined if k.rsplit(" ", 1)[0] == name),
            key=lambda k: int(k.rsplit(" ", 1)[1]),
        ):
            ordered[key] = combined[key]
    for key in combined:  # keep anything that did not match a known book
        ordered.setdefault(key, combined[key])

    PUBLIC_JSON.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_JSON.write_text(
        json.dumps(ordered, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    size_kb = PUBLIC_JSON.stat().st_size / 1024
    print(f"  Wrote {len(ordered)} chapters ({added} new), {size_kb:.0f} KB")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "book", nargs="?",
        help='book name or abbreviation, or "all" for the whole Bible',
    )
    parser.add_argument("chapter", nargs="?", type=int, help="chapter number (omit for the whole book)")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--reasoning-effort", default="low",
        help='reasoning effort to request, or "default" to omit the field (default: low)',
    )
    parser.add_argument("--workers", type=int, default=4, help="chapters summarized in parallel")
    parser.add_argument("--limit", type=int, help="stop after this many chapters are generated")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--overwrite", action="store_true", help="regenerate chapters already on disk")
    parser.add_argument(
        "--no-commentary", action="store_true",
        help="ignore the Matthew Henry summaries and work from the BSB text alone",
    )
    parser.add_argument("--dry-run", action="store_true", help="plan only; make no API calls")
    parser.add_argument("--no-combine", action="store_true", help="skip rebuilding public/chapter_summaries.json")
    parser.add_argument("--combine-only", action="store_true", help="just rebuild the public JSON and exit")
    args = parser.parse_args()

    if args.combine_only:
        run_combiner()
        return
    if args.workers < 1:
        parser.error("--workers must be at least 1")
    if args.retries < 0:
        parser.error("--retries cannot be negative")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    if args.book is None:
        parser.error('name a book, or "all" for the whole Bible')

    bsb = load_bsb()
    targets = plan_targets(args.book, args.chapter, bsb)
    pending = [
        (book, chapter)
        for book, chapter in targets
        if args.overwrite or not output_path(book, chapter).exists()
    ]
    already = len(targets) - len(pending)
    if args.limit is not None:
        pending = pending[: args.limit]

    grounded = sum(1 for book, chapter in pending if read_commentary(book, chapter))
    print(
        f"{len(targets)} chapter(s) requested; {already} already generated; "
        f"{len(pending)} to do "
        f"({grounded} with a Matthew Henry summary to lean on)."
    )
    if not pending:
        if not args.dry_run and not args.no_combine:
            run_combiner()
        return

    results: list[ChapterResult] = []
    totals = {"input": 0, "output": 0, "ok": 0, "failed": 0}
    lock = threading.Lock()
    started = time.monotonic()
    workers = 1 if args.dry_run else args.workers

    def report(result: ChapterResult) -> None:
        with lock:
            results.append(result)
            totals["input"] += result.input_tokens
            totals["output"] += result.output_tokens
            if result.status == "failed":
                totals["failed"] += 1
            elif result.status in {"ok", "dry-run"}:
                totals["ok"] += 1
            done = len(results)
            run_cost = (
                totals["input"] * INPUT_USD_PER_MILLION
                + totals["output"] * OUTPUT_USD_PER_MILLION
            ) / 1_000_000
            label = f"{result.book} {result.chapter}"
            mark = "+mhc" if result.grounded else "bsb only"
            if result.status == "failed":
                print(f"[{done}/{len(pending)}] {label}: FAILED -- {result.error}", file=sys.stderr)
            elif result.status == "dry-run":
                print(f"[{done}/{len(pending)}] {label}: {result.verses} verses, {mark}")
            else:
                print(
                    f"[{done}/{len(pending)}] {label}: {result.verses} verses, "
                    f"{result.sections} sections, {mark}, {result.seconds:.0f}s, "
                    f"${result.cost:.4f} -- run total ${run_cost:.2f}"
                )

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(generate_chapter, book, chapter, bsb, args): (book, chapter)
                for book, chapter in pending
            }
            for future in as_completed(futures):
                report(future.result())
    except KeyboardInterrupt:
        print("\nInterrupted. Finished chapters are on disk; re-run to resume.", file=sys.stderr)

    elapsed = time.monotonic() - started
    run_cost = (
        totals["input"] * INPUT_USD_PER_MILLION
        + totals["output"] * OUTPUT_USD_PER_MILLION
    ) / 1_000_000
    print(f"\nDone: {totals['ok']} chapter(s) in {elapsed / 60:.1f} min.")
    if not args.dry_run:
        print(
            f"API usage: {totals['input']:,} input + {totals['output']:,} output tokens; "
            f"estimated cost ${run_cost:.4f} at the rates set in this script."
        )

    failures = [r for r in results if r.status == "failed"]
    if failures:
        FAILURE_REPORT.write_text(
            "\n".join(
                f"{r.book} {r.chapter}\t{r.error}"
                for r in sorted(failures, key=lambda item: (item.book, item.chapter))
            ) + "\n",
            encoding="utf-8",
        )
        print(f"\n{len(failures)} chapter(s) failed; details in {FAILURE_REPORT.name}.")
        print("Re-run the same command to retry only those chapters.")

    if not args.dry_run and not args.no_combine:
        run_combiner()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, OSError) as exc:
        sys.exit(f"ERROR: {exc}")
