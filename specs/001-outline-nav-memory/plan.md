# Implementation Plan: Outline Pane-2 Navigation Memory

**Branch**: `001-outline-nav-memory` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-outline-nav-memory/spec.md`

## Summary

When a reader opens the chapter Outline in pane 2 and then uses its `Story`/`Intro`/`commen` cross-navigation buttons, closing that overlay currently drops pane 2 back to plain scripture text — the Outline is lost. The fix: track whether the currently-open Story/Intro/Commentary overlay was reached from inside the Outline, and when the reader finishes with it (all such overlays closed), automatically re-show the Outline for the current book/chapter. Overlays reached through any other entry point are unaffected. Implemented as one boolean piece of state (`outlineReturnArmed`) plus one `useEffect` in `src/BibleApp.js`, reusing the "outline was shown for `pane2Book`/`pane2Chapter`" data that already exists.

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18 function components with hooks

**Primary Dependencies**: React (existing app dependency, `react-scripts` build). No new dependencies.

**Storage**: N/A — in-memory component state only (`useState`), not persisted to localStorage or a backend, per spec Assumptions ("session-only").

**Testing**: No automated test suite exists for `src/BibleApp.js` (no `*.test.js` files in `src/`; CRA's Jest runner is configured but unused here). Validation is manual: `npm start` + exercising the flows in a browser, plus a production build (`npx react-scripts build`) as a compile/lint smoke check — consistent with how the prior "Outline swap into pane 2" change (see git history) was verified.

**Target Platform**: Web browser, desktop and mobile, within the existing dual-pane Bible reading app.

**Project Type**: Single-project Create React App web application. This feature touches one existing file only.

**Performance Goals**: N/A — a single boolean state read/write and one `useEffect` comparison per relevant state change; no measurable perf impact.

**Constraints**: Must not change behavior for Story/Intro/Commentary when opened through their normal (non-Outline) entry points (FR-006). Must not add new files, new dependencies, or a persistence layer — scope is confined to in-session state in `src/BibleApp.js`.

**Scale/Scope**: One file changed (`src/BibleApp.js`): one new `useState`, edits to the 3 existing `onOpenStory`/`onOpenIntro`/`onOpenCommentary` callbacks passed to `<OutlineModal>`, and one new `useEffect`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (all placeholder tokens, no ratified principles) — there are no project-specific gates to check against. No violations to evaluate; gate passes trivially.

## Project Structure

### Documentation (this feature)

```text
specs/001-outline-nav-memory/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this feature has no external interface (API, CLI, schema); it's purely internal UI state within one React component tree.

### Source Code (repository root)

```text
src/
├── BibleApp.js                       # MODIFIED: new outlineReturnArmed state,
│                                      # restore-on-close effect, edits to the
│                                      # OutlineModal cross-nav callback props
└── components/
    ├── OutlineModal.js                # UNCHANGED — already receives onOpenStory/
    │                                   # onOpenIntro/onOpenCommentary/onClose props;
    │                                   # no prop shape changes needed
    └── VerseCommentaryModal.js        # UNCHANGED — already calls onClose/onOpenStory/
                                        # onOpenIntro via existing props
```

**Structure Decision**: Single existing web app (Create React App), no frontend/backend split. This is a targeted edit inside the existing monolithic `src/BibleApp.js` root component, which already owns all the relevant state (`showOutlineModal`, `showSearchModal`, `verseModalData`, `pane2Book`, `pane2Chapter`). No new files are introduced; no changes to `OutlineModal.js` or `VerseCommentaryModal.js` are needed because the restoration logic only needs to observe state that `BibleApp.js` already owns and mutate `showOutlineModal`, which it also already owns.

## Complexity Tracking

*No constitution violations — section not applicable.*
