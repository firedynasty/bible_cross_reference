#!/usr/bin/env python3
"""
Generate luke_hymns.json — maps each chapter of Luke (1-24) to recommended hymns
from the 1955 Hymnary CSV, using OpenAI to find thematic connections.

Includes rich context about Luke's canticles and their musical tradition
(Magnificat, Benedictus, Nunc Dimittis, Gloria in Excelsis, etc.)

Usage:
    python generate_luke_hymns.py

Requires:
    - OPENAI_API_KEY environment variable
    - public/en_kjv.json (KJV Bible)
    - hymnary CSV file (path set below)

Output:
    public/luke_hymns.json
"""

import json
import csv
import os
import time
from openai import OpenAI

# --- Configuration ---
KJV_PATH = os.path.join(os.path.dirname(__file__), "public", "en_kjv.json")
CSV_PATH = "/Users/stanleytan/documents/technical/python/53-webpage_scraper/hymnary_h1955_all_topics.csv"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "luke_hymns.json")
MODEL = "gpt-4o"
BATCH_SIZE = 6  # Fewer per batch since chapters are longer than psalms

# --- Lukan canticle context injected into every prompt ---
LUKE_CONTEXT = """
=== IMPORTANT CONTEXT: LUKE'S CANTICLES AND MUSICAL TRADITION ===

Luke's Gospel contains several canticles (biblical songs) that have become foundational
texts in Christian worship and sacred music across all traditions. When recommending hymns,
be aware of these deep connections:

1. THE MAGNIFICAT (Luke 1:46-55) — Mary's song when she visits Elizabeth: "My soul doth
   magnify the Lord." Sung daily at Vespers/Evening Prayer in Catholic, Anglican, Lutheran,
   and Orthodox traditions. Set to music by Bach, Vivaldi, Rachmaninoff (All-Night Vigil,
   movement 11 — the "Chestneyshuyu" refrain), Arvo Pärt, and countless others.

2. THE BENEDICTUS (Luke 1:68-79) — Zechariah's prophecy at the birth of John the Baptist:
   "Blessed be the Lord God of Israel." The traditional canticle of Morning Prayer/Lauds.

3. THE NUNC DIMITTIS (Luke 2:29-32) — Simeon's song in the temple when he sees the infant
   Jesus: "Lord, now lettest thou thy servant depart in peace." Sung at Compline/Night Prayer
   or Evensong. Rachmaninoff's All-Night Vigil movement 5 is the most famous setting —
   arguably the single greatest musical monument to Luke's canticles.

4. THE GLORIA IN EXCELSIS (Luke 2:14) — The angels' song to the shepherds: "Glory to God
   in the highest, and on earth peace, good will toward men." This became the Greater
   Doxology, sung in nearly every Christian liturgy. Rachmaninoff's All-Night Vigil also
   echoes this.

5. THE LORD'S PRAYER (Luke 11:2-4) — Also in Matthew 6:9-13; the liturgical version
   generally follows Matthew's longer form, but Luke's version is the earlier tradition.

6. BLESSED IS HE THAT COMETH (Luke 19:38) — From the Triumphal Entry, also in Psalm 118:26.
   Sung as the Benedictus qui venit in the Sanctus of the Mass/Communion.

7. THE ZACCHAEUS NARRATIVE (Luke 19:1-10) — Echoed in the troparion of Orthodox liturgy.

Rachmaninoff's All-Night Vigil (Vespers) is arguably the single greatest musical monument
to Luke's canticles in the repertoire — containing the Nunc Dimittis, Ave Maria/Bogoroditse
Devo, the angels' Gloria, and the Magnificat. It is one of the peaks of Orthodox sacred music.

Also consider: many Christmas hymns draw from Luke 2 (the nativity narrative, shepherds,
angels); Passiontide hymns from Luke 22-23; Easter hymns from Luke 24 (Emmaus road,
resurrection); and hymns about parables unique to Luke (Good Samaritan ch10, Prodigal Son
ch15, Rich Man and Lazarus ch16).
"""

