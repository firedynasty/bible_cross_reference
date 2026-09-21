# Phase 1 Data Model: Outline Pane-2 Navigation Memory

This feature adds no persisted data, no new domain entities, and no external schema. The two "Key Entities" named in the spec map directly onto existing or one new piece of in-memory React state in `src/BibleApp.js`.

## Pane 2 display state

What pane 2 is currently showing, and enough context to resume it. Entirely represented by existing state — no changes needed here:

| Field | Existing state | Notes |
|---|---|---|
| Is Outline showing | `showOutlineModal` (boolean) | Already exists; this feature only adds a new caller that sets it to `true` |
| Book to resume on | `pane2Book` (object \| null) | Already exists; `null` means "follow `selectedBook`" |
| Chapter to resume on | `pane2Chapter` (number \| null) | Already exists; `null` means "follow `selectedChapter`" |

No scroll position or Flat/Outline toggle is tracked, per FR-004 (explicitly out of scope).

## Cross-navigation origin

A marker of whether the currently-open Story/Intro (`showSearchModal`) or Commentary (`verseModalData`) overlay was reached from inside the Outline — used to decide whether closing it should restore the Outline. This is the one new piece of state:

| Field | Type | Default | Set to `true` | Set to `false` |
|---|---|---|---|---|
| `outlineReturnArmed` | `boolean` (`useState`) | `false` | Inside the `onOpenStory`, `onOpenIntro`, and `onOpenCommentary` callbacks passed to `<OutlineModal>` (the moment a cross-nav button is clicked from within the Outline) | By the restoration `useEffect`, immediately after it sets `showOutlineModal(true)` |

**Lifecycle**: `false` → (reader clicks a cross-nav button inside Outline) → `true` → (reader finishes with Story/Intro/Commentary, both overlays closed) → effect restores Outline and resets to `false`.

No other reads or writes of this flag exist anywhere else in the component — see `research.md` for why a manual Outline close never needs to explicitly clear it.
