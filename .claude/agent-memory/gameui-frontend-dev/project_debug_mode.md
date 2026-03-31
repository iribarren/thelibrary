---
name: Frontend debug mode architecture
description: How the debug mode feature is structured in the thelibrary frontend SPA
type: project
---

Debug mode is implemented across three files in `public/`:

- `js/debug.js` — all debug logic: mock data, nav bar, screen rendering, entry/exit
- `css/debug.css` — fixed bottom nav bar styles; only affects elements debug.js renders
- `js/app.js` — exports `isDebugMode`, `setDebugMode`, `isLocalEnvironment`, and all 6 render/nav functions; guards API calls inside rendering functions

**Why:** Avoids circular static imports by having `app.js` do only a dynamic `import('./debug.js')` in `renderStartScreen()`, while `debug.js` does a normal static import of the 8 exports it needs from `app.js`.

**How to apply:** If adding new screens or render functions that make API calls during rendering, check whether they need an `if (isDebugMode()) return;` guard. Button-triggered handlers do not need guards — only auto-called rendering helpers do.

API calls guarded in debug mode:
- `loadGameList()` — called from `renderStartScreen`
- `loadOracleTables()` — called from `renderPrologueScreen`
- `renderCompletedScreen()` — uses `game.journal_entries` from mock state instead of `API.fetchJournalEntries`
- `loadJournalPanel()` — uses `game.journal_entries` from mock state

The debug nav bar is always-loaded CSS (safe, zero overhead) but the debug button and nav bar DOM elements only exist when `isLocalEnvironment()` returns true.
