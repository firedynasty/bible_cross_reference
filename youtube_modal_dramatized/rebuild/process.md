  1. Download the transcript from YouTube using the bookmarklet, save it to:
  transcripts/genesis.txt

---
  2. Scrape NKJV verse 1 of each chapter from Bible Gateway:
  python3 scrape_nkjv.py gn
  # → gn_nkjv.json

---
  3. Annotate the transcript with @01, @02... markers at chapter boundaries:
  python3 annotate.py transcripts/genesis.txt gn_nkjv.json
  # → transcripts/genesis_annotated.txt

---
  4. Review & correct — open genesis_annotated.txt, check the @ lines look right, manually move any that landed on the wrong line.

---
  5. (coming next) — a script to read the @ markers from the annotated file and extract the timestamps back out into the JSON that the modal loads.

---
  So right now you're missing step 5 — a script that reads genesis_annotated.txt, finds every @NN line, pulls its [M:SS] timestamp, and writes it into
  dramatized_chapter_timestamps.json. Want me to build that next?

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \ --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

pbpaste > test.txt 