# --- Load Luke chapters ---
def load_luke():
    with open(KJV_PATH, encoding="utf-8-sig") as f:
        bible = json.load(f)
    for book in bible:
        if book["abbrev"] == "lk":
            return book["chapters"]
    raise ValueError("Luke not found in KJV data")

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

# --- Build prompt for a batch of Luke chapters ---
def build_batch_prompt(chapter_texts_batch, hymnal_summary):
    """
    chapter_texts_batch: list of (chapter_number, full_text) tuples
    """
    chapters_section = ""
    for ch_num, text in chapter_texts_batch:
        truncated = text[:3000] + ("..." if len(text) > 3000 else "")
        chapters_section += f"\n--- Luke {ch_num} ---\n{truncated}\n"

    ch_numbers = [str(ch_num) for ch_num, _ in chapter_texts_batch]

    return f"""You are a worship planning assistant with deep knowledge of Christian hymnody and sacred music traditions.

{LUKE_CONTEXT}

Given the following chapters from the Gospel of Luke and a hymnal index, recommend 2-4 hymns from the hymnal for EACH chapter based on thematic, theological, textual, or liturgical connections.

For chapters containing canticles (especially Luke 1, 2, 11, 19), pay special attention to hymns that echo or paraphrase those canticle texts. For narrative chapters, focus on the key themes, parables, or events. It is OK to recommend 0 hymns if a chapter (e.g. genealogies, travel logistics) has no strong hymn match.

{chapters_section}

=== HYMNAL INDEX (1955 Hymnary) ===
{hymnal_summary}

For EACH of the following Luke chapters: {', '.join(ch_numbers)}

Return a JSON object where each key is the chapter number (as a string) and the value is an array of objects with:
- "hymn_number": the hymn number (e.g. "#23")
- "first_line": the first line of the hymn
- "reason": a brief 1-2 sentence explanation of the connection, referencing the specific verses, canticle, parable, or event in Luke

Return ONLY valid JSON, no markdown fences, no extra text. Example format:
{{"1": [{{"hymn_number": "#1", "first_line": "My soul doth magnify...", "reason": "Echoes the Magnificat (Luke 1:46-55), Mary's song of praise..."}}], "2": [...]}}"""

# --- Main ---
def main():
    print("Loading KJV Luke...")
    chapters = load_luke()
    print(f"  Found {len(chapters)} chapters")

    print("Loading hymnal CSV...")
    hymns = load_hymnal()
    print(f"  Found {len(hymns)} unique hymns")

    hymnal_summary = build_hymnal_summary(hymns)
    print(f"  Hymnal summary: {len(hymnal_summary)} chars")

    client = OpenAI()

    # Load existing progress if any (resume support)
    result = {}
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, encoding="utf-8") as f:
                result = json.load(f)
            print(f"  Resuming: {len(result)} chapters already processed")
        except (json.JSONDecodeError, IOError):
            result = {}

    # Build list of chapters still to process
    all_chapters = []
    for i, verses in enumerate(chapters):
        ch_num = i + 1
        if str(ch_num) in result:
            continue
        full_text = "\n".join(f"{j+1}. {v}" for j, v in enumerate(verses))
        all_chapters.append((ch_num, full_text))

    print(f"  {len(all_chapters)} chapters remaining to process")

    # Process in batches
    for batch_start in range(0, len(all_chapters), BATCH_SIZE):
        batch = all_chapters[batch_start:batch_start + BATCH_SIZE]
        ch_nums = [ch[0] for ch in batch]
        print(f"  Processing Luke {ch_nums}...")

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

            for ch_num, _ in batch:
                key = str(ch_num)
                if key in batch_result:
                    result[key] = batch_result[key]
                else:
                    print(f"    WARNING: Luke {ch_num} missing from response")

            # Save after each batch (resume support)
            with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"    Done. Total saved: {len(result)}/24")

        except json.JSONDecodeError as e:
            print(f"    ERROR parsing JSON for Luke {ch_nums}: {e}")
            print(f"    Raw response: {content[:500]}")
        except Exception as e:
            print(f"    ERROR for Luke {ch_nums}: {e}")
            with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

        # Rate limiting
        time.sleep(1)

    print(f"\nComplete! {len(result)} Luke chapters mapped to hymns.")
    print(f"Output: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
