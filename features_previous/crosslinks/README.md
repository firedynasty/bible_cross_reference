# Cross-links feature (archived before removal, 2026-11-02)

Self-contained note so a fresh Claude can rebuild this. Start with:
"Read features_previous/crosslinks/README.md and re-add the cross-links feature to src/BibleApp.js".

## What it did
Each verse in the primary (left) pane showed a "Refs:" line of cross-reference buttons
(e.g. `John 1:1, Psalm 146:6`) from `public/crossRefs.json`.
- Click a ref: opens BibleGateway (WEB) in a new tab.
- Right-click a ref: menu with "Open in BibleGateway" / "Open in Vercel-Bible" (in-app deep link).
- Link icon at the end of the line: expands ALL refs for that verse, with text, into the right pane (pane 2).
- `handleCrossRefNavigate` moved pane 2 only to the referenced chapter, scrolled to and flashed the verse.
- A jump-back button in the pane 2 header re-opened the last cross-ref (`lastCrossRef`).
- Ref colors by book: Pentateuch amber, Isaiah near-black, Ps/Rom/Heb/Luke orange, NT green, rest blue.

## Data
`public/crossRefs.json` (~12.7 MB, still in the repo, NOT deleted). Shape:
`{"gn-1-1": [{"book":"ps","chapter":146,"verse":6}, ...]}`; key = `<abbrev>-<chapter>-<verse>`.
Served from `/crossRefs.json`, or `<api>/api/json/crossRefs.json` (localhost:3001) as fallback.

## Code, in src/BibleApp.js (excerpts in this folder, line numbers as of the snapshot)
| File | Lines | Purpose |
|---|---|---|
| 01_state.js | 1514, 1543-1545, 1574-1575 | `crossReferences`, `showCrossRef`, `expandedRefsData`, `refContextMenu`, `isViewingCrossRef`, `lastCrossRef` (+ Esc handler at 1546-1551) |
| 02_load_crossrefs.js | 5272-5376 | `loadCrossReferences` (direct fetch, API fallback, error banner) |
| 03_navigate_pane2.js | 5656-5702 | `handleCrossRefNavigate` |
| 04_expand_all.js | 5780-5806 | `handleExpandRefs` |
| 05_url_builders.js | 3120-3131 | `getRefBibleGatewayUrl`, `getRefVercelBibleUrl` |
| 06_..._interleaved.js | 7525-7620 | Refs line in the interleaved layout |
| 07_..._pane1.js | 7878-7957 | Refs line in the normal pane 1 layout |
| 08_expanded_view_pane2.js | 8297-8348 | Expanded "Cross-References" view in pane 2 |
| 09_jump_back_button.js | 8528-8537 | Jump-back button |
| 10_context_menu.js | 12442-12494 | Right-click menu |

Also referenced: `loadCrossReferences(baseUrl, usingApiEndpoint)` is called in the mount effect (~5163);
`setIsViewingCrossRef(...)` and `setShowCrossRef(null)` are sprinkled through navigation handlers;
`isViewingCrossRef` is persisted in saved state (~4706, 5126) and drives the "Return to Primary Reading" button (~7352).

## Full snapshot
`../BibleApp.before_crosslink_removal.js` is the whole file at the moment of archiving
(includes uncommitted edits, so it may differ from git HEAD). Restore pieces from it, or diff against it.

## Rebuild steps
1. Re-add state (01), the loader (02) and call it in the mount effect.
2. Re-add handlers (03-05).
3. Re-add the render blocks (06, 07, 08, 09, 10) at the matching spots.
4. Make sure `crossRefs.json` still exists in `public/`.
