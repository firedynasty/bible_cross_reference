# Hidden Buttons

Buttons that have been hidden from the UI but whose code remains intact and functional.

---

## links (External Links Dropdown)

**Location:** `src/BibleApp.js` — `NavigationPlaceholder` component, inside the top controls bar
**Hidden by:** `hidden` class on the wrapping `<div className="relative ml-2 flex-shrink-0 hidden">`
**Original class:** `px-2 py-0.5 bg-blue-200 hover:bg-blue-300 rounded text-xs font-bold`
**Title:** `External Links`

**What it does:**
Opens a dropdown with links defined in the `linksOut` object (e.g. "Bible mobile", "Holy Spirit", "Test"). Also copies the current book + chapter to the clipboard when any link is clicked.

**To re-enable:** Remove `hidden` from the wrapper div's className.

---

## 👁️‍🗨️ (Show Filtered Verses Toggle)

**Location:** `src/BibleApp.js` — `NavigationPlaceholder` component, top controls bar
**Hidden by:** `{false && verseFilterData && ( ... )}` — short-circuit prevents render
**Original condition:** `{verseFilterData && ( ... )}`
**Original class:** `ml-2 px-2 py-0.5 rounded text-xs font-bold bg-gray-200 hover:bg-gray-300` (unfiltered) / `bg-orange-200 hover:bg-orange-300` (filtered active)
**Title:** `Show filtered verses only` / `Show all verses`

**What it does:**
Toggles `showFilteredVersesOnly` state. When active, only verses matching the loaded verse filter file are shown. Requires a verse filter file to be loaded (`verseFilterData` must be non-null).

**To re-enable:** Change `{false && verseFilterData && (` back to `{verseFilterData && (`.
