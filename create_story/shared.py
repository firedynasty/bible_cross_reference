"""Shared constants and helpers for the storytime pipeline."""

import re
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR    = Path(__file__).parent
CHECKLIST     = SCRIPT_DIR / "storytime_checklist.txt"
MHC_DIR       = Path("/Users/stanleytan/matthew_henry")
PROJECT_ROOT  = SCRIPT_DIR.parent
STORYTIME_OUT = SCRIPT_DIR / "storytime_output"
SUMMARIES_DIR = SCRIPT_DIR / "storytime_summaries"
PUBLIC_JSON   = PROJECT_ROOT / "public" / "storytime.json"

# ── Book mapping (MHC number → name, chapter count, app abbreviation) ───────

BOOK_MAP = {
    "01": ("Genesis", 50, "gn"), "02": ("Exodus", 40, "ex"),
    "03": ("Leviticus", 27, "lv"), "04": ("Numbers", 36, "nm"),
    "05": ("Deuteronomy", 34, "dt"), "06": ("Joshua", 24, "js"),
    "07": ("Judges", 21, "jud"), "08": ("Ruth", 4, "rt"),
    "09": ("1 Samuel", 31, "1sm"), "10": ("2 Samuel", 24, "2sm"),
    "11": ("1 Kings", 22, "1kgs"), "12": ("2 Kings", 25, "2kgs"),
    "13": ("1 Chronicles", 29, "1ch"), "14": ("2 Chronicles", 36, "2ch"),
    "15": ("Ezra", 10, "ezr"), "16": ("Nehemiah", 13, "ne"),
    "17": ("Esther", 10, "et"), "18": ("Job", 42, "job"),
    "19": ("Psalms", 150, "ps"), "20": ("Proverbs", 31, "prv"),
    "21": ("Ecclesiastes", 12, "ec"), "22": ("Song of Solomon", 8, "so"),
    "23": ("Isaiah", 66, "is"), "24": ("Jeremiah", 52, "jr"),
    "25": ("Lamentations", 5, "lm"), "26": ("Ezekiel", 48, "ez"),
    "27": ("Daniel", 12, "dn"), "28": ("Hosea", 14, "ho"),
    "29": ("Joel", 3, "jl"), "30": ("Amos", 9, "am"),
    "31": ("Obadiah", 1, "ob"), "32": ("Jonah", 4, "jn"),
    "33": ("Micah", 7, "mi"), "34": ("Nahum", 3, "na"),
    "35": ("Habakkuk", 3, "hk"), "36": ("Zephaniah", 3, "zp"),
    "37": ("Haggai", 2, "hg"), "38": ("Zechariah", 14, "zc"),
    "39": ("Malachi", 4, "ml"), "40": ("Matthew", 28, "mt"),
    "41": ("Mark", 16, "mk"), "42": ("Luke", 24, "lk"),
    "43": ("John", 21, "jo"), "44": ("Acts", 28, "act"),
    "45": ("Romans", 16, "rm"), "46": ("1 Corinthians", 16, "1co"),
    "47": ("2 Corinthians", 13, "2co"), "48": ("Galatians", 6, "gl"),
    "49": ("Ephesians", 6, "eph"), "50": ("Philippians", 4, "ph"),
    "51": ("Colossians", 4, "cl"), "52": ("1 Thessalonians", 5, "1ts"),
    "53": ("2 Thessalonians", 3, "2ts"), "54": ("1 Timothy", 6, "1tm"),
    "55": ("2 Timothy", 4, "2tm"), "56": ("Titus", 3, "tt"),
    "57": ("Philemon", 1, "phm"), "58": ("Hebrews", 13, "hb"),
    "59": ("James", 5, "jm"), "60": ("1 Peter", 5, "1pe"),
    "61": ("2 Peter", 3, "2pe"), "62": ("1 John", 5, "1jo"),
    "63": ("2 John", 1, "2jo"), "64": ("3 John", 1, "3jo"),
    "65": ("Jude", 1, "jd"), "66": ("Revelation", 22, "re"),
}


# ── Checklist helpers ────────────────────────────────────────────────────────

def read_checklist():
    """Parse checklist, return list of (mhc_num, book_name, chapters, done)."""
    entries = []
    with open(CHECKLIST, "r") as f:
        for line in f:
            m = re.match(r'\[([x ])\]\s+MHC(\d{2})\s*\|\s*(.+?)\s*\|\s*(\d+)\s*ch', line)
            if m:
                done = m.group(1) == 'x'
                mhc_num = m.group(2)
                book_name = m.group(3).strip()
                chapters = int(m.group(4))
                entries.append((mhc_num, book_name, chapters, done))
    return entries


def mark_done(mhc_num):
    """Mark a book as [x] in the checklist file."""
    text = CHECKLIST.read_text()
    text = re.sub(
        rf'\[ \]\s+(MHC{mhc_num})',
        r'[x] \1',
        text
    )
    CHECKLIST.write_text(text)
    print(f"  Marked MHC{mhc_num} as done in checklist")


def find_next_book(specific_mhc=None):
    """Find the next unchecked book. Returns (mhc_num, book_name, chapters) or None."""
    entries = read_checklist()
    if not entries:
        return None

    if specific_mhc:
        for e in entries:
            if e[0] == specific_mhc:
                if e[3]:
                    print(f"MHC{specific_mhc} ({e[1]}) already done. Remove [x] from checklist to re-run.")
                    return None
                return (e[0], e[1], e[2])
        print(f"MHC{specific_mhc} not found in checklist")
        return None

    for e in entries:
        if not e[3]:
            return (e[0], e[1], e[2])

    print("All books are done!")
    return None
