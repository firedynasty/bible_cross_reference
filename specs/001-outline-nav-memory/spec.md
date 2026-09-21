# Feature Specification: Outline Pane-2 Navigation Memory

**Feature Branch**: `001-outline-nav-memory`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "because outline is now a pane 2 modal I am wondering to adjust the buttons within the pane 2 like story, intro, commen to remember this state first because if I go to the intro button then on exiting this modal the position is not remembered, and then for example ... commen and Story clicking goes to pane 1, and I guess I would then need a reset back to regular? talk this out please"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Return to Outline after checking Intro/Story/Commentary (Priority: P1)

A reader has the chapter Outline open in pane 2. From inside the Outline, they click one of the cross-navigation shortcuts — Story, Intro, or Commentary (commen) — to check background context, then close that overlay. Today, pane 2 comes back showing plain scripture text; the reader has lost the Outline and must reopen it manually. This story makes pane 2 come back to the Outline instead.

**Why this priority**: This is the concrete complaint that prompted the feature — the Outline is the thing being interrupted, and losing it on every cross-navigation makes the new cross-nav buttons feel like a trap door out of Outline mode.

**Independent Test**: Open the Outline in pane 2, click "Intro", close the Intro overlay, and confirm pane 2 shows the Outline again (rather than plain scripture text) — deliverable and verifiable on its own.

**Acceptance Scenarios**:

1. **Given** pane 2 is showing the Outline for a chapter, **When** the reader clicks "Intro" and later closes the Intro overlay, **Then** pane 2 shows the Outline again for the same book/chapter.
2. **Given** pane 2 is showing the Outline, **When** the reader clicks "commen" (Commentary) and closes the commentary view, **Then** pane 2 shows the Outline again for the same book/chapter.
3. **Given** pane 2 is showing the Outline, **When** the reader clicks "Story" and closes the story reader, **Then** pane 2 shows the Outline again for the same book/chapter.

---

### User Story 2 - Restoration only follows an actual Outline visit (Priority: P2)

Restoration must not surprise readers who reach Story, Intro, or Commentary some other way (e.g. the main toolbar's own Story/Intro buttons, not through the Outline). After an unrelated visit to those overlays, pane 2 should behave exactly as it does today — no unexpected Outline pop-up.

**Why this priority**: Prevents the fix for User Story 1 from becoming its own bug — an Outline that reappears in flows that never involved the Outline in the first place.

**Independent Test**: With pane 2 showing plain scripture text (Outline never opened), open Intro from the main toolbar and close it; confirm pane 2 still shows plain scripture text.

**Acceptance Scenarios**:

1. **Given** pane 2 is showing plain scripture text and the Outline was never opened, **When** the reader opens and closes Intro/Story/Commentary via their normal entry points, **Then** pane 2 remains plain scripture text — no Outline appears.
2. **Given** the reader closed the Outline directly (× button or Escape, not via a cross-nav button), **When** they later open and close Intro/Story/Commentary through any entry point, **Then** pane 2 does not automatically reopen the Outline.

### Edge Cases

- Reader navigates to a different chapter while inside the Story or Intro overlay (e.g. scrolls the story reader into the next chapter) before closing it — does the restored Outline follow the new chapter, or return to the chapter it was on originally?
- Reader chains multiple cross-navigations without returning to Outline in between (Outline → Story → Intro → Commentary): does each hop still know to return to the original Outline, or only the most recent overlay?
- Behavior in "Pane 2 only" view (pane 1 hidden) and on mobile, where the two-pane layout is collapsed.
- Reader switches translations or books in pane 2 while an Outline-triggered overlay is open — does restoration still make sense, or should it fall back to plain text?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record that pane 2 was displaying the chapter Outline at the moment the reader triggers Story, Intro, or Commentary from one of the Outline's own cross-navigation buttons.
- **FR-002**: System MUST return pane 2 to the chapter Outline, for the same book and chapter, when the reader closes a Story, Intro, or Commentary overlay that was opened via an Outline cross-navigation button.
- **FR-003**: System MUST restore the Outline automatically — with no extra reader action — the instant the Story, Intro, or Commentary overlay closes, provided it was opened via an Outline cross-navigation button.
- **FR-004**: System MUST preserve the book and chapter the Outline was on when restoring it. Scroll position within the outline text and the Flat/Outline display toggle are explicitly NOT required to be preserved — the restored Outline may re-render at its default scroll position and default display toggle for that chapter.
- **FR-005**: System MUST arm restoration only when Story, Intro, or Commentary is opened via one of the Outline's own cross-navigation buttons. Closing the Outline directly (× button or Escape) MUST disarm restoration — it is treated as the reader being done with Outline, so a later Story/Intro/Commentary visit through any entry point must not reopen it.
- **FR-006**: System MUST leave existing behavior unchanged for Story/Intro/Commentary when opened from their normal (non-Outline) entry points — pane 2 continues to show plain scripture text after those close, exactly as it does today.

### Key Entities

- **Pane 2 display state**: What pane 2 is currently showing — plain scripture text or the chapter Outline — plus the book/chapter and view settings needed to resume it.
- **Cross-navigation origin**: A marker of whether the currently-open Story/Intro/Commentary overlay was reached from inside the Outline, used to decide whether closing it should restore the Outline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the time a reader closes a Story, Intro, or Commentary overlay that was opened from inside the Outline, pane 2 shows the Outline again with zero additional clicks required to reopen it.
- **SC-002**: Readers resume within the same chapter they left, with no visible jump to a different chapter than the one they were reading.
- **SC-003**: Opening Story/Intro/Commentary from their normal (non-Outline) entry points shows no change in behavior from today — zero unexpected Outline pop-ups reported.

## Assumptions

- Only the three existing cross-navigation buttons inside the Outline (Story, Intro, Commentary) are in scope as restoration triggers; no new entry points are being added.
- Only one of plain scripture text, Outline, Story/Intro, or Commentary is visible in the relevant pane at a time, matching current app behavior.
- The remembered pane 2 state is session-only (lives in memory for the current visit) and does not need to survive a page reload unless later requested.
- This feature affects pane 2 only; pane 1 behavior is unchanged.
