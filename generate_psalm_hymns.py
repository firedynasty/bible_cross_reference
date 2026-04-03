#!/usr/bin/env python3
"""
Generate psalm_hymns.json — maps each Psalm (1-150) to recommended hymns
from the 1955 Hymnary CSV, using OpenAI to find thematic connections.

Usage:
    python generate_psalm_hymns.py

Requires:
    - OPENAI_API_KEY environment variable
    - public/en_kjv.json (KJV Bible)
    - hymnary CSV file (path set below)

Output:
    public/psalm_hymns.json
"""

import json
import csv
import os
import time
import sys
from openai import OpenAI

# --- Configuration ---
KJV_PATH = os.path.join(os.path.dirname(__file__), "public", "en_kjv.json")
CSV_PATH = "/Users/stanleytan/documents/technical/python/53-webpage_scraper/hymnary_h1955_all_topics.csv"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "psalm_hymns.json")
MODEL = "gpt-4o"  # faster and higher quality
BATCH_SIZE = 15  # Psalms per API call to reduce total calls

# --- Load KJV Psalms ---
def load_psalms():
    with open(KJV_PATH, encoding="utf-8-sig") as f:
        bible = json.load(f)
    for book in bible:
        if book["abbrev"] == "ps":
            return book["chapters"]  # list of 150 chapters, each a list of verse strings
    raise ValueError("Psalms not found in KJV data")

# --- Load Hymnal CSV ---
def load_hymnal():
    hymns = []
    seen = set()
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            hymn_num = row.get("Hymn #", "").strip()
            first_line = row.get("First Line", "").strip()
            topic = row.get("Topic", "").strip()
            sub_topic = row.get("Sub-Topic", "").strip()
            if hymn_num and hymn_num not in seen:
                seen.add(hymn_num)
                hymns.append({
                    "number": hymn_num,
                    "first_line": first_line,
                    "topic": topic,
                    "sub_topic": sub_topic
                })
    return hymns

def build_hymnal_summary(hymns):
    """Build a compact string of all hymns for the prompt."""
    lines = []
    for h in hymns:
        topic_str = h["topic"]
        if h["sub_topic"]:
            topic_str += f" > {h['sub_topic']}"
        lines.append(f"{h['number']}: \"{h['first_line']}\" [{topic_str}]")
    return "\n".join(lines)

# --- Build prompt for a batch of Psalms ---
def build_batch_prompt(psalm_texts_batch, hymnal_summary):
    """
    psalm_texts_batch: list of (psalm_number, full_text) tuples
    """
    psalms_section = ""
    for ps_num, text in psalm_texts_batch:
        # Truncate very long psalms (e.g., Psalm 119) to keep token usage reasonable
        truncated = text[:2000] + ("..." if len(text) > 2000 else "")
        psalms_section += f"\n--- Psalm {ps_num} ---\n{truncated}\n"

    psalm_numbers = [str(ps_num) for ps_num, _ in psalm_texts_batch]

    return f"""You are a worship planning assistant. Given the following Psalms and a hymnal index, recommend 2-4 hymns from the hymnal for EACH Psalm based on thematic, theological, or textual connections.

{psalms_section}

=== HYMNAL INDEX (1955 Hymnary) ===
{hymnal_summary}

For EACH of the following Psalms: {', '.join(psalm_numbers)}

Return a JSON object where each key is the Psalm number (as a string) and the value is an array of objects with:
- "hymn_number": the hymn number (e.g. "#23")
- "first_line": the first line of the hymn
- "reason": a brief 1-2 sentence explanation of the connection

Return ONLY valid JSON, no markdown fences, no extra text. Example format:
{{"1": [{{"hymn_number": "#1", "first_line": "Praise ye the Lord...", "reason": "Both celebrate..."}}], "2": [...]}}"""

# --- Main ---
def main():
    print("Loading KJV Psalms...")
    chapters = load_psalms()
    print(f"  Found {len(chapters)} Psalms")

    print("Loading hymnal CSV...")
    hymns = load_hymnal()
    print(f"  Found {len(hymns)} unique hymns")

    hymnal_summary = build_hymnal_summary(hymns)
    print(f"  Hymnal summary: {len(hymnal_summary)} chars")

    client = OpenAI()  # uses OPENAI_API_KEY from env

    # Load existing progress if any (resume support)
    result = {}
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, encoding="utf-8") as f:
                result = json.load(f)
            print(f"  Resuming: {len(result)} Psalms already processed")
        except (json.JSONDecodeError, IOError):
            result = {}

    # Build list of Psalms still to process
    all_psalms = []
    for i, verses in enumerate(chapters):
        ps_num = i + 1
        if str(ps_num) in result:
            continue
        full_text = "\n".join(f"{j+1}. {v}" for j, v in enumerate(verses))
        all_psalms.append((ps_num, full_text))

    print(f"  {len(all_psalms)} Psalms remaining to process")

    # Process in batches
    for batch_start in range(0, len(all_psalms), BATCH_SIZE):
        batch = all_psalms[batch_start:batch_start + BATCH_SIZE]
        ps_nums = [ps[0] for ps in batch]
        print(f"  Processing Psalms {ps_nums}...")

        prompt = build_batch_prompt(batch, hymnal_summary)

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=4000,
            )
            content = response.choices[0].message.content.strip()

            # Strip markdown fences if present
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content[:-3]

            batch_result = json.loads(content)

            for ps_num, _ in batch:
                key = str(ps_num)
                if key in batch_result:
                    result[key] = batch_result[key]
                else:
                    print(f"    WARNING: Psalm {ps_num} missing from response")

            # Save after each batch (resume support)
            with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"    Done. Total saved: {len(result)}/150")

        except json.JSONDecodeError as e:
            print(f"    ERROR parsing JSON for Psalms {ps_nums}: {e}")
            print(f"    Raw response: {content[:500]}")
            # Continue to next batch
        except Exception as e:
            print(f"    ERROR for Psalms {ps_nums}: {e}")
            # Save progress and continue
            with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

        # Rate limiting
        time.sleep(1)

    print(f"\nComplete! {len(result)} Psalms mapped to hymns.")
    print(f"Output: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
