# Quickstart: Validating Outline Pane-2 Navigation Memory

## Prerequisites

- Dependencies installed (`npm install`, if not already).
- Bible data available locally as the app expects (existing project setup — no change needed for this feature).

## Run

```bash
npm start
```

Opens the app at `http://localhost:3000`. Confirm a two-pane view is visible (desktop width, or tablet view).

## Validation scenarios

Each maps to an acceptance scenario in `spec.md`.

### 1. Basic restore — Intro (User Story 1, Scenario 1)

1. Pick any book/chapter. In pane 2, click **Outline(o)** (or press `o`) to show the chapter Outline.
2. Inside the Outline header, click **Intro**.
3. Close the Intro overlay (× or Escape).
4. **Expect**: pane 2 shows the Outline again, same book/chapter — not plain scripture text.

### 2. Basic restore — Commentary (User Story 1, Scenario 2)

1. With the Outline open in pane 2, click **commen**.
2. Close the Commentary overlay.
3. **Expect**: pane 2 shows the Outline again for the same book/chapter.

### 3. Basic restore — Story (User Story 1, Scenario 3)

1. With the Outline open in pane 2, click **Story**.
2. Close the Story overlay.
3. **Expect**: pane 2 shows the Outline again for the same book/chapter.

### 4. Zero extra clicks (SC-001)

Repeat scenarios 1–3 and confirm no manual click on the `Outline(o)` button is needed after closing the overlay — restoration is automatic.

### 5. Unrelated entry point is unaffected (User Story 2 / FR-006, Scenario 1)

1. With pane 2 showing plain scripture text (Outline not open), open **Intro** from the main pane-2 toolbar (not from inside Outline).
2. Close it.
3. **Expect**: pane 2 still shows plain scripture text — no Outline appears.

Repeat for Story and for opening Commentary via a verse click (not via Outline).

### 6. Manual close disarms restoration (User Story 2 / FR-005, Scenario 2)

1. Open the Outline in pane 2, then close it directly with the × button (not via a cross-nav button).
2. Open Intro (or Story, or Commentary) via any entry point and close it.
3. **Expect**: pane 2 does not automatically show the Outline.

### 7. Chained cross-navigation (Edge Case)

1. Open the Outline, click **Story**.
2. From inside the Story/Intro overlay's own tab bar, click **commen** (jumps straight to Commentary).
3. Close the Commentary overlay.
4. **Expect**: pane 2 shows the Outline again (the whole chain unwinds back to Outline, not to plain text).

### 8. Chapter follows mid-visit navigation (Edge Case)

1. Open the Outline for chapter N, click **Story**.
2. Inside the Story reader, scroll into chapter N+1 and close the overlay from there (so `pane2Chapter` updates, per existing `closeStoryModal` behavior).
3. **Expect**: the restored Outline shows chapter N+1 (follows where the reader ended up), not chapter N.

## Build smoke check

No automated tests exist for `src/BibleApp.js`. After implementing, run a production build as a compile/lint sanity check (matches how the prior Outline-in-pane-2 change was verified):

```bash
npx react-scripts build
```

Expect it to compile with only the same pre-existing warnings in unrelated files (`SongMemorizeModal.jsx`, `VerseMemorizeModal.jsx`, `YouTubeVideoModal.jsx`) — no new errors or warnings from `BibleApp.js`.
