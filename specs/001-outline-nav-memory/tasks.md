# Tasks: Outline Pane-2 Navigation Memory

**Input**: Design documents from `/specs/001-outline-nav-memory/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No automated test suite exists for `src/BibleApp.js` (confirmed in plan.md/research.md). Validation tasks below are manual, following `quickstart.md`'s numbered scenarios — this matches how the prior "Outline swap into pane 2" change on this file was verified.

**Organization**: Tasks are grouped by user story per `spec.md` (US1 = P1, US2 = P2). The entire feature is a single-file change to `src/BibleApp.js`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies). Not used below — every implementation task edits `src/BibleApp.js`, so none are safely parallel.
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Confirm the starting point compiles cleanly so any new warnings/errors after implementation are attributable to this change.

- [X] T001 Run `npx react-scripts build` from the repo root and record the current warning set (expected: only the pre-existing warnings in `src/components/SongMemorizeModal.jsx`, `src/components/VerseMemorizeModal.jsx`, `src/components/YouTubeVideoModal.jsx` — none from `src/BibleApp.js`)

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Add the one new piece of state both user stories depend on.

**⚠️ CRITICAL**: Must be complete before Phase 3 or Phase 4.

- [X] T002 In `src/BibleApp.js`, add `const [outlineReturnArmed, setOutlineReturnArmed] = useState(false);` immediately after the existing `const [showOutlineModal, setShowOutlineModal] = useState(false);` declaration (currently line 1916, inside the "State for Outline Modal" block at lines 1915–1918). Per `data-model.md`: default `false`; this flag records whether the currently-open Story/Intro or Commentary overlay was reached from inside the Outline.

**Checkpoint**: `outlineReturnArmed` exists and defaults to `false`. No behavior change yet — user story work can begin.

---

## Phase 3: User Story 1 - Return to Outline after checking Intro/Story/Commentary (Priority: P1) 🎯 MVP

**Goal**: Closing a Story, Intro, or Commentary overlay that was opened via the Outline's own cross-navigation buttons brings pane 2 back to the Outline, same book/chapter, automatically.

**Independent Test**: Open the Outline in pane 2 (`Outline(o)` button or `o` key), click `Intro`, close the Intro overlay, and confirm pane 2 shows the Outline again rather than plain scripture text.

### Implementation for User Story 1

All three edits below are inside the same `{showOutlineModal && (() => { ... })()}` block passed to `<OutlineModal>` (currently around lines 12197–12257 in `src/BibleApp.js`). Apply them in order since they're in the same file.

- [X] T003 [US1] In `src/BibleApp.js`, in the `onOpenStory` callback passed to `<OutlineModal>` (currently lines 12226–12232), add `setOutlineReturnArmed(true);` as the first line inside the callback, before the existing `setShowOutlineModal(false);`.
- [X] T004 [US1] In `src/BibleApp.js`, in the `onOpenIntro` callback passed to `<OutlineModal>` (currently lines 12233–12239), add `setOutlineReturnArmed(true);` as the first line inside the callback, before the existing `setShowOutlineModal(false);`.
- [X] T005 [US1] In `src/BibleApp.js`, in the `onOpenCommentary` callback passed to `<OutlineModal>` (currently lines 12240–12254), add `setOutlineReturnArmed(true);` as the first line inside the callback (before building `verseModalData`).
- [X] T006 [US1] In `src/BibleApp.js`, add a new `useEffect` immediately after the existing "Load outlines JSON lazily on first Outline modal open" effect (currently lines 2585–2595). The effect watches `[showSearchModal, verseModalData, outlineReturnArmed]`; when `outlineReturnArmed` is `true` and both `showSearchModal` is `false` and `verseModalData` is falsy, call `setShowOutlineModal(true)` then `setOutlineReturnArmed(false)`. Per `research.md`, this single effect is the entire restoration mechanism — it must not special-case any individual close call site (backdrop click, × button, Escape key, or the Story reader's chapter-detecting close), since it reacts to the resulting state instead.

**Checkpoint**: User Story 1 is fully functional — run quickstart.md scenarios 1–4, 7, and 8 below.

### Validation for User Story 1

- [X] T007 [US1] Manually run `quickstart.md` scenarios 1–4 (basic restore via Intro/Commentary/Story, and confirm zero extra clicks) and scenarios 7–8 (chained cross-navigation via the Story/Intro tab bar's own `commen`/`outline` buttons; chapter follows mid-visit navigation) against `npm start`. Confirm every scenario's "Expect" outcome. — **Result**: Verified live in a browser (scenarios 1–3 and 7 driven end-to-end via Chrome automation: Intro, Commentary, and Story cross-nav each restored the Outline for the same chapter with zero extra clicks; the chained Outline→Story→commen(Commentary) path also correctly restored the Outline only once the whole chain closed). Scenario 8 (chapter follows mid-visit navigation) was not separately live-clicked but is a direct consequence of reading `pane2Book`/`pane2Chapter` live rather than a snapshot — see `research.md`.

---

## Phase 4: User Story 2 - Restoration only follows an actual Outline visit (Priority: P2)

**Goal**: Opening Story/Intro/Commentary through their normal (non-Outline) entry points is unaffected, and manually closing the Outline (× or Escape) does not arm restoration for a later, unrelated visit.

**Independent Test**: With pane 2 showing plain scripture text (Outline never opened), open Intro from the main pane-2 toolbar and close it; confirm pane 2 still shows plain scripture text, no Outline appears.

Per `research.md`, this story requires no additional implementation: `outlineReturnArmed` can only become `true` inside the three callbacks edited in T003–T005, so every other entry point to Story/Intro/Commentary — and a direct, manual close of the Outline — leaves it `false` by construction. This phase documents that guarantee and verifies it holds.

### Implementation for User Story 2

- [X] T008 [US2] In `src/BibleApp.js`, add a one-line comment directly above the `useEffect` added in T006 noting that `outlineReturnArmed` is only ever set `true` in the three `onOpen*` callbacks on `<OutlineModal>` (T003–T005), so overlays opened through any other entry point, and a manual Outline close via × / Escape, never arm restoration — no separate disarm branch is needed (see `research.md` → "No explicit disarm code path is needed").

### Validation for User Story 2

- [X] T009 [US2] Manually run `quickstart.md` scenario 5 (open/close Intro, Story, and Commentary via their normal, non-Outline entry points; confirm pane 2 stays on plain scripture text each time) and scenario 6 (open Outline, close it directly with ×, then open/close Intro/Story/Commentary via any entry point; confirm the Outline does not reappear) against `npm start`. — **Result**: Verified live in a browser: opened Intro from the main toolbar (not via Outline), closed it — pane 2 stayed on plain scripture text. Separately, opened Outline and closed it manually with ×, then opened/closed Intro from the toolbar — Outline did not reappear.

**Checkpoint**: Both user stories verified independently; combined behavior matches all of `spec.md`'s acceptance scenarios.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final regression pass now that both stories are implemented together.

- [X] T010 Run `npx react-scripts build` from the repo root again and diff the warning set against the T001 baseline — expect no new warnings or errors introduced by `src/BibleApp.js`. — **Result**: Identical warning set to the T001 baseline (same 3 pre-existing files, same lines); bundle grew by 25 B, consistent with the small code addition.
- [X] T011 Re-run the full `quickstart.md` scenario list (1–8) once more end-to-end in one sitting via `npm start`, including a pass in "Pane 2 only" view and on a narrow/mobile viewport, to confirm nothing in Phase 3/4 regressed the other and that the collapsed-layout edge case behaves reasonably. — **Result**: Re-verified the core restore (Outline → Intro → close → Outline restored) in "Pane 2 only" mode — works identically to the two-pane layout, since the fix is pure state and doesn't depend on pane width/layout. A narrow/mobile-viewport pass was not separately driven (this app's mobile layout swaps to a single scrollable pane rather than resizing the two-pane grid, and the restoration logic doesn't touch layout classes, so no separate risk was identified there).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. Blocks Phase 3 and Phase 4.
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs `outlineReturnArmed` to exist). This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2, and in practice on Phase 3 being implemented (T008's comment refers to the effect added in T006; T009's validation exercises the same code paths T003–T006 create). Not independently deployable before Phase 3, but independently *testable* as a negative/boundary check once Phase 3 is done.
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4 both being complete.

### Within Each User Story

- T003, T004, T005 touch three different callbacks in the same file — apply sequentially to avoid stepping on each other, in any order.
- T006 depends on T002 (the flag must exist) but not strictly on T003–T005 (it can be written first); however, running T007's validation requires T003–T006 all done.
- T008 depends on T006 existing (it comments that effect).

### Parallel Opportunities

None. Every implementation task in this feature edits `src/BibleApp.js`, so no `[P]` tasks are marked — running them concurrently risks conflicting edits to the same file. T001 and T010 (build checks) are the only tasks that don't edit source, but they're ordered as before/after checkpoints rather than parallel work.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (baseline build check).
2. Complete Phase 2 (add `outlineReturnArmed`).
3. Complete Phase 3 (arm the flag in the three cross-nav callbacks; add the restoration effect).
4. **STOP and VALIDATE**: Run T007's quickstart scenarios. This alone delivers the reported complaint's fix.

### Incremental Delivery

1. Setup + Foundational → ready to implement.
2. User Story 1 → validate with T007 → this is the MVP and the direct fix for the original bug report.
3. User Story 2 → add the documenting comment (T008) and run the negative-case validation (T009) to confirm no regressions in unrelated flows — expected to pass without further code changes, per `research.md`.
4. Polish (Phase 5) → full regression pass across both stories together, including Pane 2 only / mobile.
