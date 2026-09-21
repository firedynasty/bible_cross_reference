# Phase 0 Research: Outline Pane-2 Navigation Memory

No items in Technical Context were marked `NEEDS CLARIFICATION` — this is a small, self-contained UI-state change in an existing, already-understood component (`src/BibleApp.js`). Research here is about *how* to implement the restoration reliably, not about external unknowns.

## Decision: Trigger restoration off state transitions, not individual close call-sites

**Decision**: Watch `showSearchModal` and `verseModalData` with a single `useEffect`, and restore the Outline when both have gone back to "closed" while a `outlineReturnArmed` flag is `true`. Do not hook the individual `onClick`/`onClose` call sites that close those overlays.

**Rationale**: `showSearchModal` (the Story/Intro overlay) is closed from at least three separate places in `src/BibleApp.js` today — the backdrop-click/chapter-detecting `closeStoryModal()` closure (~line 11529), a direct `setShowSearchModal(false)` in the global Escape-key handler (~line 4493), and a direct call inside the "send to Cursive" button (~line 11761). `VerseCommentaryModal` is simpler (single `onClose={() => setVerseModalData(null)}`), but relying on call-site coverage for the Story/Intro overlay would mean re-deriving and maintaining three edit points instead of one. An effect keyed on the state itself is correct by construction for every current and future way those overlays get closed.

**Alternatives considered**:
- *Patch each close call site individually*: rejected — fragile (new close paths silently bypass restoration), and triples the edit surface for no behavioral benefit.
- *Lift a "pane 2 view mode" state machine (`'text' | 'outline'`) and route all overlay-closing through it*: rejected as over-scoped for this feature — it would touch many unrelated call sites and toolbar entry points that must explicitly stay untouched per FR-006. The single-flag + effect approach is the minimal change that satisfies the spec.

## Decision: One boolean flag (`outlineReturnArmed`), not a stored chapter/book snapshot

**Decision**: The "memory" is just *whether* to restore, not *what* to restore. The book/chapter to show is read live from `pane2Book`/`pane2Chapter` at the moment of restoration (the same values `OutlineModal`'s own render-time computation already uses), not a value snapshotted when the reader left the Outline.

**Rationale**: Per the resolved FR-004, only "chapter" needs to survive the round trip — scroll position and the Flat/Outline toggle are explicitly out of scope. `pane2Book`/`pane2Chapter` already track "what pane 2 is currently on," and the Story reader's own close handler (`closeStoryModal`) already updates `pane2Chapter` to whatever chapter the reader scrolled to before closing. Reading these live means the restored Outline naturally follows the reader if they changed chapters while browsing Story/Intro — a reasonable default for the open edge case ("reader navigates chapters inside Story before closing it") without any extra bookkeeping.

**Alternatives considered**:
- *Snapshot `{ book, chapter }` when arming*: rejected — would require deciding whether a mid-visit chapter change inside Story/Intro should override the snapshot (unresolved edge case), and adds state for no behavioral gain given the live values already do the right thing.

## Decision: No explicit "disarm" code path is needed for manual Outline close

**Decision**: Do not add special-case code for "reader closes Outline via × or Escape." Rely on the fact that `outlineReturnArmed` can only become `true` inside the three `onOpenStory`/`onOpenIntro`/`onOpenCommentary` callbacks passed to `<OutlineModal>` — and those same callbacks are what hide the Outline in the first place. By the time the Outline is visible again (whether by the reader manually reopening it, or by the new restoration effect), `outlineReturnArmed` has already been consumed and reset to `false`.

**Rationale**: Traced every path that can make `showOutlineModal` or `outlineReturnArmed` true and confirmed there is no reachable state where Outline is visible *and* `outlineReturnArmed` is still `true` — so a manual close of a visible Outline never has a stale "armed" flag to clear. This satisfies FR-005's disarm requirement and User Story 3 Acceptance Scenario 2 without additional code, keeping the change minimal.

**Alternatives considered**:
- *Explicitly set `outlineReturnArmed(false)` in the Outline's `onClose`*: harmless but redundant given the above trace. Left out to keep the diff minimal, noted here so a future reader doesn't wonder why it's missing.

## Decision: Chained cross-navigation (Outline → Story → Commentary → …) resolves itself

**Decision**: No extra logic for the multi-hop edge case. Because restoration only fires when *both* `showSearchModal` is false *and* `verseModalData` is falsy, and the Story/Intro and Commentary overlays already have their own buttons to jump directly to each other (`commen`/`outline` inside the Story/Intro tab bar; `onOpenStory`/`onOpenIntro`/`onOpenOutline` inside `VerseCommentaryModal`), a chain like Outline → Story → Commentary keeps `outlineReturnArmed` at `true` until the reader has backed out of the *entire* chain, then restores the Outline exactly once.

**Rationale**: Traced the transition table for all combinations of `(showSearchModal, verseModalData)` across the existing cross-buttons and confirmed the "both closed" gate never fires mid-chain (one of the two is always about to become true again in the same event when hopping between Story/Intro and Commentary), and fires exactly once when the reader is done. This resolves the spec's open edge case ("chains multiple cross-navigations... does each hop still know to return to the original Outline") with the answer: yes, the outermost Outline is restored once the whole chain unwinds.

**Alternatives considered**:
- *A navigation stack*: rejected as unnecessary complexity — the existing two booleans already encode enough state for this app's actual navigation graph (Outline ↔ {Story/Intro, Commentary}, no deeper nesting exists today).
