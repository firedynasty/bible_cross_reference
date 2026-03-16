#!/usr/bin/env python3
"""
Extract study/discussion questions from Bible study notes files
and generate a JSON file keyed by book abbreviation and chapter.
"""

import re
import json
import os

# Map book names to app abbreviations
BOOK_ABBREV = {
    'genesis': 'gn', 'exodus': 'ex', 'leviticus': 'lv', 'numbers': 'nm',
    'deuteronomy': 'dt', 'joshua': 'js', 'judges': 'jud', 'ruth': 'rt',
    '1 samuel': '1sm', '2 samuel': '2sm', '1 kings': '1kgs', '2 kings': '2kgs',
    '1 chronicles': '1ch', '2 chronicles': '2ch', 'ezra': 'ezr', 'nehemiah': 'ne',
    'esther': 'et', 'job': 'job', 'psalms': 'ps', 'psalm': 'ps',
    'proverbs': 'prv', 'ecclesiastes': 'ec', 'song of solomon': 'so',
    'isaiah': 'is', 'jeremiah': 'jr', 'lamentations': 'lm', 'ezekiel': 'ez',
    'daniel': 'dn', 'hosea': 'ho', 'joel': 'jl', 'amos': 'am',
    'obadiah': 'ob', 'jonah': 'jn', 'micah': 'mi', 'nahum': 'na',
    'habakkuk': 'hk', 'zephaniah': 'zp', 'haggai': 'hg', 'zechariah': 'zc',
    'malachi': 'ml', 'matthew': 'mt', 'mark': 'mk', 'luke': 'lk',
    'john': 'jo', 'acts': 'act', 'romans': 'rm',
    '1 corinthians': '1co', '2 corinthians': '2co',
    'galatians': 'gl', 'ephesians': 'eph', 'philippians': 'ph',
    'colossians': 'cl', '1 thessalonians': '1ts', '2 thessalonians': '2ts',
    '1 timothy': '1tm', '2 timothy': '2tm', 'titus': 'tt', 'philemon': 'phm',
    'hebrews': 'hb', 'james': 'jm', '1 peter': '1pe', '2 peter': '2pe',
    '1 john': '1jo', '2 john': '2jo', '3 john': '3jo', 'jude': 'jd',
    'revelation': 're',
}

def parse_chapter_refs(text):
    """Extract book name and chapter numbers from a heading like 'Romans 3:21-31'."""
    # Match patterns like "Romans 1:1-17", "Romans 10", "Hebrews 9:1-14"
    pattern = r'((?:\d\s+)?[A-Za-z]+)\s+(\d+)(?::[\d]+-?[\d]*)?'
    matches = re.findall(pattern, text)
    results = []
    for book_name, chapter in matches:
        book_key = book_name.strip().lower()
        abbrev = BOOK_ABBREV.get(book_key)
        if abbrev:
            results.append((abbrev, int(chapter)))
    return results


def extract_questions_from_block(text):
    """Extract individual questions from a block of text."""
    questions = []
    # Split on question marks to find questions
    parts = re.split(r'\?', text)
    for part in parts[:-1]:  # last part after final ? is remainder
        # Clean up the question
        q = part.strip()
        # Remove leading list markers
        q = re.sub(r'^[-*•]\s*', '', q)
        # Remove leading numbers like "1. "
        q = re.sub(r'^\d+\.\s*', '', q)
        # Get just the last sentence if there's commentary before the question
        # A question typically starts after a period or at the start
        lines = q.split('\n')
        # Take the last meaningful line(s)
        q = ' '.join(line.strip() for line in lines if line.strip())
        # If there's a period, take content after the last period (the actual question)
        if '. ' in q:
            # But only if the part after the period looks like a question start
            after_period = q.rsplit('. ', 1)[-1]
            if len(after_period) > 15:  # reasonable question length
                q = after_period
        q = q.strip()
        if len(q) > 10:  # skip very short fragments
            questions.append(q + '?')
    return questions


