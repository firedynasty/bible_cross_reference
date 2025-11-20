#!/usr/bin/env python3
"""
Compare en_kjv.json and en_web.json to find missing chapters.
"""

import json

def load_bible(filepath):
    """Load a Bible JSON file and return as a dict keyed by abbreviation."""
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    bible_dict = {}
    for book in data:
        abbrev = book['abbrev']
        chapters = book['chapters']
        bible_dict[abbrev] = {
            'chapters': chapters,
            'chapter_count': len(chapters)
        }

    return bible_dict

def compare_bibles(kjv_file, web_file):
    """Compare two Bible files and report differences."""
    print("Loading Bibles...")
    kjv = load_bible(kjv_file)
    web = load_bible(web_file)

    print(f"\nKJV has {len(kjv)} books")
    print(f"WEB has {len(web)} books\n")

    print("=" * 80)
    print("COMPARISON REPORT")
    print("=" * 80)

    issues_found = False

    # Check each book in KJV
    for abbrev in sorted(kjv.keys()):
        kjv_chapters = kjv[abbrev]['chapter_count']

        if abbrev not in web:
            print(f"❌ {abbrev:6} - MISSING from WEB (KJV has {kjv_chapters} chapters)")
            issues_found = True
        else:
            web_chapters = web[abbrev]['chapter_count']

            if kjv_chapters != web_chapters:
                print(f"⚠️  {abbrev:6} - KJV: {kjv_chapters:3} chapters | WEB: {web_chapters:3} chapters | DIFF: {web_chapters - kjv_chapters:+3}")
                issues_found = True

    # Check for books in WEB but not in KJV
    for abbrev in sorted(web.keys()):
        if abbrev not in kjv:
            web_chapters = web[abbrev]['chapter_count']
            print(f"➕ {abbrev:6} - EXTRA in WEB ({web_chapters} chapters, not in KJV)")
            issues_found = True

    if not issues_found:
        print("\n✅ All books match perfectly!")
    else:
        print("\n" + "=" * 80)
        print("\nDETAILED MISSING CHAPTERS:")
        print("=" * 80)

        for abbrev in sorted(kjv.keys()):
            if abbrev in web:
                kjv_chapters = kjv[abbrev]['chapter_count']
                web_chapters = web[abbrev]['chapter_count']

                if kjv_chapters != web_chapters:
                    print(f"\n{abbrev} - Missing chapters: {web_chapters + 1} to {kjv_chapters}")

                    # Show verse counts for first few chapters to verify data
                    print(f"  First few chapters (verse count):")
                    for i in range(min(3, web_chapters)):
                        kjv_verses = len(kjv[abbrev]['chapters'][i])
                        web_verses = len(web[abbrev]['chapters'][i])
                        match = "✓" if kjv_verses == web_verses else "✗"
                        print(f"    Chapter {i+1}: KJV={kjv_verses:3} verses, WEB={web_verses:3} verses {match}")

if __name__ == "__main__":
    compare_bibles("./build/en_kjv.json", "./build/en_web.json")
