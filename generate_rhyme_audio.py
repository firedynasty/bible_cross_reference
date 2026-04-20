#!/Users/stanleytan/anaconda3/bin/python3
"""
Generate MP3 audio from bible_rhyme text files using OpenAI TTS.

Usage:
    python generate_rhyme_audio.py Psalms          # one book
    python generate_rhyme_audio.py Psalms --dry-run # preview without generating
"""

import os
import sys
import time
from pathlib import Path
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

BIBLE_RHYME = Path(__file__).parent / "bible_rhyme"
AUDIO_OUT = Path(__file__).parent / "bible_rhyme_audio"

VOICE = "onyx"
MODEL = "tts-1-hd"
SPEED = 1.0


def generate_audio(text: str, output_path: Path):
    response = client.audio.speech.create(
        model=MODEL,
        voice=VOICE,
        input=text,
        speed=SPEED,
    )
    with open(output_path, "wb") as f:
        for chunk in response.with_streaming_response.method():
            f.write(chunk)


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_rhyme_audio.py <BookName> [--dry-run]")
        print(f"Available: {', '.join(sorted(p.name for p in BIBLE_RHYME.iterdir() if p.is_dir()))}")
        sys.exit(1)

    book = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    src_dir = BIBLE_RHYME / book
    if not src_dir.exists():
        print(f"ERROR: {src_dir} not found")
        sys.exit(1)

    out_dir = AUDIO_OUT / book
    out_dir.mkdir(parents=True, exist_ok=True)

    source_files = sorted(src_dir.glob("*.txt"))
    total = len(source_files)
    done = 0
    skipped = 0
    errors = 0

    print(f"Book: {book} | {total} chapters | Voice: {VOICE} | Model: {MODEL}")
    if dry_run:
        print("DRY RUN — no audio will be generated\n")

    for src_path in source_files:
        mp3_name = src_path.stem + ".mp3"
        mp3_path = out_dir / mp3_name

        # Skip if already exists
        if mp3_path.exists() and mp3_path.stat().st_size > 0:
            skipped += 1
            continue

        text = src_path.read_text(encoding="utf-8").strip()
        if not text:
            skipped += 1
            continue

        if dry_run:
            print(f"  Would generate: {mp3_name} ({len(text):,} chars)")
            done += 1
            continue

        try:
            print(f"  [{done + skipped + errors + 1}/{total}] {mp3_name} ...", end=" ", flush=True)
            response = client.audio.speech.create(
                model=MODEL,
                voice=VOICE,
                input=text,
                speed=SPEED,
            )
            response.write_to_file(mp3_path)
            print(f"done ({mp3_path.stat().st_size // 1024}KB)")
            done += 1
            time.sleep(0.3)
        except Exception as e:
            print(f"ERROR: {e}")
            errors += 1
            time.sleep(2)

    print(f"\nFinished. Generated: {done} | Skipped: {skipped} | Errors: {errors}")
    print(f"Output: {out_dir}")


if __name__ == "__main__":
    main()
