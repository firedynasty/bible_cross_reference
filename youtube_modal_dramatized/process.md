# Dramatized Chapter Timestamps — Pipeline

All commands are run from `youtube_modal_dramatized/` unless noted.

---

## Step 1 — Get the YouTube transcript

1. Open the dramatized Bible video on YouTube
2. Click `...` → **Show transcript**
3. Scroll the transcript panel **all the way to the bottom** (so it fully loads)
4. Run the bookmarklet — it copies the transcript to clipboard
5. Paste into a file:

```bash
pbpaste > rebuild/transcripts/genesis.txt
```

---

## Step 2 — Annotate the transcript with chapter markers

Uses `en_web.json` (already in the repo — no scraping needed).
Writes `@01`, `@02`... markers on the transcript line where each chapter begins.

```bash
cd rebuild
python annotate.py transcripts/genesis.txt gn
# → transcripts/genesis_annotated.txt
```

Other examples:
```bash
python annotate.py transcripts/numbers.txt nm
python annotate.py transcripts/psalms.txt ps
```

---

## Step 3 — Review & correct the annotated file

Open `transcripts/genesis_annotated.txt` and scan the `@NN` lines.

- **Score ≥ 0.60** — reliable, skip
- **Score 0.40–0.59** — spot-check
- **Score < 0.40** — verify manually

If a marker landed on the wrong line, move the `@NN` tag to the correct line.
The `@NN` can be placed anywhere on the line (start or end).

---

## Step 4 — Extract timestamps into JSON

Run from `rebuild/`:

```bash
# All annotated books at once
python extract_annotated.py

# Or specific books only
python extract_annotated.py genesis numbers psalms
```

Writes to `../dramatized_chapter_timestamps.json`.

---

## Step 5 — Convert JSON to JS for the app

Run from `youtube_modal_dramatized/`:

```bash
python json_to_js.py dramatized_chapter_timestamps.json ../src/data/dramatizedChapterTimestamps.js dramatizedChapterTimestamps
```

---

## Step 6 — Commit and push

```bash
git add src/data/dramatizedChapterTimestamps.js youtube_modal_dramatized/dramatized_chapter_timestamps.json youtube_modal_dramatized/rebuild/transcripts/
git commit -m "Update dramatized timestamps for <book>"
git push
```

---

## Re-doing a single book

```bash
cd rebuild
python annotate.py transcripts/judges.txt jud
# review judges_annotated.txt
python extract_annotated.py judges
cd ..
python json_to_js.py dramatized_chapter_timestamps.json ../src/data/dramatizedChapterTimestamps.js dramatizedChapterTimestamps
```

---

## Notes

- The bookmarklet is in `rebuild/bookmarklet.txt`
- All YouTube video IDs are in `src/components/YouTubeVideoModal.jsx` → `dramatizedBookVideoIds`
- The modal reads from `src/data/dramatizedChapterTimestamps.js`
- `dramatized_chapter_timestamps.json` is the source of truth; the JS file is generated from it
- If a transcript is cut short (chapters pile up at the same `[Music]` timestamp at the end), re-run the bookmarklet after scrolling the transcript panel to the bottom