def process_file(filepath):
    """Process a single notes file and extract questions by book/chapter."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    results = {}  # {(abbrev, chapter): [{"passage": str, "questions": [str]}]}

    # Split into sections by headings
    # Match ## or ### or # headings that contain book references
    sections = re.split(r'(?=^#{1,3}\s+)', content, flags=re.MULTILINE)

    current_refs = []

    for section in sections:
        lines = section.strip().split('\n')
        if not lines:
            continue

        heading = lines[0].strip()

        # Try to extract chapter references from heading
        refs = parse_chapter_refs(heading)
        if refs:
            current_refs = refs

        if not current_refs:
            continue

        # Look for question sections
        question_headers = [
            r'\*\*(?:Key\s+)?Discussion\s+Questions[:\*]*\*\*',
            r'#{1,3}\s+(?:Key\s+)?Discussion\s+Questions',
            r'\*\*Application\s+Questions[:\*]*\*\*',
            r'#{1,3}\s+Application\s+Questions',
        ]

        section_text = '\n'.join(lines)

        for qh_pattern in question_headers:
            qh_matches = list(re.finditer(qh_pattern, section_text, re.IGNORECASE))
            for qh_match in qh_matches:
                # Get text after the question header until next section marker
                start = qh_match.end()
                # Find end: next heading or next bold section or ---
                end_match = re.search(
                    r'\n(?:#{1,3}\s|\*\*(?:Commentary|Verse|Key\s+Word|Outline|Paraphrase|Reasons|Introduction)[:\s*]|---)',
                    section_text[start:],
                    re.IGNORECASE
                )
                if end_match:
                    end = start + end_match.start()
                else:
                    end = len(section_text)

                question_block = section_text[start:end].strip()
                questions = extract_questions_from_block(question_block)

                if questions:
                    # Reconstruct the passage label from heading
                    passage_label = heading.lstrip('#').strip()
                    # Clean up markdown
                    passage_label = re.sub(r'\*+', '', passage_label)

                    for abbrev, chapter in current_refs:
                        key = (abbrev, chapter)
                        if key not in results:
                            results[key] = []
                        results[key].append({
                            'passage': passage_label,
                            'questions': questions,
                        })

    return results


def merge_results(all_results):
    """Merge results from multiple files, deduplicating."""
    merged = {}
    for results in all_results:
        for (abbrev, chapter), entries in results.items():
            if abbrev not in merged:
                merged[abbrev] = {}
            ch_str = str(chapter)
            if ch_str not in merged[abbrev]:
                merged[abbrev][ch_str] = []
            # Avoid duplicate passages
            existing_passages = {e['passage'] for e in merged[abbrev][ch_str]}
            for entry in entries:
                if entry['passage'] not in existing_passages:
                    merged[abbrev][ch_str].append(entry)
                    existing_passages.add(entry['passage'])
    return merged


def main():
    notes_dir = os.path.expanduser(
        '~/Documents/notes/07-spirituality/_presorted/bible-study_new-testament'
    )

    files = [
        os.path.join(notes_dir, f)
        for f in os.listdir(notes_dir)
        if f.endswith('.txt')
    ]

    print(f"Processing {len(files)} files...")

    all_results = []
    for filepath in files:
        print(f"  {os.path.basename(filepath)}")
        results = process_file(filepath)
        if results:
            all_results.append(results)
            for (abbrev, ch), entries in sorted(results.items()):
                total_q = sum(len(e['questions']) for e in entries)
                print(f"    {abbrev} ch{ch}: {total_q} questions")

    merged = merge_results(all_results)

    output_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'public', 'study_questions.json'
    )

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    total = sum(
        sum(len(e['questions']) for e in entries)
        for chapters in merged.values()
        for entries in chapters.values()
    )
    print(f"\nWrote {total} questions to {output_path}")
    print(f"Books covered: {', '.join(sorted(merged.keys()))}")


if __name__ == '__main__':
    main()
