# VerseCommentaryModal — How It Works

## What triggers the modal?

Clicking any **verse number** in Pane 2 (the right pane) opens the modal. The verse number was previously wired to scroll Pane 1 to the matching verse — it now opens the commentary modal instead.

---

## Where does the commentary data come from?

**HelloAO Bible API** — a free, public, no-key-required REST API.

```
https://bible.helloao.org/api/c/{commentary-id}/{BOOK-ID}/{chapter}.json
```

- Returns the full chapter's commentary as JSON
- No rate limit issues in normal use (~45M requests/month in production)
- No API key, no sign-up, no backend needed — the React frontend fetches directly

The Python script at `/Users/stanleytan/Downloads/TheologAI/helloao_commentary.py` pointed to this same endpoint and was the reference used to understand the response format.

---

## Which commentaries are available?

| Dropdown label       | API id                  | Coverage               |
|----------------------|-------------------------|------------------------|
| John Gill            | `john-gill`             | 29,707 verses (default)|
| JFB                  | `jamieson-fausset-brown`| 17,056 verses          |
| Tyndale              | `tyndale`               | 15,757 verses          |
| Adam Clarke          | `adam-clarke`           | 13,318 verses          |
| John Calvin          | `john-calvin`           | 7,332 verses           |
| Keil-Delitzsch (OT)  | `keil-delitzsch`        | 6,516 verses, OT only  |
| Matthew Henry        | `matthew-henry`         | 4,124 entries (grouped)|

John Gill is the default because it has the broadest verse-by-verse coverage.

---

## How does the book/chapter get mapped?

The app uses its own short book abbreviations (e.g. `am`, `jo`, `1co`). The modal contains two lookup tables:

**`BOOK_ID_MAP`** — app abbrev → HelloAO uppercase book code  
Example: `am → AMO`, `jo → JHN`, `1co → 1CO`

**`MHC_SLUGS`** — HelloAO book code → BibleHub URL slug  
Example: `AMO → amos`, `SNG → songs` (not `song_of_solomon`), `1CO → 1_corinthians`

---

## How is the verse found inside the chapter response?

The API returns the entire chapter's commentary. The modal walks through `data.chapter.content` looking for items where `item.type === 'verse'` and `item.number <= verseNumber`, keeping the last match. This handles Matthew Henry's grouped entries (e.g. an entry for verse 1 that covers verses 1–4).

---

## Is there caching?

Yes — chapter data is cached in a `useRef` object keyed by `{BOOK_ID}-{chapter}-{commentary-id}`. Switching between verses in the same chapter reuses the cached response. The cache lives for the lifetime of the modal component (cleared on page refresh).

---

## What is the BibleHub MHC ↗ button?

A link-out button in the toolbar that opens **Matthew Henry's Commentary** on BibleHub for the current book and chapter:

```
https://biblehub.com/commentaries/mhc/{slug}/{chapter}.htm
```

Uses `MHC_SLUGS` to build the slug. Opens in a new tab. This is a full chapter view on BibleHub — useful for reading broader context beyond the single verse entry returned by the API.

---

## UI controls summary

| Control      | What it does                                      |
|--------------|---------------------------------------------------|
| Dropdown     | Switch between the 7 available commentaries       |
| MHC ↗        | Open BibleHub Matthew Henry for this chapter      |
| A−           | Decrease commentary font size (min 0.6rem)        |
| A+           | Increase commentary font size (max 2.0rem)        |
| ↓            | Page down ~80% of visible height                  |
| ↑            | Scroll up ~2 lines (56px)                         |
| ✕ / Escape / backdrop click | Close the modal                    |

---

## Files changed

| File | Change |
|------|--------|
| `src/components/VerseCommentaryModal.js` | New component |
| `src/BibleApp.js` | Import added, `verseModalData` state added, right-pane verse number `onClick` replaced, modal rendered near other modals |
